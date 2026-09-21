import type { AdminSupabaseClient } from "@/lib/supabase/admin";

export type Favc1ValidationContext = {
  validationOutcome: string | null;
  selectionStopReasonPath: string | null;
  validationRunId: string | null;
  selectedValidationCandidateId: string | null;
  acquisitionResearchRunId: string | null;
  providerCalls: number;
  synthesisOnly: boolean;
  humanizedBlocker: string | null;
  validationCostUsd: number | null;
  validationCostKnown: boolean;
};

type ResearchRunRow = {
  id: string;
  estimated_cost: number | null;
  idempotency_key: string;
  status: string;
};

export async function loadFavc1ValidationContext(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    cycleKey: string;
    selectionRunId: string | null;
  },
): Promise<Favc1ValidationContext> {
  const base: Favc1ValidationContext = {
    validationOutcome: null,
    selectionStopReasonPath: null,
    validationRunId: null,
    selectedValidationCandidateId: null,
    acquisitionResearchRunId: null,
    providerCalls: 0,
    synthesisOnly: true,
    humanizedBlocker: null,
    validationCostUsd: null,
    validationCostKnown: false,
  };

  if (!input.selectionRunId) return base;

  const { data: evaluations } = await admin
    .from("candidate_selection_evaluations")
    .select("opportunity_candidate_id, decision")
    .eq("venture_selection_run_id", input.selectionRunId);

  const validateCandidates = (evaluations ?? []).filter((row) => row.decision === "VALIDATE");
  const buildCandidates = (evaluations ?? []).filter((row) => row.decision === "BUILD");

  if (validateCandidates.length > 0 && buildCandidates.length === 0) {
    base.validationOutcome = "VALIDATE";
    base.selectionStopReasonPath = "validation_required";
    base.selectedValidationCandidateId = validateCandidates[0]?.opportunity_candidate_id ?? null;
  }

  const prefix = `first-autonomous-venture-v1:${input.organizationId}:${input.cycleKey}`;
  const { data: validationResearch } = await admin
    .from("research_runs")
    .select("id, estimated_cost, idempotency_key, status")
    .eq("organization_id", input.organizationId)
    .like("idempotency_key", `%favc1-validation-acquisition:${input.organizationId}%${input.cycleKey}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  const acquisitionRuns = (validationResearch ?? []) as ResearchRunRow[];
  if (acquisitionRuns.length > 0) {
    const latest = acquisitionRuns[0]!;
    base.acquisitionResearchRunId = latest.id;
    base.providerCalls = 1;
    base.synthesisOnly = false;
    base.validationCostUsd = latest.estimated_cost;
    base.validationCostKnown = latest.estimated_cost != null;

    const match = latest.idempotency_key.match(/favc1-validation-acquisition:[^:]+:([^:]+):/);
    if (match?.[1]) {
      base.selectedValidationCandidateId = match[1];
    }
    const runIdMatch = latest.idempotency_key.match(/:([0-9a-f-]{36})$/i);
    if (runIdMatch?.[1]) {
      base.validationRunId = runIdMatch[1];
    }
  }

  void prefix;
  return base;
}
