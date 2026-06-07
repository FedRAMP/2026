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
  type FrrCollectionDocumentMappingConfig,
  type GeneratedDocumentSource,
  type GeneratedDocumentStatus,
  type KsiDocumentOutputMode,
  type KsiDocumentMappingConfig,
  type ReferenceIndexDocumentMappingConfig,
  type RuleDocumentLinkTargetScope,
  type RuleDocumentMappingConfig,
  type RuleType,
  type ToolConfig,
} from "./config";

export const RULES_FILE = resolveToolPath(DEFAULT_CONFIG.paths.rulesFile);
export const OUTPUT_DIR = resolveToolPath(DEFAULT_CONFIG.paths.src);

type Version = RuleType;
type SharedApplicabilityBucket = "all";
type DataBucket = Version | SharedApplicabilityBucket;

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

type EffectiveDateScalarSource = number | string;

interface EffectiveGraceDateSource {
  default?: EffectiveDateScalarSource;
  until_next_assessment?: boolean;
}

interface EffectiveDatesSource {
  obtain?: EffectiveDateScalarSource;
  maintain?: EffectiveDateScalarSource;
  optional_adoption?: EffectiveDateScalarSource;
  grace?: EffectiveGraceDateSource;
}

interface EffectiveEntrySource {
  is?: string;
  current_status?: string;
  date?: EffectiveDatesSource;
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

interface SubsetSource {
  name?: string;
  description?: string;
}

interface FlowStepSource {
  from?: string;
  to?: string;
  description?: string;
}

interface FlowSource {
  activity?: string;
  description?: string;
  steps?: FlowStepSource[];
  nodes?: Record<string, FlowNodeType>;
}

type FlowNodeType = "decision" | "end" | "process" | "start";

interface CertificationInfoSource {
  effective?: EffectiveEntrySource;
  subsets?: Record<string, SubsetSource>;
  flows?: FlowSource[];
}

interface InfoSource {
  name: string;
  short_name?: string;
  web_name: string;
  purpose?: string;
  status?: string;
  effective?: EffectiveEntrySource;
  subsets?: Record<string, SubsetSource>;
  flows?: FlowSource[];
  "20x"?: CertificationInfoSource;
  rev5?: CertificationInfoSource;
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
  following_information?: string[];
  following_information_bullets?: string[];
  effective_date?: EffectiveDatesSource;
  timeframe_type?: string;
  timeframe_num?: number | string;
  pain_timeframes?: PainTimeframesSource;
  note?: string;
  notes?: string[];
}

interface NotificationSource {
  party?: string;
  method?: string;
  target?: string;
}

interface RequirementSchemaSource {
  name?: string;
  url?: string;
}

interface RequirementEntrySource {
  name?: string;
  statement?: string;
  following_information?: string[];
  following_information_bullets?: string[];
  varies_by_class?: Record<string, VariantSource>;
  varies_by_level?: Record<string, VariantSource>;
  effective_date?: EffectiveDatesSource;
  timeframe_type?: string;
  timeframe_num?: number | string;
  note?: string;
  notes?: string[];
  danger?: string;
  notification?: NotificationSource[];
  schema?: RequirementSchemaSource;
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
  related?: string[];
}

interface DefinitionsSource {
  info: InfoSource;
  data: Partial<Record<DataBucket, Record<string, DefinitionEntrySource>>>;
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
  do_not_link?: boolean;
  updated?: ChangeLogSource[];
  fka?: string;
}

interface RequirementDocumentSource {
  info: InfoSource;
  data: Partial<
    Record<
      DataBucket,
      Record<string, Record<string, RequirementEntrySource>>
    >
  >;
}

interface KsiThemeSource {
  id?: string;
  name: string;
  web_name: string;
  short_name?: string;
  status?: string;
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
  numberedItems: string[];
  bulletItems: string[];
  effectiveDateLines: Array<{ label: string; value: string }>;
  timeframe?: string;
  painTimeframeColumns: PainTimeframeColumnViewModel[];
  painTimeframeRows: PainTimeframeRowViewModel[];
  noteParagraphs: string[];
  notes: string[];
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

interface RequirementSchemaViewModel {
  name: string;
  url: string;
}

interface RequirementViewModel {
  id: string;
  anchorId: string;
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
  schema?: RequirementSchemaViewModel;
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
  relatedTermsGroup?: TermLinkViewModel;
  alternateTerms: string[];
}

interface ImportantRelatedTermViewModel {
  tag: string;
  anchorId: string;
  terms: TermLinkViewModel[];
}

interface SectionViewModel {
  title: string;
  anchorId: string;
  anchorAttribute: string;
  isSubsetSection: boolean;
  descriptionParagraphs: string[];
  requirements: RequirementViewModel[];
}

interface TableOfContentsEntryViewModel {
  title: string;
  href: string;
}

interface DeadlineRowViewModel {
  shortName: string;
  displayName: string;
  href: string;
  optionalAdoption: string;
  obtain: string;
  maintain: string;
  graceEnds: string;
}

interface DeadlineTableViewModel {
  title: string;
  rows: DeadlineRowViewModel[];
}

interface ReferenceIndexRowViewModel {
  acronym: string;
  name: string;
  href: string;
  status: string;
  counts: string;
  updated: string;
}

interface FlowStepViewModel {
  line: string;
}

interface FlowViewModel {
  title: string;
  descriptionParagraphs: string[];
  steps: FlowStepViewModel[];
  mermaidLines: string[];
}

type DoNotLinkTermIndex = ReadonlySet<string>;

interface RuleIndexEntry {
  id: string;
  name: string;
  anchorId: string;
  documentKey: string;
  bucketName: DataBucket;
  subsetKey: string;
  requirement: RequirementEntrySource;
}

type RuleIndex = ReadonlyMap<string, RuleIndexEntry>;
type FrrRuleSourceMappingConfig =
  | RuleDocumentMappingConfig
  | FrrCollectionDocumentMappingConfig;

interface RulePageCandidate {
  mappingId: string;
  relativePath: string;
  types: Version[];
  affects: string[];
  linkTargetScope: RuleDocumentLinkTargetScope;
}

type RulePageIndex = ReadonlyMap<string, RulePageCandidate[]>;

interface RuleLinkContext {
  currentMapping: FrrRuleSourceMappingConfig;
  currentRelativePath: string;
  ruleIndex: RuleIndex;
  rulePageIndex: RulePageIndex;
}

interface DocumentViewModel {
  title: string;
  description?: string;
  purpose?: string;
  pictoSource?: GeneratedDocumentSource;
  pictoStatus?: GeneratedDocumentStatus;
  statusSpan?: string;
  tags: string[];
  purposeParagraphs: string[];
  tableOfContents: TableOfContentsEntryViewModel[];
  effectiveEntries: EffectiveEntryViewModel[];
  flows: FlowViewModel[];
  isDefinitionDocument: boolean;
  isRequirementsDocument: boolean;
  isKsiDocument: boolean;
  isDeadlineDocument: boolean;
  definitions: DefinitionViewModel[];
  importantRelatedTerms: ImportantRelatedTermViewModel[];
  sections: SectionViewModel[];
  themeParagraphs: string[];
  indicators: RequirementViewModel[];
  deadlineTables: DeadlineTableViewModel[];
  referenceIndexRows: ReferenceIndexRowViewModel[];
}

export interface BuildArtifact {
  relativePath: string;
  outputPath: string;
  templatePath: string;
  mappingId: string;
  sourceDocument?: string;
  title: string;
  documentType: "FRD" | "FRR" | "KSI" | "DEADLINES" | "FRR_REFERENCE_INDEX";
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

function commonEffectiveEntry(info: InfoSource): EffectiveEntrySource | undefined {
  return info.effective;
}

function effectiveEntryForVersion(
  info: InfoSource,
  version: Version,
): EffectiveEntrySource | undefined {
  return commonEffectiveEntry(info) ?? info[version]?.effective;
}

function subsetsForVersions(
  info: InfoSource,
  versions: Version[],
): Record<string, SubsetSource> {
  const subsets: Record<string, SubsetSource> = { ...(info.subsets ?? {}) };

  for (const version of versions) {
    Object.assign(subsets, info[version]?.subsets ?? {});
  }

  return subsets;
}

function flowsForVersions(info: InfoSource, versions: Version[]): FlowSource[] {
  return [
    ...(info.flows ?? []),
    ...versions.flatMap((version) => info[version]?.flows ?? []),
  ];
}

function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function relatedTermsGroupAnchorId(tag: string): string {
  return `related-terms-group-${slugifyTerm(tag)}`;
}

function slugifyHeading(heading: string): string {
  return slugifyTerm(heading.replace(/&/g, " and "));
}

function sectionAnchorId(labelKey: string, title: string): string {
  return slugifyHeading(title) || slugifyHeading(labelKey);
}

function sectionAnchorAttribute(labelKey: string, title: string): string {
  return `{#${sectionAnchorId(labelKey, title)}}`;
}

function requirementAnchorId(title: string): string {
  return slugifyHeading(title);
}

function buildSectionTableOfContents(
  sections: SectionViewModel[],
): TableOfContentsEntryViewModel[] {
  const sectionsWithRules = sections.filter(
    (section) => section.isSubsetSection && section.requirements.length > 0,
  );

  if (sectionsWithRules.length <= 1) {
    return [];
  }

  return sectionsWithRules.map((section) => ({
    title: section.title,
    href: `#${section.anchorId}`,
  }));
}

function buildDoNotLinkTermIndex(
  definitions: DefinitionsSource,
): DoNotLinkTermIndex {
  const terms = new Set<string>();

  for (const bucket of Object.values(definitions.data)) {
    for (const entry of Object.values(bucket ?? {})) {
      if (!entry.do_not_link) {
        continue;
      }

      for (const term of [entry.term, ...(entry.alts ?? [])]) {
        const termKey = slugifyTerm(term);
        if (termKey) {
          terms.add(termKey);
        }
      }
    }
  }

  return terms;
}

function buildRuleIndex(rules: RulesDocument): RuleIndex {
  const index = new Map<string, RuleIndexEntry>();

  for (const [documentKey, document] of Object.entries(rules.FRR)) {
    for (const [bucketName, bucket] of Object.entries(document.data) as Array<
      [DataBucket, Record<string, Record<string, RequirementEntrySource>>]
    >) {
      for (const [subsetKey, requirements] of Object.entries(bucket ?? {})) {
        for (const [id, requirement] of Object.entries(requirements)) {
          if (index.has(id)) {
            throw new Error(`Duplicate FRR rule id: ${id}`);
          }

          const name = requirement.name ?? id;
          index.set(id, {
            id,
            name,
            anchorId: requirementAnchorId(name),
            documentKey,
            bucketName,
            subsetKey,
            requirement,
          });
        }
      }
    }
  }

  return index;
}

function ruleBucketMatchesMapping(
  bucketName: DataBucket,
  mapping: FrrRuleSourceMappingConfig,
): boolean {
  return configuredBuckets(mapping).includes(bucketName);
}

function ruleSubsetMatchesMapping(
  subsetKey: string,
  mapping: FrrRuleSourceMappingConfig,
): boolean {
  return !mapping.source.sections || mapping.source.sections.includes(subsetKey);
}

function renderRuleCandidatePath(
  mapping: RuleDocumentMappingConfig,
  document: RequirementDocumentSource,
): string {
  const needsDocumentKey =
    mapping.outputMode === "documents" ||
    mapping.output.includes("{FRR}") ||
    mapping.output.includes("{document}");

  return normalizeGeneratedPath(
    renderRuleDocumentOutput(
      mapping,
      needsDocumentKey ? document.info.web_name : undefined,
    ),
  );
}

function addRulePageCandidate(
  index: Map<string, RulePageCandidate[]>,
  ruleId: string,
  candidate: RulePageCandidate,
): void {
  const candidates = index.get(ruleId) ?? [];
  if (
    candidates.some(
      (existingCandidate) =>
        existingCandidate.mappingId === candidate.mappingId &&
        existingCandidate.relativePath === candidate.relativePath,
    )
  ) {
    return;
  }

  candidates.push(candidate);
  index.set(ruleId, candidates);
}

function buildRulePageIndex(
  rules: RulesDocument,
  config: ToolConfig,
  ruleIndex: RuleIndex,
): RulePageIndex {
  const index = new Map<string, RulePageCandidate[]>();
  const mappings: Array<{
    mapping: FrrRuleSourceMappingConfig;
    relativePathForDocument: (document: RequirementDocumentSource) => string;
  }> = [
    ...config.generated.ruleDocuments.map((mapping) => ({
      mapping,
      relativePathForDocument: (document: RequirementDocumentSource) =>
        renderRuleCandidatePath(mapping, document),
    })),
    ...(config.generated.frrCollectionDocuments ?? []).map((mapping) => ({
      mapping,
      relativePathForDocument: () => normalizeGeneratedPath(mapping.output),
    })),
  ];

  for (const { mapping, relativePathForDocument } of mappings) {
    if (mapping.source.collection !== "FRR") {
      continue;
    }

    for (const { key, document } of sourceDocuments(rules, mapping)) {
      const relativePath = relativePathForDocument(document);

      for (const [id, rule] of ruleIndex) {
        if (rule.documentKey !== key) {
          continue;
        }

        if (!ruleBucketMatchesMapping(rule.bucketName, mapping)) {
          continue;
        }

        if (!ruleSubsetMatchesMapping(rule.subsetKey, mapping)) {
          continue;
        }

        if (!requirementMatchesMapping(rule.requirement, mapping)) {
          continue;
        }

        addRulePageCandidate(index, id, {
          mappingId: mapping.id,
          relativePath,
          types: mapping.source.types,
          affects: mapping.source.affects ?? [],
          linkTargetScope: mapping.linkTargetScope ?? "default",
        });
      }
    }
  }

  return index;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function versionsOverlap(left: Version[], right: Version[]): boolean {
  return left.some((value) => right.includes(value));
}

function candidateScore(
  candidate: RulePageCandidate,
  targetRule: RuleIndexEntry,
  context: RuleLinkContext,
): number {
  let score = 0;

  if (candidate.relativePath === context.currentRelativePath) {
    score += 1000;
  }

  if (candidate.mappingId === context.currentMapping.id) {
    score += 500;
  }

  if (versionsOverlap(candidate.types, context.currentMapping.source.types)) {
    score += 100;
  }

  if (
    candidate.types.length === context.currentMapping.source.types.length &&
    candidate.types.every((version) =>
      context.currentMapping.source.types.includes(version),
    )
  ) {
    score += 25;
  }

  const currentAffects = context.currentMapping.source.affects ?? [];
  if (
    candidate.affects.length &&
    affectsFiltersOverlap(candidate.affects, currentAffects)
  ) {
    score += 75;
  }

  const targetAffects = targetRule.requirement.affects ?? [];
  if (
    candidate.affects.length &&
    affectsFiltersOverlap(candidate.affects, targetAffects)
  ) {
    score += 50;
  }

  return score;
}

function resolveRelatedRuleHref(
  targetRule: RuleIndexEntry,
  context: RuleLinkContext,
): string | undefined {
  const candidates = (context.rulePageIndex.get(targetRule.id) ?? []).filter(
    (candidate) =>
      candidate.linkTargetScope !== "sameMappingOnly" ||
      candidate.mappingId === context.currentMapping.id,
  );
  if (!candidates.length) {
    return undefined;
  }

  const bestCandidate = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      score: candidateScore(candidate, targetRule, context),
    }))
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    )[0]
    ?.candidate;

