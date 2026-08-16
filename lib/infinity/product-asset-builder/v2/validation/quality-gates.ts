import { PLACEHOLDER_PATTERNS } from "../constants";
import type { FeatureContract } from "../types";
import type { VentureSandbox } from "../../workspace/sandbox";
import { spawn } from "node:child_process";

export type QualityGateResult = {
  gate: string;
  passed: boolean;
  details: Record<string, unknown>;
};

function runCmd(cwd: string, command: string, args: string[]): Promise<{ ok: boolean; output: string }> {
  const isWin = process.platform === "win32";
  const cmd = isWin && !command.includes(".") ? `${command}.cmd` : command;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: isWin, env: { ...process.env, CI: "true" } });
    let output = "";
    child.stdout?.on("data", (d) => { output += String(d); });
    child.stderr?.on("data", (d) => { output += String(d); });
    child.on("close", (code) => resolve({ ok: code === 0, output: output.slice(-5000) }));
    child.on("error", (e) => resolve({ ok: false, output: e.message }));
  });
}

export async function gateDependencyInstall(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const r = await runCmd(sandbox.rootAbsolute, "npm", ["install", "--no-audit", "--no-fund"]);
  return { gate: "dependency_install", passed: r.ok, details: { output: r.output.slice(-500) } };
}

export async function gateTypecheck(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const r = await runCmd(sandbox.rootAbsolute, "npx", ["tsc", "--noEmit"]);
  return { gate: "typecheck", passed: r.ok, details: { output: r.output.slice(-500) } };
}

export async function gateUnitTests(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const r = await runCmd(sandbox.rootAbsolute, "npm", ["run", "test"]);
  return { gate: "unit_tests", passed: r.ok, details: { output: r.output.slice(-800) } };
}

export async function gateProductionBuild(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const r = await runCmd(sandbox.rootAbsolute, "npm", ["run", "build"]);
  return { gate: "production_build", passed: r.ok, details: { output: r.output.slice(-800) } };
}

export async function gatePlaceholderDetection(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const files = await sandbox.listFiles();
  const violations: Array<{ file: string; pattern: string }> = [];
  for (const file of files) {
    if (file.includes("node_modules") || file.includes(".next") || file.includes("__tests__")) continue;
    if (!/\.(ts|tsx|js|jsx|md)$/.test(file)) continue;
    const content = await sandbox.readTextFile(file).catch(() => "");
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.source.includes("placeholder") && /placeholder=["']/.test(content)) continue;
      if (pattern.test(content) && !content.includes("// test-fixture")) {
        violations.push({ file, pattern: pattern.source });
      }
    }
  }
  return { gate: "placeholder_detection", passed: violations.length === 0, details: { violations } };
}

export async function gateSecretScan(sandbox: VentureSandbox): Promise<QualityGateResult> {
  const files = await sandbox.listFiles();
  const hits: string[] = [];
  for (const file of files) {
    if (file.includes("node_modules")) continue;
    const content = await sandbox.readTextFile(file).catch(() => "");
    if (/sk-[a-zA-Z0-9_-]{20,}/.test(content) || /xai-[a-zA-Z0-9_-]{20,}/.test(content)) {
      hits.push(file);
    }
  }
  return { gate: "secret_scan", passed: hits.length === 0, details: { hits } };
}

export async function gateFeatureContractCoverage(
  sandbox: VentureSandbox,
  contracts: FeatureContract[],
): Promise<QualityGateResult> {
  const files = new Set(await sandbox.listFiles());
  const missing: Array<{ featureId: string; item: string; kind: string }> = [];
  for (const contract of contracts) {
    for (const route of [...contract.requiredRoutes, ...contract.requiredAPIs]) {
      const candidates = routeToFileCandidates(route);
      if (!candidates.some((c) => files.has(c))) {
        missing.push({ featureId: contract.featureId, item: route, kind: "route" });
      }
    }
    for (const test of contract.requiredTests) {
      const path = test.startsWith("__tests__") ? test : `__tests__/marketplace/${test}`;
      if (!files.has(path)) {
        missing.push({ featureId: contract.featureId, item: path, kind: "test" });
      }
    }
  }
  return {
    gate: "feature_contract_coverage",
    passed: missing.length === 0,
    details: { missing, total: contracts.length },
  };
}

function routeToFileCandidates(route: string): string[] {
  if (route.startsWith("/api/")) {
    const p = `app/api${route.replace(/^\/api/, "")}/route.ts`.replace(/\[id\]/g, "[id]");
    return [p];
  }
  if (route === "/sitemap.xml") return ["app/sitemap.ts"];
  if (route === "/robots.txt") return ["app/robots.ts"];
  const p = `app${route === "/" ? "/page.tsx" : `${route}/page.tsx`}`.replace(/\[id\]/g, "[id]");
  return [p];
}

export async function gateWorkspaceIsolation(sandbox: VentureSandbox): Promise<QualityGateResult> {
  let passed = true;
  try {
    await sandbox.writeTextFile("../escape.txt", "bad");
    passed = false;
  } catch {
    passed = true;
  }
  return { gate: "workspace_isolation", passed, details: {} };
}

export async function runAllQualityGates(input: {
  sandbox: VentureSandbox;
  contracts: FeatureContract[];
  skipInstall?: boolean;
}): Promise<{ passed: boolean; gates: QualityGateResult[] }> {
  const gates: QualityGateResult[] = [];
  gates.push(await gateWorkspaceIsolation(input.sandbox));
  if (!input.skipInstall) gates.push(await gateDependencyInstall(input.sandbox));
  gates.push(await gateFeatureContractCoverage(input.sandbox, input.contracts));
  gates.push(await gatePlaceholderDetection(input.sandbox));
  gates.push(await gateSecretScan(input.sandbox));
  if (!input.skipInstall) {
    gates.push(await gateTypecheck(input.sandbox));
    gates.push(await gateUnitTests(input.sandbox));
    gates.push(await gateProductionBuild(input.sandbox));
  }
  return { passed: gates.every((g) => g.passed), gates };
}
