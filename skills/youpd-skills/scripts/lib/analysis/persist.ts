import { randomUUID } from 'node:crypto';
import type { SQLInputValue } from 'node:sqlite';

import type { Db } from '../db/client.ts';
import { fail, nowIso } from '../youtube/common.ts';
import {
  assertGlossarySeeded,
  assertVideoExists,
  CLASSIFICATION_FRAMEWORK_VERSION,
  hasTitleAnalysis,
  validateAxisValue,
  validateAxisValues,
} from './glossary.ts';

export interface SaveTitleAnalysisInput {
  videoId: string;
  hookPrimary: string;
  hookSecondary?: string | undefined;
  titleShapes: string[];
  titleTone: string;
  reasoning: string;
  freeTags: string[];
  reanalyze?: boolean | undefined;
}

export interface SaveTitleAnalysisResult {
  videoId: string;
  analysisId: string;
  reanalyzed: boolean;
}

export interface SaveThumbnailAnalysisInput {
  videoId: string;
  visualHierarchy: string;
  textDensity: string;
  faceTreatment?: string | undefined;
  feltEmotion: string;
  alignmentWithTitle?: string | undefined;
  alignmentReasoning?: string | undefined;
  reasoning: string;
  freeTags: string[];
  thumbnailUrlUsed?: string | undefined;
  reanalyze?: boolean | undefined;
}

export interface SaveThumbnailAnalysisResult {
  videoId: string;
  analysisId: string;
  reanalyzed: boolean;
  hasTitleAnalysis: boolean;
}

export type AnalysisKind = 'title' | 'thumbnail';

export interface AnalysisCandidate {
  videoId: string;
  title: string;
  thumbnailUrl: string | null;
  folderIds: string[];
  hasTitleAnalysis: boolean;
  hasThumbnailAnalysis: boolean;
}

