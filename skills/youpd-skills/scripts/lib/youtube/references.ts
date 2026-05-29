import { randomUUID } from 'node:crypto';

import type { Db } from '../db/client.ts';
import type { ConsumerStage, ReferenceVideoItem, ScoreGrade } from '../types/youtube.ts';
import { SCORE_POLICY_VERSION } from '../types/youtube.ts';
import type { YoutubeCommentThreadItem } from './api.ts';
import { fail, meetsMinGrade, nowIso } from './common.ts';

export const DEFAULT_STAGE_FOLDERS: Array<{ name: string; stage: ConsumerStage }> = [
  { name: '현상', stage: 'phenomenon' },
  { name: '욕구', stage: 'desire' },
  { name: '계획', stage: 'plan' },
  { name: '행동', stage: 'action' },
  { name: '보상', stage: 'reward' },
];

const STAGE_ALIASES: Record<string, ConsumerStage> = {
  phenomenon: 'phenomenon',
  현상: 'phenomenon',
  problem: 'phenomenon',
  desire: 'desire',
  욕구: 'desire',
  plan: 'plan',
  계획: 'plan',
  action: 'action',
  행동: 'action',
  reward: 'reward',
  보상: 'reward',
  mixed: 'mixed',
  복합: 'mixed',
  unspecified: 'unspecified',
  미지정: 'unspecified',
};

export function parseConsumerStage(raw: string | undefined, fallback: ConsumerStage = 'unspecified'): ConsumerStage {
  if (raw == null || raw.trim().length === 0) return fallback;
  const normalized = raw.trim().toLowerCase();
  const stage = STAGE_ALIASES[normalized] ?? STAGE_ALIASES[raw.trim()];
  if (!stage) {
    fail('validation_error', `지원하지 않는 consumer stage 입니다: ${raw}`, {
      allowed: Object.keys(STAGE_ALIASES),
    });
  }
  return stage;
}

export function parseFolderSpec(raw: string): { name: string; stage: ConsumerStage } {
  const [namePart, stagePart] = raw.split(':', 2);
  const name = namePart?.trim();
  if (!name) fail('validation_error', '--folder 값의 이름은 비어 있을 수 없습니다.', { value: raw });
  return { name, stage: parseConsumerStage(stagePart, 'unspecified') };
}

export interface EnsureFolderGroupInput {
  name: string;
  description?: string | undefined;
  intentSummary?: string | undefined;
  audience?: string | undefined;
  seedTheme?: string | undefined;
}

export interface EnsureFolderGroupResult {
  id: string;
  created: boolean;
}

