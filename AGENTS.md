# Repository instructions

This repository builds the Zensical site for the official FedRAMP Consolidated Rules for 2026:

<https://fedramp.gov/2026/>

Treat the machine-readable rules data as the canonical source for official 2026 rules content, and treat generated Markdown and static output as downstream renderings.

## Keep these instructions useful

- Keep `AGENTS.md` focused on durable, repository-wide rules. Do not add one-off task details or generic advice.
- Put repeatable, multi-step workflows in scripts or repo-local skills when they outgrow a short instruction here. Keep only the trigger and essential constraints in this file.
- Add guidance when a real problem repeats. Remove stale or duplicate guidance when commands, paths, or workflows change.
- Use a nested `AGENTS.md` only when a subtree needs different rules. Instructions closest to a file take precedence.
- Keep instructions provider-neutral unless a tool-specific distinction matters.

## Start here

After reading this file, use `README.md` for repository orientation and `tools/README.md` for the build and generation pipeline.

For questions about FedRAMP rules, definitions, deadlines, responsibilities, key security indicators, certification types, or affected parties, start with:

```text
tools/rules/fedramp-consolidated-rules.json
```

This JSON file is the machine-readable source of truth. Generated Markdown in `src/` and static output in `html/` are downstream renderings. Manual pages in `content/` can add context but are not canonical rule data.

For NIST SP 800-53 Revision 5 control titles, statements, family names, and organization-assigned parameter metadata, use the vendored OSCAL catalog at:

```text
tools/data/NIST_SP-800-53_rev5_catalog.xml
```

Builds, tests, and agents must use this local catalog instead of downloading OSCAL content at runtime. Its pinned upstream release and checksum are documented in `tools/data/README.md`; update the local file and provenance together when intentionally moving to a newer official NIST release.

The sister repository at <https://github.com/FedRAMP/2026-markdown> contains the rendered Markdown as a flat corpus. Change this repository for site or pipeline work; use the sister repository when only the corpus matters.

## Repository map

- `content/`: protected, manually maintained Markdown and assets.
- `tools/`: Bun scripts, tests, templates, shared configuration, and the `rules` submodule.
- `tools/data/`: vendored external source data used by the generator, including the NIST OSCAL catalog.
- `tools/config.json`: shared paths and generated Markdown mappings.
- `tools/rules/fedramp-consolidated-rules.json`: canonical rules data.
- `src/`: generated Zensical input. Builds clear and recreate it.
- `html/`: generated static site output.
- `zensical.toml`: site configuration and navigation.

## Content and generated files

- Do not modify `content/` without explicit user permission. If a task appears to require a manual content edit, stop and ask.
- Scripts must not write to `content/`. Generated Markdown belongs in `src/`.
- Do not hand-edit `src/` or `html/`. Change the relevant source, configuration, template, or script and rebuild.
- Generated mappings must not shadow files copied from `content/`; the generator should fail on a collision.
- Preserve unrelated user changes in a dirty worktree.

## Commands and verification

Run project tooling from `tools/`, which owns `package.json`:

```bash
bun run dev
bun test
bun run check
bun run build
bun run sync
bunx tsc -p tsconfig.json --noEmit
```

- `bun run dev`: start the local generation pipeline and Zensical development server.
- `bun test`: test the rules source, generation pipeline, and built output.
- `bun run check`: run tests, TypeScript checks, and non-failing content style warnings.
- `bun run build`: regenerate `src/` and build `html/`.
- `bun run sync`: update the `tools/rules` submodule.
- `bunx tsc -p tsconfig.json --noEmit`: type-check the Bun and Node scripts.

Generic read-only commands such as `git`, `rg`, and `sed` may run from the repository root.

Treat TypeScript diagnostics in `tools/scripts/**/*.ts` as real failures even when Bun can execute the script. Keep the Bun type environment declared in `tools/tsconfig.json`.

When a change can affect generated content, run a build and inspect the resulting `src/` changes. Before handoff, run the checks relevant to the files changed and report anything you could not run.

The tracked `.githooks/pre-commit` hook runs `bun run check` from `tools/`. Enable it with:

```bash
git config core.hooksPath .githooks
```

## Generation rules

Prefer configuration and templates over hardcoded output paths or filters:

- `tools/config.json`
- `tools/scripts/build-markdown.ts`
- `tools/templates/template.hbs`
- `tools/templates/reference-index.hbs` for the complete ruleset index
- `tools/templates/partials/`

Generated definitions must remain one alphabetical list of `##` term headings. Definitions with a `tag` also appear in the **Important Related Terms** table, and each definition links back to its table row. Keep this behavior aligned across the generator, main template, and `tools/templates/partials/definition.hbs`.

## Required workflow

When the user asks for a changelog, branch changelog, public change summary, or summary of all changes on the current branch, use `$public-branch-changelog` from `.agents/skills/public-branch-changelog/SKILL.md`.

This workflow is mandatory for those requests. Agents without skill support should read that file and follow it directly.
