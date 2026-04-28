import { spawn } from "node:child_process";
import { watch } from "node:fs";
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
      const deploySummary = await deploy();
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

async function main(): Promise<void> {
  const config = await loadToolConfig();
  currentWatchDebounceMs = config.dev?.watchDebounceMs ?? 1000;

  const contentDir = resolveToolPath(config.paths.content);
  const templatesDir = path.dirname(resolveToolPath(config.paths.template));
  const partialsDir = resolveToolPath(config.paths.partials);
  const rulesFile = resolveToolPath(config.paths.rulesFile);
  const zensicalConfig = resolveToolPath(config.paths.zensicalConfig);

  await runPipeline("initial build", true);

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

main().catch((error) => {
  console.error("[dev] failed to start preview");
  console.error(error);
  process.exit(1);
});
