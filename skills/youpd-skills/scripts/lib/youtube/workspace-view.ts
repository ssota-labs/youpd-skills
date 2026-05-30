import type { Db } from '../db/client.ts';
import { SCORE_POLICY_VERSION, type ConsumerStage, type ScoreGrade } from '../types/youtube.ts';

export interface WorkspaceViewMeta {
  dbPath: string;
  generatedAt: string;
  schemaVersionLabel: string | null;
}

export interface WorkspaceKeywordSummary {
  id: string;
  keyword: string;
  regionCode: string;
  initialCollectionCompletedAt: string | null;
  lastSearchSessionId: string | null;
}

export interface WorkspaceSearchSessionSummary {
  id: string;
  route: string;
  query: string | null;
  mode: string | null;
  resultCount: number;
  startedAt: string;
  completedAt: string | null;
  keywordId: string | null;
}

export interface WorkspaceHotVideoSummary {
  hotDate: string;
  rank: number;
  videoId: string;
  title: string;
  channelTitle: string;
  lengthAdjustedScore: number | null;
  performanceGrade: ScoreGrade;
  contributionGrade: ScoreGrade;
}

export interface WorkspaceFolderSummary {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  consumerStage: ConsumerStage;
  videoCount: number;
  titleAnalyzedCount?: number;
  thumbnailAnalyzedCount?: number;
  bothAnalyzedCount?: number;
}

export interface WorkspaceFolderAnalysisStats {
  folderId: string;
  totalVideos: number;
  titleAnalyzed: number;
  thumbnailAnalyzed: number;
  bothAnalyzed: number;
  hookPrimaryCounts: Record<string, number>;
  titleToneCounts: Record<string, number>;
  feltEmotionCounts: Record<string, number>;
  alignmentCounts: Record<string, number>;
}

export interface WorkspaceTitleAnalysisSummary {
  videoId: string;
  hookPrimary: string;
  hookSecondary: string | null;
  titleShapes: string[];
  titleTone: string;
  reasoning: string;
  analyzedAt: string;
}

export interface WorkspaceThumbnailAnalysisSummary {
  videoId: string;
  visualHierarchy: string;
  textDensity: string;
  faceTreatment: string | null;
  feltEmotion: string;
  alignmentWithTitle: string | null;
  alignmentReasoning: string | null;
  reasoning: string;
  analyzedAt: string;
}

export interface WorkspaceReferenceSummary {
  folderId: string;
  folderName: string;
  groupName: string;
  consumerStage: ConsumerStage;
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string | null;
  performanceGrade: ScoreGrade | null;
  contributionGrade: ScoreGrade | null;
  lengthAdjustedScore: number | null;
  addedAt: string;
  reason: string | null;
  hasTitleAnalysis?: boolean;
  hasThumbnailAnalysis?: boolean;
}

export interface WorkspaceChannelSummary {
  channelId: string;
  title: string;
  handle: string | null;
  subscriberCount: number | null;
  averageViewCount: number | null;
  videoCount: number | null;
  thumbnailUrl: string | null;
}

export interface WorkspaceVideoSummary {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  publishedAt: string | null;
  durationSec: number | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  thumbnailUrl: string | null;
  performanceGrade: ScoreGrade | null;
  contributionGrade: ScoreGrade | null;
  lengthAdjustedScore: number | null;
}

export interface WorkspaceCommentSummary {
  commentId: string;
  authorDisplayName: string | null;
  textOriginal: string;
  likeCount: number | null;
  publishedAt: string | null;
}

export interface WorkspaceViewPayload {
  meta: WorkspaceViewMeta;
  keywords: WorkspaceKeywordSummary[];
  searchSessions: WorkspaceSearchSessionSummary[];
  hotVideos: WorkspaceHotVideoSummary[];
  folders: WorkspaceFolderSummary[];
  folderAnalysisStats: WorkspaceFolderAnalysisStats[];
  references: WorkspaceReferenceSummary[];
  channels: WorkspaceChannelSummary[];
  videos: WorkspaceVideoSummary[];
  commentsByVideoId: Record<string, WorkspaceCommentSummary[]>;
  analysisSurfaceEnabled: boolean;
  glossaryLabels: Record<string, string>;
  titleAnalysisByVideoId: Record<string, WorkspaceTitleAnalysisSummary>;
  thumbnailAnalysisByVideoId: Record<string, WorkspaceThumbnailAnalysisSummary>;
}

const GLOSSARY_AXIS_CODES = [
  'hook-type',
  'title-shape',
  'title-tone',
  'visual-hierarchy',
  'text-density',
  'face-treatment',
  'thumbnail-emotion',
  'title-thumbnail-alignment',
] as const;

function tableExists(db: Db, tableName: string): boolean {
  const row = db
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(tableName) as { ok: number } | undefined;
  return row != null;
}

function parseJsonStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function incrementCount(map: Record<string, number>, key: string | null | undefined): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function loadGlossaryLabels(db: Db): Record<string, string> {
  const placeholders = GLOSSARY_AXIS_CODES.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT v.code, v.name
       FROM glossary_axis_values v
       JOIN glossary_axes a ON a.id = v.axis_id
       WHERE a.code IN (${placeholders})`,
    )
    .all(...GLOSSARY_AXIS_CODES) as Array<{ code: string; name: string }>;

  const labels: Record<string, string> = {};
  for (const row of rows) {
    labels[row.code] = row.name;
  }
  return labels;
}

function loadTitleAnalyses(db: Db): Record<string, WorkspaceTitleAnalysisSummary> {
  const rows = db
    .prepare(
      `SELECT video_id, hook_primary, hook_secondary, title_shapes_json, title_tone, reasoning, analyzed_at
       FROM youtube_title_analyses`,
    )
    .all() as Array<{
      video_id: string;
      hook_primary: string;
      hook_secondary: string | null;
      title_shapes_json: string;
      title_tone: string;
      reasoning: string;
      analyzed_at: string;
    }>;

  const byVideoId: Record<string, WorkspaceTitleAnalysisSummary> = {};
  for (const row of rows) {
    byVideoId[row.video_id] = {
      videoId: row.video_id,
      hookPrimary: row.hook_primary,
      hookSecondary: row.hook_secondary,
      titleShapes: parseJsonStringArray(row.title_shapes_json),
      titleTone: row.title_tone,
      reasoning: row.reasoning,
      analyzedAt: row.analyzed_at,
    };
  }
  return byVideoId;
}

function loadThumbnailAnalyses(db: Db): Record<string, WorkspaceThumbnailAnalysisSummary> {
  const rows = db
    .prepare(
      `SELECT video_id, visual_hierarchy, text_density, face_treatment, felt_emotion,
              alignment_with_title, alignment_reasoning, reasoning, analyzed_at
       FROM youtube_thumbnail_analyses`,
    )
    .all() as Array<{
      video_id: string;
      visual_hierarchy: string;
      text_density: string;
      face_treatment: string | null;
      felt_emotion: string;
      alignment_with_title: string | null;
      alignment_reasoning: string | null;
      reasoning: string;
      analyzed_at: string;
    }>;

  const byVideoId: Record<string, WorkspaceThumbnailAnalysisSummary> = {};
  for (const row of rows) {
    byVideoId[row.video_id] = {
      videoId: row.video_id,
      visualHierarchy: row.visual_hierarchy,
      textDensity: row.text_density,
      faceTreatment: row.face_treatment,
      feltEmotion: row.felt_emotion,
      alignmentWithTitle: row.alignment_with_title,
      alignmentReasoning: row.alignment_reasoning,
      reasoning: row.reasoning,
      analyzedAt: row.analyzed_at,
    };
  }
  return byVideoId;
}

function loadFolderAnalysisStats(db: Db): WorkspaceFolderAnalysisStats[] {
  const countRows = db
    .prepare(
      `SELECT
         f.id AS folder_id,
         COUNT(rfv.video_id) AS total_videos,
         COUNT(t.video_id) AS title_analyzed,
         COUNT(th.video_id) AS thumbnail_analyzed,
         COUNT(
           CASE WHEN t.video_id IS NOT NULL AND th.video_id IS NOT NULL THEN 1 END
         ) AS both_analyzed
       FROM reference_folders f
       LEFT JOIN reference_folder_videos rfv ON rfv.folder_id = f.id
       LEFT JOIN youtube_title_analyses t ON t.video_id = rfv.video_id
       LEFT JOIN youtube_thumbnail_analyses th ON th.video_id = rfv.video_id
       GROUP BY f.id`,
    )
    .all() as Array<{
      folder_id: string;
      total_videos: number;
      title_analyzed: number;
      thumbnail_analyzed: number;
      both_analyzed: number;
    }>;

  const detailRows = db
    .prepare(
      `SELECT
         rfv.folder_id,
         t.hook_primary,
         t.title_tone,
         th.felt_emotion,
         th.alignment_with_title
       FROM reference_folder_videos rfv
       LEFT JOIN youtube_title_analyses t ON t.video_id = rfv.video_id
       LEFT JOIN youtube_thumbnail_analyses th ON th.video_id = rfv.video_id`,
    )
    .all() as Array<{
      folder_id: string;
      hook_primary: string | null;
      title_tone: string | null;
      felt_emotion: string | null;
      alignment_with_title: string | null;
    }>;

  const distByFolder = new Map<
    string,
    {
      hookPrimaryCounts: Record<string, number>;
      titleToneCounts: Record<string, number>;
      feltEmotionCounts: Record<string, number>;
      alignmentCounts: Record<string, number>;
    }
  >();

  for (const row of detailRows) {
    let bucket = distByFolder.get(row.folder_id);
    if (!bucket) {
      bucket = {
        hookPrimaryCounts: {},
        titleToneCounts: {},
        feltEmotionCounts: {},
        alignmentCounts: {},
      };
      distByFolder.set(row.folder_id, bucket);
    }
    incrementCount(bucket.hookPrimaryCounts, row.hook_primary);
    incrementCount(bucket.titleToneCounts, row.title_tone);
    incrementCount(bucket.feltEmotionCounts, row.felt_emotion);
    incrementCount(bucket.alignmentCounts, row.alignment_with_title);
  }

  return countRows.map((row) => {
    const dist = distByFolder.get(row.folder_id) ?? {
      hookPrimaryCounts: {},
      titleToneCounts: {},
      feltEmotionCounts: {},
      alignmentCounts: {},
    };
    return {
      folderId: row.folder_id,
      totalVideos: row.total_videos,
      titleAnalyzed: row.title_analyzed,
      thumbnailAnalyzed: row.thumbnail_analyzed,
      bothAnalyzed: row.both_analyzed,
      hookPrimaryCounts: dist.hookPrimaryCounts,
      titleToneCounts: dist.titleToneCounts,
      feltEmotionCounts: dist.feltEmotionCounts,
      alignmentCounts: dist.alignmentCounts,
    };
  });
}

export function loadWorkspaceViewPayload(db: Db, dbPath: string): WorkspaceViewPayload {
  const metaRow = db
    .prepare(`SELECT schema_version_label FROM workspace_meta WHERE id = 1`)
    .get() as { schema_version_label: string } | undefined;

  const keywords = db
    .prepare(
      `SELECT id, keyword, region_code, initial_collection_completed_at, last_search_session_id
       FROM youtube_keywords
       ORDER BY updated_at DESC`,
    )
    .all() as Array<{
      id: string;
      keyword: string;
      region_code: string;
      initial_collection_completed_at: string | null;
      last_search_session_id: string | null;
    }>;

  const searchSessions = db
    .prepare(
      `SELECT id, route, query, mode, result_count, started_at, completed_at, keyword_id
       FROM youtube_search_sessions
       ORDER BY started_at DESC
       LIMIT 100`,
    )
    .all() as Array<{
      id: string;
      route: string;
      query: string | null;
      mode: string | null;
      result_count: number;
      started_at: string;
      completed_at: string | null;
      keyword_id: string | null;
    }>;

  const hotVideos = db
    .prepare(
      `SELECT
         h.hot_date,
         h.rank,
         h.video_id,
         v.title,
         c.title AS channel_title,
         h.length_adjusted_score,
         s.performance_grade,
         s.contribution_grade
       FROM youtube_hot_videos h
       JOIN youtube_videos v ON v.video_id = h.video_id
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       JOIN youtube_video_scores s
         ON s.video_id = h.video_id
        AND s.video_snapshot_collected_at = h.video_snapshot_collected_at
        AND s.policy_version = h.score_policy_version
       ORDER BY h.hot_date DESC, h.rank ASC
       LIMIT 100`,
    )
    .all() as Array<{
      hot_date: string;
      rank: number;
      video_id: string;
      title: string;
      channel_title: string;
      length_adjusted_score: number | null;
      performance_grade: ScoreGrade;
      contribution_grade: ScoreGrade;
    }>;

  const folders = db
    .prepare(
      `SELECT
         f.id,
         f.group_id,
         g.name AS group_name,
         f.name,
         f.consumer_stage,
         COUNT(rfv.video_id) AS video_count
       FROM reference_folders f
       JOIN reference_folder_groups g ON g.id = f.group_id
       LEFT JOIN reference_folder_videos rfv ON rfv.folder_id = f.id
       GROUP BY f.id
       ORDER BY g.name, f.sort_order, f.name`,
    )
    .all() as Array<{
      id: string;
      group_id: string;
      group_name: string;
      name: string;
      consumer_stage: ConsumerStage;
      video_count: number;
    }>;

  const references = db
    .prepare(
      `SELECT
         f.id AS folder_id,
         f.name AS folder_name,
         g.name AS group_name,
         rfv.consumer_stage,
         v.video_id,
         v.title,
         c.title AS channel_title,
         v.published_at,
         s.performance_grade,
         s.contribution_grade,
         s.length_adjusted_score,
         rfv.added_at,
         rfv.reason
       FROM reference_folder_videos rfv
       JOIN reference_folders f ON f.id = rfv.folder_id
       JOIN reference_folder_groups g ON g.id = f.group_id
       JOIN youtube_videos v ON v.video_id = rfv.video_id
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       LEFT JOIN youtube_video_scores s
         ON s.video_id = rfv.video_id
        AND s.video_snapshot_collected_at = rfv.video_snapshot_collected_at
        AND s.policy_version = rfv.score_policy_version
       ORDER BY g.name, f.sort_order, s.length_adjusted_score DESC NULLS LAST, rfv.added_at DESC`,
    )
    .all() as Array<{
      folder_id: string;
      folder_name: string;
      group_name: string;
      consumer_stage: ConsumerStage;
      video_id: string;
      title: string;
      channel_title: string;
      published_at: string | null;
      performance_grade: ScoreGrade | null;
      contribution_grade: ScoreGrade | null;
      length_adjusted_score: number | null;
      added_at: string;
      reason: string | null;
    }>;

  const channels = db
    .prepare(
      `SELECT channel_id, title, handle, subscriber_count, average_view_count, video_count, thumbnail_url
       FROM youtube_channels
       ORDER BY collected_at DESC`,
    )
    .all() as Array<{
      channel_id: string;
      title: string;
      handle: string | null;
      subscriber_count: number | null;
      average_view_count: number | null;
      video_count: number | null;
      thumbnail_url: string | null;
    }>;

  const videos = db
    .prepare(
      `SELECT
         v.video_id,
         v.channel_id,
         c.title AS channel_title,
         v.title,
         v.published_at,
         v.duration_sec,
         v.view_count,
         v.like_count,
         v.comment_count,
         v.thumbnail_url,
         s.performance_grade,
         s.contribution_grade,
         s.length_adjusted_score
       FROM youtube_videos v
       JOIN youtube_channels c ON c.channel_id = v.channel_id
       LEFT JOIN youtube_video_scores s
         ON s.video_id = v.video_id
        AND s.policy_version = ?
        AND s.computed_at = (
          SELECT MAX(s2.computed_at)
          FROM youtube_video_scores s2
          WHERE s2.video_id = v.video_id AND s2.policy_version = ?
        )
       ORDER BY v.published_at DESC NULLS LAST, v.collected_at DESC
       LIMIT 500`,
    )
    .all(SCORE_POLICY_VERSION, SCORE_POLICY_VERSION) as Array<{
      video_id: string;
      channel_id: string;
      channel_title: string;
      title: string;
      published_at: string | null;
      duration_sec: number | null;
      view_count: number | null;
      like_count: number | null;
      comment_count: number | null;
      thumbnail_url: string | null;
      performance_grade: ScoreGrade | null;
      contribution_grade: ScoreGrade | null;
      length_adjusted_score: number | null;
    }>;

  const commentRows = db
    .prepare(
      `SELECT video_id, comment_id, author_display_name, text_original, like_count, published_at
       FROM youtube_comments
       WHERE parent_comment_id IS NULL
       ORDER BY video_id, like_count DESC, published_at DESC`,
    )
    .all() as Array<{
      video_id: string;
      comment_id: string;
      author_display_name: string | null;
      text_original: string;
      like_count: number | null;
      published_at: string | null;
    }>;

  const commentsByVideoId: Record<string, WorkspaceCommentSummary[]> = {};
  for (const row of commentRows) {
    const bucket = commentsByVideoId[row.video_id] ?? [];
    if (bucket.length >= 10) continue;
    bucket.push({
      commentId: row.comment_id,
      authorDisplayName: row.author_display_name,
      textOriginal: row.text_original,
      likeCount: row.like_count,
      publishedAt: row.published_at,
    });
    commentsByVideoId[row.video_id] = bucket;
  }

  const analysisSurfaceEnabled = tableExists(db, 'youtube_title_analyses');
  const glossaryLabels = analysisSurfaceEnabled ? loadGlossaryLabels(db) : {};
  const titleAnalysisByVideoId = analysisSurfaceEnabled ? loadTitleAnalyses(db) : {};
  const thumbnailAnalysisByVideoId = analysisSurfaceEnabled ? loadThumbnailAnalyses(db) : {};
  const folderAnalysisStats = analysisSurfaceEnabled ? loadFolderAnalysisStats(db) : [];
  const folderStatsById = new Map(folderAnalysisStats.map((s) => [s.folderId, s]));

  const mappedFolders: WorkspaceFolderSummary[] = folders.map((row) => {
    const base: WorkspaceFolderSummary = {
      id: row.id,
      groupId: row.group_id,
      groupName: row.group_name,
      name: row.name,
      consumerStage: row.consumer_stage,
      videoCount: row.video_count,
    };
    if (!analysisSurfaceEnabled) return base;
    const stats = folderStatsById.get(row.id);
    if (!stats) return base;
    return {
      ...base,
      titleAnalyzedCount: stats.titleAnalyzed,
      thumbnailAnalyzedCount: stats.thumbnailAnalyzed,
      bothAnalyzedCount: stats.bothAnalyzed,
    };
  });

  const mappedReferences: WorkspaceReferenceSummary[] = references.map((row) => {
    const base: WorkspaceReferenceSummary = {
      folderId: row.folder_id,
      folderName: row.folder_name,
      groupName: row.group_name,
      consumerStage: row.consumer_stage,
      videoId: row.video_id,
      title: row.title,
      channelTitle: row.channel_title,
      publishedAt: row.published_at,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
      lengthAdjustedScore: row.length_adjusted_score,
      addedAt: row.added_at,
      reason: row.reason,
    };
    if (!analysisSurfaceEnabled) return base;
    return {
      ...base,
      hasTitleAnalysis: row.video_id in titleAnalysisByVideoId,
      hasThumbnailAnalysis: row.video_id in thumbnailAnalysisByVideoId,
    };
  });

  return {
    meta: {
      dbPath,
      generatedAt: new Date().toISOString(),
      schemaVersionLabel: metaRow?.schema_version_label ?? null,
    },
    keywords: keywords.map((row) => ({
      id: row.id,
      keyword: row.keyword,
      regionCode: row.region_code,
      initialCollectionCompletedAt: row.initial_collection_completed_at,
      lastSearchSessionId: row.last_search_session_id,
    })),
    searchSessions: searchSessions.map((row) => ({
      id: row.id,
      route: row.route,
      query: row.query,
      mode: row.mode,
      resultCount: row.result_count,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      keywordId: row.keyword_id,
    })),
    hotVideos: hotVideos.map((row) => ({
      hotDate: row.hot_date,
      rank: row.rank,
      videoId: row.video_id,
      title: row.title,
      channelTitle: row.channel_title,
      lengthAdjustedScore: row.length_adjusted_score,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
    })),
    folders: mappedFolders,
    folderAnalysisStats,
    references: mappedReferences,
    channels: channels.map((row) => ({
      channelId: row.channel_id,
      title: row.title,
      handle: row.handle,
      subscriberCount: row.subscriber_count,
      averageViewCount: row.average_view_count,
      videoCount: row.video_count,
      thumbnailUrl: row.thumbnail_url,
    })),
    videos: videos.map((row) => ({
      videoId: row.video_id,
      channelId: row.channel_id,
      channelTitle: row.channel_title,
      title: row.title,
      publishedAt: row.published_at,
      durationSec: row.duration_sec,
      viewCount: row.view_count,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      thumbnailUrl: row.thumbnail_url,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
      lengthAdjustedScore: row.length_adjusted_score,
    })),
    commentsByVideoId,
    analysisSurfaceEnabled,
    glossaryLabels,
    titleAnalysisByVideoId,
    thumbnailAnalysisByVideoId,
  };
}

export function renderWorkspaceViewHtml(payload: WorkspaceViewPayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>youpd workspace viewer</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1115;
      --panel: #171a21;
      --text: #e8eaed;
      --muted: #9aa0a6;
      --accent: #7c9cff;
      --border: #2a2f3a;
      --good: #34a853;
      --warn: #fbbc04;
      --bad: #ea4335;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
    }
    header {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    header h1 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    header .meta { color: var(--muted); font-size: 0.85rem; }
    nav { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    nav button {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.85rem;
    }
    nav button.active, nav button:hover { border-color: var(--accent); color: var(--accent); }
    main { padding: 1.25rem; max-width: 1200px; margin: 0 auto; }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .panel h2 { margin: 0 0 0.75rem; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.4rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--muted); font-weight: 500; }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover td { background: rgba(124, 156, 255, 0.08); }
    .badge {
      display: inline-block;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.75rem;
      border: 1px solid var(--border);
      margin-right: 0.25rem;
      white-space: nowrap;
    }
    .grade-Great, .grade-Good { border-color: var(--good); color: var(--good); }
    .grade-Normal { border-color: var(--warn); color: var(--warn); }
    .grade-Bad, .grade-Worst { border-color: var(--bad); color: var(--bad); }
    .stage { border-color: var(--accent); color: var(--accent); }
    .empty { color: var(--muted); padding: 1rem 0; }
    .detail-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .thumb { width: 180px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border); }
    .comment { border-top: 1px solid var(--border); padding: 0.75rem 0; }
    .back { margin-bottom: 0.75rem; }
    .back button {
      background: transparent;
      border: none;
      color: var(--accent);
      cursor: pointer;
      padding: 0;
      font-size: 0.9rem;
    }
    a.link { color: var(--accent); text-decoration: none; }
    a.link:hover { text-decoration: underline; }
    .hidden { display: none !important; }
    .callout {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .callout.warn { border-color: var(--warn); color: var(--warn); }
    .callout.ok { border-color: var(--good); color: var(--good); }
    .filter-bar { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; }
    .filter-bar button {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .filter-bar button.active { border-color: var(--accent); color: var(--accent); }
    .analysis-badge { border-color: var(--good); color: var(--good); }
    .analysis-badge.partial { border-color: var(--warn); color: var(--warn); }
    .analysis-badge.missing { border-color: var(--muted); color: var(--muted); }
    .dist-row { margin: 0.35rem 0; font-size: 0.85rem; }
    .dist-row .label { display: inline-block; min-width: 8rem; color: var(--muted); }
    .bar-wrap { display: inline-block; width: 10rem; height: 0.45rem; background: var(--border); border-radius: 4px; vertical-align: middle; margin: 0 0.35rem; }
    .bar-fill { height: 100%; background: var(--accent); border-radius: 4px; }
    tr.folder-selected td { background: rgba(124, 156, 255, 0.12); }
    details.reasoning summary { cursor: pointer; color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>youpd workspace viewer</h1>
      <div class="meta" id="meta-line"></div>
    </div>
    <nav id="main-nav">
      <button type="button" data-view="search" class="active">검색</button>
      <button type="button" data-view="folders">레퍼런스</button>
      <button type="button" data-view="channels">채널</button>
    </nav>
  </header>
  <main>
    <div id="analysis-banner"></div>
    <section id="view-search"></section>
    <section id="view-folders" class="hidden"></section>
    <section id="view-channels" class="hidden"></section>
    <section id="view-channel-detail" class="hidden"></section>
    <section id="view-video-detail" class="hidden"></section>
  </main>
  <script type="application/json" id="workspace-data">${json}</script>
  <script>
    const DATA = JSON.parse(document.getElementById('workspace-data').textContent);
    const STAGE_LABELS = {
      phenomenon: '현상', desire: '욕구', plan: '계획', action: '행동', reward: '보상',
      mixed: '복합', unspecified: '미지정'
    };
    const state = { view: 'search', channelId: null, videoId: null, folderId: null, refFilter: 'all' };

    function analysisOn() { return !!DATA.analysisSurfaceEnabled; }
    function label(code) {
      return (DATA.glossaryLabels && DATA.glossaryLabels[code]) || code;
    }
    function esc(s) {
      return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function fmtNum(n) {
      if (n == null) return '—';
      return Number(n).toLocaleString('ko-KR');
    }
    function fmtDate(s) {
      if (!s) return '—';
      try { return new Date(s).toLocaleString('ko-KR'); } catch { return s; }
    }
    function gradeBadge(label, grade) {
      if (!grade) return '';
      return '<span class="badge grade-' + esc(grade) + '">' + esc(label) + ': ' + esc(grade) + '</span>';
    }
    function stageBadge(stage) {
      const label = STAGE_LABELS[stage] || stage;
      return '<span class="badge stage">' + esc(label) + '</span>';
    }
    function ytVideoUrl(id) { return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id); }
    function ytChannelUrl(id) { return 'https://www.youtube.com/channel/' + encodeURIComponent(id); }

    function renderAnalysisBanner() {
      const el = document.getElementById('analysis-banner');
      if (!el) return;
      if (analysisOn()) {
        const nTitle = Object.keys(DATA.titleAnalysisByVideoId || {}).length;
        const nThumb = Object.keys(DATA.thumbnailAnalysisByVideoId || {}).length;
        el.innerHTML = '<div class="callout ok">제목·썸네일 분석 표면 활성 — 제목 ' + nTitle + '건 · 썸네일 ' + nThumb + '건</div>';
      } else {
        el.innerHTML = '<div class="callout warn">P1.4 분석 테이블이 없습니다 — 분석 표면 비활성 (P1.3 뷰어만)</div>';
      }
    }

    function analysisBadges(r) {
      if (!analysisOn()) return '';
      const title = !!r.hasTitleAnalysis;
      const thumb = !!r.hasThumbnailAnalysis;
      if (title && thumb) return '<span class="badge analysis-badge">제목✓</span><span class="badge analysis-badge">썸네일✓</span>';
      if (title) return '<span class="badge analysis-badge">제목✓</span><span class="badge analysis-badge partial">썸네일—</span>';
      if (thumb) return '<span class="badge analysis-badge partial">제목—</span><span class="badge analysis-badge">썸네일✓</span>';
      return '<span class="badge analysis-badge missing">미분석</span>';
    }

    function refFilterMatches(r, filter) {
      if (filter === 'all') return true;
      const title = !!r.hasTitleAnalysis;
      const thumb = !!r.hasThumbnailAnalysis;
      if (filter === 'title') return title;
      if (filter === 'thumbnail') return thumb;
      if (filter === 'both') return title && thumb;
      if (filter === 'none') return !title && !thumb;
      return true;
    }

    function folderProgress(f) {
      if (!analysisOn() || f.bothAnalyzedCount == null) return '';
      const both = f.bothAnalyzedCount;
      const total = f.videoCount;
      let hint = '';
      if (f.titleAnalyzedCount != null && f.thumbnailAnalyzedCount != null) {
        if (f.titleAnalyzedCount > both) hint += ' · 제목만 ' + (f.titleAnalyzedCount - both);
        if (f.thumbnailAnalyzedCount > both) hint += ' · 썸네일만 ' + (f.thumbnailAnalyzedCount - both);
      }
      return '<span class="badge">분석 ' + both + '/' + total + '</span>' + (hint ? '<span class="meta">' + esc(hint) + '</span>' : '');
    }

    function renderDistBars(counts) {
      const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
      if (!entries.length) return '<div class="empty">집계 없음</div>';
      const max = entries[0][1] || 1;
      return entries.map(([code, n]) => {
        const pct = Math.round((n / max) * 100);
        return '<div class="dist-row"><span class="label">' + esc(label(code)) + '</span>'
          + '<span class="bar-wrap"><span class="bar-fill" style="width:' + pct + '%"></span></span>'
          + esc(String(n)) + '</div>';
      }).join('');
    }

    function renderFolderStatsPanel(folderId) {
      const stats = (DATA.folderAnalysisStats || []).find((s) => s.folderId === folderId);
      if (!stats) return '';
      return '<div class="panel"><h2>폴더 분석 분포</h2>'
        + '<h3 style="font-size:0.85rem;margin:0.5rem 0 0.25rem">후크 primary</h3>' + renderDistBars(stats.hookPrimaryCounts)
        + '<h3 style="font-size:0.85rem;margin:0.75rem 0 0.25rem">제목 톤</h3>' + renderDistBars(stats.titleToneCounts)
        + '<h3 style="font-size:0.85rem;margin:0.75rem 0 0.25rem">썸네일 감정</h3>' + renderDistBars(stats.feltEmotionCounts)
        + '<h3 style="font-size:0.85rem;margin:0.75rem 0 0.25rem">제목·썸네일 정합성</h3>' + renderDistBars(stats.alignmentCounts)
        + '</div>';
    }

    function renderTitleAnalysisBlock(videoId) {
      const a = (DATA.titleAnalysisByVideoId || {})[videoId];
      if (!a) return '<div class="empty">제목 분석 없음</div>';
      const shapes = (a.titleShapes || []).map((c) => label(c)).join(', ');
      return '<div><div><strong>후크</strong> ' + esc(label(a.hookPrimary))
        + (a.hookSecondary ? ' · ' + esc(label(a.hookSecondary)) : '') + '</div>'
        + '<div class="meta">형태: ' + esc(shapes || '—') + ' · 톤: ' + esc(label(a.titleTone)) + '</div>'
        + '<div class="meta">분석 시각: ' + fmtDate(a.analyzedAt) + '</div>'
        + '<details class="reasoning"><summary>reasoning</summary><p>' + esc(a.reasoning) + '</p></details></div>';
    }

    function renderThumbnailAnalysisBlock(videoId) {
      const a = (DATA.thumbnailAnalysisByVideoId || {})[videoId];
      if (!a) return '<div class="empty">썸네일 분석 없음</div>';
      return '<div><div><strong>시각 계층</strong> ' + esc(label(a.visualHierarchy))
        + ' · <strong>텍스트 밀도</strong> ' + esc(label(a.textDensity)) + '</div>'
        + '<div class="meta">얼굴: ' + esc(a.faceTreatment ? label(a.faceTreatment) : '—')
        + ' · 감정: ' + esc(label(a.feltEmotion)) + '</div>'
        + (a.alignmentWithTitle
          ? '<div class="meta">정합성: ' + esc(label(a.alignmentWithTitle))
            + (a.alignmentReasoning ? ' — ' + esc(a.alignmentReasoning) : '') + '</div>'
          : '')
        + '<div class="meta">분석 시각: ' + fmtDate(a.analyzedAt) + '</div>'
        + '<details class="reasoning"><summary>reasoning</summary><p>' + esc(a.reasoning) + '</p></details></div>';
    }

    function setView(view) {
      state.view = view;
      state.channelId = null;
      state.videoId = null;
      state.folderId = null;
      document.querySelectorAll('#main-nav button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.view === view);
      });
      ['search','folders','channels','channel-detail','video-detail'].forEach((id) => {
        const el = document.getElementById('view-' + id);
        if (!el) return;
        const key = id.replace(/-/g, '_');
        const show = (view === 'search' && id === 'search')
          || (view === 'folders' && id === 'folders')
          || (view === 'channels' && id === 'channels')
          || (view === 'channel-detail' && id === 'channel-detail')
          || (view === 'video-detail' && id === 'video-detail');
        el.classList.toggle('hidden', !show);
      });
      render();
    }

    function openChannel(channelId) {
      state.view = 'channel-detail';
      state.channelId = channelId;
      state.videoId = null;
      document.querySelectorAll('#main-nav button').forEach((b) => b.classList.remove('active'));
      render();
    }

    function openVideo(videoId) {
      state.view = 'video-detail';
      state.videoId = videoId;
      document.querySelectorAll('#main-nav button').forEach((b) => b.classList.remove('active'));
      render();
    }

    function renderSearch() {
      const el = document.getElementById('view-search');
      const kwRows = DATA.keywords.length
        ? DATA.keywords.map((k) => '<tr class="clickable" data-session="' + esc(k.lastSearchSessionId || '') + '"><td>' + esc(k.keyword) + '</td><td>' + esc(k.regionCode) + '</td><td>' + (k.initialCollectionCompletedAt ? '완료' : '진행중') + '</td></tr>').join('')
        : '<tr><td colspan="3" class="empty">등록된 키워드가 없습니다.</td></tr>';
      const sessionRows = DATA.searchSessions.length
        ? DATA.searchSessions.map((s) => '<tr><td>' + esc(s.route) + '</td><td>' + esc(s.query || '—') + '</td><td>' + esc(s.mode || '—') + '</td><td>' + fmtNum(s.resultCount) + '</td><td>' + fmtDate(s.startedAt) + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">검색 세션이 없습니다.</td></tr>';
      const hotRows = DATA.hotVideos.length
        ? DATA.hotVideos.map((h) => '<tr class="clickable" data-video="' + esc(h.videoId) + '"><td>' + esc(h.hotDate) + '</td><td>#' + h.rank + '</td><td>' + esc(h.title) + '</td><td>' + esc(h.channelTitle) + '</td><td>' + gradeBadge('성과', h.performanceGrade) + gradeBadge('기여', h.contributionGrade) + (h.lengthAdjustedScore != null ? '<span class="badge">점수 ' + h.lengthAdjustedScore.toFixed(2) + '</span>' : '') + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">핫 비디오가 없습니다.</td></tr>';
      el.innerHTML = '<div class="panel"><h2>키워드</h2><table><thead><tr><th>키워드</th><th>지역</th><th>초기 수집</th></tr></thead><tbody>' + kwRows + '</tbody></table></div>'
        + '<div class="panel"><h2>최근 검색 세션</h2><table><thead><tr><th>라우트</th><th>쿼리</th><th>모드</th><th>결과</th><th>시작</th></tr></thead><tbody>' + sessionRows + '</tbody></table></div>'
        + '<div class="panel"><h2>핫 비디오</h2><table><thead><tr><th>날짜</th><th>순위</th><th>제목</th><th>채널</th><th>점수</th></tr></thead><tbody>' + hotRows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
    }

    function renderFolders() {
      const el = document.getElementById('view-folders');
      const folderRows = DATA.folders.length
        ? DATA.folders.map((f) => {
            const sel = state.folderId === f.id ? ' folder-selected' : '';
            const clickable = analysisOn() ? ' clickable' : '';
            return '<tr class="' + clickable.trim() + sel + '" data-folder="' + esc(f.id) + '"><td>' + esc(f.groupName) + '</td><td>' + esc(f.name) + '</td><td>' + stageBadge(f.consumerStage) + '</td><td>' + fmtNum(f.videoCount) + ' ' + folderProgress(f) + '</td></tr>';
          }).join('')
        : '<tr><td colspan="4" class="empty">레퍼런스 폴더가 없습니다.</td></tr>';
      const filteredRefs = DATA.references.filter((r) => refFilterMatches(r, state.refFilter));
      const refRows = filteredRefs.length
        ? filteredRefs.map((r) => '<tr class="clickable" data-video="' + esc(r.videoId) + '"><td>' + esc(r.groupName) + ' / ' + esc(r.folderName) + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.channelTitle) + '</td><td>' + stageBadge(r.consumerStage) + gradeBadge('성과', r.performanceGrade) + gradeBadge('기여', r.contributionGrade) + analysisBadges(r) + '</td><td>' + esc(r.reason || '') + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">큐레이션된 레퍼런스가 없습니다.</td></tr>';
      const filterBar = analysisOn()
        ? '<div class="filter-bar" id="ref-filters">'
          + ['all','title','thumbnail','both','none'].map((f) => {
              const labels = { all: '전체', title: '제목 완료', thumbnail: '썸네일 완료', both: '둘 다', none: '미완료' };
              const active = state.refFilter === f ? ' active' : '';
              return '<button type="button" data-filter="' + f + '" class="' + active.trim() + '">' + labels[f] + '</button>';
            }).join('')
          + '</div>'
        : '';
      const statsPanel = state.folderId && analysisOn() ? renderFolderStatsPanel(state.folderId) : '';
      el.innerHTML = '<div class="panel"><h2>폴더</h2><table><thead><tr><th>그룹</th><th>폴더</th><th>단계</th><th>영상 수</th></tr></thead><tbody>' + folderRows + '</tbody></table></div>'
        + statsPanel
        + '<div class="panel"><h2>레퍼런스 영상</h2>' + filterBar
        + '<table><thead><tr><th>폴더</th><th>제목</th><th>채널</th><th>배지</th><th>사유</th></tr></thead><tbody>' + refRows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
      if (analysisOn()) {
        el.querySelectorAll('tr[data-folder]').forEach((row) => {
          row.addEventListener('click', () => {
            state.folderId = row.getAttribute('data-folder');
            renderFolders();
          });
        });
        el.querySelectorAll('#ref-filters button').forEach((btn) => {
          btn.addEventListener('click', () => {
            state.refFilter = btn.getAttribute('data-filter') || 'all';
            renderFolders();
          });
        });
      }
    }

    function renderChannels() {
      const el = document.getElementById('view-channels');
      const rows = DATA.channels.length
        ? DATA.channels.map((c) => '<tr class="clickable" data-channel="' + esc(c.channelId) + '"><td>' + esc(c.title) + '</td><td>' + esc(c.handle || '—') + '</td><td>' + fmtNum(c.subscriberCount) + '</td><td>' + fmtNum(c.averageViewCount) + '</td><td>' + fmtNum(c.videoCount) + '</td></tr>').join('')
        : '<tr><td colspan="5" class="empty">채널이 없습니다.</td></tr>';
      el.innerHTML = '<div class="panel"><h2>채널 목록</h2><table><thead><tr><th>제목</th><th>핸들</th><th>구독자</th><th>평균 조회</th><th>영상 수</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      el.querySelectorAll('tr[data-channel]').forEach((row) => {
        row.addEventListener('click', () => openChannel(row.getAttribute('data-channel')));
      });
    }

    function renderChannelDetail() {
      const el = document.getElementById('view-channel-detail');
      const channel = DATA.channels.find((c) => c.channelId === state.channelId);
      if (!channel) {
        el.innerHTML = '<div class="empty">채널을 찾을 수 없습니다.</div>';
        return;
      }
      const videos = DATA.videos.filter((v) => v.channelId === channel.channelId);
      const videoRows = videos.length
        ? videos.map((v) => '<tr class="clickable" data-video="' + esc(v.videoId) + '"><td>' + esc(v.title) + '</td><td>' + fmtDate(v.publishedAt) + '</td><td>' + fmtNum(v.viewCount) + '</td><td>' + gradeBadge('성과', v.performanceGrade) + gradeBadge('기여', v.contributionGrade) + '</td></tr>').join('')
        : '<tr><td colspan="4" class="empty">영상이 없습니다.</td></tr>';
      el.innerHTML = '<div class="back"><button type="button" id="back-channels">← 채널 목록</button></div>'
        + '<div class="panel"><h2>' + esc(channel.title) + '</h2><div class="detail-grid">'
        + '<div><div class="meta">핸들: ' + esc(channel.handle || '—') + '</div>'
        + '<div class="meta">구독자: ' + fmtNum(channel.subscriberCount) + '</div>'
        + '<div class="meta">평균 조회: ' + fmtNum(channel.averageViewCount) + '</div>'
        + '<div><a class="link" href="' + ytChannelUrl(channel.channelId) + '" target="_blank" rel="noopener">YouTube에서 열기</a></div></div>'
        + (channel.thumbnailUrl ? '<img class="thumb" src="' + esc(channel.thumbnailUrl) + '" alt="" />' : '')
        + '</div></div>'
        + '<div class="panel"><h2>영상</h2><table><thead><tr><th>제목</th><th>게시</th><th>조회</th><th>점수</th></tr></thead><tbody>' + videoRows + '</tbody></table></div>';
      document.getElementById('back-channels').addEventListener('click', () => setView('channels'));
      el.querySelectorAll('tr[data-video]').forEach((row) => {
        row.addEventListener('click', () => openVideo(row.getAttribute('data-video')));
      });
    }

    function renderVideoDetail() {
      const el = document.getElementById('view-video-detail');
      const video = DATA.videos.find((v) => v.videoId === state.videoId);
      if (!video) {
        el.innerHTML = '<div class="empty">영상을 찾을 수 없습니다.</div>';
        return;
      }
      const refs = DATA.references.filter((r) => r.videoId === video.videoId);
      const comments = DATA.commentsByVideoId[video.videoId] || [];
      const refList = refs.length
        ? refs.map((r) => '<li>' + esc(r.groupName) + ' / ' + esc(r.folderName) + ' ' + stageBadge(r.consumerStage) + '</li>').join('')
        : '<li class="empty">레퍼런스 폴더에 없음</li>';
      const commentBlocks = comments.length
        ? comments.map((c) => '<div class="comment"><strong>' + esc(c.authorDisplayName || '익명') + '</strong> · ' + fmtNum(c.likeCount) + ' likes<br>' + esc(c.textOriginal) + '</div>').join('')
        : '<div class="empty">저장된 댓글이 없습니다.</div>';
      el.innerHTML = '<div class="back"><button type="button" id="back-generic">← 뒤로</button></div>'
        + '<div class="panel"><h2>' + esc(video.title) + '</h2><div class="detail-grid">'
        + (video.thumbnailUrl ? '<img class="thumb" src="' + esc(video.thumbnailUrl) + '" alt="" />' : '')
        + '<div><div>채널: <button type="button" class="link" data-channel="' + esc(video.channelId) + '" style="background:none;border:none;padding:0;cursor:pointer;color:var(--accent)">' + esc(video.channelTitle) + '</button></div>'
        + '<div class="meta">게시: ' + fmtDate(video.publishedAt) + '</div>'
        + '<div class="meta">조회 ' + fmtNum(video.viewCount) + ' · 좋아요 ' + fmtNum(video.likeCount) + ' · 댓글 ' + fmtNum(video.commentCount) + '</div>'
        + '<div>' + gradeBadge('성과', video.performanceGrade) + gradeBadge('기여', video.contributionGrade)
        + (video.lengthAdjustedScore != null ? '<span class="badge">길이보정 ' + video.lengthAdjustedScore.toFixed(2) + '</span>' : '') + '</div>'
        + '<div><a class="link" href="' + ytVideoUrl(video.videoId) + '" target="_blank" rel="noopener">YouTube에서 열기</a></div></div></div></div>'
        + '<div class="panel"><h2>레퍼런스 폴더</h2><ul>' + refList + '</ul></div>'
        + (analysisOn()
          ? '<div class="panel analysis-panel"><h2>제목·썸네일 분석</h2>'
            + '<h3 style="font-size:0.9rem;margin:0.75rem 0 0.35rem">제목</h3>' + renderTitleAnalysisBlock(video.videoId)
            + '<h3 style="font-size:0.9rem;margin:0.75rem 0 0.35rem">썸네일</h3>' + renderThumbnailAnalysisBlock(video.videoId)
            + '</div>'
          : '')
        + '<div class="panel"><h2>댓글 (저장분)</h2>' + commentBlocks + '</div>';
      document.getElementById('back-generic').addEventListener('click', () => setView('folders'));
      el.querySelector('[data-channel]')?.addEventListener('click', (ev) => {
        openChannel(ev.currentTarget.getAttribute('data-channel'));
      });
    }

    function render() {
      document.getElementById('meta-line').textContent =
        (DATA.meta.schemaVersionLabel ? DATA.meta.schemaVersionLabel + ' · ' : '') + DATA.meta.dbPath;
      renderAnalysisBanner();
      if (state.view === 'search') renderSearch();
      else if (state.view === 'folders') renderFolders();
      else if (state.view === 'channels') renderChannels();
      else if (state.view === 'channel-detail') renderChannelDetail();
      else if (state.view === 'video-detail') renderVideoDetail();
    }

    document.getElementById('main-nav').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-view]');
      if (!btn) return;
      setView(btn.dataset.view);
    });

    render();
  </script>
</body>
</html>`;
}
