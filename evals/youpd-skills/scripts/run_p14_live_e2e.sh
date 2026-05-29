#!/usr/bin/env bash
# P1.4 live skill-eval harness: P1.1 collect → P1.2 curate → P1.4 classify → aggregate.
# Requires YOUTUBE_API_KEY in .env.local or environment.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
  echo '{"ok":false,"error":"missing_api_key","message":"YOUTUBE_API_KEY not set; add .env.local"}' >&2
  exit 2
fi

EVAL_DIR=$(mktemp -d "${TMPDIR:-/tmp}/youpd-p14-eval-XXXXXX")
DB="$EVAL_DIR/workspace.db"
export YOUPD_WORKSPACE_DB="$DB"
LOG="$EVAL_DIR/transcript.log"

exec > >(tee -a "$LOG") 2>&1

echo "== P1.4 live E2E =="
echo "DB=$DB"

run_json() {
  local label=$1
  shift
  echo "" >&2
  echo ">> $label" >&2
  local out
  out=$(pnpm tsx "$@" 2>&1 | tail -1)
  printf '%s\n' "$out" > "$EVAL_DIR/last.json"
  printf '%s\n' "$out"
}

run_json "init" skills/youpd-skills/scripts/workspace/init.ts --db "$DB" --label p14-eval

KW_JSON=$(run_json "add-keyword" skills/youpd-skills/scripts/research/youtube/add-keyword.ts --db "$DB" --keyword "AI 업무 자동화")
KEYWORD_ID=$(node -e "const j=JSON.parse(process.argv[1]);console.log(j.result.keywordId)" "$KW_JSON")

run_json "search-by-keyword" skills/youpd-skills/scripts/research/youtube/search-by-keyword.ts \
  --db "$DB" --keyword-id "$KEYWORD_ID" --region KR

SESSION_ID=$(node -e "
const fs=require('fs');
const lines=fs.readFileSync('$EVAL_DIR/last.json','utf8').trim().split('\n');
const j=JSON.parse(lines[lines.length-1]);
console.log(j.result.sessionId);
")

FOLDER_JSON=$(run_json "create-reference-folder" skills/youpd-skills/scripts/research/youtube/create-reference-folder.ts \
  --db "$DB" --group-name "P1.4 eval" --folder "분석용")

FOLDER_ID=$(node -e "const j=JSON.parse(process.argv[1]);console.log(j.result.folderIds[0])" "$FOLDER_JSON")

run_json "curate-references" skills/youpd-skills/scripts/research/youtube/curate-references.ts \
  --db "$DB" --folder-id "$FOLDER_ID" --search-session-id "$SESSION_ID" --limit 5 --min-grade Good

CAND_JSON=$(run_json "list-analysis-candidates" skills/youpd-skills/scripts/research/youtube/list-analysis-candidates.ts \
  --db "$DB" --kind title --folder-id "$FOLDER_ID" --limit 5)

export CAND_JSON DB EVAL_DIR
node <<'NODE'
const fs = require('fs');
const { spawnSync } = require('child_process');

const cand = JSON.parse(process.env.CAND_JSON);
const db = process.env.DB;
const evalDir = process.env.EVAL_DIR;
const items = cand.result?.candidates ?? [];
const saves = [];

for (const c of items.slice(0, 3)) {
  const hooks = [
    ['curiosity-gap', null, 'question-mark', 'neutral-informational'],
    ['vicarious', 'authority', 'medium', 'intimate-conversational'],
    ['bold-claim', null, 'caps-emphasis', 'urgent-alarming'],
  ][saves.length % 3];
  const args = [
    'tsx',
    'skills/youpd-skills/scripts/research/youtube/save-title-analysis.ts',
    '--db', db,
    '--video-id', c.videoId,
    '--hook-primary', hooks[0],
    '--title-tone', hooks[3],
    '--title-shape', hooks[2],
    '--reasoning', `eval harness classification for: ${c.title.slice(0, 40)}`,
  ];
  if (hooks[1]) args.push('--hook-secondary', hooks[1]);
  const r = spawnSync('pnpm', args, { encoding: 'utf8', cwd: process.cwd() });
  const line = (r.stdout || '').trim().split('\n').pop();
  saves.push({ videoId: c.videoId, stdout: line, status: r.status });
}

fs.writeFileSync(`${evalDir}/title-saves.json`, JSON.stringify(saves, null, 2));
console.log(JSON.stringify({ saved: saves.length, items: items.length }));
NODE

run_json "hook distribution" skills/youpd-skills/scripts/db/exec.ts \
  --db "$DB" \
  --sql "SELECT hook_primary, COUNT(*) AS n FROM youtube_title_analyses GROUP BY hook_primary ORDER BY n DESC"

echo ""
echo "EVAL_DIR=$EVAL_DIR"
echo "TRANSCRIPT=$LOG"
