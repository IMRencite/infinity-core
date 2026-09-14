import { ACTIVITY_ROOM_LABELS, type MissionActivityEventType } from "./constants";
import type { HqActivityRoomId } from "./constants";
import { roomForStep } from "./rooms";

const STEP_NARRATION: Record<string, string> = {
  GENERATE_VALIDATION_ARTIFACT: "Generating the public validation site",
  GENERATE_LEGAL_ROUTES: "Adding Privacy Policy, Terms, and Sitemap",
  ISOLATED_INSTALL: "Installing the validation site dependencies",
  PRODUCTION_BUILD: "Building the new validation site",
  PUBLIC_ARTIFACT_QUALITY_GATE: "Checking public quality, legal pages, and footer",
  PREPARE_SOURCE_BUNDLE: "Preparing the source bundle",
  UPLOAD_FILES: "Uploading files to the host",
  CREATE_DEPLOYMENT: "Creating the deployment",
  PROVIDER_BUILD: "Waiting on the provider build",
  DEPLOYMENT_READY: "The public deployment is ready",
  generated_nextjs_artifact_isolated_build: "Building the new validation site",
  ACQUISITION_CHANNEL_ANALYSIS: "Ranking how to reach real CRE brokers",
  PROSPECT_DISCOVERY: "Searching public professional identities",
  PROSPECT_QUALIFICATION: "Checking prospects against the CRE qualification contract",
  PROSPECT_GOVERNANCE: "Verifying qualification, contact lineage, and cohort governance",
  OUTREACH_PREPARATION: "Preparing validation messages for later approval",
  ORGANIC_VALIDATION_CONTENT: "Finding high-intent search queries for the validation page",
  CREATIVE_ACQUISITION_ASSET: "Preparing a small supporting visual",
  EVIDENCE_MONITORING: "Watching for real validation evidence",
  MARKET_VALIDATION_ACQUISITION: "Advancing market-validation acquisition",
  RESEARCH_RETRY: "Retrying bounded research",
  RESEARCH_TIMEOUT: "Research provider timed out",
  WEB_SEARCH: "Searching for tenant-representation firms",
  PUBLIC_PAGE_FETCH: "Reviewing public firm evidence",
  EVIDENCE_EXTRACTION: "Extracting public professional evidence",
  CONTACTABILITY_RESEARCH: "Checking public business contact channels",
  GOVERNANCE_PREPARATION: "Assembling the founder authorization request",
  PUBLIC_INGEST_VALIDATION: "Checking public ingest attribution without submitting fake evidence",
  EVIDENCE_CONTRACT_AUDIT: "Separating outreach activity from qualified market evidence",
  PERFORMANCE_HANDOFF: "Handing supported acquisition telemetry to Performance Intelligence",
  ORCHESTRATE_CRE_ACQUISITION_HANDOFF: "Preparing bounded real CRE acquisition without sending",
  ORCHESTRATE_CRE_COHORT_COMPLETION: "Completing the first real CRE prospect cohort without sending",
  MARKET_DESIGN_CONTEXT: "Understanding market design expectations",
  DESIGN_INTELLIGENCE: "Composing venture design direction",
  COMPOSITION_PLAN: "Selecting reusable page sections",
  CREATIVE_ASSET_PLAN: "Evaluating visual and media necessity",
  GENERATE_PREMIUM_ARTIFACT: "Building the premium validation artifact",
  PREMIUM_QUALITY_GATE: "Checking premium visual and structural quality",
  RESEARCH_SITE_OPPORTUNITY: "Researching buyer questions and authority sources",
  PLAN_TOPIC_ARCHITECTURE: "Clustering search and GEO page opportunities",
  PLAN_SITE_ARCHITECTURE: "Planning the venture site hierarchy",
  PLAN_INTERNAL_LINK_GRAPH: "Connecting hubs, spokes, and conversion paths",
  PLAN_DESIGN: "Applying reusable design direction across pages",
  PLAN_CREATIVE_ASSETS: "Evaluating visuals page by page",
  GENERATE_CONTENT: "Writing distinct page content",
  GENERATE_VISUALS: "Building deterministic product and data visuals",
  ASSEMBLE_PAGES: "Assembling the multi-page public site",
  GENERATE_SCHEMA: "Attaching truthful page-specific structured data",
  GENERATE_SITEMAP: "Building the sitemap from public architecture",
  VALIDATE_CONTENT: "Checking depth, uniqueness, and claims",
  VALIDATE_GEO_SEO: "Checking answer quality, metadata, and indexability",
  VALIDATE_DESIGN: "Checking premium visual consistency",
  VALIDATE_TECHNICAL: "Checking routes, links, robots, and build readiness",
  PACKAGE_ARTIFACT: "Packaging the immutable site artifact",
  PREMIUM_AUTHORITY_QUALITY_GATE: "Checking premium authority site quality",
  SITE_EXPANSION_PLAN: "Recording future page opportunities without publishing them",
  ORCHESTRATE_QUESTION_AUTHORITY_QC: "Coordinating question-authority quality review",
  DISCOVER_QUESTION_UNIVERSE: "Mapping the highest-value questions CRE brokers ask about lease NPV and comparison.",
  RESEARCH_QUESTION_CLUSTER: "Researching and clustering overlapping questions",
  PLAN_URL_ARCHITECTURE: "Reviewing semantic URL architecture",
  VALIDATE_CONTENT_DEPTH: "Checking whether page depth is sufficient",
  VALIDATE_ANSWER_AUTHORITY: "Checking citation-ready answers",
  ADVERSARIAL_PUBLISHABILITY_REVIEW: "Adversarially reviewing publishability",
  PUBLISHABILITY_REVIEW: "Deciding whether a serious owner would publish",
  AUTHORITY_REPAIR_PLAN: "Recording a targeted authority repair plan",
  ORCHESTRATE_HQ_LIVE_WORKER_PROOF: "Coordinating a bounded HQ live-worker proving mission",
  ORCHESTRATE_HQ_CROSS_PROCESS_PROOF: "Orchestrating a zero-write HQ cross-process observability proof",
  DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY: "Reconciling the existing failed Vercel deployment read-only",
  VALIDATION_REVIEW: "Reviewing live HQ projection after durable mission persistence",
  ORCHESTRATE_DR_SUCCESSOR_DEPLOY: "Coordinating the authorized CRE successor staging deployment",
  ORCHESTRATE_FINAL_REPAIR_SUCCESSOR_DEPLOY: "Orchestrating deployment and live verification of the final CRE authority successor",
  ORCHESTRATE_SUCCESSOR_BUILD: "Coordinating the direct-response authority successor build",
  QUESTION_RESEARCH: "Mapping high-confidence commercial lease economics questions",
  SOURCE_RESEARCH: "Researching independent professional sources for lease economics",
  SITE_ARCHITECTURE: "Planning the digital-real-estate site hierarchy",
  URL_ARCHITECTURE: "Preserving existing URLs and documenting future silos",
  CONTENT_ARCHITECTURE: "Planning question-first authority sections",
  DIRECT_RESPONSE_PLANNING: "Planning long-form commercial sequences",
  VISUAL_PLANNING: "Planning cash-flow, comparison, and product visuals",
  PAGE_GENERATION: "Writing successor authority and commercial pages",
  QUESTION_MAPPING: "Mapping each known question to a page or section",
  INTERNAL_LINKING: "Connecting hubs, spokes, persona, and conversion paths",
  METADATA_SCHEMA: "Attaching unique metadata and truthful schema",
  QUALITY_REVIEW: "Reviewing depth, answer authority, and citation readiness",
  ADVERSARIAL_REVIEW: "Trying to reject thin or generic pages",
  TARGETED_REPAIR: "Repairing only failed authority dimensions",
  FINAL_ARTIFACT_VALIDATION: "Validating the immutable successor artifact locally",
  ORCHESTRATE_FULL_PAGE_AUTOREPAIR: "Coordinating per-page render, validate, and bounded repair",
  ORCHESTRATE_FULL_PAGE_AUTOREPAIR_DEPLOY: "Coordinating the governed full-page autorepair deployment",
  ORCHESTRATE_PRICING_PRERENDER_REPAIR: "Coordinating the /pricing prerender and provider-equivalent build repair",
  REPRODUCE_PRICING_PRERENDER: "Reproducing the isolated Next prerender failure on /pricing",
  PAGE_COMPOSE: "Composing each public authority page before render",
  PAGE_RENDER: "Rendering every public route for visual inspection",
  PAGE_VALIDATE: "Running page-level visual, content, SEO, and GEO gates",
  PAGE_REPAIR_LOOP: "Repairing failed pages and re-validating immediately",
  PAGE_PASS: "Admitting only pages that passed their required gates",
  PAGE_ADMISSION: "Blocking artifact freeze until every public page passes",
  SITE_GRAPH_VALIDATION: "Promoting repeated page failures to shared or global fixes",
  FULL_ROUTE_FROZEN_ARTIFACT_VALIDATION: "Re-validating every public route against the frozen artifact",
  REPEATED_FAILURE_PROMOTION: "Inspecting whether the same defect belongs in a shared component",
  RENDERED_LINK_CONTRAST: "Checking every visible link against its effective background",
  PRESERVE_EXPERIMENT_OBSERVER: "Confirming the live experiment and inbound observer were not restarted",
};

