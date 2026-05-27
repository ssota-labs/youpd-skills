#!/usr/bin/env tsx

import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  clampMax,
  chunk,
  emitJson,
  fail,
  getKeywordById,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  parseSearchOrder,
  runInTransaction,
  selectYoutubeApiKey,
  toErrorResult,
  upsertKeyword,
  upsertVideos,
  videoFromApiItem,
  youtubeApiRequest,
  type YoutubeListResponse,
  type YoutubeVideoItem,
} from '../../lib/youtube/core.ts';

interface SearchResultItem {
  id?: {
    videoId?: string;
  };
}

const RawArgsSchema = z.object({
  keyword: z.string().optional(),
  keywordId: z.string().uuid().optional(),
  region: z.string().optional(),
  order: z.string().optional(),
  max: z.string().optional(),
  force: z.boolean().default(false),
});

function parseCli(argv: string[]): z.infer<typeof RawArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      'keyword-id': { type: 'string' },
      region: { type: 'string', short: 'r' },
      order: { type: 'string', short: 'o' },
      max: { type: 'string', short: 'm' },
      force: { type: 'boolean', short: 'f' },
    },
    strict: true,
    allowPositionals: false,
  });

  const parsed = RawArgsSchema.parse({
    keyword: values.keyword,
    keywordId: values['keyword-id'],
    region: values.region,
    order: values.order,
    max: values.max,
    force: values.force ?? false,
  });

  if (!parsed.keyword && !parsed.keywordId) {
    fail('validation_error', '`--keyword` 또는 `--keyword-id` 중 하나가 필요합니다.');
  }
  return parsed;
}

function getCachedVideoIds(db: ReturnType<typeof openMigratedDb>['db'], sessionId: string): string[] {
  const rows = db
    .prepare(
      `SELECT video_id FROM youtube_keyword_video_results
       WHERE search_session_id = ?
       ORDER BY rank ASC`,
    )
    .all(sessionId) as Array<{ video_id: string }>;
  return rows.map((row) => row.video_id);
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const max = clampMax(parsePositiveInt(args.max, 50, '--max'), 200, '--max');
  const { db } = openMigratedDb();
  let searchSessionId: string | undefined;

  try {
    const keywordResult = args.keywordId
      ? undefined
      : upsertKeyword(db, {
          keyword: args.keyword as string,
          region: args.region,
          order: parseSearchOrder(args.order),
        });
    const keyword = getKeywordById(db, args.keywordId ?? (keywordResult?.keywordId as string));

    if (
      !args.force &&
      keyword.last_search_session_id &&
      keyword.cache_expires_at &&
      Date.parse(keyword.cache_expires_at) > Date.now()
    ) {
      const videoIds = getCachedVideoIds(db, keyword.last_search_session_id);
      emitJson({
        ok: true,
        searchSessionId: keyword.last_search_session_id,
        keywordId: keyword.id,
        cacheHit: true,
        resultCount: videoIds.length,
        videoIds,
        unitsConsumed: 0,
      });
      return;
    }

    const sessionId = randomUUID();
    searchSessionId = sessionId;
    const query = {
      keyword: keyword.keyword,
      normalizedKeyword: keyword.normalized_keyword,
      region: keyword.region_code,
      order: keyword.search_order,
      max,
    };
    db.prepare(
      `INSERT INTO youtube_search_sessions (id, type, query, status, started_at)
       VALUES (?, 'keyword', ?, 'running', ?)`,
    ).run(sessionId, JSON.stringify(query), nowIso());

    const apiKey = selectYoutubeApiKey(db);
    const videoIds: string[] = [];
    const seen = new Set<string>();
    let unitsConsumed = 0;
    let pageToken: string | undefined;

    while (videoIds.length < max) {
      const pageSize = Math.min(50, max - videoIds.length);
      const response = await youtubeApiRequest<YoutubeListResponse<SearchResultItem>>(db, apiKey, {
        resource: 'search',
        params: {
          part: 'snippet',
          type: 'video',
          q: keyword.keyword,
          regionCode: keyword.region_code,
          order: keyword.search_order,
          maxResults: pageSize,
          pageToken,
        },
        audit: {
          operation: 'search.list',
          units: 100,
          keyword: keyword.keyword,
          searchSessionId: sessionId,
        },
      });
      unitsConsumed += 100;

      for (const item of response.items ?? []) {
        const videoId = item.id?.videoId;
        if (videoId && !seen.has(videoId)) {
          seen.add(videoId);
          videoIds.push(videoId);
        }
      }

      pageToken = response.nextPageToken;
      if (!pageToken || (response.items ?? []).length === 0) break;
    }

    const videos: YoutubeVideoItem[] = [];
    for (const ids of chunk(videoIds, 50)) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeVideoItem>>(db, apiKey, {
        resource: 'videos',
        params: {
          part: 'snippet,contentDetails,statistics',
          id: ids.join(','),
          maxResults: ids.length,
        },
        audit: {
          operation: 'videos.list',
          units: 1,
          keyword: keyword.keyword,
          videoIds: ids,
          searchSessionId: sessionId,
        },
      });
      unitsConsumed += 1;
      videos.push(...(response.items ?? []));
    }

    const storedVideoIds = videos.map((video) => video.id);
    const storedVideoIdSet = new Set(storedVideoIds);
    const collectedAt = nowIso();
    runInTransaction(db, () => {
      upsertVideos(db, videos.map(videoFromApiItem), collectedAt);

      const insertResult = db.prepare(
        `INSERT OR IGNORE INTO youtube_keyword_video_results
           (id, search_session_id, keyword, video_id, rank, search_order, region_code, collected_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      videoIds.forEach((videoId, index) => {
        if (!storedVideoIdSet.has(videoId)) return;
        insertResult.run(
          randomUUID(),
          sessionId,
          keyword.keyword,
          videoId,
          index + 1,
          keyword.search_order,
          keyword.region_code,
          collectedAt,
        );
      });

      const cacheExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      db.prepare(
        `UPDATE youtube_search_sessions
         SET status = 'success', result_count = ?, completed_at = ?
         WHERE id = ?`,
      ).run(storedVideoIds.length, collectedAt, sessionId);
      db.prepare(
        `UPDATE youtube_keywords
         SET last_search_session_id = ?,
             last_collected_at = ?,
             cache_expires_at = ?,
             result_count = ?,
             updated_at = ?
         WHERE id = ?`,
      ).run(sessionId, collectedAt, cacheExpiresAt, storedVideoIds.length, collectedAt, keyword.id);
    });

    emitJson({
      ok: true,
      searchSessionId: sessionId,
      keywordId: keyword.id,
      cacheHit: false,
      resultCount: storedVideoIds.length,
      videoIds: storedVideoIds,
      unitsConsumed,
    });
  } catch (err) {
    if (searchSessionId) {
      db.prepare(
        `UPDATE youtube_search_sessions
         SET status = 'failed', error = ?, completed_at = ?
         WHERE id = ?`,
      ).run(JSON.stringify(toErrorResult(err).error), nowIso(), searchSessionId);
    }
    throw err;
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitJson(toErrorResult(err));
  process.exit(1);
});
