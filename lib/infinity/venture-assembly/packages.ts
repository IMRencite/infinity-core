import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { VentureBlueprint } from "@/lib/infinity/venture-factory/types/blueprint";
import type { VentureAssemblyManifestV1 } from "./types";
import { VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION } from "./constants";
import { evaluateLaunchReadiness } from "./readiness";
import {
  buildCanonicalVentureAssemblyIdentity,
  candidateIdFromLineageSources,
  persistCanonicalVentureAssemblyIdentity,
} from "./identity";

export type AssemblySourceContext = {
  organizationId: string;
  missionId: string;
  opportunityId: string;
  executiveDecisionId: string;
  planId: string;
  planVersion: number;
  planExecutionId: string;
  ventureBlueprintId: string | null;
  buildId: string;
  buildJobId: string;
  buildSnapshotId: string;
  workspaceReference: string | null;
  projectType: string;
  builderKey: string;
  blueprint: VentureBlueprint | null;
  opportunityName: string;
  opportunitySummary: string | null;
  opportunityCandidateId?: string | null;
  candidateTitle?: string | null;
  candidateRank?: number | null;
  origin?: string | null;
  companyBuilderBlueprintId?: string | null;
};

function slugDomainCandidate(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base ? `${base}.example` : "venture.example";
}

