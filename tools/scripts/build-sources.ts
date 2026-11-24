import { existsSync } from "node:fs";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { get_encoding } from "tiktoken";
import {
  buildKsiIndex,
  buildRuleIndex,
  pictographSpan,
  renderRuleDocumentOutput,
  slugifyTerm,
  type RulesDocument,
} from "./build-markdown";
import { applicableClasses, resolveClassContent } from "./class-content";
import {
  loadToolConfig,
  resolveToolPath,
  type RuleType,
  type ToolConfig,
} from "./config";
import { writeIfChanged } from "./write-if-changed";

const encodingName = "o200k_base";
const tokenizer = get_encoding(encodingName);
const directory = "sources/latest";
const classes = { "20x": ["a", "b", "c", "d"], rev5: ["b", "c", "d"] };
const ownedDownload =
  /^fedramp-(?:consolidated-rules|definitions|(?:providers-)?(?:20x|rev5)-class-[a-d]-rules)-[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/;

function classRules(
  documents: RulesDocument["FRR"],
  type: RuleType,
  key: string,
) {
  const result: RulesDocument["FRR"] = {};
  const className = key.toUpperCase();
  const typeName = type === "rev5" ? "Rev5" : "20x";
  for (const [id, document] of Object.entries(documents)) {
    const { rev5, "20x": twentyX, ...info } = document.info;
    const framework = type === "rev5" ? rev5 : twentyX;
    const subsets = { ...info.subsets, ...framework?.subsets };
    const selected = new Set<string>();
    const data: typeof document.data = {};
    for (const bucket of ["all", type] as const) {
      for (const [group, rules] of Object.entries(
        document.data[bucket] ?? {},
      )) {
        const scope = subsets[group]?.applicability;
        if (!scope?.types?.includes(typeName)) continue;
        if (scope.affects?.length && !scope.affects.includes("Providers"))
          continue;
        const matches = Object.entries(rules)
          .filter(
            ([, rule]) =>
              rule.affects?.includes("Providers") &&
              applicableClasses(rule, scope.classes).includes(className),
          )
          .map(([id, rule]) => [id, resolveClassContent(rule, key)]);
        if (!matches.length) continue;
        (data[bucket] ??= {})[group] = Object.fromEntries(matches);
        selected.add(group);
      }
    }
    if (!selected.size) continue;
    function selectedSubsets(source: typeof info.subsets) {
      return Object.fromEntries(
        Object.entries(source ?? {})
          .filter(([group]) => selected.has(group))
          .map(([group, subset]) => [
            group,
            {
              ...subset,
              applicability: {
                ...subset.applicability,
                classes: [className],
                types: [typeName],
              },
            },
          ]),
      );
    }
    if (info.subsets) info.subsets = selectedSubsets(info.subsets);
    if (framework) {
      Object.assign(info, {
        [type]: {
          ...framework,
          ...(framework.subsets && {
            subsets: selectedSubsets(framework.subsets),
          }),
        },
      });
    }
    result[id] = { info, data };
  }
  return result;
}

function indicators(themes: RulesDocument["KSI"], key: string) {
  return Object.fromEntries(
    Object.entries(themes).map(([id, theme]) => [
      id,
      {
        ...theme,
        indicators: Object.fromEntries(
          Object.entries(theme.indicators).map(([id, indicator]) => [
            id,
            resolveClassContent(indicator, key),
          ]),
        ),
      },
    ]),
  );
}

function controls(families: RulesDocument["CTL"], key: string) {
  const result: RulesDocument["CTL"] = {};
  for (const [family, entries] of Object.entries(families ?? {})) {
    for (const [id, control] of Object.entries(entries)) {
      const variant = control.varies_by_class?.[key];
      if (!variant) continue;
      const annual = control.assess_yearly_by_class?.[key];
      if (typeof annual !== "boolean")
        throw new Error(
          `Missing annual assessment flag for ${id} Class ${key}`,
        );
      (result[family] ??= {})[id] = {
        ...control,
        varies_by_class: { [key]: variant },
        assess_yearly_by_class: { [key]: annual },
      };
    }
  }
  return result;
}

function changelogRules(
  lines: string[],
  rules: RulesDocument,
  config: ToolConfig,
) {
  const targets = new Map<string, { name: string; href: string }>();
  function target(id: string, name: string, page: string, anchor: string) {
    targets.set(id, {
      name,
      href: path.posix.relative(directory, page) + "#" + anchor,
    });
  }
  const generated = config.generated;
  const reference = generated.ruleDocuments.find(
    (m) => m.id === "complete-ruleset-reference",
  );
  const ksi = generated.ksiDocuments?.find(
    (m) => m.id === "complete-ksi-reference",
  );
  const definitions = generated.definitionDocuments?.find(
    (m) => m.id === "fedramp-definitions",
  );
  if (reference) {
    for (const entry of buildRuleIndex(rules).values()) {
      const page = renderRuleDocumentOutput(
        reference,
        rules.FRR[entry.documentKey]!.info.web_name,
      );
      target(entry.id, entry.name, page, entry.anchorId);
    }
  }
  if (ksi) {
    for (const entry of buildKsiIndex(rules).values())
      target(entry.id, entry.name, ksi.output, entry.anchorId);
  }
  if (definitions) {
    for (const bucket of Object.values(rules.FRD.data ?? {}))
      for (const [id, entry] of Object.entries(bucket))
        target(id, entry.term, definitions.output, slugifyTerm(entry.term));
  }

  const roots = new Set([
    "FRR",
    "FRD",
    "KSI",
    "CTL",
    ...Object.keys(rules.FRR),
  ]);
  const leadingId = /^([A-Z]{3}(?:-[A-Z0-9]{3}){0,2})(?![\w-])/;
  const entries = lines.map((line) => {
    const first = leadingId.exec(line)?.[1];
    if (!first || !roots.has(first.split("-")[0]!))
      return { rank: 0, id: "", text: line };
    const rank = first.startsWith("FRD-") ? 3 : first.split("-").length;
    if (rank < 3) return { rank, id: first, text: line };

    // Only the opening list identifies the subject. Preserve IDs mentioned later in the prose.
    let offset = 0;
    let text = "";
    while (true) {
      const match =
        /^([A-Z]{3}(?:-[A-Z0-9]{3}){1,2})(?![\w-])( \((?:[^()]|\([^()]*\))*\))?/.exec(
          line.slice(offset),
        );
      if (!match) break;
      const [, id, title] = match;
      const item = targets.get(id!);
      text += item
        ? `[${id}${title ?? ` (${item.name})`}](${item.href}){ data-preview }`
        : match[0];
      offset += match[0].length;
      const separator = /^(?:, and | and |, )(?=[A-Z]{3}-[A-Z0-9]{3}\b)/.exec(
        line.slice(offset),
      );
      if (!separator) break;
      text += separator[0];
      offset += separator[0].length;
    }
    return { rank, id: first, text: text + line.slice(offset) };
  });
  return entries
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
    .map((entry) => entry.text);
}

function changelog(
  yaml: string,
  version: string,
  rules: RulesDocument,
  config: ToolConfig,
): string {
  const source = Bun.YAML.parse(yaml) as Record<string, unknown> | null;
  const entries = source?.["fedramp-consolidated-rules"];
  if (!Array.isArray(entries))
    throw new Error("CHANGELOG.yml requires a fedramp-consolidated-rules list");
  const sections: string[] = [];
  for (const entry of entries) {
    if (typeof entry?.version !== "string")
      throw new Error("CHANGELOG.yml entry requires a version");
    if (entry.version !== version) continue;
    for (const [name, lines] of Object.entries(entry)) {
      if (["version", "last_updated", "release", "tooling"].includes(name))
        continue;
      if (
        !Array.isArray(lines) ||
        !lines.every((line) => typeof line === "string")
      )
        throw new Error(`Invalid CHANGELOG.yml section ${name} in ${version}`);
      const items =
        name === "rules" ? changelogRules(lines, rules, config) : lines;
      sections.push(
        `### ${name[0]!.toUpperCase()}${name.slice(1)}\n\n${items.map((line) => `- ${line}`).join("\n")}`,
      );
    }
    return sections.join("\n\n");
  }
  return "No changelog entry is available for this version.";
}

export async function buildSources(config: ToolConfig) {
  const rulesPath = resolveToolPath(config.paths.rulesFile);
  const raw = await readFile(rulesPath, "utf8");
  const rules: RulesDocument = JSON.parse(raw);
  const info = rules.info;
  if (
    !info?.version ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(info.version) ||
    !info.last_updated
  )
    throw new Error(
      "Rules info requires a filename-safe version and last_updated date",
    );
  const version = info.version;
  const changes = changelog(
    await readFile(path.join(path.dirname(rulesPath), "CHANGELOG.yml"), "utf8"),
    info.version,
    rules,
    config,
  );
  const files = new Map<string, string>();
  function downloadLink(label: string, filename: string, contents: string) {
    files.set(filename, contents);
    const size = (Buffer.byteLength(contents, "utf8") / 1024).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      },
    );
    const tokens = tokenizer.encode_ordinary(contents).length;
    return `[${label}](${filename}) (${size} KiB, ~${Math.round(tokens / 1000)}k tokens)`;
  }
  function download(name: string, data: unknown, original?: string) {
    const stem = `fedramp-${name}-${version}`;
    const formatted = original ?? JSON.stringify(data, null, 2) + "\n";
    const minified = JSON.stringify(data);
    return `${downloadLink("JSON", `${stem}.json`, formatted)} | ${downloadLink("Minified", `${stem}-min.json`, minified)}`;
  }
  const { default_artifacts, ...metadata } = info;
  const index = [
    "---",
    "picto:",
    "  source: machine",
    "---",
    "",
    pictographSpan(config, `${directory}/index.md`),
    "",
    `# Latest Consolidated Rules for 2026 (${info.version})`,
    "",
    `**${info.version}**, released on **${info.last_updated}**, is the current active release for the Consolidated Rules for 2026.`,
    "",
    "Providers should update to this release at their earliest convenience and note the version of the rules they are following in their Security Decision Record. [Changes in this release](#changes-in-this-release) are noted below.",
    "",
    "## Complete Rules and Definitions",
    "",
    "| Dataset | Formatted | Minified |",
    "| --- | --- | --- |",
    `| Complete Consolidated Rules | ${download("consolidated-rules", rules, raw)} |`,
    `| Definitions Only | ${download("definitions", { info: metadata, FRD: rules.FRD })} |`,
    "",
    downloadLink(
      "Latest minified consolidated rules",
      "fedramp-consolidated-rules-min.json",
      JSON.stringify(rules),
    ),
    "",
    "## Provider Rules by Certification Type and Class",
    "",
    "These JSON files contain machine-generated FedRAMP Rules and Practices for cloud service providers based on certification type and class. Definitions are available separately above.",
    "",
    "| Certification type | Class | Formatted | Minified |",
    "| --- | --- | --- | --- |",
  ];
  for (const type of ["20x", "rev5"] as const) {
    for (const key of classes[type]) {
      const data = {
        info: {
          ...metadata,
          ...(default_artifacts && {
            default_artifacts: Object.fromEntries(
              Object.entries(default_artifacts).filter(
                ([name]) =>
                  name === "FRR" || (type === "20x" && name === "KSI"),
              ),
            ),
          }),
        },
        FRR: classRules(rules.FRR, type, key),
        ...(type === "20x"
          ? { KSI: indicators(rules.KSI, key) }
          : { CTL: controls(rules.CTL, key) }),
      };
      index.push(
        `| ${type === "rev5" ? "Rev5" : "20x"} | ${key.toUpperCase()} | ${download(`providers-${type}-class-${key}-rules`, data)} |`,
      );
    }
  }
  index.push("", "## Changes in This Release", "", changes, "");
  files.set("index.md", index.join("\n"));

  const output = path.join(resolveToolPath(config.paths.src), directory);
  const manual = path.join(resolveToolPath(config.paths.content), directory);
  for (const name of files.keys()) {
    if (existsSync(path.join(manual, name)))
      throw new Error(
        `Generated download collides with manual content: ${directory}/${name}`,
      );
  }
  for (const [name, contents] of files)
    await writeIfChanged(path.join(output, name), contents);
  for (const name of await readdir(output)) {
    if (
      !files.has(name) &&
      ownedDownload.test(name) &&
      !existsSync(path.join(manual, name))
    )
      await unlink(path.join(output, name));
  }
}

if (import.meta.main) await buildSources(await loadToolConfig());
