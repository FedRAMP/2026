import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");

export const RULES_FILE = path.join(
  ROOT_DIR,
  "rules",
  "fedramp-consolidated-rules.json",
);
const TEMPLATE_FILE = path.join(ROOT_DIR, "templates", "template.hbs");
const PARTIALS_DIR = path.join(ROOT_DIR, "templates", "partials");
export const OUTPUT_DIR = path.join(ROOT_DIR, "output");

type Version = "20x" | "rev5";
type EffectiveAudience = Version | "both";

interface RulesDocument {
  info?: {
    title?: string;
    description?: string;
    version?: string;
    last_updated?: string;
  };
  FRD: DefinitionsSource;
  FRR: Record<string, RequirementDocumentSource>;
  KSI: Record<string, KsiThemeSource>;
}

interface EffectiveEntrySource {
  is?: string;
  current_status?: string;
  date?: Record<string, number | string>;
  class?: Record<
    string,
    {
      applies_in_full?: boolean;
      applies?: string[];
    }
  >;
  comments?: string[];
  signup_url?: string;
  warnings?: string[];
}

interface InfoSource {
  name: string;
  short_name?: string;
  web_name: string;
  effective?: Partial<Record<EffectiveAudience, EffectiveEntrySource>>;
  labels?: Record<string, { name?: string; description?: string }>;
}

interface ChangeLogSource {
  date?: string;
  comment?: string;
  prev?: string;
}

interface ExampleSource {
  id?: string;
  key_tests?: string[];
  examples?: string[];
}

interface LegacyPainTimeframeSource {
  pain?: number | string;
  max_days_irv_lev?: number | string;
  max_days_nirv_lev?: number | string;
  max_days_nlev?: number | string;
}

interface PainTimeframeEntrySource {
  timeframe_type?: string;
  timeframe_num?: number | string;
  description?: string;
}

type PainTimeframesSource =
  | LegacyPainTimeframeSource[]
  | Record<string, Record<string, PainTimeframeEntrySource>>;

interface VariantSource {
  statement?: string;
  effective_date?: Record<string, number | string>;
  timeframe_type?: string;
  timeframe_num?: number | string;
  pain_timeframes?: PainTimeframesSource;
}

interface NotificationSource {
  party?: string;
  method?: string;
  target?: string;
}

interface RequirementEntrySource {
  name?: string;
  statement?: string;
  following_information?: string[];
  following_information_bullets?: string[];
  varies_by_class?: Record<string, VariantSource>;
  varies_by_level?: Record<string, VariantSource>;
  effective_date?: Record<string, number | string>;
  timeframe_type?: string;
  timeframe_num?: number | string;
  note?: string;
  notes?: string[];
  danger?: string;
  notification?: NotificationSource[];
  corrective_actions?: string[];
  affects?: string[];
  controls?: string[];
  reference?: string;
  reference_url?: string;
  reference_url_web_name?: string;
  terms?: string[];
  examples?: ExampleSource[];
  updated?: ChangeLogSource[];
  fka?: string;
}

interface DefinitionsSource {
  info: InfoSource;
  data: {
    both?: Record<string, DefinitionEntrySource>;
  };
}

interface DefinitionEntrySource {
  term: string;
  definition?: string;
  note?: string;
  notes?: string[];
  tag?: string;
  reference?: string;
  reference_url?: string;
  referenceurl?: string;
  alts?: string[];
  updated?: ChangeLogSource[];
  fka?: string;
}

interface RequirementDocumentSource {
  info: InfoSource;
  data: Partial<
    Record<
      Version | "both",
      Record<string, Record<string, RequirementEntrySource>>
    >
  >;
}

interface KsiThemeSource {
  id?: string;
  name: string;
  web_name: string;
  short_name?: string;
  theme?: string;
  indicators: Record<string, RequirementEntrySource>;
}

interface EffectiveEntryViewModel {
  audienceLabel: string;
  statusLabel: string;
  currentStatus?: string;
  dateLines: Array<{ label: string; value: string }>;
  classLines: Array<{ label: string; value: string }>;
  comments: string[];
  signupUrl?: string;
  warnings: string[];
}

interface PainTimeframeColumnViewModel {
  label: string;
}

interface PainTimeframeRowViewModel {
  pain: string;
  cells: string[];
}