const EVENT_NARRATION: Partial<Record<MissionActivityEventType, string>> = {
  MISSION_STARTED: "Started a coordinated mission",
  MISSION_BLOCKED: "Stopped because authorization or a real blocker is required",
  MISSION_WAITING: "Waiting on an external condition",
  MISSION_COMPLETED: "Finished the current mission",
  MISSION_FAILED: "The current mission failed",
};

export function narrateActivity(input: {
  eventType: MissionActivityEventType;
  stepType: string;
  room: HqActivityRoomId;
  missionType: string;
}): string {
  const step = STEP_NARRATION[input.stepType];
  if (step && (input.eventType.startsWith("STEP_") || input.eventType.startsWith("EXTERNAL_"))) {
    if (input.eventType.endsWith("_COMPLETED")) return `${step} — complete`;
    if (input.eventType.endsWith("_FAILED")) return `${step} — failed`;
    return step;
  }
  return EVENT_NARRATION[input.eventType] ?? `${ACTIVITY_ROOM_LABELS[input.room]} updated`;
}

export function whyForStep(stepType: string, missionType: string): string {
  if (stepType === "GENERATE_VALIDATION_ARTIFACT") {
    return "Infinity needs a public validation page before real prospects can be sent.";
  }
  if (stepType === "PUBLIC_ARTIFACT_QUALITY_GATE") {
    return "The public page must meet the validation-grade and legal contract before activation.";
  }
  if (stepType === "PRODUCTION_BUILD") {
    return "The generated site must compile before it can be hosted.";
  }
  if (stepType === "ACQUISITION_CHANNEL_ANALYSIS") {
    return "Infinity is choosing the smallest path to trustworthy CRE evidence.";
  }
  if (stepType === "PROSPECT_DISCOVERY") {
    return "Named tenant-rep prospects are required before any outreach can be authorized.";
  }
  if (stepType === "PROSPECT_QUALIFICATION") {
    return "Only brokers with lease-workflow evidence can count toward the experiment.";
  }
  if (stepType === "RESEARCH_RETRY" || stepType === "RESEARCH_TIMEOUT") {
    return "Research provider timed out. Infinity is retrying through the permitted research path.";
  }
  if (stepType === "CONTACTABILITY_RESEARCH") {
    return "Infinity is checking only publicly published business contact channels.";
  }
  if (stepType === "OUTREACH_PREPARATION") {
    return "Drafts are prepared for later approval. No message is sent.";
  }
  if (stepType === "GOVERNANCE_PREPARATION") {
    return "Command assembles one founder request only when a communication action is executable.";
  }
  if (stepType === "DISCOVER_QUESTION_UNIVERSE" || stepType === "RESEARCH_QUESTION_CLUSTER") {
    return "Question coverage must be researched before authority pages can be judged complete.";
  }
  if (stepType === "PLAN_SITE_ARCHITECTURE" || stepType === "PLAN_URL_ARCHITECTURE" || stepType === "PLAN_INTERNAL_LINK_GRAPH") {
    return "Topic, URL, and internal-link mapping must be explicit before sufficiency QC.";
  }
  if (
    stepType === "VALIDATE_CONTENT_DEPTH" ||
    stepType === "VALIDATE_ANSWER_AUTHORITY" ||
    stepType === "VALIDATE_GEO_SEO" ||
    stepType === "ADVERSARIAL_PUBLISHABILITY_REVIEW" ||
    stepType === "PUBLISHABILITY_REVIEW"
  ) {
    return "Quality control must validate sufficiency, not just presence.";
  }
  if (
    stepType === "QUESTION_RESEARCH" ||
    stepType === "SOURCE_RESEARCH" ||
    stepType === "SITE_ARCHITECTURE" ||
    stepType === "PAGE_GENERATION" ||
    stepType === "QUALITY_REVIEW" ||
    stepType === "FINAL_ARTIFACT_VALIDATION"
  ) {
    return "The successor must be built and judged against the new authority standard, not inherited from the live artifact.";
  }
  if (
    stepType === "RENDERED_LAYOUT_AUDIT" ||
    stepType === "RESPONSIVE_GEOMETRY_AUDIT" ||
    stepType === "DESIGN_SYSTEM_REPAIR" ||
    stepType === "COMPOSITION_REPAIR" ||
    stepType === "ARTIFACT_GENERATION" ||
    stepType === "RENDERED_LAYOUT_VALIDATION" ||
    stepType === "ADVERSARIAL_VISUAL_REVIEW"
  ) {
    return "Rendered layout must be judged from geometry and composition, not component presence.";
  }
  if (stepType === "LINEAGE_INSTRUMENTATION_AUDIT" || stepType === "RENDERED_OUTPUT_VERIFICATION") {
    return "Public lineage and question identity must be present in the rendered production artifact, not only in source objects.";
  }
  return `Continuing ${missionType.replace(/_/g, " ").toLowerCase()}.`;
}

export function nextExpectedStep(currentStep: string | null, knownSteps: string[]): string | null {
  if (!currentStep) return knownSteps[0] ?? null;
  const index = knownSteps.indexOf(currentStep);
  if (index < 0 || index + 1 >= knownSteps.length) return null;
  return knownSteps[index + 1];
}

export { roomForStep };
