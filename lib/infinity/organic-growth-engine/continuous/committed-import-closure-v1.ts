import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const COMMITTED_IMPORT_CLOSURE_QC = "COMMITTED_IMPORT_CLOSURE_QC" as const;

const IMPORTER_ROOTS = [
  "lib/infinity/organic-growth-engine/continuous/club-throttle-journal.ts",
  "lib/infinity/organic-growth-engine/continuous/club-throttle-journal-taxonomy-compose.ts",
  "lib/infinity/organic-growth-engine/continuous/club-throttle-journal-taxonomy.tsx",
  "app/api/runtime/portfolio-operating-tick/route.ts",
] as const;

const TS_EXTS = [".ts", ".tsx", ".js", ".mjs", ""];

function repoRelative(repoRoot: string, absPath: string): string {
  const root = repoRoot.replace(/\\/g, "/").replace(/\/$/, "");
  const abs = absPath.replace(/\\/g, "/");
  return abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : abs;
}

function resolveRelativeImport(repoRoot: string, fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = dirname(join(repoRoot, fromFile));
  const raw = join(base, spec);
  for (const ext of TS_EXTS) {
    const candidate = raw + ext;
    if (existsSync(candidate)) return repoRelative(repoRoot, candidate);
  }
  return null;
}

function gitTrackedFiles(repoRoot: string): Set<string> {
  const out = execSync("git ls-files", { cwd: repoRoot, encoding: "utf8" });
  return new Set(out.split(/\r?\n/).filter(Boolean));
}

export function evaluateCommittedImportClosureQc(input?: {
  repoRoot?: string;
  trackedRelativePaths?: Set<string>;
}): {
  gate: typeof COMMITTED_IMPORT_CLOSURE_QC;
  result: "PASS" | "FAIL";
  COMMITTED_IMPORT_CLOSURE_MISSING: string[];
  reasons: string[];
} {
  const repoRoot = input?.repoRoot ?? process.cwd();
  const tracked = input?.trackedRelativePaths ?? gitTrackedFiles(repoRoot);
  const missing: string[] = [];
  for (const importer of IMPORTER_ROOTS) {
    const abs = join(repoRoot, importer);
    if (!existsSync(abs)) continue;
    const source = readFileSync(abs, "utf8");
    for (const m of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      const resolved = resolveRelativeImport(repoRoot, importer, m[1]);
      if (!resolved) continue;
      if (!tracked.has(resolved)) missing.push(`${importer} -> ${resolved}`);
    }
  }
  const uniq = [...new Set(missing)];
  return {
    gate: COMMITTED_IMPORT_CLOSURE_QC,
    result: uniq.length ? "FAIL" : "PASS",
    COMMITTED_IMPORT_CLOSURE_MISSING: uniq,
    reasons: uniq.map((row) => `UNCOMMITTED_OR_MISSING_DEPENDENCY:${row}`),
  };
}

export function evaluateCommittedImportClosureRegressionQc(): {
  COMMITTED_IMPORT_CLOSURE_REGRESSION_QC: "PASS" | "FAIL";
  synthetic_missing_dependency_blocked: boolean;
  reasons: string[];
} {
  const repoRoot = process.cwd();
  const journalSource = readFileSync(
    join(repoRoot, "lib/infinity/organic-growth-engine/continuous/club-throttle-journal.ts"),
    "utf8",
  );
  const requiresCompose = journalSource.includes("./club-throttle-journal-taxonomy-compose");
  const trackedWithoutCompose = new Set(
    [...gitTrackedFiles(repoRoot)].filter((p) => !p.includes("club-throttle-journal-taxonomy-compose")),
  );
  const blocked =
    requiresCompose
    && evaluateCommittedImportClosureQc({ repoRoot, trackedRelativePaths: trackedWithoutCompose }).result === "FAIL";
  const live = evaluateCommittedImportClosureQc({ repoRoot }).result === "PASS";
  const pass = blocked && live;
  return {
    COMMITTED_IMPORT_CLOSURE_REGRESSION_QC: pass ? "PASS" : "FAIL",
    synthetic_missing_dependency_blocked: blocked,
    reasons: pass ? [] : ["REGRESSION_DID_NOT_FAIL_ON_SYNTHETIC_MISSING_COMPOSE_OR_LIVE_TREE_FAIL"],
  };
}