interface VariantViewModel {
  title: string;
  statementParagraphs: string[];
  effectiveDateLines: Array<{ label: string; value: string }>;
  timeframe?: string;
  painTimeframeColumns: PainTimeframeColumnViewModel[];
  painTimeframeRows: PainTimeframeRowViewModel[];
}

interface ExampleViewModel {
  title: string;
  keyTests: string[];
  examples: string[];
}

interface TermLinkViewModel {
  label: string;
  href: string;
}

interface NotificationViewModel {
  party: string;
  method: string;
  target: string;
}

interface RequirementViewModel {
  id: string;
  title: string;
  formerId?: string;
  changelog: Array<{
    date: string;
    comment: string;
    previousValue?: string;
  }>;
  statementParagraphs: string[];
  variantSections: VariantViewModel[];
  effectiveDateLines: Array<{ label: string; value: string }>;
  timeframe?: string;
  numberedItems: string[];
  bulletItems: string[];
  noteParagraphs: string[];
  notes: string[];
  dangerParagraphs: string[];
  notifications: NotificationViewModel[];
  correctiveActions: string[];
  affects: string[];
  controlLinks: Array<{ label: string; url: string }>;
  reference?: { label: string; url: string };
  examples: ExampleViewModel[];
  terms: TermLinkViewModel[];
}

interface DefinitionViewModel {
  id: string;
  anchorId: string;
  term: string;
  formerId?: string;
  changelog: Array<{
    date: string;
    comment: string;
    previousValue?: string;
  }>;
  definitionParagraphs: string[];
  noteParagraphs: string[];
  notes: string[];
  reference?: { label: string; url: string };
  alternateTerms: string[];
}

interface DefinitionSectionViewModel {
  title: string;
  definitions: DefinitionViewModel[];
}

interface SectionViewModel {
  title: string;
  descriptionParagraphs: string[];
  requirements: RequirementViewModel[];
}

interface DocumentViewModel {
  title: string;
  effectiveEntries: EffectiveEntryViewModel[];
  isDefinitionDocument: boolean;
  isRequirementsDocument: boolean;
  isKsiDocument: boolean;
  definitionSections: DefinitionSectionViewModel[];
  sections: SectionViewModel[];
  themeParagraphs: string[];
  indicators: RequirementViewModel[];
}

export interface BuildArtifact {
  relativePath: string;
  outputPath: string;
  title: string;
  documentType: "FRD" | "FRR" | "KSI";
  context: DocumentViewModel;
}

export interface BuildSummary {
  artifactCount: number;
  artifacts: BuildArtifact[];
}

const CONTROL_FREAK_BASE_URL = "https://controlfreak.risk-redux.io/controls/";

