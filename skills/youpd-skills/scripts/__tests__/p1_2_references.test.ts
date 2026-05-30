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
  createDiscoveryRun,
  ensureFolder,
  ensureFolderGroup,
  insertCuration,
  listReferences,
  parseConsumerStage,
  selectCurationCandidates,
  upsertTopLevelComments,
} from '../lib/youtube/references.ts';
import { createSearchSession, insertKeywordVideoResults, persistVideoBundle, upsertKeyword } from '../lib/youtube/write.ts';

const TEST_FILE_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(TEST_FILE_DIR, '..', '..', '..');
const FETCH_COMMENTS = resolve(TEST_FILE_DIR, '..', 'research', 'youtube', 'fetch-comments.ts');

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), 'youpd-p12-'));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function parseLastJson(stdout: string): Record<string, unknown> {
  const lines = stdout.trim().split('\n');
  return JSON.parse(lines[lines.length - 1] as string) as Record<string, unknown>;
}

function seedScoredVideo(db: ReturnType<typeof openDb>['db']) {
  const collectedAt = '2026-05-29T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-1',
    snippet: { title: 'Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-1',
    snippet: {
      channelId: 'channel-1',
      channelTitle: 'Channel',
      title: 'Great Video',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: 'AI 업무 자동화' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: 'AI 업무 자동화',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-1', position: 1, raw: '{}' },
  ]);
  return { sessionId, keywordId: keyword.keywordId };
}

test('P1.2 migration creates reference and comment tables with stage CHECK', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    for (const table of [
      'reference_folder_groups',
      'reference_folders',
      'reference_discovery_runs',
      'reference_folder_videos',
      'youtube_comment_fetch_sessions',
      'youtube_comments',
    ]) {
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
        .get(table) as { name: string } | undefined;
      assert.ok(row, `${table} must exist`);
    }

    const group = ensureFolderGroup(db, { name: '테스트' });
    assert.throws(
      () => {
        db.prepare(
          `INSERT INTO reference_folders
             (id, group_id, name, consumer_stage, created_at, updated_at)
           VALUES ('f-invalid', ?, 'bad', 'invalid', datetime('now'), datetime('now'))`,
        ).run(group.id);
      },
      /CHECK constraint failed/,
    );
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('folder group and child folders are idempotent and stage aliases work', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const firstGroup = ensureFolderGroup(db, { name: 'AI 생산성' });
    const secondGroup = ensureFolderGroup(db, { name: 'AI 생산성' });
    assert.equal(firstGroup.id, secondGroup.id);
    assert.equal(firstGroup.created, true);
    assert.equal(secondGroup.created, false);
    assert.equal(parseConsumerStage('현상'), 'phenomenon');

    const firstFolder = ensureFolder(db, { groupId: firstGroup.id, name: '현상', stage: 'phenomenon' });
    const secondFolder = ensureFolder(db, { groupId: firstGroup.id, name: '현상', stage: 'phenomenon' });
    assert.equal(firstFolder.id, secondFolder.id);
    assert.equal(firstFolder.created, true);
    assert.equal(secondFolder.created, false);
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('curation stores score identity only and lists by joined score', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    const { sessionId } = seedScoredVideo(db);
    const group = ensureFolderGroup(db, { name: 'AI 생산성' });
    const folder = ensureFolder(db, { groupId: group.id, name: '계획', stage: 'plan' });
    const discoveryRunId = createDiscoveryRun(db, {
      folderGroupId: group.id,
      selectedStages: ['plan'],
      searchSessionIds: [sessionId],
      complete: true,
    });
    const candidates = selectCurationCandidates(db, {
      searchSessionId: sessionId,
      minGrade: 'Good',
      limit: 10,
    });
    assert.equal(candidates.length, 1);
    const inserted = insertCuration(db, {
      folderId: folder.id,
      stage: 'plan',
      discoveryRunId,
      candidates,
    });
    assert.equal(inserted.addedCount, 1);

    const curationRow = db
      .prepare(`SELECT * FROM reference_folder_videos WHERE folder_id = ?`)
      .get(folder.id) as { video_snapshot_collected_at: string; score_policy_version: string };
    assert.ok(curationRow.video_snapshot_collected_at);
    assert.ok(curationRow.score_policy_version);

    const columns = db.prepare(`PRAGMA table_info(reference_folder_videos)`).all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => column.name === 'length_adjusted_score'), false);
    assert.equal(columns.some((column) => column.name === 'performance_grade'), false);

    const listed = listReferences(db, {
      folderGroupId: group.id,
      stage: 'plan',
      limit: 10,
      order: 'score',
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.videoId, 'video-1');
    assert.equal(listed[0]?.performanceGrade, 'Great');
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('comment helper upserts top-level comments idempotently', () => {
  const ws = makeTempWorkspace();
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedScoredVideo(db);
    const group = ensureFolderGroup(db, { name: 'AI 생산성' });
    const folder = ensureFolder(db, { groupId: group.id, name: '계획', stage: 'plan' });
    const fetchSessionId = db.prepare(
      `INSERT INTO youtube_comment_fetch_sessions
         (id, video_id, folder_id, order_by, max_results, raw_params, started_at)
       VALUES ('comment-session-1', 'video-1', ?, 'relevance', 20, '{}', datetime('now'))
       RETURNING id`,
    ).get(folder.id) as { id: string };
    const comment = {
      id: 'thread-1',
      snippet: {
        topLevelComment: {
          id: 'comment-1',
          snippet: {
            authorDisplayName: 'user',
            textOriginal: '엑셀에도 적용할 수 있나요?',
            likeCount: 3,
            publishedAt: '2026-05-29T00:00:00.000Z',
          },
        },
      },
    };
    const first = upsertTopLevelComments(db, {
      videoId: 'video-1',
      fetchSessionId: fetchSessionId.id,
      comments: [comment],
      collectedAt: '2026-05-29T01:00:00.000Z',
    });
    const second = upsertTopLevelComments(db, {
      videoId: 'video-1',
      fetchSessionId: fetchSessionId.id,
      comments: [comment],
      collectedAt: '2026-05-29T01:00:00.000Z',
    });
    assert.equal(first.insertedCount, 1);
    assert.equal(second.insertedCount, 0);
    assert.equal(first.languagePrompts[0]?.commentText, '엑셀에도 적용할 수 있나요?');
    db.close();
  } finally {
    cleanup(ws);
  }
});

test('fetch-comments CLI rejects missing API key before external calls', () => {
  const ws = makeTempWorkspace();
  try {
    const env = { ...process.env, YOUPD_WORKSPACE_DB: ws.dbPath };
    delete (env as NodeJS.ProcessEnv).YOUTUBE_API_KEY;
    const result = spawnSync('pnpm', ['tsx', FETCH_COMMENTS, '--video-id', 'video-1'], {
      cwd: SKILL_ROOT,
      encoding: 'utf8',
      env,
    });
    assert.equal(result.status, 1);
    const parsed = parseLastJson(result.stdout) as { ok: boolean; code: string };
    assert.equal(parsed.ok, false);
    assert.equal(parsed.code, 'missing_api_key');
  } finally {
    cleanup(ws);
  }
});
