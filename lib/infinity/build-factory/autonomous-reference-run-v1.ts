import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export const AUTONOMOUS_BUILD_FACTORY_REFERENCE_RUN_V1 = "AUTONOMOUS_BUILD_FACTORY_REFERENCE_RUN_V1" as const;

export type ReferenceRunStage =
  | "DISCOVER"
  | "VALIDATE"
  | "ECONOMIC_POSITIONING"
  | "BRAND_OS"
  | "OFFER_ARCHITECTURE"
  | "BUILD"
  | "RENDER_QC"
  | "PRELAUNCH_QC"
  | "DEPLOY"
  | "POSTDEPLOY_QC"
  | "CONTENT_ENROLLMENT"
  | "PROSPECTING_ENROLLMENT"
  | "OPERATING"
  | "KILLED";

export type AutonomousReferenceRunRecord = {
  reference_run_id: string;
  candidate_id: string | null;
  venture_id: string | null;
  started_at: string;
  current_stage: ReferenceRunStage;
  stage_history: Array<{ stage: ReferenceRunStage; at: string; gate?: string; result?: string }>;
  gate_results: Record<string, "PASS" | "FAIL" | "SKIP" | "NOT_RUN">;
  repair_attempts: number;
  blocker: string | null;
  founder_boundary: string | null;
  finished_at: string | null;
  BUILD_PROVEN: boolean;
  OPERATING_PROVEN: boolean;
  REVENUE_PROVEN: boolean;
};

const REL = ".infinity/build-factory/autonomous-reference-run-v1.json";

export function loadAutonomousReferenceRun(cwd = process.cwd()): AutonomousReferenceRunRecord | null {
  const path = join(cwd, REL);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as AutonomousReferenceRunRecord;
  } catch {
    return null;
  }
}

export function saveAutonomousReferenceRun(record: AutonomousReferenceRunRecord, cwd = process.cwd()): void {
  const path = join(cwd, REL);
  mkdirSync(join(cwd, ".infinity/build-factory"), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}

export function ensureReferenceRunShell(cwd = process.cwd()): AutonomousReferenceRunRecord {
  const existing = loadAutonomousReferenceRun(cwd);
  if (existing) return existing;
  const now = new Date().toISOString();
  const shell: AutonomousReferenceRunRecord = {
    reference_run_id: `ref_${now.replace(/[-:TZ.]/g, "").slice(0, 14)}`,
    candidate_id: null,
    venture_id: null,
    started_at: now,
    current_stage: "DISCOVER",
    stage_history: [{ stage: "DISCOVER", at: now, gate: "AUTONOMOUS_BUILD_FACTORY_REFERENCE_QC", result: "NOT_RUN" }],
    gate_results: { AUTONOMOUS_BUILD_FACTORY_REFERENCE_QC: "NOT_RUN", VENTURE_BRAND_OS_V1: "NOT_RUN" },
    repair_attempts: 0,
    blocker: "NO_QUALIFIED_CANDIDATE",
    founder_boundary: null,
    finished_at: null,
    BUILD_PROVEN: false,
    OPERATING_PROVEN: false,
    REVENUE_PROVEN: false,
  };
  saveAutonomousReferenceRun(shell, cwd);
  return shell;
}
