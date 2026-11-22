---
tags:
  - Guidance
picto:
  source: person
---

# Source Data

!!! warning "This site is primarily designed for human use!"

    AI agents and automation services should follow the instructions for [AGENTS](#agents) on this page.

## Background for Humans

This site contains narratives that have been written for humans along with a simple set of human-readable rules. It's important for folks to remember that the rules are generated dynamically from machine-readable source and that this site is intended **only** for easy/quick reference at the beginning of your FedRAMP journey - once you start taking any steps to prepare for a FedRAMP Certification, you should work directly from the original machine-readable rules using a GRC engineering approach.

It is effectively impossible for a human to keep the scope of all applicable FedRAMP rules in mind and to track completeness based on this site. Use the machine-readable rules!

### Latest Versions of Source Data

The best place to start with the machine-readable rules is to grab an appropriate version for your target FedRAMP Certification Type and Class from the [Source Data/Latest Version](latest/index.md) page.

Older versions are available for reference.

### FedRAMP Rules on GitHub

If you want to get more directly involved behind the scenes and monitor development of the rules themselves, they can be found on GitHub in the [FedRAMP/rules](https://github.com/FedRAMP/rules) repository.

## AGENTS

The information below is intended to help large language models and AI agents understand how to effectively index and leverage the information on this site, including the narrative guidance and the machine-readable consolidated rules.

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
