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
import { listAnalysisCandidates, saveIntroAnalysis } from '../lib/analysis/persist.ts';
import { assertGlossarySeeded } from '../lib/analysis/glossary.ts';
import {
  sliceTranscriptText,
  upsertTranscript,
} from '../lib/transcript/persist.ts';
import { parseJson3 } from '../lib/transcript/timedtext.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..', '..');
const SAVE_INTRO = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'save-intro-analysis.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p15-'));
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
  const collectedAt = '2026-05-30T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-p15',
    snippet: { title: 'Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-p15',
    snippet: {
      channelId: 'channel-p15',
      channelTitle: 'Channel',
      title: '도입부 테스트 영상',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: '도입부 키워드' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: '도입부 키워드',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-p15', position: 1, raw: '{}' },
  ]);
  const group = ensureFolderGroup(db, { name: 'P1.5 테스트' });
  const folder = ensureFolder(db, { groupId: group.id, name: '도입부 폴더', stage: 'unspecified' });
  const candidates = selectCurationCandidates(db, {
    videoIds: ['video-p15'],
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

test('P1.5 migrations add transcripts, intro analyses, and extended glossary', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    for (const table of ['youtube_video_transcripts', 'youtube_intro_analyses']) {
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
    assert.equal(hookCount.n, 24);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('parseJson3 extracts timed segments', () => {
  const body = JSON.stringify({
    events: [
      { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: '안녕하세요' }] },
      { tStartMs: 2000, dDurationMs: 3000, segs: [{ utf8: '오늘 주제는' }] },
    ],
  });
  const segments = parseJson3(body);
  assert.equal(segments.length, 2);
  assert.equal(segments[0]?.text, '안녕하세요');
  assert.ok(sliceTranscriptText(segments, 3).includes('안녕하세요'));
});

test('save intro analysis requires transcript and validates enums', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);

    assert.throws(
      () =>
        saveIntroAnalysis(db, {
          videoId: 'video-p15',
          windowSec: 15,
          introHookPrimary: 'cold-open-scene',
          introStructure: 'HPP',
          pacingSignal: '7-sec-promise',
          rewardBurdenBalance: 'engaging-intro',
          reasoning: 'no transcript',
          freeTags: [],
        }),
      /자막이 없습니다/,
    );

    upsertTranscript(db, {
      videoId: 'video-p15',
      source: 'manual_paste',
      language: 'ko',
      fullText: '안녕하세요 오늘은 도입부 테스트입니다',
      segments: [
        { startSec: 0, endSec: 2, text: '안녕하세요' },
        { startSec: 2, endSec: 5, text: '오늘은 도입부 테스트입니다' },
      ],
    });

    const saved = saveIntroAnalysis(db, {
      videoId: 'video-p15',
      windowSec: 15,
      introHookPrimary: 'cold-open-scene',
      introHookSecondary: 'direct-address',
      introStructure: 'HPP',
      pacingSignal: '7-sec-promise',
      rewardBurdenBalance: 'engaging-intro',
      reasoning: '짧은 인사 후 약속',
      freeTags: ['partial_intro'],
    });
    assert.ok(saved.analysisId);

    assert.throws(
      () =>
        saveIntroAnalysis(db, {
          videoId: 'video-p15',
          windowSec: 15,
          introHookPrimary: 'pattern-interrupt',
          introStructure: 'PAS',
          pacingSignal: 'instant-payoff',
          rewardBurdenBalance: 'engaging-intro',
          reasoning: 'dup',
          freeTags: [],
        }),
      /이미 도입부 분석/,
    );

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('list-analysis-candidates intro kind exposes transcript flags', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const { folderId } = seedReferenceVideo(db);

    const before = listAnalysisCandidates(db, { kind: 'intro', folderId, limit: 10 });
    assert.equal(before.length, 1);
    assert.equal(before[0]?.hasTranscript, false);
    assert.equal(before[0]?.hasIntroAnalysis, false);

    upsertTranscript(db, {
      videoId: 'video-p15',
      source: 'timedtext',
      language: 'ko',
      fullText: '테스트',
      segments: [{ startSec: 0, endSec: 1, text: '테스트' }],
    });

    saveIntroAnalysis(db, {
      videoId: 'video-p15',
      windowSec: 5,
      introHookPrimary: 'statistic-drop',
      introStructure: 'Q&A',
      pacingSignal: 'instant-payoff',
      rewardBurdenBalance: 'front-loaded-burden',
      reasoning: '수치로 시작',
      freeTags: [],
    });

    const after = listAnalysisCandidates(db, { kind: 'intro', folderId, limit: 10 });
    assert.equal(after.length, 0);

    db.close();
  } finally {
    cleanup(ws);
  }
});

test('save-intro-analysis script rejects unknown intro-structure', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);
    upsertTranscript(db, {
      videoId: 'video-p15',
      source: 'manual_paste',
      language: 'ko',
      fullText: 'x',
      segments: [{ startSec: 0, endSec: 1, text: 'x' }],
    });
    db.close();

    const result = spawnSync(
      'pnpm',
      [
        'tsx',
        SAVE_INTRO,
        '--db',
        ws.dbPath,
        '--video-id',
        'video-p15',
        '--hook-primary',
        'cold-open-scene',
        '--intro-structure',
        'NOT-REAL',
        '--pacing-signal',
        'slow-build',
        '--reward-burden-balance',
        'engaging-intro',
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
