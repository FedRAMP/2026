import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parse } from "smol-toml";
import { loadToolConfig as readConfig, resolveToolPath } from "../config";
import type { loadRules as readRules } from "../build-markdown";
import { parseOscalCatalog } from "../oscal-catalog";

export type Rules = Awaited<ReturnType<typeof readRules>>;
export async function readTree(root: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (entry.isFile())
        files.set(
          path.relative(root, filename).split(path.sep).join("/"),
          await readFile(filename),
        );
    }
  }
  await visit(root);
  return files;
}

// One immutable-in-practice snapshot per test process. Never fetch or sync inputs.
const snapshot = (async () => {
  const config = await readConfig();
  const [json, xml, toml, content] = await Promise.all([
    readFile(resolveToolPath(config.paths.rulesFile), "utf8"),
    readFile(resolveToolPath(config.paths.oscalCatalogFile), "utf8"),
    readFile(resolveToolPath(config.paths.zensicalConfig), "utf8"),
    readTree(resolveToolPath(config.paths.content)),
  ]);
  return {
    config,
    rules: JSON.parse(json) as Rules,
    catalog: parseOscalCatalog(xml),
    navigation: parse(toml),
    content,
  };
})();
export const sources = () => snapshot;
// Callers may modify fixtures without contaminating subsequent tests.
export const loadToolConfig = async () =>
  structuredClone((await snapshot).config);
export const loadRules = async (_config?: unknown) =>
  structuredClone((await snapshot).rules);
