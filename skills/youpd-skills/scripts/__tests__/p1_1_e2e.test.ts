/**
 * P1.1 dogfood E2E.
 *
 * This test intentionally calls the real YouTube Data API. It is opt-in so
 * normal unit/smoke tests stay deterministic and do not consume quota.
 *
 * Run:
 *   set -a; source .env.local; set +a; pnpm test:e2e
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openDb } from '../lib/db/client.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const INIT_SCRIPT = resolve(TEST_FILE_DIR, '..', 'workspace', 'init.ts');
const ADD_KEYWORD_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'add-keyword.ts');
const SEARCH_BY_KEYWORD_SCRIPT = resolve(
  TEST_FILE_DIR,
  '..',
  'research',
  'youtube',
  'search-by-keyword.ts',
);
const SEARCH_CHANNELS_SCRIPT = resolve(
  TEST_FILE_DIR,
  '..',
  'research',
  'youtube',
  'search-channels.ts',
);
const FETCH_CHANNEL_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'fetch-channel.ts');
const FETCH_CHANNEL_VIDEOS_SCRIPT = resolve(
  TEST_FILE_DIR,
  '..',
  'research',
  'youtube',
  'fetch-channel-videos.ts',
);
const FETCH_TRENDING_SCRIPT = resolve(
  TEST_FILE_DIR,
  '..',
  'research',
  'youtube',
  'fetch-trending.ts',
);

const E2E_CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google for Developers
const skipReason =
  process.env.YOUPD_E2E === '1' && process.env.YOUTUBE_API_KEY
    ? false
    : 'set YOUPD_E2E=1 and YOUTUBE_API_KEY to run real YouTube API dogfood';

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-skills-p1-1-e2e-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  assert.ok(lines.length > 0, 'script must emit JSON to stdout');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function runScript(script: string, args: string[], env: NodeJS.ProcessEnv): Record<string, unknown> {
  const result = spawnSync('pnpm', ['tsx', script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
  });

  assert.equal(
    result.status,
    0,
    `script failed: ${script}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const parsed = parseLastJson(result.stdout);
  assert.equal(parsed.ok, true, `script returned non-ok JSON: ${JSON.stringify(parsed)}`);
  return parsed;
}

function countRows(dbPath: string, table: string): number {
  const { db } = openDb({ path: dbPath });
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
    return row.c;
  } finally {
    db.close();
  }
}

test(
  'P1.1 dogfood: keyword, channel, channel videos, and trending routes persist audited data',
  { skip: skipReason, timeout: 180_000 },
  () => {
    const ws = makeTempWorkspace();
    try {
      const env = {
        ...process.env,
        YOUPD_WORKSPACE_DB: ws.dbPath,
      };

      const init = runScript(INIT_SCRIPT, ['--db', ws.dbPath, '--label', 'p1-1-e2e'], env);
      assert.equal(init.workspaceMetaCreated, true);

      const keyword = runScript(
        ADD_KEYWORD_SCRIPT,
        ['--keyword', 'AI 트렌드', '--region', 'KR'],
        env,
      );
      const keywordId = keyword.keywordId as string;
      assert.match(keywordId, /^[0-9a-f-]{36}$/);

      const search = runScript(
        SEARCH_BY_KEYWORD_SCRIPT,
        ['--keyword-id', keywordId, '--max', '5', '--force'],
        env,
      );
      assert.equal(search.cacheHit, false);
      assert.ok((search.resultCount as number) > 0);
      assert.ok((search.unitsConsumed as number) >= 101);

      const cachedSearch = runScript(
        SEARCH_BY_KEYWORD_SCRIPT,
        ['--keyword-id', keywordId, '--max', '5'],
        env,
      );
      assert.equal(cachedSearch.cacheHit, true);
      assert.equal(cachedSearch.unitsConsumed, 0);

      const channelSearch = runScript(
        SEARCH_CHANNELS_SCRIPT,
        ['--keyword', 'AI 뉴스', '--region', 'KR', '--max', '3'],
        env,
      );
      assert.ok((channelSearch.resultCount as number) > 0);

      const channel = runScript(FETCH_CHANNEL_SCRIPT, ['--channel-id', E2E_CHANNEL_ID], env);
      assert.deepEqual(channel.channelIds, [E2E_CHANNEL_ID]);

      const channelVideos = runScript(
        FETCH_CHANNEL_VIDEOS_SCRIPT,
        ['--channel-id', E2E_CHANNEL_ID, '--max', '5'],
        env,
      );
      assert.ok((channelVideos.resultCount as number) > 0);

      const trending = runScript(FETCH_TRENDING_SCRIPT, ['--region', 'KR', '--max', '5'], env);
      assert.ok((trending.resultCount as number) > 0);

      assert.ok(countRows(ws.dbPath, 'youtube_keywords') >= 1);
      assert.ok(countRows(ws.dbPath, 'youtube_search_sessions') >= 1);
      assert.ok(countRows(ws.dbPath, 'youtube_keyword_video_results') >= 1);
      assert.ok(countRows(ws.dbPath, 'youtube_channels') >= 1);
      assert.ok(countRows(ws.dbPath, 'youtube_videos') >= 1);
      assert.ok(countRows(ws.dbPath, 'youtube_trending') >= 1);
      assert.ok(countRows(ws.dbPath, 'api_call_audits') >= 7);
      assert.ok(countRows(ws.dbPath, 'daily_quota_usage') >= 1);
    } finally {
      cleanup(ws);
    }
  },
);
