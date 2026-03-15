#!/bin/bash
# Block Edit/Write in main working tree — must use a worktree

INPUT=$(cat)

# Extract file_path without jq
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"$//')

# Allow edits to non-code files (memory, settings, config)
if [[ "$FILE_PATH" == *".claude/"* ]] || [[ "$FILE_PATH" == *".claude\\"* ]] || [[ "$FILE_PATH" == *"CLAUDE.md"* ]]; then
  exit 0
fi

# Check if we're in a worktree (git common-dir differs from .git)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [[ "$GIT_COMMON_DIR" != ".git" ]] && [[ "$GIT_COMMON_DIR" != "${GIT_ROOT}/.git" ]]; then
  exit 0  # In a worktree, allow
fi

echo "BLOCKED: Code changes must be made in a git worktree, not the main working tree." >&2
exit 2
