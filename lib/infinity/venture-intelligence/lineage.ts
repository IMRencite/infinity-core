import { asNumber, asRecord, asString, asStringArray } from "./json";
import type {
  CanonicalAssemblyEconomicsInput,
  CanonicalMonetizationPlanInput,
  CanonicalResearchRunInput,
  CanonicalSelectionInput,
} from "./types";

export const MONETIZATION_PLAN_SELECTION_RULE =
  "selection-linked plan id on the candidate (if it belongs to this candidate) → plan_role in {canonical, accepted, primary} with highest monetization_confidence then monetization_score → highest monetization_confidence then monetization_score → latest created_at for this candidate only. Never org-wide first-match.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

export function asUuid(value: unknown): string | null {
  const text = asString(value);
  return text && isUuid(text) ? text : null;
}

export function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && isUuid(value))))];
}

export function jsonIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueIds(value.map((item) => (typeof item === "string" ? item : asString(asRecord(item)?.id))));
  }
  if (typeof value === "string") {
    try {
      return jsonIdList(JSON.parse(value));
    } catch {
      return uniqueIds(value.split(/[\s,]+/));
    }
  }
  return [];
}

export type CanonicalCandidateIdSources = {
  opportunityCandidateId?: string | null;
  identityPackage?: Record<string, unknown> | null;
  manifest?: Record<string, unknown> | null;
  blueprintOpportunityCandidateId?: string | null;
  lineagePackage?: Record<string, unknown> | null;
};

/**
 * Resolve the canonical opportunity_candidates.id.
 * Never treats legacy assembly.opportunity_id (opportunities FK) as a candidate id.
 */
export function resolveCanonicalCandidateId(sources: CanonicalCandidateIdSources): string | null {
  return (
    asUuid(sources.opportunityCandidateId) ??
    asUuid(sources.identityPackage?.opportunityCandidateId) ??
    asUuid(sources.identityPackage?.opportunity_candidate_id) ??
    asUuid(asRecord(sources.identityPackage?.canonicalLineage)?.opportunityCandidateId) ??
    asUuid(sources.manifest?.opportunityCandidateId) ??
    asUuid(sources.manifest?.opportunity_candidate_id) ??
    asUuid(sources.lineagePackage?.opportunityCandidateId) ??
    asUuid(sources.blueprintOpportunityCandidateId)
  );
}

export function monetizationPlanFrom(raw: Record<string, unknown> | null): CanonicalMonetizationPlanInput | null {
  if (!raw) return null;
  const derived = asRecord(raw.economics_derived) ?? asRecord(raw.economicsDerived);
  const id = asUuid(raw.id);
  if (!id && !asString(raw.model_name ?? raw.modelName)) return null;
  return {
    id,
    estimatedPriceBase: asNumber(raw.estimated_price_base ?? raw.estimatedPriceBase),
    estimatedRevenuePerCustomer: asNumber(raw.estimated_revenue_per_customer ?? raw.estimatedRevenuePerCustomer),
    estimatedCAC: asNumber(raw.estimated_cac ?? raw.estimatedCAC),
    estimatedLTV: asNumber(raw.estimated_ltv ?? raw.estimatedLTV) ?? asNumber(derived?.estimatedLTV),
    estimatedGrossMarginPercent: asNumber(raw.estimated_gross_margin_percent ?? derived?.estimatedGrossMarginPercent),
    contributionMarginPerCustomer: asNumber(raw.contribution_margin_per_customer ?? derived?.contributionMarginPerCustomer),
    ltvCacRatio: asNumber(raw.ltv_cac_ratio ?? derived?.ltvCacRatio),
    estimatedMonthsToBreakEven: asNumber(raw.estimated_months_to_break_even ?? raw.estimatedMonthsToBreakEven),
    customerType: asString(raw.customer_type ?? raw.customerType),
    valueProposition: asString(raw.value_proposition ?? raw.valueProposition),
    offerDescription: asString(raw.offer_description ?? raw.offerDescription),
    pricingModel: asString(raw.pricing_model ?? raw.pricingModel),
    modelName: asString(raw.model_name ?? raw.modelName),
    planRole: asString(raw.plan_role ?? raw.planRole),
    monetizationConfidence: asNumber(raw.monetization_confidence ?? raw.monetizationConfidence),
    monetizationScore: asNumber(raw.monetization_score ?? raw.monetizationScore),
    createdAt: asString(raw.created_at ?? raw.createdAt),
    researchRunIds: jsonIdList(raw.research_run_ids ?? raw.researchRunIds),
    risks: asStringArray(raw.risks),
  };
}

function roleRank(role: string | null | undefined): number {
  const normalized = String(role ?? "").toLowerCase();
  if (normalized === "canonical") return 0;
  if (normalized === "accepted") return 1;
  if (normalized === "primary") return 2;
  return 9;
}

