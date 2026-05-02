# CR26 Web Site

This repository is a public preview of the Consolidated Rules 2026 work and is under extremely active development. Content, structure, source material, and implementation details may change frequently and without notice, so please treat everything here as provisional rather than final guidance.

## What This Is

This repo builds a Zensical static site for previewing FedRAMP Consolidated Rules for 2026 materials. It combines manually edited site content with Markdown generated from the machine-readable consolidated rules JSON.

The rough flow is:

1. Manual Markdown and assets live in `content/`.
2. Tooling in `tools/` copies that content into generated site input under `src/`.
3. `tools/rules/fedramp-consolidated-rules.json` is processed through Handlebars templates according to `tools/config.json`.
4. Generated Markdown is added to `src/`.
5. Zensical builds the static site into `html/`.

## Important Directories

- `content/`: manually maintained source content. These files should be preserved and not overwritten by scripts.
- `tools/`: Bun scripts, templates, configuration, and tests for the build pipeline.
- `tools/rules/`: Git submodule containing the FedRAMP rules source data.
- `src/`: generated Zensical input. This directory is rebuilt by the tools.
- `html/`: generated static site output.
- `zensical.toml`: Zensical site configuration and navigation.

## Page Pictographs

Every manually edited Markdown page should declare one source and one status in frontmatter. The build copies `content/` into `src/`, reads this `picto` frontmatter, and inserts the rendered `picto` span below the frontmatter before the first heading.

Ready-to-copy frontmatter for manually edited pages:

```markdown
---
picto:
  source: person
  status: stable
---

---
picto:
  source: person
  status: placeholder
---

---
picto:
  source: person
  status: empty
---
```

Generated or machine-sourced pages use `source: machine`:

```markdown
picto:
  source: machine
  status: stable
```

Source values:

```markdown
person
machine
```

Status values:

```markdown
stable
placeholder
empty
```

## Common Commands

Run these from `tools/`:

```bash
bun run dev
bun test
bun run build
```

`bun run dev` starts a local preview, `bun test` verifies the tooling pipeline, and `bun run build` produces the static site in `html/`.

See `tools/README.md` for more detail on the config-driven generation pipeline.
