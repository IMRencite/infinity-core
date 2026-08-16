/**
 * Organic Growth persistence — canonical aggregate model.
 * Full OrganicGrowthBuildPackage is stored in organic_growth_build_packages.build_package (JSONB).
 * Human contribution requests are normalized for provenance tracking.
 */
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  HumanContributionRequest,
  OrganicGrowthBuildPackage,
  OrganicGrowthEngineReport,
  OrganicGrowthRunRecord,
  SourceLineage,
} from "./types";

export async function findOrganicGrowthRunByIdempotencyKey(
  admin: AdminSupabaseClient,
  organizationId: string,
  idempotencyKey: string,
): Promise<OrganicGrowthRunRecord | null> {
  const { data, error } = await admin
    .from("organic_growth_runs")
    .select("id, organization_id, status, engine_version, engine_report, idempotency_key, correlation_id")
    .eq("organization_id", organizationId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data as OrganicGrowthRunRecord | null;
}

export async function insertOrganicGrowthRun(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    idempotencyKey: string;
    correlationId: string;
    simulationOnly: boolean;
    capabilityTest: boolean;
  },
): Promise<{ id: string }> {
  const { data, error } = await admin
    .from("organic_growth_runs")
    .insert({
      organization_id: input.organizationId,
      status: "running",
      simulation_only: input.simulationOnly,
      capability_test: input.capabilityTest,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function updateOrganicGrowthRun(
  admin: AdminSupabaseClient,
  runId: string,
  input: {
    status: string;
    engineReport: OrganicGrowthEngineReport;
    buildPackagesCreated: number;
  },
): Promise<void> {
  const { error } = await admin
    .from("organic_growth_runs")
    .update({
      status: input.status,
      engine_report: input.engineReport as never,
      build_packages_created: input.buildPackagesCreated,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

export async function markOrganicGrowthRunFailed(
  admin: AdminSupabaseClient,
  runId: string,
  input: { failureClassification: string; errorMessage: string },
): Promise<void> {
  const { error } = await admin
    .from("organic_growth_runs")
    .update({
      status: "failed",
      failure_classification: input.failureClassification,
      error_message: input.errorMessage,
      failed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw error;
}

export async function persistOrganicGrowthBuildPackage(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    organicGrowthRunId: string;
    buildPackage: OrganicGrowthBuildPackage;
    sourceLineage?: SourceLineage;
  },
): Promise<string> {
  const lineage = input.sourceLineage ?? input.buildPackage.sourceLineage;
  const { data, error } = await admin
    .from("organic_growth_build_packages")
    .insert({
      organization_id: input.organizationId,
      organic_growth_run_id: input.organicGrowthRunId,
      venture_id: input.buildPackage.ventureId,
      package_version: input.buildPackage.packageVersion,
      status: input.buildPackage.status,
      build_package: input.buildPackage as never,
      source_lineage: lineage as never,
      blocked_reasons: input.buildPackage.blockedReasons,
      approved_page_count: input.buildPackage.approvedPageOpportunities.length,
      company_builder_blueprint_id: lineage.ventureBlueprintId ?? null,
      company_builder_build_package_id: lineage.companyBuilderBuildPackageId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function persistHumanContributionRequests(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    organicGrowthRunId: string;
    organicGrowthBuildPackageId: string;
    requests: HumanContributionRequest[];
  },
): Promise<number> {
  if (input.requests.length === 0) return 0;

  const rows = input.requests.map((req) => ({
    organization_id: input.organizationId,
    organic_growth_run_id: input.organicGrowthRunId,
    organic_growth_build_package_id: input.organicGrowthBuildPackageId,
    request_id: req.requestId,
    venture_id: req.ventureId,
    page_opportunity_id: req.pageId,
    contribution_type: req.contributionType,
    purpose: req.reason,
    contribution_class: req.contributionType,
    status: req.status,
    publication_blocking: req.publicationBlocking,
    contributor_reference: req.contributorReference ?? null,
    provenance_reference: req.provenanceReference ?? null,
    supported_claims: req.supportedClaims ?? [],
    verification_status: req.verificationStatus ?? null,
    request_payload: {
      questions: req.questions,
      requestedEvidence: req.requestedEvidence,
      priority: req.priority,
    },
  }));

  const { error } = await admin.from("organic_human_contribution_requests").insert(rows);
  if (error) throw error;
  return rows.length;
}

export function buildOrganicGrowthEngineReport(
  partial: Partial<OrganicGrowthEngineReport>,
): OrganicGrowthEngineReport {
  return {
    engineVersion: "organic_growth_engine_v1",
    venturesProcessed: partial.venturesProcessed ?? 0,
    organicViability: partial.organicViability ?? {},
    opportunityGraphStats: partial.opportunityGraphStats ?? {},
    digitalRealEstate: partial.digitalRealEstate ?? {},
    contentDepth: partial.contentDepth ?? {},
    topicCoverageMapsGenerated: partial.topicCoverageMapsGenerated ?? 0,
    informationGainPlansGenerated: partial.informationGainPlansGenerated ?? 0,
    evidencePlansGenerated: partial.evidencePlansGenerated ?? 0,
    claimGraphsGenerated: partial.claimGraphsGenerated ?? 0,
    citationWorthinessScores: partial.citationWorthinessScores ?? 0,
    eeatReadinessAssessments: partial.eeatReadinessAssessments ?? 0,
    hitlClassification: partial.hitlClassification ?? {
      NOT_NEEDED: 0,
      OPTIONAL_ENRICHMENT: 0,
      RECOMMENDED: 0,
      REQUIRED_FOR_PUBLICATION: 0,
    },
    cityNeighborhood: partial.cityNeighborhood ?? {
      citiesEvaluated: 0,
      neighborhoodsEvaluated: 0,
      create: 0,
      mergeIntoCityPage: 0,
      supportingSection: 0,
      defer: 0,
      reject: 0,
    },
    urlArchitecture: partial.urlArchitecture ?? {
      urlsAssigned: 0,
      collisionsPrevented: 0,
      invalidLinkTargets: 0,
    },
    internalLinks: partial.internalLinks ?? { edges: 0, orphans: 0, invalidTargets: 0 },
    schema: partial.schema ?? { recommendations: 0, localBusinessFabricated: 0 },
    buildPackagesCreated: partial.buildPackagesCreated ?? 0,
    autonomyBoundary: {
      pagesPublished: 0,
      publicDeployments: 0,
      realWebsitesModified: 0,
      purchases: 0,
      externalMutations: 0,
    },
  };
}
