export const HQ_ACTIVITY_LIMIT = 40;
export const HQ_EXECUTIVE_QUEUE_LIMIT = 25;
export const HQ_BLUEPRINT_LIMIT = 20;
export const HQ_MISSION_LIMIT = 30;

export const HQ_ROUTES = {
  opportunities: "/dashboard/opportunities",
  validation: "/dashboard/validation",
  executive: "/dashboard/executive",
  runtime: "/dashboard/runtime",
  reasoning: "/dashboard/reasoning",
  allocations: "/dashboard/allocations",
  assets: "/dashboard/assets",
  intelligence: "/dashboard/intelligence",
  builds: "/dashboard/builds",
  ventures: "/dashboard/ventures",
  portfolio: "/dashboard/portfolio",
  ventureDetail: (ventureId: string) => `/dashboard/ventures/${ventureId}`,
  launch: "/dashboard/launch",
  missions: (missionId: string) => `/dashboard/missions/${missionId}`,
} as const;

export const OPPORTUNITY_PIPELINE_STAGES = [
  "discovered",
  "evaluating",
  "validating",
  "reasoning",
  "executive_review",
  "planning_eligible",
  "blueprint_created",
] as const;

export type OpportunityPipelineStageId = (typeof OPPORTUNITY_PIPELINE_STAGES)[number];

export const MISSION_RUNTIME_STAGES = [
  "command",
  "discovery",
  "evaluation",
  "validation",
  "reasoning",
  "executive",
  "planning",
  "allocation",
  "scheduling",
  "execution",
  "review",
  "completed",
] as const;

export type HealthStatus = "healthy" | "degraded" | "blocked" | "offline" | "not_configured";