  if (!bestCandidate) {
    return undefined;
  }

  if (bestCandidate.relativePath === context.currentRelativePath) {
    return `#${targetRule.anchorId}`;
  }

  const relativePath = toPosixPath(
    path.posix.relative(
      path.posix.dirname(context.currentRelativePath),
      bestCandidate.relativePath,
    ),
  );

  return `${relativePath}#${targetRule.anchorId}`;
}

function linkRelatedRuleReferences(
  value: string,
  relatedRuleIds: string[] | undefined,
  context: RuleLinkContext | undefined,
): string {
  if (!context || !relatedRuleIds?.length) {
    return value;
  }

  let linkedValue = value;
  for (const relatedRuleId of relatedRuleIds) {
    const targetRule = context.ruleIndex.get(relatedRuleId);
    if (!targetRule) {
      continue;
    }

    const href = resolveRelatedRuleHref(targetRule, context);
    if (!href) {
      continue;
    }

    const label = `${relatedRuleId} (${targetRule.name})`;
    linkedValue = linkedValue.replace(
      new RegExp(`(?<!\\[)${escapeRegExp(label)}`, "g"),
      `[${label}](${href}){ data-preview }`,
    );
  }

  return linkedValue;
}

function linkRelatedRuleReferencesInList(
  values: string[] | undefined,
  relatedRuleIds: string[] | undefined,
  context: RuleLinkContext | undefined,
): string[] {
  return (values ?? []).map((value) =>
    linkRelatedRuleReferences(value, relatedRuleIds, context),
  );
}

