#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  chunk,
  emitError,
  emitOk,
  fail,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
} from '../../lib/youtube/common.ts';
import {
  channelFromApiItem,
  videoFromApiItem,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
  type YoutubeSearchResultItem,
  type YoutubeVideoItem,
} from '../../lib/youtube/api.ts';
import { requireYoutubeApiKey } from '../../lib/youtube/quota.ts';
import {
  completeSearchSession,
  countKeywordResults,
  createSearchSession,
  getKeywordVideoPoolIds,
  getKeywordById,
  insertKeywordVideoResults,
  persistVideoBundle,
  updateKeywordAfterSearch,
  upsertKeyword,
  videoExists,
} from '../../lib/youtube/write.ts';
import type { SearchByKeywordResult, SearchSessionMode } from '../../lib/types/youtube.ts';

const ROUTE = 'search-by-keyword';
const OVERLAP_SECONDS = 60;

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      'keyword-id': { type: 'string' },
      region: { type: 'string', short: 'r' },
      'initial-target-count': { type: 'string' },
      'incremental-pages': { type: 'string' },
      'published-before': { type: 'string' },
      force: { type: 'boolean', short: 'f' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (!values.keyword && !values['keyword-id']) {
    fail('validation_error', '`--keyword` 또는 `--keyword-id` 중 하나가 필요합니다.');
  }

  return {
    keyword: values.keyword,
    keywordId: values['keyword-id'],
    region: values.region ?? 'KR',
    initialTargetCount: parsePositiveInt(values['initial-target-count'], 500, '--initial-target-count'),
    incrementalPages: parsePositiveInt(values['incremental-pages'], 1, '--incremental-pages'),
    publishedBefore: values['published-before'],
    force: values.force ?? false,
    dbPath: values.db,
  };
}

