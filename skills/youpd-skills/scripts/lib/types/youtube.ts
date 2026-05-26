import { z } from 'zod';

/**
 * YouTube domain row shapes. SQLite stores everything as TEXT/INTEGER, so
 * arrays/objects come back as JSON strings; helpers in P1.1+ will hide that.
 */

export type YoutubeBoolean = 0 | 1;

export interface YoutubeChannelRow {
  channel_id: string;
  title: string | null;
  description: string | null;
  custom_url: string | null;
  country: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  uploads_playlist_id: string | null;
  subscriber_count: number | null;
  hidden_subscriber_count: YoutubeBoolean;
  view_count: number | null;
  video_count: number | null;
  raw: string | null;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

export interface YoutubeVideoRow {
  video_id: string;
  channel_id: string | null;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  published_at: string | null;
  duration_sec: number | null;
  is_short: YoutubeBoolean;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  category_id: string | null;
  tags: string | null;
  raw: string | null;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

export type YoutubeSearchSessionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial_success'
  | 'failed';

export interface YoutubeSearchSessionRow {
  id: string;
  type: string;
  query: string | null;
  status: YoutubeSearchSessionStatus;
  result_count: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export type YoutubeSearchOrder = 'relevance' | 'viewCount' | 'date' | 'rating';

export const YoutubeSearchOrderSchema = z.enum(['relevance', 'viewCount', 'date', 'rating']);

export interface YoutubeKeywordRow {
  id: string;
  keyword: string;
  normalized_keyword: string;
  region_code: string;
  search_order: YoutubeSearchOrder;
  last_search_session_id: string | null;
  last_collected_at: string | null;
  cache_expires_at: string | null;
  result_count: number;
  created_at: string;
  updated_at: string;
}

export interface YoutubeKeywordVideoResultRow {
  id: string;
  search_session_id: string;
  keyword: string;
  video_id: string;
  rank: number;
  search_order: YoutubeSearchOrder;
  region_code: string;
  published_after: string | null;
  published_before: string | null;
  collected_at: string;
}

export interface YoutubeTrendingRow {
  id: string;
  hot_date: string;
  region_code: string;
  category_id: string | null;
  video_id: string;
  rank: number;
  source: string;
  collected_at: string;
}

export interface YoutubeVideoSnapshotRow {
  id: string;
  snapshot_date: string;
  video_id: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  source: string;
  collected_at: string;
}

export interface YoutubeChannelSnapshotRow {
  id: string;
  snapshot_date: string;
  channel_id: string;
  subscriber_count: number | null;
  view_count: number | null;
  video_count: number | null;
  source: string;
  collected_at: string;
}

export type YoutubeApiKeyStatus = 'active' | 'disabled' | 'exhausted';

export interface YoutubeApiKeyRow {
  id: string;
  label: string;
  key: string;
  status: YoutubeApiKeyStatus;
  disabled_reason: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YoutubeApiKeyDailyUsageRow {
  key_id: string;
  usage_day: string;
  units_consumed: number;
  status: 'ok' | 'quota_exceeded';
  updated_at: string;
}

export interface DailyQuotaUsageRow {
  usage_day: string;
  units_consumed: number;
  updated_at: string;
}

export type ApiCallAuditStatus = 'success' | 'error' | 'quota_exceeded';

export interface ApiCallAuditRow {
  id: string;
  occurred_at: string;
  operation: string;
  keyword: string | null;
  video_ids: string | null;
  channel_id: string | null;
  result_count: number | null;
  units_consumed: number;
  status: ApiCallAuditStatus;
  error_reason: string | null;
  api_key_id: string | null;
  search_session_id: string | null;
}

export interface YoutubeReferenceRow {
  id: string;
  video_id: string;
  source_search_session_id: string | null;
  marked_at: string;
  reason: string | null;
}

export type YoutubeReferenceClassificationSource = 'manual' | 'auto';

export interface YoutubeReferenceClassificationRow {
  id: string;
  reference_id: string;
  axis_value_id: string;
  source: YoutubeReferenceClassificationSource;
  confidence: number | null;
  created_at: string;
}

export interface YoutubeCommentRow {
  comment_id: string;
  video_id: string;
  parent_comment_id: string | null;
  author_display_name: string | null;
  author_channel_id: string | null;
  text_display: string | null;
  text_original: string | null;
  like_count: number | null;
  published_at: string | null;
  updated_at_external: string | null;
  is_top_level: YoutubeBoolean;
  total_reply_count: number;
  raw: string | null;
  collected_at: string;
}
