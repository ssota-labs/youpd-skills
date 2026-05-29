import type { Db } from '../db/client.ts';
import type { YoutubeRouteErrorCode } from '../types/youtube.ts';
import { YoutubeRouteError, fail } from './common.ts';
import {
  checkDailyQuota,
  classifyYoutubeError,
  recordApiAudit,
  type ApiKeyContext,
  type AuditRecordInput,
} from './quota.ts';

export type FetchFn = typeof fetch;

let fetchImpl: FetchFn = globalThis.fetch.bind(globalThis);

export function setFetchImpl(fn: FetchFn): void {
  fetchImpl = fn;
}

export function resetFetchImpl(): void {
  fetchImpl = globalThis.fetch.bind(globalThis);
}

export interface YoutubeRequestOptions {
  route: string;
  resource: string;
  params: Record<string, string | number | boolean | undefined>;
  audit: Omit<AuditRecordInput, 'route'>;
}

export interface YoutubeListResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

export interface YoutubeThumbnailMap {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
  standard?: { url?: string };
  maxres?: { url?: string };
}

export interface YoutubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    publishedAt?: string;
    thumbnails?: YoutubeThumbnailMap;
  };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    viewCount?: string;
    videoCount?: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface YoutubeVideoItem {
  id: string;
  snippet?: {
    channelId?: string;
    channelTitle?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: YoutubeThumbnailMap;
    categoryId?: string;
    defaultLanguage?: string;
    defaultAudioLanguage?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

export interface YoutubeSearchResultItem {
  id?: {
    videoId?: string;
    channelId?: string;
  };
}

export interface YoutubePlaylistItem {
  snippet?: {
    publishedAt?: string;
    resourceId?: {
      videoId?: string;
    };
  };
}

export interface YoutubeCommentThreadItem {
  id: string;
  snippet?: {
    topLevelComment?: {
      id?: string;
      snippet?: {
        authorDisplayName?: string;
        textOriginal?: string;
        textDisplay?: string;
        likeCount?: number;
        publishedAt?: string;
        updatedAt?: string;
      };
    };
  };
}

export async function youtubeApiRequest<T>(
  db: Db,
  apiKey: ApiKeyContext,
  options: YoutubeRequestOptions,
): Promise<T> {
  checkDailyQuota(db, options.audit.units);

  const url = new URL(`https://www.googleapis.com/youtube/v3/${options.resource}`);
  url.searchParams.set('key', apiKey.key);
  for (const [key, value] of Object.entries(options.params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let status: 'success' | 'error' = 'success';
  let errorCode: YoutubeRouteErrorCode | null = null;
  let rawError: string | null = null;

  try {
    const response = await fetchImpl(url);
    const text = await response.text();
    const body = text.length > 0 ? (JSON.parse(text) as unknown) : {};

    if (!response.ok || (body as { error?: unknown }).error != null) {
      const classified = classifyYoutubeError(response.status, body);
      status = 'error';
      errorCode = classified.code;
      rawError = classified.message;
      throw new YoutubeRouteError(classified.code, classified.message, classified.detail);
    }

    recordApiAudit(
      db,
      apiKey,
      { route: options.route, operation: options.audit.operation, units: options.audit.units },
      'success',
      null,
      null,
    );
    return body as T;
  } catch (err) {
    if (!(err instanceof YoutubeRouteError)) {
      status = 'error';
      errorCode = 'network_error';
      rawError = (err as Error).message;
      recordApiAudit(
        db,
        apiKey,
        { route: options.route, operation: options.audit.operation, units: options.audit.units },
        'error',
        'network_error',
        rawError,
      );
      throw new YoutubeRouteError('network_error', `YouTube API 네트워크 오류: ${rawError}`);
    }

    recordApiAudit(
      db,
      apiKey,
      { route: options.route, operation: options.audit.operation, units: options.audit.units },
      status,
      errorCode,
      rawError,
    );
    throw err;
  }
}

export function parseInteger(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function pickThumbnail(thumbnails: YoutubeThumbnailMap | undefined): string | null {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    null
  );
}

export function parseIsoDurationSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function channelFromApiItem(item: YoutubeChannelItem, handle?: string | null) {
  const totalViewCount = parseInteger(item.statistics?.viewCount);
  const videoCount = parseInteger(item.statistics?.videoCount);
  return {
    channelId: item.id,
    title: item.snippet?.title ?? 'Unknown Channel',
    description: item.snippet?.description ?? null,
    handle: handle ?? null,
    customUrl: item.snippet?.customUrl ?? null,
    country: item.snippet?.country ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    thumbnailUrl: pickThumbnail(item.snippet?.thumbnails),
    subscriberCount: parseInteger(item.statistics?.subscriberCount),
    hiddenSubscriberCount: (item.statistics?.hiddenSubscriberCount === true ? 1 : 0) as 0 | 1,
    totalViewCount,
    videoCount,
    averageViewCount:
      totalViewCount != null && videoCount != null && videoCount > 0
        ? totalViewCount / videoCount
        : null,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    raw: JSON.stringify(item),
  };
}

export function videoFromApiItem(item: YoutubeVideoItem) {
  const durationSec = parseIsoDurationSeconds(item.contentDetails?.duration);
  const channelId = item.snippet?.channelId;
  if (!channelId) {
    fail('validation_error', `video ${item.id} 에 channelId 가 없습니다.`);
  }
  return {
    videoId: item.id,
    channelId,
    channelTitle: item.snippet?.channelTitle ?? null,
    title: item.snippet?.title ?? 'Untitled',
    description: item.snippet?.description ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    durationSec,
    categoryId: item.snippet?.categoryId ?? null,
    defaultLanguage: item.snippet?.defaultLanguage ?? item.snippet?.defaultAudioLanguage ?? null,
    thumbnailUrl: pickThumbnail(item.snippet?.thumbnails),
    viewCount: parseInteger(item.statistics?.viewCount),
    likeCount: parseInteger(item.statistics?.likeCount),
    commentCount: parseInteger(item.statistics?.commentCount),
    raw: JSON.stringify(item),
  };
}

export async function resolveChannelIdsByHandles(
  db: Db,
  apiKey: ApiKeyContext,
  route: string,
  handles: string[],
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const unresolved: string[] = [];

  for (const handle of handles) {
    const normalizedHandle = handle.startsWith('@') ? handle.slice(1) : handle;
    try {
      const response = await youtubeApiRequest<YoutubeListResponse<YoutubeChannelItem>>(db, apiKey, {
        route,
        resource: 'channels',
        params: {
          part: 'id',
          forHandle: normalizedHandle,
          maxResults: 1,
        },
        audit: { operation: 'channels.list(forHandle)', units: 1 },
      });
      const channelId = response.items?.[0]?.id;
      if (channelId) {
        resolved.set(handle, channelId);
      } else {
        unresolved.push(handle);
      }
    } catch {
      unresolved.push(handle);
    }
  }

  for (const handle of unresolved) {
    const response = await youtubeApiRequest<YoutubeListResponse<YoutubeSearchResultItem>>(db, apiKey, {
      route,
      resource: 'search',
      params: {
        part: 'snippet',
        type: 'channel',
        q: handle.startsWith('@') ? handle : `@${handle}`,
        maxResults: 1,
      },
      audit: { operation: 'search.list(channel fallback)', units: 100 },
    });
    const channelId = response.items?.[0]?.id?.channelId;
    if (channelId) resolved.set(handle, channelId);
  }

  return resolved;
}
