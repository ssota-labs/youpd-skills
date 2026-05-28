import { randomUUID } from 'node:crypto';

import type { Db } from '../db/client.ts';
import type {
  SearchSessionMode,
  SearchSessionRoute,
  YoutubeKeywordRow,
} from '../types/youtube.ts';
import { fail, normalizeKeyword, normalizeRegion, nowIso } from './common.ts';
import { computeScore } from './scoring.ts';
import type { channelFromApiItem, videoFromApiItem } from './api.ts';

type ChannelInput = ReturnType<typeof channelFromApiItem>;
type VideoInput = ReturnType<typeof videoFromApiItem>;

export interface UpsertKeywordInput {
  keyword: string;
  region?: string | undefined;
  ttlHours?: number | undefined;
  initialTargetCount?: number | undefined;
}

export interface UpsertKeywordResult {
  keywordId: string;
  isNew: boolean;
  normalizedKeyword: string;
  cacheExpiresAt: string | null;
  initialTargetCount: number;
}

export function upsertKeyword(db: Db, input: UpsertKeywordInput): UpsertKeywordResult {
  const keyword = input.keyword.trim();
  if (keyword.length === 0) {
    fail('validation_error', '키워드는 비어 있을 수 없습니다.');
  }

  const normalizedKeyword = normalizeKeyword(keyword);
  const regionCode = normalizeRegion(input.region);
  const ttlHours = input.ttlHours ?? 24;
  const initialTargetCount = input.initialTargetCount ?? 500;
  const timestamp = nowIso();

  const existing = db
    .prepare(
      `SELECT id, cache_expires_at, initial_target_count
       FROM youtube_keywords
       WHERE normalized_keyword = ? AND region_code = ?`,
    )
    .get(normalizedKeyword, regionCode) as
    | { id: string; cache_expires_at: string | null; initial_target_count: number }
    | undefined;

  if (existing) {
    db.prepare(
      `UPDATE youtube_keywords
       SET keyword = ?, ttl_hours = ?, updated_at = ?
       WHERE id = ?`,
    ).run(keyword, ttlHours, timestamp, existing.id);
    return {
      keywordId: existing.id,
      isNew: false,
      normalizedKeyword,
      cacheExpiresAt: existing.cache_expires_at,
      initialTargetCount: existing.initial_target_count,
    };
  }

  const keywordId = randomUUID();
  db.prepare(
    `INSERT INTO youtube_keywords
       (id, keyword, normalized_keyword, region_code, ttl_hours, initial_target_count,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    keywordId,
    keyword,
    normalizedKeyword,
    regionCode,
    ttlHours,
    initialTargetCount,
    timestamp,
    timestamp,
  );

  return {
    keywordId,
    isNew: true,
    normalizedKeyword,
    cacheExpiresAt: null,
    initialTargetCount,
  };
}

export function getKeywordById(db: Db, keywordId: string): YoutubeKeywordRow {
  const row = db
    .prepare(`SELECT * FROM youtube_keywords WHERE id = ?`)
    .get(keywordId) as YoutubeKeywordRow | undefined;
  if (!row) fail('not_found', `keyword_id 를 찾을 수 없습니다: ${keywordId}`);
  return row;
}

export function getKeywordByText(
  db: Db,
  keyword: string,
  region?: string,
): YoutubeKeywordRow | undefined {
  const normalizedKeyword = normalizeKeyword(keyword);
  const regionCode = normalizeRegion(region);
  return db
    .prepare(`SELECT * FROM youtube_keywords WHERE normalized_keyword = ? AND region_code = ?`)
    .get(normalizedKeyword, regionCode) as YoutubeKeywordRow | undefined;
}

export function ensureChannelStub(
  db: Db,
  channelId: string,
  title: string | null,
  collectedAt: string,
): void {
  const existing = db
    .prepare(`SELECT channel_id FROM youtube_channels WHERE channel_id = ?`)
    .get(channelId) as { channel_id: string } | undefined;
  if (existing) return;

  db.prepare(
    `INSERT INTO youtube_channels
       (channel_id, title, raw, collected_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(channelId, title ?? 'Unknown Channel', JSON.stringify({ stub: true, channelId }), collectedAt, collectedAt);
}

export function upsertChannel(db: Db, channel: ChannelInput, collectedAt: string): void {
  db.prepare(
    `INSERT INTO youtube_channels
       (channel_id, title, description, handle, custom_url, country, published_at, thumbnail_url,
        subscriber_count, hidden_subscriber_count, total_view_count, video_count, average_view_count,
        uploads_playlist_id, raw, collected_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(channel_id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       handle = COALESCE(excluded.handle, youtube_channels.handle),
       custom_url = excluded.custom_url,
       country = excluded.country,
       published_at = excluded.published_at,
       thumbnail_url = excluded.thumbnail_url,
       subscriber_count = excluded.subscriber_count,
       hidden_subscriber_count = excluded.hidden_subscriber_count,
       total_view_count = excluded.total_view_count,
       video_count = excluded.video_count,
       average_view_count = excluded.average_view_count,
       uploads_playlist_id = excluded.uploads_playlist_id,
       raw = excluded.raw,
       collected_at = excluded.collected_at,
       updated_at = excluded.updated_at`,
  ).run(
    channel.channelId,
    channel.title,
    channel.description,
    channel.handle,
    channel.customUrl,
    channel.country,
    channel.publishedAt,
    channel.thumbnailUrl,
    channel.subscriberCount,
    channel.hiddenSubscriberCount,
    channel.totalViewCount,
    channel.videoCount,
    channel.averageViewCount,
    channel.uploadsPlaylistId,
    channel.raw,
    collectedAt,
    collectedAt,
  );
}

export function upsertVideo(db: Db, video: VideoInput, collectedAt: string): void {
  ensureChannelStub(db, video.channelId, video.channelTitle, collectedAt);
  db.prepare(
    `INSERT INTO youtube_videos
       (video_id, channel_id, title, description, published_at, duration_sec, category_id,
        default_language, thumbnail_url, view_count, like_count, comment_count, raw,
        collected_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(video_id) DO UPDATE SET
       channel_id = excluded.channel_id,
       title = excluded.title,
       description = excluded.description,
       published_at = excluded.published_at,
       duration_sec = excluded.duration_sec,
       category_id = excluded.category_id,
       default_language = excluded.default_language,
       thumbnail_url = excluded.thumbnail_url,
       view_count = excluded.view_count,
       like_count = excluded.like_count,
       comment_count = excluded.comment_count,
       raw = excluded.raw,
       collected_at = excluded.collected_at,
       updated_at = excluded.updated_at`,
  ).run(
    video.videoId,
    video.channelId,
    video.title,
    video.description,
    video.publishedAt,
    video.durationSec,
    video.categoryId,
    video.defaultLanguage,
    video.thumbnailUrl,
    video.viewCount,
    video.likeCount,
    video.commentCount,
    video.raw,
    collectedAt,
    collectedAt,
  );
}

export function insertVideoSnapshot(
  db: Db,
  video: VideoInput,
  collectedAt: string,
): void {
  db.prepare(
    `INSERT OR IGNORE INTO youtube_video_snapshots
       (video_id, collected_at, view_count, like_count, comment_count, raw)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    video.videoId,
    collectedAt,
    video.viewCount,
    video.likeCount,
    video.commentCount,
    video.raw,
  );
}

export function insertChannelSnapshot(
  db: Db,
  channel: ChannelInput,
  collectedAt: string,
): void {
  db.prepare(
    `INSERT OR IGNORE INTO youtube_channel_snapshots
       (channel_id, collected_at, subscriber_count, total_view_count, video_count,
        average_view_count, raw)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    channel.channelId,
    collectedAt,
    channel.subscriberCount,
    channel.totalViewCount,
    channel.videoCount,
    channel.averageViewCount,
    channel.raw,
  );
}

export function insertVideoScore(
  db: Db,
  video: VideoInput,
  channel: ChannelInput,
  collectedAt: string,
): void {
  const computed = computeScore({
    videoId: video.videoId,
    channelId: video.channelId,
    videoViewCount: video.viewCount,
    channelSubscriberCount: channel.subscriberCount,
    channelAverageViewCount: channel.averageViewCount,
    durationSec: video.durationSec,
    videoSnapshotCollectedAt: collectedAt,
    channelSnapshotCollectedAt: collectedAt,
  });

  db.prepare(
    `INSERT OR IGNORE INTO youtube_video_scores
       (video_id, video_snapshot_collected_at, channel_id, channel_snapshot_collected_at,
        policy_version, computed_at, performance_ratio, performance_grade, contribution_ratio,
        contribution_grade, length_weight, length_adjusted_score, inputs_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    video.videoId,
    collectedAt,
    video.channelId,
    collectedAt,
    computed.policyVersion,
    nowIso(),
    computed.performanceRatio,
    computed.performanceGrade,
    computed.contributionRatio,
    computed.contributionGrade,
    computed.lengthWeight,
    computed.lengthAdjustedScore,
    computed.inputsJson,
  );
}

export function persistVideoBundle(
  db: Db,
  videos: VideoInput[],
  channels: ChannelInput[],
  collectedAt: string,
): void {
  const channelMap = new Map(channels.map((channel) => [channel.channelId, channel]));
  for (const channel of channels) {
    upsertChannel(db, channel, collectedAt);
    insertChannelSnapshot(db, channel, collectedAt);
  }
  for (const video of videos) {
    upsertVideo(db, video, collectedAt);
    insertVideoSnapshot(db, video, collectedAt);
    const channel = channelMap.get(video.channelId);
    if (channel) {
      insertVideoScore(db, video, channel, collectedAt);
    }
  }
}

export interface CreateSearchSessionInput {
  route: SearchSessionRoute;
  keywordId?: string | null;
  query?: string | null;
  regionCode?: string | null;
  mode?: SearchSessionMode | null;
  publishedAfter?: string | null;
  publishedBefore?: string | null;
  targetCount?: number | null;
  maxResults?: number | null;
  pagesRequested?: number | null;
  rawParams: Record<string, unknown>;
}

export function createSearchSession(db: Db, input: CreateSearchSessionInput): string {
  const sessionId = randomUUID();
  const startedAt = nowIso();
  db.prepare(
    `INSERT INTO youtube_search_sessions
       (id, route, keyword_id, query, region_code, mode, order_by, published_after,
        published_before, target_count, max_results, pages_requested, raw_params, started_at)
     VALUES (?, ?, ?, ?, ?, ?, 'date', ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    input.route,
    input.keywordId ?? null,
    input.query ?? null,
    input.regionCode ?? null,
    input.mode ?? null,
    input.publishedAfter ?? null,
    input.publishedBefore ?? null,
    input.targetCount ?? null,
    input.maxResults ?? null,
    input.pagesRequested ?? null,
    JSON.stringify(input.rawParams),
    startedAt,
  );
  return sessionId;
}

export function completeSearchSession(
  db: Db,
  sessionId: string,
  stats: {
    cacheHit?: boolean;
    unitsConsumed: number;
    resultCount: number;
    newVideoCount?: number;
    skippedExistingVideoCount?: number;
    pagesFetched?: number;
  },
): void {
  db.prepare(
    `UPDATE youtube_search_sessions
     SET cache_hit = ?,
         units_consumed = ?,
         result_count = ?,
         new_video_count = ?,
         skipped_existing_video_count = ?,
         pages_fetched = ?,
         completed_at = ?
     WHERE id = ?`,
  ).run(
    stats.cacheHit ? 1 : 0,
    stats.unitsConsumed,
    stats.resultCount,
    stats.newVideoCount ?? 0,
    stats.skippedExistingVideoCount ?? 0,
    stats.pagesFetched ?? null,
    nowIso(),
    sessionId,
  );
}

export function videoExists(db: Db, videoId: string): boolean {
  const row = db
    .prepare(`SELECT video_id FROM youtube_videos WHERE video_id = ?`)
    .get(videoId) as { video_id: string } | undefined;
  return row != null;
}

export function countKeywordResults(db: Db, keywordId: string): number {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT video_id) AS c
       FROM youtube_keyword_video_results
       WHERE keyword_id = ?`,
    )
    .get(keywordId) as { c: number };
  return row.c;
}

export function getCachedKeywordVideoIds(db: Db, sessionId: string): string[] {
  const rows = db
    .prepare(
      `SELECT video_id FROM youtube_keyword_video_results
       WHERE session_id = ?
       ORDER BY position ASC`,
    )
    .all(sessionId) as Array<{ video_id: string }>;
  return rows.map((row) => row.video_id);
}

export function getKeywordVideoPoolIds(db: Db, keywordId: string, limit: number): string[] {
  const rows = db
    .prepare(
      `SELECT video_id, MIN(position) AS first_position
       FROM youtube_keyword_video_results
       WHERE keyword_id = ?
       GROUP BY video_id
       ORDER BY first_position ASC
       LIMIT ?`,
    )
    .all(keywordId, limit) as Array<{ video_id: string }>;
  return rows.map((row) => row.video_id);
}

export function updateKeywordAfterSearch(
  db: Db,
  keywordId: string,
  update: {
    sessionId: string;
    ttlHours: number;
    mode: SearchSessionMode;
    maxPublishedAt: string | null;
    initialCompleted?: boolean;
  },
): void {
  const timestamp = nowIso();
  const cacheExpiresAt = new Date(Date.now() + update.ttlHours * 60 * 60 * 1000).toISOString();
  let initialCompletedValue: string | null = null;
  if (update.initialCompleted === true) {
    initialCompletedValue = timestamp;
  } else {
    const row = db
      .prepare(`SELECT initial_collection_completed_at FROM youtube_keywords WHERE id = ?`)
      .get(keywordId) as { initial_collection_completed_at: string | null } | undefined;
    initialCompletedValue = row?.initial_collection_completed_at ?? null;
  }

  db.prepare(
    `UPDATE youtube_keywords
     SET last_search_session_id = ?,
         last_incremental_session_id = ?,
         last_incremental_published_at = COALESCE(?, last_incremental_published_at),
         initial_collection_completed_at = COALESCE(?, initial_collection_completed_at),
         cache_expires_at = ?,
         updated_at = ?
     WHERE id = ?`,
  ).run(
    update.sessionId,
    update.mode === 'incremental' ? update.sessionId : null,
    update.maxPublishedAt,
    initialCompletedValue,
    cacheExpiresAt,
    timestamp,
    keywordId,
  );
}

export function insertKeywordVideoResults(
  db: Db,
  sessionId: string,
  keywordId: string,
  items: Array<{ videoId: string; position: number; raw: string }>,
): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO youtube_keyword_video_results
       (session_id, keyword_id, video_id, position, raw)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const item of items) {
    stmt.run(sessionId, keywordId, item.videoId, item.position, item.raw);
  }
}

export function insertKeywordChannelResults(
  db: Db,
  sessionId: string,
  keywordId: string | null,
  items: Array<{ channelId: string; position: number; raw: string }>,
): void {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO youtube_keyword_channel_results
       (session_id, keyword_id, channel_id, position, raw)
     VALUES (?, ?, ?, ?, ?)`,
  );
  for (const item of items) {
    stmt.run(sessionId, keywordId, item.channelId, item.position, item.raw);
  }
}

export function getChannelRow(db: Db, channelId: string) {
  return db
    .prepare(`SELECT * FROM youtube_channels WHERE channel_id = ?`)
    .get(channelId) as
    | {
        channel_id: string;
        uploads_playlist_id: string | null;
        title: string;
      }
    | undefined;
}
