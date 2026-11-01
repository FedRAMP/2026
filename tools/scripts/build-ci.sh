#!/usr/bin/env bash
set -euo pipefail

# Resolve tools/ regardless of the caller's working directory.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "::group::Install Bun dependencies"
bun install --frozen-lockfile
echo "::endgroup::"

echo "::group::Sync rules"
# CI deliberately builds the latest upstream main, not the recorded gitlink.
bun run sync
echo "::endgroup::"

echo "::group::Clear previous build output"

# Start without old HTML that could mask missing build output.
rm -rf ../html

echo "::endgroup::"

echo "::group::Build site and run tests and checks"
# The integration test in bun run check runs the full build and verifies its
# output. Keep that tested artifact for upload instead of rebuilding afterward.
bun run check
echo "::endgroup::"

echo "::group::Verify generated output"
bun run check:site
echo "::endgroup::"
