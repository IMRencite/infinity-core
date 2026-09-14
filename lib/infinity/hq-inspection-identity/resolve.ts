import "server-only";

import { resolveCanonicalRecordForHqVenture } from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { isOccupancynpvRecord, mapCanonicalLifecycle } from "@/lib/infinity/venture-operating-scale/hq-venture-lifecycle";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { listVentureEconomics, readVentureEconomics } from "@/lib/infinity/venture-economics/persist";
import type { VentureEconomicsIntelligenceRecord } from "@/lib/infinity/venture-economics/types";
import {
  hqVentureIdentitiesMatch,
  isAskReviewIdentity,
  isOccupancynpvIdentity,
  projectKnownInspectionLifecycle,
  resolveKnownHqInspectionVentureIdentity,
  stripCandidatePrefix,
} from "./aliases";
import type { HqInspectionIdentity, HqInspectionIdentityRef } from "./types";

export {
  canonicalizeInspectionRef,
  hqVentureIdentitiesMatch,
  hqVentureIdentityAliases,
  isAskReviewIdentity,
  isCanonicalInspectTarget,
  isOccupancynpvIdentity,
  projectKnownInspectionLifecycle,
  resolveKnownHqInspectionVentureIdentity,
  resolvePreferredVentureIdFromInspect,
  stripCandidatePrefix,
  withCandidatePrefix,
} from "./aliases";

export function projectInspectionLifecycle(ventureId: string | null | undefined): string | null {
  const known = projectKnownInspectionLifecycle(ventureId);
  if (known) return known;
  if (!ventureId) return null;
  const record = resolveCanonicalRecordForHqVenture({
    ventureId,
    candidateId: stripCandidatePrefix(ventureId),
  });
  if (!record) return null;
  if (isOccupancynpvRecord(record) && occupancynpvPubliclyLaunched()) return "PUBLICLY_LAUNCHED";
  return mapCanonicalLifecycle(record);
}

export function resolveHqInspectionVentureIdentity(
  inspect: HqInspectionIdentityRef | null | undefined,
): HqInspectionIdentity {
  const known = resolveKnownHqInspectionVentureIdentity(inspect);
  if (known.ventureName && known.canonicalVentureId) return known;
  if (!inspect?.entityId) return known;
  const record = resolveCanonicalRecordForHqVenture({
    ventureId: inspect.entityType === "VENTURE" ? inspect.entityId : `candidate:${inspect.entityId}`,
    candidateId: inspect.entityType === "OPPORTUNITY_CANDIDATE" ? inspect.entityId : stripCandidatePrefix(inspect.entityId),
  });
  if (!record) return known;
  return {
    ...known,
    candidateId: record.venture_id.startsWith("candidate:") ? stripCandidatePrefix(record.venture_id) : known.candidateId,
    canonicalVentureId: record.venture_id,
    ventureName: record.venture_name,
    productTitle: record.primary_offer,
    lifecycle: projectInspectionLifecycle(record.venture_id),
    economicsVentureId: record.venture_id,
    mappedFromCandidate: inspect.entityType === "OPPORTUNITY_CANDIDATE",
    source: "canonical_venture",
  };
}

export function readVentureEconomicsForIdentity(
  ventureId: string | null | undefined,
): VentureEconomicsIntelligenceRecord | null {
  if (!ventureId) return null;
  const exact = readVentureEconomics(ventureId);
  if (exact) return exact;
  return listVentureEconomics().find((row) => hqVentureIdentitiesMatch(row.venture_id, ventureId)) ?? null;
}

export function isKnownCanonicalEconomicsVenture(ventureId: string | null | undefined): boolean {
  return isOccupancynpvIdentity(ventureId) || isAskReviewIdentity(ventureId);
}
