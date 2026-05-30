import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openDb } from '../lib/db/client.ts';
import { runMigrations } from '../lib/db/migrate.ts';
import { channelFromApiItem, videoFromApiItem } from '../lib/youtube/api.ts';
import {
  ensureFolder,
  ensureFolderGroup,
  insertCuration,
  selectCurationCandidates,
} from '../lib/youtube/references.ts';
import { createSearchSession, insertKeywordVideoResults, persistVideoBundle, upsertKeyword } from '../lib/youtube/write.ts';
import { loadWorkspaceViewPayload, renderWorkspaceViewHtml } from '../lib/youtube/workspace-view.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const VIEW_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'view.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p13-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function seedWorkspace(db: ReturnType<typeof openDb>['db']) {
  const collectedAt = '2026-05-29T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-view-1',
    snippet: { title: 'Viewer Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-view-1',
    snippet: {
      channelId: 'channel-view-1',
      channelTitle: 'Viewer Channel',
      title: 'Viewer Video Title',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: '뷰어 테스트' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: '뷰어 테스트',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-view-1', position: 1, raw: '{}' },
  ]);

  const group = ensureFolderGroup(db, { name: 'Viewer Group' });
  const folder = ensureFolder(db, { groupId: group.id, name: '계획', stage: 'plan' });
  const candidates = selectCurationCandidates(db, {
    searchSessionId: sessionId,
    minGrade: 'Good',
    limit: 5,
  });
  insertCuration(db, {
    folderId: folder.id,
    stage: 'plan',
    candidates,
    reason: 'viewer fixture',
  });
}

test('loadWorkspaceViewPayload + renderWorkspaceViewHtml embeds seeded content', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedWorkspace(db);

    const payload = loadWorkspaceViewPayload(db, ws.dbPath);
    assert.equal(payload.keywords.length, 1);
    assert.equal(payload.keywords[0]?.keyword, '뷰어 테스트');
    assert.ok(payload.references.some((r) => r.videoId === 'video-view-1'));

    const html = renderWorkspaceViewHtml(payload);
    assert.match(html, /youpd workspace viewer/);
    assert.match(html, /Viewer Video Title/);
    assert.match(html, /Viewer Group/);
    assert.match(html, /"application\/json"/);

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('view.ts static mode writes HTML and emits ok JSON', () => {
  const ws = makeTempWorkspace();
  const htmlPath = join(ws.dir, 'out.html');
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedWorkspace(db);
    db.close();

    const result = spawnSync(
      'pnpm',
      ['tsx', VIEW_SCRIPT, '--mode', 'static', '--db', ws.dbPath, '--output', htmlPath],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    const parsed = parseLastJson(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal((parsed.result as { mode: string }).mode, 'static');
    assert.equal((parsed.result as { htmlPath: string }).htmlPath, htmlPath);

    const html = readFileSync(htmlPath, 'utf8');
    assert.match(html, /Viewer Video Title/);
  } finally {
    cleanup(ws);
  }
});

test('view.ts fails with not_found when DB is missing', () => {
  const ws = makeTempWorkspace();
  const missing = join(ws.dir, 'missing.db');
  try {
    const result = spawnSync(
      'pnpm',
      ['tsx', VIEW_SCRIPT, '--db', missing],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.notEqual(result.status, 0);
    const parsed = parseLastJson(result.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'not_found');
  } finally {
    cleanup(ws);
  }
});

test('view.ts serve mode responds with HTTP 200', async () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db, { untilInclusive: '011_reference_curation.sql' });
    seedWorkspace(db);
    db.close();

    const child = spawn('pnpm', ['tsx', VIEW_SCRIPT, '--mode', 'serve', '--db', ws.dbPath, '--port', '43847'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    const url = await new Promise<string>((resolvePromise, reject) => {
      const timeout = setTimeout(() => reject(new Error('serve mode did not emit JSON in time')), 15_000);
      const check = () => {
        try {
          const parsed = parseLastJson(stdout);
          if (parsed.ok === true && (parsed.result as { url?: string }).url) {
            clearTimeout(timeout);
            resolvePromise((parsed.result as { url: string }).url);
          }
        } catch {
          // wait for full JSON line
        }
      };
      child.stdout?.on('data', check);
      check();
    });

    const response = await fetch(url);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.match(body, /youpd workspace viewer/);

    child.kill('SIGTERM');
    await new Promise<void>((resolvePromise) => {
      child.once('exit', () => resolvePromise());
      setTimeout(() => resolvePromise(), 2000);
    });
  } finally {
    cleanup(ws);
  }
});
