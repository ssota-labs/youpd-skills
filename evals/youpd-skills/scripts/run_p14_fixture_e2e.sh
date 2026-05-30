#!/usr/bin/env bash
# P1.4 fixture E2E (no YouTube API): migrations + curated refs + save title/thumbnail + aggregate.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

EVAL_DIR=$(mktemp -d "${TMPDIR:-/tmp}/youpd-p14-fixture-XXXXXX")
DB="$EVAL_DIR/workspace.db"
export YOUPD_WORKSPACE_DB="$DB"

pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --db "$DB" --label p14-fixture-eval >/dev/null

node --import tsx/esm <<'NODE'
import { openDb } from './skills/youpd-skills/scripts/lib/db/client.ts';
import { runMigrations } from './skills/youpd-skills/scripts/lib/db/migrate.ts';
import { channelFromApiItem, videoFromApiItem } from './skills/youpd-skills/scripts/lib/youtube/api.ts';
import {
  ensureFolder,
  ensureFolderGroup,
  insertCuration,
  selectCurationCandidates,
} from './skills/youpd-skills/scripts/lib/youtube/references.ts';
import { createSearchSession, insertKeywordVideoResults, persistVideoBundle, upsertKeyword } from './skills/youpd-skills/scripts/lib/youtube/write.ts';
import {
  listAnalysisCandidates,
  saveThumbnailAnalysis,
  saveTitleAnalysis,
} from './skills/youpd-skills/scripts/lib/analysis/persist.ts';

const dbPath = process.env.YOUPD_WORKSPACE_DB!;
const { db } = openDb({ path: dbPath });
runMigrations(db);

const collectedAt = new Date().toISOString();
const videos = [
  { id: 'eval-v1', title: '30일 매일 5km 뛰었더니 생긴 일' },
  { id: 'eval-v2', title: 'AI로 업무 10배? 진짜일까' },
  { id: 'eval-v3', title: '직장인이 절대 하면 안 되는 습관 3가지' },
];

const channel = channelFromApiItem({
  id: 'eval-ch',
  snippet: { title: 'Eval Channel' },
  statistics: { subscriberCount: '10000', viewCount: '1000000', videoCount: '100' },
});

for (const v of videos) {
  const video = videoFromApiItem({
    id: v.id,
    snippet: {
      channelId: 'eval-ch',
      channelTitle: 'Eval',
      title: v.title,
      publishedAt: collectedAt,
    },
    contentDetails: { duration: 'PT8M' },
    statistics: { viewCount: '200000', likeCount: '2000', commentCount: '100' },
  });
  persistVideoBundle(db, [video], [channel], collectedAt);
}

const keyword = upsertKeyword(db, { keyword: 'AI 업무 자동화' });
const sessionId = createSearchSession(db, {
  route: 'search-by-keyword',
  keywordId: keyword.keywordId,
  query: 'AI 업무 자동화',
  regionCode: 'KR',
  mode: 'initial',
  rawParams: { fixture: true },
});
insertKeywordVideoResults(
  db,
  sessionId,
  keyword.keywordId,
  videos.map((v, i) => ({ videoId: v.id, position: i + 1, raw: '{}' })),
);

const group = ensureFolderGroup(db, { name: 'P1.4 fixture eval' });
const folder = ensureFolder(db, { groupId: group.id, name: '분석용', stage: 'unspecified' });
const candidates = selectCurationCandidates(db, {
  videoIds: videos.map((v) => v.id),
  minGrade: 'Worst',
  limit: 10,
});
insertCuration(db, { folderId: folder.id, stage: 'unspecified', candidates });

const titleCandidates = listAnalysisCandidates(db, { kind: 'title', folderId: folder.id, limit: 10 });
const classifications = [
  { hook: 'vicarious', secondary: 'authority', shapes: ['medium'], tone: 'intimate-conversational' },
  { hook: 'curiosity-gap', secondary: undefined, shapes: ['question-mark'], tone: 'neutral-informational' },
  { hook: 'fear-threat', secondary: undefined, shapes: ['with-number'], tone: 'urgent-alarming' },
];

for (let i = 0; i < titleCandidates.length; i++) {
  const c = titleCandidates[i]!;
  const cl = classifications[i % classifications.length]!;
  saveTitleAnalysis(db, {
    videoId: c.videoId,
    hookPrimary: cl.hook,
    hookSecondary: cl.secondary,
    titleShapes: cl.shapes,
    titleTone: cl.tone,
    reasoning: `fixture eval: ${c.title}`,
    freeTags: [],
  });
}

const thumbCandidates = listAnalysisCandidates(db, { kind: 'thumbnail', folderId: folder.id, limit: 10 });
for (const c of thumbCandidates) {
  saveThumbnailAnalysis(db, {
    videoId: c.videoId,
    visualHierarchy: 'face-dominant',
    textDensity: 'medium',
    faceTreatment: 'expressive-shock',
    feltEmotion: 'shocked',
    alignmentWithTitle: 'aligned',
    alignmentReasoning: 'fixture: title hook matches shocked face',
    reasoning: 'fixture thumbnail classification',
    freeTags: [],
  });
}

const hooks = db
  .prepare(
    `SELECT hook_primary, COUNT(*) AS n FROM youtube_title_analyses GROUP BY hook_primary ORDER BY n DESC`,
  )
  .all();

const emotions = db
  .prepare(
    `SELECT felt_emotion, COUNT(*) AS n FROM youtube_thumbnail_analyses GROUP BY felt_emotion`,
  )
  .all();

db.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      evalDir: process.env.EVAL_DIR,
      dbPath,
      folderId: folder.id,
      titleCount: titleCandidates.length,
      thumbnailCount: thumbCandidates.length,
      hookDistribution: hooks,
      emotionDistribution: emotions,
    },
    null,
    2,
  ),
);
NODE

echo "EVAL_DIR=$EVAL_DIR"
echo "DB=$DB"
