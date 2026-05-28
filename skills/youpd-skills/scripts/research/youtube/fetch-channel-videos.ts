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
  type YoutubePlaylistItem,
  type YoutubeVideoItem,
} from '../../lib/youtube/api.ts';
import { requireYoutubeApiKey } from '../../lib/youtube/quota.ts';
import {
  completeSearchSession,
  createSearchSession,
  getChannelRow,
  persistVideoBundle,
} from '../../lib/youtube/write.ts';
import type { FetchChannelVideosResult } from '../../lib/types/youtube.ts';

const ROUTE = 'fetch-channel-videos';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      'channel-id': { type: 'string' },
      'max-videos': { type: 'string' },
      'published-after': { type: 'string' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  if (typeof values['channel-id'] !== 'string' || values['channel-id'].length === 0) {
    fail('validation_error', '--channel-id 가 필요합니다.');
  }

  return {
    channelId: values['channel-id'],
    maxVideos: parsePositiveInt(values['max-videos'], 100, '--max-videos'),
    publishedAfter: values['published-after'],
    dbPath: values.db,
  };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    let channel = getChannelRow(db, args.channelId);
    const apiKey = requireYoutubeApiKey();
    let unitsConsumed = 0;

    if (!channel?.uploads_playlist_id) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'channels',
        params: {
          part: 'snippet,statistics,contentDetails',
          id: args.channelId,
          maxResults: 1,
        },
        audit: { operation: 'channels.list', units: 1 },
      });
      unitsConsumed += 1;
      const item = response.items?.[0];
      if (!item) fail('not_found', `channel_id 를 찾을 수 없습니다: ${args.channelId}`);
      const parsed = channelFromApiItem(item);
      const collectedAt = nowIso();
      runInTransaction(db, () => {
        persistVideoBundle(db, [], [parsed], collectedAt);
      });
      channel = getChannelRow(db, args.channelId);
    }

    const uploadsPlaylistId = channel?.uploads_playlist_id;
    if (!uploadsPlaylistId) {
      fail('not_found', `uploads playlist 를 찾을 수 없습니다: ${args.channelId}`);
    }

    const sessionId = createSearchSession(db, {
      route: 'fetch-channel-videos',
      query: args.channelId,
      mode: 'manual-refresh',
      maxResults: args.maxVideos,
      publishedAfter: args.publishedAfter ?? null,
      rawParams: {
        channelId: args.channelId,
        maxVideos: args.maxVideos,
        publishedAfter: args.publishedAfter ?? null,
      },
    });

    const videoIds: string[] = [];
    let pageToken: string | undefined;

    while (videoIds.length < args.maxVideos) {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubePlaylistItem>>(db, apiKey, {
        route: ROUTE,
        resource: 'playlistItems',
        params: {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(50, args.maxVideos - videoIds.length),
          pageToken,
        },
        audit: { operation: 'playlistItems.list', units: 1 },
      });
      unitsConsumed += 1;

      for (const item of response.items ?? []) {
        const videoId = item.snippet?.resourceId?.videoId;
        const publishedAt = item.snippet?.publishedAt;
        if (!videoId) continue;
        if (args.publishedAfter && publishedAt && Date.parse(publishedAt) < Date.parse(args.publishedAfter)) {
          pageToken = undefined;
          break;
        }
        videoIds.push(videoId);
        if (videoIds.length >= args.maxVideos) break;
      }

      if (!pageToken && response.nextPageToken == null) break;
      if (videoIds.length >= args.maxVideos) break;
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }

    const videos: YoutubeVideoItem[] = [];
    for (const ids of chunk(videoIds, 50)) {
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
      completeSearchSession(db, sessionId, {
        unitsConsumed,
        resultCount: parsedVideos.length,
        newVideoCount: parsedVideos.length,
      });
    });

    const result: FetchChannelVideosResult = {
      sessionId,
      channelId: args.channelId,
      resultCount: parsedVideos.length,
      videoIds: parsedVideos.map((video) => video.videoId),
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
