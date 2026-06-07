import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import defaultConfig from "../config.json";

export type RuleType = "20x" | "rev5";
export type RuleTypeSelection = RuleType | "all";
export type GeneratedEmptyBehavior = "write" | "skip";
export type AllRulesPosition = "first" | "last";
export type RuleDocumentSelection = string[] | "ALL";
export type KsiThemeSelection = string[] | "ALL";
export type RuleDocumentGrouping = "section" | "document";
export type RuleDocumentOutputMode = "single" | "documents";
export type KsiDocumentOutputMode = "single" | "themes";
export type RuleDocumentLinkTargetScope = "default" | "sameMappingOnly";
export type GeneratedDocumentStatus = "stable" | "placeholder" | "empty";
export type GeneratedDocumentSource = "machine" | "person";

export interface PictographsConfig {
  source: Record<GeneratedDocumentSource, string>;
  status: Record<GeneratedDocumentStatus, string>;
  tooltips: Record<GeneratedDocumentSource | GeneratedDocumentStatus, string>;
}

export interface ToolPathsConfig {
  src: string;
  content: string;
  html: string;
  rulesFile: string;
  template: string;
  partials: string;
  zensicalConfig: string;
}

export interface DefinitionsMappingConfig {
  enabled: boolean;
  title?: string;
  output: string;
  template?: string;
}

export interface DefinitionDocumentSourceConfig {
  collection: "FRD";
  types?: RuleTypeSelection[];
  includeAll?: boolean;
  allPosition?: AllRulesPosition;
}

export interface DefinitionDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  status: GeneratedDocumentStatus;
  template?: string;
  emptyBehavior?: GeneratedEmptyBehavior;
  includeEffectiveDates?: boolean;
  source: DefinitionDocumentSourceConfig;
}

export interface RuleDocumentSourceConfig {
  collection: "FRR";
  document?: string;
  documents?: RuleDocumentSelection;
  ignoreDocuments?: string[];
  types: RuleTypeSelection[];
  affects?: string[];
  sections?: string[];
  includeAll?: boolean;
  allPosition?: AllRulesPosition;
  groupBy?: RuleDocumentGrouping;
}

export interface RuleDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  outputMode?: RuleDocumentOutputMode;
  status: GeneratedDocumentStatus;
  template?: string;
  definitionsHref?: string;
  rulesHref?: string;
  linkTargetScope?: RuleDocumentLinkTargetScope;
  emptyBehavior?: GeneratedEmptyBehavior;
  includeEffectiveDates?: boolean;
  source: RuleDocumentSourceConfig;
}

export interface FrrCollectionDocumentMappingConfig {
  id: string;
  title: string;
  output: string;
  status: GeneratedDocumentStatus;
  template?: string;
  definitionsHref?: string;
  rulesHref?: string;
  linkTargetScope?: RuleDocumentLinkTargetScope;
  emptyBehavior?: GeneratedEmptyBehavior;
  source: RuleDocumentSourceConfig;
}

export interface KsiDocumentSourceConfig {
  collection: "KSI";
  theme?: string;
  themes?: KsiThemeSelection;
}

export interface KsiDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  outputMode?: KsiDocumentOutputMode;
  status: GeneratedDocumentStatus;
  template?: string;
  definitionsHref?: string;
  emptyBehavior?: GeneratedEmptyBehavior;
  source: KsiDocumentSourceConfig;
}

export interface DeadlineDocumentSourceConfig {
  collection: "FRR";
  documents?: RuleDocumentSelection;
  ignoreDocuments?: string[];
  types: RuleTypeSelection[];
  affects?: string[];
}

export interface DeadlineDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  status: GeneratedDocumentStatus;
  template?: string;
  source: DeadlineDocumentSourceConfig;
}

export interface ReferenceIndexDocumentSourceConfig {
  collection: "FRR";
  documents?: RuleDocumentSelection;
  ignoreDocuments?: string[];
}

export interface ReferenceIndexDocumentMappingConfig {
  id: string;
  title: string;
  description: string;
  purpose: string;
  introduction?: string;
  output: string;
  status: GeneratedDocumentStatus;
  template?: string;
  source: ReferenceIndexDocumentSourceConfig;
}

export interface TodoDocumentConfig {
  title?: string;
  output: string;
  description: string;
  purpose: string;
  source: GeneratedDocumentSource;
  status: GeneratedDocumentStatus;
}

export interface GeneratedConfig {
  manifest: string;
  todo?: TodoDocumentConfig;
  definitions?: DefinitionsMappingConfig;
  definitionDocuments?: DefinitionDocumentMappingConfig[];
  ksiDocuments?: KsiDocumentMappingConfig[];
  deadlineDocuments?: DeadlineDocumentMappingConfig[];
  referenceIndexDocuments?: ReferenceIndexDocumentMappingConfig[];
  frrCollectionDocuments?: FrrCollectionDocumentMappingConfig[];
  ruleDocuments: RuleDocumentMappingConfig[];
}

export interface DevConfig {
  watchDebounceMs?: number;
}

export interface ToolConfig {
  paths: ToolPathsConfig;
  pictographs: PictographsConfig;
  generated: GeneratedConfig;
  dev?: DevConfig;
}

export const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const TOOLS_DIR = path.resolve(SCRIPT_DIR, "..");
export const REPO_ROOT = path.resolve(TOOLS_DIR, "..");
export const CONFIG_FILE = path.join(TOOLS_DIR, "config.json");
export const DEFAULT_CONFIG = defaultConfig as ToolConfig;

export async function loadToolConfig(): Promise<ToolConfig> {
  const source = await readFile(CONFIG_FILE, "utf8");
  return JSON.parse(source) as ToolConfig;
}

export function resolveToolPath(configPath: string): string {
  return path.resolve(TOOLS_DIR, configPath);
}

export function relativeToTools(absolutePath: string): string {
  return path.relative(TOOLS_DIR, absolutePath);
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function assertPathInside(
  parentDirectory: string,
  targetPath: string,
  label: string,
): void {
  const relativePath = path.relative(parentDirectory, targetPath);
  if (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  ) {
    return;
  }

  throw new Error(`${label} must stay inside ${parentDirectory}: ${targetPath}`);
}
