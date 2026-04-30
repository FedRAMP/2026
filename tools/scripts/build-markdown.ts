import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import {
  DEFAULT_CONFIG,
  assertPathInside,
  loadToolConfig,
  resolveToolPath,
  toPosixPath,
  type DefinitionDocumentMappingConfig,
  type DeadlineDocumentMappingConfig,
  type KsiDocumentMappingConfig,
  type RuleDocumentMappingConfig,
  type RuleType,
  type ToolConfig,
} from "./config";

export const RULES_FILE = resolveToolPath(DEFAULT_CONFIG.paths.rulesFile);
export const OUTPUT_DIR = resolveToolPath(DEFAULT_CONFIG.paths.src);

type Version = RuleType;
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
  data: Partial<Record<Version | "both", Record<string, DefinitionEntrySource>>>;
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

interface DeadlineRowViewModel {
  shortName: string;
  name: string;
  href: string;
  obtain: string;
  maintain: string;
  graceEnds: string;
}

interface DeadlineTableViewModel {
  title: string;
  rows: DeadlineRowViewModel[];
}

interface DocumentViewModel {
  title: string;
  tags: string[];
  effectiveEntries: EffectiveEntryViewModel[];
  isDefinitionDocument: boolean;
  isRequirementsDocument: boolean;
  isKsiDocument: boolean;
  isDeadlineDocument: boolean;
  definitionSections: DefinitionSectionViewModel[];
  sections: SectionViewModel[];
  themeParagraphs: string[];
  indicators: RequirementViewModel[];
  deadlineTables: DeadlineTableViewModel[];
}

