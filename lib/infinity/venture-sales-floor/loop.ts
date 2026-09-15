import { resolveAutonomousSalesOpportunity, resolveSalesMotion } from "./motion";
import { occupancyNpvSalesEvidence } from "./occupancy";
import type { AutonomousSalesRecommendation, SalesFloorEvidence, SalesMotionResolution } from "./types";

export type SalesFloorLoopObservation = {
  floor_present: true;
  autonomous_execution_enabled: false;
  resolution: SalesMotionResolution;
  recommendation: AutonomousSalesRecommendation;
  pipeline_blockers: string[];
};

export function observeSalesFloorForLoop(evidence: SalesFloorEvidence = occupancyNpvSalesEvidence()): SalesFloorLoopObservation {
  const resolution = resolveSalesMotion(evidence);
  return {
    floor_present: true,
    autonomous_execution_enabled: false,
    resolution,
    recommendation: resolveAutonomousSalesOpportunity(evidence),
    pipeline_blockers: evidence.qualified_opportunities === 0 ? ["NO_QUALIFIED_OPPORTUNITY"] : [],
  };
}
