# cr26-site Tools

The `tools/` package prepares the Zensical site input and generates Markdown from the FedRAMP consolidated rules data.

The primary rules source is:

```text
tools/rules/fedramp-consolidated-rules.json
```

Generated pages are configured in `tools/config.json` and rendered through Handlebars templates in `tools/templates/`.

## Current Pipeline

Run all project tooling from `tools/`. The repository root does not have a `package.json`.

The build pipeline:

1. Reads shared paths and mappings from `config.json`.
2. Clears generated directories as needed.
3. Copies `../content` into `../src`.
4. Generates Markdown from `rules/fedramp-consolidated-rules.json`.
   Rev5 control references enrich the JSON `CTL` collection with the vendored
   NIST OSCAL catalog in `data/NIST_SP-800-53_rev5_catalog.xml`.
5. Runs Zensical with `../zensical.toml`.
6. Writes static output to `../html`.

`content/` is manual source content. Scripts should not write to it. Generated Markdown belongs in `src/`, and generated mappings must not shadow copied `content/` files.

## Commands

```bash
bun run dev
```

Starts the local development pipeline and Zensical preview. It copies `../content` into `../src`, generates configured Markdown, then starts `zensical serve` with `../zensical.toml`.

The dev script watches manual content, templates, config, generator code, and the consolidated rules JSON. Watch rebuilds are debounced by `dev.watchDebounceMs` in `config.json`; the current default is 1000 milliseconds.

```bash
bun test
```

Verifies the rules source schema, `tools/rules` sync status, generated Markdown pipeline, full static build output, and warns when built `src/*.md` pages are not linked from `zensical.toml`.

```bash
bun run check
```

Runs the local quality gate: `bun test`, TypeScript checking, and non-failing
content style warnings. Style warnings print last so they remain visible in
local and pre-commit output.

```bash
bun run build
```

Runs the full static build and writes `../html`.

```bash
bun run sync
```

Syncs the `rules` submodule from the `main` branch of `https://github.com/FedRAMP/rules.git`.
Pass a branch name to sync the submodule from that branch instead:

```bash
bun run sync pwx-523
```

```bash
bun run fix
```

Runs the header fixer script, currently `scripts/fix-headers.ts`.

## Git Hooks

This repo includes a tracked pre-commit hook in `../.githooks/pre-commit` that runs `bun run check` from `tools/`.

Enable it in a clone with:

```bash
git config core.hooksPath .githooks
```

## Configuration

All shared paths and generated Markdown mappings live in `tools/config.json`.

Important path settings:

- `paths.src`: generated Zensical input directory, currently `../src`.
- `paths.content`: manually edited source content, currently `../content`.
- `paths.html`: generated static output, currently `../html`.
- `paths.rulesFile`: consolidated rules JSON.
- `paths.oscalCatalogFile`: local NIST SP 800-53 Revision 5 OSCAL XML catalog.
- `paths.template`: default Handlebars page template.
- `paths.partials`: shared Handlebars partials.
- `paths.zensicalConfig`: site configuration used by dev and build.

Generated files are tracked in the manifest named by `generated.manifest`, currently `.generated-markdown.json` inside `src/`. The generator removes files from the previous manifest before writing the next set, and it refuses to generate a file that would shadow a manual `content/` file.

## Page Pictographs

Manual Markdown pages can declare one source and one status in frontmatter. During build, the copy step reads this `picto` frontmatter and inserts the rendered pictograph span below the frontmatter before the first heading.

Manual source pages usually use:

```markdown
---
picto:
  source: person
  status: stable
---
```

Generated or machine-sourced pages use:

```markdown
---
picto:
  source: machine
  status: stable
---
```

Source values:

```text
person
machine
```

Status values:

```text
stable
placeholder
empty
```

Tooltips and rendered icon definitions are configured in `pictographs` in `config.json`.
For generated mappings, the mapping's `status` controls the rendered page pictograph. Status values from the rules JSON are content metadata and do not override the configured generated-page status.

## Generated Definitions

Add an entry to `generated.definitionDocuments` in `config.json`:

```json
{
  "id": "fedramp-definitions",
  "title": "FedRAMP Definitions",
  "output": "definitions.md",
  "includeEffectiveDates": false,
  "source": {
    "collection": "FRD",
    "types": ["20x", "rev5"],
    "includeAll": true,
    "allPosition": "first"
  }
}
```

Definition mapping fields:

- `id`: stable identifier for the mapping.
- `title`: page H1. If omitted, the FRD document title is used.
- `output`: destination path relative to `paths.src`; the default site location is `definitions.md`.
- `template`: optional Handlebars template path relative to `tools/`; defaults to `paths.template`.
- `emptyBehavior`: `write` keeps an empty page, `skip` omits it when no definitions match.
- `includeEffectiveDates`: set to `false` to omit the top applicability block.
- `status`: pictograph status for generated frontmatter.
- `source.collection`: must be `FRD`.
- `source.types`: one or more certification types, such as `["20x"]` or `["rev5"]`.
- `source.includeAll`: include `data.all` definitions with each selected type.
- `source.allPosition`: place `data.all` definitions `first` or `last`.

