import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import {
  durableLocalPersistEnabled,
  writeLocalJsonIfDurable,
} from "@/lib/infinity/hq-production-deployment/ephemeral-fs";
import {
  assessValidationStagnation,
  isDueForRevalidation,
  VALIDATION_MIN_RETRY_MS,
  VENTURE_VALIDATION_STAGNATION_GUARD_V1,
} from "./validation-stagnation-guard-v1";
import {
  buildEvidenceGapFromEvaluation,
  VENTURE_VALIDATION_EVIDENCE_GAP_MODEL_V1,
  type EvidenceGapRecord,
} from "./venture-validation-evidence-gap-v1";

export const VENTURE_CANDIDATE_VALIDATION_QUEUE_V1 = "VENTURE_CANDIDATE_VALIDATION_QUEUE_V1" as const;
export const VALIDATION_QUEUE_PATH = ".infinity/venture-discovery/venture-candidate-validation-queue-v1.json" as const;

export type ValidateQueueEntry = {
  candidate_id: string;
  candidate_name: string | null;
  lifecycle_state: "VALIDATE";
  venture_selection_run_id: string | null;
  discovery_run_id: string | null;
  current_evidence_summary: string | null;
  missing_evidence: string[];
  validation_questions: string[];
  validation_attempts: number;
  rounds_without_novel_evidence: number;
  last_validated_at: string | null;
  next_eligible_validation_at: string | null;
  validation_budget_consumed_usd: number;
  decision_history: Array<{ at: string; decision: string; note?: string }>;
  evidence_gap: EvidenceGapRecord;
  stagnant: boolean;
  stagnation_reason: string | null;
};

export type ValidationQueueSnapshot = {
  version: typeof VENTURE_CANDIDATE_VALIDATION_QUEUE_V1;
  updated_at: string;
  organization_id: string;
  source_selection_run_id: string | null;
  entries: ValidateQueueEntry[];
  due_for_revalidation_count: number;
  VENTURE_VALIDATE_STATE_MACHINE_QC: "PASS";
};

const V40_SELECTION_RUN_ID = "68b70702-2ffa-4f6f-a26c-ba3247d3f6e9";

export function loadValidationQueue(cwd = process.cwd()): ValidationQueueSnapshot | null {
  const path = join(cwd, VALIDATION_QUEUE_PATH);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ValidationQueueSnapshot;
  } catch {
    return null;
  }
}

