import type { FounderDecisionOverride, FounderIdeaGrade, FounderIdeaSubmission, HistoricalGradeSnapshot } from "./types";
import { founderDiscoveryIdempotencyKey, founderDiscoveryLineageId } from "./idempotency";
import {
  applyCanonicalCandidateIdentity,
  founderDedupKey,
  FOUNDER_CANDIDATE_LINEAGE_CONFLICT,
  FOUNDER_CANDIDATE_UNIQUE,
  reconcileFounderCandidateLineage,
  type FounderCandidateLookupRow,
} from "./candidate-identity";
import { overrideToRow, submissionToRow } from "./persistence";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";

export const FOUNDER_DISCOVERY_LINEAGE_CONFLICT = "FOUNDER_DISCOVERY_LINEAGE_CONFLICT";
export const FOUNDER_DISCOVERY_UNIQUE = "opportunity_discovery_runs_org_idempotency_uidx";
export { FOUNDER_CANDIDATE_LINEAGE_CONFLICT, FOUNDER_CANDIDATE_UNIQUE };

type DiscoveryLookupRow = {
  id: string;
  organization_id?: string;
  idempotency_key?: string;
  correlation_id?: unknown;
  search_scope?: unknown;
};

type DiscoveryLookupResult = {
  data: DiscoveryLookupRow | DiscoveryLookupRow[] | null;
  error: { message?: string } | null;
};

type DiscoveryQuery = {
  eq: (column: string, value: string) => DiscoveryQuery;
  maybeSingle: () => PromiseLike<DiscoveryLookupResult>;
};

type LooseWriter = {
  from: (table: string) => {
    select?: (columns?: string) => DiscoveryQuery;
    upsert: (row: unknown, opts?: { onConflict?: string }) => PromiseLike<{ data?: unknown; error: { message?: string } | null }>;
  };
};

function candidateToRow(candidate: OpportunityCandidate) {
  return {
    id: candidate.id,
    organization_id: candidate.organizationId,
    discovery_run_id: candidate.discoveryRunId,
    title: candidate.title,
    summary: candidate.summary,
    problem: candidate.problem,
    target_customer: candidate.targetCustomer,
    market: candidate.market,
    business_model_candidates: candidate.businessModelCandidates,
    revenue_mechanism_candidates: candidate.revenueMechanismCandidates,
    demand_evidence: candidate.demandEvidence,
    market_evidence: candidate.marketEvidence,
    competition_evidence: candidate.competitionEvidence,
    monetization_evidence: candidate.monetizationEvidence,
    distribution_evidence: candidate.distributionEvidence,
    buildability_evidence: candidate.buildabilityEvidence,
    risks: candidate.risks,
    unknowns: candidate.unknowns,
    research_sources: candidate.researchSources,
    research_run_ids: candidate.researchRunIds,
    discovery_strategies: candidate.discoveryStrategies.length ? candidate.discoveryStrategies : ["market_pain_discovery"],
    dedup_key: candidate.dedupKey,
    merge_group_key: candidate.mergeGroupKey,
    opportunity_score: candidate.opportunityScore,
    rank_position: candidate.rankPosition,
    created_at: candidate.createdAt,
    updated_at: candidate.updatedAt,
  };
}

function isDiscoveryUniqueViolation(message?: string): boolean {
  return Boolean(message && message.includes(FOUNDER_DISCOVERY_UNIQUE));
}

function discoveryPayload(
  submission: FounderIdeaSubmission,
  candidate: OpportunityCandidate,
  discoveryRunId: string,
) {
  return {
    id: discoveryRunId,
    organization_id: candidate.organizationId,
    status: "completed",
    scanner_version: "opportunity_scanner_v1",
    scoring_version: "opportunity_scanner_scoring_v1",
    strategies: ["market_pain_discovery"],
    search_scope: { origin: "FOUNDER_SUBMITTED", founderIdeaSubmissionId: submission.id },
    constraints: { origin: "FOUNDER_SUBMITTED" },
    correlation_id: submission.id,
    idempotency_key: founderDiscoveryIdempotencyKey(submission.id),
  };
}

export async function lookupFounderDiscoveryRun(
  admin: LooseWriter,
  organizationId: string,
  idempotencyKey: string,
): Promise<{ ok: true; row: DiscoveryLookupRow | null } | { ok: false; error: string }> {
  const table = admin.from("opportunity_discovery_runs");
  if (typeof table.select !== "function") {
    return { ok: false, error: "FOUNDER_DISCOVERY_LOOKUP_UNAVAILABLE" };
  }
  const result = await table
    .select("id, organization_id, idempotency_key, correlation_id, search_scope")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (result.error) return { ok: false, error: result.error.message ?? "FOUNDER_DISCOVERY_LOOKUP_FAILED" };
  const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
  return { ok: true, row: row ?? null };
}

export function reconcileFounderDiscoveryLineage(
  existing: DiscoveryLookupRow,
  submission: FounderIdeaSubmission,
): { ok: true } | { ok: false; error: string } {
  const lineageId = founderDiscoveryLineageId(existing);
  if (!lineageId || lineageId !== submission.id) {
    return { ok: false, error: FOUNDER_DISCOVERY_LINEAGE_CONFLICT };
  }
  return { ok: true };
}

async function upsertDiscovery(
  admin: LooseWriter,
  submission: FounderIdeaSubmission,
  candidate: OpportunityCandidate,
  discoveryRunId: string,
) {
  return admin.from("opportunity_discovery_runs").upsert(
    discoveryPayload(submission, candidate, discoveryRunId),
    { onConflict: "id" },
  );
}

