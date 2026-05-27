#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  channelFromApiItem,
  chunk,
  clampMax,
  emitJson,
  fail,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  runInTransaction,
  selectYoutubeApiKey,
  toErrorResult,
  upsertChannels,
  upsertVideos,
  videoFromApiItem,
  youtubeApiRequest,
  type YoutubeChannelItem,
  type YoutubeListResponse,
  type YoutubeVideoItem,
} from '../../lib/youtube/core.ts';

interface PlaylistItem {
  contentDetails?: {
    videoId?: string;
  };
}

const RawArgsSchema = z.object({
  channelId: z.string().min(1),
  max: z.string().optional(),
  publishedAfter: z.string().optional(),
});

function parseCli(argv: string[]): z.infer<typeof RawArgsSchema> {
  const { values } = parseArgs({
    args: argv,
    options: {
      'channel-id': { type: 'string' },
      max: { type: 'string', short: 'm' },
      'published-after': { type: 'string' },
    },
    strict: true,
    allowPositionals: false,
  });

  return RawArgsSchema.parse({
    channelId: values['channel-id'],
    max: values.max,
    publishedAfter: values['published-after'],
  });
}

function getUploadsPlaylistId(db: ReturnType<typeof openMigratedDb>['db'], channelId: string): string | null {
  const row = db
    .prepare(`SELECT uploads_playlist_id FROM youtube_channels WHERE channel_id = ?`)
    .get(channelId) as { uploads_playlist_id: string | null } | undefined;
  return row?.uploads_playlist_id ?? null;
}

async function ensureUploadsPlaylistId(
  db: ReturnType<typeof openMigratedDb>['db'],
  channelId: string,
  apiKey: ReturnType<typeof selectYoutubeApiKey>,
): Promise<{ uploadsPlaylistId: string; unitsConsumed: number }> {
  const existing = getUploadsPlaylistId(db, channelId);
  if (existing) return { uploadsPlaylistId: existing, unitsConsumed: 0 };

  const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
    resource: 'channels',
    params: {
      part: 'snippet,statistics,contentDetails',
      id: channelId,
      maxResults: 1,
    },
    audit: {
      operation: 'channels.list',
      units: 1,
      channelId,
    },
  });
  const channel = response.items?.[0];
  if (!channel) fail('not_found', `채널을 찾지 못했습니다: ${channelId}`);

  runInTransaction(db, () => {
    upsertChannels(db, [channelFromApiItem(channel)], nowIso());
  });

  const playlistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) {
    fail('not_found', `채널의 uploads playlist 를 찾지 못했습니다: ${channelId}`);
  }
  return { uploadsPlaylistId: playlistId, unitsConsumed: 1 };
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const max = clampMax(parsePositiveInt(args.max, 50, '--max'), 200, '--max');
  const publishedAfterMs = args.publishedAfter ? Date.parse(args.publishedAfter) : undefined;
  if (publishedAfterMs !== undefined && Number.isNaN(publishedAfterMs)) {
    fail('validation_error', '`--published-after` 는 ISO 8601 datetime 이어야 합니다.', {
      value: args.publishedAfter,
    });
  }

  const { db } = openMigratedDb();

  try {
    const apiKey = selectYoutubeApiKey(db);
    let unitsConsumed = 0;
    const playlist = await ensureUploadsPlaylistId(db, args.channelId, apiKey);
    unitsConsumed += playlist.unitsConsumed;

    const videoIds: string[] = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;

    while (videoIds.length < max) {
      const pageSize = Math.min(50, max - videoIds.length);
      const response = await youtubeApiRequest<YoutubeListResponse<PlaylistItem>>(db, apiKey, {
        resource: 'playlistItems',
        params: {
          part: 'contentDetails',
          playlistId: playlist.uploadsPlaylistId,
          maxResults: pageSize,
          pageToken,
        },
        audit: {
          operation: 'playlistItems.list',
          units: 1,
          channelId: args.channelId,
        },
      });
      unitsConsumed += 1;

      for (const item of response.items ?? []) {
        const videoId = item.contentDetails?.videoId;
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
          channelId: args.channelId,
          videoIds: ids,
        },
      });
      unitsConsumed += 1;
      videos.push(...(response.items ?? []));
    }

    const filteredVideos =
      publishedAfterMs === undefined
        ? videos
        : videos.filter((video) => {
            const publishedAt = video.snippet?.publishedAt;
            return publishedAt != null && Date.parse(publishedAt) >= publishedAfterMs;
          });
    const collectedAt = nowIso();
    runInTransaction(db, () => {
      upsertVideos(db, filteredVideos.map(videoFromApiItem), collectedAt);
    });

    emitJson({
      ok: true,
      channelId: args.channelId,
      resultCount: filteredVideos.length,
      videoIds: filteredVideos.map((video) => video.id),
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
