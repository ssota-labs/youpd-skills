#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  emitError,
  emitOk,
  fail,
  nowIso,
  openMigratedDb,
  runInTransaction,
} from '../../lib/youtube/common.ts';
import {
  channelFromApiItem,
  resolveChannelIdsByHandles,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
} from '../../lib/youtube/api.ts';
import { requireYoutubeApiKey } from '../../lib/youtube/quota.ts';
import {
  completeSearchSession,
  createSearchSession,
  insertChannelSnapshot,
  upsertChannel,
} from '../../lib/youtube/write.ts';
import type { FetchChannelResult } from '../../lib/types/youtube.ts';

const ROUTE = 'fetch-channel';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'channel-id': { type: 'string', multiple: true },
      handle: { type: 'string', multiple: true },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const channelIds = values['channel-id'] ?? [];
  const handles = values.handle ?? [];
  if (channelIds.length === 0 && handles.length === 0) {
    fail('validation_error', '`--channel-id` 또는 `--handle` 중 하나 이상이 필요합니다.');
  }

  return { channelIds, handles, dbPath: values.db };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const apiKey = requireYoutubeApiKey();
    const handleMap = await resolveChannelIdsByHandles(db, apiKey, ROUTE, args.handles);
    const channelIds = [...new Set([...args.channelIds, ...handleMap.values()])];

    if (channelIds.length === 0) {
      fail('not_found', '요청한 채널을 찾을 수 없습니다.');
    }

    const sessionId = createSearchSession(db, {
      route: 'fetch-channel',
      query: channelIds.join(','),
      mode: 'manual-refresh',
      rawParams: { channelIds: args.channelIds, handles: args.handles },
    });

    let unitsConsumed = 0;
    const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
      route: ROUTE,
      resource: 'channels',
      params: {
        part: 'snippet,statistics,contentDetails',
        id: channelIds.join(','),
        maxResults: channelIds.length,
      },
      audit: { operation: 'channels.list', units: 1 },
    });
    unitsConsumed += 1;

    const reverseHandleMap = new Map<string, string>();
    for (const [handle, channelId] of handleMap.entries()) {
      reverseHandleMap.set(channelId, handle);
    }

    const channels = (response.items ?? []).map((item) =>
      channelFromApiItem(item, reverseHandleMap.get(item.id) ?? null),
    );
    const collectedAt = nowIso();

    runInTransaction(db, () => {
      for (const channel of channels) {
        upsertChannel(db, channel, collectedAt);
        insertChannelSnapshot(db, channel, collectedAt);
      }
      completeSearchSession(db, sessionId, {
        unitsConsumed,
        resultCount: channels.length,
      });
    });

    const result: FetchChannelResult = {
      sessionId,
      channelIds: channels.map((channel) => channel.channelId),
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
