import { emitMissionActivity, projectCommandActivity } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";

export const AUTHORITY_SITE_MISSION_STEPS = [
  "RESEARCH_SITE_OPPORTUNITY",
  "PLAN_TOPIC_ARCHITECTURE",
  "PLAN_SITE_ARCHITECTURE",
  "PLAN_INTERNAL_LINK_GRAPH",
  "PLAN_DESIGN",
  "PLAN_CREATIVE_ASSETS",
  "GENERATE_CONTENT",
  "GENERATE_VISUALS",
  "ASSEMBLE_PAGES",
  "GENERATE_SCHEMA",
  "GENERATE_SITEMAP",
  "VALIDATE_CONTENT",
  "VALIDATE_GEO_SEO",
  "VALIDATE_DESIGN",
  "VALIDATE_TECHNICAL",
  "PACKAGE_ARTIFACT",
  "PREMIUM_AUTHORITY_QUALITY_GATE",
  "SITE_EXPANSION_PLAN",
] as const;

export function emitAuthoritySiteMissionActivity(input: {
  organizationId?: string;
  candidateId: string;
  experimentId: string;
  missionId: string;
  artifactId: string;
  creativeUsed: boolean;
  pagesCompleted: number;
  pagesPlanned: number;
}): ReturnType<typeof projectCommandActivity> {
  const organizationId = input.organizationId ?? LIVE_ORG;
  const base = {
    organizationId,
    candidateId: input.candidateId,
    experimentId: input.experimentId,
    missionId: input.missionId,
    missionType: "PREMIUM_AUTHORITY_VENTURE_WEBSITE",
    executionClass: "VENTURE_EXECUTION" as const,
    source: "venture_website_architecture",
    progress: {
      completedSteps: input.pagesCompleted,
      totalKnownSteps: input.pagesPlanned,
      source: "record_count" as const,
    },
    traceability: {
      missionId: input.missionId,
      experimentId: input.experimentId,
      candidateId: input.candidateId,
      artifactId: input.artifactId,
    },
  };
  emitMissionActivity({ ...base, engine: "mission_runtime", stepType: "PACKAGE_ARTIFACT", eventType: "MISSION_STARTED" });
  emitMissionActivity({ ...base, engine: "grounded_research", stepType: "RESEARCH_SITE_OPPORTUNITY", eventType: "STEP_COMPLETED", summary: "Researching buyer questions and authority sources" });
  emitMissionActivity({ ...base, engine: "grounded_research", stepType: "PLAN_TOPIC_ARCHITECTURE", eventType: "STEP_COMPLETED", summary: "Clustering search and GEO page opportunities" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "PLAN_SITE_ARCHITECTURE", eventType: "STEP_COMPLETED", summary: "Planning the venture site hierarchy" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "PLAN_INTERNAL_LINK_GRAPH", eventType: "STEP_COMPLETED", summary: "Connecting hubs, spokes, and conversion paths" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "PLAN_DESIGN", eventType: "STEP_COMPLETED", summary: "Applying reusable design direction across pages" });
  if (input.creativeUsed) {
    emitMissionActivity({ ...base, engine: "creative_media", stepType: "PLAN_CREATIVE_ASSETS", eventType: "STEP_COMPLETED", summary: "Evaluating visuals page by page" });
    emitMissionActivity({ ...base, engine: "creative_media", stepType: "GENERATE_VISUALS", eventType: "STEP_COMPLETED", summary: "Building deterministic product and data visuals" });
  }
  emitMissionActivity({ ...base, engine: "venture_build_orchestration", stepType: "GENERATE_CONTENT", eventType: "STEP_COMPLETED", summary: "Writing distinct page content" });
  emitMissionActivity({ ...base, engine: "venture_build_orchestration", stepType: "ASSEMBLE_PAGES", eventType: "STEP_COMPLETED", summary: "Assembling the multi-page public site" });
  emitMissionActivity({ ...base, engine: "venture_systems_architecture", stepType: "GENERATE_SCHEMA", eventType: "STEP_COMPLETED", summary: "Attaching truthful page-specific structured data" });
  emitMissionActivity({ ...base, engine: "venture_build_orchestration", stepType: "GENERATE_SITEMAP", eventType: "STEP_COMPLETED", summary: "Building the sitemap from public architecture" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "VALIDATE_CONTENT", eventType: "STEP_COMPLETED", summary: "Checking depth, uniqueness, and claims" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "VALIDATE_GEO_SEO", eventType: "STEP_COMPLETED", summary: "Checking answer quality, metadata, and indexability" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "VALIDATE_DESIGN", eventType: "STEP_COMPLETED", summary: "Checking premium visual consistency" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "VALIDATE_TECHNICAL", eventType: "STEP_COMPLETED", summary: "Checking routes, links, robots, and build readiness" });
  emitMissionActivity({ ...base, engine: "venture_build_orchestration", stepType: "PACKAGE_ARTIFACT", eventType: "STEP_COMPLETED", summary: "Packaging the immutable site artifact" });
  emitMissionActivity({ ...base, engine: "market_validation", stepType: "PREMIUM_AUTHORITY_QUALITY_GATE", eventType: "STEP_COMPLETED", summary: "Checking premium authority site quality" });
  emitMissionActivity({ ...base, engine: "performance_intelligence", stepType: "SITE_EXPANSION_PLAN", eventType: "STEP_COMPLETED", summary: "Recording future page opportunities without publishing them" });
  emitMissionActivity({
    ...base,
    engine: "mission_runtime",
    stepType: "PACKAGE_ARTIFACT",
    eventType: "MISSION_BLOCKED",
    blocker: "NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED",
    authorizationRequired: "NEW_FOUNDER_PREMIUM_AUTHORITY_SITE_DEPLOYMENT_AUTHORIZATION_REQUIRED",
    summary: "Authority site successor is prepared. Deployment requires founder authorization.",
  });
  return projectCommandActivity({
    organizationId,
    knownSteps: [...AUTHORITY_SITE_MISSION_STEPS],
  });
}
