import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarkdown } from "./build-markdown";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const TEMPLATES_DIR = path.join(ROOT_DIR, "templates");
const BUILD_SCRIPT = path.join(SCRIPT_DIR, "build-markdown.ts");
const ZENSICAL_CONFIG = path.join(ROOT_DIR, "zensical.toml");

let isBuilding = false;
let buildQueued = false;
let buildTimer: ReturnType<typeof setTimeout> | null = null;

async function runBuild(reason: string): Promise<void> {
  if (isBuilding) {
    buildQueued = true;
    return;
  }

  isBuilding = true;
  console.log(`[dev] rebuilding markdown (${reason})`);

  try {
    const summary = await buildMarkdown();
    console.log(`[dev] generated ${summary.artifactCount} markdown files`);
  } catch (error) {
    console.error("[dev] markdown build failed");
    console.error(error);
  } finally {
    isBuilding = false;

    if (buildQueued) {
      buildQueued = false;
      await runBuild("queued change");
    }
  }
}

function scheduleBuild(reason: string): void {
  if (buildTimer) {
    clearTimeout(buildTimer);
  }

  buildTimer = setTimeout(() => {
    buildTimer = null;
    void runBuild(reason);
  }, 150);
}

async function main(): Promise<void> {
  await runBuild("initial build");

  const zensical = spawn("zensical", ["serve", "-f", ZENSICAL_CONFIG], {
    cwd: ROOT_DIR,
    stdio: "inherit",
  });

  const templateWatcher = watch(
    TEMPLATES_DIR,
    { recursive: true },
    (_eventType, fileName) => {
      if (!fileName || !fileName.endsWith(".hbs")) {
        return;
      }

      scheduleBuild(`template change: ${fileName}`);
    },
  );

  const buildWatcher = watch(BUILD_SCRIPT, () => {
    scheduleBuild("generator change");
  });

  const cleanup = () => {
    templateWatcher.close();
    buildWatcher.close();

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
