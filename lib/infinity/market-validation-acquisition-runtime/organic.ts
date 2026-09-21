import { DEPLOYED_SEO_GEO_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";
import { inspectOrganicGrowthRoleForCreValidation } from "@/lib/infinity/market-validation-experiment/organic-growth-role";
import { recommendOrganicStrategy } from "@/lib/infinity/organic-growth-engine/viability/organic-channel-viability";

const LIVE_VALIDATION_URL = DEPLOYED_SEO_GEO_SUCCESSOR_URL;

export function discoverBoundedOrganicOpportunities(): {
  engineReused: true;
  opportunities: Array<{ query: string; routeTo: string }>;
  largeSeoBuild: false;
  strategy: ReturnType<typeof recommendOrganicStrategy>;
} {
  void inspectOrganicGrowthRoleForCreValidation();
  return {
    engineReused: true,
    opportunities: [
      { query: "commercial lease NPV comparison for tenant rep brokers", routeTo: LIVE_VALIDATION_URL },
      { query: "compare step-up CAM TI free rent lease economics", routeTo: LIVE_VALIDATION_URL },
      { query: "occupier lease analysis worksheet alternative", routeTo: LIVE_VALIDATION_URL },
    ],
    largeSeoBuild: false,
    strategy: recommendOrganicStrategy(20),
  };
}
