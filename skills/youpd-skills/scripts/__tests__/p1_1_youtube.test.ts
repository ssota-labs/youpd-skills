import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openDb } from '../lib/db/client.ts';
import { runMigrations } from '../lib/db/migrate.ts';
import {
  nowIso,
  selectYoutubeApiKey,
  upsertVideos,
  videoFromApiItem,
  youtubeApiRequest,
} from '../lib/youtube/core.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const ADD_KEYWORD_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'add-keyword.ts');
const FETCH_TRENDING_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'fetch-trending.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-skills-p1-1-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

test('add-keyword CLI normalizes and reuses existing keyword rows', () => {
  const ws = makeTempWorkspace();
  try {
    const env = { ...process.env, YOUPD_WORKSPACE_DB: ws.dbPath };
    const first = spawnSync(
      'pnpm',
      ['tsx', ADD_KEYWORD_SCRIPT, '--keyword', ' AI 트렌드 ', '--region', 'kr'],
      { cwd: REPO_ROOT, encoding: 'utf8', env },
    );
    assert.equal(first.status, 0, first.stderr);
    const firstJson = parseLastJson(first.stdout);
    assert.equal(firstJson.ok, true);
    assert.equal(firstJson.normalized, 'ai 트렌드');
    assert.equal(firstJson.region, 'KR');
    assert.equal(firstJson.created, true);

    const second = spawnSync(
      'pnpm',
      ['tsx', ADD_KEYWORD_SCRIPT, '--keyword', 'ai 트렌드', '--region', 'KR'],
      { cwd: REPO_ROOT, encoding: 'utf8', env },
    );
    assert.equal(second.status, 0, second.stderr);
    const secondJson = parseLastJson(second.stdout);
    assert.equal(secondJson.ok, true);
    assert.equal(secondJson.keywordId, firstJson.keywordId);
    assert.equal(secondJson.created, false);

    const { db } = openDb({ path: ws.dbPath });
    const count = db
      .prepare(`SELECT COUNT(*) AS c FROM youtube_keywords`)
      .get() as { c: number };
    assert.equal(count.c, 1);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('YouTube API routes reject missing BYOK key before external calls', () => {
  const ws = makeTempWorkspace();
  try {
    const env = { ...process.env, YOUPD_WORKSPACE_DB: ws.dbPath, YOUTUBE_API_KEY: undefined };
    const result = spawnSync('pnpm', ['tsx', FETCH_TRENDING_SCRIPT, '--region', 'KR'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env,
    });

    assert.equal(result.status, 1);
    const parsed = parseLastJson(result.stdout) as {
      ok: boolean;
      error: { code: string; message: string };
    };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error.code, 'invalid_key');
    assert.match(parsed.error.message, /YOUTUBE_API_KEY/);
  } finally {
    cleanup(ws);
  }
});

test('youtubeApiRequest records audits and quota usage', async () => {
  const ws = makeTempWorkspace();
  const originalFetch = globalThis.fetch;
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const apiKey = selectYoutubeApiKey(db, { YOUTUBE_API_KEY: 'test-key' });

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get('key'), 'test-key');
      return new Response(JSON.stringify({ items: [{ id: 'video-1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const response = await youtubeApiRequest<{ items: Array<{ id: string }> }>(db, apiKey, {
      resource: 'videos',
      params: { part: 'snippet', id: 'video-1' },
      audit: {
        operation: 'videos.list',
        units: 1,
        videoIds: ['video-1'],
      },
    });

    assert.equal(response.items[0]?.id, 'video-1');
    const audit = db
      .prepare(`SELECT operation, units_consumed, status, video_ids FROM api_call_audits`)
      .get() as { operation: string; units_consumed: number; status: string; video_ids: string };
    assert.equal(audit.operation, 'videos.list');
    assert.equal(audit.units_consumed, 1);
    assert.equal(audit.status, 'success');
    assert.deepEqual(JSON.parse(audit.video_ids) as string[], ['video-1']);

    const usage = db
      .prepare(`SELECT units_consumed FROM daily_quota_usage`)
      .get() as { units_consumed: number };
    assert.equal(usage.units_consumed, 1);
    db.close();
  } finally {
    globalThis.fetch = originalFetch;
    cleanup(ws);
  }
});

test('upsertVideos creates channel stubs before video rows', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const video = videoFromApiItem({
      id: 'video-1',
      snippet: {
        channelId: 'channel-1',
        channelTitle: 'Channel One',
        title: 'Test Video',
        publishedAt: '2026-05-26T00:00:00.000Z',
      },
      contentDetails: { duration: 'PT45S' },
      statistics: { viewCount: '10', likeCount: '2', commentCount: '1' },
    });

    upsertVideos(db, [video], nowIso());

    const channel = db
      .prepare(`SELECT title FROM youtube_channels WHERE channel_id = 'channel-1'`)
      .get() as { title: string } | undefined;
    assert.equal(channel?.title, 'Channel One');

    const storedVideo = db
      .prepare(`SELECT title, is_short, view_count FROM youtube_videos WHERE video_id = 'video-1'`)
      .get() as { title: string; is_short: number; view_count: number } | undefined;
    assert.equal(storedVideo?.title, 'Test Video');
    assert.equal(storedVideo?.is_short, 1);
    assert.equal(storedVideo?.view_count, 10);
    db.close();
  } finally {
    cleanup(ws);
  }
});
