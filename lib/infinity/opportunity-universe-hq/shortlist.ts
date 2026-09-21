import type { OpportunityShortlist, OpportunityShortlistDiff, OpportunityShortlistMember } from "./types";

export function createOpportunityShortlist(input: {
  shortlistId: string;
  version: number;
  createdAt: string;
  sourceDiscoveryRunId: string | null;
  selectionCriteria: string;
  status: "CURRENT" | "SUPERSEDED";
  members: OpportunityShortlistMember[];
  evidenceSnapshot: string;
}): OpportunityShortlist {
  return {
    shortlistId: input.shortlistId,
    version: input.version,
    createdAt: input.createdAt,
    sourceDiscoveryRunId: input.sourceDiscoveryRunId,
    selectionCriteria: input.selectionCriteria,
    status: input.status,
    members: input.members,
    evidenceSnapshot: input.evidenceSnapshot,
  };
}

export function appendOpportunityShortlist(
  existing: OpportunityShortlist[],
  next: OpportunityShortlist,
): OpportunityShortlist[] {
  const superseded = existing.map((row) => (
    row.shortlistId === next.shortlistId
      ? row
      : { ...row, status: "SUPERSEDED" as const }
  ));
  if (superseded.some((row) => row.shortlistId === next.shortlistId && row.version === next.version)) {
    throw new Error("SILENT_SHORTLIST_REPLACEMENT_FORBIDDEN");
  }
  return [...superseded.filter((row) => row.shortlistId !== next.shortlistId || row.version !== next.version), next];
}

export function diffOpportunityShortlists(
  previous: OpportunityShortlist | null,
  current: OpportunityShortlist,
): OpportunityShortlistDiff {
  const prevIds = new Set((previous?.members ?? []).map((row) => row.candidateId));
  const nextIds = new Set(current.members.map((row) => row.candidateId));
  const prevRank = new Map((previous?.members ?? []).map((row) => [row.candidateId, row.rank]));
  const rankChanges = current.members
    .map((row) => ({
      candidateId: row.candidateId,
      from: prevRank.get(row.candidateId) ?? null,
      to: row.rank,
    }))
    .filter((row) => row.from !== row.to);
  return {
    previousId: previous?.shortlistId ?? null,
    currentId: current.shortlistId,
    added: current.members.map((row) => row.candidateId).filter((id) => !prevIds.has(id)),
    removed: [...prevIds].filter((id) => !nextIds.has(id)),
    rankChanges,
  };
}

export function currentOpportunityShortlist(shortlists: OpportunityShortlist[]): OpportunityShortlist | null {
  return [...shortlists].reverse().find((row) => row.status === "CURRENT") ?? shortlists.at(-1) ?? null;
}
