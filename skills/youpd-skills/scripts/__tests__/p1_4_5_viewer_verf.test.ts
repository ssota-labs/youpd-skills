import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openDb } from '../lib/db/client.ts';
import { runMigrations } from '../lib/db/migrate.ts';
import { saveThumbnailAnalysis, saveTitleAnalysis } from '../lib/analysis/persist.ts';
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
const SKILL_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..');
const VIEW_SCRIPT = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'view.ts');

let nextServePort = 43848;

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function allocServePort(): number {
  nextServePort += 1;
  return nextServePort;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p145-verf-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function clickEl(el: unknown): void {
  (el as { click?: () => void } | null | undefined)?.click?.();
}

function extractWorkspaceData(html: string): Record<string, unknown> {
  const match = html.match(
    /<script type="application\/json" id="workspace-data">([\s\S]*?)<\/script>/,
  );
  assert.ok(match?.[1], 'workspace-data JSON block missing');
  return JSON.parse(match[1] as string) as Record<string, unknown>;
}

function seedAnalysisWorkspace(db: ReturnType<typeof openDb>['db']) {
  const collectedAt = '2026-05-29T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-p145-verf',
    snippet: { title: 'VERF Analysis Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-p145-verf',
    snippet: {
      channelId: 'channel-p145-verf',
      channelTitle: 'VERF Analysis Channel',
      title: '30일 매일 5km 뛰었더니 생긴 일',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: '뷰어 VERF' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: '뷰어 VERF',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-p145-verf', position: 1, raw: '{}' },
  ]);
  const group = ensureFolderGroup(db, { name: 'P1.4.5 VERF' });
  const folder = ensureFolder(db, { groupId: group.id, name: '분석 폴더', stage: 'plan' });
  const candidates = selectCurationCandidates(db, {
    videoIds: ['video-p145-verf'],
    minGrade: 'Worst',
    limit: 1,
  });
  insertCuration(db, {
    folderId: folder.id,
    stage: 'plan',
    candidates,
    reason: 'p1.4.5 verf fixture',
  });

  saveTitleAnalysis(db, {
    videoId: 'video-p145-verf',
    hookPrimary: 'vicarious',
    hookSecondary: 'authority',
    titleShapes: ['medium', 'with-number'],
    titleTone: 'intimate-conversational',
    reasoning: '1인칭 체험 서술 + 권위 인용',
    freeTags: [],
  });
  saveThumbnailAnalysis(db, {
    videoId: 'video-p145-verf',
    visualHierarchy: 'face-dominant',
    textDensity: 'medium',
    faceTreatment: 'expressive-shock',
    feltEmotion: 'shocked',
    alignmentWithTitle: 'aligned',
    alignmentReasoning: '제목 체험담과 썸네일 표정이 일치',
    reasoning: '얼굴 클로즈업 + 충격 표정',
    freeTags: [],
    thumbnailUrlUsed: 'https://example.com/thumb.jpg',
  });
}

async function startServe(dbPath: string): Promise<{ url: string; child: ReturnType<typeof spawn> }> {
  const port = allocServePort();
  const child = spawn(
    'pnpm',
    ['tsx', VIEW_SCRIPT, '--mode', 'serve', '--db', dbPath, '--port', String(port)],
    { cwd: SKILL_ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let stdout = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });

  const url = await new Promise<string>((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error('serve mode did not emit JSON in time')), 20_000);
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

  return { url, child };
}

async function stopServe(child: ReturnType<typeof spawn>): Promise<void> {
  child.kill('SIGTERM');
  await new Promise<void>((resolvePromise) => {
    child.once('exit', () => resolvePromise());
    setTimeout(() => resolvePromise(), 2000);
  });
}

async function runViewerClientScript(html: string): Promise<void> {
  const { Window } = await import('happy-dom');
  const window = new Window({ url: 'http://127.0.0.1/' });
  try {
    window.document.write(html);
    const inline = window.document.querySelector('script:not([type])');
    assert.ok(inline?.textContent);
    window.eval(inline.textContent);

    const doc = window.document;
    clickEl(doc.querySelector('button[data-view="folders"]'));
    assert.ok(doc.getElementById('ref-filters'), 'reference filter bar should render');

    const banner = doc.querySelector('#analysis-banner .callout.ok');
    assert.ok(banner);
    assert.match(banner.textContent ?? '', /제목·썸네일 분석 표면 활성/);

    clickEl(doc.querySelector('#ref-filters button[data-filter="both"]'));
    const refRow = doc.querySelector('#view-folders tr[data-video]');
    assert.ok(refRow);
    assert.match(refRow.innerHTML, /제목✓/);

    const folderRow = doc.querySelector('#view-folders tr[data-folder]');
    assert.ok(folderRow);
    clickEl(folderRow);
    assert.ok(doc.body.textContent?.includes('폴더 분석 분포'));

    clickEl(refRow);
    assert.ok(doc.body.textContent?.includes('제목·썸네일 분석'));

    const summary = doc.querySelector('details.reasoning summary');
    assert.ok(summary);
    clickEl(summary);
    assert.ok(summary.parentElement?.hasAttribute('open'));

    assert.match(doc.body.textContent ?? '', /후크/);
    assert.match(doc.body.textContent ?? '', /Vicarious/i);
  } finally {
    window.close();
  }
}

test('P1.4.5 VERF: view-workspace static stdout counts and serve payload', async () => {
  const ws = makeTempWorkspace();
  const htmlPath = join(ws.dir, 'verf.html');
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedAnalysisWorkspace(db);
    db.close();

    const staticRun = spawnSync(
      'pnpm',
      ['tsx', VIEW_SCRIPT, '--mode', 'static', '--db', ws.dbPath, '--output', htmlPath],
      { cwd: SKILL_ROOT, encoding: 'utf8' },
    );
    assert.equal(staticRun.status, 0, staticRun.stderr);
    const parsed = parseLastJson(staticRun.stdout);
    assert.equal(parsed.ok, true);
    const counts = (parsed.result as { counts?: Record<string, unknown> }).counts;
    assert.ok(counts);
    assert.equal(counts?.analysisSurfaceEnabled, true);
    assert.equal(counts?.titleAnalyses, 1);
    assert.equal(counts?.thumbnailAnalyses, 1);
    assert.equal(counts?.foldersWithStats, 1);

    const { url, child } = await startServe(ws.dbPath);
    try {
      const response = await fetch(url);
      assert.equal(response.status, 200);
      const html = await response.text();
      const data = extractWorkspaceData(html);
      assert.equal(data.analysisSurfaceEnabled, true);
      assert.ok((data.titleAnalysisByVideoId as Record<string, unknown>)['video-p145-verf']);
      assert.match(html, /제목·썸네일 분석 표면 활성/);
      await runViewerClientScript(html);
    } finally {
      await stopServe(child);
    }
  } finally {
    cleanup(ws);
  }
});

test('P1.4.5 VERF: rendered HTML client script — filters, folder stats, analysis panel', async () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedAnalysisWorkspace(db);
    const html = renderWorkspaceViewHtml(loadWorkspaceViewPayload(db, ws.dbPath));
    db.close();
    await runViewerClientScript(html);
  } finally {
    cleanup(ws);
  }
});
