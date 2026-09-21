import { emitMissionActivity, projectCommandActivity } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";

export function emitPremiumDesignMissionActivity(input: {
  organizationId?: string;
  candidateId: string;
  experimentId: string;
  missionId: string;
  artifactId: string;
  creativeUsed: boolean;
}): ReturnType<typeof projectCommandActivity> {
  const organizationId = input.organizationId ?? LIVE_ORG;
  const base = {
    organizationId,
    candidateId: input.candidateId,
    experimentId: input.experimentId,
    missionId: input.missionId,
    missionType: "PREMIUM_PUBLIC_VENTURE_DESIGN",
    executionClass: "VENTURE_EXECUTION" as const,
    source: "public_venture_design",
    traceability: { missionId: input.missionId, experimentId: input.experimentId, candidateId: input.candidateId, artifactId: input.artifactId },
  };
  emitMissionActivity({ ...base, engine: "mission_runtime", stepType: "PREMIUM_PUBLIC_VENTURE_DESIGN", eventType: "MISSION_STARTED" });
  emitMissionActivity({ ...base, engine: "grounded_research", stepType: "MARKET_DESIGN_CONTEXT", eventType: "STEP_COMPLETED", summary: "Understanding market design expectations" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "DESIGN_INTELLIGENCE", eventType: "STEP_COMPLETED", summary: "Composing venture design direction" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "COMPOSITION_PLAN", eventType: "STEP_COMPLETED", summary: "Selecting reusable page sections" });
  if (input.creativeUsed) {
    emitMissionActivity({ ...base, engine: "creative_media", stepType: "CREATIVE_ASSET_PLAN", eventType: "STEP_COMPLETED", summary: "Evaluating visual and media necessity" });
  }
  emitMissionActivity({ ...base, engine: "venture_build_orchestration", stepType: "GENERATE_PREMIUM_ARTIFACT", eventType: "STEP_COMPLETED", summary: "Building the premium validation artifact" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "PREMIUM_QUALITY_GATE", eventType: "STEP_COMPLETED", summary: "Checking premium visual and structural quality" });
  emitMissionActivity({
    ...base,
    engine: "mission_runtime",
    stepType: "PREMIUM_PUBLIC_VENTURE_DESIGN",
    eventType: "MISSION_BLOCKED",
    blocker: "NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED",
    authorizationRequired: "NEW_FOUNDER_PREMIUM_SUCCESSOR_DEPLOYMENT_AUTHORIZATION_REQUIRED",
    summary: "Premium successor is prepared. Deployment requires founder authorization.",
  });
  return projectCommandActivity({
    organizationId,
    knownSteps: ["MARKET_DESIGN_CONTEXT", "DESIGN_INTELLIGENCE", "COMPOSITION_PLAN", "CREATIVE_ASSET_PLAN", "GENERATE_PREMIUM_ARTIFACT", "PREMIUM_QUALITY_GATE"],
  });
}
