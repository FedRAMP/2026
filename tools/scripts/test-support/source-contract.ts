import { expect } from "bun:test";
import path from "node:path";
import type { BuildArtifact } from "../build-markdown";
import type { RuleDocumentSourceConfig } from "../config";
import { normalizeOscalControlId } from "../oscal-catalog";
import { sources, type Rules } from "./sources";

export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
export function htmlText(html: string): string {
  // Add boundaries only at block elements; inline markup must not split words.
  const blocks = html
    .replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/g, "")
    .replace(
      /<\/?(?:p|div|li|h[1-6]|tr|td|th|br|pre|section|summary)\b[^>]*>/gi,
      " ",
    );
  let text = "";
  new HTMLRewriter()
    .on("*", {
      text(chunk) {
        text += chunk.text;
      },
    })
    .transform(`<div>${blocks}</div>`);
  return Bun.markdown.render(text).replace(/\s+/g, " ").trim();
}
export function markdownText(markdown: string): string {
  return htmlText(
    Bun.markdown.render(
      markdown
        .replace(/:(?:material|lucide|octicons|fontawesome)-[a-z0-9-]+:/g, "")
        .replace(/\[\^[^\]]+\]/g, "")
        .replace(/\{[^{}\n]*(?:data-preview|#[a-z]|\.[a-z])[^{}\n]*\}/g, "")
        .replace(/^ +/gm, ""),
    ),
  );
}
export function mainHtml(html: string): string {
  const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (body === undefined) throw new Error("Missing rendered article");
  return body.replace(/<a\b[^>]*class="headerlink"[^>]*>[\s\S]*?<\/a>/g, "");
}
export function assertText(
  actual: string,
  expected: string | undefined,
  where: string,
  html = false,
) {
  if (!expected?.trim()) return;
  expect(html ? htmlText(actual) : markdownText(actual), where).toContain(
    markdownText(expected),
  );
}
export function buckets(source: {
  types?: string[];
  includeAll?: boolean;
  allPosition?: string;
}): string[] {
  const types =
    source.types?.includes("all") || !source.types
      ? ["20x", "rev5"]
      : source.types;
  return source.includeAll === false
    ? types
    : source.allPosition === "first"
      ? ["all", ...types]
      : [...types, "all"];
}
export function documentKeys(
  rules: Rules,
  source: {
    documents?: string[] | "ALL";
    document?: string;
    ignoreDocuments?: string[];
  },
): string[] {
  const selected =
    source.documents === "ALL"
      ? Object.keys(rules.FRR)
      : (source.documents ??
        (source.document ? [source.document] : Object.keys(rules.FRR)));
  return selected.filter((key) => !source.ignoreDocuments?.includes(key));
}
export type RuleEntry = NonNullable<
  Rules["FRR"][string]["data"]["all"]
>[string][string];
export function selectedRules(
  rules: Rules,
  source: Omit<RuleDocumentSourceConfig, "collection" | "types"> & {
    types?: string[];
  },
  key?: string,
): Array<[string, RuleEntry]> {
  const result: Array<[string, RuleEntry]> = [];
  const classes = source.classes?.map((x) => x.toLowerCase());
  for (const documentKey of key ? [key] : documentKeys(rules, source)) {
    const doc = rules.FRR[documentKey]!;
    const types = buckets(source).filter((x) => x !== "all");
    const subsets = Object.assign(
      {},
      doc.info.subsets,
      ...types.map((t) => doc.info[t as "20x" | "rev5"]?.subsets),
    );
    for (const bucket of buckets(source)) {
      for (const [section, entries] of Object.entries(
        doc.data[bucket as "all"] ?? {},
      )) {
        if (source.sections && !source.sections.includes(section)) continue;
        const applicability = subsets[section]?.applicability;
        if (
          applicability?.types?.length &&
          !applicability.types.some((t: string) =>
            types.includes(t.toLowerCase()),
          )
        )
          continue;
        if (
          classes?.length &&
          applicability?.classes?.length &&
          !applicability.classes.some((c: string) =>
            classes.includes(c.toLowerCase()),
          )
        )
          continue;
        if (
          source.affects?.length &&
          applicability?.affects?.length &&
          !applicability.affects.some((a: string) =>
            source.affects!.some((b) => a.toLowerCase() === b.toLowerCase()),
          )
        )
          continue;
        for (const [id, entry] of Object.entries(entries)) {
          if (
            source.affects?.length &&
            !entry.affects?.some((a) =>
              source.affects!.some((b) => a.toLowerCase() === b.toLowerCase()),
            )
          )
            continue;
          if (
            classes?.length &&
            entry.varies_by_class &&
            !Object.keys(entry.varies_by_class).some((c) =>
              classes.includes(c.toLowerCase()),
            )
          )
            continue;
          result.push([id, entry]);
        }
      }
    }
  }
  return result;
}
export function recordBlocks(text: string, html = false): Map<string, string> {
  const chunks = html
    ? text.split(/(?=<h[23]\b)/)
    : text.split(/(?=^#{2,3} )/m);
  const result = new Map<string, string>();
  for (const chunk of chunks) {
    const id = html
      ? (chunk.match(
          /class="admonition-title"[^>]*>\s*((?:FRD|KSI|[A-Z]{3})-[A-Z0-9-]+)\s*</,
        )?.[1] ??
        chunk.match(
          /<summary[^>]*>\s*((?:FRD|KSI|[A-Z]{3})-[A-Z0-9-]+)\s*</,
        )?.[1])
      : chunk.match(/^(?:!!!|\?\?\?) abstract "([A-Z0-9-]+)"/m)?.[1];
    if (id) {
      if (result.has(id)) throw new Error(`Duplicate rendered record ${id}`);
      result.set(id, chunk);
    }
  }
  return result;
}
function entryText(entry: RuleEntry, classes?: string[]): string[] {
  const values = [
    entry.name,
    entry.statement,
    entry.note,
    entry.danger,
    entry.reference,
    entry.schema?.name,
    // Notification names may lose terminal punctuation before appended destination details.
    ...(entry.notification ?? []).map((n) => n.name.replace(/[.!?]+$/, "")),
    ...Object.values(entry.rev5_controls_list ?? {}).flat(),
    ...(entry.notes ?? []),
    ...(entry.following_information ?? []),
    ...(entry.following_information_bullets ?? []),
    ...(entry.corrective_actions ?? []),
  ];
  for (const [key, variant] of Object.entries(entry.varies_by_class ?? {})) {
    if (
      !classes?.length ||
      classes.some((c) => c.toLowerCase() === key.toLowerCase())
    )
      values.push(...entryText(variant));
  }
  for (const variant of Object.values(entry.varies_by_level ?? {}))
    values.push(...entryText(variant));
  for (const example of entry.examples ?? [])
    values.push(...(example.key_tests ?? []), ...(example.examples ?? []));
  for (const change of entry.updated ?? [])
    values.push(change.comment, change.date);
  return values.filter((x): x is string => Boolean(x));
}
export function assertStatement(
  block: string,
  source: string | undefined,
  where: string,
  html = false,
) {
  if (!source?.trim()) return;
  const expected = source
    .split(/\n\s*\n/)
    .map(markdownText)
    .filter(Boolean);
  const quote = html
    ? block.split(/<div class="admonition quote">/)[1]
    : block.split('!!! quote ""')[1];
  expect(quote, `${where}: missing statement quote`).toBeDefined();
  const actual = html
    ? [
        ...quote!.matchAll(
          /<p(?![^>]*class="admonition-title")[^>]*>([\s\S]*?)<\/p>/g,
        ),
      ]
        .slice(0, expected.length)
        .map((m) => htmlText(m[1]!))
    : quote!
        .trim()
        .split(/\n\s*\n/)
        .slice(0, expected.length)
        .map(markdownText);
  expect(actual, `${where}: exact statement paragraphs`).toEqual(expected);
}
export function assertRecords(
  text: string,
  entries: Array<[string, RuleEntry]>,
  where: string,
  html = false,
  classes?: string[],
) {
  const blocks = recordBlocks(text, html);
  expect(
    [...blocks.keys()].sort(),
    `${where}: exact record membership`,
  ).toEqual(entries.map(([id]) => id).sort());
  for (const [id, entry] of entries) {
    assertStatement(blocks.get(id)!, entry.statement, `${where}: ${id}`, html);
    for (const value of entryText(entry, classes))
      assertText(blocks.get(id)!, value, `${where}: ${id}: ${value}`, html);
  }
}
export async function assertArtifactSource(
  artifact: BuildArtifact,
  text: string,
  html = false,
  snapshot?: Awaited<ReturnType<typeof sources>>,
) {
  const { rules, config, catalog, navigation } = snapshot ?? (await sources());
  const where = artifact.relativePath;
  if (html) text = mainHtml(text);
  else {
    const policy = config.generated.search;
    if (
      policy &&
      ["FRR", "KSI", "CTL", "CTL_REFERENCE"].includes(artifact.documentType)
    ) {
      const included = new Set<string>();
      const project = navigation.project as { nav: unknown[] };
      const pages = (node: unknown): void => {
        if (typeof node === "string") included.add(node);
        else if (Array.isArray(node)) node.forEach(pages);
        else if (node && typeof node === "object")
          Object.values(node).forEach(pages);
      };
      for (const section of policy.includedNavigationSections) {
        let node: unknown = project.nav;
        for (const label of section) {
          const entries: unknown[] = Array.isArray(node) ? node : [node];
          const matches = entries.filter(
            (entry): entry is Record<string, unknown> =>
              Boolean(entry && typeof entry === "object" && label in entry),
          );
          expect(
            matches.length,
            `navigation section ${section.join(" / ")}`,
          ).toBe(1);
          node = matches[0]![label];
        }
        pages(node);
      }
      const excluded = !included.has(where);
      expect(
        /search:\s*\n  exclude: true/.test(text.split("---")[1] ?? ""),
        `${where}: search policy`,
      ).toBe(excluded);
    }
  }
  await assertTables(artifact, text, html, snapshot);
  if (artifact.documentType === "FRR") {
    const mapping = [
      ...config.generated.ruleDocuments,
      ...(config.generated.frrCollectionDocuments ?? []),
    ].find((m) => m.id === artifact.mappingId)!;
    if (
      "relatedRulesOutput" in mapping &&
      mapping.relatedRulesOutput === artifact.relativePath
    ) {
      const selected = selectedRules(rules, mapping.source);
      const all = selectedRules(rules, { types: ["all"] });
      const existing = new Set(selected.map(([id]) => id));
      const related = new Set(
        selected
          .flatMap(([, e]) => e.related ?? [])
          .filter((id) => !existing.has(id)),
      );
      assertRecords(
        text,
        all.filter(([id]) => related.has(id)),
        where,
        html,
        mapping.source.classes,
      );
    } else {
      const entries = selectedRules(
        rules,
        mapping.source,
        artifact.sourceDocument,
      );
      assertRecords(text, entries, where, html, mapping.source.classes);
      if (artifact.sourceDocument) {
        const doc = rules.FRR[artifact.sourceDocument]!;
        assertText(text, doc.info.name, `${where}: ruleset title`, html);
        assertText(text, doc.info.purpose, `${where}: ruleset purpose`, html);
      }
    }
  } else if (artifact.documentType === "FRD") {
    const mapping = config.generated.definitionDocuments?.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const entries = buckets(mapping.source).flatMap((bucket) =>
      Object.entries(rules.FRD.data[bucket as "all"] ?? {}),
    );
    const blocks = recordBlocks(text, html);
    expect([...blocks.keys()].sort(), where).toEqual(
      entries.map(([id]) => id).sort(),
    );
    for (const [id, entry] of entries)
      for (const value of [
        entry.term,
        entry.definition,
        entry.note,
        ...(entry.notes ?? []),
        ...(entry.alts ?? []),
      ])
        assertText(blocks.get(id)!, value, `${where}: ${id}`, html);
    expect([...blocks.keys()], `${where}: alphabetical definitions`).toEqual(
      [...entries]
        .sort(([, a], [, b]) => a.term.localeCompare(b.term))
        .map(([id]) => id),
    );
    if (!html) {
      const groups = new Map<string, string[]>();
      for (const [, entry] of entries)
        if (entry.tag?.trim())
          groups.set(entry.tag.trim(), [
            ...(groups.get(entry.tag.trim()) ?? []),
            entry.term,
          ]);
      for (const [tag, terms] of groups) {
        const anchor = `related-terms-group-${slug(tag)}`;
        expect(text, `${where}: related terms ${tag}`).toContain(
          `<span id="${anchor}"></span>${tag}`,
        );
        for (const term of terms)
          expect(text, `${where}: related term ${term}`).toContain(
            `[${term}](#${slug(term)}){ data-preview }`,
          );
      }
    }
    for (const [id, entry] of entries)
      assertStatement(
        blocks.get(id)!,
        entry.definition,
        `${where}: ${id}`,
        html,
      );
    assertText(text, rules.FRD.info.purpose, where, html);
  } else if (artifact.documentType === "KSI") {
    const mapping = config.generated.ksiDocuments?.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const keys = artifact.sourceDocument
      ? [artifact.sourceDocument]
      : mapping.source.themes === "ALL"
        ? Object.keys(rules.KSI)
        : (mapping.source.themes ?? [mapping.source.theme!]);
    const relatedMapping = config.generated.ruleDocuments.find(
      (m) => m.id === mapping.relatedIndicatorsFromRuleDocumentMappingId,
    );
    const related = relatedMapping
      ? new Set(
          selectedRules(rules, relatedMapping.source).flatMap(
            ([, entry]) => entry.related ?? [],
          ),
        )
      : undefined;
    const entries = keys
      .flatMap((key) => Object.entries(rules.KSI[key]!.indicators))
      .filter(
        ([id, entry]) =>
          (!related || related.has(id)) &&
          (!mapping.source.classes?.length ||
            !entry.varies_by_class ||
            Object.keys(entry.varies_by_class).some((c) =>
              mapping.source.classes!.some(
                (v) => v.toLowerCase() === c.toLowerCase(),
              ),
            )),
      );
    assertRecords(text, entries, where, html, mapping.source.classes);
    for (const key of keys)
      if (
        entries.some(([id]) => Object.hasOwn(rules.KSI[key]!.indicators, id))
      ) {
        assertText(text, rules.KSI[key]!.name, `${where}: theme name`, html);
        assertText(
          text,
          rules.KSI[key]!.theme,
          `${where}: theme description`,
          html,
        );
      }
  } else if (
    artifact.documentType === "CTL" ||
    artifact.documentType === "CTL_REFERENCE"
  ) {
    const full = artifact.documentType === "CTL_REFERENCE";
    const mapping = [
      ...(config.generated.controlDocuments ?? []),
      ...(config.generated.fullControlReferenceDocuments ?? []),
    ].find((m) => m.id === artifact.mappingId)!;
    const familyKeys = artifact.sourceDocument
      ? [artifact.sourceDocument]
      : mapping.source.families === "ALL"
        ? [...catalog.families.keys()]
        : mapping.source.families;
    const isIndex = full && !artifact.sourceDocument;
    const baseline =
      rules.FRR.FRC?.data.rev5?.CSF?.["FRC-CSF-BSL"]?.varies_by_class ?? {};
    const controlSections = new Map<string, string>();
    if (!isIndex)
      for (const chunk of text.split(html ? /(?=<h[23]\b)/ : /(?=^#{2,3} )/m)) {
        const rawId = full
          ? html
            ? chunk.match(/^<h2[^>]*id="([^"]+)"/)?.[1]
            : chunk.match(/^## .*\{ #([^ }]+)/)?.[1]
          : html
            ? chunk.match(/<summary[^>]*>\s*([A-Z]{2}-[0-9() -]+)\s*</)?.[1]
            : chunk.match(/abstract "([A-Z]{2}-[0-9() -]+)"/)?.[1];
        if (rawId && /^[a-z]{2}-\d/i.test(rawId)) {
          const id = normalizeOscalControlId(rawId);
          expect(
            controlSections.has(id),
            `${where}: duplicate control ${id}`,
          ).toBe(false);
          controlSections.set(id, chunk);
        }
      }
    const expectedControlIds: string[] = [];
    for (const key of familyKeys) {
      const family = catalog.families.get(key)!;
      const controls = [...family.controls.values()].filter((c) =>
        full ? c.status !== "withdrawn" : Boolean(rules.CTL[key]?.[c.id]),
      );
      if (!controls.length) continue;
      assertText(text, family.title, where, html);
      if (isIndex) {
        const actual = artifact.context.controlFamilies.find(
          (f) => f.id === key,
        )!;
        expect(actual.controlCount, `${where}: ${key}`).toBe(controls.length);
        continue;
      }
      for (const control of controls) {
        expectedControlIds.push(control.id);
        const section = controlSections.get(control.id);
        expect(
          section,
          `${where}: missing control ${control.id}`,
        ).toBeDefined();
        assertText(section!, control.title, `${where}: ${control.id}`, html);
        for (const line of control.statementLines)
          assertText(
            section!,
            line,
            `${where}: ${control.id}: statement`,
            html,
          );
        const source = rules.CTL[key]?.[control.id];
        for (const data of [
          source,
          ...Object.values(source?.varies_by_class ?? {}),
        ]) {
          for (const line of data?.guidance ?? [])
            assertText(
              section!,
              line,
              `${where}: ${control.id}: guidance`,
              html,
            );
          for (const param of data?.parameters ?? [])
            assertText(
              section!,
              param.value,
              `${where}: ${control.id}: ${param.parameterId}`,
              html,
            );
        }
        if (full) {
          const expected = Object.entries(baseline)
            .filter(([, v]) =>
              Object.values(v.rev5_controls_list ?? {})
                .flat()
                .some((id) => normalizeOscalControlId(id) === control.id),
            )
            .map(([c]) => `Class ${c.toUpperCase()}`);
          const actual = artifact.context.controlFamilies
            .flatMap((f) => f.controls)
            .find((c) => c.id === control.id)!;
          expect(
            actual.baselineClasses,
            `${where}: ${control.id}: baseline`,
          ).toEqual(expected);
          const renderedClasses = [
            ...section!.matchAll(/class="subset-applicability__tag">([^<]+)</g),
          ].map((m) => m[1]!);
          expect(
            renderedClasses,
            `${where}: ${control.id}: rendered baseline`,
          ).toEqual(expected);
        }
      }
    }
    if (!isIndex)
      expect(
        [...controlSections.keys()].sort(),
        `${where}: exact control membership`,
      ).toEqual(expectedControlIds.sort());
  }
}
export function normalizeManual(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^<span class="picto">.+<\/span>\n*/gm, "")
    .replace(/^(---\n[\s\S]*?\n---)\n*/, "$1\n\n")
    .trimEnd();
}
export function assertManualCopy(
  source: Buffer,
  output: Buffer | undefined,
  filename: string,
) {
  expect(output, `${filename}: missing copied source`).toBeDefined();
  if (filename.endsWith(".md"))
    expect(normalizeManual(output!.toString()), filename).toBe(
      normalizeManual(source.toString()),
    );
  else
    expect(output!.equals(source), `${filename}: changed asset bytes`).toBe(
      true,
    );
}

export function expectedTrigrams(
  rules: Rules,
  config: Awaited<ReturnType<typeof sources>>["config"],
  mapping = config.generated.trigramDocuments![0]!,
) {
  const relative = (target: string) =>
    path.posix.relative(path.posix.dirname(mapping.output), target);
  const definitions = config.generated.definitionDocuments!.find(
    (m) => m.id === mapping.definitionDocumentMappingId,
  )!;
  const ruleMapping = config.generated.ruleDocuments.find(
    (m) => m.id === mapping.ruleDocumentMappingId,
  )!;
  const ksiMapping = config.generated.ksiDocuments!.find(
    (m) => m.id === mapping.ksiDocumentMappingId,
  )!;
  const rulePath = (key: string) =>
    ruleMapping.output.replace(
      /\{FRR\}|\{document\}/g,
      rules.FRR[key]!.info.web_name.toLowerCase(),
    );
  const rows: Array<{
    trigram: string;
    name: string;
    type: "Collection" | "Ruleset" | "Ruleset subset" | "KSI theme";
    href?: string;
  }> = [
    {
      trigram: rules.FRD.info.short_name!,
      name: rules.FRD.info.name,
      type: "Collection",
      href: relative(definitions.output),
    },
  ];
  const mappings = Object.values(config.generated)
    .filter(Array.isArray)
    .flat() as Array<{ id: string; output: string }>;
  for (const collection of mapping.collections)
    rows.push({
      trigram: collection.trigram,
      name: collection.name,
      type: "Collection",
      href: relative(
        mappings.find((m) => m.id === collection.mappingId)!.output,
      ),
    });
  const subsets = new Map<string, Array<{ key: string; name: string }>>();
  for (const [key, doc] of Object.entries(rules.FRR).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    rows.push({
      trigram: doc.info.short_name ?? key,
      name: doc.info.name,
      type: "Ruleset",
      href: relative(rulePath(key)),
    });
    for (const [id, subset] of Object.entries(doc.info.subsets ?? {}))
      subsets.set(id, [
        ...(subsets.get(id) ?? []),
        { key, name: subset.name ?? id },
      ]);
  }
  for (const [id, occurrences] of subsets)
    rows.push({
      trigram: id,
      name: occurrences[0]!.name,
      type: "Ruleset subset",
      href:
        occurrences.length === 1
          ? `${relative(rulePath(occurrences[0]!.key))}#${slug(occurrences[0]!.name)}`
          : undefined,
    });
  for (const [key, theme] of Object.entries(rules.KSI))
    rows.push({
      trigram: theme.short_name ?? key,
      name: theme.name,
      type: "KSI theme",
      href: `${relative(ksiMapping.output)}#${slug(theme.name)}`,
    });
  return rows.sort((a, b) => a.trigram.localeCompare(b.trigram, "en"));
}

export function tableRows(text: string, html = false): string[][] {
  if (html)
    return [...text.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)]
      .filter((m) => m[1]!.includes("<td"))
      .map((m) =>
        [...m[1]!.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
          htmlText(c[1]!),
        ),
      );
  return text
    .split("\n")
    .filter((line) => /^\|/.test(line) && !/^\|\s*:?-/.test(line))
    .map((line) =>
      line
        .slice(1, line.lastIndexOf("|"))
        .split(/(?<!\\)\|/)
        .map(markdownText),
    )
    .filter((cells) => !["Ruleset", "Acronym", "Trigram"].includes(cells[0]!));
}
export async function assertTables(
  artifact: BuildArtifact,
  text: string,
  html: boolean,
  snapshot?: Awaited<ReturnType<typeof sources>>,
) {
  const { config, rules } = snapshot ?? (await sources());
  const rows = tableRows(text, html);
  const where = artifact.relativePath;
  if (artifact.documentType === "TRIGRAMS") {
    const mapping = config.generated.trigramDocuments!.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const expected = expectedTrigrams(rules, config, mapping);
    expect(rows, where).toEqual(
      expected.map((row) => [row.trigram, markdownText(row.name), row.type]),
    );
    for (const row of expected.filter((r) => r.href)) {
      const href = html ? renderedHref(where, row.href!) : row.href!;
      expect(text, `${where}: ${row.trigram} destination`).toContain(
        html ? `href="${href}"` : `](${href})`,
      );
    }
  }
  if (artifact.documentType === "DEADLINES") {
    const mapping = config.generated.deadlineDocuments!.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const types = buckets({ types: mapping.source.types, includeAll: false });
    const type =
      types.find(
        (t) => where === mapping.output.replace(/\{type\}|\{version\}/g, t),
      ) ?? types[0]!;
    const expected = documentKeys(rules, mapping.source)
      .flatMap((key) => {
        const doc = rules.FRR[key]!;
        if (
          mapping.source.affects?.length &&
          !selectedRules(
            rules,
            { types: mapping.source.types, affects: mapping.source.affects },
            key,
          ).length
        )
          return [];
        const effective =
          doc.info.effective ?? doc.info[type as "20x" | "rev5"]?.effective;
        if (!effective) return [];
        const date = effective.date;
        const label = doc.info.short_name
          ? `${doc.info.name} (${doc.info.short_name})`
          : doc.info.name;
        const grace =
          date?.grace?.default === undefined
            ? ""
            : date.grace.until_next_assessment
              ? `On the first FedRAMP independent assessment started after ${date.grace.default}`
              : String(date.grace.default);
        return [
          [
            label,
            String(date?.optional_adoption ?? ""),
            String(date?.obtain ?? ""),
            String(date?.maintain ?? ""),
            grace,
          ],
        ];
      })
      .sort((a, b) =>
        !a[3] ? (!b[3] ? 0 : 1) : !b[3] ? -1 : a[3].localeCompare(b[3]),
      );
    expect(rows, where).toEqual(expected.map((row) => row.map(markdownText)));
  }
  if (artifact.documentType === "FRR_TAGGED_SUMMARY") {
    const mapping = config.generated.taggedDocumentSummaries!.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const tags = mapping.source.tags ?? [mapping.source.tag!];
    const expected = documentKeys(rules, mapping.source)
      .filter((key) => tags.includes(rules.FRR[key]!.info.tag!))
      .map((key) => ({
        doc: rules.FRR[key]!,
        entries: selectedRules(rules, mapping.source, key),
      }))
      .filter((item) => item.entries.length);
    expect(rows.length, where).toBe(expected.length);
    for (const { doc, entries } of expected) {
      const row = rows.find((row) => row[0]?.includes(doc.info.name));
      expect(row, `${where}: ${doc.info.name}`).toBeDefined();
      expect(row![1], where).toContain(markdownText(doc.info.purpose ?? ""));
      expect(row![1], where).toContain(`Applicable Rules: ${entries.length}`);
    }
    assertText(
      text,
      `There are ${expected.length} applicable rulesets with ${expected.reduce((n, item) => n + item.entries.length, 0)} total applicable rules.`,
      where,
      html,
    );
  }
  if (artifact.documentType === "FRR_REFERENCE_INDEX") {
    const mapping = config.generated.referenceIndexDocuments!.find(
      (m) => m.id === artifact.mappingId,
    )!;
    const expected = documentKeys(rules, mapping.source)
      .map((key) => ({
        doc: rules.FRR[key]!,
        entries: selectedRules(rules, mapping.source, key),
      }))
      .filter((item) => item.entries.length);
    expect(rows.length, where).toBe(expected.length);
    for (const { doc, entries } of expected) {
      const row = rows.find((row) => row[0] === doc.info.short_name);
      expect(row, `${where}: ${doc.info.short_name}`).toBeDefined();
      expect(row![1], where).toContain(doc.info.name);
      expect(row![2], where).toBe(
        doc.info.status
          ? doc.info.status[0]!.toUpperCase() + doc.info.status.slice(1)
          : "Unknown",
      );
      expect(row![3], where).toContain(`Rules: ${entries.length}`);
      const dates = entries
        .flatMap(([, e]) => (e.updated ?? []).map((c) => c.date ?? ""))
        .sort();
      expect(row![4], where).toBe(dates.at(-1) ?? "");
    }
  }
}

export async function expectedOutputPaths() {
  const { rules, config, catalog } = await sources();
  const paths: string[] = [];
  const add = (output: string, count: number, behavior?: string) => {
    if (count || behavior !== "skip") paths.push(output);
  };
  for (const mapping of config.generated.definitionDocuments ?? [])
    add(
      mapping.output,
      buckets(mapping.source).flatMap((b) =>
        Object.keys(rules.FRD.data[b as "all"] ?? {}),
      ).length,
      mapping.emptyBehavior,
    );
  for (const mapping of config.generated.ruleDocuments) {
    const entries = selectedRules(rules, mapping.source);
    if (mapping.outputMode === "documents") {
      for (const key of documentKeys(rules, mapping.source)) {
        const name = rules.FRR[key]!.info.web_name.toLowerCase();
        const output = /\{FRR\}|\{document\}/.test(mapping.output)
          ? mapping.output.replace(/\{FRR\}|\{document\}/g, name)
          : `${mapping.output.replace(/\/$/, "")}/${name}.md`;
        add(
          output,
          selectedRules(rules, mapping.source, key).length,
          mapping.emptyBehavior,
        );
      }
    } else add(mapping.output, entries.length, mapping.emptyBehavior);
    if (mapping.relatedRulesOutput) {
      const included = new Set(entries.map(([id]) => id));
      const all = new Set(
        selectedRules(rules, { types: ["all"] }).map(([id]) => id),
      );
      const missing = entries
        .flatMap(([, e]) => e.related ?? [])
        .filter((id) => all.has(id) && !included.has(id));
      add(mapping.relatedRulesOutput, missing.length, "skip");
    }
  }
  for (const mapping of config.generated.frrCollectionDocuments ?? [])
    add(
      mapping.output,
      selectedRules(rules, mapping.source).length,
      mapping.emptyBehavior,
    );
  for (const mapping of config.generated.ksiDocuments ?? []) {
    const keys =
      mapping.source.themes === "ALL"
        ? Object.keys(rules.KSI)
        : (mapping.source.themes ?? [mapping.source.theme!]);
    const ruleMapping = config.generated.ruleDocuments.find(
      (m) => m.id === mapping.relatedIndicatorsFromRuleDocumentMappingId,
    );
    const related = ruleMapping
      ? new Set(
          selectedRules(rules, ruleMapping.source).flatMap(
            ([, e]) => e.related ?? [],
          ),
        )
      : undefined;
    const count = (key: string) =>
      Object.entries(rules.KSI[key]!.indicators).filter(
        ([id, e]) =>
          (!related || related.has(id)) &&
          (!mapping.source.classes?.length ||
            !e.varies_by_class ||
            Object.keys(e.varies_by_class).some((c) =>
              mapping.source.classes!.some(
                (x) => x.toLowerCase() === c.toLowerCase(),
              ),
            )),
      ).length;
    if (mapping.outputMode === "single")
      add(
        mapping.output,
        keys.reduce((n, k) => n + count(k), 0),
        related ? "skip" : mapping.emptyBehavior,
      );
    else
      for (const key of keys) {
        const name = rules.KSI[key]!.web_name.toLowerCase();
        const output = /\{KSI\}|\{theme\}/.test(mapping.output)
          ? mapping.output.replace(/\{KSI\}|\{theme\}/g, name)
          : `${mapping.output.replace(/\/$/, "")}/${name}.md`;
        add(output, count(key), related ? "skip" : mapping.emptyBehavior);
      }
  }
  for (const mapping of config.generated.controlDocuments ?? []) {
    const keys =
      mapping.source.families === "ALL"
        ? Object.keys(rules.CTL)
        : mapping.source.families;
    if (mapping.outputMode !== "families")
      add(
        mapping.output,
        keys.reduce((n, k) => n + Object.keys(rules.CTL[k] ?? {}).length, 0),
        mapping.emptyBehavior,
      );
    else
      for (const key of keys) {
        const name = slug(catalog.families.get(key)!.title);
        const output = /\{CTL\}|\{family\}/.test(mapping.output)
          ? mapping.output.replace(/\{CTL\}|\{family\}/g, name)
          : `${mapping.output.replace(/\/$/, "")}/${name}.md`;
        add(
          output,
          Object.keys(rules.CTL[key] ?? {}).length,
          mapping.emptyBehavior,
        );
      }
  }
  for (const mapping of config.generated.fullControlReferenceDocuments ?? []) {
    paths.push(path.posix.join(mapping.output, "index.md"));
    for (const key of mapping.source.families === "ALL"
      ? [...catalog.families.keys()]
      : mapping.source.families)
      paths.push(
        path.posix.join(
          mapping.output,
          `${slug(catalog.families.get(key)!.title)}.md`,
        ),
      );
  }
  for (const mapping of config.generated.deadlineDocuments ?? []) {
    const types = buckets({ types: mapping.source.types, includeAll: false });
    for (const type of types) {
      const count = documentKeys(rules, mapping.source).filter((key) => {
        const doc = rules.FRR[key]!;
        const audienceMatches =
          !mapping.source.affects?.length ||
          buckets({ types: mapping.source.types }).some((b) =>
            Object.values(doc.data[b as "all"] ?? {}).some((section) =>
              Object.values(section).some((e) =>
                e.affects?.some((a) => mapping.source.affects!.includes(a)),
              ),
            ),
          );
        return (
          audienceMatches &&
          (doc.info.effective || doc.info[type as "20x" | "rev5"]?.effective)
        );
      }).length;
      const output = /\{type\}|\{version\}/.test(mapping.output)
        ? mapping.output.replace(/\{type\}|\{version\}/g, type)
        : types.length === 1
          ? mapping.output
          : `${mapping.output.replace(/\/$/, "")}/${type}.md`;
      add(output, count, "skip");
    }
  }
  for (const mapping of config.generated.referenceIndexDocuments ?? [])
    add(
      mapping.output,
      selectedRules(rules, mapping.source).length,
      mapping.emptyBehavior,
    );
  for (const mapping of config.generated.taggedDocumentSummaries ?? []) {
    const tags = mapping.source.tags ?? [mapping.source.tag!];
    const count = documentKeys(rules, mapping.source).filter(
      (k) =>
        tags.includes(rules.FRR[k]!.info.tag!) &&
        selectedRules(rules, mapping.source, k).length,
    ).length;
    add(mapping.output, count, mapping.emptyBehavior);
  }
  for (const mapping of config.generated.trigramDocuments ?? [])
    paths.push(mapping.output);
  return paths.sort();
}

export function renderedHref(from: string, href: string): string {
  if (/^(?:[a-z]+:|\/|#)/i.test(href)) return href;
  const [filename, hash] = href.split("#");
  if (!filename) return href;
  const target = path.posix
    .normalize(path.posix.join(path.posix.dirname(from), filename))
    .replace(/(?:index)?\.md$/, "");
  const origin = from.endsWith("index.md")
    ? path.posix.dirname(from)
    : from.replace(/\.md$/, "");
  let relative = path.posix.relative(origin, target) || ".";
  if (
    (filename.endsWith("/") || filename.endsWith(".md")) &&
    !relative.endsWith("/")
  )
    relative += "/";
  return relative + (hash ? `#${hash}` : "");
}
export function assertManualHtml(
  source: string,
  html: string,
  filename: string,
) {
  const rendered = mainHtml(html);
  const body = source
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const prose = body.replace(/```[\s\S]*?```/g, "");
  for (const block of prose.split(/\n\s*\n/)) {
    const paragraph = block.replace(/^\s*(?:!!!|\?\?\?|===).*$/gm, "").trim();
    if (/^[A-Za-z]/.test(paragraph) && !paragraph.includes("|"))
      assertText(
        rendered,
        paragraph,
        `content/${filename}: rendered source text`,
        true,
      );
    // Headings and individual list items are checked separately from paragraphs.
    for (const line of paragraph.split(/(?=^\s*(?:#{1,6} |[-*] |\d+\. ))/m))
      if (/^\s*(?:#{1,6} |[-*] |\d+\. )/.test(line))
        assertText(
          rendered,
          line.replace(/^\s*(?:#{1,6} |[-*] |\d+\. )/, ""),
          `content/${filename}: heading/list`,
          true,
        );
  }
  for (const line of prose
    .split("\n")
    .filter((line) => /^\|/.test(line) && !/^\|\s*:?-/.test(line))) {
    for (const cell of line.slice(1, line.lastIndexOf("|")).split(/(?<!\\)\|/))
      assertText(rendered, cell, `content/${filename}: table cell`, true);
  }
  for (const match of body.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    const escaped = match[1]!
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    expect(htmlText(rendered), `content/${filename}: fenced content`).toContain(
      htmlText(escaped),
    );
  }
  const links: string[] = [];
  new HTMLRewriter()
    .on("a", {
      element(e) {
        const href = e.getAttribute("href");
        if (href) links.push(href);
      },
    })
    .transform(
      Bun.markdown.html(
        body.replace(/^\[\^[^\]]+\]:.*$/gm, "").replace(/\[\^[^\]]+\]/g, ""),
      ),
    );
  for (const href of links) {
    const expected = renderedHref(filename, href);
    expect(rendered, `content/${filename}: link ${href}`).toContain(
      `href="${expected}"`,
    );
  }
}