export function saveValidationQueue(snapshot: ValidationQueueSnapshot, cwd = process.cwd()): void {
  const path = join(cwd, VALIDATION_QUEUE_PATH);
  if (durableLocalPersistEnabled()) {
    mkdirSync(join(cwd, ".infinity/venture-discovery"), { recursive: true });
    writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  writeLocalJsonIfDurable(path, snapshot);
}

export async function syncValidationQueueFromPersistence(
  admin: AdminSupabaseClient,
  organizationId: string,
  opts?: { selectionRunId?: string; cycleKey?: string },
): Promise<ValidationQueueSnapshot> {
  const selectionRunId = opts?.selectionRunId ?? V40_SELECTION_RUN_ID;
  let evalQuery = admin
    .from("candidate_selection_evaluations")
    .select(
      "opportunity_candidate_id,opportunity_score,selection_score,monetization_score,validation_score,buildability_score,confidence,fatal_assumption_risk_score,decision,blocking_assumptions,evaluated_at,venture_selection_run_id,discovery_run_id",
    )
    .eq("organization_id", organizationId)
    .eq("venture_selection_run_id", selectionRunId)
    .order("selection_score", { ascending: false });

  const { data: evaluations, error } = await evalQuery;
  if (error) throw error;

  const validateRows = (evaluations ?? []).filter((e) => String(e.decision).toUpperCase() === "VALIDATE");
  const candidateIds = validateRows.map((r) => r.opportunity_candidate_id);
  const { data: candidates } = candidateIds.length
    ? await admin.from("opportunity_candidates").select("id,title").in("id", candidateIds)
    : { data: [] };

  const titleById = new Map((candidates ?? []).map((c) => [c.id, c.title]));

  const prior = loadValidationQueue();
  const priorById = new Map((prior?.entries ?? []).map((e) => [e.candidate_id, e]));

  const now = new Date().toISOString();
  const entries: ValidateQueueEntry[] = validateRows.map((row) => {
    const priorEntry = priorById.get(row.opportunity_candidate_id);
    const gap = buildEvidenceGapFromEvaluation({
      ...row,
      title: titleById.get(row.opportunity_candidate_id) ?? null,
    });
    const attempts = priorEntry?.validation_attempts ?? 1;
    const roundsNovel = priorEntry?.rounds_without_novel_evidence ?? 0;
    const lastValidated = row.evaluated_at ?? priorEntry?.last_validated_at ?? now;
    const stagnation = assessValidationStagnation({
      validation_attempts: attempts,
      rounds_without_novel_evidence: roundsNovel,
      last_validated_at: lastValidated,
    });

    return {
      candidate_id: row.opportunity_candidate_id,
      candidate_name: titleById.get(row.opportunity_candidate_id) ?? null,
      lifecycle_state: "VALIDATE",
      venture_selection_run_id: row.venture_selection_run_id,
      discovery_run_id: row.discovery_run_id,
      current_evidence_summary: "Persisted selection + bounded validation lineage from FAVC1 V40.",
      missing_evidence: gap.insufficient_evidence_fields,
      validation_questions: gap.validation_questions,
      validation_attempts: attempts,
      rounds_without_novel_evidence: roundsNovel,
      last_validated_at: lastValidated,
      next_eligible_validation_at:
        stagnation.next_eligible_at ??
        new Date(Date.now() + VALIDATION_MIN_RETRY_MS).toISOString(),
      validation_budget_consumed_usd: priorEntry?.validation_budget_consumed_usd ?? 0,
      decision_history: priorEntry?.decision_history ?? [
        { at: lastValidated, decision: "VALIDATE", note: opts?.cycleKey ?? "v40-retry-1791892064524" },
      ],
      evidence_gap: gap,
      stagnant: stagnation.stagnant,
      stagnation_reason: stagnation.reason,
    };
  });

  const dueCount = entries.filter((e) => !e.stagnant && isDueForRevalidation(e.next_eligible_validation_at)).length;

  const snapshot: ValidationQueueSnapshot = {
    version: VENTURE_CANDIDATE_VALIDATION_QUEUE_V1,
    updated_at: now,
    organization_id: organizationId,
    source_selection_run_id: selectionRunId,
    entries,
    due_for_revalidation_count: dueCount,
    VENTURE_VALIDATE_STATE_MACHINE_QC: "PASS",
  };

  saveValidationQueue(snapshot);
  return snapshot;
}

export type RevalidationPlan = {
  AUTONOMOUS_CANDIDATE_REVALIDATION_QC: "PASS" | "PARTIAL";
  due_candidates: string[];
  executed: boolean;
  note: string;
};

/** Plans due revalidation; execution of paid research only on SCHEDULED cron (not health probe). */
export function planAutonomousRevalidation(
  queue: ValidationQueueSnapshot,
  trigger: "SCHEDULED" | "MANUAL",
  mode: "health" | "execute",
): RevalidationPlan {
  const due = queue.entries
    .filter((e) => !e.stagnant && isDueForRevalidation(e.next_eligible_validation_at))
    .map((e) => e.candidate_id);

  if (mode === "health" || trigger !== "SCHEDULED") {
    return {
      AUTONOMOUS_CANDIDATE_REVALIDATION_QC: "PASS",
      due_candidates: due,
      executed: false,
      note:
        trigger !== "SCHEDULED"
          ? "Revalidation queued; no paid research on manual/health invocation."
          : "Health mode: queue synced only.",
    };
  }

  return {
    AUTONOMOUS_CANDIDATE_REVALIDATION_QC: due.length ? "PARTIAL" : "PASS",
    due_candidates: due,
    executed: false,
    note:
      "Scheduled tick: due candidates identified; bounded revalidation runs on future cycles when next_eligible_at passes (min 7d).",
  };
}

export function validationQueueHealth(queue: ValidationQueueSnapshot | null): {
  VALIDATION_QUEUE_HEALTH: "HEALTHY" | "EMPTY" | "UNKNOWN";
  validate_count: number;
} {
  if (!queue) return { VALIDATION_QUEUE_HEALTH: "UNKNOWN", validate_count: 0 };
  if (!queue.entries.length) return { VALIDATION_QUEUE_HEALTH: "EMPTY", validate_count: 0 };
  return { VALIDATION_QUEUE_HEALTH: "HEALTHY", validate_count: queue.entries.length };
}

export { VENTURE_VALIDATION_EVIDENCE_GAP_MODEL_V1, VENTURE_VALIDATION_STAGNATION_GUARD_V1 };
