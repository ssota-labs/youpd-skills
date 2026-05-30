import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

interface TempWorkspace {
  dir: string;
  dbPath: string;
}

function makeTempWorkspace(prefix: string): TempWorkspace {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return { dir, dbPath: join(dir, 'workspace.db') };
}

function cleanup(ws: TempWorkspace): void {
  rmSync(ws.dir, { recursive: true, force: true });
}

function seedReferenceVideo(db: ReturnType<typeof openDb>['db']) {
  const collectedAt = '2026-05-29T00:00:00.000Z';
  const channel = channelFromApiItem({
    id: 'channel-p145',
    snippet: { title: 'Viewer Analysis Channel' },
    statistics: { subscriberCount: '1000', viewCount: '100000', videoCount: '20' },
  });
  const video = videoFromApiItem({
    id: 'video-p145',
    snippet: {
      channelId: 'channel-p145',
      channelTitle: 'Viewer Analysis Channel',
      title: '30일 매일 5km 뛰었더니 생긴 일',
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT10M' },
    statistics: { viewCount: '120000', likeCount: '1000', commentCount: '50' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
  const keyword = upsertKeyword(db, { keyword: '뷰어 분석' });
  const sessionId = createSearchSession(db, {
    route: 'search-by-keyword',
    keywordId: keyword.keywordId,
    query: '뷰어 분석',
    regionCode: 'KR',
    mode: 'initial',
    rawParams: { fixture: true },
  });
  insertKeywordVideoResults(db, sessionId, keyword.keywordId, [
    { videoId: 'video-p145', position: 1, raw: '{}' },
  ]);
  const group = ensureFolderGroup(db, { name: 'P1.4.5 Viewer' });
  const folder = ensureFolder(db, { groupId: group.id, name: '분석 폴더', stage: 'plan' });
  const candidates = selectCurationCandidates(db, {
    videoIds: ['video-p145'],
    minGrade: 'Worst',
    limit: 1,
  });
  insertCuration(db, {
    folderId: folder.id,
    stage: 'plan',
    candidates,
    reason: 'p1.4.5 viewer fixture',
  });
}

test('P1.4.5 viewer: analysis surface renders title/thumbnail and folder progress', () => {
  const ws = makeTempWorkspace('youpd-p145-');
  try {
    const { db } = openDb({ path: ws.dbPath });
    runMigrations(db);
    seedReferenceVideo(db);

    saveTitleAnalysis(db, {
      videoId: 'video-p145',
      hookPrimary: 'vicarious',
      hookSecondary: 'authority',
      titleShapes: ['medium', 'with-number'],
      titleTone: 'intimate-conversational',
      reasoning: '1인칭 체험 서술 + 권위 인용',
      freeTags: [],
    });
    saveThumbnailAnalysis(db, {
      videoId: 'video-p145',
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

    const payload = loadWorkspaceViewPayload(db, ws.dbPath);
    assert.equal(payload.analysisSurfaceEnabled, true);
    assert.ok(payload.titleAnalysisByVideoId['video-p145']);
    assert.ok(payload.thumbnailAnalysisByVideoId['video-p145']);
    assert.equal(payload.references[0]?.hasTitleAnalysis, true);
    assert.equal(payload.references[0]?.hasThumbnailAnalysis, true);
    const folder = payload.folders.find((f) => f.name === '분석 폴더');
    assert.ok(folder);
    assert.equal(folder?.bothAnalyzedCount, 1);
    assert.equal(folder?.videoCount, 1);

    const html = renderWorkspaceViewHtml(payload);
    assert.match(html, /제목·썸네일 분석 표면 활성/);
    assert.match(html, /"bothAnalyzedCount":1/);
    assert.match(html, /제목✓/);
    assert.match(html, /제목·썸네일 분석/);
    assert.match(html, /'thumbnail','both','none'/);

    db.close();
  } finally {
    cleanup(ws);
  }
});