export function saveTitleAnalysis(db: Db, input: SaveTitleAnalysisInput): SaveTitleAnalysisResult {
  assertGlossarySeeded(db);
  assertVideoExists(db, input.videoId);

  validateAxisValue(db, 'hook-type', input.hookPrimary);
  if (input.hookSecondary != null && input.hookSecondary.length > 0) {
    validateAxisValue(db, 'hook-type', input.hookSecondary);
  }
  validateAxisValues(db, 'title-shape', input.titleShapes);
  validateAxisValue(db, 'title-tone', input.titleTone);

  const existing = db
    .prepare(`SELECT id FROM youtube_title_analyses WHERE video_id = ?`)
    .get(input.videoId) as { id: string } | undefined;

  if (existing && !input.reanalyze) {
    fail('validation_error', '이미 제목 분석이 있습니다. 재분석하려면 reanalyze=true 를 사용하세요.', {
      videoId: input.videoId,
    });
  }

  let reanalyzed = false;
  if (existing) {
    db.prepare(`DELETE FROM youtube_title_analyses WHERE video_id = ?`).run(input.videoId);
    reanalyzed = true;
  }

  const id = randomUUID();
  const analyzedAt = nowIso();
  db.prepare(
    `INSERT INTO youtube_title_analyses
       (id, video_id, hook_primary, hook_secondary, title_shapes_json, title_tone,
        reasoning, free_tags_json, framework_version, analyzed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.videoId,
    input.hookPrimary,
    input.hookSecondary ?? null,
    JSON.stringify(input.titleShapes),
    input.titleTone,
    input.reasoning,
    JSON.stringify(input.freeTags),
    CLASSIFICATION_FRAMEWORK_VERSION,
    analyzedAt,
  );

  return { videoId: input.videoId, analysisId: id, reanalyzed };
}

export function saveThumbnailAnalysis(
  db: Db,
  input: SaveThumbnailAnalysisInput,
): SaveThumbnailAnalysisResult {
  assertGlossarySeeded(db);
  assertVideoExists(db, input.videoId);

  validateAxisValue(db, 'visual-hierarchy', input.visualHierarchy);
  validateAxisValue(db, 'text-density', input.textDensity);
  if (input.faceTreatment != null && input.faceTreatment.length > 0) {
    validateAxisValue(db, 'face-treatment', input.faceTreatment);
  }
  validateAxisValue(db, 'thumbnail-emotion', input.feltEmotion);
  if (input.alignmentWithTitle != null && input.alignmentWithTitle.length > 0) {
    validateAxisValue(db, 'title-thumbnail-alignment', input.alignmentWithTitle);
  }

  const titleExists = hasTitleAnalysis(db, input.videoId);

  const existing = db
    .prepare(`SELECT id FROM youtube_thumbnail_analyses WHERE video_id = ?`)
    .get(input.videoId) as { id: string } | undefined;

  if (existing && !input.reanalyze) {
    fail('validation_error', '이미 썸네일 분석이 있습니다. 재분석하려면 reanalyze=true 를 사용하세요.', {
      videoId: input.videoId,
    });
  }

  let reanalyzed = false;
  if (existing) {
    db.prepare(`DELETE FROM youtube_thumbnail_analyses WHERE video_id = ?`).run(input.videoId);
    reanalyzed = true;
  }

  const id = randomUUID();
  const analyzedAt = nowIso();
  db.prepare(
    `INSERT INTO youtube_thumbnail_analyses
       (id, video_id, visual_hierarchy, text_density, face_treatment, felt_emotion,
        alignment_with_title, alignment_reasoning, reasoning, free_tags_json,
        framework_version, thumbnail_url_used, analyzed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.videoId,
    input.visualHierarchy,
    input.textDensity,
    input.faceTreatment ?? null,
    input.feltEmotion,
    input.alignmentWithTitle ?? null,
    input.alignmentReasoning ?? null,
    input.reasoning,
    JSON.stringify(input.freeTags),
    CLASSIFICATION_FRAMEWORK_VERSION,
    input.thumbnailUrlUsed ?? null,
    analyzedAt,
  );

  return {
    videoId: input.videoId,
    analysisId: id,
    reanalyzed,
    hasTitleAnalysis: titleExists,
  };
}

export interface ListAnalysisCandidatesOptions {
  kind: AnalysisKind;
  folderId?: string | undefined;
  folderGroupId?: string | undefined;
  videoIds?: string[] | undefined;
  includeAnalyzed?: boolean | undefined;
  limit: number;
}

export function listAnalysisCandidates(
  db: Db,
  options: ListAnalysisCandidatesOptions,
): AnalysisCandidate[] {
  assertGlossarySeeded(db);

  const conditions: string[] = ['1 = 1'];
  const params: SQLInputValue[] = [];

  if (options.folderId) {
    conditions.push('rfv.folder_id = ?');
    params.push(options.folderId);
  }
  if (options.folderGroupId) {
    conditions.push('rf.folder_group_id = ?');
    params.push(options.folderGroupId);
  }
  if (options.videoIds != null && options.videoIds.length > 0) {
    const placeholders = options.videoIds.map(() => '?').join(', ');
    conditions.push(`rfv.video_id IN (${placeholders})`);
    params.push(...options.videoIds);
  }

  if (!options.includeAnalyzed) {
    if (options.kind === 'title') {
      conditions.push('ta.id IS NULL');
    } else {
      conditions.push('th.id IS NULL');
    }
  }

  const sql = `
    SELECT
      rfv.video_id AS video_id,
      v.title AS title,
      v.thumbnail_url AS thumbnail_url,
      GROUP_CONCAT(DISTINCT rfv.folder_id) AS folder_ids,
      CASE WHEN ta.id IS NOT NULL THEN 1 ELSE 0 END AS has_title_analysis,
      CASE WHEN th.id IS NOT NULL THEN 1 ELSE 0 END AS has_thumbnail_analysis
    FROM reference_folder_videos rfv
    JOIN reference_folders rf ON rf.id = rfv.folder_id
    JOIN youtube_videos v ON v.video_id = rfv.video_id
    LEFT JOIN youtube_title_analyses ta ON ta.video_id = rfv.video_id
    LEFT JOIN youtube_thumbnail_analyses th ON th.video_id = rfv.video_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY rfv.video_id
    ORDER BY rfv.added_at DESC
    LIMIT ?
  `;

  params.push(options.limit);

  const rows = db.prepare(sql).all(...params) as Array<{
    video_id: string;
    title: string;
    thumbnail_url: string | null;
    folder_ids: string | null;
    has_title_analysis: number;
    has_thumbnail_analysis: number;
  }>;

  return rows.map((row) => ({
    videoId: row.video_id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    folderIds: row.folder_ids?.split(',') ?? [],
    hasTitleAnalysis: row.has_title_analysis === 1,
    hasThumbnailAnalysis: row.has_thumbnail_analysis === 1,
  }));
}
