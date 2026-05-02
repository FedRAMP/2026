import { spawn } from "node:child_process";
import fs, { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarkdown } from "./build-markdown";
import {
  assertPathInside,
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

export interface ContentSnapshot {
  exists: boolean;
  kind: "directory" | "file" | "other";
  mtimeMs: number;
  size: number;
}

let isBuilding = false;
let buildQueued = false;
let buildTimer: ReturnType<typeof setTimeout> | null = null;
type DeployMode = "none" | "content" | "full";

interface PipelineRequest {
  contentChanges: ContentChange[];
  deployMode: DeployMode;
}

export interface ContentChange {
  next: ContentSnapshot;
  previous: ContentSnapshot | undefined;
  relativePath: string;
}

export interface ContentSyncSummary {
  copiedFiles: number;
  needsFullDeploy: boolean;
  removedFiles: number;
  reloadTargets: string[];
}

let pendingDeployMode: DeployMode = "none";
let queuedDeployMode: DeployMode = "none";
const pendingContentChanges = new Map<string, ContentChange>();
const queuedContentChanges = new Map<string, ContentChange>();
let devReloadTarget: string | null = null;
// Zensical can miss a file event that lands while it is rebuilding, so send a
// second post-build touch to the final src file.
const PREVIEW_RELOAD_SIGNAL_DELAYS_MS = [200, 1000];

function mergeDeployMode(left: DeployMode, right: DeployMode): DeployMode {
  if (left === "full" || right === "full") {
    return "full";
  }

  if (left === "content" || right === "content") {
    return "content";
  }

  return "none";
}

function addContentChanges(
  target: Map<string, ContentChange>,
  changes: ContentChange[],
): void {
  for (const change of changes) {
    target.set(change.relativePath, change);
  }
}

async function runPipeline(
  reason: string,
  request: PipelineRequest,
): Promise<void> {
  if (isBuilding) {
    buildQueued = true;
    queuedDeployMode = mergeDeployMode(queuedDeployMode, request.deployMode);
    addContentChanges(queuedContentChanges, request.contentChanges);
    return;
  }

  isBuilding = true;
  console.log(`[dev] rebuilding site inputs (${reason})`);

  try {
    const reloadTargets: string[] = [];

    if (request.deployMode === "full") {
      const deploySummary = await deploy({ clearHtml: false });
      console.log(`[dev] copied ${deploySummary.copiedFiles} content files`);
      reloadTargets.push(
        ...reloadTargetsForContentChanges(request.contentChanges),
      );
    } else if (request.deployMode === "content") {
      const syncSummary = await syncContentChanges(request.contentChanges);

      if (syncSummary.needsFullDeploy) {
        const deploySummary = await deploy({ clearHtml: false });
        console.log(`[dev] copied ${deploySummary.copiedFiles} content files`);
        reloadTargets.push(
          ...reloadTargetsForContentChanges(request.contentChanges),
        );
      } else {
        console.log(
          `[dev] synced ${syncSummary.copiedFiles} changed content file${
            syncSummary.copiedFiles === 1 ? "" : "s"
          }`,
        );
        if (syncSummary.removedFiles > 0) {
          console.log(
            `[dev] removed ${syncSummary.removedFiles} deleted content file${
              syncSummary.removedFiles === 1 ? "" : "s"
            }`,
          );
        }
        reloadTargets.push(...syncSummary.reloadTargets);
      }
    }

    const summary = await buildMarkdown();
    console.log(`[dev] generated ${summary.artifactCount} markdown files`);
    await signalPreviewReload(reloadTargets);
  } catch (error) {
    console.error("[dev] site input build failed");
    console.error(error);
  } finally {
    isBuilding = false;

    if (buildQueued) {
      const nextRequest: PipelineRequest = {
        contentChanges: Array.from(queuedContentChanges.values()),
        deployMode: queuedDeployMode,
      };
      buildQueued = false;
      queuedDeployMode = "none";
      queuedContentChanges.clear();
      await runPipeline("queued change", nextRequest);
    }
  }
}

function schedulePipeline(
  reason: string,
  deployMode: DeployMode = "none",
  contentChanges: ContentChange[] = [],
): void {
  pendingDeployMode = mergeDeployMode(pendingDeployMode, deployMode);
  addContentChanges(pendingContentChanges, contentChanges);

  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    const nextRequest: PipelineRequest = {
      contentChanges: Array.from(pendingContentChanges.values()),
      deployMode: pendingDeployMode,
    };
    buildTimer = null;
    pendingDeployMode = "none";
    pendingContentChanges.clear();
    void runPipeline(reason, nextRequest);
  }, currentWatchDebounceMs);
}

let currentWatchDebounceMs = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveChildPath(
  root: string,
  relativePath: string,
  label: string,
): string {
  const targetPath = path.resolve(root, relativePath);
  assertPathInside(root, targetPath, label);
  return targetPath;
}