function subtractOverlap(iso: string): string {
  return new Date(Date.parse(iso) - OVERLAP_SECONDS * 1000).toISOString();
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const keywordUpsert =
      args.keywordId == null
        ? upsertKeyword(db, {
            keyword: args.keyword as string,
            region: args.region,
            initialTargetCount: args.initialTargetCount,
          })
        : null;
    const keyword = getKeywordById(db, args.keywordId ?? keywordUpsert!.keywordId);

    const existingCount = countKeywordResults(db, keyword.id);
    const targetCount = keyword.initial_target_count || args.initialTargetCount;

    if (
      !args.force &&
      keyword.cache_expires_at &&
      Date.parse(keyword.cache_expires_at) > Date.now() &&
      (existingCount >= targetCount || keyword.initial_collection_completed_at != null)
    ) {
      const sessionId = keyword.last_search_session_id ?? '';
      const videoIds = getKeywordVideoPoolIds(db, keyword.id, targetCount);
      const result: SearchByKeywordResult = {
        sessionId,
        keywordId: keyword.id,
        mode: keyword.initial_collection_completed_at ? 'incremental' : 'initial',
        cacheHit: true,
        resultCount: videoIds.length,
        newVideoCount: 0,
        skippedExistingVideoCount: 0,
        videoIds,
      };
      emitOk(ROUTE, dbPath, result, 0);
      return;
    }

    const mode: SearchSessionMode =
      keyword.initial_collection_completed_at == null ? 'initial' : 'incremental';
    const pagesRequested = mode === 'initial' ? Math.ceil(targetCount / 50) : args.incrementalPages;
    const publishedAfter =
      mode === 'incremental' && keyword.last_incremental_published_at
        ? subtractOverlap(keyword.last_incremental_published_at)
        : null;

    const sessionId = createSearchSession(db, {
      route: 'search-by-keyword',
      keywordId: keyword.id,
      query: keyword.keyword,
      regionCode: keyword.region_code,
      mode,
      publishedAfter,
      publishedBefore: args.publishedBefore ?? null,
      targetCount,
      maxResults: 50,
      pagesRequested,
      rawParams: {
        force: args.force,
        incrementalPages: args.incrementalPages,
      },
    });

    const apiKey = requireYoutubeApiKey();
    let unitsConsumed = 0;
    const searchItems: Array<{ videoId: string; raw: string; position: number }> = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;
    let pagesFetched = 0;

    while (pagesFetched < pagesRequested) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeSearchResultItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'search',
        params: {
          part: 'snippet',
          type: 'video',
          q: keyword.keyword,
          regionCode: keyword.region_code,
          order: 'date',
          maxResults: 50,
          pageToken,
          publishedAfter: publishedAfter ?? undefined,
          publishedBefore: args.publishedBefore,
        },
        audit: { operation: 'search.list', units: 100 },
      });
      unitsConsumed += 100;
      pagesFetched += 1;

      for (const item of response.items ?? []) {
        const videoId = item.id?.videoId;
        if (!videoId || seen.has(videoId)) continue;
        seen.add(videoId);
        searchItems.push({
          videoId,
          raw: JSON.stringify(item),
          position: searchItems.length + 1,
        });
        if (mode === 'initial' && searchItems.length >= targetCount) break;
      }

      if (mode === 'initial' && searchItems.length >= targetCount) break;
      pageToken = response.nextPageToken;
      if (!pageToken || (response.items ?? []).length === 0) break;
    }

    let skippedExistingVideoCount = 0;
    const detailTargets = searchItems.filter((item) => {
      const exists = videoExists(db, item.videoId);
      if (exists && !args.force) {
        skippedExistingVideoCount += 1;
        return false;
      }
      return true;
    });

    const videos: YoutubeVideoItem[] = [];
    for (const ids of chunk(
      detailTargets.map((item) => item.videoId),
      50,
    )) {
      if (ids.length === 0) continue;
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeVideoItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'videos',
        params: {
          part: 'snippet,contentDetails,statistics',
          id: ids.join(','),
          maxResults: ids.length,
        },
        audit: { operation: 'videos.list', units: 1 },
      });
      unitsConsumed += 1;
      videos.push(...(response.items ?? []));
    }

    const parsedVideos = videos.map(videoFromApiItem);
    const channelIds = [...new Set(parsedVideos.map((video) => video.channelId))];
    const channels: ReturnType<typeof channelFromApiItem>[] = [];

    for (const ids of chunk(channelIds, 50)) {
      if (ids.length === 0) continue;
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'channels',
        params: {
          part: 'snippet,statistics,contentDetails',
          id: ids.join(','),
          maxResults: ids.length,
        },
        audit: { operation: 'channels.list', units: 1 },
      });
      unitsConsumed += 1;
      channels.push(...(response.items ?? []).map((item) => channelFromApiItem(item)));
    }

    const collectedAt = nowIso();
    runInTransaction(db, () => {
      persistVideoBundle(db, parsedVideos, channels, collectedAt);
      insertKeywordVideoResults(
        db,
        sessionId,
        keyword.id,
        searchItems.map((item) => ({
          videoId: item.videoId,
          position: item.position,
          raw: item.raw,
        })),
      );
      completeSearchSession(db, sessionId, {
        unitsConsumed,
        resultCount: searchItems.length,
        newVideoCount: parsedVideos.length,
        skippedExistingVideoCount,
        pagesFetched,
      });
      updateKeywordAfterSearch(db, keyword.id, {
        sessionId,
        ttlHours: keyword.ttl_hours,
        mode,
        maxPublishedAt:
          parsedVideos.reduce<string | null>((max, video) => {
            if (!video.publishedAt) return max;
            if (!max || Date.parse(video.publishedAt) > Date.parse(max)) return video.publishedAt;
            return max;
          }, keyword.last_incremental_published_at) ?? keyword.last_incremental_published_at,
        initialCompleted: mode === 'initial',
      });
    });

    const result: SearchByKeywordResult = {
      sessionId,
      keywordId: keyword.id,
      mode,
      cacheHit: false,
      resultCount: searchItems.length,
      newVideoCount: parsedVideos.length,
      skippedExistingVideoCount,
      videoIds: searchItems.map((item) => item.videoId),
    };
    emitOk(ROUTE, dbPath, result, unitsConsumed);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
