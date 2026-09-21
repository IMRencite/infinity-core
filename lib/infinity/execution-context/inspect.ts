import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { evaluateExecutionContextReadinessGate, evaluateRepositoryRootVerificationGate } from "./gates";
import { CANONICAL_INFINITY_REPO, type RepositoryRootEvidence } from "./types";

export function inspectRepositoryRoot(input: {
  cwd?: string;
  intendedRoot?: string;
} = {}): RepositoryRootEvidence {
  const cwd = input.cwd ?? process.cwd();
  const intendedRoot = input.intendedRoot ?? CANONICAL_INFINITY_REPO;
  let gitRevParse: string | null = null;
  try {
    gitRevParse = execSync("git rev-parse --show-toplevel", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    gitRevParse = null;
  }
  let packageName: string | null = null;
  const packageJson = join(cwd, "package.json");
  if (existsSync(packageJson)) {
    try {
      packageName = (JSON.parse(readFileSync(packageJson, "utf8")) as { name?: string }).name ?? null;
    } catch {
      packageName = null;
    }
  }
  return {
    cwd,
    gitRevParse,
    intendedRoot,
    packageJsonExists: existsSync(packageJson),
    packageName,
    tsconfigExists: existsSync(join(cwd, "tsconfig.json")),
    nextConfigDiscoverable: existsSync(join(cwd, "next.config.ts")) || existsSync(join(cwd, "next.config.js")),
  };
}

export function executionContextReady(input: {
  cwd?: string;
  intendedRoot?: string;
} = {}): { ready: boolean; evidence: RepositoryRootEvidence; code: "READY" | "EXECUTION_CONTEXT_INVALID" } {
  const evidence = inspectRepositoryRoot(input);
  const root = evaluateRepositoryRootVerificationGate(evidence);
  const readiness = evaluateExecutionContextReadinessGate({ root });
  return {
    ready: root.result === "PASS" && readiness.result === "PASS",
    evidence,
    code: root.result === "PASS" && readiness.result === "PASS" ? "READY" : "EXECUTION_CONTEXT_INVALID",
  };
}
