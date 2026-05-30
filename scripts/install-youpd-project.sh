#!/usr/bin/env bash
# Create a channel workspace (no dev repo files): .youpd/project.json + docs/channel-brief.md
# Usage:
#   bash scripts/install-youpd-project.sh \
#     --dir ~/youpd/senior-cafe-tv \
#     --id senior-cafe-tv \
#     --name "Senior Cafe TV" \
#     --one-liner "시니어와 4050 자녀를 위한 유튜브" \
#     --toolkit ~/youpd/youpd-skills
set -euo pipefail

CHANNEL_DIR=""
PROJECT_ID=""
DISPLAY_NAME=""
ONE_LINER=""
TOOLKIT_PATH=""
AUDIENCES=""

usage() { sed -n '2,6p' "$0"; exit "${1:-0}"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) CHANNEL_DIR="${2:?}"; shift 2 ;;
    --id) PROJECT_ID="${2:?}"; shift 2 ;;
    --name) DISPLAY_NAME="${2:?}"; shift 2 ;;
    --one-liner) ONE_LINER="${2:?}"; shift 2 ;;
    --toolkit) TOOLKIT_PATH="${2:?}"; shift 2 ;;
    --audiences) AUDIENCES="${2:?}"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown: $1" >&2; usage 1 ;;
  esac
done

[[ -n "$CHANNEL_DIR" && -n "$PROJECT_ID" && -n "$ONE_LINER" && -n "$TOOLKIT_PATH" ]] || {
  echo "Required: --dir --id --one-liner --toolkit (and --name recommended)" >&2
  usage 1
}

DISPLAY_NAME="${DISPLAY_NAME:-$PROJECT_ID}"
TOOLKIT_PATH="$(cd "$TOOLKIT_PATH" && pwd)"
CHANNEL_DIR="$(mkdir -p "$CHANNEL_DIR" && cd "$CHANNEL_DIR" && pwd)"
WORKSPACE_DB="${CHANNEL_DIR}/.youpd/workspace.db"

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TPL="${SCRIPT_ROOT}/distribution/templates/channel-brief.md.tpl"
[[ -f "$TPL" ]] || TPL="${TOOLKIT_PATH}/distribution/templates/channel-brief.md.tpl"

mkdir -p "${CHANNEL_DIR}/.youpd" "${CHANNEL_DIR}/docs"

if [[ -n "$AUDIENCES" ]]; then
  IFS=',' read -ra AUD_ARR <<< "$AUDIENCES"
  AUDIENCES_MD=""
  for a in "${AUD_ARR[@]}"; do
    AUDIENCES_MD="${AUDIENCES_MD}"$'\n'"- $(echo "$a" | xargs)"
  done
else
  AUDIENCES_MD=$'\n'"- (팀이 채움)"
fi

PROJECT_JSON="${CHANNEL_DIR}/.youpd/project.json"
node -e "
const fs = require('fs');
const doc = {
  id: process.argv[1],
  displayName: process.argv[2],
  channel: {
    oneLiner: process.argv[3],
    audiences: process.argv[4] ? process.argv[4].split(',').map(s => s.trim()).filter(Boolean) : [],
    platforms: ['youtube-long'],
  },
  toolkit: { path: process.argv[5] },
  workspace: { dbPath: './.youpd/workspace.db' },
};
fs.writeFileSync(process.argv[6], JSON.stringify(doc, null, 2) + '\n');
" "$PROJECT_ID" "$DISPLAY_NAME" "$ONE_LINER" "$AUDIENCES" "$TOOLKIT_PATH" "$PROJECT_JSON"

if [[ -f "$TPL" ]]; then
  node -e "
const fs = require('fs');
const vars = {
  PROJECT_ID: process.argv[1],
  DISPLAY_NAME: process.argv[2],
  CHANNEL_ONE_LINER: process.argv[3],
  TOOLKIT_PATH: process.argv[4],
  WORKSPACE_DB: process.argv[5],
  AUDIENCES_MD: process.argv[6],
};
let s = fs.readFileSync(process.argv[7], 'utf8');
for (const [k, v] of Object.entries(vars)) {
  s = s.split('\${' + k + '}').join(v);
}
fs.writeFileSync(process.argv[8], s);
" "$PROJECT_ID" "$DISPLAY_NAME" "$ONE_LINER" "$TOOLKIT_PATH" "$WORKSPACE_DB" "$AUDIENCES_MD" \
    "$TPL" "${CHANNEL_DIR}/docs/channel-brief.md"
else
  printf '%s\n\n%s\n' "# Channel brief — ${PROJECT_ID}" "${ONE_LINER}" > "${CHANNEL_DIR}/docs/channel-brief.md"
fi

echo "Channel workspace: $CHANNEL_DIR"
echo "  .youpd/project.json"
echo "  docs/channel-brief.md"
echo ""
echo "Init DB:"
echo "  cd \"$TOOLKIT_PATH\" && YOUPD_WORKSPACE_DB=\"$WORKSPACE_DB\" pnpm tsx skills/youpd-skills/scripts/workspace/init.ts --label \"$PROJECT_ID\""
echo ""
echo "Open in Cursor: $CHANNEL_DIR (not the toolkit repo)"