function linkRelatedRuleReferenceParagraphs(
  value: string | undefined,
  relatedRuleIds: string[] | undefined,
  context: RuleLinkContext | undefined,
): string[] {
  return splitParagraphs(
    linkRelatedRuleReferences(value ?? "", relatedRuleIds, context),
  );
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

function effectiveDateValue(value?: EffectiveDateScalarSource): string {
  return value === undefined ? "" : String(value);
}

function effectiveGraceEnds(date?: EffectiveDatesSource): string {
  const defaultDate = effectiveDateValue(date?.grace?.default);
  if (!defaultDate) {
    return "";
  }

  if (date?.grace?.until_next_assessment) {
    return `On the first annual assessment scheduled after ${defaultDate}`;
  }

  return defaultDate;
}

function toDateLines(
  date: EffectiveDatesSource | undefined,
): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = [];
  const addLine = (label: string, value: string): void => {
    if (value) {
      lines.push({ label, value });
    }
  };

  addLine("Optional Adoption", effectiveDateValue(date?.optional_adoption));
  addLine("Obtain", effectiveDateValue(date?.obtain));
  addLine("Maintain", effectiveDateValue(date?.maintain));
  addLine("Grace Ends", effectiveGraceEnds(date));

  return lines;
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
  info: InfoSource,
  versions: Version[],
): EffectiveEntryViewModel[] {
  const commonEntry = commonEffectiveEntry(info);
  if (commonEntry) {
    return [toEffectiveEntryViewModel(commonEntry, humanizeVersions(versions))];
  }

  return versions
    .map((version): EffectiveEntryViewModel | null => {
      const entry = info[version]?.effective;
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

function mermaidNodeId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `node_${normalized || "unnamed"}`;
}

function mermaidQuotedValue(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", " ")
    .replaceAll("\n", "<br/>");
}

function mermaidEdgeLabel(step: FlowStepSource): string {
  return step.description?.trim() ?? "";
}

function mermaidNodeShape(
  nodeId: string,
  label: string,
  nodeType: FlowNodeType,
): string {
  const quotedLabel = mermaidQuotedValue(label);

  if (nodeType === "decision") {
    return `  ${nodeId}{"${quotedLabel}"}`;
  }

  if (nodeType === "start" || nodeType === "end") {
    return `  ${nodeId}(["${quotedLabel}"])`;
  }

  return `  ${nodeId}("${quotedLabel}")`;
}

function normalizeFlowNodeLabel(label: string): string {
  return label.trim().replace(/[.]+$/g, "").toLowerCase();
}

function flowNodeType(
  flow: FlowSource,
  label: string,
  outgoingSteps: FlowStepSource[],
  incomingSteps: FlowStepSource[],
): FlowNodeType {
  const configuredNodeType = flow.nodes?.[label];
  if (configuredNodeType) {
    return configuredNodeType;
  }

  const normalizedLabel = normalizeFlowNodeLabel(label);
  const matchedNodeType = Object.entries(flow.nodes ?? {}).find(
    ([nodeLabel]) => normalizeFlowNodeLabel(nodeLabel) === normalizedLabel,
  )?.[1];
  if (matchedNodeType) {
    return matchedNodeType;
  }

  if (outgoingSteps.length > 1) {
    return "decision";
  }

  if (!outgoingSteps.length || label.toLowerCase().includes("complete")) {
    return "end";
  }

  if (!incomingSteps.length) {
    return "start";
  }

  return "process";
}

function buildRequirementIndex(
  sections: SectionViewModel[],
): Map<string, RequirementViewModel> {
  const requirements = new Map<string, RequirementViewModel>();

  for (const section of sections) {
    for (const requirement of section.requirements) {
      requirements.set(requirement.id, requirement);
    }
  }

  return requirements;
}

function buildFlowMermaidLines(
  flow: FlowSource,
  requirementIndex: ReadonlyMap<string, RequirementViewModel>,
): string[] {
  const steps = (flow.steps ?? []).filter((step) => step.from || step.to);
  const nodeLabels = Array.from(
    new Set(
      steps.flatMap((step) => [step.from, step.to]).filter((value): value is string =>
        Boolean(value?.trim()),
      ),
    ),
  );
  const nodeIds = new Map(
    nodeLabels.map((label) => [label, mermaidNodeId(label)] as const),
  );
  const lines = ["flowchart TD"];

  for (const label of nodeLabels) {
    const nodeId = nodeIds.get(label);
    if (!nodeId) {
      continue;
    }

    const outgoingSteps = steps.filter((step) => step.from === label);
    const incomingSteps = steps.filter((step) => step.to === label);
    const requirement = requirementIndex.get(label);
    const displayLabel = requirement ? `${label}<br/>${requirement.title}` : label;

    lines.push(
      mermaidNodeShape(
        nodeId,
        displayLabel,
        flowNodeType(flow, label, outgoingSteps, incomingSteps),
      ),
    );
  }

  for (const step of steps) {
    const from = step.from ? nodeIds.get(step.from) : undefined;
    const to = step.to ? nodeIds.get(step.to) : undefined;
    if (!from || !to) {
      continue;
    }

    const label = mermaidEdgeLabel(step);
    lines.push(
      label
        ? `  ${from} -->|"${mermaidQuotedValue(label)}"| ${to}`
        : `  ${from} --> ${to}`,
    );
  }

  for (const [label, requirement] of requirementIndex) {
    const nodeId = nodeIds.get(label);
    if (!nodeId) {
      continue;
    }

    lines.push(
      `  click ${nodeId} href "#${requirement.anchorId}" "${mermaidQuotedValue(`Jump to ${label}`)}"`,
    );
  }

  return lines;
}

function buildFlowViewModels(
  info: InfoSource,
  versions: Version[],
  requirementIndex: ReadonlyMap<string, RequirementViewModel>,
): FlowViewModel[] {
  return flowsForVersions(info, versions)
    .map((flow, index): FlowViewModel | null => {
      const steps = (flow.steps ?? [])
        .map((step) => ({
          line: [step.from, step.description, step.to]
            .filter((value): value is string => Boolean(value?.trim()))
            .join(" -> "),
        }))
        .filter((step) => step.line);

      if (!steps.length) {
        return null;
      }

      return {
        title: flow.activity ?? `Flow ${index + 1}`,
        descriptionParagraphs: splitParagraphs(flow.description),
        steps,
        mermaidLines: buildFlowMermaidLines(flow, requirementIndex),
      };
    })
    .filter((flow): flow is FlowViewModel => flow !== null);
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

function buildVariantViewModel(
  title: string,
  entry: VariantSource,
  relatedRuleIds: string[] | undefined,
  ruleLinkContext: RuleLinkContext | undefined,
): VariantViewModel {
  const painTimeframes = normalizePainTimeframes(entry.pain_timeframes);

  return {
    title,
    statementParagraphs: linkRelatedRuleReferenceParagraphs(
      entry.statement,
      relatedRuleIds,
      ruleLinkContext,
    ),
    numberedItems: linkRelatedRuleReferencesInList(
      entry.following_information,
      relatedRuleIds,
      ruleLinkContext,
    ),
    bulletItems: linkRelatedRuleReferencesInList(
      entry.following_information_bullets,
      relatedRuleIds,
      ruleLinkContext,
    ),
    effectiveDateLines: toDateLines(entry.effective_date),
    timeframe: formatDuration(entry.timeframe_type, entry.timeframe_num),
    ...painTimeframes,
    noteParagraphs: linkRelatedRuleReferenceParagraphs(
      entry.note,
      relatedRuleIds,
      ruleLinkContext,
    ),
    notes: linkRelatedRuleReferencesInList(
      entry.notes,
      relatedRuleIds,
      ruleLinkContext,
    ),
  };
}

function buildVariantSections(
  entry: RequirementEntrySource,
  ruleLinkContext?: RuleLinkContext,
): VariantViewModel[] {
  const sections: VariantViewModel[] = [];
  const relatedRuleIds = entry.related;

  for (const [className, classEntry] of Object.entries(
    entry.varies_by_class ?? {},
  )) {
    sections.push(
      buildVariantViewModel(
        `Class ${className.toUpperCase()}`,
        classEntry,
        relatedRuleIds,
        ruleLinkContext,
      ),
    );
  }

  for (const [levelName, levelEntry] of Object.entries(
    entry.varies_by_level ?? {},
  )) {
    sections.push(
      buildVariantViewModel(
        titleCase(levelName),
        levelEntry,
        relatedRuleIds,
        ruleLinkContext,
      ),
    );
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

function toRequirementSchema(
  schema: RequirementSchemaSource | undefined,
): RequirementSchemaViewModel | undefined {
  if (!schema?.name || !schema.url) {
    return undefined;
  }

  return {
    name: schema.name,
    url: schema.url,
  };
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
  doNotLinkTerms: DoNotLinkTermIndex,
): TermLinkViewModel[] {
  return terms
    .filter((term) => !doNotLinkTerms.has(slugifyTerm(term)))
    .map((term) => ({
      label: term,
      href: `${definitionsRelativePath}#${slugifyTerm(term)}`,
    }));
}

function buildRequirementViewModel(
  id: string,
  entry: RequirementEntrySource,
  definitionsRelativePath: string,
  rulesRelativePath: string,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleLinkContext?: RuleLinkContext,
): RequirementViewModel {
  const title = entry.name ?? id;
  const relatedRuleIds = entry.related;

  return {
    id,
    anchorId: requirementAnchorId(title),
    title,
    formerId: entry.fka,
    changelog: toChangeLog(entry.updated),
    statementParagraphs: linkRelatedRuleReferenceParagraphs(
      entry.statement,
      relatedRuleIds,
      ruleLinkContext,
    ),
    variantSections: buildVariantSections(entry, ruleLinkContext),
    effectiveDateLines: toDateLines(entry.effective_date),
    timeframe: formatDuration(entry.timeframe_type, entry.timeframe_num),
    numberedItems: linkRelatedRuleReferencesInList(
      entry.following_information,
      relatedRuleIds,
      ruleLinkContext,
    ),
    bulletItems: linkRelatedRuleReferencesInList(
      entry.following_information_bullets,
      relatedRuleIds,
      ruleLinkContext,
    ),
    noteParagraphs: linkRelatedRuleReferenceParagraphs(
      entry.note,
      relatedRuleIds,
      ruleLinkContext,
    ),
    notes: linkRelatedRuleReferencesInList(
      entry.notes,
      relatedRuleIds,
      ruleLinkContext,
    ),
    dangerParagraphs: splitParagraphs(entry.danger),
    notifications: toNotifications(entry.notification),
    schema: toRequirementSchema(entry.schema),
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
    terms: buildTermLinks(entry.terms, definitionsRelativePath, doNotLinkTerms),
  };
}

function buildDefinitionViewModel(
  id: string,
  entry: DefinitionEntrySource,
): DefinitionViewModel {
  const relatedTermsGroup = entry.tag?.trim();

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
    relatedTermsGroup: relatedTermsGroup
      ? {
          label: relatedTermsGroup,
          href: `#${relatedTermsGroupAnchorId(relatedTermsGroup)}`,
        }
      : undefined,
    alternateTerms: entry.alts ?? [],
  };
}

function sortDefinitionViewModels(
  definitions: DefinitionViewModel[],
): DefinitionViewModel[] {
  return definitions.sort(
    (left, right) =>
      left.term.localeCompare(right.term) || left.id.localeCompare(right.id),
  );
}

function buildDefinitionViewModelsFromEntries(
  entries: Array<[string, DefinitionEntrySource]>,
): DefinitionViewModel[] {
  return sortDefinitionViewModels(
    entries.map(([id, entry]) => buildDefinitionViewModel(id, entry)),
  );
}

function buildImportantRelatedTermViewModelsFromEntries(
  entries: Array<[string, DefinitionEntrySource]>,
): ImportantRelatedTermViewModel[] {
  const taggedTerms = new Map<string, TermLinkViewModel[]>();

  for (const [, entry] of entries) {
    const tag = entry.tag?.trim();

    if (!tag) {
      continue;
    }

    const terms = taggedTerms.get(tag) ?? [];
    terms.push({
      label: entry.term,
      href: `#${slugifyTerm(entry.term)}`,
    });
    taggedTerms.set(tag, terms);
  }

  return Array.from(taggedTerms.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tag, terms]) => ({
      tag,
      anchorId: relatedTermsGroupAnchorId(tag),
      terms: terms.sort((left, right) =>
        left.label.localeCompare(right.label),
      ),
    }));
}

function definitionDocumentTypes(
  mapping: DefinitionDocumentMappingConfig,
): Version[] {
  return mapping.source.types ?? ["20x", "rev5"];
}

function configuredDefinitionEntries(
  definitions: DefinitionsSource,
  mapping: DefinitionDocumentMappingConfig,
): Array<[string, DefinitionEntrySource]> {
  const entries: Array<[string, DefinitionEntrySource]> = [];

  for (const bucketName of configuredTypeBuckets(
    definitionDocumentTypes(mapping),
    mapping.source.includeAll,
    mapping.source.allPosition,
  )) {
    entries.push(...Object.entries(definitions.data[bucketName] ?? {}));
  }

  return entries;
}

function buildSectionViewModels(
  document: RequirementDocumentSource,
  version: Version,
  definitionsRelativePath: string,
  rulesRelativePath: string,
  doNotLinkTerms: DoNotLinkTermIndex,
): SectionViewModel[] {
  const sections = new Map<string, SectionViewModel>();

  const subsets = subsetsForVersions(document.info, [version]);

  for (const bucketName of [version, "all"] as const) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [subsetKey, requirements] of Object.entries(bucket)) {
      const existingSection = sections.get(subsetKey);
      const subset = subsets[subsetKey];
      const section = existingSection ?? {
        title: subset?.name ?? subsetKey,
        anchorId: sectionAnchorId(subsetKey, subset?.name ?? subsetKey),
        anchorAttribute: sectionAnchorAttribute(
          subsetKey,
          subset?.name ?? subsetKey,
        ),
        isSubsetSection: true,
        descriptionParagraphs: splitParagraphs(subset?.description),
        requirements: [],
      };

      for (const [id, requirement] of Object.entries(requirements)) {
        section.requirements.push(
          buildRequirementViewModel(
            id,
            requirement,
            definitionsRelativePath,
            rulesRelativePath,
            doNotLinkTerms,
          ),
        );
      }

      sections.set(subsetKey, section);
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
  mapping: FrrRuleSourceMappingConfig,
): DataBucket[] {
  return configuredTypeBuckets(
    mapping.source.types,
    mapping.source.includeAll,
    mapping.source.allPosition,
  );
}

function configuredTypeBuckets(
  types: Version[],
  includeAll = true,
  allPosition: "first" | "last" = "last",
): DataBucket[] {
  if (!includeAll) {
    return types;
  }

  return allPosition === "first" ? ["all", ...types] : [...types, "all"];
}

function matchesAny(value: string, allowedValues: string[]): boolean {
  return allowedValues.some(
    (allowedValue) => allowedValue.toLowerCase() === value.toLowerCase(),
  );
}

function affectsFiltersOverlap(left: string[], right: string[]): boolean {
  return left.some((value) => matchesAny(value, right));
}

function requirementMatchesMapping(
  requirement: RequirementEntrySource,
  mapping: FrrRuleSourceMappingConfig,
): boolean {
  return requirementMatchesAffectedParties(
    requirement,
    mapping.source.affects ?? [],
  );
}

function requirementMatchesAffectedParties(
  requirement: RequirementEntrySource,
  affects: string[],
): boolean {
  if (!affects.length) {
    return true;
  }

  return (requirement.affects ?? []).some((affectedParty) =>
    matchesAny(affectedParty, affects),
  );
}

function buildConfiguredSectionViewModels(
  document: RequirementDocumentSource,
  mapping: FrrRuleSourceMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleLinkContext: RuleLinkContext,
): SectionViewModel[] {
  const sections = new Map<string, SectionViewModel>();
  const allowedSections = mapping.source.sections;
  const definitionsHref = mapping.definitionsHref ?? "definitions/";
  const rulesHref = mapping.rulesHref ?? "";
  const subsets = subsetsForVersions(document.info, mapping.source.types);

  for (const bucketName of configuredBuckets(mapping)) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [subsetKey, requirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(subsetKey)) {
        continue;
      }

      const subset = subsets[subsetKey];
      const section = sections.get(subsetKey) ?? {
        title: subset?.name ?? subsetKey,
        anchorId: sectionAnchorId(subsetKey, subset?.name ?? subsetKey),
        anchorAttribute: sectionAnchorAttribute(
          subsetKey,
          subset?.name ?? subsetKey,
        ),
        isSubsetSection: true,
        descriptionParagraphs: splitParagraphs(subset?.description),
        requirements: [],
      };

      for (const [id, requirement] of Object.entries(requirements)) {
        if (!requirementMatchesMapping(requirement, mapping)) {
          continue;
        }

        section.requirements.push(
          buildRequirementViewModel(
            id,
            requirement,
            definitionsHref,
            rulesHref,
            doNotLinkTerms,
            ruleLinkContext,
          ),
        );
      }

      if (section.requirements.length) {
        sections.set(subsetKey, section);
      }
    }
  }

  return Array.from(sections.values());
}

