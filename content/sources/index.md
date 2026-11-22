---
tags:
  - Guidance
hide:
  - toc
picto:
  source: person
---

# Source Data

This website is intended **only** for viewing by humans. It is rendered into HTML using Zensical, a static site generator.

Automation services, including AI agents, **should not use the HTML site.** Instead, such services should process the source data directly.

## FedRAMP Rules Source Data

All FedRAMP rules are machine-generated from structured JSON. Do not attempt to parse the HTML on this site in order to analyze the rules.

| Source  | Repository | Description |
| --  | -- | -- |
| :octicons-mark-github-24: FedRAMP Rules | [https://github.com/FedRAMP/rules](https://github.com/FedRAMP/rules) | Contains all FedRAMP rules in the `fedramp-consolidated-rules.json` file, along with instructions for use. This is the source of truth for structured FedRAMP rules. Agents should reference `AGENTS.md` inside that repository for additional information. |
| :octicons-mark-github-24: Consolidated Rules as Markdown | [https://github.com/FedRAMP/2026-markdown](https://github.com/FedRAMP/2026-markdown) | Contains this entire website as pure markdown, including human-written narratives and machine-generated rules. This is the source of truth for unstructured FedRAMP documentation. Agents should reference `AGENTS.md` inside that repository for additional information. |

## AGENTS

### Read the narrative guidance

Start with the [LLM index](https://www.fedramp.gov/2026/llms.txt). For a single searchable file, download the [full narrative text](https://www.fedramp.gov/2026/llms-full.txt). It contains the manually maintained pages, sorted by source path. Each entry gives the source path, page title, and published URL. Use that URL when citing guidance. For a requirement, definition, indicator, control, or deadline, use the structured rules below.

### Download the consolidated rules

The [latest minified consolidated JSON](https://www.fedramp.gov/2026/sources/latest/fedramp-consolidated-rules-min.json) contains the complete dataset for the release published on this site. Fetch it once per analysis and record its version and update date. The following commands download the file, print its release metadata, and construct the versioned download URL.

```sh
base=https://www.fedramp.gov/2026/sources/latest
curl --fail --location --silent --show-error "$base/fedramp-consolidated-rules-min.json" -o rules.json
jq -e '.info | {version, last_updated}' rules.json
version=$(jq -er '.info.version' rules.json)
printf '%s/fedramp-consolidated-rules-%s-min.json\n' "$base" "$version"
```

Cite the version and entry ID with your findings. Retain the downloaded file if you need to reproduce them after the next release.

### Look up a record

Parse the JSON with a JSON parser. Identifiers are object keys. The table uses jq path notation, where variables such as `$bucket` and `$id` stand for the keys you select. For example, this command retrieves the complete record for `AFC-FRP-VRE`, including any class-specific fields.

```sh
jq -e '.FRR.AFC.data.all.FRP["AFC-FRP-VRE"]' rules.json
```

| Collection | Where to look |
| --- | --- |
| `info` | Read `version`, `last_updated`, and dataset-wide metadata. |
| `FRD` | Look up terms in `.FRD.data[$bucket][$id]`. Use these definitions when interpreting rules. |
| `FRR` | Read the process metadata at `.FRR[$process].info` and the rule at `.FRR[$process].data[$bucket][$subset][$id]`. |
| `KSI` | Read theme metadata at `.KSI[$theme]` and indicators at `.KSI[$theme].indicators[$id]`. |
| `CTL`, when present | Read `.CTL[$family][$id]` for FedRAMP control guidance, parameters, class-specific baseline forces, and annual assessment flags. |

For FRD and FRR, read the shared `all` bucket and the relevant `20x` or `rev5` bucket. For an FRR rule, check the common and framework-specific subset metadata for certification type, path, class, and affected parties. Check the rule’s own `affects`. An explicit `varies_by_class[$class].applicable` overrides subset class membership. If omitted, the rule inherits that membership.

For FRR and KSI, class keys are lowercase. Each supplied class field replaces the whole common field, including arrays and objects. Omitted fields inherit the common value. Read the effective statement and force together, then check document status, effective dates, and any entry or class-specific timing before describing an obligation. For CTL, read baseline force separately from `assess_yearly_by_class`. Each answers a different question.

For detailed interpretation, examples, and validation instructions, read the [FedRAMP rules repository’s AGENTS.md](https://raw.githubusercontent.com/FedRAMP/rules/main/AGENTS.md). Validate automated parsing against the [consolidated rules JSON Schema](https://raw.githubusercontent.com/FedRAMP/rules/main/schemas/fedramp-consolidated-rules.schema.json) from the revision corresponding to your dataset when working with an older release.