export function ensureFolderGroup(db: Db, input: EnsureFolderGroupInput): EnsureFolderGroupResult {
  const name = input.name.trim();
  if (name.length === 0) fail('validation_error', 'folder group name 은 비어 있을 수 없습니다.');
  const timestamp = nowIso();
  const existing = db
    .prepare(`SELECT id FROM reference_folder_groups WHERE name = ?`)
    .get(name) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE reference_folder_groups
       SET description = COALESCE(?, description),
           intent_summary = COALESCE(?, intent_summary),
           audience = COALESCE(?, audience),
           seed_theme = COALESCE(?, seed_theme),
           updated_at = ?
       WHERE id = ?`,
    ).run(
      input.description ?? null,
      input.intentSummary ?? null,
      input.audience ?? null,
      input.seedTheme ?? null,
      timestamp,
      existing.id,
    );
    return { id: existing.id, created: false };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO reference_folder_groups
       (id, name, description, intent_summary, audience, seed_theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    name,
    input.description ?? null,
    input.intentSummary ?? null,
    input.audience ?? null,
    input.seedTheme ?? null,
    timestamp,
    timestamp,
  );
  return { id, created: true };
}

export interface EnsureFolderInput {
  groupId: string;
  name: string;
  stage?: ConsumerStage | undefined;
  description?: string | undefined;
  sortOrder?: number | undefined;
}

export interface EnsureFolderResult {
  id: string;
  created: boolean;
}

export function ensureFolder(db: Db, input: EnsureFolderInput): EnsureFolderResult {
  const name = input.name.trim();
  if (name.length === 0) fail('validation_error', 'folder name 은 비어 있을 수 없습니다.');
  const timestamp = nowIso();
  const stage = input.stage ?? 'unspecified';
  const existing = db
    .prepare(`SELECT id FROM reference_folders WHERE group_id = ? AND name = ?`)
    .get(input.groupId, name) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE reference_folders
       SET consumer_stage = ?,
           description = COALESCE(?, description),
           sort_order = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(stage, input.description ?? null, input.sortOrder ?? 0, timestamp, existing.id);
    return { id: existing.id, created: false };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO reference_folders
       (id, group_id, name, consumer_stage, description, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.groupId, name, stage, input.description ?? null, input.sortOrder ?? 0, timestamp, timestamp);
  return { id, created: true };
}

export function getFolder(db: Db, folderId: string): { id: string; group_id: string; consumer_stage: ConsumerStage } {
  const row = db
    .prepare(`SELECT id, group_id, consumer_stage FROM reference_folders WHERE id = ?`)
    .get(folderId) as { id: string; group_id: string; consumer_stage: ConsumerStage } | undefined;
  if (!row) fail('not_found', `reference folder 를 찾을 수 없습니다: ${folderId}`);
  return row;
}

export function createDiscoveryRun(
  db: Db,
  input: {
    folderGroupId?: string | undefined;
    requestText?: string | undefined;
    audience?: string | undefined;
    seedTheme?: string | undefined;
    selectedStages: ConsumerStage[];
    keywordProbeSummary?: string | undefined;
    searchSessionIds: string[];
    complete?: boolean | undefined;
  },
): string {
  const timestamp = nowIso();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO reference_discovery_runs
       (id, folder_group_id, request_text, audience, seed_theme, selected_stages_json,
        keyword_probe_summary, executed_search_session_ids_json, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.folderGroupId ?? null,
    input.requestText ?? null,
    input.audience ?? null,
    input.seedTheme ?? null,
    JSON.stringify(input.selectedStages),
    input.keywordProbeSummary ?? null,
    JSON.stringify(input.searchSessionIds),
    timestamp,
    input.complete === true ? timestamp : null,
  );
  return id;
}

interface CandidateRow {
  video_id: string;
  source_keyword_id: string | null;
  source_search_session_id: string | null;
  source_hot_date: string | null;
  video_snapshot_collected_at: string | null;
  score_policy_version: string | null;
  performance_grade: ScoreGrade | null;
  contribution_grade: ScoreGrade | null;
  length_adjusted_score: number | null;
}

export function selectCurationCandidates(
  db: Db,
  input: {
    searchSessionId?: string | undefined;
    hotDate?: string | undefined;
    region?: string | undefined;
    videoIds?: string[] | undefined;
    minGrade: Exclude<ScoreGrade, 'Unknown'>;
    limit: number;
  },
): CandidateRow[] {
  const sourceCount = [input.searchSessionId, input.hotDate, input.videoIds?.length ? 'videos' : undefined].filter(
    Boolean,
  ).length;
  if (sourceCount !== 1) {
    fail('validation_error', 'source 는 --search-session-id, --hot-date, --video-id 중 정확히 하나여야 합니다.');
  }

  if (input.searchSessionId) {
    const rows = db
      .prepare(
        `SELECT
           v.video_id,
           kvr.keyword_id AS source_keyword_id,
           kvr.session_id AS source_search_session_id,
           NULL AS source_hot_date,
           s.video_snapshot_collected_at,
           s.policy_version AS score_policy_version,
           s.performance_grade,
           s.contribution_grade,
           s.length_adjusted_score
         FROM youtube_keyword_video_results kvr
         JOIN youtube_videos v ON v.video_id = kvr.video_id
         JOIN youtube_video_scores s
           ON s.video_id = v.video_id
          AND s.policy_version = ?
         WHERE kvr.session_id = ?
           AND s.computed_at = (
             SELECT MAX(s2.computed_at)
             FROM youtube_video_scores s2
             WHERE s2.video_id = v.video_id
               AND s2.policy_version = ?
           )
         ORDER BY s.length_adjusted_score DESC NULLS LAST, kvr.position ASC
         LIMIT ?`,
      )
      .all(SCORE_POLICY_VERSION, input.searchSessionId, SCORE_POLICY_VERSION, input.limit * 5) as unknown as CandidateRow[];
    return rows
      .filter(
        (row) =>
          row.performance_grade != null &&
          row.contribution_grade != null &&
          meetsMinGrade(row.performance_grade, input.minGrade) &&
          meetsMinGrade(row.contribution_grade, input.minGrade),
      )
      .slice(0, input.limit);
  }

  if (input.hotDate) {
    const rows = db
      .prepare(
        `SELECT
           h.video_id,
           NULL AS source_keyword_id,
           NULL AS source_search_session_id,
           h.hot_date AS source_hot_date,
           h.video_snapshot_collected_at,
           h.score_policy_version,
           s.performance_grade,
           s.contribution_grade,
           s.length_adjusted_score
         FROM youtube_hot_videos h
         JOIN youtube_video_scores s
           ON s.video_id = h.video_id
          AND s.video_snapshot_collected_at = h.video_snapshot_collected_at
          AND s.policy_version = h.score_policy_version
         WHERE h.hot_date = ? AND h.region_code = ?
         ORDER BY h.rank ASC
         LIMIT ?`,
      )
      .all(input.hotDate, input.region ?? 'KR', input.limit * 5) as unknown as CandidateRow[];
    return rows
      .filter(
        (row) =>
          row.performance_grade != null &&
          row.contribution_grade != null &&
          meetsMinGrade(row.performance_grade, input.minGrade) &&
          meetsMinGrade(row.contribution_grade, input.minGrade),
      )
      .slice(0, input.limit);
  }

  const videoIds = input.videoIds ?? [];
  if (videoIds.length === 0) fail('validation_error', '--video-id 가 필요합니다.');
  const placeholders = videoIds.map(() => '?').join(', ');
  return db
    .prepare(
      `SELECT
         v.video_id,
         NULL AS source_keyword_id,
         NULL AS source_search_session_id,
         NULL AS source_hot_date,
         s.video_snapshot_collected_at,
         s.policy_version AS score_policy_version,
         s.performance_grade,
         s.contribution_grade,
         s.length_adjusted_score
       FROM youtube_videos v
       LEFT JOIN youtube_video_scores s
         ON s.video_id = v.video_id
        AND s.policy_version = ?
        AND s.computed_at = (
          SELECT MAX(s2.computed_at)
          FROM youtube_video_scores s2
          WHERE s2.video_id = v.video_id
            AND s2.policy_version = ?
        )
       WHERE v.video_id IN (${placeholders})
       ORDER BY s.length_adjusted_score DESC NULLS LAST`,
    )
    .all(SCORE_POLICY_VERSION, SCORE_POLICY_VERSION, ...videoIds) as unknown as CandidateRow[];
}

export function insertCuration(
  db: Db,
  input: {
    folderId: string;
    stage: ConsumerStage;
    discoveryRunId?: string | undefined;
    reason?: string | undefined;
    candidates: CandidateRow[];
  },
): { addedCount: number; skippedExistingCount: number; videoIds: string[] } {
  const timestamp = nowIso();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO reference_folder_videos
       (folder_id, video_id, consumer_stage, source_keyword_id, source_search_session_id,
        source_hot_date, video_snapshot_collected_at, score_policy_version, discovery_run_id,
        reason, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let addedCount = 0;
  const videoIds: string[] = [];
  for (const candidate of input.candidates) {
    const result = insert.run(
      input.folderId,
      candidate.video_id,
      input.stage,
      candidate.source_keyword_id,
      candidate.source_search_session_id,
      candidate.source_hot_date,
      candidate.video_snapshot_collected_at,
      candidate.score_policy_version,
      input.discoveryRunId ?? null,
      input.reason ?? null,
      timestamp,
      timestamp,
    );
    if (result.changes > 0) {
      addedCount += 1;
      videoIds.push(candidate.video_id);
    }
  }

  return {
    addedCount,
    skippedExistingCount: input.candidates.length - addedCount,
    videoIds,
  };
}

export function listReferences(
  db: Db,
  input: {
    folderId?: string | undefined;
    folderGroupId?: string | undefined;
    stage?: ConsumerStage | undefined;
    limit: number;
    order: 'score' | 'added_at' | 'published_at';
  },
): ReferenceVideoItem[] {
  if (!input.folderId && !input.folderGroupId) {
    fail('validation_error', '--folder-id 또는 --folder-group-id 가 필요합니다.');
  }

  const where: string[] = [];
  const params: string[] = [];
  if (input.folderId) {
    where.push('f.id = ?');
    params.push(input.folderId);
  }
  if (input.folderGroupId) {
    where.push('g.id = ?');
    params.push(input.folderGroupId);
  }
  if (input.stage) {
    where.push('rfv.consumer_stage = ?');
    params.push(input.stage);
  }

  const orderBy =
    input.order === 'added_at'
      ? 'rfv.added_at DESC'
      : input.order === 'published_at'
        ? 'v.published_at DESC'
        : 's.length_adjusted_score DESC NULLS LAST, rfv.added_at DESC';

  return db
    .prepare(
      `SELECT
         f.id AS folderId,
         f.name AS folderName,
         g.id AS folderGroupId,
         g.name AS folderGroupName,
         rfv.consumer_stage AS consumerStage,
         v.video_id AS videoId,
         v.title AS title,
         c.title AS channelTitle,
         v.published_at AS publishedAt,
         s.performance_grade AS performanceGrade,
         s.contribution_grade AS contributionGrade,
         s.length_adjusted_score AS lengthAdjustedScore,
         rfv.added_at AS addedAt,
         rfv.reason AS reason
       FROM reference_folder_videos rfv
       JOIN reference_folders f ON f.id = rfv.folder_id
       JOIN reference_folder_groups g ON g.id = f.group_id
       JOIN youtube_videos v ON v.video_id = rfv.video_id
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       LEFT JOIN youtube_video_scores s
         ON s.video_id = rfv.video_id
        AND s.video_snapshot_collected_at = rfv.video_snapshot_collected_at
        AND s.policy_version = rfv.score_policy_version
       WHERE ${where.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ?`,
    )
    .all(...params, input.limit) as ReferenceVideoItem[];
}

export function removeReferences(db: Db, folderId: string, videoIds: string[]): number {
  if (videoIds.length === 0) fail('validation_error', '--video-id 가 필요합니다.');
  const placeholders = videoIds.map(() => '?').join(', ');
  const result = db
    .prepare(`DELETE FROM reference_folder_videos WHERE folder_id = ? AND video_id IN (${placeholders})`)
    .run(folderId, ...videoIds);
  return Number(result.changes);
}

export function getVideoIdsForFolder(db: Db, folderId: string): string[] {
  return (
    db
      .prepare(`SELECT video_id FROM reference_folder_videos WHERE folder_id = ? ORDER BY added_at DESC`)
      .all(folderId) as Array<{ video_id: string }>
  ).map((row) => row.video_id);
}

export function createCommentFetchSession(
  db: Db,
  input: {
    videoId: string;
    folderId?: string | undefined;
    discoveryRunId?: string | undefined;
    order: 'relevance' | 'time';
    maxResults: number;
    rawParams: Record<string, unknown>;
  },
): string {
  const sessionId = randomUUID();
  db.prepare(
    `INSERT INTO youtube_comment_fetch_sessions
       (id, video_id, folder_id, discovery_run_id, order_by, max_results, raw_params, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    input.videoId,
    input.folderId ?? null,
    input.discoveryRunId ?? null,
    input.order,
    input.maxResults,
    JSON.stringify(input.rawParams),
    nowIso(),
  );
  return sessionId;
}

export function completeCommentFetchSession(
  db: Db,
  sessionId: string,
  stats: { resultCount: number; unitsConsumed: number },
): void {
  db.prepare(
    `UPDATE youtube_comment_fetch_sessions
     SET result_count = ?, units_consumed = ?, completed_at = ?
     WHERE id = ?`,
  ).run(stats.resultCount, stats.unitsConsumed, nowIso(), sessionId);
}

export function upsertTopLevelComments(
  db: Db,
  input: {
    videoId: string;
    fetchSessionId: string;
    comments: YoutubeCommentThreadItem[];
    collectedAt: string;
  },
): { insertedCount: number; skippedExistingCount: number; languagePrompts: Array<{ videoId: string; commentText: string }> } {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO youtube_comments
       (comment_id, video_id, parent_comment_id, fetch_session_id, author_display_name,
        text_original, like_count, published_at, updated_at, collected_at, raw)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  let insertedCount = 0;
  const languagePrompts: Array<{ videoId: string; commentText: string }> = [];
  for (const item of input.comments) {
    const top = item.snippet?.topLevelComment;
    const snippet = top?.snippet;
    const commentId = top?.id ?? item.id;
    const text = snippet?.textOriginal ?? snippet?.textDisplay;
    if (!commentId || !text) continue;
    const result = insert.run(
      commentId,
      input.videoId,
      input.fetchSessionId,
      snippet?.authorDisplayName ?? null,
      text,
      snippet?.likeCount ?? null,
      snippet?.publishedAt ?? null,
      snippet?.updatedAt ?? null,
      input.collectedAt,
      JSON.stringify(item),
    );
    if (result.changes > 0) insertedCount += 1;
    languagePrompts.push({ videoId: input.videoId, commentText: text });
  }

  return {
    insertedCount,
    skippedExistingCount: input.comments.length - insertedCount,
    languagePrompts,
  };
}
