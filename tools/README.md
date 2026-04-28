# cr26-site tools

The tools package prepares the Zensical site inputs and builds generated Markdown from `rules/fedramp-consolidated-rules.json`.

## Commands

Run commands from `tools/`.

```bash
bun run dev
```

Copies `../content` into `../src`, generates configured Markdown into `../src`, then starts `zensical serve` with `../zensical.toml`. The dev script watches manual content, templates, config, generator code, and the rules JSON.

```bash
bun test
```

Verifies the configured generated Markdown pipeline.

```bash
bun run build
```

Runs the full static build pipeline:

1. `scripts/build.ts` reads `config.json`.
2. `scripts/deploy.ts` clears `../src` and `../html`, then copies `../content` to `../src`.
3. `scripts/build-markdown.ts` generates Markdown configured in `config.json`.
4. `zensical build --clean` builds `../html` using the configured Zensical file.

```bash
bun sync
```

Syncs the `rules` submodule from the `pwx` branch of `https://github.com/FedRAMP/rules.git`.

## Configuration

All shared paths and generated Markdown mappings live in `tools/config.json`.

Important path settings:

- `paths.src`: generated Zensical input directory, currently `../src`.
- `paths.content`: manually edited source content, currently `../content`.
- `paths.html`: generated static output, currently `../html`.
- `paths.rulesFile`: consolidated rules JSON.
- `paths.template`: default Handlebars page template.
- `paths.partials`: shared Handlebars partials.
- `paths.zensicalConfig`: site configuration used by dev and build.

Generated files are tracked in `generated.manifest` inside `src/`. The generator removes files from the previous manifest before writing the next set, and it refuses to generate a file that would shadow a manual `content/` file.

## Adding A Generated Rules Page

Add an entry to `generated.ruleDocuments` in `config.json`:

```json
{
  "id": "frc-provider-20x-initial-certification",
  "title": "FedRAMP 20x Initial Certification Responsibilities",
  "output": "providers/20x/initial/certification.md",
  "definitionsHref": "../../../definitions/",
  "rulesHref": "../../../",
  "emptyBehavior": "write",
  "source": {
    "collection": "FRR",
    "document": "FRC",
    "types": ["20x"],
    "affects": ["Providers"],
    "includeBoth": true,
    "bothPosition": "first"
  }
}
```

Mapping fields:

- `id`: stable identifier for the mapping.
- `title`: page H1. If omitted, the FRR document title is used.
- `output`: destination path relative to `paths.src`.
- `template`: optional Handlebars template path relative to `tools/`; defaults to `paths.template`.
- `definitionsHref`: relative link prefix for generated term links.
- `rulesHref`: relative link prefix for `reference_url_web_name` references.
- `emptyBehavior`: `write` keeps an empty page, `skip` omits it when no rules match.
- `includeEffectiveDates`: set to `false` to omit the top applicability block.
- `source.document`: one FRR key from the rules JSON, such as `FRC`.
- `source.documents`: an array of FRR keys, such as `["FSI", "ICP"]`, or `"ALL"` to process every FRR.
- `source.types`: one or more certification types, such as `["20x"]` or `["rev5"]`.
- `source.affects`: optional filter matched against each rule's `affects` list.
- `source.sections`: optional list of section keys to include, such as `["CSO", "CSX"]`.
- `source.includeBoth`: include `data.both` rules with each selected type.
- `source.bothPosition`: place `data.both` rules `first` or `last`.
- `source.groupBy`: for multi-FRR mappings, `section` keeps source label sections and `document` groups matches under each FRR document title. Single-FRR mappings always render source label sections so the page title is not repeated as the first section heading.

For example, this mapping processes every FRR and generates one list of every rule that affects FedRAMP:

```json
{
  "id": "all-fedramp-responsibilities",
  "title": "FedRAMP Responsibilities",
  "output": "responsibilities/index.md",
  "definitionsHref": "../definitions/",
  "rulesHref": "../",
  "includeEffectiveDates": false,
  "source": {
    "collection": "FRR",
    "documents": "ALL",
    "types": ["20x", "rev5"],
    "affects": ["FedRAMP"],
    "includeBoth": true,
    "bothPosition": "first",
    "groupBy": "document"
  }
}
```

The default template is `templates/template.hbs`, with partials in `templates/partials/`. New templates can use the same view model as the default template: effective entries, sections, requirements, definitions, and requirement metadata such as terms, controls, notes, examples, and references.
