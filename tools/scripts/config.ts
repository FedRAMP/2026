import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import defaultConfig from "../config.json";

export type RuleType = "20x" | "rev5";
export type GeneratedEmptyBehavior = "write" | "skip";
export type BothRulesPosition = "first" | "last";
export type RuleDocumentSelection = string[] | "ALL";
export type RuleDocumentGrouping = "section" | "document";
export type RuleDocumentOutputMode = "single" | "documents";

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
  types?: RuleType[];
  includeBoth?: boolean;
  bothPosition?: BothRulesPosition;
}

export interface DefinitionDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  template?: string;
  emptyBehavior?: GeneratedEmptyBehavior;
  includeEffectiveDates?: boolean;
  source: DefinitionDocumentSourceConfig;
}

export interface RuleDocumentSourceConfig {
  collection: "FRR";
  document?: string;
  documents?: RuleDocumentSelection;
  types: RuleType[];
  affects?: string[];
  sections?: string[];
  includeBoth?: boolean;
  bothPosition?: BothRulesPosition;
  groupBy?: RuleDocumentGrouping;
}

export interface RuleDocumentMappingConfig {
  id: string;
  title?: string;
  output: string;
  outputMode?: RuleDocumentOutputMode;
  template?: string;
  definitionsHref?: string;
  rulesHref?: string;
  emptyBehavior?: GeneratedEmptyBehavior;
  includeEffectiveDates?: boolean;
  source: RuleDocumentSourceConfig;
}

export interface GeneratedConfig {
  manifest: string;
  definitions?: DefinitionsMappingConfig;
  definitionDocuments?: DefinitionDocumentMappingConfig[];
  ruleDocuments: RuleDocumentMappingConfig[];
}

export interface DevConfig {
  watchDebounceMs?: number;
}

export interface ToolConfig {
  paths: ToolPathsConfig;
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
