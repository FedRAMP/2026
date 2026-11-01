import { stat } from "node:fs/promises";
import path from "node:path";
import { loadToolConfig, resolveToolPath } from "./config";

async function isNonemptyFile(file: string): Promise<boolean> {
  try {
    const info = await stat(file);
    return info.isFile() && info.size > 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  const src = resolveToolPath(config.paths.src);
  const html = resolveToolPath(config.paths.html);
  const manifestPath = path.join(src, config.generated.manifest);

  const manifest: unknown = await Bun.file(manifestPath).json();

  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("files" in manifest) ||
    !Array.isArray(manifest.files) ||
    !manifest.files.every((file): file is string => typeof file === "string")
  ) {
    throw new Error(`Invalid generated manifest: ${manifestPath}`);
  }

  const files = manifest.files as string[];

  if (files.length === 0) {
    throw new Error("Generated Markdown manifest is empty");
  }

  const missing: string[] = [];

  if (!(await isNonemptyFile(path.join(html, "index.html")))) {
    missing.push("Site homepage: index.html");
  }

  for (const name of files) {
    if (!(await isNonemptyFile(path.join(src, name)))) {
      missing.push(`Generated source: ${name}`);
      continue;
    }

    if (path.extname(name).toLowerCase() !== ".md") {
      continue;
    }

    const stem = name.slice(0, -3);
    const candidates = [
      path.join(html, `${stem}.html`),
      path.join(html, stem, "index.html"),
    ];

    const exists = await Promise.all(candidates.map(isNonemptyFile));

    if (!exists.some(Boolean)) {
      missing.push(`HTML for ${name}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Site output is incomplete:\n- ${missing.join("\n- ")}`);
  }

  console.log(`Verified output for ${files.length} generated artifacts.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
