import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { reproduceAggregateScore } from "./scoring";
import type { ExecutiveContextManifest } from "./types";

export type ExecutiveQaResult = {
  verdict: "pass" | "fail";
  issues: string[];
};

export async function verifyExecutiveSelection(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    executiveContextId: string;
    contextHash: string;
    workerRunId: string;
  },
): Promise<ExecutiveQaResult> {
  const issues: string[] = [];

  const { data: context, error: ctxError } = await admin
    .from("executive_contexts")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.executiveContextId)
    .maybeSingle();

  if (ctxError || !context) {
    return { verdict: "fail", issues: ["executive_context_missing"] };
  }

  if (context.context_hash !== input.contextHash) {
    issues.push("context_hash_mismatch");
  }

  const manifest = context.context_manifest as ExecutiveContextManifest;
  const eligibleIds = new Set(context.opportunity_ids ?? []);

  const { data: decisions } = await admin
    .from("executive_selection_decisions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("executive_context_id", input.executiveContextId);

  const compared = new Set((decisions ?? []).map((d) => d.opportunity_id).filter(Boolean));
  for (const id of eligibleIds) {
    if (!compared.has(id)) {
      issues.push(`opportunity_missing_decision:${id}`);
    }
  }

  for (const score of Object.values(manifest.deterministicScores ?? {})) {
    const reproduced = reproduceAggregateScore(score.dimensions);
    if (Math.abs(reproduced - score.aggregateScore) > 0.01) {
      issues.push(`score_not_reproducible:${score.opportunityId}`);
    }
  }

  const selected = (decisions ?? []).filter((d) => d.decision === "select_for_planning");
  if (selected.length > 1) {
    issues.push("duplicate_selection");
  }

  return { verdict: issues.length === 0 ? "pass" : "fail", issues };
}
