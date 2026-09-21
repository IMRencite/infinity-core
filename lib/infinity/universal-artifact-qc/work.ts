import { CANONICAL_WORK_EXECUTION_CONTRACT } from "@/lib/infinity/canonical-work/types";
import { completeCanonicalWork, listCanonicalWork, upsertCanonicalWork } from "@/lib/infinity/canonical-work/store";
import { UNIVERSAL_QC_WORK_ID, UNIVERSAL_QC_WORK_TITLE } from "./contract";

export function startUniversalQcWork(input: {
  description: string;
  now?: string;
}): void {
  const now = input.now ?? new Date().toISOString();
  const existing = listCanonicalWork().find((row) => row.work_id === UNIVERSAL_QC_WORK_ID);
  upsertCanonicalWork({
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    work_id: UNIVERSAL_QC_WORK_ID,
    mission_id: "mission:infinity:universal-artifact-qc",
    venture_id: null,
    work_type: "QC",
    title: UNIVERSAL_QC_WORK_TITLE,
    description: input.description,
    stage: "QC_RUNNING",
    status: "ACTIVE",
    assigned_rooms: ["quality_control"],
    assigned_workers: ["Validation Station"],
    source: "INFINITY_RUNTIME",
    started_at: existing?.started_at ?? now,
    updated_at: now,
    completed_at: null,
    blocked_reason: null,
    authorization_state: null,
    progress: input.description,
    latest_output: input.description,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: existing?.parent_work_id ?? null,
    traceability_links: existing?.traceability_links ?? [UNIVERSAL_QC_WORK_ID],
    requires_infinity_worker_execution: false,
    classification: "SYSTEM_INFRASTRUCTURE",
    next_expected_transition: "QC_COMPLETES_THEN_IDLE",
  });
}

export function completeUniversalQcWork(output: string, now = new Date().toISOString()): void {
  const existing = listCanonicalWork().find((row) => row.work_id === UNIVERSAL_QC_WORK_ID);
  if (!existing || existing.status !== "ACTIVE") return;
  completeCanonicalWork(UNIVERSAL_QC_WORK_ID, output, now);
}
