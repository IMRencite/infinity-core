import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ValidationRunRecord } from "../types";
import type { VentureSandbox } from "../workspace/sandbox";

export type ValidationOutcome = {
  passed: boolean;
  runs: ValidationRunRecord[];
};

function runCommand(cwd: string, command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  const isWin = process.platform === "win32";
  const cmd = isWin && !command.includes(".") ? `${command}.cmd` : command;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: isWin, env: { ...process.env, CI: "true" } });
    let output = "";
    child.stdout?.on("data", (d) => { output += String(d); });
    child.stderr?.on("data", (d) => { output += String(d); });
    child.on("close", (code) => resolve({ ok: code === 0, output: output.slice(-4000) }));
    child.on("error", (err) => resolve({ ok: false, output: err.message }));
  });
}

export async function validateRequiredFiles(sandbox: VentureSandbox): Promise<ValidationRunRecord> {
  const required = ["package.json", "app/layout.tsx", "app/page.tsx", "lib/venture-config.ts"];
  const missing: string[] = [];
  for (const file of required) {
    try {
      await sandbox.readTextFile(file);
    } catch {
      missing.push(file);
    }
  }
  return {
    validatorName: "required_files",
    status: missing.length === 0 ? "pass" : "fail",
    details: { missing },
  };
}

export async function validatePackageJson(sandbox: VentureSandbox): Promise<ValidationRunRecord> {
  try {
    const raw = await sandbox.readTextFile("package.json");
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
    const hasBuild = Boolean(parsed.scripts?.build);
    return {
      validatorName: "package_json",
      status: hasBuild ? "pass" : "fail",
      details: { hasBuild },
    };
  } catch (err) {
    return {
      validatorName: "package_json",
      status: "fail",
      details: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function validateProductionBuild(sandbox: VentureSandbox): Promise<ValidationRunRecord> {
  const install = await runCommand(sandbox.rootAbsolute, "npm", ["install", "--no-audit", "--no-fund"]);
  if (!install.ok) {
    return {
      validatorName: "production_build",
      status: "fail",
      details: { phase: "install", output: install.output },
    };
  }
  const build = await runCommand(sandbox.rootAbsolute, "npm", ["run", "build"]);
  return {
    validatorName: "production_build",
    status: build.ok ? "pass" : "fail",
    details: { phase: "build", output: build.output },
  };
}

export async function runAllValidators(
  sandbox: VentureSandbox,
  options?: { skipProductionBuild?: boolean },
): Promise<ValidationOutcome> {
  const runs: ValidationRunRecord[] = [];
  runs.push(await validateRequiredFiles(sandbox));
  runs.push(await validatePackageJson(sandbox));
  if (!options?.skipProductionBuild) {
    runs.push(await validateProductionBuild(sandbox));
  }
  const passed = runs.every((r) => r.status === "pass" || r.status === "skip");
  return { passed, runs };
}

export async function classifyValidationFailure(runs: ValidationRunRecord[]): Promise<string> {
  const failed = runs.find((r) => r.status === "fail");
  if (!failed) return "unknown";
  if (failed.validatorName === "required_files") return "missing_files";
  if (failed.validatorName === "package_json") return "invalid_package_json";
  const phase = failed.details.phase as string | undefined;
  if (phase === "install") return "dependency_install_failed";
  if (phase === "build") return "production_build_failed";
  return "validation_failed";
}

export async function applyRepairForFailure(
  sandbox: VentureSandbox,
  classification: string,
): Promise<{ action: Record<string, unknown>; filesPatched: string[] }> {
  const filesPatched: string[] = [];
  if (classification === "missing_files" || classification === "production_build_failed") {
    const pagePath = "app/page.tsx";
    let content = await sandbox.readTextFile(pagePath).catch(() => "");
    content = content
      .split("\n")
      .filter((line) => !line.includes("__PAB_BROKEN__"))
      .join("\n");
    if (!content.includes("export default")) {
      content = `export default function HomePage() { return <main><h1>Repaired</h1></main>; }\n`;
    }
    await sandbox.writeTextFile(pagePath, content);
    filesPatched.push(pagePath);
  }
  if (classification === "dependency_install_failed") {
    const pkg = JSON.parse(await sandbox.readTextFile("package.json"));
    pkg.dependencies = pkg.dependencies ?? {};
    await sandbox.writeTextFile("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
    filesPatched.push("package.json");
  }
  return { action: { classification, strategy: "deterministic_patch" }, filesPatched };
}

export async function computeBuildHash(sandbox: VentureSandbox): Promise<string> {
  const files = await sandbox.listFiles();
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256");
  for (const file of files) {
    if (file.startsWith("node_modules") || file.startsWith(".next")) continue;
    const content = await readFile(path.join(sandbox.rootAbsolute, file)).catch(() => "");
    hash.update(file);
    hash.update(content);
  }
  return hash.digest("hex");
}