function documentHasRequirementAffecting(
  document: RequirementDocumentSource,
  versions: Version[],
  affects: string[],
  allowedSections?: string[],
): boolean {
  if (!affects.length) {
    return true;
  }

  for (const bucketName of configuredTypeBuckets(versions, true, "first")) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [subsetKey, sectionRequirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(subsetKey)) {
        continue;
      }

      for (const requirement of Object.values(sectionRequirements)) {
        if (requirementMatchesAffectedParties(requirement, affects)) {
          return true;
        }
      }
    }
  }

  return false;
}

function buildDocumentGroupedSectionViewModel(
  document: RequirementDocumentSource,
  mapping: FrrRuleSourceMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleLinkContext: RuleLinkContext,
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

    for (const [subsetKey, sectionRequirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(subsetKey)) {
        continue;
      }

      for (const [id, requirement] of Object.entries(sectionRequirements)) {
        if (!requirementMatchesMapping(requirement, mapping)) {
          continue;
        }

        requirements.push(
          buildRequirementViewModel(
            id,
            requirement,
            definitionsHref,
            rulesHref,
            doNotLinkTerms,
            ruleLinkContext,
          ),
        );
      }
    }
  }

  if (!requirements.length) {
    return null;
  }

  return {
    title: document.info.name,
    anchorId: sectionAnchorId(
      document.info.short_name ?? document.info.web_name,
      document.info.name,
    ),
    anchorAttribute: sectionAnchorAttribute(
      document.info.short_name ?? document.info.web_name,
      document.info.name,
    ),
    isSubsetSection: false,
    descriptionParagraphs: [],
    requirements,
  };
}

function sourceDocumentKeys(
  rules: RulesDocument,
  mapping: FrrRuleSourceMappingConfig,
): string[] {
  const { document, documents } = mapping.source;
  let selectedDocumentKeys: string[];

  if (documents === "ALL") {
    selectedDocumentKeys = Object.keys(rules.FRR);
  } else if (Array.isArray(documents)) {
    if (!documents.length) {
      throw new Error(
        `Rule document mapping "${mapping.id}" must specify at least one source document.`,
      );
    }

    selectedDocumentKeys = documents;
  } else if (document) {
    selectedDocumentKeys = [document];
  } else {
    throw new Error(
      `Rule document mapping "${mapping.id}" must specify source.document, source.documents, or source.documents: "ALL".`,
    );
  }

  return filterIgnoredDocumentKeys(
    rules,
    mapping,
    selectedDocumentKeys,
    "Rule document mapping",
  );
}

type IgnorableFrrDocumentMapping =
  | RuleDocumentMappingConfig
  | FrrCollectionDocumentMappingConfig
  | DeadlineDocumentMappingConfig
  | ReferenceIndexDocumentMappingConfig;

function filterIgnoredDocumentKeys(
  rules: RulesDocument,
  mapping: IgnorableFrrDocumentMapping,
  selectedDocumentKeys: string[],
  mappingLabel: string,
): string[] {
  const ignoredDocumentKeys = normalizeIgnoredDocumentKeys(mapping, mappingLabel);
  if (!ignoredDocumentKeys.length) {
    return selectedDocumentKeys;
  }

  for (const ignoredDocumentKey of ignoredDocumentKeys) {
    if (!rules.FRR[ignoredDocumentKey]) {
      throw new Error(`Unknown FRR document: ${ignoredDocumentKey}`);
    }
  }

  const filteredDocumentKeys = selectedDocumentKeys.filter(
    (documentKey) => !ignoredDocumentKeys.includes(documentKey),
  );
  if (!filteredDocumentKeys.length) {
    throw new Error(
      `${mappingLabel} "${mapping.id}" ignored every selected FRR document.`,
    );
  }

  return filteredDocumentKeys;
}

