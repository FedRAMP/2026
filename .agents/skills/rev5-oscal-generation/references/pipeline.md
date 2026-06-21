# Rev5 OSCAL pipeline map

## Authoritative inputs

| Data | Source |
| --- | --- |
| NIST family names, controls, enhancements, titles, statements, parameters, status | `tools/data/NIST_SP-800-53_rev5_catalog.xml` |
| FedRAMP guidance and parameter assignments | `tools/rules/fedramp-consolidated-rules.json` → `CTL` |
| Class B/C/D baseline membership | `tools/rules/fedramp-consolidated-rules.json` → `FRC-CSF-BSL` → `varies_by_class.*.rev5_controls_list` |
| Generated mappings and paths | `tools/config.json` |
| Public navigation | `zensical.toml` |

The catalog is vendored and pinned. Read `tools/data/README.md` before replacing it.

## Code and templates

| Responsibility | Path |
| --- | --- |
| XML parsing and canonical catalog model | `tools/scripts/oscal-catalog.ts` |
| Joins, view models, relative links, artifacts | `tools/scripts/build-markdown.ts` |
| Targeted FedRAMP guidance | `tools/templates/rev5-controls.hbs` |
| Full-reference landing page | `tools/templates/full-rev5-control-reference-index.hbs` |
| Full-reference family pages | `tools/templates/full-rev5-control-reference-family.hbs` |
| Rule-level grouped control lists | `tools/templates/partials/rev5-control-list.hbs` |
| Rule and KSI control links | `tools/templates/partials/requirement.hbs` |
| Pipeline regression coverage | `tools/scripts/build-markdown.test.ts` |

## Data flows

### Targeted Rev5 Control Guidance

`CTL family/control` → OSCAL lookup → NIST statement and parameter labels + FedRAMP root/class data → combined or family guidance pages.

Only controls present in `CTL` belong on this surface.

### Full Rev5 Control Reference

Every OSCAL family/active control → optional `CTL` join → optional `FRC-CSF-BSL` class tags → one landing page and one page per family.

Exclude controls whose OSCAL status is `withdrawn` from both generated pages and the internal control-reference link index.

### Rule and KSI links

Structured `controls` identifiers and `rev5_controls_list` entries → canonical control ID → full-reference family path and stable anchor.

Never derive a link by guessing a family filename at the template layer. Build one reference index from the configured full-reference mapping and use it for validation and relative-link generation.

## Identifier and URL contracts

| Meaning | Example |
| --- | --- |
| Accepted rules/KSI form | `ac-2.1` |
| Accepted baseline form | `AC-02 (01)` |
| Internal catalog key | `AC-02-01` |
| Display ID | `AC-02 (01)` |
| Anchor | `ac-02-01` |
| Internal target | `reference/controls/access-control.md#ac-02-01` |
| External target | `https://myctrl.tools/frameworks/nist-800-53-r5/ac-2-1` |

Use `normalizeOscalControlId`, `displayOscalControlId`, `controlAnchorId`, and `myctrlControlUrl`. Extend those shared functions rather than adding parallel parsing.

## Required regression checks

- Full reference includes every catalog family and every active control/enhancement.
- Landing totals match the parsed catalog.
- `FRC-CSF-BSL` still yields 155 Class B, 322 Class C, and 409 Class D entries.
- A control in multiple baselines receives every applicable class tag.
- A control absent from `CTL` states in italics inside the control quote that no additional FedRAMP content exists and omits the FedRAMP information admonition.
- A `CTL` control renders root-level and class-specific guidance/parameters.
- A known withdrawn control is absent from the reference and its link index.
- KSI `controls` links and `rev5_controls_list` title links target the full reference with `{ data-preview }`.
- Enhancement URLs use `ac-2-1`, not zero-padded or parenthesized forms.
- Build output is linked from `zensical.toml` and old generated files are removed by the manifest.
