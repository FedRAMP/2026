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
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    if (files.length > 0) {
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

function copyRecursive(
  src: string,
  dest: string,
  stats: CopyStats,
): void {
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath, stats);
    } else {
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

  ensureDirectory(srcPath);
  clearDirectory(srcPath);

  ensureDirectory(htmlPath);
  if (clearHtmlOutput) {
    clearDirectory(htmlPath);
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