async function persistDiscoveryRun(
  admin: LooseWriter,
  submission: FounderIdeaSubmission,
  candidate: OpportunityCandidate,
): Promise<{ ok: true; discoveryRunId: string } | { ok: false; error: string }> {
  const idempotencyKey = founderDiscoveryIdempotencyKey(submission.id);
  const lookedUp = await lookupFounderDiscoveryRun(admin, candidate.organizationId, idempotencyKey);
  if (!lookedUp.ok) return lookedUp;

  if (lookedUp.row) {
    const lineage = reconcileFounderDiscoveryLineage(lookedUp.row, submission);
    if (!lineage.ok) return lineage;
    candidate.discoveryRunId = lookedUp.row.id;
    const updated = await upsertDiscovery(admin, submission, candidate, lookedUp.row.id);
    if (updated.error) return { ok: false, error: updated.error.message ?? "FOUNDER_DISCOVERY_UPSERT_FAILED" };
    return { ok: true, discoveryRunId: lookedUp.row.id };
  }

  const inserted = await upsertDiscovery(admin, submission, candidate, candidate.discoveryRunId);
  if (!inserted.error) return { ok: true, discoveryRunId: candidate.discoveryRunId };

  if (!isDiscoveryUniqueViolation(inserted.error.message)) {
    return { ok: false, error: inserted.error.message ?? "FOUNDER_DISCOVERY_INSERT_FAILED" };
  }

  const raced = await lookupFounderDiscoveryRun(admin, candidate.organizationId, idempotencyKey);
  if (!raced.ok) return raced;
  if (!raced.row) return { ok: false, error: inserted.error.message ?? "FOUNDER_DISCOVERY_UNIQUE_UNRESOLVED" };
  const lineage = reconcileFounderDiscoveryLineage(raced.row, submission);
  if (!lineage.ok) return lineage;
  candidate.discoveryRunId = raced.row.id;
  const recovered = await upsertDiscovery(admin, submission, candidate, raced.row.id);
  if (recovered.error) return { ok: false, error: recovered.error.message ?? "FOUNDER_DISCOVERY_RECOVER_FAILED" };
  return { ok: true, discoveryRunId: raced.row.id };
}

async function lookupFounderCandidateByDedup(
  admin: LooseWriter,
  organizationId: string,
  dedupKey: string,
): Promise<{ ok: true; row: FounderCandidateLookupRow | null } | { ok: false; error: string }> {
  const table = admin.from("opportunity_candidates");
  if (typeof table.select !== "function") {
    return { ok: false, error: "FOUNDER_CANDIDATE_LOOKUP_UNAVAILABLE" };
  }
  const result = await table
    .select("id, organization_id, discovery_run_id, dedup_key, merge_group_key, title, created_at")
    .eq("organization_id", organizationId)
    .eq("dedup_key", dedupKey)
    .maybeSingle();
  if (result.error) return { ok: false, error: result.error.message ?? "FOUNDER_CANDIDATE_LOOKUP_FAILED" };
  const row = Array.isArray(result.data) ? result.data[0] ?? null : result.data;
  return { ok: true, row: (row as FounderCandidateLookupRow | null) ?? null };
}

function isCandidateUniqueViolation(message?: string): boolean {
  return Boolean(message && message.includes(FOUNDER_CANDIDATE_UNIQUE));
}

async function persistCanonicalCandidate(
  admin: LooseWriter,
  submission: FounderIdeaSubmission,
  candidate: OpportunityCandidate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const dedupKey = founderDedupKey(submission.organizationId, submission.title, submission.description);
  const lookedUp = await lookupFounderCandidateByDedup(admin, candidate.organizationId, dedupKey);
  if (!lookedUp.ok) return lookedUp;

  if (lookedUp.row) {
    const lineage = reconcileFounderCandidateLineage(lookedUp.row, submission, candidate.discoveryRunId);
    if (!lineage.ok) return lineage;
    applyCanonicalCandidateIdentity(candidate, submission, lookedUp.row);
    const updated = await admin.from("opportunity_candidates").upsert(candidateToRow(candidate), {
      onConflict: "id",
    });
    if (updated.error) return { ok: false, error: updated.error.message ?? "FOUNDER_CANDIDATE_UPSERT_FAILED" };
    return { ok: true };
  }

  const inserted = await admin.from("opportunity_candidates").upsert(candidateToRow(candidate), {
    onConflict: "id",
  });
  if (!inserted.error) return { ok: true };
  if (isCandidateUniqueViolation(inserted.error.message)) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  return { ok: false, error: inserted.error.message ?? "FOUNDER_CANDIDATE_INSERT_FAILED" };
}

export async function persistFounderIdea(
  admin: LooseWriter,
  submission: FounderIdeaSubmission,
  grade?: FounderIdeaGrade | null,
  override?: FounderDecisionOverride | null,
  candidate?: OpportunityCandidate | null,
  evaluationHistory: HistoricalGradeSnapshot[] = [],
): Promise<{ ok: boolean; error?: string }> {
  if (candidate) {
    const discovery = await persistDiscoveryRun(admin, submission, candidate);
    if (!discovery.ok) return { ok: false, error: discovery.error };
    const candidateResult = await persistCanonicalCandidate(admin, submission, candidate);
    if (!candidateResult.ok) return { ok: false, error: candidateResult.error };
  }
  const submissionResult = await admin.from("founder_idea_submissions").upsert(
    submissionToRow(submission, grade, evaluationHistory),
    { onConflict: "id" },
  );
  if (submissionResult.error) return { ok: false, error: submissionResult.error.message };
  if (override) {
    const overrideResult = await admin.from("founder_decision_overrides").upsert(overrideToRow(override), {
      onConflict: "id",
    });
    if (overrideResult.error) return { ok: false, error: overrideResult.error.message };
  }
  return { ok: true };
}
