import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
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
import {
  listAnalysisCandidates,
  saveThumbnailAnalysis,
  saveTitleAnalysis,
} from '../lib/analysis/persist.ts';
import { assertGlossarySeeded } from '../lib/analysis/glossary.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const SAVE_TITLE = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'save-title-analysis.ts');
const SAVE_THUMBNAIL = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'save-thumbnail-analysis.ts');
const LIST_CANDIDATES = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'list-analysis-candidates.ts');
const DB_EXEC = resolve(TEST_FILE_DIR, '..', 'db', 'exec.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p14-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function seedReferenceVideo(db: ReturnType<typeof openDb>['db']) {
  const collectedAt = '2026-05-29T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-p14',
    snippet: { title: 'Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-p14',
    snippet: {
      channelId: 'channel-p14',
      channelTitle: 'Channel',
      title: '30일 매일 5km 뛰었더니 생긴 일',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: '러닝 챌린지' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: '러닝 챌린지',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-p14', position: 1, raw: '{}' },
  ]);
  const group = ensureFolderGroup(db, { name: 'P1.4 테스트' });
  const folder = ensureFolder(db, { groupId: group.id, name: '분석 폴더', stage: 'unspecified' });
  const candidates = selectCurationCandidates(db, {
    videoIds: ['video-p14'],
    minGrade: 'Worst',
    limit: 1,
  });
  insertCuration(db, {
    folderId: folder.id,
    stage: 'unspecified',
    candidates,
  });
  return { folderId: folder.id };
}

test('P1.4 migrations create glossary and analysis tables with seed', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    for (const table of [
      'glossary_axes',
      'glossary_axis_values',
      'youtube_title_analyses',
      'youtube_thumbnail_analyses',
      'youtube_reference_classifications',
    ]) {
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
        .get(table) as { name: string } | undefined;
      assert.ok(row, `${table} must exist`);
    }
    assertGlossarySeeded(db);
    const hookCount = db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM glossary_axis_values v
         JOIN glossary_axes a ON a.id = v.axis_id
         WHERE a.code = 'hook-type'`,
      )
      .get() as { n: number };
    assert.equal(hookCount.n, 15);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('save title and thumbnail analysis with glossary validation', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);

    const title = saveTitleAnalysis(db, {
      videoId: 'video-p14',
      hookPrimary: 'vicarious',
      hookSecondary: 'authority',
      titleShapes: ['medium', 'with-bracket'],
      titleTone: 'intimate-conversational',
      reasoning: '1인칭 체험 + 권위 인용',
      freeTags: ['emotion-secondary:warm'],
    });
    assert.ok(title.analysisId);

    const thumb = saveThumbnailAnalysis(db, {
      videoId: 'video-p14',
      visualHierarchy: 'face-dominant',
      textDensity: 'medium',
      faceTreatment: 'expressive-shock',
      feltEmotion: 'shocked',
      alignmentWithTitle: 'aligned',
      alignmentReasoning: '제목 체험담과 놀란 표정이 일치',
      reasoning: '얼굴 중심 + 충격 표정',
      freeTags: [],
    });
    assert.equal(thumb.hasTitleAnalysis, true);

    assert.throws(
      () =>
        saveTitleAnalysis(db, {
          videoId: 'video-p14',
          hookPrimary: 'curiosity-gap',
          titleShapes: [],
          titleTone: 'neutral-informational',
          reasoning: 'dup',
          freeTags: [],
        }),
      /이미 제목 분석/,
    );

    const re = saveTitleAnalysis(db, {
      videoId: 'video-p14',
      hookPrimary: 'curiosity-gap',
      titleShapes: ['question-mark'],
      titleTone: 'neutral-informational',
      reasoning: 'reanalyze',
      freeTags: [],
      reanalyze: true,
    });
    assert.equal(re.reanalyzed, true);

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('list-analysis-candidates returns unanalyzed reference videos', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const { folderId } = seedReferenceVideo(db);

    const titleCandidates = listAnalysisCandidates(db, {
      kind: 'title',
      folderId,
      limit: 10,
    });
    assert.equal(titleCandidates.length, 1);
    assert.equal(titleCandidates[0]?.videoId, 'video-p14');
    assert.equal(titleCandidates[0]?.hasTitleAnalysis, false);

    saveTitleAnalysis(db, {
      videoId: 'video-p14',
      hookPrimary: 'vicarious',
      titleShapes: [],
      titleTone: 'neutral-informational',
      reasoning: 'ok',
      freeTags: [],
    });

    const after = listAnalysisCandidates(db, { kind: 'title', folderId, limit: 10 });
    assert.equal(after.length, 0);

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('save-title-analysis script rejects unknown hook code', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);
    db.close();

    const result = spawnSync(
      'pnpm',
      [
        'tsx',
        SAVE_TITLE,
        '--db',
        ws.dbPath,
        '--video-id',
        'video-p14',
        '--hook-primary',
        'not-a-real-hook',
        '--title-tone',
        'neutral-informational',
        '--reasoning',
        'bad',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );

    const parsed = parseLastJson(`${result.stdout}${result.stderr}`);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'validation_error');
  } finally {
    cleanup(ws);
  }
});

test('db/exec allows SELECT and blocks DROP', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);
    db.close();

    const select = spawnSync(
      'pnpm',
      ['tsx', DB_EXEC, '--db', ws.dbPath, '--sql', 'SELECT COUNT(*) AS n FROM glossary_axes'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(select.status, 0);
    const ok = parseLastJson(select.stdout);
    assert.equal(ok.ok, true);

    const drop = spawnSync(
      'pnpm',
      ['tsx', DB_EXEC, '--db', ws.dbPath, '--sql', 'DROP TABLE glossary_axes'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    const err = parseLastJson(`${drop.stdout}${drop.stderr}`);
    assert.equal(err.ok, false);
    assert.equal(err.code, 'dangerous_scope');
  } finally {
    cleanup(ws);
  }
});

test('list-analysis-candidates script emits ok JSON', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const { folderId } = seedReferenceVideo(db);
    db.close();

    const result = spawnSync(
      'pnpm',
      [
        'tsx',
        LIST_CANDIDATES,
        '--db',
        ws.dbPath,
        '--kind',
        'thumbnail',
        '--folder-id',
        folderId,
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(result.status, 0);
    const parsed = parseLastJson(result.stdout) as { ok: boolean; result: { candidates: unknown[] } };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.result.candidates.length, 1);
  } finally {
    cleanup(ws);
  }
});

test('save-thumbnail-analysis script persists alignment', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);
    saveTitleAnalysis(db, {
      videoId: 'video-p14',
      hookPrimary: 'vicarious',
      titleShapes: [],
      titleTone: 'neutral-informational',
      reasoning: 't',
      freeTags: [],
    });
    db.close();

    const result = spawnSync(
      'pnpm',
      [
        'tsx',
        SAVE_THUMBNAIL,
        '--db',
        ws.dbPath,
        '--video-id',
        'video-p14',
        '--visual-hierarchy',
        'face-dominant',
        '--text-density',
        'low',
        '--felt-emotion',
        'curious',
        '--alignment-with-title',
        'partial',
        '--reasoning',
        'thumb ok',
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    assert.equal(result.status, 0);
    const parsed = parseLastJson(result.stdout) as { ok: boolean; result: { hasTitleAnalysis: boolean } };
    assert.equal(parsed.ok, true);
    assert.equal(parsed.result.hasTitleAnalysis, true);
  } finally {
    cleanup(ws);
  }
});
