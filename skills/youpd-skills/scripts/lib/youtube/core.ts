import { randomUUID } from 'node:crypto';

import { openDb, type Db, type OpenDbOptions, type OpenDbResult } from '../db/client.ts';
import { runMigrations } from '../db/migrate.ts';
import { YoutubeSearchOrderSchema, type YoutubeSearchOrder } from '../types/youtube.ts';

export type YoutubeRouteErrorCode =
  | 'quota_exceeded'
  | 'invalid_key'
  | 'not_found'
  | 'network_error'
  | 'validation_error'
  | 'db_error'
  | 'dangerous_scope'
  | 'unknown';

export interface YoutubeRouteErrorShape {
  ok: false;
  error: {
    code: YoutubeRouteErrorCode;
    message: string;
    cause?: unknown;
  };
}

export class YoutubeRouteError extends Error {
  readonly code: YoutubeRouteErrorCode;
  readonly detail: unknown;

  constructor(code: YoutubeRouteErrorCode, message: string, detail?: unknown) {
    super(message);
    this.name = 'YoutubeRouteError';
    this.code = code;
    this.detail = detail;
  }
}

export function emitJson(result: unknown): void {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

export function toErrorResult(err: unknown): YoutubeRouteErrorShape {
  if (err instanceof YoutubeRouteError) {
    const error: YoutubeRouteErrorShape['error'] = {
      code: err.code,
      message: err.message,
    };
    if (err.detail !== undefined) error.cause = err.detail;
    return { ok: false, error };
  }

  return {
    ok: false,
    error: {
      code: 'unknown',
      message: (err as Error).message ?? String(err),
    },
  };
}

export function fail(code: YoutubeRouteErrorCode, message: string, detail?: unknown): never {
  throw new YoutubeRouteError(code, message, detail);
}

export function openMigratedDb(options: OpenDbOptions = {}): OpenDbResult {
  const result = openDb(options);
  try {
    runMigrations(result.db);
    return result;
  } catch (err) {
    result.db.close();
    throw new YoutubeRouteError('db_error', `DB 마이그레이션 실패: ${(err as Error).message}`, {
      filename: (err as Error & { filename?: string }).filename,
    });
  }
}

export function runInTransaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors on an already-aborted transaction.
    }
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayUtc(): string {
  return nowIso().slice(0, 10);
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase().normalize('NFC');
}

export function normalizeRegion(region: string | undefined): string {
  return (region ?? 'KR').trim().toUpperCase();
}

export function parseSearchOrder(order: string | undefined): YoutubeSearchOrder {
  return YoutubeSearchOrderSchema.parse(order ?? 'relevance');
}

export function parsePositiveInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw == null || raw.length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail('validation_error', `${name} 값은 양의 정수여야 합니다.`, { value: raw });
  }
  return parsed;
}

export function clampMax(value: number, max: number, name: string): number {
  if (value > max) {
    fail('validation_error', `${name} 값은 ${max} 이하여야 합니다.`, { value, max });
  }
  return value;
}

export interface KeywordRecord {
  id: string;
  keyword: string;
  normalized_keyword: string;
  region_code: string;
  search_order: YoutubeSearchOrder;
  last_search_session_id: string | null;
  last_collected_at: string | null;
  cache_expires_at: string | null;
  result_count: number;
}

export interface UpsertKeywordInput {
  keyword: string;
  region?: string | undefined;
  order?: YoutubeSearchOrder | undefined;
}

export interface UpsertKeywordResult {
  keywordId: string;
  normalized: string;
  region: string;
  order: YoutubeSearchOrder;
  created: boolean;
}

