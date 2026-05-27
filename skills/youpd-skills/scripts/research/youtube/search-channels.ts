#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  channelFromApiItem,
  clampMax,
  chunk,
  emitJson,
  fail,
  normalizeRegion,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
  selectYoutubeApiKey,
  toErrorResult,
  upsertChannels,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
} from '../../lib/youtube/core.ts';

interface ChannelSearchItem {
  id?: {
    channelId?: string;
  };
}

const RawArgsSchema = z.object({
  keyword: z.string().min(1),
  region: z.string().optional(),
  max: z.string().optional(),
});

function parseCli(argv: string[]): z.infer<typeof RawArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      region: { type: 'string', short: 'r' },
      max: { type: 'string', short: 'm' },
    },
    strict: true,
    allowPositionals: false,
  });

  return RawArgsSchema.parse({
    keyword: values.keyword,
    region: values.region,
    max: values.max,
  });
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const region = normalizeRegion(args.region);
  const max = clampMax(parsePositiveInt(args.max, 25, '--max'), 50, '--max');
  const { db } = openMigratedDb();

  try {
    if (args.keyword.trim().length === 0) {
      fail('validation_error', '검색 키워드는 비어 있을 수 없습니다.');
    }

    const apiKey = selectYoutubeApiKey(db);
    let unitsConsumed = 0;
    const searchResponse = await youtubeApiRequest<YoutubeListResponse<ChannelSearchItem>>(db, apiKey, {
      resource: 'search',
      params: {
        part: 'snippet',
        type: 'channel',
        q: args.keyword,
        regionCode: region,
        maxResults: max,
      },
      audit: {
        operation: 'search.list',
        units: 100,
        keyword: args.keyword,
      },
    });
    unitsConsumed += 100;

    const channelIds = [
      ...new Set((searchResponse.items ?? []).flatMap((item) => item.id?.channelId ?? [])),
    ];
    const channels: YoutubeChannelItem[] = [];

    for (const ids of chunk(channelIds, 50)) {
      const detailResponse = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(
        db,
        apiKey,
        {
          resource: 'channels',
          params: {
            part: 'snippet,statistics,contentDetails',
            id: ids.join(','),
            maxResults: ids.length,
          },
          audit: {
            operation: 'channels.list',
            units: 1,
          },
        },
      );
      unitsConsumed += 1;
      channels.push(...(detailResponse.items ?? []));
    }

    const collectedAt = nowIso();
    runInTransaction(db, () => {
      upsertChannels(db, channels.map(channelFromApiItem), collectedAt);
    });

    emitJson({
      ok: true,
      keyword: args.keyword,
      region,
      resultCount: channelIds.length,
      channelIds,
      unitsConsumed,
    });
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitJson(toErrorResult(err));
  process.exit(1);
});
