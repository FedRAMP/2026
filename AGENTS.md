# AGENTS.md

This repository builds a Zensical static site for the FedRAMP Consolidated Rules for 2026 preview.

## Project Shape

- `content/` contains manually edited Markdown and assets. Treat it as source content.
- `tools/` contains Bun scripts, Handlebars templates, and the `rules` submodule used to generate additional Markdown.
- `tools/config.json` is the shared configuration for tool paths and generated Markdown mappings.
- `src/` is generated site input. The deploy step clears it, copies `content/` into it, then generated Markdown is added.
- `html/` is generated static output from Zensical.
- `zensical.toml` configures the site and points Zensical at `src/`.

## Content Safety

Do not modify anything in `content/` without explicit permission from the user. If a task appears to require editing manual content, stop and ask first.

Scripts should also avoid writing to `content/`. Generated Markdown belongs in `src/`. Generated mappings must not shadow copied `content/` files; the generator should throw if a configured output already exists under `content/`.

## Pipeline

- `bun run dev` starts the local development pipeline and Zensical preview.
- `bun test` verifies the tool pipeline.
- `bun run build` copies manual content, generates configured Markdown, and builds the static site.

When adding generated pages, prefer updating `tools/config.json` and the Handlebars templates over hardcoding output paths in scripts.