Generated definition pages render the FRD purpose first, then an **Important Related Terms** table for definitions with a `tag` value. Each table row has a stable anchor, and each definition that belongs to a group links back to that table row. Definitions themselves render as a single alphabetical list of `##` headings, regardless of whether they have a `tag`.

## Generated Subset Applicability

Generated FRR subset sections render the source `subsets.*.applicability` metadata as compact labels immediately after the subset description. Certification types, classes, and affected parties are narrowed to the current generated mapping. For example, a 20x Class B reference page shows `20x` and `Class B`, while the complete ruleset reference keeps every applicable type and class. Certification paths are shown as supplied by the rules source because generated mappings do not currently filter by path.

## Generated KSI Pages

Add an entry to `generated.ksiDocuments` in `config.json`:

```json
{
  "id": "provider-20x-key-security-indicators",
  "output": "providers/20x/key-security-indicators/{KSI}.md",
  "outputMode": "themes",
  "status": "stable",
  "definitionsHref": "../../../definitions/",
  "source": {
    "collection": "KSI",
    "themes": "ALL"
  }
}
```

Use `outputMode: "single"` when selected KSI themes should be grouped into one generated page:

```json
{
  "id": "complete-ksi-reference",
  "title": "Key Security Indicators",
  "output": "reference/key-security-indicators.md",
  "outputMode": "single",
  "status": "stable",
  "definitionsHref": "../definitions/",
  "source": {
    "collection": "KSI",
    "themes": "ALL"
  }
}
```

KSI mapping fields:

- `id`: stable identifier for the mapping.
- `title`: page H1. If omitted, theme pages use the KSI theme name and single pages use `Key Security Indicators`.
- `output`: destination path relative to `paths.src`. Use `{KSI}` or `{theme}` as the lowercase KSI theme `web_name` placeholder.
- `outputMode`: optional output behavior. Omit it or use `themes` for one page per selected KSI theme; use `single` to generate one page with selected themes as sections.
- `template`: optional Handlebars template path relative to `tools/`; defaults to `paths.template`.
- `definitionsHref`: relative link prefix for generated term links.
- `relatedIndicatorsFromRuleDocumentMappingId`: optional `generated.ruleDocuments` mapping id. When set, the KSI page includes only indicators directly referenced by rules included in that rule mapping.
- `emptyBehavior`: `write` keeps an empty page, `skip` omits it when no indicators match.
- `status`: pictograph status for generated frontmatter.
- `source.collection`: must be `KSI`.
- `source.theme`: one KSI theme key from the rules JSON, such as `CMT`.
- `source.themes`: an array of KSI theme keys, such as `["CMT", "IAM"]`, or `"ALL"` to process every KSI theme.
- `source.classes`: optional certification classes, such as `["B"]`. When present, indicators with `varies_by_class` render only the selected class variant.

## Generated Rev5 Control Pages

Add an entry to `generated.controlDocuments` in `config.json`:

```json
{
  "id": "complete-rev5-controls-reference",
  "title": "Rev5 Controls",
  "output": "reference/rev5-controls.md",
  "status": "stable",
  "template": "templates/rev5-controls.hbs",
  "source": {
    "collection": "CTL",
    "families": "ALL"
  }
}
```

Control documents select entries from the rules JSON `CTL` collection and enrich them with family names, control titles, official identifiers, control statements, assignment labels, and catalog version metadata from `paths.oscalCatalogFile`. The generator fails when a selected CTL control or parameter ID is absent from the local OSCAL catalog.

Mapping fields:

- `id`: stable identifier for the mapping.
- `title`: page H1.
- `output`: destination path relative to `paths.src`.
- `template`: optional Handlebars template; defaults to `templates/rev5-controls.hbs`.
- `emptyBehavior`: `write` keeps an empty page and `skip` omits it.
- `status`: pictograph status for generated frontmatter.
- `source.collection`: must be `CTL`.
- `source.families`: an array of CTL family keys or `"ALL"`.

The generated page groups controls under the human-readable NIST family title. Each control includes the NIST statement, catalog and OSCAL versions, FedRAMP guidance, class-specific tabs when `varies_by_class` is present, and FedRAMP parameter IDs, NIST assignment labels, and values.

## Generated Deadline Pages

Add an entry to `generated.deadlineDocuments` in `config.json`:

