#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  channelFromApiItem,
  chunk,
  emitJson,
  fail,
  nowIso,
  openMigratedDb,
  runInTransaction,
  selectYoutubeApiKey,
  toErrorResult,
  upsertChannels,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
} from '../../lib/youtube/core.ts';

const RawArgsSchema = z.object({
  channelIds: z.array(z.string()).default([]),
  handles: z.array(z.string()).default([]),
});

function asStringArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseCli(argv: string[]): z.infer<typeof RawArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      'channel-id': { type: 'string', multiple: true },
      handle: { type: 'string', multiple: true },
    },
    strict: true,
    allowPositionals: false,
  });

  const parsed = RawArgsSchema.parse({
    channelIds: asStringArray(values['channel-id']).map((value) => value.trim()).filter(Boolean),
    handles: asStringArray(values.handle).map((value) => value.trim()).filter(Boolean),
  });
  if (parsed.channelIds.length === 0 && parsed.handles.length === 0) {
    fail('validation_error', '`--channel-id` 또는 `--handle` 이 필요합니다.');
  }
  return parsed;
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db } = openMigratedDb();

  try {
    const apiKey = selectYoutubeApiKey(db);
    const channels: YoutubeChannelItem[] = [];
    let unitsConsumed = 0;

    for (const handle of args.handles) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
        resource: 'channels',
        params: {
          part: 'snippet,statistics,contentDetails',
          forHandle: handle,
          maxResults: 1,
        },
        audit: {
          operation: 'channels.list',
          units: 1,
          channelId: handle,
        },
      });
      unitsConsumed += 1;
      channels.push(...(response.items ?? []));
    }

    const explicitIds = [...new Set(args.channelIds)];
    for (const ids of chunk(explicitIds, 50)) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
        resource: 'channels',
        params: {
          part: 'snippet,statistics,contentDetails',
          id: ids.join(','),
          maxResults: ids.length,
        },
        audit: {
          operation: 'channels.list',
          units: 1,
          channelId: ids.length === 1 ? ids[0] : undefined,
        },
      });
      unitsConsumed += 1;
      channels.push(...(response.items ?? []));
    }

    if (channels.length === 0) {
      fail('not_found', '요청한 채널을 찾지 못했습니다.');
    }

    const collectedAt = nowIso();
    runInTransaction(db, () => {
      upsertChannels(db, channels.map(channelFromApiItem), collectedAt);
    });

    const channelIds = [...new Set(channels.map((channel) => channel.id))];
    emitJson({
      ok: true,
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
