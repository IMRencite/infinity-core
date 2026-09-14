import type { HqActivityRoomId } from "./constants";
import { roomForStep } from "./rooms";
import { nextExpectedStep, whyForStep } from "./narrate";
import type { CanonicalActivityStatus } from "./constants";
import type { MissionActivityEvent } from "./types";

export type WorkerCapabilityRole =
  | "Command"
  | "Researcher"
  | "Question Researcher"
  | "Search/GEO Planner"
  | "Site Architect"
  | "Content Strategist"
  | "Writer"
  | "Design Planner"
  | "Creative Planner"
  | "Frontend Implementer"
  | "Reviewer"
  | "Direct Response Reviewer"
  | "Adversarial Reviewer"
  | "Repairer"
  | "Deployment Operator";

const STEP_ROLE: Record<string, WorkerCapabilityRole> = {
  QUESTION_RESEARCH: "Question Researcher",
  DISCOVER_QUESTION_UNIVERSE: "Question Researcher",
  RESEARCH_QUESTION_CLUSTER: "Question Researcher",
  SOURCE_RESEARCH: "Researcher",
  RESEARCH_SITE_OPPORTUNITY: "Researcher",
  WEB_SEARCH: "Researcher",
  PUBLIC_PAGE_FETCH: "Researcher",
  EVIDENCE_EXTRACTION: "Researcher",
  PLAN_TOPIC_ARCHITECTURE: "Search/GEO Planner",
  ORGANIC_VALIDATION_CONTENT: "Search/GEO Planner",
  SITE_ARCHITECTURE: "Site Architect",
  URL_ARCHITECTURE: "Site Architect",
  PLAN_SITE_ARCHITECTURE: "Site Architect",
  PLAN_URL_ARCHITECTURE: "Site Architect",
  PLAN_INTERNAL_LINK_GRAPH: "Site Architect",
  QUESTION_MAPPING: "Site Architect",
  INTERNAL_LINKING: "Site Architect",
  METADATA_SCHEMA: "Site Architect",
  GENERATE_SCHEMA: "Site Architect",
  CONTENT_ARCHITECTURE: "Content Strategist",
  DIRECT_RESPONSE_PLANNING: "Content Strategist",
  VISUAL_PLANNING: "Design Planner",
  PLAN_DESIGN: "Design Planner",
  PLAN_CREATIVE_ASSETS: "Creative Planner",
  CREATIVE_ASSET_PLAN: "Creative Planner",
  GENERATE_VISUALS: "Creative Planner",
  PAGE_GENERATION: "Writer",
  GENERATE_CONTENT: "Writer",
  GENERATE_VALIDATION_ARTIFACT: "Writer",
  GENERATE_PREMIUM_ARTIFACT: "Writer",
  ASSEMBLE_PAGES: "Writer",
  QUALITY_REVIEW: "Reviewer",
  VALIDATE_CONTENT: "Reviewer",
  VALIDATE_CONTENT_DEPTH: "Reviewer",
  VALIDATE_ANSWER_AUTHORITY: "Reviewer",
  VALIDATE_GEO_SEO: "Reviewer",
  VALIDATE_DESIGN: "Reviewer",
  VALIDATE_TECHNICAL: "Reviewer",
  PREMIUM_QUALITY_GATE: "Reviewer",
  PREMIUM_AUTHORITY_QUALITY_GATE: "Reviewer",
  PUBLIC_ARTIFACT_QUALITY_GATE: "Reviewer",
  RENDERED_LAYOUT_AUDIT: "Design Planner",
  RESPONSIVE_GEOMETRY_AUDIT: "Reviewer",
  DESIGN_SYSTEM_REPAIR: "Frontend Implementer",
  COMPOSITION_REPAIR: "Creative Planner",
  ARTIFACT_GENERATION: "Frontend Implementer",
  RENDERED_LAYOUT_VALIDATION: "Reviewer",
  ADVERSARIAL_VISUAL_REVIEW: "Adversarial Reviewer",
  LINEAGE_INSTRUMENTATION_AUDIT: "Site Architect",
  RENDERED_OUTPUT_VERIFICATION: "Reviewer",
  SERVED_PRODUCTION_LAYOUT_GATE: "Reviewer",
  ORCHESTRATE_SERVED_PRODUCTION_LAYOUT_PARITY: "Command",
  ORCHESTRATE_DEPLOYED_SUCCESSOR_READJUDICATION: "Command",
  FINAL_ARTIFACT_VALIDATION: "Direct Response Reviewer",
  PUBLISHABILITY_REVIEW: "Direct Response Reviewer",
  ADVERSARIAL_REVIEW: "Adversarial Reviewer",
  ADVERSARIAL_PUBLISHABILITY_REVIEW: "Adversarial Reviewer",
  TARGETED_REPAIR: "Repairer",
  AUTHORITY_REPAIR_PLAN: "Repairer",
  ORCHESTRATE_SUCCESSOR_BUILD: "Command",
  ORCHESTRATE_QUESTION_AUTHORITY_QC: "Command",
  ORCHESTRATE_HQ_LIVE_WORKER_PROOF: "Command",
  ORCHESTRATE_HQ_CROSS_PROCESS_PROOF: "Command",
  ORCHESTRATE_MISSION: "Command",
  ORCHESTRATE_DR_SUCCESSOR_DEPLOY: "Command",
  ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY: "Command",
  ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_DEPLOY: "Command",
  ORCHESTRATE_COMPILE_REPAIR_SUCCESSOR_ACTIVATE: "Command",
  ORCHESTRATE_CRE_ACQUISITION_HANDOFF: "Command",
  ORCHESTRATE_CRE_COHORT_COMPLETION: "Command",
  ORCHESTRATE_COMMUNICATION_PROVIDER_FOUNDATION: "Command",
  COMMUNICATION_ARCHITECTURE: "Site Architect",
  ACQUISITION_REQUIREMENT_BIND: "Content Strategist",
  PROVIDER_CONNECTION_VERIFICATION: "Reviewer",
  ORCHESTRATE_GMAIL_CONNECTION_READONLY: "Command",
  GMAIL_OAUTH_INTEGRATION: "Site Architect",
  GMAIL_IDENTITY_SCOPE_VERIFICATION: "Reviewer",
  ORCHESTRATE_GMAIL_CONTROLLED_WRITE: "Command",
  GMAIL_CONTROLLED_WRITE_VERIFICATION: "Reviewer",
  ORCHESTRATE_CRE_WAVE_1: "Command",
  CONTACT_REVERIFICATION: "Reviewer",
  MESSAGE_STRATEGY: "Content Strategist",
  MESSAGE_QUALITY_VALIDATION: "Reviewer",
  OUTREACH_AUTHORIZATION: "Content Strategist",
  PROVIDER_SEND: "Content Strategist",
  RESULT_PERSISTENCE: "Reviewer",
  EXPERIMENT_READBACK: "Reviewer",
  ACQUISITION_CHANNEL_ANALYSIS: "Researcher",
  OUTREACH_PREPARATION: "Content Strategist",
  GOVERNANCE_PREPARATION: "Command",
  PUBLIC_INGEST_VALIDATION: "Reviewer",
  EVIDENCE_CONTRACT_AUDIT: "Reviewer",
  PERFORMANCE_HANDOFF: "Reviewer",
  PROSPECT_QUALIFICATION: "Researcher",
  PROSPECT_GOVERNANCE: "Reviewer",
  ACTIVATE_PUBLIC_ARTIFACT: "Deployment Operator",
  ORCHESTRATE_FULL_PAGE_AUTOREPAIR: "Command",
  ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY: "Command",
  PAGE_COMPOSE: "Writer",
  PAGE_RENDER: "Reviewer",
  PAGE_VALIDATE: "Reviewer",
  PAGE_REPAIR_LOOP: "Repairer",
  PAGE_PASS: "Reviewer",
  PAGE_ADMISSION: "Reviewer",
  SITE_GRAPH_VALIDATION: "Site Architect",
  FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION: "Reviewer",
  REPEATED_FAILURE_PROMOTION: "Site Architect",
  RENDERED_LINK_CONTRAST: "Reviewer",
  PRESERVE_EXPERIMENT_OBSERVER: "Reviewer",
  DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY: "Deployment Operator",
  VALIDATION_REVIEW: "Reviewer",
  PREPARE_SOURCE_BUNDLE: "Deployment Operator",
  UPLOAD_FILES: "Deployment Operator",
  CREATE_DEPLOYMENT: "Deployment Operator",
  PROVIDER_BUILD: "Deployment Operator",
  DEPLOYMENT_READY: "Deployment Operator",
};

const ENGINE_ROLE: Record<string, WorkerCapabilityRole> = {
  grounded_research: "Researcher",
  public_web_research: "Researcher",
  venture_systems_architecture: "Site Architect",
  creative_media: "Creative Planner",
  product_asset_builder: "Writer",
  market_validation: "Reviewer",
  organic_growth: "Content Strategist",
  performance_intelligence: "Reviewer",
  mission_runtime: "Command",
  command: "Command",
};

export function workerRoleForStep(stepType: string, engine: string): WorkerCapabilityRole {
  return STEP_ROLE[stepType] ?? ENGINE_ROLE[engine] ?? "Writer";
}

export function workerTaskForEvent(event: MissionActivityEvent): string {
  const summary = event.summary?.trim();
  if (summary) return summary;
  return whyForStep(event.stepType, event.missionType) ?? event.stepType;
}

export function workerRoomForEvent(event: MissionActivityEvent): HqActivityRoomId {
  return event.room ?? roomForStep(event.stepType, event.engine);
}

export function workerVisualEligible(status: CanonicalActivityStatus): boolean {
  return status === "ACTIVE_WORK";
}

export function workerNextForStep(stepType: string, knownSteps: string[]): string | null {
  return nextExpectedStep(stepType, knownSteps);
}
