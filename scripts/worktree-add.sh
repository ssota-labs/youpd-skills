#!/usr/bin/env bash
# Create a git worktree and link .env.local from main.
# Usage: pnpm worktree:add <path> [<branch>]
# Example: pnpm worktree:add ../.cursor/worktrees/youpd-skills/my-feature my-feature
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: pnpm worktree:add <path> [<branch>]" >&2
  exit 1
fi

WT_PATH=$1
BRANCH=${2:-}

MAIN=$(git rev-parse --show-toplevel)

if [[ -n "$BRANCH" ]]; then
  git -C "$MAIN" worktree add "$WT_PATH" "$BRANCH"
else
  git -C "$MAIN" worktree add "$WT_PATH"
fi

echo ""
echo "Installing dependencies..."
pnpm --dir "$WT_PATH" install

echo ""
pnpm --dir "$WT_PATH" worktree:env || {
  echo ""
  echo "hint: create $MAIN/.env.local from .env.example on the main clone, then re-run:" >&2
  echo "  pnpm --dir \"$WT_PATH\" worktree:env" >&2
  exit 1
}

echo ""
echo "worktree ready: $WT_PATH"
