import { spawn } from "node:child_process";
import fs, { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarkdown } from "./build-markdown";
import {
  CONFIG_FILE,
  REPO_ROOT,
  loadToolConfig,
  resolveToolPath,
} from "./config";
import { deploy } from "./deploy";

const BUILD_SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "build-markdown.ts",
);

interface ContentSnapshot {
  exists: boolean;
  kind: "directory" | "file" | "other";
  mtimeMs: number;
  size: number;
}

let isBuilding = false;
let buildQueued = false;
let buildTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDeploy = false;
let queuedDeploy = false;

async function runPipeline(reason: string, shouldDeploy: boolean): Promise<void> {
  if (isBuilding) {
    buildQueued = true;
    queuedDeploy = queuedDeploy || shouldDeploy;
    return;
  }

  isBuilding = true;
  console.log(`[dev] rebuilding site inputs (${reason})`);

  try {
    if (shouldDeploy) {
      const deploySummary = await deploy({ clearHtml: false });
      console.log(`[dev] copied ${deploySummary.copiedFiles} content files`);
    }

    const summary = await buildMarkdown();
    console.log(`[dev] generated ${summary.artifactCount} markdown files`);
  } catch (error) {
    console.error("[dev] site input build failed");
    console.error(error);
  } finally {
    isBuilding = false;

    if (buildQueued) {
      const nextShouldDeploy = queuedDeploy;
      buildQueued = false;
      queuedDeploy = false;
      await runPipeline("queued change", nextShouldDeploy);
    }
  }
}

function schedulePipeline(reason: string, shouldDeploy = false): void {
  pendingDeploy = pendingDeploy || shouldDeploy;

  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    const nextShouldDeploy = pendingDeploy;
    buildTimer = null;
    pendingDeploy = false;
    void runPipeline(reason, nextShouldDeploy);
  }, currentWatchDebounceMs);
}

let currentWatchDebounceMs = 1000;

function contentSnapshotFor(
  contentDir: string,
  relativeFileName: string,
): ContentSnapshot {
  const targetPath = path.resolve(contentDir, relativeFileName);
  const relativePath = path.relative(contentDir, targetPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return {
      exists: false,
      kind: "other",
      mtimeMs: 0,
      size: 0,
    };
  }

  try {
    const stat = fs.statSync(targetPath);
    const kind = stat.isDirectory()
      ? "directory"
      : stat.isFile()
        ? "file"
        : "other";

    return {
      exists: true,
      kind,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        exists: false,
        kind: "other",
        mtimeMs: 0,
        size: 0,
      };
    }

    throw error;
  }
}

function snapshotsAreEqual(
  left: ContentSnapshot | undefined,
  right: ContentSnapshot,
): boolean {
  if (!left) {
    return false;
  }

  return (
    left.exists === right.exists &&
    left.kind === right.kind &&
    left.mtimeMs === right.mtimeMs &&
    left.size === right.size
  );
}

function primeContentSnapshots(
  contentDir: string,
  snapshots: Map<string, ContentSnapshot>,
  relativeDir = ".",
): void {
  const absoluteDir =
    relativeDir === "." ? contentDir : path.join(contentDir, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });

  if (relativeDir !== ".") {
    snapshots.set(relativeDir, contentSnapshotFor(contentDir, relativeDir));
  }

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    snapshots.set(relativePath, contentSnapshotFor(contentDir, relativePath));

    if (entry.isDirectory()) {
      primeContentSnapshots(contentDir, snapshots, relativePath);
    }
  }
}

export function createContentChangeFilter(
  contentDir: string,
): (fileName: string | Buffer) => boolean {
  const snapshots = new Map<string, ContentSnapshot>();
  primeContentSnapshots(contentDir, snapshots);

  return (fileName: string | Buffer): boolean => {
    const relativeFileName = path.normalize(fileName.toString());
    const nextSnapshot = contentSnapshotFor(contentDir, relativeFileName);
    const previousSnapshot = snapshots.get(relativeFileName);

    snapshots.set(relativeFileName, nextSnapshot);

    return !snapshotsAreEqual(previousSnapshot, nextSnapshot);
  };
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  currentWatchDebounceMs = config.dev?.watchDebounceMs ?? 1000;

  const contentDir = resolveToolPath(config.paths.content);
  const templatesDir = path.dirname(resolveToolPath(config.paths.template));
  const partialsDir = resolveToolPath(config.paths.partials);
  const rulesFile = resolveToolPath(config.paths.rulesFile);
  const zensicalConfig = resolveToolPath(config.paths.zensicalConfig);

  await runPipeline("initial build", true);

  const hasMeaningfulContentChange = createContentChangeFilter(contentDir);

  const zensical = spawn("zensical", ["serve", "-f", zensicalConfig], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  const templateWatcher = watch(
    templatesDir,
    { recursive: true },
    (_eventType, fileName) => {
      if (!fileName || !fileName.endsWith(".hbs")) {
        return;
      }

      schedulePipeline(`template change: ${fileName}`);
    },
  );

  const partialsWatcher =
    partialsDir === templatesDir
      ? null
      : watch(partialsDir, { recursive: true }, (_eventType, fileName) => {
          if (!fileName || !fileName.endsWith(".hbs")) {
            return;
          }

          schedulePipeline(`partial change: ${fileName}`);
        });

  const contentWatcher = watch(
    contentDir,
    { recursive: true },
    (_eventType, fileName) => {
      if (!fileName) {
        return;
      }

      if (!hasMeaningfulContentChange(fileName)) {
        return;
      }

      schedulePipeline(`content change: ${fileName}`, true);
    },
  );

  const buildWatcher = watch(BUILD_SCRIPT, () => {
    schedulePipeline("generator change");
  });

  const configWatcher = watch(CONFIG_FILE, () => {
    schedulePipeline("config change", true);
  });

  const rulesWatcher = watch(rulesFile, () => {
    schedulePipeline("rules source change");
  });

  const cleanup = () => {
    templateWatcher.close();
    partialsWatcher?.close();
    contentWatcher.close();
    buildWatcher.close();
    configWatcher.close();
    rulesWatcher.close();

    if (!zensical.killed) {
      zensical.kill("SIGTERM");
    }
  };

  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });

  zensical.on("exit", (code, signal) => {
    cleanup();

    if (signal) {
      process.exit(0);
      return;
    }

    process.exit(code ?? 0);
  });
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("[dev] failed to start preview");
    console.error(error);
    process.exit(1);
  });
}
