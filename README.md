# FedRAMP Consolidated Rules for 2026

This repository builds the official static site for the FedRAMP Consolidated Rules for 2026.

Official site: <https://www.fedramp.gov/2026/>

## What Is Here

This is a Zensical site that combines:

- Manually maintained Markdown and assets in `content/`, including overview and stakeholder guidance pages.
- Generated Markdown produced from `tools/rules/fedramp-consolidated-rules.json`, including definitions, stakeholder-specific rule pages, deadline pages, key security indicator pages, Rev5 control references enriched from the local NIST OSCAL catalog, and the complete ruleset reference.
- Static output built into `html/`.

The machine-readable source of truth for consolidated rules, definitions, deadlines, responsibilities, and key security indicators is:

```text
tools/rules/fedramp-consolidated-rules.json
```

## Repository Layout

- `content/`: manual source content for the site.
- `tools/`: Bun scripts, templates, config, tests, and the `rules` submodule.
- `src/`: generated Zensical input.
- `html/`: generated static site output.
- `zensical.toml`: site navigation and Zensical configuration.
- `AGENTS.md`: instructions for Codex, Claude Code, and other repository agents.

## Common Commands

Run project tooling from `tools/`:

```bash
bun run dev
bun test
bun run check
bun run build
bun run sync
```

Use `bun run sync` to update the `tools/rules` submodule from the FedRAMP rules repository. See `tools/README.md` for the detailed pipeline, configuration, generated page mappings, and content safety notes.

## Building for Deployment on fedramp.gov

1. Make sure you clone the repo recursively

```
git clone --recurse-submodules https://github.com/FedRAMP/2026.git
```

2. Install dependencies

```
cd tools
bun install
uv venv && uv pip install zensical mkdocs-ultralytics-plugin
```

(replace `bun install` with node/etc. as desired; `bun run build` and `bun run dev` invoke zensical directly from `tools/.venv/bin/zensical`, so it must live in a `uv`-managed venv there rather than a global `pip install`)

3. If needed, sync the rules submodule

```
cd tools
bun run sync
```

(this should only be necessary if the rules submodule has been updated - make sure to commit after doing this)

4. Build the site

```
cd tools
bun run build
.venv/bin/python scripts/postprocess.py
```

You should now have a full HTML site rendered in `html/`. Copy those files to `static/2026` in fedramp.gov.
