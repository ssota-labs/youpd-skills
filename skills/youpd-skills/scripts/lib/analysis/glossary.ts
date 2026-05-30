import type { Db } from '../db/client.ts';
import { fail } from '../youtube/common.ts';

export const CLASSIFICATION_FRAMEWORK_VERSION = 'youpd-classification-framework-v0' as const;

const SEED_MISSING_MESSAGE =
  '분류 축 seed가 아직 적용 안 됐어요. 마이그레이션 014·017 glossary seed 적용 후 다시 시도해 주세요.';

export function assertGlossarySeeded(db: Db): void {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM glossary_axis_values`)
    .get() as { n: number };
  if (row.n === 0) {
    fail('validation_error', SEED_MISSING_MESSAGE);
  }
}

export function validateAxisValue(db: Db, axisCode: string, valueCode: string): void {
  const row = db
    .prepare(
      `SELECT v.id
       FROM glossary_axis_values v
       JOIN glossary_axes a ON a.id = v.axis_id
       WHERE a.code = ? AND v.code = ?`,
    )
    .get(axisCode, valueCode) as { id: string } | undefined;
  if (!row) {
    fail('validation_error', `알 수 없는 ${axisCode} 값입니다: ${valueCode}`, {
      axisCode,
      valueCode,
    });
  }
}

export function validateAxisValues(db: Db, axisCode: string, valueCodes: string[]): void {
  for (const code of valueCodes) {
    validateAxisValue(db, axisCode, code);
  }
}

export function assertVideoExists(db: Db, videoId: string): void {
  const row = db
    .prepare(`SELECT video_id FROM youtube_videos WHERE video_id = ?`)
    .get(videoId) as { video_id: string } | undefined;
  if (!row) {
    fail('not_found', `youtube_videos 에 없는 video_id 입니다: ${videoId}`, { videoId });
  }
}

export function hasTitleAnalysis(db: Db, videoId: string): boolean {
  const row = db
    .prepare(`SELECT id FROM youtube_title_analyses WHERE video_id = ?`)
    .get(videoId) as { id: string } | undefined;
  return row != null;
}

export function hasIntroAnalysis(db: Db, videoId: string): boolean {
  const row = db
    .prepare(`SELECT id FROM youtube_intro_analyses WHERE video_id = ?`)
    .get(videoId) as { id: string } | undefined;
  return row != null;
}
