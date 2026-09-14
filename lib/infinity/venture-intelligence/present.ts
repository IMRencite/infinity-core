import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { HQEntityDetail } from "@/lib/infinity/operator-console/details/entity-detail-types";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { CANONICAL_ECONOMICS_UNAVAILABLE, PROJECTION_ERROR } from "@/lib/infinity/hq-inspection-identity/types";
import { isAskReviewIdentity, isOccupancynpvIdentity } from "@/lib/infinity/hq-inspection-identity/aliases";
import { buildVentureIntelligenceEntityDetail, ventureIntelligenceArtifact } from "./entity-detail";
import { loadCanonicalVentureIntelligence } from "./load";

export type VentureIntelligencePresentation = {
  detail: HQEntityDetail | null;
  artifact: HqWorkArtifact | null;
  error: string | null;
};

export async function presentCanonicalVentureIntelligence(
  admin: AdminSupabaseClient,
  snapshot: OperatorVentureSnapshot,
): Promise<VentureIntelligencePresentation> {
  try {
    const view = await loadCanonicalVentureIntelligence(admin, snapshot);
    return {
      detail: buildVentureIntelligenceEntityDetail(view),
      artifact: ventureIntelligenceArtifact(view),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "VENTURE_INTELLIGENCE_LOAD_FAILED";
    const expected = isOccupancynpvIdentity(snapshot.venture.ventureAssemblyId) || isAskReviewIdentity(snapshot.venture.ventureAssemblyId);
    return {
      detail: null,
      artifact: null,
      error: expected ? `${PROJECTION_ERROR} — ${CANONICAL_ECONOMICS_UNAVAILABLE}: ${message}` : message,
    };
  }
}
