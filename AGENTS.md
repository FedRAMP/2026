# AGENTS.md

Instructions for Codex, Claude Code, and other agents working in this repository.

This repository builds the Zensical static site for the FedRAMP Consolidated Rules for 2026 preview. The public preview is published at:

```text
https://fedramp.gov/preview/2026
```

## Source Of Truth

For questions about FedRAMP rules, definitions, deadlines, responsibilities, key security indicators, certification types, or affected parties, start with:

```text
tools/rules/fedramp-consolidated-rules.json
```

That JSON is the machine-readable source of truth used to generate the site. Generated Markdown in `src/` and static output in `html/` are downstream renderings. Manual pages in `content/` may provide useful context, but they are not the canonical source for rule data.

There is also a sister repository for agent and corpus workflows:

```text
https://github.com/FedRAMP/2026-markdown
```

That repository contains the rendered Markdown files collected together for systems that need a flat Markdown corpus. Use this repository when changing the site pipeline; use the sister repository when you only need the rendered Markdown corpus.

## Repository Shape

- `content/`: manually edited Markdown and assets. Treat this as protected source content.
- `tools/`: Bun scripts, Handlebars templates, tests, configuration, and the `rules` submodule.
- `tools/config.json`: shared path configuration and generated Markdown mappings.
- `tools/rules/fedramp-consolidated-rules.json`: canonical rules data for generated content.
- `src/`: generated Zensical input. The build clears and recreates this directory.
- `html/`: generated static output from Zensical.
- `zensical.toml`: Zensical site configuration and navigation.

## Content Safety

Do not modify anything in `content/` without explicit user permission.

Scripts should not write to `content/`. Generated Markdown belongs in `src/`. Generated mappings must not shadow copied `content/` files; the generator should throw if a configured output already exists under `content/`.

When a task appears to require changing manual source content, stop and ask before editing.

## Working Rules

Run project tooling from `tools/`, not from the repository root. The root does not have a `package.json`; `tools/package.json` owns the Bun scripts and dependencies.

Use `tools/` as the working directory for:

```bash
bun test
bun run build
bun run dev
bun run sync
bun run check
bunx tsc -p tsconfig.json --noEmit
```

It is fine to inspect the repository from the root with generic read-only commands such as `git`, `rg`, `find`, and `sed`.

## Common Commands

- `bun run dev`: starts the local development pipeline and Zensical preview.
- `bun test`: verifies the tool pipeline.
- `bun run check`: runs `bun test` and TypeScript checking.
- `bun run build`: copies manual content, generates configured Markdown, builds `src/todo.md`, and builds the static site.
- `bun run sync`: syncs the `tools/rules` submodule from `FedRAMP/rules`.

The tracked `.githooks/pre-commit` hook runs `bun run check` from `tools/`. Enable it in a clone with:

```bash
git config core.hooksPath .githooks
```

## Generation Guidance

When adding or changing generated pages, prefer updating `tools/config.json` and the Handlebars templates in `tools/templates/`. Avoid hardcoding output paths or rule filters in scripts unless the existing configuration model cannot express the change.

Before changing generated output behavior, inspect:

- `tools/config.json`
- `tools/scripts/build-markdown.ts`
- `tools/templates/template.hbs`
- `tools/templates/partials/`
- `tools/rules/fedramp-consolidated-rules.json`

Keep `src/` and `html/` in mind as generated artifacts. If they change after a build, verify that the change follows from `content/`, `tools/config.json`, templates, scripts, or the rules JSON.

## Agent Reading Strategy

For repository orientation, read `README.md`, then `tools/README.md`, then this file.

For factual rule questions, inspect `tools/rules/fedramp-consolidated-rules.json` directly before relying on rendered Markdown.

For site navigation and page placement, inspect `zensical.toml` and `tools/config.json`.

For a flat rendered Markdown corpus, prefer the sister repository at `https://github.com/FedRAMP/2026-markdown`.
