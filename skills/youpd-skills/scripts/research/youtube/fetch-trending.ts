#!/usr/bin/env tsx

import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  clampMax,
  emitJson,
  fail,
  normalizeRegion,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
  selectYoutubeApiKey,
  todayUtc,
  toErrorResult,
  upsertVideos,
  videoFromApiItem,
  youtubeApiRequest,
  type YoutubeListResponse,
  type YoutubeVideoItem,
} from '../../lib/youtube/core.ts';

const RawArgsSchema = z.object({
  region: z.string().optional(),
  categoryId: z.string().optional(),
  max: z.string().optional(),
  hotDate: z.string().optional(),
});

function parseCli(argv: string[]): z.infer<typeof RawArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      region: { type: 'string', short: 'r' },
      'category-id': { type: 'string' },
      category: { type: 'string' },
      max: { type: 'string', short: 'm' },
      'hot-date': { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  return RawArgsSchema.parse({
    region: values.region,
    categoryId: values['category-id'] ?? values.category,
    max: values.max,
    hotDate: values['hot-date'],
  });
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const region = normalizeRegion(args.region);
  const max = clampMax(parsePositiveInt(args.max, 50, '--max'), 50, '--max');
  const hotDate = args.hotDate ?? todayUtc();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hotDate)) {
    fail('validation_error', '`--hot-date` 는 YYYY-MM-DD 형식이어야 합니다.', { value: hotDate });
  }

  const { db } = openMigratedDb();

  try {
    const apiKey = selectYoutubeApiKey(db);
    const response = await youtubeApiRequest<YoutubeListResponse<YoutubeVideoItem>>(db, apiKey, {
      resource: 'videos',
      params: {
        part: 'snippet,contentDetails,statistics',
        chart: 'mostPopular',
        regionCode: region,
        videoCategoryId: args.categoryId,
        maxResults: max,
      },
      audit: {
        operation: 'videos.list',
        units: 1,
      },
    });

    const videos = response.items ?? [];
    const collectedAt = nowIso();
    runInTransaction(db, () => {
      upsertVideos(db, videos.map(videoFromApiItem), collectedAt);
      const insertTrending = db.prepare(
        `INSERT INTO youtube_trending
           (id, hot_date, region_code, category_id, video_id, rank, source, collected_at)
         VALUES (?, ?, ?, ?, ?, ?, 'youtube_trending', ?)
         ON CONFLICT DO UPDATE SET
           rank = excluded.rank,
           collected_at = excluded.collected_at`,
      );

      videos.forEach((video, index) => {
        insertTrending.run(
          randomUUID(),
          hotDate,
          region,
          args.categoryId ?? null,
          video.id,
          index + 1,
          collectedAt,
        );
      });
    });

    emitJson({
      ok: true,
      hotDate,
      region,
      categoryId: args.categoryId ?? null,
      resultCount: videos.length,
      videoIds: videos.map((video) => video.id),
      unitsConsumed: 1,
    });
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitJson(toErrorResult(err));
  process.exit(1);
});