export function upsertKeyword(db: Db, input: UpsertKeywordInput): UpsertKeywordResult {
  const keyword = input.keyword.trim();
  if (keyword.length === 0) {
    fail('validation_error', '키워드는 비어 있을 수 없습니다.');
  }

  const normalized = normalizeKeyword(keyword);
  const region = normalizeRegion(input.region);
  const order = input.order ?? 'relevance';
  const existing = db
    .prepare(
      `SELECT id FROM youtube_keywords
       WHERE normalized_keyword = ? AND region_code = ? AND search_order = ?`,
    )
    .get(normalized, region, order) as { id: string } | undefined;

  const timestamp = nowIso();
  if (existing) {
    db.prepare(
      `UPDATE youtube_keywords
       SET keyword = ?, updated_at = ?
       WHERE id = ?`,
    ).run(keyword, timestamp, existing.id);

    return { keywordId: existing.id, normalized, region, order, created: false };
  }

  const keywordId = randomUUID();
  db.prepare(
    `INSERT INTO youtube_keywords
       (id, keyword, normalized_keyword, region_code, search_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(keywordId, keyword, normalized, region, order, timestamp, timestamp);

  return { keywordId, normalized, region, order, created: true };
}

export function getKeywordById(db: Db, keywordId: string): KeywordRecord {
  const row = db
    .prepare(
      `SELECT id, keyword, normalized_keyword, region_code, search_order,
              last_search_session_id, last_collected_at, cache_expires_at, result_count
       FROM youtube_keywords
       WHERE id = ?`,
    )
    .get(keywordId) as KeywordRecord | undefined;

  if (!row) {
    fail('not_found', `keyword_id 를 찾을 수 없습니다: ${keywordId}`);
  }
  return row;
}

export interface ApiKeySelection {
  id: string;
  key: string;
  label: string;
}

interface ApiKeyRow {
  id: string;
  key: string;
  label: string;
}

export function selectYoutubeApiKey(db: Db, env: NodeJS.ProcessEnv = process.env): ApiKeySelection {
  const usageDay = todayUtc();
  const existing = db
    .prepare(
      `SELECT k.id, k.key, k.label
       FROM youtube_api_keys k
       LEFT JOIN youtube_api_key_daily_usage u
         ON u.key_id = k.id AND u.usage_day = ?
       WHERE k.status = 'active'
       ORDER BY COALESCE(u.units_consumed, 0) ASC, COALESCE(k.last_used_at, '') ASC
       LIMIT 1`,
    )
    .get(usageDay) as ApiKeyRow | undefined;

  if (existing) return existing;

  const envKey = env.YOUTUBE_API_KEY?.trim();
  if (!envKey) {
    fail(
      'invalid_key',
      'YOUTUBE_API_KEY 가 설정되어 있지 않습니다. `.env.example` 를 참고해 셸 환경변수 또는 로컬 DB 키를 설정해주세요.',
    );
  }

  const label = 'env:YOUTUBE_API_KEY';
  const timestamp = nowIso();
  const row = db.prepare(`SELECT id FROM youtube_api_keys WHERE label = ?`).get(label) as
    | { id: string }
    | undefined;

  if (row) {
    db.prepare(
      `UPDATE youtube_api_keys
       SET key = ?, status = 'active', disabled_reason = NULL, updated_at = ?
       WHERE id = ?`,
    ).run(envKey, timestamp, row.id);
    return { id: row.id, key: envKey, label };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO youtube_api_keys (id, label, key, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).run(id, label, envKey, timestamp, timestamp);
  return { id, key: envKey, label };
}

export interface AuditMetadata {
  operation: string;
  units: number;
  keyword?: string | undefined;
  videoIds?: string[] | undefined;
  channelId?: string | undefined;
  searchSessionId?: string | undefined;
}

type AuditStatus = 'success' | 'error' | 'quota_exceeded';

function recordApiAudit(
  db: Db,
  apiKey: ApiKeySelection,
  metadata: AuditMetadata,
  status: AuditStatus,
  resultCount: number | null,
  errorReason: string | null,
): void {
  const timestamp = nowIso();
  const usageDay = timestamp.slice(0, 10);

  runInTransaction(db, () => {
    db.prepare(
      `INSERT INTO youtube_api_key_daily_usage
         (key_id, usage_day, units_consumed, status, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(key_id, usage_day) DO UPDATE SET
         units_consumed = youtube_api_key_daily_usage.units_consumed + excluded.units_consumed,
         status = CASE
           WHEN excluded.status = 'quota_exceeded' THEN 'quota_exceeded'
           ELSE youtube_api_key_daily_usage.status
         END,
         updated_at = excluded.updated_at`,
    ).run(apiKey.id, usageDay, metadata.units, status === 'quota_exceeded' ? 'quota_exceeded' : 'ok', timestamp);

    db.prepare(
      `INSERT INTO daily_quota_usage (usage_day, units_consumed, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(usage_day) DO UPDATE SET
         units_consumed = daily_quota_usage.units_consumed + excluded.units_consumed,
         updated_at = excluded.updated_at`,
    ).run(usageDay, metadata.units, timestamp);

    db.prepare(
      `INSERT INTO api_call_audits
         (id, occurred_at, operation, keyword, video_ids, channel_id, result_count,
          units_consumed, status, error_reason, api_key_id, search_session_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      timestamp,
      metadata.operation,
      metadata.keyword ?? null,
      metadata.videoIds ? JSON.stringify(metadata.videoIds) : null,
      metadata.channelId ?? null,
      resultCount,
      metadata.units,
      status,
      errorReason,
      apiKey.id,
      metadata.searchSessionId ?? null,
    );

    db.prepare(
      `UPDATE youtube_api_keys
       SET last_used_at = ?,
           updated_at = ?,
           status = CASE WHEN ? = 'quota_exceeded' THEN 'exhausted' ELSE status END
       WHERE id = ?`,
    ).run(timestamp, timestamp, status, apiKey.id);
  });
}

function checkDailyQuota(db: Db, units: number): void {
  const usageDay = todayUtc();
  const row = db
    .prepare(`SELECT units_consumed FROM daily_quota_usage WHERE usage_day = ?`)
    .get(usageDay) as { units_consumed: number } | undefined;
  const consumed = row?.units_consumed ?? 0;
  if (consumed + units > 10_000) {
    fail('quota_exceeded', '오늘 YouTube API quota 예상 사용량이 10,000 unit 을 초과합니다.', {
      usageDay,
      consumed,
      requested: units,
    });
  }
}

function classifyYoutubeError(status: number, body: unknown): YoutubeRouteError {
  const error = (body as { error?: { message?: string; errors?: Array<{ reason?: string }> } }).error;
  const reason = error?.errors?.[0]?.reason;
  const message = error?.message ?? `YouTube API 요청 실패 (HTTP ${status})`;

  if (
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    reason === 'rateLimitExceeded'
  ) {
    return new YoutubeRouteError('quota_exceeded', message, { status, reason });
  }
  if (reason === 'keyInvalid' || reason === 'forbidden' || status === 401 || status === 403) {
    return new YoutubeRouteError('invalid_key', message, { status, reason });
  }
  if (status === 404) {
    return new YoutubeRouteError('not_found', message, { status, reason });
  }
  return new YoutubeRouteError('unknown', message, { status, reason });
}

export interface YoutubeRequestOptions {
  resource: string;
  params: Record<string, string | number | boolean | undefined>;
  audit: AuditMetadata;
}

export async function youtubeApiRequest<T>(
  db: Db,
  apiKey: ApiKeySelection,
  options: YoutubeRequestOptions,
): Promise<T> {
  checkDailyQuota(db, options.audit.units);

  const url = new URL(`https://www.googleapis.com/youtube/v3/${options.resource}`);
  url.searchParams.set('key', apiKey.key);
  for (const [key, value] of Object.entries(options.params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let status: AuditStatus = 'success';
  let resultCount: number | null = null;
  let errorReason: string | null = null;

  try {
    const response = await fetch(url);
    const text = await response.text();
    const body = text.length > 0 ? (JSON.parse(text) as unknown) : {};
    const items = (body as { items?: unknown[] }).items;
    resultCount = Array.isArray(items) ? items.length : null;

    if (!response.ok || (body as { error?: unknown }).error != null) {
      const err = classifyYoutubeError(response.status, body);
      status = err.code === 'quota_exceeded' ? 'quota_exceeded' : 'error';
      errorReason = err.message;
      throw err;
    }

    return body as T;
  } catch (err) {
    if (err instanceof YoutubeRouteError) {
      throw err;
    }
    status = 'error';
    errorReason = (err as Error).message;
    throw new YoutubeRouteError('network_error', `YouTube API 네트워크 오류: ${errorReason}`);
  } finally {
    recordApiAudit(db, apiKey, options.audit, status, resultCount, errorReason);
  }
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
    tags?: string[];
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

export interface YoutubeListResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

function parseInteger(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickThumbnail(thumbnails: YoutubeThumbnailMap | undefined): string | null {
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

export interface ChannelUpsertInput {
  channelId: string;
  title?: string | null;
  description?: string | null;
  customUrl?: string | null;
  country?: string | null;
  publishedAt?: string | null;
  thumbnailUrl?: string | null;
  uploadsPlaylistId?: string | null;
  subscriberCount?: number | null;
  hiddenSubscriberCount?: 0 | 1;
  viewCount?: number | null;
  videoCount?: number | null;
  raw?: string | null;
}

export interface VideoUpsertInput {
  videoId: string;
  channelId?: string | null;
  channelTitle?: string | null;
  title?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  publishedAt?: string | null;
  durationSec?: number | null;
  isShort?: 0 | 1;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
  categoryId?: string | null;
  tags?: string | null;
  raw?: string | null;
}

export function channelFromApiItem(item: YoutubeChannelItem): ChannelUpsertInput {
  return {
    channelId: item.id,
    title: item.snippet?.title ?? null,
    description: item.snippet?.description ?? null,
    customUrl: item.snippet?.customUrl ?? null,
    country: item.snippet?.country ?? null,
    publishedAt: item.snippet?.publishedAt ?? null,
    thumbnailUrl: pickThumbnail(item.snippet?.thumbnails),
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads ?? null,
    subscriberCount: parseInteger(item.statistics?.subscriberCount),
    hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount === true ? 1 : 0,
    viewCount: parseInteger(item.statistics?.viewCount),
    videoCount: parseInteger(item.statistics?.videoCount),
    raw: JSON.stringify(item),
  };
}

export function videoFromApiItem(item: YoutubeVideoItem): VideoUpsertInput {
  const durationSec = parseIsoDurationSeconds(item.contentDetails?.duration);
  return {
    videoId: item.id,
    channelId: item.snippet?.channelId ?? null,
    channelTitle: item.snippet?.channelTitle ?? null,
    title: item.snippet?.title ?? null,
    description: item.snippet?.description ?? null,
    thumbnailUrl: pickThumbnail(item.snippet?.thumbnails),
    videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
    publishedAt: item.snippet?.publishedAt ?? null,
    durationSec,
    isShort: durationSec != null && durationSec <= 60 ? 1 : 0,
    viewCount: parseInteger(item.statistics?.viewCount),
    likeCount: parseInteger(item.statistics?.likeCount),
    commentCount: parseInteger(item.statistics?.commentCount),
    categoryId: item.snippet?.categoryId ?? null,
    tags: item.snippet?.tags ? JSON.stringify(item.snippet.tags) : null,
    raw: JSON.stringify(item),
  };
}

export function upsertChannels(db: Db, channels: ChannelUpsertInput[], collectedAt = nowIso()): void {
  const statement = db.prepare(
    `INSERT INTO youtube_channels
       (channel_id, title, description, custom_url, country, published_at, thumbnail_url,
        uploads_playlist_id, subscriber_count, hidden_subscriber_count, view_count, video_count,
        raw, collected_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(channel_id) DO UPDATE SET
       title = COALESCE(excluded.title, youtube_channels.title),
       description = COALESCE(excluded.description, youtube_channels.description),
       custom_url = COALESCE(excluded.custom_url, youtube_channels.custom_url),
       country = COALESCE(excluded.country, youtube_channels.country),
       published_at = COALESCE(excluded.published_at, youtube_channels.published_at),
       thumbnail_url = COALESCE(excluded.thumbnail_url, youtube_channels.thumbnail_url),
       uploads_playlist_id = COALESCE(excluded.uploads_playlist_id, youtube_channels.uploads_playlist_id),
       subscriber_count = COALESCE(excluded.subscriber_count, youtube_channels.subscriber_count),
       hidden_subscriber_count = excluded.hidden_subscriber_count,
       view_count = COALESCE(excluded.view_count, youtube_channels.view_count),
       video_count = COALESCE(excluded.video_count, youtube_channels.video_count),
       raw = COALESCE(excluded.raw, youtube_channels.raw),
       collected_at = excluded.collected_at,
       updated_at = excluded.updated_at`,
  );

  for (const channel of channels) {
    statement.run(
      channel.channelId,
      channel.title ?? null,
      channel.description ?? null,
      channel.customUrl ?? null,
      channel.country ?? null,
      channel.publishedAt ?? null,
      channel.thumbnailUrl ?? null,
      channel.uploadsPlaylistId ?? null,
      channel.subscriberCount ?? null,
      channel.hiddenSubscriberCount ?? 0,
      channel.viewCount ?? null,
      channel.videoCount ?? null,
      channel.raw ?? null,
      collectedAt,
      collectedAt,
      collectedAt,
    );
  }
}

export function upsertVideos(db: Db, videos: VideoUpsertInput[], collectedAt = nowIso()): void {
  const channelInputs = new Map<string, ChannelUpsertInput>();
  for (const video of videos) {
    if (video.channelId && !channelInputs.has(video.channelId)) {
      channelInputs.set(video.channelId, {
        channelId: video.channelId,
        title: video.channelTitle ?? null,
      });
    }
  }
  upsertChannels(db, [...channelInputs.values()], collectedAt);

  const statement = db.prepare(
    `INSERT INTO youtube_videos
       (video_id, channel_id, title, description, thumbnail_url, video_url, published_at,
        duration_sec, is_short, view_count, like_count, comment_count, category_id, tags,
        raw, collected_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(video_id) DO UPDATE SET
       channel_id = COALESCE(excluded.channel_id, youtube_videos.channel_id),
       title = COALESCE(excluded.title, youtube_videos.title),
       description = COALESCE(excluded.description, youtube_videos.description),
       thumbnail_url = COALESCE(excluded.thumbnail_url, youtube_videos.thumbnail_url),
       video_url = COALESCE(excluded.video_url, youtube_videos.video_url),
       published_at = COALESCE(excluded.published_at, youtube_videos.published_at),
       duration_sec = COALESCE(excluded.duration_sec, youtube_videos.duration_sec),
       is_short = excluded.is_short,
       view_count = COALESCE(excluded.view_count, youtube_videos.view_count),
       like_count = COALESCE(excluded.like_count, youtube_videos.like_count),
       comment_count = COALESCE(excluded.comment_count, youtube_videos.comment_count),
       category_id = COALESCE(excluded.category_id, youtube_videos.category_id),
       tags = COALESCE(excluded.tags, youtube_videos.tags),
       raw = COALESCE(excluded.raw, youtube_videos.raw),
       collected_at = excluded.collected_at,
       updated_at = excluded.updated_at`,
  );

  for (const video of videos) {
    statement.run(
      video.videoId,
      video.channelId ?? null,
      video.title ?? null,
      video.description ?? null,
      video.thumbnailUrl ?? null,
      video.videoUrl ?? `https://www.youtube.com/watch?v=${video.videoId}`,
      video.publishedAt ?? null,
      video.durationSec ?? null,
      video.isShort ?? 0,
      video.viewCount ?? null,
      video.likeCount ?? null,
      video.commentCount ?? null,
      video.categoryId ?? null,
      video.tags ?? null,
      video.raw ?? null,
      collectedAt,
      collectedAt,
      collectedAt,
    );
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