function normalizeIgnoredDocumentKeys(
  mapping: IgnorableFrrDocumentMapping,
  mappingLabel: string,
): string[] {
  const { ignoreDocuments } = mapping.source as { ignoreDocuments?: unknown };

  if (Array.isArray(ignoreDocuments)) {
    if (!ignoreDocuments.length) {
      throw new Error(
        `${mappingLabel} "${mapping.id}" must specify at least one ignored source document when source.ignoreDocuments is present.`,
      );
    }

    if (!ignoreDocuments.every((documentKey) => typeof documentKey === "string")) {
      throw new Error(
        `${mappingLabel} "${mapping.id}" must specify source.ignoreDocuments as an array of FRR document keys.`,
      );
    }

    return ignoreDocuments;
  }

  if (ignoreDocuments !== undefined) {
    throw new Error(
      `${mappingLabel} "${mapping.id}" must specify source.ignoreDocuments as an array of FRR document keys.`,
    );
  }

  return [];
}

interface SourceDocument {
  key: string;
  document: RequirementDocumentSource;
}

function sourceDocuments(
  rules: RulesDocument,
  mapping: FrrRuleSourceMappingConfig,
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
  let selectedDocumentKeys: string[];

  if (documents === "ALL") {
    selectedDocumentKeys = Object.keys(rules.FRR);
  } else if (Array.isArray(documents)) {
    if (!documents.length) {
      throw new Error(
        `Deadline document mapping "${mapping.id}" must specify at least one source document.`,
      );
    }

    selectedDocumentKeys = documents;
  } else {
    throw new Error(
      `Deadline document mapping "${mapping.id}" must specify source.documents or source.documents: "ALL".`,
    );
  }

  return filterIgnoredDocumentKeys(
    rules,
    mapping,
    selectedDocumentKeys,
    "Deadline document mapping",
  );
}

function sourceDeadlineDocuments(
  rules: RulesDocument,
  mapping: DeadlineDocumentMappingConfig,
): SourceDocument[] {
  return deadlineSourceDocumentKeys(rules, mapping)
    .map((documentKey) => {
      const document = rules.FRR[documentKey];
      if (!document) {
        throw new Error(`Unknown FRR document: ${documentKey}`);
      }

      return {
        key: documentKey,
        document,
      };
    })
    .filter(({ document }) =>
      documentHasRequirementAffecting(
        document,
        mapping.source.types,
        mapping.source.affects ?? [],
      ),
    );
}

function referenceIndexSourceDocumentKeys(
  rules: RulesDocument,
  mapping: ReferenceIndexDocumentMappingConfig,
): string[] {
  const { documents } = mapping.source;
  let selectedDocumentKeys: string[];

  if (documents === "ALL" || documents === undefined) {
    selectedDocumentKeys = Object.keys(rules.FRR);
  } else if (Array.isArray(documents)) {
    if (!documents.length) {
      throw new Error(
        `Reference index document mapping "${mapping.id}" must specify at least one source document.`,
      );
    }

    selectedDocumentKeys = documents;
  } else {
    throw new Error(
      `Reference index document mapping "${mapping.id}" must specify source.documents as an array of FRR document keys or "ALL".`,
    );
  }

  return filterIgnoredDocumentKeys(
    rules,
    mapping,
    selectedDocumentKeys,
    "Reference index document mapping",
  );
}

