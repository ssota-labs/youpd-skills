#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  chunk,
  emitError,
  emitOk,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
} from '../../lib/youtube/common.ts';
import {
  channelFromApiItem,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
  type YoutubeSearchResultItem,
} from '../../lib/youtube/api.ts';
import { requireYoutubeApiKey } from '../../lib/youtube/quota.ts';
import {
  completeSearchSession,
  createSearchSession,
  insertChannelSnapshot,
  insertKeywordChannelResults,
  upsertChannel,
  upsertKeyword,
} from '../../lib/youtube/write.ts';
import type { SearchChannelsResult } from '../../lib/types/youtube.ts';

const ROUTE = 'search-channels';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      keyword: { type: 'string', short: 'k' },
      region: { type: 'string', short: 'r' },
      'max-results': { type: 'string' },
      pages: { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values.keyword !== 'string' || values.keyword.length === 0) {
    throw new Error('--keyword 가 필요합니다.');
  }

  return {
    keyword: values.keyword,
    region: values.region ?? 'KR',
    maxResults: parsePositiveInt(values['max-results'], 50, '--max-results'),
    pages: parsePositiveInt(values.pages, 1, '--pages'),
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const keyword = upsertKeyword(db, { keyword: args.keyword, region: args.region });
    const sessionId = createSearchSession(db, {
      route: 'search-channels',
      keywordId: keyword.keywordId,
      query: args.keyword,
      regionCode: args.region,
      mode: 'manual-refresh',
      maxResults: args.maxResults,
      pagesRequested: args.pages,
      rawParams: { maxResults: args.maxResults, pages: args.pages },
    });

    const apiKey = requireYoutubeApiKey();
    let unitsConsumed = 0;
    const channelIds: string[] = [];
    const searchItems: Array<{ channelId: string; position: number; raw: string }> = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;
    let pagesFetched = 0;

    while (pagesFetched < args.pages && channelIds.length < args.maxResults) {
      const pageSize = Math.min(50, args.maxResults - channelIds.length);
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeSearchResultItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'search',
        params: {
          part: 'snippet',
          type: 'channel',
          q: args.keyword,
          regionCode: args.region,
          maxResults: pageSize,
          pageToken,
        },
        audit: { operation: 'search.list', units: 100 },
      });
      unitsConsumed += 100;
      pagesFetched += 1;

      for (const item of response.items ?? []) {
        const channelId = item.id?.channelId;
        if (!channelId || seen.has(channelId)) continue;
        seen.add(channelId);
        channelIds.push(channelId);
        searchItems.push({
          channelId,
          position: searchItems.length + 1,
          raw: JSON.stringify(item),
        });
      }

      pageToken = response.nextPageToken;
      if (!pageToken || (response.items ?? []).length === 0) break;
    }

    const channels: ReturnType<typeof channelFromApiItem>[] = [];
    for (const ids of chunk(channelIds, 50)) {
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
      for (const channel of channels) {
        upsertChannel(db, channel, collectedAt);
        insertChannelSnapshot(db, channel, collectedAt);
      }
      insertKeywordChannelResults(db, sessionId, keyword.keywordId, searchItems);
      completeSearchSession(db, sessionId, {
        unitsConsumed,
        resultCount: channelIds.length,
        pagesFetched,
      });
    });

    const result: SearchChannelsResult = {
      sessionId,
      resultCount: channelIds.length,
      channelIds,
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