export function selectMonetizationPlan(
  plans: Array<Record<string, unknown>>,
  input: { candidateId: string; linkedPlanId?: string | null },
): { plan: CanonicalMonetizationPlanInput | null; rule: string } {
  const owned = plans.filter((row) => asUuid(row.opportunity_candidate_id ?? row.opportunityCandidateId) === input.candidateId);
  const parsed = owned.map(monetizationPlanFrom).filter((row): row is CanonicalMonetizationPlanInput => Boolean(row));
  if (!parsed.length) return { plan: null, rule: MONETIZATION_PLAN_SELECTION_RULE };

  const linkedId = asUuid(input.linkedPlanId);
  if (linkedId) {
    const linked = parsed.find((row) => row.id === linkedId);
    if (linked) return { plan: linked, rule: MONETIZATION_PLAN_SELECTION_RULE };
  }

  const ranked = [...parsed].sort((a, b) => {
    const role = roleRank(a.planRole) - roleRank(b.planRole);
    if (role !== 0) return role;
    const confidence = (b.monetizationConfidence ?? -1) - (a.monetizationConfidence ?? -1);
    if (confidence !== 0) return confidence;
    const score = (b.monetizationScore ?? -1) - (a.monetizationScore ?? -1);
    if (score !== 0) return score;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
  return { plan: ranked[0] ?? null, rule: MONETIZATION_PLAN_SELECTION_RULE };
}

export function extractSelectionForCandidate(
  runs: Array<Record<string, unknown>>,
  candidateId: string,
): CanonicalSelectionInput | null {
  const matches: CanonicalSelectionInput[] = [];
  for (const run of runs) {
    const ids = jsonIdList(run.opportunity_candidate_ids ?? run.opportunityCandidateIds);
    const report = asRecord(run.selection_report ?? run.selectionReport);
    const queue = Array.isArray(report?.queue) ? report.queue : [];
    const row = queue
      .map((item) => asRecord(item))
      .find((item) => asUuid(item?.candidateId ?? item?.candidate_id) === candidateId);
    if (!ids.includes(candidateId) && !row) continue;
    matches.push({
      runId: asUuid(run.id),
      decision: asString(row?.decision) ?? asString(run.decision),
      selectionScore: asNumber(row?.selectionScore ?? row?.selection_score),
      opportunityScore: asNumber(row?.opportunityScore ?? row?.opportunity_score),
      rank: asNumber(row?.rank),
      reason: asString(row?.reason) ?? asString(row?.queueReason) ?? asString(asRecord(row?.explanation)?.reason),
      risk: asString(row?.risk) ?? asString(asRecord(row?.explanation)?.risk),
      counterfactual: asString(row?.counterfactual) ?? asString(asRecord(row?.explanation)?.counterfactual),
      monetizationPlanId: asUuid(row?.monetizationPlanId ?? row?.monetization_plan_id),
      monetizationRunId: asUuid(run.monetization_run_id ?? run.monetizationRunId),
      createdAt: asString(run.created_at ?? run.createdAt) ?? asString(run.completed_at ?? run.completedAt),
    });
  }
  if (!matches.length) return null;
  return matches.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))[0] ?? null;
}

export function researchRunIdsFromLineage(input: {
  candidateResearchRunIds?: unknown;
  monetizationResearchRunIds?: unknown;
  selectionReasoningRunIds?: unknown;
}): string[] {
  return uniqueIds([
    ...jsonIdList(input.candidateResearchRunIds),
    ...jsonIdList(input.monetizationResearchRunIds),
    ...jsonIdList(input.selectionReasoningRunIds),
  ]);
}

export function researchRunsFromRows(rows: Array<Record<string, unknown>>): CanonicalResearchRunInput[] {
  return rows
    .map((row) => {
      const id = asUuid(row.id);
      if (!id) return null;
      return {
        id,
        objective: asString(row.research_objective ?? row.researchObjective),
        status: asString(row.status),
        summary: asString(asRecord(row.structured_result)?.summary) ?? asString(row.research_objective),
      };
    })
    .filter((row): row is CanonicalResearchRunInput => Boolean(row));
}

export function assemblyEconomicsFromPackages(input: {
  businessModelPackage?: Record<string, unknown> | null;
  monetizationPackage?: Record<string, unknown> | null;
  marketingPackage?: Record<string, unknown> | null;
}): CanonicalAssemblyEconomicsInput {
  const business = input.businessModelPackage ?? {};
  const money = input.monetizationPackage ?? {};
  const marketing = input.marketingPackage ?? {};
  const channels = asStringArray(asRecord(business.acquisitionChannels)?.value ?? business.acquisitionChannels ?? marketing.channels);
  const risks = asStringArray(asRecord(business.majorRisks)?.value ?? business.majorRisks ?? money.risks);
  const metrics = asStringArray(asRecord(business.keyMetrics)?.value ?? business.keyMetrics ?? money.keyMetrics);
  return {
    pricingHypothesis: asString(asRecord(business.pricingHypothesis)?.value) ?? asString(business.pricingHypothesis) ?? asString(money.pricingHypothesis),
    acquisitionChannels: channels,
    costAssumptions: asString(asRecord(business.costAssumptions)?.value) ?? asString(business.costAssumptions) ?? asString(money.costAssumptions),
    majorRisks: risks,
    keyMetrics: metrics,
  };
}
