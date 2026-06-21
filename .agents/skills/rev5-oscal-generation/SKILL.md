---
name: rev5-oscal-generation
description: Maintain the FedRAMP 2026 site's NIST SP 800-53 Rev5 OSCAL parsing, full control reference, targeted FedRAMP control guidance, baseline tags, control links, and generated Markdown. Use when changing tools/data/NIST_SP-800-53_rev5_catalog.xml handling, CTL generation, rev5_controls_list rendering, KSI control links, FRC-CSF-BSL-derived class metadata, control templates, or reference/controls outputs.
---

# Rev5 OSCAL generation

Build Rev5 pages from authoritative local data without duplicating control facts in code or templates.

## Compose the OSCAL skills

- Also use `oscal-parser` when changing XML parsing, catalog metadata, control hierarchy, status, statements, parameters, or incorporated-control relationships.
- Also use `controls-extractor` when enumerating or comparing controls, enhancements, families, parameters, or baseline membership.
- Treat those skills as domain extraction guidance. Apply this repo-local skill for paths, generation contracts, linking, tests, and build rules.

## Read the pipeline map

Read [references/pipeline.md](references/pipeline.md) before changing generator behavior, templates, links, or OSCAL-derived view models.

## Preserve authority boundaries

1. Use `tools/rules/fedramp-consolidated-rules.json` for FedRAMP rules, `CTL` guidance and parameters, and `FRC-CSF-BSL` class membership.
2. Use `tools/data/NIST_SP-800-53_rev5_catalog.xml` for NIST families, identifiers, titles, statements, parameters, and active or withdrawn status.
3. Never download OSCAL during build or test.
4. Never hand-edit `src/` or `html/`.
5. Do not edit `content/` without explicit permission.
6. Fail generation for missing structured references instead of silently omitting or inventing controls.

## Choose the correct generation surface

- Update `generated.controlDocuments` only for targeted controls that have FedRAMP `CTL` content.
- Update `generated.fullControlReferenceDocuments` for exhaustive catalog pages under `reference/controls/`.
- Enrich structured rule and KSI control references through the full-reference index; do not link them to third-party sites.
- Use myctrl.tools only as the additional external link on each full control entry.

## Keep identifiers canonical

- Normalize all accepted source forms, including `ac-2`, `ac-2.1`, `AC-02(01)`, and `AC-02 (01)`, to internal keys such as `AC-02` and `AC-02-01`.
- Display controls as `AC-02` and enhancements as `AC-02 (01)`.
- Use stable anchors such as `#ac-02` and `#ac-02-01`.
- Generate myctrl.tools paths without zero padding, such as `ac-2` and `ac-2-1`.
- Preserve the source identifier format in `rev5_controls_list` while linking its catalog-derived title.

## Implement through view models

1. Parse additional OSCAL facts in `tools/scripts/oscal-catalog.ts`.
2. Join OSCAL and FedRAMP data in `tools/scripts/build-markdown.ts`.
3. Keep templates declarative; do not perform identifier parsing or lookups in Handlebars.
4. Derive Class B, C, and D tags only from `FRC-CSF-BSL`.
5. Generate relative internal links from each artifact path and add `{ data-preview }`.
6. Exclude withdrawn controls from the full reference and its internal control-link index.

## Verify proportionally

From `tools/`, run:

```bash
bunx tsc -p tsconfig.json --noEmit
bun test
bun run build
bun run check
```

Inspect representative generated output:

- `src/reference/controls/index.md`
- One active base control and enhancement.
- Confirm a known withdrawn control is absent.
- One control with FedRAMP guidance or parameters.
- One KSI `controls` link.
- One `rev5_controls_list` link.

Confirm navigation paths in `zensical.toml`, generated manifest cleanup, baseline counts, stable anchors, relative links, preview attributes, and myctrl.tools URL formatting.
