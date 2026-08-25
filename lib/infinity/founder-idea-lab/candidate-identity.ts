import type { FounderIdeaSubmission } from "./types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";

export const FOUNDER_CANDIDATE_LINEAGE_CONFLICT = "FOUNDER_CANDIDATE_LINEAGE_CONFLICT";
export const FOUNDER_CANDIDATE_UNIQUE = "opportunity_candidates_org_dedup_key_uidx";

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export function founderDedupKey(organizationId: string, title: string, description: string): string {
  return `founder:${organizationId}:${slug(title)}:${slug(description).slice(0, 48)}`;
}

export type FounderCandidateLookupRow = {
  id: string;
  organization_id?: string;
  discovery_run_id?: string;
  dedup_key?: string;
  merge_group_key?: string | null;
  title?: string | null;
  created_at?: string | null;
};

export function founderMergeGroupKey(submissionId: string): string {
  return `founder-idea:${submissionId}`;
}

export function founderCandidateLineageId(mergeGroupKey: string | null | undefined): string | null {
  if (!mergeGroupKey || !mergeGroupKey.startsWith("founder-idea:")) return null;
  const id = mergeGroupKey.slice("founder-idea:".length).trim();
  return id || null;
}

function titlesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? "").trim().toLowerCase() === (right ?? "").trim().toLowerCase();
}

export function reconcileFounderCandidateIdentity(
  existing: {
    organizationId: string;
    dedupKey: string;
    mergeGroupKey: string | null;
    title: string;
  },
  submission: FounderIdeaSubmission,
): { ok: true } | { ok: false; error: string } {
  if (existing.organizationId !== submission.organizationId) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  if (existing.dedupKey !== founderDedupKey(submission.organizationId, submission.title, submission.description)) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  if (existing.mergeGroupKey !== founderMergeGroupKey(submission.id)) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  if (founderCandidateLineageId(existing.mergeGroupKey) !== submission.id) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  if (!titlesMatch(existing.title, submission.title)) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  return { ok: true };
}

export function reconcileFounderCandidateLineage(
  existing: FounderCandidateLookupRow,
  submission: FounderIdeaSubmission,
  discoveryRunId: string,
): { ok: true } | { ok: false; error: string } {
  const identity = reconcileFounderCandidateIdentity(
    {
      organizationId: String(existing.organization_id ?? ""),
      dedupKey: String(existing.dedup_key ?? ""),
      mergeGroupKey: existing.merge_group_key ? String(existing.merge_group_key) : null,
      title: String(existing.title ?? ""),
    },
    submission,
  );
  if (!identity.ok) return identity;
  if (!existing.discovery_run_id || existing.discovery_run_id !== discoveryRunId) {
    return { ok: false, error: FOUNDER_CANDIDATE_LINEAGE_CONFLICT };
  }
  return { ok: true };
}

export function applyCanonicalCandidateIdentity(
  candidate: OpportunityCandidate,
  submission: FounderIdeaSubmission,
  existing: FounderCandidateLookupRow,
): void {
  candidate.id = existing.id;
  candidate.discoveryRunId = String(existing.discovery_run_id ?? candidate.discoveryRunId);
  if (existing.created_at) candidate.createdAt = String(existing.created_at);
  submission.opportunityCandidateId = existing.id;
}
