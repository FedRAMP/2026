#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly TOOLS_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly REPO_ROOT="$(git -C "${TOOLS_DIR}" rev-parse --show-toplevel)"
readonly RULES_PATH="tools/rules"
readonly RULES_WORKTREE="${REPO_ROOT}/${RULES_PATH}"
readonly RULES_MODULE="tools/rules"
readonly RULES_BRANCH="pwx"

git -C "${REPO_ROOT}" submodule sync --recursive "${RULES_PATH}"
git -C "${REPO_ROOT}" config --remove-section "submodule.fedramp-rules" 2>/dev/null || true
git -C "${REPO_ROOT}" config "submodule.${RULES_MODULE}.branch" "${RULES_BRANCH}"
git -C "${REPO_ROOT}" submodule update --init --depth 1 --remote --checkout "${RULES_PATH}"
git -C "${RULES_WORKTREE}" remote set-branches origin "${RULES_BRANCH}"
git -C "${RULES_WORKTREE}" fetch --depth 1 origin \
  "+refs/heads/${RULES_BRANCH}:refs/remotes/origin/${RULES_BRANCH}"
git -C "${RULES_WORKTREE}" checkout -B "${RULES_BRANCH}" "origin/${RULES_BRANCH}"

# Keep the submodule working tree focused on the upstream artifacts this repo consumes.
git -C "${RULES_WORKTREE}" sparse-checkout init --no-cone
git -C "${RULES_WORKTREE}" sparse-checkout set --no-cone \
  /fedramp-consolidated-rules.json \
  /schemas/fedramp-consolidated-rules.schema.json
