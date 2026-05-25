import fs from "node:fs";
import path from "node:path";
import { loadToolConfig, resolveToolPath } from "./config";

interface CopyStats {
  count: number;
}

export interface DeploySummary {
  copiedFiles: number;
  executionTimeMs: number;
  srcPath: string;
  htmlPath: string;
}

export interface DeployOptions {
  clearHtml?: boolean;
}

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function clearDirectory(dirPath: string): void {
  fs.rmSync(dirPath, { force: true, recursive: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRecursive(
  src: string,
  dest: string,
  stats: CopyStats,
): void {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath, stats);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      stats.count++;
    }
  }
}

export async function deploy(options: DeployOptions = {}): Promise<DeploySummary> {
  const config = await loadToolConfig();
  const startTime = Date.now();
  const stats: CopyStats = { count: 0 };
  const clearHtmlOutput = options.clearHtml ?? true;

  const srcPath = resolveToolPath(config.paths.src);
  const contentPath = resolveToolPath(config.paths.content);
  const htmlPath = resolveToolPath(config.paths.html);

  clearDirectory(srcPath);

  if (clearHtmlOutput) {
    clearDirectory(htmlPath);
  } else {
    ensureDirectory(htmlPath);
  }

  copyRecursive(contentPath, srcPath, stats);

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  return {
    copiedFiles: stats.count,
    executionTimeMs: executionTime,
    srcPath,
    htmlPath,
  };
}

if (import.meta.main) {
  deploy()
    .then((summary) => {
      console.log(`Files copied: ${summary.copiedFiles}`);
      console.log(`Execution time: ${summary.executionTimeMs}ms`);
    })
    .catch((error) => {
      console.error("Deploy failed:", error);
      process.exit(1);
    });
}
