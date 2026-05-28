import { z } from 'zod';

/** Shared route stdout contracts (P1.1 D3 §5-1). */
export type YoutubeRouteErrorCode =
  | 'validation_error'
  | 'missing_api_key'
  | 'quota_exceeded'
  | 'invalid_key'
  | 'not_found'
  | 'network_error'
  | 'db_error'
  | 'dangerous_scope'
  | 'unknown';

export interface RouteOk<T> {
  ok: true;
  route: string;
  dbPath: string;
  result: T;
  unitsConsumed: number;
}

export interface RouteError {
  ok: false;
  route: string;
  code: YoutubeRouteErrorCode;
  message: string;
  detail?: unknown;
}

export type RouteResult<T> = RouteOk<T> | RouteError;

export type YoutubeBoolean = 0 | 1;

export type ScoreGrade = 'Worst' | 'Bad' | 'Normal' | 'Good' | 'Great' | 'Unknown';

export const SCORE_POLICY_VERSION = 'youpd-score-v1.0-p1.1' as const;

export type SearchSessionRoute =
  | 'search-by-keyword'
  | 'search-channels'
  | 'fetch-channel'
  | 'fetch-channel-videos';

export type SearchSessionMode = 'initial' | 'incremental' | 'manual-refresh';

export interface YoutubeKeywordRow {
  id: string;
  keyword: string;
  normalized_keyword: string;
  region_code: string;
  ttl_hours: number;
  initial_target_count: number;
  cache_expires_at: string | null;
  last_search_session_id: string | null;
  last_incremental_session_id: string | null;
  last_incremental_published_at: string | null;
  initial_collection_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YoutubeChannelRow {
  channel_id: string;
  title: string;
  description: string | null;
  handle: string | null;
  custom_url: string | null;
  country: string | null;
  published_at: string | null;
  thumbnail_url: string | null;
  subscriber_count: number | null;
  hidden_subscriber_count: YoutubeBoolean | null;
  total_view_count: number | null;
  video_count: number | null;
  average_view_count: number | null;
  uploads_playlist_id: string | null;
  raw: string;
  collected_at: string;
  updated_at: string;
}

export interface YoutubeVideoRow {
  video_id: string;
  channel_id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  duration_sec: number | null;
  category_id: string | null;
  default_language: string | null;
  thumbnail_url: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  raw: string;
  collected_at: string;
  updated_at: string;
}

export interface YoutubeVideoScoreRow {
  video_id: string;
  video_snapshot_collected_at: string;
  channel_id: string;
  channel_snapshot_collected_at: string;
  policy_version: string;
  computed_at: string;
  performance_ratio: number | null;
  performance_grade: ScoreGrade;
  contribution_ratio: number | null;
  contribution_grade: ScoreGrade;
  length_weight: number | null;
  length_adjusted_score: number | null;
  inputs_json: string;
}

/** CLI input schemas */
export const AddKeywordInputSchema = z.object({
  keyword: z.string().min(1),
  region: z.string().min(2).max(2).default('KR'),
  ttlHours: z.number().int().positive().default(24),
  initialTargetCount: z.number().int().positive().default(500),
});

export const SearchByKeywordInputSchema = z.object({
  keyword: z.string().optional(),
  keywordId: z.string().uuid().optional(),
  region: z.string().min(2).max(2).default('KR'),
  initialTargetCount: z.number().int().positive().default(500),
  incrementalPages: z.number().int().positive().default(1),
  publishedBefore: z.string().optional(),
  force: z.boolean().default(false),
});

export const SearchChannelsInputSchema = z.object({
  keyword: z.string().min(1),
  region: z.string().min(2).max(2).default('KR'),
  maxResults: z.number().int().positive().default(50),
  pages: z.number().int().positive().default(1),
});

export const FetchChannelInputSchema = z.object({
  channelIds: z.array(z.string().min(1)).default([]),
  handles: z.array(z.string().min(1)).default([]),
});

export const FetchChannelVideosInputSchema = z.object({
  channelId: z.string().min(1),
  maxVideos: z.number().int().positive().default(100),
  publishedAfter: z.string().optional(),
});

export const ListHotVideosInputSchema = z.object({
  date: z.string().default('today'),
  region: z.string().min(2).max(2).default('KR'),
  recentDays: z.number().int().positive().default(7),
  minGrade: z.enum(['Worst', 'Bad', 'Normal', 'Good', 'Great']).default('Good'),
  limit: z.number().int().positive().default(20),
});

export type AddKeywordResult = {
  keywordId: string;
  isNew: boolean;
  normalizedKeyword: string;
  cacheExpiresAt: string | null;
  initialTargetCount: number;
};

export type SearchByKeywordResult = {
  sessionId: string;
  keywordId: string;
  mode: SearchSessionMode;
  cacheHit: boolean;
  resultCount: number;
  newVideoCount: number;
  skippedExistingVideoCount: number;
  videoIds: string[];
};

export type SearchChannelsResult = {
  sessionId: string;
  resultCount: number;
  channelIds: string[];
};

export type FetchChannelResult = {
  sessionId: string;
  channelIds: string[];
};

export type FetchChannelVideosResult = {
  sessionId: string;
  channelId: string;
  resultCount: number;
  videoIds: string[];
};

export type HotVideoItem = {
  rank: number;
  videoId: string;
  title: string;
  lengthAdjustedScore: number | null;
  performanceGrade: ScoreGrade;
  contributionGrade: ScoreGrade;
  videoSnapshotCollectedAt: string;
  scorePolicyVersion: string;
};

export type ListHotVideosResult = {
  hotDate: string;
  regionCode: string;
  minGrade: ScoreGrade;
  videos: HotVideoItem[];
};
