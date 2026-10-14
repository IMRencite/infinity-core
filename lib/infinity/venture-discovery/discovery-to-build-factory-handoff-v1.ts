import {
  loadAutonomousReferenceRun,
  saveAutonomousReferenceRun,
  type AutonomousReferenceRunRecord,
} from "@/lib/infinity/build-factory/autonomous-reference-run-v1";

export const DISCOVERY_TO_BUILD_FACTORY_HANDOFF_V1 = "DISCOVERY_TO_BUILD_FACTORY_HANDOFF_V1" as const;

export type BuildFactoryHandoffInput = {
  candidateId: string;
  candidateName: string;
  candidateScore: number | null;
  ventureId?: string | null;
  factoryRunId?: string | null;
  selectionReason: string;
};

/** Claim reference run when a real BUILD decision is made (no threshold changes). */
export function claimAutonomousReferenceRunForBuild(
  input: BuildFactoryHandoffInput,
  cwd = process.cwd(),
): AutonomousReferenceRunRecord {
  const existing = loadAutonomousReferenceRun(cwd);
  const now = new Date().toISOString();
  const record: AutonomousReferenceRunRecord = existing ?? {
    reference_run_id: `ref_${now.replace(/[-:TZ.]/g, "").slice(0, 14)}`,
    candidate_id: null,
    venture_id: null,
    started_at: now,
    current_stage: "DISCOVER",
    stage_history: [],
    gate_results: { AUTONOMOUS_BUILD_FACTORY_REFERENCE_QC: "NOT_RUN", VENTURE_BRAND_OS_V1: "NOT_RUN" },
    repair_attempts: 0,
    blocker: null,
    founder_boundary: null,
    finished_at: null,
    BUILD_PROVEN: false,
    OPERATING_PROVEN: false,
    REVENUE_PROVEN: false,
  };

  record.candidate_id = input.candidateId;
  record.venture_id = input.ventureId ?? record.venture_id;
  record.current_stage = "BUILD";
  record.blocker = null;
  record.stage_history.push({
    stage: "BUILD",
    at: now,
    gate: DISCOVERY_TO_BUILD_FACTORY_HANDOFF_V1,
    result: "IN_PROGRESS",
  });
  record.gate_results = {
    ...record.gate_results,
    DISCOVERY_TO_BUILD_FACTORY_HANDOFF_QC: "PASS",
  };
  (record as AutonomousReferenceRunRecord & { REFERENCE_RUN_STATE?: string }).REFERENCE_RUN_STATE =
    "IN_PROGRESS";
  (record as AutonomousReferenceRunRecord & { CANDIDATE_SELECTION_REASON?: string }).CANDIDATE_SELECTION_REASON =
    input.selectionReason;

  saveAutonomousReferenceRun(record, cwd);
  return record;
}

export function markReferenceRunArmedWaiting(cwd = process.cwd()): void {
  const existing = loadAutonomousReferenceRun(cwd);
  if (!existing) return;
  (existing as AutonomousReferenceRunRecord & { REFERENCE_RUN_STATE?: string }).REFERENCE_RUN_STATE =
    "ARMED_WAITING_FOR_CANDIDATE";
  existing.blocker = "NO_QUALIFIED_CANDIDATE";
  saveAutonomousReferenceRun(existing, cwd);
}
