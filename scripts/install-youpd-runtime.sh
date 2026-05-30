#!/usr/bin/env bash
# Install a dev-free youpd-skills runtime via git sparse-checkout.
# Usage:
#   bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills
#   bash scripts/install-youpd-runtime.sh --dir ~/youpd/youpd-skills --cursor-link
set -euo pipefail

REPO_URL="${YOUPD_REPO_URL:-https://github.com/ssota-labs/youpd-skills.git}"
REF="${YOUPD_INSTALL_REF:-main}"
TARGET_DIR=""
CURSOR_LINK=false
LOCAL_SOURCE=false

usage() {
  sed -n '2,8p' "$0"
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) TARGET_DIR="${2:?}"; shift 2 ;;
    --ref) REF="${2:?}"; shift 2 ;;
    --cursor-link) CURSOR_LINK=true; shift ;;
    --local) LOCAL_SOURCE=true; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown arg: $1" >&2; usage 1 ;;
  esac
done

if [[ -z "$TARGET_DIR" ]]; then
  echo "Missing --dir <path>" >&2
  usage 1
fi

TARGET_DIR="$(cd "$(dirname "$TARGET_DIR")" 2>/dev/null && pwd)/$(basename "$TARGET_DIR")" || TARGET_DIR="$(realpath -m "$TARGET_DIR")"

SCRIPT_ROOT=""
MANIFEST_PATH=""
if [[ -f "${BASH_SOURCE[0]}" ]]; then
  SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [[ -f "$SCRIPT_ROOT/distribution/runtime-manifest.json" ]]; then
    MANIFEST_PATH="$SCRIPT_ROOT/distribution/runtime-manifest.json"
  fi
fi

install_from_local_source() {
  [[ -n "$SCRIPT_ROOT" && -f "$SCRIPT_ROOT/package.json" ]] || {
    echo "Cannot use --local: run from youpd-skills repo" >&2
    exit 1
  }
  echo "Copying runtime files from $SCRIPT_ROOT to $TARGET_DIR"
  mkdir -p "$TARGET_DIR"
  mapfile -t SPARSE_PATHS < <(sparse_paths_from_manifest)
  for rel in "${SPARSE_PATHS[@]}"; do
    [[ -e "$SCRIPT_ROOT/$rel" ]] || continue
    mkdir -p "$TARGET_DIR/$(dirname "$rel")"
    if [[ -d "$SCRIPT_ROOT/$rel" ]]; then
      rm -rf "$TARGET_DIR/$rel"
      cp -R "$SCRIPT_ROOT/$rel" "$TARGET_DIR/$rel"
    else
      cp "$SCRIPT_ROOT/$rel" "$TARGET_DIR/$rel"
    fi
  done
}

sparse_paths_from_manifest() {
  if [[ -n "$MANIFEST_PATH" ]] && command -v node >/dev/null 2>&1; then
    node -e "
      const m = require('$MANIFEST_PATH');
      for (const p of m.sparseCheckout) console.log(p);
    "
    return
  fi
  printf '%s\n' \
    package.json pnpm-lock.yaml tsconfig.json .env.example \
    skills/youpd-skills .cursor-plugin distribution \
    scripts/install-youpd-runtime.sh scripts/install-youpd-project.sh
}

mkdir -p "$(dirname "$TARGET_DIR")"

if [[ "$LOCAL_SOURCE" == true ]]; then
  install_from_local_source
elif [[ -d "$TARGET_DIR/.git" ]]; then
  echo "Updating existing runtime at $TARGET_DIR"
  git -C "$TARGET_DIR" fetch origin "$REF" --depth 1 2>/dev/null || git -C "$TARGET_DIR" fetch origin "$REF"
  git -C "$TARGET_DIR" checkout "$REF" 2>/dev/null || git -C "$TARGET_DIR" pull --ff-only
  mapfile -t SPARSE_PATHS < <(sparse_paths_from_manifest)
  git -C "$TARGET_DIR" sparse-checkout set "${SPARSE_PATHS[@]}"
else
  echo "Cloning sparse runtime to $TARGET_DIR (ref=$REF)"
  git clone --filter=blob:none --sparse --depth 1 --branch "$REF" "$REPO_URL" "$TARGET_DIR" 2>/dev/null \
    || git clone --filter=blob:none --sparse --branch "$REF" "$REPO_URL" "$TARGET_DIR" 2>/dev/null \
    || git clone --filter=blob:none --sparse "$REPO_URL" "$TARGET_DIR"
  mapfile -t SPARSE_PATHS < <(sparse_paths_from_manifest)
  git -C "$TARGET_DIR" sparse-checkout set "${SPARSE_PATHS[@]}"
fi

README_SRC="$TARGET_DIR/distribution/README.runtime.md"
if [[ -f "$README_SRC" ]]; then
  cp "$README_SRC" "$TARGET_DIR/README.md"
fi

if command -v pnpm >/dev/null 2>&1; then
  (cd "$TARGET_DIR" && pnpm install)
else
  echo "WARN: pnpm not found; run 'pnpm install' inside $TARGET_DIR" >&2
fi

if [[ "$CURSOR_LINK" == true ]]; then
  PLUGIN_DIR="${HOME}/.cursor/plugins/local/youpd-skills"
  mkdir -p "$(dirname "$PLUGIN_DIR")"
  ln -sfn "$TARGET_DIR" "$PLUGIN_DIR"
  echo "Cursor local plugin: $PLUGIN_DIR -> $TARGET_DIR"
  echo "Ensure .cursor-plugin/plugin.json exists; reload Cursor window."
fi

echo "Runtime ready: $TARGET_DIR"
echo "Next: bash scripts/install-youpd-project.sh --dir <channel> --id <id> --toolkit $TARGET_DIR"
