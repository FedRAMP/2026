#!/usr/bin/env bash
set -euo pipefail

# Resolve tools/ regardless of the caller's working directory.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "::group::Install Bun dependencies"
bun install --frozen-lockfile
echo "::endgroup::"

echo "::group::Sync rules"
bun run sync
echo "::endgroup::"

echo "::group::Run tests and checks"
bun run check
echo "::endgroup::"

echo "::group::Build enriched site"

# Preserve the existing CI deployment URL.
sed -i \
  's|^site_url = .*|site_url = "https://preview.fedramp.gov/2026/"|' \
  ../zensical.toml

# Start without old HTML that could mask missing build output.
rm -rf ../html

bun run build
echo "::endgroup::"

echo "::group::Verify generated output"
bun run check:site
echo "::endgroup::"
