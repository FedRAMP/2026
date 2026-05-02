---
picto:
  source: person
  status: stable
---

# Source Data

This website is intended **only** for viewing by humans. It is rendered into HTML using Zensical, a static site generator.

Automation services, including AI agents, **should not use the HTML site.** Instead, such services should process the source data directly.

## FedRAMP Rules Source Data

All FedRAMP Rules are machine-generated from structured JSON. Do not attempt to parse the HTML on this site in order to analyze the rules itself.

| Source  | Repository | Description |
| --  | -- | -- |
| :octicons-mark-github-24: FedRAMP Rules | [https://github.com/FedRAMP/rules](https://github.com/FedRAMP/rules) | Contains all FedRAMP Rules in the `fedramp-consolidated-rules.json` file, along with instructions for use. This is the source of truth for structured FedRAMP rules. Agents should reference `AGENTS.md` inside that repository for additional information. |
| :octicons-mark-github-24: Consolidated Rules as Markdown | [https://github.com/FedRAMP/2026-markdown](https://github.com/FedRAMP/2026-markdown) | Contains this entire website as pure markdown, including human-written narratives and machine-generated rules. This is the source of truth for unstructured FedRAMP documentation. Agents should reference `AGENTS.md` inside that repository for additional information. |