function sourceReferenceIndexDocuments(
  rules: RulesDocument,
  mapping: ReferenceIndexDocumentMappingConfig,
): SourceDocument[] {
  return referenceIndexSourceDocumentKeys(rules, mapping).map((documentKey) => {
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

function ruleMappingMatchesDeadlineAudience(
  ruleMapping: RuleDocumentMappingConfig,
  deadlineMapping: DeadlineDocumentMappingConfig,
): boolean {
  const deadlineAffects = deadlineMapping.source.affects ?? [];
  if (!deadlineAffects.length) {
    return true;
  }

  const ruleAffects = ruleMapping.source.affects ?? [];
  if (!ruleAffects.length) {
    return false;
  }

  return affectsFiltersOverlap(deadlineAffects, ruleAffects);
}

function ruleMappingIncludesSourceDocument(
  rules: RulesDocument,
  ruleMapping: RuleDocumentMappingConfig,
  documentKey: string,
): boolean {
  return sourceDocumentKeys(rules, ruleMapping).includes(documentKey);
}

function matchingDeadlineRuleDocumentPath(
  sourceDocument: SourceDocument,
  version: Version,
  rules: RulesDocument,
  config: ToolConfig,
  deadlineMapping: DeadlineDocumentMappingConfig,
): string {
  const matchingRuleMapping = config.generated.ruleDocuments.find((ruleMapping) => {
    if (ruleMapping.source.collection !== "FRR") {
      return false;
    }

    if (!ruleMapping.source.types.includes(version)) {
      return false;
    }

    if (!ruleMappingMatchesDeadlineAudience(ruleMapping, deadlineMapping)) {
      return false;
    }

    if (!ruleMappingIncludesSourceDocument(rules, ruleMapping, sourceDocument.key)) {
      return false;
    }

    return documentHasRequirementAffecting(
      sourceDocument.document,
      [version],
      ruleMapping.source.affects ?? [],
      ruleMapping.source.sections,
    );
  });

  if (!matchingRuleMapping) {
    return `providers/${version}/rules/${sourceDocument.document.info.web_name}.md`;
  }

  return normalizeGeneratedPath(
    renderRuleDocumentOutput(
      matchingRuleMapping,
      sourceDocument.document.info.web_name,
    ),
  );
}

function deadlineDate(
  entry: EffectiveEntrySource,
  key: "obtain" | "maintain" | "optional_adoption",
): string {
  return effectiveDateValue(entry.date?.[key]);
}

function deadlineGraceEnds(entry: EffectiveEntrySource): string {
  return effectiveGraceEnds(entry.date);
}

function deadlineDisplayName(info: InfoSource): string {
  const shortName = info.short_name?.trim();
  if (!shortName) {
    return info.name;
  }

  return `${info.name} (${shortName})`;
}

function documentSubsetCount(document: RequirementDocumentSource): number {
  const subsetKeys = new Set<string>();

  for (const bucket of Object.values(document.data)) {
    for (const subsetKey of Object.keys(bucket ?? {})) {
      subsetKeys.add(subsetKey);
    }
  }

  return subsetKeys.size;
}

function documentRuleCount(document: RequirementDocumentSource): number {
  const ruleIds = new Set<string>();

  for (const bucket of Object.values(document.data)) {
    for (const requirements of Object.values(bucket ?? {})) {
      for (const ruleId of Object.keys(requirements ?? {})) {
        ruleIds.add(ruleId);
      }
    }
  }

  return ruleIds.size;
}

function latestRequirementUpdateDate(
  document: RequirementDocumentSource,
): string {
  const dates: string[] = [];

  for (const bucket of Object.values(document.data)) {
    for (const requirements of Object.values(bucket ?? {})) {
      for (const requirement of Object.values(requirements ?? {})) {
        for (const change of requirement.updated ?? []) {
          if (change.date) {
            dates.push(change.date);
          }
        }
      }
    }
  }

  return dates.sort().at(-1) ?? "";
}

function buildReferenceIndexRows(
  sourceDocuments: SourceDocument[],
): ReferenceIndexRowViewModel[] {
  return sourceDocuments
    .map(({ document }) => ({
      acronym: markdownTableCell(document.info.short_name ?? ""),
      name: markdownTableCell(document.info.name),
      href: `${document.info.web_name}.md`,
      status: markdownTableCell(humanizeStatus(document.info.status)),
      counts: `Subsets: ${documentSubsetCount(document)}<br>Rules: ${documentRuleCount(document)}`,
      updated: markdownTableCell(latestRequirementUpdateDate(document)),
    }))
    .sort((left, right) => left.acronym.localeCompare(right.acronym));
}

function buildDeadlineRowViewModel(
  sourceDocument: SourceDocument,
  version: Version,
  pageRelativePath: string,
  rules: RulesDocument,
  config: ToolConfig,
  mapping: DeadlineDocumentMappingConfig,
): DeadlineRowViewModel | null {
  const { document } = sourceDocument;
  const entry = effectiveEntryForVersion(document.info, version);
  if (!entry) {
    return null;
  }

  const rulePageRelativePath = matchingDeadlineRuleDocumentPath(
    sourceDocument,
    version,
    rules,
    config,
    mapping,
  );
  const rulesRelativePath = toPosixPath(
    path.posix.relative(
      path.posix.dirname(pageRelativePath),
      rulePageRelativePath,
    ),
  );

  return {
    shortName: markdownTableCell(document.info.short_name ?? ""),
    displayName: markdownTableCell(deadlineDisplayName(document.info)),
    href: rulesRelativePath,
    optionalAdoption: markdownTableCell(deadlineDate(entry, "optional_adoption")),
    obtain: markdownTableCell(deadlineDate(entry, "obtain")),
    maintain: markdownTableCell(deadlineDate(entry, "maintain")),
    graceEnds: markdownTableCell(deadlineGraceEnds(entry)),
  };
}

function buildDeadlineTables(
  sourceDocuments: SourceDocument[],
  version: Version,
  pageRelativePath: string,
  rules: RulesDocument,
  config: ToolConfig,
  mapping: DeadlineDocumentMappingConfig,
): DeadlineTableViewModel[] {
  const rows = sourceDocuments
    .map((sourceDocument, index) => ({
      index,
      row: buildDeadlineRowViewModel(
        sourceDocument,
        version,
        pageRelativePath,
        rules,
        config,
        mapping,
      ),
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
  mapping: FrrRuleSourceMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleLinkContext: RuleLinkContext,
): SectionViewModel[] {
  if (documents.length === 1) {
    const [document] = documents;
    if (!document) {
      throw new Error(`Rule document mapping "${mapping.id}" matched no FRR documents.`);
    }

    return buildConfiguredSectionViewModels(
      document,
      mapping,
      doNotLinkTerms,
      ruleLinkContext,
    );
  }

  const groupBy =
    mapping.source.groupBy ?? "document";

  if (groupBy === "document") {
    return documents
      .map((document) =>
        buildDocumentGroupedSectionViewModel(
          document,
          mapping,
          doNotLinkTerms,
          ruleLinkContext,
        ),
      )
      .filter((section): section is SectionViewModel => section !== null);
  }

  return documents.flatMap((document) =>
    buildConfiguredSectionViewModels(
      document,
      mapping,
      doNotLinkTerms,
      ruleLinkContext,
    ),
  );
}

function buildDocumentContext(
  title: string,
  options: Partial<DocumentViewModel>,
): DocumentViewModel {
  return {
    title,
    description: options.description,
    purpose: options.purpose,
    pictoSource: options.pictoSource,
    pictoStatus: options.pictoStatus,
    statusSpan: options.statusSpan,
    tags: options.tags ?? [],
    purposeParagraphs: options.purposeParagraphs ?? [],
    tableOfContents: options.tableOfContents ?? [],
    effectiveEntries: options.effectiveEntries ?? [],
    flows: options.flows ?? [],
    isDefinitionDocument: options.isDefinitionDocument ?? false,
    isRequirementsDocument: options.isRequirementsDocument ?? false,
    isKsiDocument: options.isKsiDocument ?? false,
    isDeadlineDocument: options.isDeadlineDocument ?? false,
    definitions: options.definitions ?? [],
    importantRelatedTerms: options.importantRelatedTerms ?? [],
    sections: options.sections ?? [],
    themeParagraphs: options.themeParagraphs ?? [],
    indicators: options.indicators ?? [],
    deadlineTables: options.deadlineTables ?? [],
    referenceIndexRows: options.referenceIndexRows ?? [],
  };
}

function pictographSpan(
  config: ToolConfig,
  status: GeneratedDocumentStatus,
  source: GeneratedDocumentSource = "machine",
): string {
  const sourcePictograph = config.pictographs.source[source];
  const statusPictograph = config.pictographs.status[status];
  const sourceTooltip = config.pictographs.tooltips[source];
  const statusTooltip = config.pictographs.tooltips[status];

  if (!sourcePictograph) {
    throw new Error(`Unsupported generated document pictograph source: ${source}`);
  }

  if (!statusPictograph) {
    throw new Error(`Unsupported generated document status: ${status}`);
  }

  if (!sourceTooltip) {
    throw new Error(`Missing generated document pictograph tooltip: ${source}`);
  }

  if (!statusTooltip) {
    throw new Error(`Missing generated document status tooltip: ${status}`);
  }

  return `<span class="picto">${pictographWithTooltip(
    sourcePictograph,
    sourceTooltip,
  )} ${pictographWithTooltip(statusPictograph, statusTooltip)}</span>`;
}

function generatedDocumentStatus(
  config: ToolConfig,
  status: string | undefined,
  label: string,
): GeneratedDocumentStatus {
  if (isGeneratedDocumentStatus(config, status)) {
    return status;
  }

  throw new Error(
    `${label} has unsupported generated document status: ${status ?? "<missing>"}`,
  );
}

function combinedGeneratedDocumentStatus(
  config: ToolConfig,
  entries: Array<{ label: string; status?: string }>,
  label: string,
): GeneratedDocumentStatus {
  if (!entries.length) {
    throw new Error(`${label} has no source statuses to combine.`);
  }

  const statusRank: Record<GeneratedDocumentStatus, number> = {
    stable: 0,
    placeholder: 1,
    empty: 2,
  };

  return entries
    .map((entry) => generatedDocumentStatus(config, entry.status, entry.label))
    .sort((left, right) => statusRank[right] - statusRank[left])[0]!;
}

function combinedDeadlineDocumentStatus(
  config: ToolConfig,
  documents: RequirementDocumentSource[],
  label: string,
): GeneratedDocumentStatus {
  return combinedGeneratedDocumentStatus(
    config,
    documents.map((document) => {
      const sourceStatus = generatedDocumentStatus(
        config,
        document.info.status,
        `FRR.${document.info.short_name ?? document.info.web_name}.info`,
      );

      return {
        label: `FRR.${document.info.short_name ?? document.info.web_name}.info`,
        status: sourceStatus === "empty" ? "placeholder" : sourceStatus,
      };
    }),
    label,
  );
}

function pictographWithTooltip(pictograph: string, tooltip: string): string {
  const match = pictograph.match(/^(.*)\{\s*([^}]*?)\s*\}$/);
  if (!match?.[1] || !match[2]) {
    throw new Error(`Pictograph is missing Markdown attributes: ${pictograph}`);
  }

  return `${match[1]}{ ${match[2]} title="${markdownAttributeValue(tooltip)}" }`;
}

function markdownAttributeValue(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function isGeneratedDocumentSource(
  config: ToolConfig,
  value: string | undefined,
): value is GeneratedDocumentSource {
  return Boolean(value && value in config.pictographs.source);
}

function isGeneratedDocumentStatus(
  config: ToolConfig,
  value: string | undefined,
): value is GeneratedDocumentStatus {
  return Boolean(value && value in config.pictographs.status);
}

function pictoFrontmatterValue(
  frontmatterLines: string[],
): { source?: string; status?: string } | null {
  const pictoIndex = frontmatterLines.findIndex(
    (line) => line.trim() === "picto:",
  );
  if (pictoIndex === -1) {
    return null;
  }

  const value: { source?: string; status?: string } = {};
  for (let index = pictoIndex + 1; index < frontmatterLines.length; index++) {
    const line = frontmatterLines[index];
    if (!line) {
      continue;
    }

    if (!line.startsWith(" ")) {
      break;
    }

    const sourceMatch = line.match(/^\s+source:\s*([A-Za-z0-9_-]+)\s*$/);
    const statusMatch = line.match(/^\s+status:\s*([A-Za-z0-9_-]+)\s*$/);

    if (sourceMatch?.[1]) {
      value.source = sourceMatch[1];
    }

    if (statusMatch?.[1]) {
      value.status = statusMatch[1];
    }
  }

  return value;
}

function frontmatterScalarValue(
  frontmatterLines: string[],
  key: "description" | "google_doc" | "purpose",
): string | undefined {
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);
  const keyIndex = frontmatterLines.findIndex((line) => keyPattern.test(line));
  if (keyIndex === -1) {
    return undefined;
  }

  const value = frontmatterLines[keyIndex]?.match(keyPattern)?.[1]?.trim() ?? "";
  const blockScalarMatch = value.match(/^([>|])[-+]?$/);
  if (blockScalarMatch?.[1]) {
    const blockLines: string[] = [];
    for (let index = keyIndex + 1; index < frontmatterLines.length; index++) {
      const line = frontmatterLines[index];
      if (!line) {
        blockLines.push("");
        continue;
      }

      if (!line.startsWith(" ")) {
        break;
      }

      blockLines.push(line.trim());
    }

    const separator = blockScalarMatch[1] === ">" ? " " : "\n";
    return meaningfulFrontmatterValue(blockLines.join(separator));
  }

  return meaningfulFrontmatterValue(value);
}

function meaningfulFrontmatterValue(value: string): string | undefined {
  let normalized = value.trim();
  const quotedValue = normalized.match(/^(['"])(.*)\1$/);
  if (quotedValue?.[2] !== undefined) {
    normalized = quotedValue[2].trim();
  }

  return normalized ? normalized : undefined;
}

function renderPageInfoAdmonition(
  frontmatterLines: string[],
): string[] {
  const description = frontmatterScalarValue(frontmatterLines, "description");
  const purpose = frontmatterScalarValue(frontmatterLines, "purpose");
  const googleDoc = frontmatterScalarValue(frontmatterLines, "google_doc");

  if (!description && !purpose && !googleDoc) {
    return [];
  }

  const lines = ['??? info inline end "Page Info"', ""];
  if (description) {
    lines.push(`    **Description:** ${description.replace(/\s+/g, " ")}`);
  }

  if (description && purpose) {
    lines.push("    ");
  }

  if (purpose) {
    lines.push(`    **Purpose:** ${purpose.replace(/\s+/g, " ")}`);
  }

  if (googleDoc) {
    if (description || purpose) {
      lines.push("    ");
    }
    const escapedHref = googleDoc.replaceAll("(", "%28").replaceAll(")", "%29");
    lines.push(`    **Edit:** [:material-file-edit-outline:](${escapedHref}){ title="Link to FedRAMP Internal Google Doc" }`);
  }

  return lines;
}

function stripLeadingPageInfoAdmonition(bodyLines: string[]): void {
  if (bodyLines[0]?.trim() !== '??? info inline end "Page Info"') {
    return;
  }

  bodyLines.shift();
  while (bodyLines.length) {
    const line = bodyLines[0];
    if (line === "" || line?.startsWith(" ")) {
      bodyLines.shift();
      continue;
    }

    break;
  }

  while (bodyLines[0] === "") {
    bodyLines.shift();
  }
}

function renderContentPictographSpan(
  relativePath: string,
  contents: string,
  config: ToolConfig,
): string {
  const lines = contents.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return contents;
  }

  const frontmatterEndIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (frontmatterEndIndex === -1) {
    return contents;
  }

  const frontmatterLines = lines.slice(1, frontmatterEndIndex);
  const picto = pictoFrontmatterValue(frontmatterLines);
  if (!picto) {
    return contents;
  }

  if (!isGeneratedDocumentSource(config, picto.source)) {
    throw new Error(
      `content/${relativePath} has unsupported picto source: ${picto.source ?? "<missing>"}`,
    );
  }

  if (!isGeneratedDocumentStatus(config, picto.status)) {
    throw new Error(
      `content/${relativePath} has unsupported picto status: ${picto.status ?? "<missing>"}`,
    );
  }

  const bodyLines = lines.slice(frontmatterEndIndex + 1);
  while (bodyLines[0] === "") {
    bodyLines.shift();
  }

  stripLeadingPageInfoAdmonition(bodyLines);

  if (/^<span class="picto">.+<\/span>\s*$/.test(bodyLines[0]?.trim() ?? "")) {
    bodyLines.shift();
    while (bodyLines[0] === "") {
      bodyLines.shift();
    }
  }
  stripLeadingPageInfoAdmonition(bodyLines);

  const pageInfoAdmonition = renderPageInfoAdmonition(frontmatterLines);

  return [
    ...lines.slice(0, frontmatterEndIndex + 1),
    "",
    pictographSpan(config, picto.status, picto.source),
    "",
    ...pageInfoAdmonition,
    ...(pageInfoAdmonition.length ? [""] : []),
    ...bodyLines,
  ].join("\n");
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        const childFiles = await listMarkdownFiles(entryPath);
        return childFiles.map((childFile) => path.join(entry.name, childFile));
      }

      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [entry.name];
      }

      return [];
    }),
  );

  return files.flat().map(toPosixPath);
}

async function renderContentPictographs(config: ToolConfig): Promise<void> {
  const srcPath = resolveToolPath(config.paths.src);
  const markdownPaths = await listMarkdownFiles(srcPath);

  for (const relativePath of markdownPaths) {
    const markdownPath = path.join(srcPath, relativePath);
    const contents = await readFile(markdownPath, "utf8");
    const rendered = renderContentPictographSpan(relativePath, contents, config);

    if (rendered !== contents) {
      await writeFile(markdownPath, rendered, "utf8");
    }
  }
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

  const definitionEntries = configuredDefinitionEntries(rules.FRD, mapping);
  const definitions = buildDefinitionViewModelsFromEntries(definitionEntries);
  const importantRelatedTerms =
    buildImportantRelatedTermViewModelsFromEntries(definitionEntries);

  if (!definitions.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  const relativePath = normalizeGeneratedPath(mapping.output);
  const title = mapping.title ?? rules.FRD.info.name;
  const effectiveEntries =
    mapping.includeEffectiveDates === false
      ? []
      : toEffectiveEntries(rules.FRD.info, definitionDocumentTypes(mapping));

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    title,
    documentType: "FRD",
    context: buildDocumentContext(title, {
      statusSpan: pictographSpan(
        config,
        generatedDocumentStatus(config, rules.FRD.info.status, "FRD.info"),
      ),
      tags: versionTags(definitionDocumentTypes(mapping)),
      purposeParagraphs: splitParagraphs(rules.FRD.info.purpose),
      effectiveEntries,
      isDefinitionDocument: true,
      definitions,
      importantRelatedTerms,
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
    status: "stable",
    source: {
      collection: "FRD",
      types: ["20x", "rev5"],
      includeAll: true,
      allPosition: "first",
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

function ksiDocumentOutputMode(
  mapping: KsiDocumentMappingConfig,
): KsiDocumentOutputMode {
  return mapping.outputMode ?? "themes";
}

function buildKsiIndicatorViewModels(
  theme: KsiThemeSource,
  mapping: KsiDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): RequirementViewModel[] {
  return Object.entries(theme.indicators ?? {}).map(([id, indicator]) =>
    buildRequirementViewModel(
      id,
      indicator,
      mapping.definitionsHref ?? "definitions/",
      "",
      doNotLinkTerms,
    ),
  );
}

function buildKsiThemeSectionViewModel(
  key: string,
  theme: KsiThemeSource,
  mapping: KsiDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): SectionViewModel | null {
  const indicators = buildKsiIndicatorViewModels(theme, mapping, doNotLinkTerms);

  if (!indicators.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  return {
    title: theme.name,
    anchorId: sectionAnchorId(theme.short_name ?? theme.id ?? key, theme.name),
    anchorAttribute: sectionAnchorAttribute(
      theme.short_name ?? theme.id ?? key,
      theme.name,
    ),
    isSubsetSection: false,
    descriptionParagraphs: splitParagraphs(theme.theme),
    requirements: indicators,
  };
}

function collectSingleKsiDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: KsiDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): BuildArtifact | null {
  if (mapping.source.collection !== "KSI") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const sections = sourceKsiThemes(rules, mapping)
    .map(({ key, theme }) =>
      buildKsiThemeSectionViewModel(key, theme, mapping, doNotLinkTerms),
    )
    .filter((section): section is SectionViewModel => section !== null);

  if (!sections.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  const relativePath = normalizeGeneratedPath(mapping.output);
  const title = mapping.title ?? "Key Security Indicators";

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    title,
    documentType: "KSI",
    context: buildDocumentContext(title, {
      statusSpan: pictographSpan(config, mapping.status),
      tags: versionTags(["20x"]),
      isKsiDocument: true,
      isRequirementsDocument: true,
      sections,
    }),
  };
}

function collectThemeKsiDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: KsiDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): BuildArtifact[] {
  if (mapping.source.collection !== "KSI") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  return sourceKsiThemes(rules, mapping)
    .map(({ key, theme }): BuildArtifact | null => {
      const indicators = buildKsiIndicatorViewModels(
        theme,
        mapping,
        doNotLinkTerms,
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
          statusSpan: pictographSpan(
            config,
            generatedDocumentStatus(config, theme.status, `KSI.${key}`),
          ),
          tags: versionTags(["20x"]),
          isKsiDocument: true,
          themeParagraphs: splitParagraphs(theme.theme),
          indicators,
        }),
      };
    })
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function collectKsiDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: KsiDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): BuildArtifact[] {
  if (ksiDocumentOutputMode(mapping) === "single") {
    const artifact = collectSingleKsiDocumentArtifact(
      rules,
      config,
      mapping,
      doNotLinkTerms,
    );
    return artifact ? [artifact] : [];
  }

  return collectThemeKsiDocumentArtifacts(
    rules,
    config,
    mapping,
    doNotLinkTerms,
  );
}

function collectConfiguredKsiDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
): BuildArtifact[] {
  return (config.generated.ksiDocuments ?? []).flatMap((mapping) =>
    collectKsiDocumentArtifacts(rules, config, mapping, doNotLinkTerms),
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

  const sourceDocumentEntries = sourceDeadlineDocuments(rules, mapping);
  const documents = sourceDocumentEntries.map((entry) => entry.document);
  if (!documents.length) {
    return [];
  }

  const status = combinedDeadlineDocumentStatus(
    config,
    documents,
    `deadline document mapping "${mapping.id}"`,
  );

  return mapping.source.types
    .map((version): BuildArtifact | null => {
      const relativePath = normalizeGeneratedPath(
        renderDeadlineDocumentOutput(mapping, version),
      );
      const deadlineTables = buildDeadlineTables(
        sourceDocumentEntries,
        version,
        relativePath,
        rules,
        config,
        mapping,
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
          statusSpan: pictographSpan(config, status),
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

function collectReferenceIndexDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: ReferenceIndexDocumentMappingConfig,
): BuildArtifact | null {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const sourceDocumentEntries = sourceReferenceIndexDocuments(rules, mapping);
  if (!sourceDocumentEntries.length) {
    return null;
  }

  const relativePath = normalizeGeneratedPath(mapping.output);

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    title: mapping.title,
    documentType: "FRR_REFERENCE_INDEX",
    context: buildDocumentContext(mapping.title, {
      description: mapping.description,
      purpose: mapping.purpose,
      pictoSource: "machine",
      pictoStatus: mapping.status,
      statusSpan: pictographSpan(config, mapping.status),
      purposeParagraphs: splitParagraphs(mapping.introduction),
      referenceIndexRows: buildReferenceIndexRows(sourceDocumentEntries),
    }),
  };
}

function collectReferenceIndexDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
): BuildArtifact[] {
  return (config.generated.referenceIndexDocuments ?? [])
    .map((mapping) => collectReferenceIndexDocumentArtifact(rules, config, mapping))
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function addUniqueParagraphs(target: string[], paragraphs: string[]): void {
  const existingParagraphs = new Set(target);

  for (const paragraph of paragraphs) {
    if (existingParagraphs.has(paragraph)) {
      continue;
    }

    target.push(paragraph);
    existingParagraphs.add(paragraph);
  }
}

function buildFrrCollectionSectionViewModel(
  document: RequirementDocumentSource,
  mapping: FrrCollectionDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleLinkContext: RuleLinkContext,
): SectionViewModel | null {
  const requirements: RequirementViewModel[] = [];
  const descriptionParagraphs = splitParagraphs(document.info.purpose);
  const allowedSections = mapping.source.sections;
  const definitionsHref = mapping.definitionsHref ?? "definitions/";
  const rulesHref = mapping.rulesHref ?? "";
  const subsets = subsetsForVersions(document.info, mapping.source.types);

  for (const bucketName of configuredBuckets(mapping)) {
    const bucket = document.data[bucketName];
    if (!bucket) {
      continue;
    }

    for (const [subsetKey, sectionRequirements] of Object.entries(bucket)) {
      if (allowedSections && !allowedSections.includes(subsetKey)) {
        continue;
      }

      const matchingRequirements = Object.entries(sectionRequirements).filter(
        ([, requirement]) => requirementMatchesMapping(requirement, mapping),
      );
      if (!matchingRequirements.length) {
        continue;
      }

      addUniqueParagraphs(
        descriptionParagraphs,
        splitParagraphs(subsets[subsetKey]?.description),
      );

      for (const [id, requirement] of matchingRequirements) {
        requirements.push(
          buildRequirementViewModel(
            id,
            requirement,
            definitionsHref,
            rulesHref,
            doNotLinkTerms,
            ruleLinkContext,
          ),
        );
      }
    }
  }

  if (!requirements.length) {
    return null;
  }

  return {
    title: document.info.name,
    anchorId: sectionAnchorId(
      document.info.short_name ?? document.info.web_name,
      document.info.name,
    ),
    anchorAttribute: sectionAnchorAttribute(
      document.info.short_name ?? document.info.web_name,
      document.info.name,
    ),
    isSubsetSection: false,
    descriptionParagraphs,
    requirements,
  };
}

function collectFrrCollectionDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: FrrCollectionDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleIndex: RuleIndex,
  rulePageIndex: RulePageIndex,
): BuildArtifact | null {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  const relativePath = normalizeGeneratedPath(mapping.output);
  const sourceDocumentEntries = sourceDocuments(rules, mapping);
  const sections = sourceDocumentEntries
    .map(({ document }) =>
      buildFrrCollectionSectionViewModel(
        document,
        mapping,
        doNotLinkTerms,
        {
          currentMapping: mapping,
          currentRelativePath: relativePath,
          ruleIndex,
          rulePageIndex,
        },
      ),
    )
    .filter((section): section is SectionViewModel => section !== null);

  if (!sections.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  return {
    relativePath,
    outputPath: resolveGeneratedOutputPath(config, relativePath),
    templatePath: resolveToolPath(mapping.template ?? config.paths.template),
    mappingId: mapping.id,
    title: mapping.title,
    documentType: "FRR",
    context: buildDocumentContext(mapping.title, {
      statusSpan: pictographSpan(config, mapping.status),
      tags: versionTags(mapping.source.types),
      isRequirementsDocument: true,
      sections,
    }),
  };
}

function collectFrrCollectionDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleIndex: RuleIndex,
  rulePageIndex: RulePageIndex,
): BuildArtifact[] {
  return (config.generated.frrCollectionDocuments ?? [])
    .map((mapping) =>
      collectFrrCollectionDocumentArtifact(
        rules,
        config,
        mapping,
        doNotLinkTerms,
        ruleIndex,
        rulePageIndex,
      ),
    )
    .filter((artifact): artifact is BuildArtifact => artifact !== null);
}

function collectSingleRuleDocumentArtifact(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: RuleDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleIndex: RuleIndex,
  rulePageIndex: RulePageIndex,
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
  const relativePath = normalizeGeneratedPath(renderRuleDocumentOutput(mapping));
  const sections = buildConfiguredSections(
    documents,
    mapping,
    doNotLinkTerms,
    {
      currentMapping: mapping,
      currentRelativePath: relativePath,
      ruleIndex,
      rulePageIndex,
    },
  );
  if (!sections.length && mapping.emptyBehavior === "skip") {
    return null;
  }

  const title = mapping.title ?? firstDocument.info.name;
  const purposeParagraphs =
    documents.length === 1 ? splitParagraphs(firstDocument.info.purpose) : [];
  const flows =
    documents.length === 1
      ? buildFlowViewModels(
          firstDocument.info,
          mapping.source.types,
          buildRequirementIndex(sections),
        )
      : [];
  const effectiveEntries =
    mapping.includeEffectiveDates === false || documents.length !== 1
      ? []
      : toEffectiveEntries(firstDocument.info, mapping.source.types);

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
      statusSpan: pictographSpan(
        config,
        combinedGeneratedDocumentStatus(
          config,
          documents.map((document) => ({
            label: `FRR.${document.info.short_name ?? document.info.web_name}.info`,
            status: document.info.status,
          })),
          `rule document mapping "${mapping.id}"`,
        ),
      ),
      tags: versionTags(mapping.source.types),
      purposeParagraphs,
      tableOfContents: buildSectionTableOfContents(sections),
      effectiveEntries,
      flows,
      isRequirementsDocument: true,
      sections,
    }),
  };
}

function collectDocumentRuleDocumentArtifacts(
  rules: RulesDocument,
  config: ToolConfig,
  mapping: RuleDocumentMappingConfig,
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleIndex: RuleIndex,
  rulePageIndex: RulePageIndex,
): BuildArtifact[] {
  if (mapping.source.collection !== "FRR") {
    throw new Error(`Unsupported source collection: ${mapping.source.collection}`);
  }

  return sourceDocuments(rules, mapping)
    .map(({ key, document }): BuildArtifact | null => {
      const relativePath = normalizeGeneratedPath(
        renderRuleDocumentOutput(mapping, document.info.web_name),
      );
      const sections = buildConfiguredSections(
        [document],
        mapping,
        doNotLinkTerms,
        {
          currentMapping: mapping,
          currentRelativePath: relativePath,
          ruleIndex,
          rulePageIndex,
        },
      );
      if (!sections.length && mapping.emptyBehavior === "skip") {
        return null;
      }

      const title = document.info.name;
      const effectiveEntries =
        mapping.includeEffectiveDates === false
          ? []
          : toEffectiveEntries(document.info, mapping.source.types);

      return {
        relativePath,
        outputPath: resolveGeneratedOutputPath(config, relativePath),
        templatePath: resolveToolPath(mapping.template ?? config.paths.template),
        mappingId: mapping.id,
        sourceDocument: key,
        title,
        documentType: "FRR",
        context: buildDocumentContext(title, {
          statusSpan: pictographSpan(
            config,
            generatedDocumentStatus(config, document.info.status, `FRR.${key}.info`),
          ),
          tags: versionTags(mapping.source.types),
          purposeParagraphs: splitParagraphs(document.info.purpose),
          tableOfContents: buildSectionTableOfContents(sections),
          effectiveEntries,
          flows: buildFlowViewModels(
            document.info,
            mapping.source.types,
            buildRequirementIndex(sections),
          ),
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
  doNotLinkTerms: DoNotLinkTermIndex,
  ruleIndex: RuleIndex,
  rulePageIndex: RulePageIndex,
): BuildArtifact[] {
  if (mapping.outputMode === "documents") {
    return collectDocumentRuleDocumentArtifacts(
      rules,
      config,
      mapping,
      doNotLinkTerms,
      ruleIndex,
      rulePageIndex,
    );
  }

  const artifact = collectSingleRuleDocumentArtifact(
    rules,
    config,
    mapping,
    doNotLinkTerms,
    ruleIndex,
    rulePageIndex,
  );
  return artifact ? [artifact] : [];
}

export function collectArtifacts(
  rules: RulesDocument,
  config: ToolConfig = DEFAULT_CONFIG,
): BuildArtifact[] {
  const artifacts: BuildArtifact[] = [];
  const doNotLinkTerms = buildDoNotLinkTermIndex(rules.FRD);
  const ruleIndex = buildRuleIndex(rules);
  const rulePageIndex = buildRulePageIndex(rules, config, ruleIndex);

  artifacts.push(...collectDefinitionDocumentArtifacts(rules, config));
  artifacts.push(
    ...collectConfiguredKsiDocumentArtifacts(rules, config, doNotLinkTerms),
  );
  artifacts.push(...collectDeadlineDocumentArtifacts(rules, config));
  artifacts.push(...collectReferenceIndexDocumentArtifacts(rules, config));
  artifacts.push(
    ...collectFrrCollectionDocumentArtifacts(
      rules,
      config,
      doNotLinkTerms,
      ruleIndex,
      rulePageIndex,
    ),
  );

  for (const mapping of config.generated.ruleDocuments) {
    artifacts.push(
      ...collectRuleDocumentArtifacts(
        rules,
        config,
        mapping,
        doNotLinkTerms,
        ruleIndex,
        rulePageIndex,
      ),
    );
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

function assertUniqueGeneratedOutputs(artifacts: BuildArtifact[]): void {
  const mappingByPath = new Map<string, string>();

  for (const artifact of artifacts) {
    const existingMappingId = mappingByPath.get(artifact.relativePath);
    if (existingMappingId) {
      throw new Error(
        `Generated output "${artifact.relativePath}" is produced by multiple mappings: ${existingMappingId}, ${artifact.mappingId}.`,
      );
    }

    mappingByPath.set(artifact.relativePath, artifact.mappingId);
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

  await renderContentPictographs(toolConfig);
  assertUniqueGeneratedOutputs(artifacts);
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