```json
{
  "id": "provider-important-deadlines",
  "title": "Important Deadlines",
  "output": "providers/updating/deadlines/{type}.md",
  "template": "templates/deadlines.hbs",
  "source": {
    "collection": "FRR",
    "documents": "ALL",
    "ignoreDocuments": ["AGU", "SDR", "REC"],
    "types": ["20x", "rev5"],
    "affects": ["Providers"]
  }
}
```

Deadline documents generate one page per configured type. They read each selected FRR document's `info.short_name`, `info.name`, `info.web_name`, and common or certification-specific `effective` values. The generated table links each combined rule family name and short name, such as `FedRAMP Security Inbox (FSI)`, to the matching rule page for that type. The date columns render `optional_adoption`, `obtain`, `maintain`, and `grace` in that order; when `grace.until_next_assessment` is true, the grace column explains that the deadline is the first FedRAMP independent assessment completed after `grace.default`.

Use `{type}` or `{version}` in `output` to place each type page explicitly. Use `source.ignoreDocuments` to remove specific FRR keys after `source.documents` is resolved, including when `source.documents` is `"ALL"`.
Use `source.affects` to omit selected FRR documents that do not contain any rule affecting that audience, such as excluding assessor-only recognition rules from provider deadline pages.

## Generated Tagged Document Summaries

Add an entry to `generated.taggedDocumentSummaries` in `config.json`:

```json
{
  "id": "provider-20x-initial-rules-summary",
  "title": "Initial Certification",
  "output": "providers/20x/initial/index.md",
  "status": "placeholder",
  "template": "templates/tagged-document-summary.hbs",
  "source": {
    "collection": "FRR",
    "documents": "ALL",
    "types": ["20x"],
    "affects": ["Providers"],
    "tag": "initial",
    "includeAll": true,
    "allPosition": "first"
  }
}
```

Tagged document summaries generate one overview page from FRR documents whose `info.tag` matches `source.tag` or `source.tags`. Each page renders a table of matching rulesets. Ruleset rows link to the generated rule page and use `info.purpose`, followed by an **Applicable Rules** count calculated from the same type, affected-party, and section filters used for the page.

Summary mappings use the same `source.documents`, `source.ignoreDocuments`, `source.types`, `source.affects`, `source.sections`, `source.includeAll`, and `source.allPosition` behavior as generated rule pages. The generated links are resolved from the configured `generated.ruleDocuments` mappings, so summaries follow provider, assessor, and version-specific rule page paths.

## Generated FRR Reference Index

Add an entry to `generated.referenceIndexDocuments` in `config.json`:

```json
{
  "id": "complete-ruleset-reference-index",
  "title": "Complete Ruleset Reference",
  "description": "This section contains the entire Consolidated Rules for 2026 as a standalone reference for each ruleset.",
  "purpose": "This content allows folks to see the full rules together without them broken apart by stakeholder.",
  "introduction": "This section of the Consolidated Rules for 2026 contains each complete FedRAMP Ruleset with all related content in a single rule as an overall reference. The individual stakeholder sections of this site contain only the specific rules that apply in different circumstances for different stakeholders, while the reference rulesets are entirely unabridged.",
  "output": "reference/index.md",
  "status": "stable",
  "template": "templates/reference-index.hbs",
  "source": {
    "collection": "FRR",
    "documents": "ALL"
  }
}
```

Reference index mappings generate a table of FRR rulesets with links, status, subset and rule counts, and the most recent rule update date. Use `introduction` for the visible narrative text above the table. Use `source.documents: "ALL"` to include every FRR ruleset from the rules JSON; use `source.ignoreDocuments` to remove specific FRR keys after selection.

Use `ruleDocumentMappingId` when the index should link to a generated ruleset mapping that does not live beside the index page. Use `ruleDocumentMappingIds` when one index row should link to multiple generated mappings, such as separate class-specific reference pages. Reference index mappings also support `source.types`, `source.classes`, `source.sections`, `source.affects`, `source.includeAll`, and `source.allPosition` so the table counts and links can match a filtered ruleset reference. When `source.classes` is present, only subsets whose `info.subsets.<key>.applicability.types` and `.classes` overlap the selected type and class are included.

The complete ruleset reference is usually paired with rule document mappings that use `outputMode: "documents"` and `output: "reference/{FRR}.md"` so each FRR ruleset has a standalone generated page. Class-specific reference sections use the same pattern with outputs such as `reference/20x/a/{FRR}.md`.

## Generated Rule Pages

Add an entry to `generated.ruleDocuments` in `config.json`:

```json
{
  "id": "provider-fsi-rules",
  "output": "providers/{type}/rules/{FRR}.md",
  "outputMode": "documents",
  "status": "stable",
  "definitionsHref": "../../../definitions/",
  "rulesHref": "../../../",
  "emptyBehavior": "skip",
  "source": {
    "collection": "FRR",
    "documents": ["FSI"],
    "types": ["20x", "rev5"],
    "affects": ["Providers"],
    "includeAll": true,
    "allPosition": "first"
  }
}
```