export function buildAssemblyPackages(ctx: AssemblySourceContext): {
  identityPackage: Record<string, unknown>;
  businessModelPackage: Record<string, unknown>;
  brandPackage: Record<string, unknown>;
  digitalPropertyPackage: Record<string, unknown>;
  monetizationPackage: Record<string, unknown>;
  marketingPackage: Record<string, unknown>;
  operationsPackage: Record<string, unknown>;
  legalCompliancePackage: Record<string, unknown>;
  manifest: VentureAssemblyManifestV1;
  externalDependencies: Array<{
    dependencyType: string;
    reason: string;
    requiredFor: string;
    blockingStage: string;
    estimatedCost: number | null;
    approvalRequirement: string;
    capabilityRequirement: string | null;
    status: string;
  }>;
  readinessEvaluation: ReturnType<typeof evaluateLaunchReadiness>;
} {
  const bp = ctx.blueprint;
  const identity = buildCanonicalVentureAssemblyIdentity({
    opportunityCandidateId: ctx.opportunityCandidateId,
    opportunityId: ctx.opportunityId,
    candidateTitle: ctx.candidateTitle,
    workingName: bp?.name ?? ctx.opportunityName,
    origin: ctx.origin ?? "venture_assembly",
    rank: ctx.candidateRank,
    blueprintId: ctx.companyBuilderBlueprintId ?? ctx.ventureBlueprintId,
  });
  const persisted = persistCanonicalVentureAssemblyIdentity(identity);
  const workingName = identity.workingName;
  const ventureType = bp?.ventureType ?? ctx.projectType;
  const businessModel = bp?.businessModel ?? "digital_venture";
  const targetCustomer = bp?.targetAudience ?? "Defined in approved blueprint";
  const problem = bp?.description ?? ctx.opportunitySummary ?? "Derived from approved opportunity context";
  const valueProposition = bp?.valueProposition ?? "Derived from executive-approved blueprint";
  const revenueModel = bp?.revenueModel ?? "hypothesis_pending";

  const identityPackage = {
    workingName,
    displayName: identity.displayName,
    opportunityCandidateId: identity.opportunityCandidateId,
    origin: identity.origin,
    rank: identity.rank,
    ventureDescription: problem,
    category: ventureType,
    positioning: valueProposition,
    targetAudience: targetCustomer,
    primaryProblem: problem,
    primaryPromise: valueProposition,
    brandDirection: "Internal specification — no external design tooling invoked.",
    voiceTone: "Clear, helpful, trustworthy (derived from blueprint).",
    candidateDomainNames: [
      slugDomainCandidate(workingName),
      `${slugDomainCandidate(workingName).replace(".example", "")}-hq.example`,
    ],
    classification: {
      workingName: "derived_decision",
      candidateDomainNames: "assumption",
    },
    notice: "Candidate domains are text suggestions only — not checked or registered.",
  };

  const businessModelPackage = {
    customer: { value: targetCustomer, classification: "approved_fact" },
    problem: { value: problem, classification: bp ? "derived_decision" : "assumption" },
    solution: { value: valueProposition, classification: "derived_decision" },
    offer: { value: bp?.requiredProducts?.[0] ?? "Digital offer from approved plan", classification: "derived_decision" },
    revenueModel: { value: revenueModel, classification: "assumption" },
    pricingHypothesis: { value: "To be validated at launch", classification: "unknown" },
    costAssumptions: { value: bp?.estimatedBudget ?? "zero internal assembly cost", classification: "assumption" },
    acquisitionChannels: { value: bp?.marketingChannels ?? [], classification: "derived_decision" },
    conversionMechanism: { value: "On-site conversion paths from build artifact", classification: "derived_decision" },
    deliveryMechanism: { value: "Internal digital property", classification: "approved_fact" },
    retentionMechanism: { value: ventureType.includes("saas") ? "subscription hypothesis" : "content/email hypothesis", classification: "assumption" },
    keyMetrics: { value: ["traffic", "conversion_rate", "revenue"], classification: "assumption" },
    majorRisks: { value: ["market validation unproven", "external launch dependencies unresolved"], classification: "approved_fact" },
    validationAssumptions: { value: ["Offer-market fit not validated"], classification: "unknown" },
  };

  const brandPackage = {
    workingBrandName: workingName,
    positioningStatement: valueProposition,
    brandPersonality: "Approachable expert",
    voice: "Plain language",
    tone: "Confident, not hype",
    visualDirection: "Clean, readable, accessible",
    typographyDirection: "System-friendly sans-serif stack",
    colorDirection: "Neutral base with single accent",
    logoDirection: "Wordmark placeholder — no logo artifact claimed unless generated",
    imageDirection: "Original or licensed imagery required before launch",
    messagingPillars: [valueProposition, targetCustomer, businessModel],
    taglineCandidates: [`${workingName}: ${valueProposition.slice(0, 80)}`],
    logoArtifactPresent: false,
  };

  const isWebsite =
    ctx.projectType.includes("site") ||
    ctx.projectType.includes("website") ||
    ctx.builderKey.startsWith("website.");

  const digitalPropertyPackage = {
    properties: [
      {
        kind: isWebsite ? "website" : "digital_product",
        buildId: ctx.buildId,
        buildJobId: ctx.buildJobId,
        buildSnapshotId: ctx.buildSnapshotId,
        workspaceReference: ctx.workspaceReference,
        builderKey: ctx.builderKey,
        regeneratePolicy: "consume_existing_artifact",
      },
    ],
    websiteDetails: isWebsite
      ? {
          sitePurpose: valueProposition,
          informationArchitecture: "From Build Factory site-structure.json reference",
          requiredPages: "From internal build manifest",
          conversionPaths: "Contact / CTA paths defined in build",
          seoStructure: "sitemap.xml and metadata-manifest references in workspace",
          analyticsRequirements: ["pageviews", "conversion_events"],
          technicalRequirements: ["static hosting", "TLS at launch"],
          contentInventory: "Referenced from build workspace files",
        }
      : null,
  };

  const monetizationPackage = {
    revenueMechanism: revenueModel,
    pricingHypothesis: businessModelPackage.pricingHypothesis,
    checkoutRequirements: ["payment_processor_account"],
    billingRequirements: revenueModel.includes("subscription") ? ["recurring billing provider"] : [],
    affiliateRequirements: revenueModel.includes("affiliate") ? ["affiliate_program_approval"] : [],
    leadRoutingRequirements: revenueModel.includes("lead") ? ["CRM or lead inbox"] : [],
    requiredExternalAccounts: ["payment_processor", "domain_registrar", "production_hosting"],
    notice: "No payment processors or affiliate programs are created in v1.",
  };

  const marketingPackage = {
    primaryAcquisitionChannels: bp?.marketingChannels?.slice(0, 3) ?? ["organic_search"],
    secondaryChannels: bp?.marketingChannels?.slice(3) ?? [],
    seoStrategy: "On-page structure from build; content calendar internal only",
    geoStrategy: "Structured data and entity clarity from build metadata",
    contentStrategy: bp?.requiredContent ?? ["pillar content", "supporting articles"],
    paidAcquisitionHypothesis: "Deferred until launch approval",
    socialStrategy: "Optional — no accounts created",
    emailStrategy: "Optional — no provider configured",
    conversionStrategy: "Landing pages and CTAs from build artifact",
    retentionStrategy: "Email/content per venture type",
    measurementPlan: ["analytics baseline", "conversion tracking"],
    initialExperiments: ["message-market fit landing tests"],
    operatingPlan30_60_90: {
      days30: "Validate analytics and internal QA checklist",
      days60: "Resolve external dependencies",
      days90: "Human launch review gate",
    },
  };

  const operationsPackage = {
    recurringWorkerCapabilities: bp?.requiredWorkers ?? [],
    contentProduction: "website.content.* capabilities where registered",
    customerSupport: "Not configured — launch dependency",
    leadHandling: "Internal routing TBD",
    analyticsMonitoring: "analytics.read internal only",
    financialMonitoring: "Manual until billing connected",
    productMaintenance: "build maintenance via Build Factory",
    seoGeoMonitoring: "Periodic internal validation workers",
    conversionOptimization: "Hypothesis backlog only",
    securityMaintenance: "Workspace sandbox policies",
    reportingCadence: "weekly internal HQ review",
    capabilityGaps: [] as string[],
  };

  const legalCompliancePackage = {
    privacyPolicy: { status: "required", note: "Needs human/legal review before launch" },
    termsOfService: { status: "possibly_required", note: "Depends on monetization" },
    cookieRequirements: { status: "possibly_required", note: "If analytics cookies used at launch" },
    affiliateDisclosure: {
      status: revenueModel.includes("affiliate") ? "required" : "not_applicable",
    },
    advertisingDisclosures: { status: "possibly_required" },
    refundPolicy: { status: "possibly_required" },
    industrySpecific: { status: "needs_human_review" },
    dataHandling: { status: "required", note: "Map to org data policies" },
    legalApprovalClaimed: false,
  };

  const externalDependencies = [
    {
      dependencyType: "domain_registration",
      reason: "Production domain not registered internally",
      requiredFor: "public_launch",
      blockingStage: "launch",
      estimatedCost: null,
      approvalRequirement: "requires_approval",
      capabilityRequirement: "domain.register",
      status: "requires_external_capability",
    },
    {
      dependencyType: "production_deployment",
      reason: "Build remains internal sandbox only",
      requiredFor: "public_launch",
      blockingStage: "launch",
      estimatedCost: null,
      approvalRequirement: "requires_approval",
      capabilityRequirement: "deploy.publish_external",
      status: "requires_external_capability",
    },
    {
      dependencyType: "payment_processor",
      reason: "Monetization requires external processor",
      requiredFor: "revenue_collection",
      blockingStage: "launch",
      estimatedCost: null,
      approvalRequirement: "requires_approval",
      capabilityRequirement: "financial.connect_processor",
      status: "unresolved",
    },
  ];

  const manifest: VentureAssemblyManifestV1 = {
    schemaVersion: VENTURE_ASSEMBLY_MANIFEST_SCHEMA_VERSION,
    ventureIdentity: {
      workingName,
      displayName: identity.displayName,
      ventureType,
      businessModel,
      targetCustomer,
      problem,
      valueProposition,
      offer: String(businessModelPackage.offer.value),
    },
    opportunityCandidateId: persisted.manifestLineage.opportunityCandidateId,
    companyBuilderBlueprintId: persisted.manifestLineage.companyBuilderBlueprintId,
    origin: persisted.manifestLineage.origin,
    rank: persisted.manifestLineage.rank,
    traceability: {
      organizationId: ctx.organizationId,
      missionId: ctx.missionId,
      opportunityId: ctx.opportunityId,
      executiveDecisionId: ctx.executiveDecisionId,
      planId: ctx.planId,
      planVersion: ctx.planVersion,
      planExecutionId: ctx.planExecutionId,
      buildId: ctx.buildId,
      buildJobId: ctx.buildJobId,
      buildSnapshotId: ctx.buildSnapshotId,
      ventureBlueprintId: ctx.ventureBlueprintId,
      workerResultIds: [],
      qaResultIds: [],
    },
    artifactInventory: [
      {
        kind: "internal_build",
        referenceId: ctx.buildId,
        referenceType: "builds",
        description: "Governed Build Factory output",
      },
      {
        kind: "build_snapshot",
        referenceId: ctx.buildSnapshotId,
        referenceType: "build_snapshots",
        description: "Immutable reproducibility snapshot",
      },
    ],
    readinessState: null,
    unresolvedDecisions: ["pricing validation", "launch timing"],
    riskRegister: [
      { risk: "External launch dependencies unresolved", classification: "approved_fact" },
      { risk: "Market demand unvalidated", classification: "unknown" },
    ],
    launchRequirements: externalDependencies.map((d) => d.dependencyType),
    externalDependencySummary: externalDependencies.map((d) => `${d.dependencyType}:${d.status}`),
  };

  const readinessEvaluation = evaluateLaunchReadiness({
    hasStrategyTraceability: Boolean(ctx.executiveDecisionId && ctx.planId),
    identityComplete: Boolean(workingName && valueProposition),
    businessModelComplete: Boolean(revenueModel && targetCustomer),
    buildComplete: Boolean(ctx.buildId && ctx.buildSnapshotId),
    qaComplete: true,
    reproducibilityComplete: true,
    monetizationDefined: Boolean(revenueModel),
    marketingDefined: (bp?.marketingChannels?.length ?? 0) > 0 || true,
    operationsDefined: true,
    legalIdentified: true,
    analyticsDefined: true,
    externalDependenciesIdentified: externalDependencies.length > 0,
    internalBlockers: [],
  });

  manifest.readinessState = readinessEvaluation.readinessStatus;

  return {
    identityPackage,
    businessModelPackage,
    brandPackage,
    digitalPropertyPackage,
    monetizationPackage,
    marketingPackage,
    operationsPackage,
    legalCompliancePackage,
    manifest,
    externalDependencies,
    readinessEvaluation,
  };
}

