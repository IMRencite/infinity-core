import { hqVentureIdentitiesMatch } from "@/lib/infinity/hq-inspection-identity/aliases";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

export function snapshotVentureIdentityTokens(snapshot: OperatorVentureSnapshot | null | undefined): string[] {
  if (!snapshot?.venture) return [];
  return [
    snapshot.venture.ventureAssemblyId,
    snapshot.venture.opportunityId,
    snapshot.venture.ventureName,
    snapshot.venture.missionId,
    ...(snapshot.venture.correlationIds ?? []),
  ].filter((value): value is string => Boolean(value));
}

export function snapshotMatchesRequestedVenture(
  snapshot: OperatorVentureSnapshot | null | undefined,
  requestedVentureId: string | null | undefined,
): boolean {
  if (!snapshot || !requestedVentureId) return false;
  return snapshotVentureIdentityTokens(snapshot).some((token) => hqVentureIdentitiesMatch(token, requestedVentureId));
}

export function hqLiveSnapshotIsolationKey(requestedVentureId: string, organizationId?: string | null): string {
  const requested = requestedVentureId.trim();
  return organizationId ? `org:${organizationId}:venture:${requested}` : `venture:${requested}`;
}