Mapping fields:

- `id`: stable identifier for the mapping.
- `title`: page H1. If omitted, the FRR document title is used.
- `output`: destination path relative to `paths.src`. For `outputMode: "documents"`, use `{FRR}` as the lowercase FRR key placeholder.
- `outputMode`: optional output behavior. Omit it or use `single` for one output file; use `documents` to generate one file per selected FRR.
- `template`: optional Handlebars template path relative to `tools/`; defaults to `paths.template`.
- `definitionsHref`: relative link prefix for generated term links.
- `rulesHref`: relative link prefix for `reference_url_web_name` references.
- `linkTargetScope`: optional related-rule link visibility. Use `sameMappingOnly` for complete reference mappings that should not become fallback link targets for stakeholder-specific pages.
- `relatedRulesOutput`: optional companion page path for directly related FRR rules that are referenced by this mapping but are not otherwise included by its filters.
- `relatedRulesTitle`: optional page H1 for the companion related-rules page.
- `relatedRulesGroups`: optional ordered groups for the companion page. Each group supplies a `title` and `sourceRuleIds`; a related rule is assigned to the first group whose source rule references it, so the ordering also resolves overlaps.
- `relatedRulesUngroupedTitle`: optional heading prefix for related rules that are not referenced by a configured group.
- `emptyBehavior`: `write` keeps an empty page, `skip` omits it when no rules match.
- `includeEffectiveDates`: set to `false` to omit the top applicability block.
- `status`: pictograph status for generated frontmatter.
- `source.document`: one FRR key from the rules JSON, such as `FSI`.
- `source.documents`: an array of FRR keys, such as `["FSI", "ICP"]`, or `"ALL"` to process every FRR.
- `source.ignoreDocuments`: optional array of FRR keys to remove after `source.document` or `source.documents` is resolved.
- `source.types`: one or more certification types, such as `["20x"]` or `["rev5"]`.
- `source.classes`: optional certification classes, such as `["A"]`. When present, generated ruleset pages include only subsets whose applicability includes the selected type and class, and `varies_by_class` output is trimmed to the selected class.
- `source.affects`: optional filter matched against each rule's `affects` list.
- `source.sections`: optional list of subset keys to include, such as `["CSO", "CSX", "CSF"]`.
- `source.includeAll`: include `data.all` rules with each selected type.
- `source.allPosition`: place `data.all` rules `first` or `last`.
- `source.groupBy`: for multi-FRR mappings, `section` keeps source subset sections and `document` groups matches under each FRR document title. Single-FRR mappings always render source subset sections so the page title is not repeated as the first section heading.

Generated rule pages also support selected rich rule metadata:

- `info.flows` and certification-specific flows render as Mermaid activity workflow diagrams above the rules. Flow nodes link to matching rule headings when the flow node label matches a generated rule heading.
- Rule `related` IDs are linked in statements, notes, variants, and following-information lists when the referenced rule appears in a compatible generated page. `linkTargetScope: "sameMappingOnly"` keeps complete reference pages from becoming fallback link targets for stakeholder-specific pages.
- `following_information` renders as numbered items and `following_information_bullets` renders as bullet items.
- `reference_url_web_name` links a rule reference to another generated ruleset page through `rulesHref`.
- `pain_timeframes` renders a PAIN timeframe table inside applicable rule variants.
- Notification entries render their required human-readable `name` and link form, web, and email targets when possible. Non-link targets remain visible as supporting destination details.

The default template is `templates/template.hbs`, with partials in `templates/partials/`. New templates can use the same view model as the default template: effective entries, flows, sections, requirements, definitions, and requirement metadata such as terms, controls, notes, examples, and references.

## Generated FRR Collection Pages

Add an entry to `generated.frrCollectionDocuments` in `config.json` when selected rules from multiple FRR rulesets should be combined into one page:

```json
{
  "id": "fedramp-responsibilities",
  "title": "FedRAMP's Responsibilities",
  "output": "responsibilities/rules.md",
  "status": "placeholder",
  "definitionsHref": "../definitions/",
  "rulesHref": "../",
  "emptyBehavior": "skip",
  "source": {
    "collection": "FRR",
    "documents": "ALL",
    "types": ["20x", "rev5"],
    "affects": ["FedRAMP"],
    "sections": ["FRP"],
    "includeAll": true,
    "allPosition": "first"
  }
}
```

FRR collection mappings output a single Markdown page. Each matched FRR ruleset renders as a `##` section with the FRR purpose, then the matching subset description, then the rules selected by `source.affects` and `source.sections`. These collection pages intentionally omit effective-date blocks and activity workflow diagrams.

Mapping fields are the same as generated rule pages except `title` is required, `outputMode`, `includeEffectiveDates`, and `source.groupBy` are not used, and `status` controls the overall page pictograph status directly.
