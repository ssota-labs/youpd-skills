#!/usr/bin/env tsx

import { parseArgs } from 'node:util';

import {
  emitError,
  emitOk,
  meetsMinGrade,
  nowIso,
  openMigratedDb,
  parsePositiveInt,
  resolveHotDate,
  runInTransaction,
} from '../../lib/youtube/common.ts';
import { SCORE_POLICY_VERSION } from '../../lib/types/youtube.ts';
import type { HotVideoItem, ListHotVideosResult, ScoreGrade } from '../../lib/types/youtube.ts';

const ROUTE = 'list-hot-videos';

function parseCli(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      date: { type: 'string' },
      region: { type: 'string', short: 'r' },
      'recent-days': { type: 'string' },
      'min-grade': { type: 'string' },
      limit: { type: 'string', short: 'l' },
      db: { type: 'string', short: 'd' },
    },
    strict: true,
    allowPositionals: false,
  });

  const minGrade = (values['min-grade'] ?? 'Good') as ScoreGrade;
  return {
    date: resolveHotDate(values.date ?? 'today'),
    region: (values.region ?? 'KR').toUpperCase(),
    recentDays: parsePositiveInt(values['recent-days'], 7, '--recent-days'),
    minGrade,
    limit: parsePositiveInt(values.limit, 20, '--limit'),
    dbPath: values.db,
  };
}

interface CandidateRow {
  video_id: string;
  title: string;
  published_at: string | null;
  length_adjusted_score: number | null;
  performance_grade: ScoreGrade;
  contribution_grade: ScoreGrade;
  video_snapshot_collected_at: string;
  score_policy_version: string;
}

async function main(): Promise<void> {
  const args = parseCli(process.argv.slice(2));
  const { db, dbPath } = openMigratedDb(args.dbPath ? { path: args.dbPath } : {});

  try {
    const cutoff = new Date(Date.now() - args.recentDays * 24 * 60 * 60 * 1000).toISOString();
    const rows = db
      .prepare(
        `SELECT
           v.video_id,
           v.title,
           v.published_at,
           s.length_adjusted_score,
           s.performance_grade,
           s.contribution_grade,
           s.video_snapshot_collected_at,
           s.policy_version AS score_policy_version
         FROM youtube_keyword_video_results kvr
         JOIN youtube_videos v ON v.video_id = kvr.video_id
         JOIN youtube_video_scores s
           ON s.video_id = v.video_id
          AND s.policy_version = ?
         WHERE v.published_at IS NOT NULL
           AND v.published_at >= ?
           AND s.computed_at = (
             SELECT MAX(s2.computed_at)
             FROM youtube_video_scores s2
             WHERE s2.video_id = v.video_id
               AND s2.policy_version = ?
           )
         ORDER BY s.length_adjusted_score DESC, v.published_at DESC`,
      )
      .all(SCORE_POLICY_VERSION, cutoff, SCORE_POLICY_VERSION) as unknown as CandidateRow[];

    const filtered = rows.filter(
      (row) =>
        meetsMinGrade(row.performance_grade, args.minGrade) &&
        meetsMinGrade(row.contribution_grade, args.minGrade),
    );

    const top = filtered.slice(0, args.limit);
    const createdAt = nowIso();

    runInTransaction(db, () => {
      db.prepare(
        `DELETE FROM youtube_hot_videos
         WHERE hot_date = ? AND region_code = ? AND source = 'keyword_promoted'`,
      ).run(args.date, args.region);

      const insert = db.prepare(
        `INSERT INTO youtube_hot_videos
           (hot_date, region_code, video_id, source, min_grade, rank, length_adjusted_score,
            video_snapshot_collected_at, score_policy_version, created_at)
         VALUES (?, ?, ?, 'keyword_promoted', ?, ?, ?, ?, ?, ?)`,
      );

      top.forEach((row, index) => {
        insert.run(
          args.date,
          args.region,
          row.video_id,
          args.minGrade,
          index + 1,
          row.length_adjusted_score,
          row.video_snapshot_collected_at,
          row.score_policy_version,
          createdAt,
        );
      });
    });

    const videos: HotVideoItem[] = top.map((row, index) => ({
      rank: index + 1,
      videoId: row.video_id,
      title: row.title,
      lengthAdjustedScore: row.length_adjusted_score,
      performanceGrade: row.performance_grade,
      contributionGrade: row.contribution_grade,
      videoSnapshotCollectedAt: row.video_snapshot_collected_at,
      scorePolicyVersion: row.score_policy_version,
    }));

    const result: ListHotVideosResult = {
      hotDate: args.date,
      regionCode: args.region,
      minGrade: args.minGrade,
      videos,
    };
    emitOk(ROUTE, dbPath, result, 0);
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  emitError(ROUTE, err);
  process.exit(1);
});
