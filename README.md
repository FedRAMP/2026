# FedRAMP 2026 Preview Site

This repository builds the static site for the FedRAMP Consolidated Rules for 2026 preview.

Preview site: <https://preview.fedramp.gov/2026>

The content and implementation are under active development. Treat this repository as provisional preview material, not final FedRAMP guidance.

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
