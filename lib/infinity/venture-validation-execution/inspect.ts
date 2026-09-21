import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { compileInputFromIntelligence } from "@/lib/infinity/venture-build-orchestration/from-intelligence";
import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import { extractSelectionForCandidate, monetizationPlanFrom, selectMonetizationPlan } from "@/lib/infinity/venture-intelligence/lineage";
import { fromOpportunityCandidate } from "@/lib/infinity/venture-intelligence/adapters/from-opportunity-candidate";
import { asRecord } from "@/lib/infinity/venture-intelligence/json";
import type { PreRunCandidateState } from "./types";
import { snapshotFromIntelligence } from "./reassess";

export const CRE_CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9";
export const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

export function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export async function inspectPreRunCandidateState(
  candidateId = CRE_CANDIDATE_ID,
): Promise<PreRunCandidateState | null> {
  if (!loadEnvLocal()) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { loadCanonicalCandidateIntelligence } = await import("@/lib/infinity/venture-intelligence/load");
  const admin = createAdminClient();
  const view = await loadCanonicalCandidateIntelligence(admin, LIVE_ORG, candidateId);
  const compile = compileInputFromIntelligence(view, { organizationId: LIVE_ORG });
  const auth = evaluateBuildAuthorization(compile);
  const { data: candidateRow } = await admin
    .from("opportunity_candidates")
    .select("*")
    .eq("organization_id", LIVE_ORG)
    .eq("id", candidateId)
    .maybeSingle();
  const { data: planRows } = await admin
    .from("monetization_plans")
    .select("*")
    .eq("organization_id", LIVE_ORG)
    .eq("opportunity_candidate_id", candidateId);
  const { data: selectionRows } = await admin
    .from("venture_selection_runs")
    .select("id, status, selection_report, opportunity_candidate_ids, monetization_run_id, created_at, completed_at")
    .eq("organization_id", LIVE_ORG)
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  const selection = extractSelectionForCandidate(
    (selectionRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
    candidateId,
  );
  const selected = selectMonetizationPlan(
    (planRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
    { candidateId, linkedPlanId: selection?.monetizationPlanId },
  );
  const plan = selected.plan ?? monetizationPlanFrom(asRecord(planRows?.[0] ?? null));
  const economics = snapshotFromIntelligence(view);
  const parsed = candidateRow ? fromOpportunityCandidate(asRecord(candidateRow) ?? {}) : null;
  return {
    candidateId,
    name: view.identity.name,
    decision: auth.decision,
    buildReady: auth.buildReady,
    selectionScore: selection?.selectionScore ?? null,
    opportunityScore: selection?.opportunityScore ?? null,
    validationState: view.currentPosition.step,
    researchState: view.evidence.summary[0] ?? "persisted",
    model: plan?.modelName ?? plan?.pricingModel ?? economics.model,
    pricing: plan?.estimatedPriceBase != null ? `$${plan.estimatedPriceBase}` : economics.pricing,
    cac: plan?.estimatedCAC != null ? `$${plan.estimatedCAC}` : economics.cacDisplay,
    ltv: plan?.estimatedLTV != null ? `$${plan.estimatedLTV}` : economics.ltvDisplay,
    ltvCac: plan?.ltvCacRatio != null ? String(plan.ltvCacRatio) : economics.ltvCacDisplay,
    payback: plan?.estimatedMonthsToBreakEven != null ? `${plan.estimatedMonthsToBreakEven} months` : economics.paybackDisplay,
    margin: plan?.estimatedGrossMarginPercent != null ? `${plan.estimatedGrossMarginPercent}%` : economics.marginDisplay,
    openGaps: view.evidence.missing,
    counterfactual: selection?.counterfactual ?? view.nextMove.recommendation,
    candidate: parsed,
  };
}