function splitParagraphs(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function humanizeVersion(version: Version): string {
  return version === "20x" ? "20x" : "Rev5";
}

function humanizeVersions(versions: Version[]): string {
  return versions.map(humanizeVersion).join(" and ");
}

function humanizeStatus(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isApplicable(entry?: EffectiveEntrySource): boolean {
  return Boolean(entry?.is && entry.is.toLowerCase() !== "no");
}

function effectiveEntryForVersion(
  effective:
    | Partial<Record<EffectiveAudience, EffectiveEntrySource>>
    | undefined,
  version: Version,
): EffectiveEntrySource | undefined {
  return effective?.both ?? effective?.[version];
}

function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function controlUrl(controlId: string): string {
  if (controlId.includes(".")) {
    const [main = "", sub = ""] = controlId.split(".");
    const [prefix = "", number = ""] = main.split("-");

    return `${CONTROL_FREAK_BASE_URL}${prefix.toUpperCase()}-${number.padStart(2, "0")}(${sub.padStart(2, "0")})`;
  }

  const [prefix = "", number = ""] = controlId.split("-");
  return `${CONTROL_FREAK_BASE_URL}${prefix.toUpperCase()}-${number.padStart(2, "0")}`;
}

function toDateLines(
  date: Record<string, number | string> | undefined,
): Array<{ label: string; value: string }> {
  return Object.entries(date ?? {}).map(([key, value]) => ({
    label: titleCase(key),
    value: String(value),
  }));
}

function toClassApplicabilityLines(
  classes: EffectiveEntrySource["class"],
): Array<{ label: string; value: string }> {
  return Object.entries(classes ?? {}).map(([className, entry]) => ({
    label: `Class ${className.toUpperCase()}`,
    value: entry.applies_in_full
      ? "Applies in full"
      : `Limited to ${entry.applies?.join(", ") ?? "specified requirements"}`,
  }));
}

function toEffectiveEntries(
  effective:
    | Partial<Record<EffectiveAudience, EffectiveEntrySource>>
    | undefined,
  versions: Version[],
): EffectiveEntryViewModel[] {
  if (effective?.both) {
    return [
      toEffectiveEntryViewModel(effective.both, humanizeVersions(versions)),
    ];
  }

  return versions
    .map((version): EffectiveEntryViewModel | null => {
      const entry = effective?.[version];
      if (!entry) {
        return null;
      }

      return toEffectiveEntryViewModel(entry, humanizeVersion(version));
    })
    .filter((entry): entry is EffectiveEntryViewModel => entry !== null);
}

function toEffectiveEntryViewModel(
  entry: EffectiveEntrySource,
  audienceLabel: string,
): EffectiveEntryViewModel {
  const viewModel: EffectiveEntryViewModel = {
    audienceLabel,
    statusLabel: humanizeStatus(entry.is),
    dateLines: toDateLines(entry.date),
    classLines: toClassApplicabilityLines(entry.class),
    comments: entry.comments ?? [],
    warnings: entry.warnings ?? [],
  };

  if (entry.current_status) {
    viewModel.currentStatus = entry.current_status;
  }

  if (entry.signup_url) {
    viewModel.signupUrl = entry.signup_url;
  }

  return viewModel;
}

function toChangeLog(updated: ChangeLogSource[] = []) {
  return updated
    .filter((entry) => entry.date || entry.comment || entry.prev)
    .map((entry) => ({
      date: entry.date ?? "Undated",
      comment: entry.comment ?? "",
      previousValue: entry.prev,
    }));
}

function formatDuration(
  timeframeType: string | undefined,
  timeframeNum: number | string | undefined,
): string {
  if (timeframeNum === undefined) {
    return "";
  }

  const amount = String(timeframeNum);

  if (timeframeType === "bizdays") {
    return `${amount} business ${amount === "1" ? "day" : "days"}`;
  }

  if (timeframeType === "days") {
    return `${amount} ${amount === "1" ? "day" : "days"}`;
  }

  if (timeframeType === "month" || timeframeType === "months") {
    return `${amount} ${amount === "1" ? "month" : "months"}`;
  }

  return timeframeType ? `${amount} ${timeframeType}` : amount;
}

function formatTimeframe(entry?: PainTimeframeEntrySource): string {
  return formatDuration(entry?.timeframe_type, entry?.timeframe_num);
}

function painTimeframeColumnLabel(key: string): string {
  const labels: Record<string, string> = {
    fir: "Final Incident Report",
    iir: "Initial Incident Report",
    irv_lev: "LEV + IRV",
    nirv_lev: "LEV + NIRV",
    nlev: "NLEV",
    oir: "Ongoing Incident Report",
  };

  return labels[key] ?? titleCase(key);
}

function normalizePainTimeframes(
  painTimeframes?: PainTimeframesSource,
): Pick<VariantViewModel, "painTimeframeColumns" | "painTimeframeRows"> {
  if (!painTimeframes) {
    return { painTimeframeColumns: [], painTimeframeRows: [] };
  }

  if (Array.isArray(painTimeframes)) {
    return {
      painTimeframeColumns: [
        { label: "LEV + IRV" },
        { label: "LEV + NIRV" },
        { label: "NLEV" },
      ],
      painTimeframeRows: painTimeframes.map((timeframe) => ({
        pain: String(timeframe.pain ?? ""),
        cells: [
          String(timeframe.max_days_irv_lev ?? ""),
          String(timeframe.max_days_nirv_lev ?? ""),
          String(timeframe.max_days_nlev ?? ""),
        ],
      })),
    };
  }

  const columnOrder = ["irv_lev", "nirv_lev", "nlev", "iir", "oir", "fir"];
  const columnKeys = Array.from(
    new Set(
      Object.values(painTimeframes).flatMap((group) => Object.keys(group)),
    ),
  ).sort((left, right) => {
    const leftIndex = columnOrder.indexOf(left);
    const rightIndex = columnOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  return {
    painTimeframeColumns: columnKeys.map((key) => ({
      label: painTimeframeColumnLabel(key),
    })),
    painTimeframeRows: Object.entries(painTimeframes)
      .sort(([left], [right]) => Number(right) - Number(left))
      .map(([pain, group]) => ({
        pain,
        cells: columnKeys.map((key) => formatTimeframe(group[key])),
      }))
      .filter((row) => row.cells.some(Boolean)),
  };
}

function buildVariantSections(
  entry: RequirementEntrySource,
): VariantViewModel[] {
  const sections: VariantViewModel[] = [];

  for (const [className, classEntry] of Object.entries(
    entry.varies_by_class ?? {},
  )) {
    const painTimeframes = normalizePainTimeframes(classEntry.pain_timeframes);

    sections.push({
      title: `Class ${className.toUpperCase()}`,
      statementParagraphs: splitParagraphs(classEntry.statement),
      effectiveDateLines: toDateLines(classEntry.effective_date),
      timeframe: formatDuration(classEntry.timeframe_type, classEntry.timeframe_num),
      ...painTimeframes,
    });
  }

  for (const [levelName, levelEntry] of Object.entries(
    entry.varies_by_level ?? {},
  )) {
    const painTimeframes = normalizePainTimeframes(levelEntry.pain_timeframes);

    sections.push({
      title: titleCase(levelName),
      statementParagraphs: splitParagraphs(levelEntry.statement),
      effectiveDateLines: toDateLines(levelEntry.effective_date),
      timeframe: formatDuration(levelEntry.timeframe_type, levelEntry.timeframe_num),
      ...painTimeframes,
    });
  }

  return sections;
}

function toNotifications(
  notifications: NotificationSource[] = [],
): NotificationViewModel[] {
  return notifications.map((notification) => ({
    party: notification.party ?? "",
    method: notification.method ?? "",
    target: notification.target ?? "",
  }));
}

function buildRequirementReference(
  entry: RequirementEntrySource,
  rulesRelativePath: string,
): RequirementViewModel["reference"] {
  if (!entry.reference) {
    return undefined;
  }

  if (entry.reference_url) {
    return {
      label: entry.reference,
      url: entry.reference_url,
    };
  }

  if (entry.reference_url_web_name) {
    return {
      label: entry.reference,
      url: `${rulesRelativePath}${entry.reference_url_web_name}/`,
    };
  }

  return undefined;
}

function buildTermLinks(
  terms: string[] = [],
  definitionsRelativePath: string,
): TermLinkViewModel[] {
  return terms.map((term) => ({
    label: term,
    href: `${definitionsRelativePath}#${slugifyTerm(term)}`,
  }));
}

function buildRequirementViewModel(
  id: string,
  entry: RequirementEntrySource,
  definitionsRelativePath: string,
  rulesRelativePath: string,
): RequirementViewModel {
  return {
    id,
    title: entry.name ?? id,
    formerId: entry.fka,
    changelog: toChangeLog(entry.updated),
    statementParagraphs: splitParagraphs(entry.statement),
    variantSections: buildVariantSections(entry),
    effectiveDateLines: toDateLines(entry.effective_date),
    timeframe: formatDuration(entry.timeframe_type, entry.timeframe_num),
    numberedItems: entry.following_information ?? [],
    bulletItems: entry.following_information_bullets ?? [],
    noteParagraphs: splitParagraphs(entry.note),
    notes: entry.notes ?? [],
    dangerParagraphs: splitParagraphs(entry.danger),
    notifications: toNotifications(entry.notification),
    correctiveActions: entry.corrective_actions ?? [],
    affects: entry.affects ?? [],
    controlLinks: (entry.controls ?? []).map((controlId) => ({
      label: controlId.toUpperCase(),
      url: controlUrl(controlId),
    })),
    reference: buildRequirementReference(entry, rulesRelativePath),
    examples: (entry.examples ?? []).map((example) => ({
      title: example.id ?? "Example",
      keyTests: example.key_tests ?? [],
      examples: example.examples ?? [],
    })),
    terms: buildTermLinks(entry.terms, definitionsRelativePath),
  };
}

function buildDefinitionViewModel(
  id: string,
  entry: DefinitionEntrySource,
): DefinitionViewModel {
  return {
    id,
    anchorId: slugifyTerm(entry.term),
    term: entry.term,
    formerId: entry.fka,
    changelog: toChangeLog(entry.updated),
    definitionParagraphs: splitParagraphs(entry.definition),
    noteParagraphs: splitParagraphs(entry.note),
    notes: entry.notes ?? [],
    reference:
      entry.reference && (entry.reference_url || entry.referenceurl)
        ? {
            label: entry.reference,
            url: entry.reference_url ?? entry.referenceurl ?? "",
          }
        : undefined,
    alternateTerms: entry.alts ?? [],
  };
}

function buildDefinitionSectionViewModels(
  entries: Record<string, DefinitionEntrySource> = {},
): DefinitionSectionViewModel[] {
  const generalDefinitions: DefinitionViewModel[] = [];
  const taggedDefinitions = new Map<string, DefinitionViewModel[]>();

  for (const [id, entry] of Object.entries(entries)) {
    const definition = buildDefinitionViewModel(id, entry);
    const tag = entry.tag?.trim();

    if (!tag) {
      generalDefinitions.push(definition);
      continue;
    }

    const definitions = taggedDefinitions.get(tag) ?? [];
    definitions.push(definition);
    taggedDefinitions.set(tag, definitions);
  }

  const sections: DefinitionSectionViewModel[] = [
    {
      title: "General Terms",
      definitions: generalDefinitions,
    },
  ];

  for (const [tag, definitions] of Array.from(taggedDefinitions.entries()).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    sections.push({
      title: `Specific Terms: ${tag}`,
      definitions,
    });
  }

  return sections;
}

function buildSectionViewModels(
  document: RequirementDocumentSource,
  version: Version,
  definitionsRelativePath: string,
  rulesRelativePath: string,
): SectionViewModel[] {
  const sections = new Map<string, SectionViewModel>();

  for (const bucketName of [version, "both"] as const) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [labelKey, requirements] of Object.entries(bucket)) {
      const existingSection = sections.get(labelKey);
      const label = document.info.labels?.[labelKey];
      const section = existingSection ?? {
        title: label?.name ?? labelKey,
        descriptionParagraphs: splitParagraphs(label?.description),
        requirements: [],
      };

      for (const [id, requirement] of Object.entries(requirements)) {
        section.requirements.push(
          buildRequirementViewModel(
            id,
            requirement,
            definitionsRelativePath,
            rulesRelativePath,
          ),
        );
      }

      sections.set(labelKey, section);
    }
  }

  return Array.from(sections.values());
}

function buildDocumentContext(
  title: string,
  options: Partial<DocumentViewModel>,
): DocumentViewModel {
  return {
    title,
    effectiveEntries: options.effectiveEntries ?? [],
    isDefinitionDocument: options.isDefinitionDocument ?? false,
    isRequirementsDocument: options.isRequirementsDocument ?? false,
    isKsiDocument: options.isKsiDocument ?? false,
    definitionSections: options.definitionSections ?? [],
    sections: options.sections ?? [],
    themeParagraphs: options.themeParagraphs ?? [],
    indicators: options.indicators ?? [],
  };
}

function buildPreviewIndex(artifacts: BuildArtifact[]): string {
  const definitions = artifacts.find(
    (artifact) => artifact.relativePath === "definitions.md",
  );
  const twentyX = artifacts.filter(
    (artifact) =>
      artifact.documentType === "FRR" &&
      artifact.relativePath.startsWith("20x/"),
  );
  const rev5 = artifacts.filter(
    (artifact) =>
      artifact.documentType === "FRR" &&
      artifact.relativePath.startsWith("rev5/"),
  );
  const ksi = artifacts.filter((artifact) =>
    artifact.relativePath.startsWith("20x/key-security-indicators/"),
  );

  const lines = [
    "# FedRAMP Rules Preview",
    "",
    "This page is generated only for quick previewing of markdown files as the Consolidated Rules are edited, it is NOT a final format or structure and only shows rules generated from JSON source.",
    "",
    "Use the sidebar to browse everything under `output/`, or jump in here:",
    "",
  ];

  if (definitions) {
    lines.push("- [Definitions](definitions/)", "");
  }

  if (twentyX.length) {
    lines.push("## 20x", "");
    for (const artifact of twentyX) {
      lines.push(`- [${artifact.title}](${artifact.relativePath})`);
    }
    lines.push("");
  }

  if (rev5.length) {
    lines.push("## Rev5", "");
    for (const artifact of rev5) {
      lines.push(`- [${artifact.title}](${artifact.relativePath})`);
    }
    lines.push("");
  }

  if (ksi.length) {
    lines.push("## Key Security Indicators", "");
    for (const artifact of ksi) {
      lines.push(`- [${artifact.title}](${artifact.relativePath})`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function loadTemplate(): Promise<(context: DocumentViewModel) => string> {
  const engine = Handlebars.create();
  const partialFiles = (await readdir(PARTIALS_DIR)).filter((fileName) =>
    fileName.endsWith(".hbs"),
  );

  for (const partialFile of partialFiles) {
    const partialName = path.basename(partialFile, ".hbs");
    const partialSource = await readFile(
      path.join(PARTIALS_DIR, partialFile),
      "utf8",
    );
    engine.registerPartial(partialName, partialSource);
  }

  const templateSource = await readFile(TEMPLATE_FILE, "utf8");
  return engine.compile(templateSource, {
    noEscape: true,
  });
}

export async function loadRules(): Promise<RulesDocument> {
  const source = await readFile(RULES_FILE, "utf8");
  return JSON.parse(source) as RulesDocument;
}

export function collectArtifacts(rules: RulesDocument): BuildArtifact[] {
  const artifacts: BuildArtifact[] = [];

  artifacts.push({
    relativePath: "definitions.md",
    outputPath: path.join(OUTPUT_DIR, "definitions.md"),
    title: rules.FRD.info.name,
    documentType: "FRD",
    context: buildDocumentContext(rules.FRD.info.name, {
      effectiveEntries: toEffectiveEntries(rules.FRD.info.effective, [
        "20x",
        "rev5",
      ]),
      isDefinitionDocument: true,
      definitionSections: buildDefinitionSectionViewModels(
        rules.FRD.data.both,
      ),
    }),
  });

  for (const document of Object.values(rules.FRR)) {
    for (const version of ["20x", "rev5"] as const) {
      const effectiveEntry = effectiveEntryForVersion(
        document.info.effective,
        version,
      );
      if (!isApplicable(effectiveEntry)) {
        continue;
      }

      artifacts.push({
        relativePath: path.join(version, `${document.info.web_name}.md`),
        outputPath: path.join(
          OUTPUT_DIR,
          version,
          `${document.info.web_name}.md`,
        ),
        title: document.info.name,
        documentType: "FRR",
        context: buildDocumentContext(document.info.name, {
          effectiveEntries: toEffectiveEntries(document.info.effective, [
            version,
          ]),
          isRequirementsDocument: true,
          sections: buildSectionViewModels(
            document,
            version,
            "../definitions/",
            "",
          ),
        }),
      });
    }
  }

  for (const theme of Object.values(rules.KSI)) {
    artifacts.push({
      relativePath: path.join(
        "20x",
        "key-security-indicators",
        `${theme.web_name}.md`,
      ),
      outputPath: path.join(
        OUTPUT_DIR,
        "20x",
        "key-security-indicators",
        `${theme.web_name}.md`,
      ),
      title: theme.name,
      documentType: "KSI",
      context: buildDocumentContext(theme.name, {
        isKsiDocument: true,
        themeParagraphs: splitParagraphs(theme.theme),
        indicators: Object.entries(theme.indicators).map(([id, entry]) =>
          buildRequirementViewModel(id, entry, "../../definitions/", "../"),
        ),
      }),
    });
  }

  return artifacts;
}

export async function buildMarkdown(): Promise<BuildSummary> {
  const rules = await loadRules();
  const template = await loadTemplate();
  const artifacts = collectArtifacts(rules);

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(path.join(OUTPUT_DIR, "20x", "key-security-indicators"), {
    recursive: true,
  });
  await mkdir(path.join(OUTPUT_DIR, "rev5"), { recursive: true });

  for (const artifact of artifacts) {
    const rendered = `${template(artifact.context).trim()}\n`;
    await writeFile(artifact.outputPath, rendered, "utf8");
  }

  await writeFile(
    path.join(OUTPUT_DIR, "index.md"),
    buildPreviewIndex(artifacts),
    "utf8",
  );

  return {
    artifactCount: artifacts.length,
    artifacts,
  };
}

if (import.meta.main) {
  buildMarkdown()
    .then((summary) => {
      console.log(`Generated ${summary.artifactCount} markdown files.`);
      for (const artifact of summary.artifacts) {
        console.log(`- ${artifact.relativePath}`);
      }
    })
    .catch((error) => {
      console.error("Failed to build markdown files.");
      console.error(error);
      process.exitCode = 1;
    });
}
