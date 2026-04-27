import fs from "fs";
import path from "path";
import config from "./config.json";

interface CopyStats {
  count: number;
}

async function ensureDirectory(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function clearDirectory(dirPath: string): Promise<void> {
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

async function copyRecursive(
  src: string,
  dest: string,
  stats: CopyStats
): Promise<void> {
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      await copyRecursive(srcPath, destPath, stats);
    } else {
      fs.copyFileSync(srcPath, destPath);
      stats.count++;
    }
  }
}

async function deploy(): Promise<void> {
  const startTime = Date.now();
  const stats: CopyStats = { count: 0 };

  const srcPath = path.resolve(__dirname, config.src);
  const contentPath = path.resolve(__dirname, config.content);
  const htmlPath = path.resolve(__dirname, config.html);

  // Ensure and clear src directory
  await ensureDirectory(srcPath);
  await clearDirectory(srcPath);

  // Ensure and clear html directory
  await ensureDirectory(htmlPath);
  await clearDirectory(htmlPath);

  // Copy files from content to src
  await copyRecursive(contentPath, srcPath, stats);

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  console.log(`Files copied: ${stats.count}`);
  console.log(`Execution time: ${executionTime}ms`);
}

deploy().catch((error) => {
  console.error("Deploy failed:", error);
  process.exit(1);
});
