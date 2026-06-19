import { spawn } from "node:child_process";

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error(`Failed to run ${command}: ${error.message}`);
      resolve(1);
    });
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

const testStatus = await runCommand("bun", ["test"]);
const typeScriptStatus = await runCommand("bunx", [
  "tsc",
  "-p",
  "tsconfig.json",
  "--noEmit",
]);
const styleStatus = await runCommand("bun", [
  "run",
  "./scripts/style-warnings.ts",
]);

if (testStatus !== 0 || typeScriptStatus !== 0 || styleStatus !== 0) {
  process.exitCode = 1;
}