async function signalPreviewReload(relativeTargets: string[] = []): Promise<void> {
  const config = await loadToolConfig();
  const srcDir = resolveToolPath(config.paths.src);
  const targetPaths = new Set<string>();

  for (const relativeTarget of relativeTargets) {
    const targetPath = resolveChildPath(
      srcDir,
      relativeTarget,
      "Preview reload target",
    );
    if (fs.existsSync(targetPath)) {
      targetPaths.add(targetPath);
    }
  }

  if (
    targetPaths.size === 0 &&
    devReloadTarget &&
    fs.existsSync(devReloadTarget)
  ) {
    targetPaths.add(devReloadTarget);
  }

  if (targetPaths.size === 0) {
    return;
  }

  let previousDelay = 0;
  for (const delayMs of PREVIEW_RELOAD_SIGNAL_DELAYS_MS) {
    await delay(delayMs - previousDelay);
    previousDelay = delayMs;

    const now = new Date();
    for (const targetPath of targetPaths) {
      fs.utimesSync(targetPath, now, now);
    }
  }
}

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

function normalizeContentRelativePath(fileName: string | Buffer): string | null {
  const relativeFileName = path.normalize(fileName.toString());
  if (
    relativeFileName === "." ||
    relativeFileName.startsWith("..") ||
    path.isAbsolute(relativeFileName)
  ) {
    return null;
  }

  return relativeFileName;
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
  const trackContentChange = createContentChangeTracker(contentDir);

  return (fileName: string | Buffer): boolean => {
    return trackContentChange(fileName) !== null;
  };
}

export function createContentChangeTracker(
  contentDir: string,
): (fileName: string | Buffer) => ContentChange | null {
  const snapshots = new Map<string, ContentSnapshot>();
  primeContentSnapshots(contentDir, snapshots);

  return (fileName: string | Buffer): ContentChange | null => {
    const relativeFileName = normalizeContentRelativePath(fileName);
    if (!relativeFileName) {
      return null;
    }

    const nextSnapshot = contentSnapshotFor(contentDir, relativeFileName);
    const previousSnapshot = snapshots.get(relativeFileName);

    snapshots.set(relativeFileName, nextSnapshot);

    if (snapshotsAreEqual(previousSnapshot, nextSnapshot)) {
      return null;
    }

    return {
      next: nextSnapshot,
      previous: previousSnapshot,
      relativePath: relativeFileName,
    };
  };
}

export function syncContentChangesToSrc(
  contentDir: string,
  srcDir: string,
  changes: ContentChange[],
): ContentSyncSummary {
  const summary: ContentSyncSummary = {
    copiedFiles: 0,
    needsFullDeploy: false,
    removedFiles: 0,
    reloadTargets: [],
  };

  for (const change of changes) {
    const currentSnapshot = contentSnapshotFor(contentDir, change.relativePath);
    const contentPath = resolveChildPath(
      contentDir,
      change.relativePath,
      "Content path",
    );
    const srcPath = resolveChildPath(srcDir, change.relativePath, "Source path");

    if (currentSnapshot.exists && currentSnapshot.kind === "file") {
      fs.mkdirSync(path.dirname(srcPath), { recursive: true });
      fs.copyFileSync(contentPath, srcPath);
      summary.copiedFiles++;
      summary.reloadTargets.push(change.relativePath);
      continue;
    }

    if (!currentSnapshot.exists && change.previous?.kind === "file") {
      if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
        fs.unlinkSync(srcPath);
        summary.removedFiles++;
      }
      continue;
    }

    if (currentSnapshot.exists || change.previous?.kind === "directory") {
      summary.needsFullDeploy = true;
    }
  }

  return summary;
}

async function syncContentChanges(
  changes: ContentChange[],
): Promise<ContentSyncSummary> {
  const config = await loadToolConfig();
  return syncContentChangesToSrc(
    resolveToolPath(config.paths.content),
    resolveToolPath(config.paths.src),
    changes,
  );
}

function reloadTargetsForContentChanges(changes: ContentChange[]): string[] {
  return changes
    .filter((change) => {
      return change.next.exists && change.next.kind === "file";
    })
    .map((change) => change.relativePath);
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  currentWatchDebounceMs = config.dev?.watchDebounceMs ?? 1000;

  const contentDir = resolveToolPath(config.paths.content);
  const templatesDir = path.dirname(resolveToolPath(config.paths.template));
  const partialsDir = resolveToolPath(config.paths.partials);
  const rulesFile = resolveToolPath(config.paths.rulesFile);
  const zensicalConfig = resolveToolPath(config.paths.zensicalConfig);

  await runPipeline("initial build", {
    contentChanges: [],
    deployMode: "full",
  });

  devReloadTarget = path.join(resolveToolPath(config.paths.src), "index.md");

  const trackContentChange = createContentChangeTracker(contentDir);

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

      const contentChange = trackContentChange(fileName);
      if (!contentChange) {
        return;
      }

      schedulePipeline(`content change: ${fileName}`, "content", [
        contentChange,
      ]);
    },
  );

  const buildWatcher = watch(BUILD_SCRIPT, () => {
    schedulePipeline("generator change");
  });

  const configWatcher = watch(CONFIG_FILE, () => {
    schedulePipeline("config change", "full");
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
