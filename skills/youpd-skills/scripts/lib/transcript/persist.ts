import type { Db } from '../db/client.ts';
import { fail, nowIso } from '../youtube/common.ts';
import { assertVideoExists } from '../analysis/glossary.ts';
import type { FetchedTranscript, TranscriptSegment, TranscriptSource } from './types.ts';

export interface UpsertTranscriptInput {
  videoId: string;
  source: TranscriptSource;
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
}

export interface UpsertTranscriptResult {
  videoId: string;
  source: TranscriptSource;
  language: string;
  replaced: boolean;
}

export function upsertTranscript(db: Db, input: UpsertTranscriptInput): UpsertTranscriptResult {
  assertVideoExists(db, input.videoId);

  const existing = db
    .prepare(`SELECT video_id FROM youtube_video_transcripts WHERE video_id = ?`)
    .get(input.videoId) as { video_id: string } | undefined;

  const fetchedAt = nowIso();
  if (existing) {
    db.prepare(
      `UPDATE youtube_video_transcripts
       SET source = ?, language = ?, full_text = ?, segments_json = ?, fetched_at = ?
       WHERE video_id = ?`,
    ).run(
      input.source,
      input.language,
      input.fullText,
      JSON.stringify(input.segments),
      fetchedAt,
      input.videoId,
    );
    return {
      videoId: input.videoId,
      source: input.source,
      language: input.language,
      replaced: true,
    };
  }

  db.prepare(
    `INSERT INTO youtube_video_transcripts
       (video_id, source, language, full_text, segments_json, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    input.videoId,
    input.source,
    input.language,
    input.fullText,
    JSON.stringify(input.segments),
    fetchedAt,
  );

  return {
    videoId: input.videoId,
    source: input.source,
    language: input.language,
    replaced: false,
  };
}

export function hasTranscript(db: Db, videoId: string): boolean {
  const row = db
    .prepare(`SELECT video_id FROM youtube_video_transcripts WHERE video_id = ?`)
    .get(videoId) as { video_id: string } | undefined;
  return row != null;
}

export function getTranscriptSegments(db: Db, videoId: string): TranscriptSegment[] {
  const row = db
    .prepare(`SELECT segments_json FROM youtube_video_transcripts WHERE video_id = ?`)
    .get(videoId) as { segments_json: string } | undefined;
  if (!row) {
    fail('not_found', `자막이 없습니다. fetch-transcript 를 먼저 실행하세요.`, { videoId });
  }
  const parsed = JSON.parse(row.segments_json) as unknown;
  if (!Array.isArray(parsed)) {
    fail('db_error', 'segments_json 이 배열이 아닙니다.', { videoId });
  }
  return parsed as TranscriptSegment[];
}

export function sliceTranscriptText(segments: TranscriptSegment[], windowSec: number): string {
  const parts: string[] = [];
  for (const seg of segments) {
    if (seg.startSec >= windowSec) break;
    if (seg.endSec <= 0) continue;
    parts.push(seg.text.trim());
  }
  return parts.filter((p) => p.length > 0).join(' ').trim();
}

export function persistFetchedTranscript(db: Db, videoId: string, fetched: FetchedTranscript): UpsertTranscriptResult {
  return upsertTranscript(db, {
    videoId,
    source: fetched.source,
    language: fetched.language,
    fullText: fetched.fullText,
    segments: fetched.segments,
  });
}
