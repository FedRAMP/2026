import { spawn } from "node:child_process";
import { buildMarkdown } from "./build-markdown";
import { REPO_ROOT, loadToolConfig, resolveToolPath } from "./config";
import { deploy } from "./deploy";
import { buildTodo } from "./todo-builder";

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited from signal ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

async function main(): Promise<void> {
  const config = await loadToolConfig();
  const deploySummary = await deploy();
  console.log(`Files copied: ${deploySummary.copiedFiles}`);
  console.log(`Deploy execution time: ${deploySummary.executionTimeMs}ms`);

  const buildSummary = await buildMarkdown(config);
  console.log(`Generated ${buildSummary.artifactCount} markdown files.`);
  for (const artifact of buildSummary.artifacts) {
    console.log(`- ${artifact.relativePath}`);
  }

  const todoSummary = await buildTodo(config);
  console.log(
    `Generated ${todoSummary.relativePath} with ${todoSummary.pageCount} pages.`,
  );

  await runCommand("zensical", [
    "build",
    "--clean",
    "-f",
    resolveToolPath(config.paths.zensicalConfig),
  ]);
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