export interface BuildArtifact {
  relativePath: string;
  outputPath: string;
  templatePath: string;
  mappingId: string;
  sourceDocument?: string;
  title: string;
  documentType: "FRD" | "FRR" | "KSI" | "DEADLINES";
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

function versionTags(versions: Version[]): string[] {
  return Array.from(new Set(versions)).map(humanizeVersion);
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

function buildDefinitionSectionViewModelsFromEntries(
  entries: Array<[string, DefinitionEntrySource]>,
): DefinitionSectionViewModel[] {
  const generalDefinitions: DefinitionViewModel[] = [];
  const taggedDefinitions = new Map<string, DefinitionViewModel[]>();

  for (const [id, entry] of entries) {
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

function definitionDocumentTypes(
  mapping: DefinitionDocumentMappingConfig,
): Version[] {
  return mapping.source.types ?? ["20x", "rev5"];
}

function buildConfiguredDefinitionSectionViewModels(
  definitions: DefinitionsSource,
  mapping: DefinitionDocumentMappingConfig,
): DefinitionSectionViewModel[] {
  const entries: Array<[string, DefinitionEntrySource]> = [];

  for (const bucketName of configuredTypeBuckets(
    definitionDocumentTypes(mapping),
    mapping.source.includeBoth,
    mapping.source.bothPosition,
  )) {
    entries.push(...Object.entries(definitions.data[bucketName] ?? {}));
  }

  return buildDefinitionSectionViewModelsFromEntries(entries);
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

function normalizeGeneratedPath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Generated output must be relative: ${relativePath}`);
  }

  const normalizedPath = path.normalize(relativePath);
  if (
    normalizedPath === "." ||
    normalizedPath.startsWith("..") ||
    path.isAbsolute(normalizedPath)
  ) {
    throw new Error(`Generated output must stay inside src: ${relativePath}`);
  }

  return toPosixPath(normalizedPath);
}

function resolveGeneratedOutputPath(
  config: ToolConfig,
  relativePath: string,
): string {
  const srcPath = resolveToolPath(config.paths.src);
  const outputPath = path.resolve(srcPath, relativePath);
  assertPathInside(srcPath, outputPath, "Generated output");
  return outputPath;
}

function configuredBuckets(
  mapping: RuleDocumentMappingConfig,
): Array<Version | "both"> {
  return configuredTypeBuckets(
    mapping.source.types,
    mapping.source.includeBoth,
    mapping.source.bothPosition,
  );
}

function configuredTypeBuckets(
  types: Version[],
  includeBoth = true,
  bothPosition: "first" | "last" = "last",
): Array<Version | "both"> {
  if (!includeBoth) {
    return types;
  }

  return bothPosition === "first" ? ["both", ...types] : [...types, "both"];
}

function matchesAny(value: string, allowedValues: string[]): boolean {
  return allowedValues.some(
    (allowedValue) => allowedValue.toLowerCase() === value.toLowerCase(),
  );
}

function requirementMatchesMapping(
  requirement: RequirementEntrySource,
  mapping: RuleDocumentMappingConfig,
): boolean {
  const affects = mapping.source.affects ?? [];
  if (!affects.length) {
    return true;
  }

  return (requirement.affects ?? []).some((affectedParty) =>
    matchesAny(affectedParty, affects),
  );
}

function buildConfiguredSectionViewModels(
  document: RequirementDocumentSource,
  mapping: RuleDocumentMappingConfig,
): SectionViewModel[] {
  const sections = new Map<string, SectionViewModel>();
  const allowedSections = mapping.source.sections;
  const definitionsHref = mapping.definitionsHref ?? "definitions/";
  const rulesHref = mapping.rulesHref ?? "";

  for (const bucketName of configuredBuckets(mapping)) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [labelKey, requirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(labelKey)) {
        continue;
      }

      const label = document.info.labels?.[labelKey];
      const section = sections.get(labelKey) ?? {
        title: label?.name ?? labelKey,
        descriptionParagraphs: splitParagraphs(label?.description),
        requirements: [],
      };

      for (const [id, requirement] of Object.entries(requirements)) {
        if (!requirementMatchesMapping(requirement, mapping)) {
          continue;
        }

        section.requirements.push(
          buildRequirementViewModel(id, requirement, definitionsHref, rulesHref),
        );
      }

      if (section.requirements.length) {
        sections.set(labelKey, section);
      }
    }
  }

  return Array.from(sections.values());
}

function buildDocumentGroupedSectionViewModel(
  document: RequirementDocumentSource,
  mapping: RuleDocumentMappingConfig,
): SectionViewModel | null {
  const requirements: RequirementViewModel[] = [];
  const allowedSections = mapping.source.sections;
  const definitionsHref = mapping.definitionsHref ?? "definitions/";
  const rulesHref = mapping.rulesHref ?? "";

  for (const bucketName of configuredBuckets(mapping)) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [labelKey, sectionRequirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(labelKey)) {
        continue;
      }

      for (const [id, requirement] of Object.entries(sectionRequirements)) {
        if (!requirementMatchesMapping(requirement, mapping)) {
          continue;
        }

        requirements.push(
          buildRequirementViewModel(id, requirement, definitionsHref, rulesHref),
        );
      }
    }
  }

  if (!requirements.length) {
    return null;
  }

  return {
    title: document.info.name,
    descriptionParagraphs: [],
    requirements,
  };
}

function sourceDocumentKeys(
  rules: RulesDocument,
  mapping: RuleDocumentMappingConfig,
): string[] {
  const { document, documents } = mapping.source;

  if (documents === "ALL") {
    return Object.keys(rules.FRR);
  }

  if (Array.isArray(documents)) {
    if (!documents.length) {
      throw new Error(
        `Rule document mapping "${mapping.id}" must specify at least one source document.`,
      );
    }

    return documents;
  }

  if (document) {
    return [document];
  }

  throw new Error(
    `Rule document mapping "${mapping.id}" must specify source.document, source.documents, or source.documents: "ALL".`,
  );
}

interface SourceDocument {
  key: string;
  document: RequirementDocumentSource;
}

function sourceDocuments(
  rules: RulesDocument,
  mapping: RuleDocumentMappingConfig,
): SourceDocument[] {
  return sourceDocumentKeys(rules, mapping).map((documentKey) => {
    const document = rules.FRR[documentKey];
    if (!document) {
      throw new Error(`Unknown FRR document: ${documentKey}`);
    }

    return {
      key: documentKey,
      document,
    };
  });
}

function deadlineSourceDocumentKeys(
  rules: RulesDocument,
  mapping: DeadlineDocumentMappingConfig,
): string[] {
  const { documents } = mapping.source;

  if (documents === "ALL") {
    return Object.keys(rules.FRR);
  }

  if (Array.isArray(documents)) {
    if (!documents.length) {
      throw new Error(
        `Deadline document mapping "${mapping.id}" must specify at least one source document.`,
      );
    }

    return documents;
  }

  throw new Error(
    `Deadline document mapping "${mapping.id}" must specify source.documents or source.documents: "ALL".`,
  );
}

function sourceDeadlineDocuments(
  rules: RulesDocument,
  mapping: DeadlineDocumentMappingConfig,
): SourceDocument[] {
  return deadlineSourceDocumentKeys(rules, mapping).map((documentKey) => {
    const document = rules.FRR[documentKey];
    if (!document) {
      throw new Error(`Unknown FRR document: ${documentKey}`);
    }

    return {
      key: documentKey,
      document,
    };
  });
}

function markdownTableCell(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

function deadlineDate(
  entry: EffectiveEntrySource,
  key: "obtain" | "maintain" | "grace_ends" | "grace_by_assessment_months",
): string {
  const value = entry.date?.[key];
  return value === undefined ? "" : String(value);
}

function deadlineGraceEnds(entry: EffectiveEntrySource): string {
  const graceEnds = deadlineDate(entry, "grace_ends");
  if (graceEnds) {
    return graceEnds;
  }

  const graceByAssessmentMonths = deadlineDate(
    entry,
    "grace_by_assessment_months",
  );
  if (!graceByAssessmentMonths) {
    return "";
  }

  const maintain = deadlineDate(entry, "maintain") || "Maintain";
  return `Within ${graceByAssessmentMonths} months of the next annual assessment after ${maintain}`;
}

function buildDeadlineRowViewModel(
  document: RequirementDocumentSource,
  version: Version,
  pageRelativePath: string,
): DeadlineRowViewModel | null {
  const entry = effectiveEntryForVersion(document.info.effective, version);
  if (!entry) {
    return null;
  }

  const rulesRelativePath = toPosixPath(
    path.posix.relative(
      path.posix.dirname(pageRelativePath),
      `providers/${version}/rules/${document.info.web_name}.md`,
    ),
  );

  return {
    shortName: markdownTableCell(document.info.short_name ?? ""),
    name: markdownTableCell(document.info.name),
    href: rulesRelativePath,
    obtain: markdownTableCell(deadlineDate(entry, "obtain")),
    maintain: markdownTableCell(deadlineDate(entry, "maintain")),
    graceEnds: markdownTableCell(deadlineGraceEnds(entry)),
  };
}

function buildDeadlineTables(
  documents: RequirementDocumentSource[],
  version: Version,
  pageRelativePath: string,
): DeadlineTableViewModel[] {
  const rows = documents
    .map((document, index) => ({
      index,
      row: buildDeadlineRowViewModel(document, version, pageRelativePath),
    }))
    .filter((entry): entry is { index: number; row: DeadlineRowViewModel } =>
      entry.row !== null
    )
    .sort((left, right) => {
      if (!left.row.maintain && !right.row.maintain) {
        return left.index - right.index;
      }

      if (!left.row.maintain) {
        return 1;
      }

      if (!right.row.maintain) {
        return -1;
      }

      return (
        left.row.maintain.localeCompare(right.row.maintain) ||
        left.index - right.index
      );
    })
    .map((entry) => entry.row);

  if (!rows.length) {
    return [];
  }

  return [
    {
      title: `${humanizeVersion(version)} Deadlines`,
      rows,
    },
  ];
}

function buildConfiguredSections(
  documents: RequirementDocumentSource[],
  mapping: RuleDocumentMappingConfig,
): SectionViewModel[] {
  if (documents.length === 1) {
    const [document] = documents;
    if (!document) {
      throw new Error(`Rule document mapping "${mapping.id}" matched no FRR documents.`);
    }

    return buildConfiguredSectionViewModels(document, mapping);
  }

  const groupBy =
    mapping.source.groupBy ?? "document";

  if (groupBy === "document") {
    return documents
      .map((document) => buildDocumentGroupedSectionViewModel(document, mapping))
      .filter((section): section is SectionViewModel => section !== null);
  }

  return documents.flatMap((document) =>
    buildConfiguredSectionViewModels(document, mapping),
  );
}

function buildDocumentContext(
  title: string,
  options: Partial<DocumentViewModel>,
): DocumentViewModel {
  return {
    title,
    tags: options.tags ?? [],
    effectiveEntries: options.effectiveEntries ?? [],
    isDefinitionDocument: options.isDefinitionDocument ?? false,
    isRequirementsDocument: options.isRequirementsDocument ?? false,
    isKsiDocument: options.isKsiDocument ?? false,
    isDeadlineDocument: options.isDeadlineDocument ?? false,
    definitionSections: options.definitionSections ?? [],
    sections: options.sections ?? [],
    themeParagraphs: options.themeParagraphs ?? [],
    indicators: options.indicators ?? [],
    deadlineTables: options.deadlineTables ?? [],
  };
}

function renderRuleDocumentOutput(
  mapping: RuleDocumentMappingConfig,
  documentKey?: string,
): string {
  const normalizedKey = documentKey?.toLowerCase() ?? "";

  if (mapping.output.includes("{FRR}")) {
    return mapping.output.replaceAll("{FRR}", normalizedKey);
  }

  if (mapping.output.includes("{document}")) {
    return mapping.output.replaceAll("{document}", normalizedKey);
  }

  if (mapping.outputMode === "documents") {
    return `${mapping.output.replace(/\/?$/, "/")}${normalizedKey}.md`;
  }

  return mapping.output;
}

function renderKsiDocumentOutput(
  mapping: KsiDocumentMappingConfig,
  theme: KsiThemeSource,
): string {
  const normalizedKey = theme.web_name.toLowerCase();

  if (mapping.output.includes("{KSI}")) {
    return mapping.output.replaceAll("{KSI}", normalizedKey);
  }

  if (mapping.output.includes("{theme}")) {
    return mapping.output.replaceAll("{theme}", normalizedKey);
  }

  return `${mapping.output.replace(/\/?$/, "/")}${normalizedKey}.md`;
}

function renderDeadlineDocumentOutput(
  mapping: DeadlineDocumentMappingConfig,
  version: Version,
): string {
  if (mapping.output.includes("{type}")) {
    return mapping.output.replaceAll("{type}", version);
  }

  if (mapping.output.includes("{version}")) {
    return mapping.output.replaceAll("{version}", version);
  }

  if (mapping.source.types.length === 1) {
    return mapping.output;
  }

  return `${mapping.output.replace(/\/?$/, "/")}${version}.md`;
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
    artifact.relativePath.startsWith("providers/20x/key-security-indicators/"),
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

async function loadTemplate(
  templatePath: string,
  partialsDir: string,
): Promise<(context: DocumentViewModel) => string> {
  const engine = Handlebars.create();
  const partialFiles = (await readdir(partialsDir)).filter((fileName) =>
    fileName.endsWith(".hbs"),
  );

  for (const partialFile of partialFiles) {
    const partialName = path.basename(partialFile, ".hbs");
    const partialSource = await readFile(
      path.join(partialsDir, partialFile),
      "utf8",
    );
    engine.registerPartial(partialName, partialSource);
  }

  const templateSource = await readFile(templatePath, "utf8");
  return engine.compile(templateSource, {
    noEscape: true,
  });
}

export async function loadRules(
  config: ToolConfig = DEFAULT_CONFIG,
): Promise<RulesDocument> {
  const source = await readFile(resolveToolPath(config.paths.rulesFile), "utf8");
  return JSON.parse(source) as RulesDocument;
}

function collectDefinitionDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: DefinitionDocumentMappingConfig,
): BuildArtifact | null {
  if (mapping.source.collection !== "FRD") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const definitionSections = buildConfiguredDefinitionSectionViewModels(
    rules.FRD,
    mapping,
  );
  if (!definitionSections.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  const relativePath = normalizeGeneratedPath(mapping.output);
  const title = mapping.title ?? rules.FRD.info.name;
  const effectiveEntries =
    mapping.includeEffectiveDates === false
      ? []
      : toEffectiveEntries(
          rules.FRD.info.effective,
          definitionDocumentTypes(mapping),
        );

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    title,
    documentType: "FRD",
    context: buildDocumentContext(title, {
      tags: versionTags(definitionDocumentTypes(mapping)),
      effectiveEntries,
      isDefinitionDocument: true,
      definitionSections,
    }),
  };
}

function collectLegacyDefinitionsArtifact(
  rules: RulesDocument,
  config: ToolConfig,
): BuildArtifact | null {
  const mapping = config.generated.definitions;
  if (!mapping?.enabled) {
    return null;
  }

  return collectDefinitionDocumentArtifact(rules, config, {
    id: "definitions",
    title: mapping.title,
    output: mapping.output,
    template: mapping.template,
    source: {
      collection: "FRD",
      types: ["20x", "rev5"],
      includeBoth: true,
      bothPosition: "first",
    },
  });
}

function collectDefinitionDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
): BuildArtifact[] {
  const mappings = config.generated.definitionDocuments;
  if (mappings?.length) {
    return mappings
      .map((mapping) =>
        collectDefinitionDocumentArtifact(rules, config, mapping),
      )
      .filter((artifact): artifact is BuildArtifact => artifact !== null);
  }

  const legacyArtifact = collectLegacyDefinitionsArtifact(rules, config);
  return legacyArtifact ? [legacyArtifact] : [];
}

function sourceKsiThemeKeys(
  rules: RulesDocument,
  mapping: KsiDocumentMappingConfig,
): string[] {
  const { theme, themes } = mapping.source;

  if (themes === "ALL") {
    return Object.keys(rules.KSI);
  }

  if (Array.isArray(themes)) {
    if (!themes.length) {
      throw new Error(
        `KSI document mapping "${mapping.id}" must specify at least one source theme.`,
      );
    }

    return themes;
  }

  if (theme) {
    return [theme];
  }

  throw new Error(
    `KSI document mapping "${mapping.id}" must specify source.theme, source.themes, or source.themes: "ALL".`,
  );
}

interface SourceKsiTheme {
  key: string;
  theme: KsiThemeSource;
}

function sourceKsiThemes(
  rules: RulesDocument,
  mapping: KsiDocumentMappingConfig,
): SourceKsiTheme[] {
  return sourceKsiThemeKeys(rules, mapping).map((themeKey) => {
    const theme = rules.KSI[themeKey];
    if (!theme) {
      throw new Error(`Unknown KSI theme: ${themeKey}`);
    }

    return {
      key: themeKey,
      theme,
    };
  });
}

function collectKsiDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: KsiDocumentMappingConfig,
): BuildArtifact[] {
  if (mapping.source.collection !== "KSI") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  return sourceKsiThemes(rules, mapping)
    .map(({ key, theme }): BuildArtifact | null => {
      const indicators = Object.entries(theme.indicators ?? {}).map(
        ([id, indicator]) =>
          buildRequirementViewModel(
            id,
            indicator,
            mapping.definitionsHref ?? "definitions/",
            "",
          ),
      );

      if (!indicators.length && mapping.emptyBehavior === "skip") {
        return null;
      }

      const relativePath = normalizeGeneratedPath(
        renderKsiDocumentOutput(mapping, theme),
      );
      const title = mapping.title ?? theme.name;

      return {
        relativePath,
        outputPath: resolveGeneratedOutputPath(config, relativePath),
        templatePath: resolveToolPath(mapping.template ?? config.paths.template),
        mappingId: mapping.id,
        sourceDocument: key,
        title,
        documentType: "KSI",
        context: buildDocumentContext(title, {
          tags: versionTags(["20x"]),
          isKsiDocument: true,
          themeParagraphs: splitParagraphs(theme.theme),
          indicators,
        }),
      };
    })
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function collectConfiguredKsiDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
): BuildArtifact[] {
  return (config.generated.ksiDocuments ?? []).flatMap((mapping) =>
    collectKsiDocumentArtifacts(rules, config, mapping),
  );
}

function collectDeadlineDocumentArtifactsForMapping(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: DeadlineDocumentMappingConfig,
): BuildArtifact[] {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const documents = sourceDeadlineDocuments(rules, mapping).map(
    (entry) => entry.document,
  );

  return mapping.source.types
    .map((version): BuildArtifact | null => {
      const relativePath = normalizeGeneratedPath(
        renderDeadlineDocumentOutput(mapping, version),
      );
      const deadlineTables = buildDeadlineTables(
        documents,
        version,
        relativePath,
      );
      if (!deadlineTables.length) {
        return null;
      }

      const title = `${humanizeVersion(version)} Deadlines`;

      return {
        relativePath,
        outputPath: resolveGeneratedOutputPath(config, relativePath),
        templatePath: resolveToolPath(mapping.template ?? config.paths.template),
        mappingId: mapping.id,
        title,
        documentType: "DEADLINES",
        context: buildDocumentContext(title, {
          tags: versionTags([version]),
          isDeadlineDocument: true,
          deadlineTables,
        }),
      };
    })
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function collectDeadlineDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
): BuildArtifact[] {
  return (config.generated.deadlineDocuments ?? []).flatMap((mapping) =>
    collectDeadlineDocumentArtifactsForMapping(rules, config, mapping),
  );
}

function collectSingleRuleDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: RuleDocumentMappingConfig,
): BuildArtifact | null {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const sourceDocumentEntries = sourceDocuments(rules, mapping);
  const firstDocument = sourceDocumentEntries[0]?.document;
  if (!firstDocument) {
    throw new Error(`Rule document mapping "${mapping.id}" matched no FRR documents.`);
  }

  const documents = sourceDocumentEntries.map((entry) => entry.document);
  const sections = buildConfiguredSections(documents, mapping);
  if (!sections.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  const relativePath = normalizeGeneratedPath(renderRuleDocumentOutput(mapping));
  const title = mapping.title ?? firstDocument.info.name;
  const effectiveEntries =
    mapping.includeEffectiveDates === false || documents.length !== 1
      ? []
      : toEffectiveEntries(firstDocument.info.effective, mapping.source.types);

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    sourceDocument: sourceDocumentEntries.length === 1
      ? sourceDocumentEntries[0]?.key
      : undefined,
    title,
    documentType: "FRR",
    context: buildDocumentContext(title, {
      tags: versionTags(mapping.source.types),
      effectiveEntries,
      isRequirementsDocument: true,
      sections,
    }),
  };
}

function collectDocumentRuleDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: RuleDocumentMappingConfig,
): BuildArtifact[] {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  return sourceDocuments(rules, mapping)
    .map(({ key, document }): BuildArtifact | null => {
      const sections = buildConfiguredSections([document], mapping);
      if (!sections.length && mapping.emptyBehavior === "skip") {
        return null;
      }

      const relativePath = normalizeGeneratedPath(
        renderRuleDocumentOutput(mapping, document.info.web_name),
      );
      const title = document.info.name;
      const effectiveEntries =
        mapping.includeEffectiveDates === false
          ? []
          : toEffectiveEntries(document.info.effective, mapping.source.types);

      return {
        relativePath,
        outputPath: resolveGeneratedOutputPath(config, relativePath),
        templatePath: resolveToolPath(mapping.template ?? config.paths.template),
        mappingId: mapping.id,
        sourceDocument: key,
        title,
        documentType: "FRR",
        context: buildDocumentContext(title, {
          tags: versionTags(mapping.source.types),
          effectiveEntries,
          isRequirementsDocument: true,
          sections,
        }),
      };
    })
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function collectRuleDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: RuleDocumentMappingConfig,
): BuildArtifact[] {
  if (mapping.outputMode === "documents") {
    return collectDocumentRuleDocumentArtifacts(rules, config, mapping);
  }

  const artifact = collectSingleRuleDocumentArtifact(rules, config, mapping);
  return artifact ? [artifact] : [];
}

export function collectArtifacts(
  rules: RulesDocument,
  config: ToolConfig = DEFAULT_CONFIG,
): BuildArtifact[] {
  const artifacts: BuildArtifact[] = [];
  artifacts.push(...collectDefinitionDocumentArtifacts(rules, config));
  artifacts.push(...collectConfiguredKsiDocumentArtifacts(rules, config));
  artifacts.push(...collectDeadlineDocumentArtifacts(rules, config));

  for (const mapping of config.generated.ruleDocuments) {
    artifacts.push(...collectRuleDocumentArtifacts(rules, config, mapping));
  }

  return artifacts;
}

interface GeneratedManifest {
  files: string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function generatedManifestPath(config: ToolConfig): string {
  return resolveGeneratedOutputPath(config, config.generated.manifest);
}

async function readGeneratedManifest(
  config: ToolConfig,
): Promise<GeneratedManifest> {
  const manifestPath = generatedManifestPath(config);
  if (!(await fileExists(manifestPath))) {
    return { files: [] };
  }

  const source = await readFile(manifestPath, "utf8");
  return JSON.parse(source) as GeneratedManifest;
}

async function contentFileExists(
  config: ToolConfig,
  relativePath: string,
): Promise<boolean> {
  const contentPath = path.resolve(resolveToolPath(config.paths.content), relativePath);
  assertPathInside(resolveToolPath(config.paths.content), contentPath, "Content path");
  return fileExists(contentPath);
}

async function assertNoContentCollisions(
  config: ToolConfig,
  artifacts: BuildArtifact[],
): Promise<void> {
  for (const artifact of artifacts) {
    if (await contentFileExists(config, artifact.relativePath)) {
      throw new Error(
        `Generated output "${artifact.relativePath}" would shadow content/${artifact.relativePath}. Move the mapping in tools/config.json before building.`,
      );
    }
  }
}

async function cleanupGeneratedFiles(config: ToolConfig): Promise<void> {
  const manifest = await readGeneratedManifest(config);

  for (const relativePath of manifest.files) {
    if (await contentFileExists(config, relativePath)) {
      continue;
    }

    const outputPath = resolveGeneratedOutputPath(config, relativePath);
    await rm(outputPath, { force: true });
  }
}

async function writeGeneratedManifest(
  config: ToolConfig,
  artifacts: BuildArtifact[],
): Promise<void> {
  const manifestPath = generatedManifestPath(config);
  const manifest: GeneratedManifest = {
    files: artifacts.map((artifact) => artifact.relativePath).sort(),
  };

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function buildMarkdown(config?: ToolConfig): Promise<BuildSummary> {
  const toolConfig = config ?? (await loadToolConfig());
  const rules = await loadRules(toolConfig);
  const artifacts = collectArtifacts(rules, toolConfig);
  const partialsDir = resolveToolPath(toolConfig.paths.partials);
  const templates = new Map<string, (context: DocumentViewModel) => string>();

  await assertNoContentCollisions(toolConfig, artifacts);
  await cleanupGeneratedFiles(toolConfig);

  for (const artifact of artifacts) {
    const template =
      templates.get(artifact.templatePath) ??
      (await loadTemplate(artifact.templatePath, partialsDir));
    templates.set(artifact.templatePath, template);

    const rendered = `${template(artifact.context).trim()}\n`;
    await mkdir(path.dirname(artifact.outputPath), { recursive: true });
    await writeFile(artifact.outputPath, rendered, "utf8");
  }

  await writeGeneratedManifest(toolConfig, artifacts);

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
