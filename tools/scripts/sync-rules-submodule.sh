#!/usr/bin/env bash

set -euo pipefail

readonly RULES_PATH="rules"
readonly RULES_MODULE="fedramp-rules"
readonly RULES_BRANCH="pwx"

git submodule sync --recursive "${RULES_PATH}"
git config "submodule.${RULES_MODULE}.branch" "${RULES_BRANCH}"
git submodule update --init --remote --depth 1 --checkout "${RULES_PATH}"
git -C "${RULES_PATH}" checkout -B "${RULES_BRANCH}" "origin/${RULES_BRANCH}"

# Keep the submodule working tree focused on the upstream artifacts this repo consumes.
git -C "${RULES_PATH}" sparse-checkout init --no-cone
git -C "${RULES_PATH}" sparse-checkout set --no-cone \
  /fedramp-consolidated-rules.json \
  /schemas/fedramp-consolidated-rules.schema.json
