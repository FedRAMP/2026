# AGENTS.md

Instructions for Codex, Claude Code, and other agents working in this repository.

This repository builds the Zensical static site for the FedRAMP Consolidated Rules for 2026 preview. The public preview is published at:

```text
https://preview.fedramp.gov/2026
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

## TypeScript Quality

Treat TypeScript diagnostics in `tools/scripts/**/*.ts` as real problems even when the Bun scripts appear to run correctly. These scripts are Bun/Node programs, and `tools/tsconfig.json` must continue to declare the Bun type environment so imports such as `node:fs/promises`, `process`, `console`, `NodeJS`, and `import.meta.main` are checked consistently by both CLI tooling and editors.

When changing TypeScript tooling or script types, run from `tools/`:

```bash
bunx tsc -p tsconfig.json --noEmit
```

If the change could affect generated content, also run a build before and after the change, or otherwise compare the generated `src/` tree, and confirm that any `src/` changes are intentional.

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

## Public Branch Changelog Workflow

When the user asks for a changelog, branch changelog, public change summary, or a summary of all changes on the current branch, follow this workflow. The goal is a public-facing Markdown changelog for people who need to understand what changed without reading code.

This workflow is based on the same practical principles as [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), [Digital.gov plain-language guidance](https://digital.gov/resources/plain-language-web-writing-tips/), and common release-note guidance such as [ProductPlan's release notes best practices](https://www.productplan.com/learn/release-notes-best-practices/): write for humans, group related changes, keep entries short, use plain language, include useful links, and avoid commit-log noise.

### Scope

- Summarize changes in this repository only.
- Ignore changes inside `tools/rules/**`. Do not inspect or summarize the rules submodule contents when producing a changelog.
- Do not summarize `src/` or `html/` as independent source changes. They are generated artifacts. Use them only to verify built pages, generated output, and example URLs.
- Treat `content/` as human-written source content. Summarize changed public narrative pages in `content/` with extra care.
- Treat `zensical.toml` as the main source for site navigation and structure.
- Treat `tools/config.json`, `tools/templates/**`, and `tools/scripts/build-markdown.ts` as the primary sources for generated page content and page presentation changes.
- Treat tests, package files, dev scripts, and supporting tool scripts as tooling changes. These should be summarized briefly and should not dominate the changelog.

### Determine the Branch Diff

1. Check the current branch and working tree:

   ```bash
   git branch --show-current
   git status --short
   ```

2. Determine the default branch using the local origin HEAD when available, usually `main`:

   ```bash
   git symbolic-ref --short refs/remotes/origin/HEAD
   ```

3. Find the branch point and review changes from that point:

   ```bash
   git merge-base HEAD origin/main
   git diff --name-status <merge-base>...HEAD -- . ':(exclude)tools/rules/**'
   git diff --stat <merge-base>...HEAD -- . ':(exclude)tools/rules/**'
   git log --oneline <merge-base>..HEAD -- . ':(exclude)tools/rules/**'
   ```

4. If the default branch is not `main`, replace `origin/main` with the actual default branch.

5. If uncommitted or untracked changes are present and the user asked about the current branch generally, include them in the review unless they are clearly unrelated. If that would materially change the public changelog, ask whether to include uncommitted work before generating the final changelog.

6. If network access is available and freshness matters, run `git fetch origin` before determining the merge base. If network access is blocked, continue with local refs and do not mention this inside the changelog unless it affects correctness.

### Classify Changes

Review the diff by category, in this order:

1. Human-written public content:
   - Files under `content/**`, especially Markdown pages.
   - For each changed Markdown file, identify the public-facing meaning of the change.
   - Summarize each changed narrative file in no more than 2-3 sentences.
   - Link the page title to the built public URL.
   - If a change is only metadata, spelling, or formatting and does not change public meaning, say that briefly.

2. Site structure:
   - Changes to `zensical.toml`, navigation, page placement, page titles, section names, or new/removed pages.
   - Summarize simply and link to new or moved public URLs when appropriate.
   - Mention removed or renamed pages only when useful to public readers.

3. Generated page experience:
   - Changes caused by `tools/config.json`, `tools/templates/**`, `tools/templates/partials/**`, `tools/scripts/build-markdown.ts`, or related generation code that affect how generated Markdown pages read or render.
   - Describe the overall change in the generated pages, not the implementation.
   - If examples help, include no more than one or two example links and label them as examples.
   - Good examples: workflow diagrams added to generated rule pages; new page status callouts; revised definitions layout; improved deadline tables.

4. Tooling:
   - Changes to tests, dev server behavior, build scripts, type checking, package files, or repository automation.
   - Keep this very brief. Combine related changes into one bullet when possible.
   - Use plain summaries such as "Improved build checks for generated Markdown" or "Updated tests for page metadata validation."

### Public URL Mapping

Use `site_url` from `zensical.toml` as the URL base. At the time of writing, it is:

```text
https://preview.fedramp.gov/2026/
```

Map Markdown paths to built URLs this way:

- `content/index.md` or `src/index.md` -> `https://preview.fedramp.gov/2026/`
- `content/foo.md` or `src/foo.md` -> `https://preview.fedramp.gov/2026/foo/`
- `content/foo/index.md` or `src/foo/index.md` -> `https://preview.fedramp.gov/2026/foo/`
- `content/foo/bar.md` or `src/foo/bar.md` -> `https://preview.fedramp.gov/2026/foo/bar/`

For generated pages, derive the Markdown output path from `tools/config.json`, `src/.generated-markdown.json` if present, or the built `src/` tree. For navigation-only changes, derive paths from `zensical.toml`.

### Writing Style

- Write for public readers, not maintainers.
- Use simple, direct language and active voice.
- Prefer concrete verbs: Added, Updated, Clarified, Moved, Removed, Renamed, Improved.
- Explain what changed and, when useful, what readers can now find or do.
- Avoid implementation details, commit hashes, internal file paths, and jargon unless they are the clearest way to describe a tooling-only change.
- Avoid vague entries like "miscellaneous updates," "various fixes," or "improvements." If the change is too small to explain, group it with similar small changes.
- Do not editorialize. Avoid opinions, hype, and unnecessary qualifiers such as "significant" unless the diff clearly supports them.
- Keep bullets short. Most entries should be one sentence; use two sentences only when needed for clarity.

### Output Format

When generating the changelog itself, output only a fenced Markdown block so the user can review and copy it. Do not add commentary before or after the fence unless the user asks for it.

Use this structure and omit empty sections:

````markdown
```markdown
## Branch Changelog

### Content Updates

- [Page Title](https://preview.fedramp.gov/2026/path/): Updated the page to clarify ...

### Site Structure

- Added [New Page Title](https://preview.fedramp.gov/2026/path/) to the provider guidance navigation.

### Generated Page Experience

- Added workflow diagram support to generated rule pages. Examples: [Example Page](https://preview.fedramp.gov/2026/path/) and [Second Example](https://preview.fedramp.gov/2026/path/).

### Tooling

- Improved tests for generated Markdown validation.
```
````

For very large branches, keep the same sections but consolidate aggressively. Public content changes still need per-file coverage, but tooling and generated-output implementation details should be grouped into a few readable bullets.

## Agent Reading Strategy

For repository orientation, read `README.md`, then `tools/README.md`, then this file.

For factual rule questions, inspect `tools/rules/fedramp-consolidated-rules.json` directly before relying on rendered Markdown.

For site navigation and page placement, inspect `zensical.toml` and `tools/config.json`.

For a flat rendered Markdown corpus, prefer the sister repository at `https://github.com/FedRAMP/2026-markdown`.