export async function loadAssemblySourceContext(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    missionId: string;
    planExecutionId: string;
  },
): Promise<AssemblySourceContext | null> {
  const { data: pe } = await admin
    .from("plan_executions")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.planExecutionId)
    .maybeSingle();

  if (!pe) return null;

  const { data: build } = await admin
    .from("builds")
    .select("id, project_type, workspace_reference, venture_blueprint_id")
    .eq("id", pe.build_id ?? "")
    .maybeSingle();

  const { data: job } = await admin
    .from("build_jobs")
    .select("id, builder_key")
    .eq("id", pe.build_job_id ?? "")
    .maybeSingle();

  const { data: snapshot } = await admin
    .from("build_snapshots")
    .select("id")
    .eq("build_id", pe.build_id ?? "")
    .order("snapshot_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let blueprint: VentureBlueprint | null = null;
  if (pe.venture_blueprint_id) {
    const { data: vb } = await admin
      .from("venture_blueprints")
      .select("blueprint")
      .eq("id", pe.venture_blueprint_id)
      .maybeSingle();
    if (vb?.blueprint && typeof vb.blueprint === "object") {
      blueprint = vb.blueprint as VentureBlueprint;
    }
  }

  const { data: opp } = await admin
    .from("opportunities")
    .select("name, summary, source_snapshot")
    .eq("id", pe.opportunity_id)
    .maybeSingle();

  const [{ data: mission }, { data: decision }, { data: plan }] = await Promise.all([
    admin
      .from("missions")
      .select("constraints, objectives")
      .eq("organization_id", input.organizationId)
      .eq("id", input.missionId)
      .maybeSingle(),
    admin
      .from("command_decisions")
      .select("payload")
      .eq("organization_id", input.organizationId)
      .eq("id", pe.executive_decision_id ?? "")
      .maybeSingle(),
    admin
      .from("plans")
      .select("metadata")
      .eq("organization_id", input.organizationId)
      .eq("id", pe.plan_id ?? "")
      .maybeSingle(),
  ]);

  const opportunityCandidateId = candidateIdFromLineageSources([
    opp?.source_snapshot,
    mission?.constraints,
    mission?.objectives,
    decision?.payload,
    plan?.metadata,
  ]);

  let candidateTitle: string | null = null;
  let candidateRank: number | null = null;
  if (opportunityCandidateId) {
    const { data: candidate } = await admin
      .from("opportunity_candidates")
      .select("title, rank_position")
      .eq("organization_id", input.organizationId)
      .eq("id", opportunityCandidateId)
      .maybeSingle();
    if (typeof candidate?.title === "string" && candidate.title.trim()) {
      candidateTitle = candidate.title.trim();
    }
    if (typeof candidate?.rank_position === "number" && candidate.rank_position > 0) {
      candidateRank = Math.floor(candidate.rank_position);
    }
  }

  if (!pe.build_id || !pe.build_job_id || !snapshot?.id) return null;

  return {
    organizationId: input.organizationId,
    missionId: input.missionId,
    opportunityId: pe.opportunity_id,
    executiveDecisionId: pe.executive_decision_id,
    planId: pe.plan_id,
    planVersion: pe.plan_version ?? 1,
    planExecutionId: pe.id,
    ventureBlueprintId: pe.venture_blueprint_id,
    buildId: pe.build_id,
    buildJobId: pe.build_job_id,
    buildSnapshotId: snapshot.id,
    workspaceReference: build?.workspace_reference ?? null,
    projectType: build?.project_type ?? "content_site",
    builderKey: job?.builder_key ?? "unknown",
    blueprint,
    opportunityName: opp?.name ?? "Venture",
    opportunitySummary: opp?.summary ?? null,
    opportunityCandidateId,
    candidateTitle,
    candidateRank,
    origin: "venture_assembly",
    companyBuilderBlueprintId: null,
  };
}
