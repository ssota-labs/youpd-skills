/**
 * P1.1 YouTube domain tests: migration schema, scoring, keyword normalization,
 * route stdout contracts with mocked YouTube API.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openDb } from '../lib/db/client.ts';
import { runMigrations } from '../lib/db/migrate.ts';
import { normalizeKeyword } from '../lib/youtube/common.ts';
import { computeScore, ratioGrade } from '../lib/youtube/scoring.ts';
import { upsertKeyword, persistVideoBundle, insertVideoScore } from '../lib/youtube/write.ts';
import { channelFromApiItem, videoFromApiItem, setFetchImpl, resetFetchImpl } from '../lib/youtube/api.ts';
import { SCORE_POLICY_VERSION } from '../lib/types/youtube.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const ADD_KEYWORD = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'add-keyword.ts');
const SEARCH_KEYWORD = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'search-by-keyword.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p11-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function tableExists(db: ReturnType<typeof openDb>['db'], name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(name) as { name: string } | undefined;
  return row != null;
}

test('P1.1 migration creates YouTube tables, indexes, and FK constraints', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);

    for (const table of [
      'youtube_keywords',
      'youtube_channels',
      'youtube_videos',
      'youtube_search_sessions',
      'youtube_keyword_video_results',
      'youtube_video_snapshots',
      'youtube_channel_snapshots',
      'youtube_video_scores',
      'youtube_hot_videos',
      'api_call_audits',
      'daily_quota_usage',
    ]) {
      assert.ok(tableExists(db, table), `${table} must exist`);
    }

    assert.throws(
      () => {
        db.prepare(
          `INSERT INTO youtube_search_sessions (id, route, order_by, raw_params, started_at)
           VALUES ('s1', 'search-by-keyword', 'viewCount', '{}', datetime('now'))`,
        ).run();
      },
      /CHECK constraint failed/,
    );

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('normalizeKeyword: NFC, ASCII lowercase, whitespace collapse', () => {
  assert.equal(normalizeKeyword('  AI   Trend  '), 'ai trend');
  assert.equal(normalizeKeyword('AI 트렌드'), 'ai 트렌드');
});

test('scoring: ratio grades and length-adjusted score', () => {
  assert.equal(ratioGrade(0.05), 'Worst');
  assert.equal(ratioGrade(0.5), 'Bad');
  assert.equal(ratioGrade(5), 'Normal');
  assert.equal(ratioGrade(50), 'Good');
  assert.equal(ratioGrade(150), 'Great');
  assert.equal(ratioGrade(null), 'Unknown');

  const score = computeScore({
    videoId: 'v1',
    channelId: 'c1',
    videoViewCount: 100_000,
    channelSubscriberCount: 10_000,
    channelAverageViewCount: 5_000,
    durationSec: 600,
    videoSnapshotCollectedAt: '2026-05-27T00:00:00.000Z',
    channelSnapshotCollectedAt: '2026-05-27T00:00:00.000Z',
  });

  assert.equal(score.performanceGrade, 'Good');
  assert.equal(score.contributionGrade, 'Good');
  assert.ok(score.lengthAdjustedScore != null && score.lengthAdjustedScore > 0);
  assert.equal(score.policyVersion, SCORE_POLICY_VERSION);
});

test('score idempotency: same snapshot + policy inserts once', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const collectedAt = '2026-05-27T12:00:00.000Z';
    const channel = channelFromApiItem({
      id: 'channel-1',
      snippet: { title: 'Channel' },
      statistics: { subscriberCount: '1000', viewCount: '50000', videoCount: '50' },
    });
    const video = videoFromApiItem({
      id: 'video-1',
      snippet: {
        channelId: 'channel-1',
        channelTitle: 'Channel',
        title: 'Video',
        publishedAt: collectedAt,
      },
      contentDetails: { duration: 'PT10M' },
      statistics: { viewCount: '10000', likeCount: '100', commentCount: '10' },
    });

    persistVideoBundle(db, [video], [channel], collectedAt);
    insertVideoScore(db, video, channel, collectedAt);
    insertVideoScore(db, video, channel, collectedAt);

    const count = db
      .prepare(`SELECT COUNT(*) AS c FROM youtube_video_scores WHERE video_id = 'video-1'`)
      .get() as { c: number };
    assert.equal(count.c, 1);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('add-keyword CLI: normalization, default initial_target_count=500, reuse', () => {
  const ws = makeTempWorkspace();
  try {
    const env = { ...process.env, YOUPD_WORKSPACE_DB: ws.dbPath };
    const first = spawnSync(
      'pnpm',
      ['tsx', ADD_KEYWORD, '--keyword', ' AI Trend ', '--region', 'kr'],
      { cwd: REPO_ROOT, encoding: 'utf8', env },
    );
    assert.equal(first.status, 0, first.stderr);
    const firstJson = parseLastJson(first.stdout);
    assert.equal(firstJson.ok, true);
    const firstResult = firstJson.result as Record<string, unknown>;
    assert.equal(firstResult.normalizedKeyword, 'ai trend');
    assert.equal(firstResult.isNew, true);
    assert.equal(firstResult.initialTargetCount, 500);

    const second = spawnSync(
      'pnpm',
      ['tsx', ADD_KEYWORD, '--keyword', 'ai trend', '--region', 'KR'],
      { cwd: REPO_ROOT, encoding: 'utf8', env },
    );
    assert.equal(second.status, 0, second.stderr);
    const secondJson = parseLastJson(second.stdout);
    const secondResult = secondJson.result as Record<string, unknown>;
    assert.equal(secondResult.keywordId, firstResult.keywordId);
    assert.equal(secondResult.isNew, false);

    const { db } = openDb({ path: ws.dbPath });
    const count = db.prepare(`SELECT COUNT(*) AS c FROM youtube_keywords`).get() as { c: number };
    assert.equal(count.c, 1);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('search-by-keyword rejects missing API key before external calls', () => {
  const ws = makeTempWorkspace();
  try {
    const env = { ...process.env, YOUPD_WORKSPACE_DB: ws.dbPath };
    delete (env as NodeJS.ProcessEnv).YOUTUBE_API_KEY;
    const result = spawnSync(
      'pnpm',
      ['tsx', SEARCH_KEYWORD, '--keyword', 'test-keyword'],
      { cwd: REPO_ROOT, encoding: 'utf8', env },
    );
    assert.equal(result.status, 1);
    const parsed = parseLastJson(result.stdout) as { ok: boolean; code: string };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'missing_api_key');
  } finally {
    cleanup(ws);
  }
});

test('youtube API fixture: search order=date path records audits and writes scores', async () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);

    setFetchImpl((async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('order'), 'date');
      return new Response(
        JSON.stringify({ items: [{ id: { videoId: 'vid-1' } }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch);

    const { requireYoutubeApiKey } = await import('../lib/youtube/quota.ts');
    const { youtubeApiRequest } = await import('../lib/youtube/api.ts');
    const apiKey = requireYoutubeApiKey({ YOUTUBE_API_KEY: 'test-key' });

    await youtubeApiRequest(db, apiKey, {
      route: 'search-by-keyword',
      resource: 'search',
      params: {
        part: 'snippet',
        type: 'video',
        q: 'fixture',
        order: 'date',
        maxResults: 1,
      },
      audit: { operation: 'search.list', units: 100 },
    });

    const channel = channelFromApiItem({
      id: 'chan-1',
      snippet: { title: 'Chan' },
      statistics: { subscriberCount: '100', viewCount: '5000', videoCount: '10' },
    });
    const video = videoFromApiItem({
      id: 'vid-1',
      snippet: {
        channelId: 'chan-1',
        channelTitle: 'Chan',
        title: 'Fixture',
        publishedAt: '2026-05-27T10:00:00.000Z',
      },
      contentDetails: { duration: 'PT5M' },
      statistics: { viewCount: '1000', likeCount: '10', commentCount: '1' },
    });
    persistVideoBundle(db, [video], [channel], '2026-05-27T12:00:00.000Z');

    const audit = db
      .prepare(`SELECT operation, units_consumed, status FROM api_call_audits`)
      .get() as { operation: string; units_consumed: number; status: string };
    assert.equal(audit.operation, 'search.list');
    assert.equal(audit.units_consumed, 100);
    assert.equal(audit.status, 'success');

    const scoreCount = db
      .prepare(`SELECT COUNT(*) AS c FROM youtube_video_scores`)
      .get() as { c: number };
    assert.equal(scoreCount.c, 1);
    db.close();
  } finally {
    resetFetchImpl();
    cleanup(ws);
  }
});

test('upsertKeyword stores initial_target_count from add-keyword path', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    upsertKeyword(db, { keyword: 'test', initialTargetCount: 500 });
    const row = db
      .prepare(`SELECT initial_target_count FROM youtube_keywords LIMIT 1`)
      .get() as { initial_target_count: number };
    assert.equal(row.initial_target_count, 500);
    db.close();
  } finally {
    cleanup(ws);
  }
});
