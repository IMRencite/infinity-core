import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import type { CanonicalVentureAdapterInput, VentureIntelligenceView } from "./types";
import { asRecord, asString } from "./json";
import { fromOpportunityCandidate as parseCandidate } from "./adapters/from-opportunity-candidate";
import { fromCanonicalVenture } from "./adapters/from-canonical-venture";
import { emptyPerformanceInput, fromPerformanceIntelligence } from "./adapters/from-performance-intelligence";
import {
  assemblyEconomicsFromPackages,
  extractSelectionForCandidate,
  monetizationPlanFrom,
  researchRunIdsFromLineage,
  researchRunsFromRows,
  resolveCanonicalCandidateId,
  selectMonetizationPlan,
  asUuid,
} from "./lineage";
import { overlayCanonicalEconomicsOnIntelligence } from "@/lib/infinity/hq-inspection-identity/overlay";
import {
  isAskReviewIdentity,
  isOccupancynpvIdentity,
  projectInspectionLifecycle,
  readVentureEconomicsForIdentity,
} from "@/lib/infinity/hq-inspection-identity/resolve";
import { ensureVentureEconomics } from "@/lib/infinity/venture-economics/persist";

export function adapterInputFromSnapshot(
  snapshot: OperatorVentureSnapshot,
  extras: {
    identityPackage?: Record<string, unknown>;
    businessModelPackage?: Record<string, unknown>;
    monetizationPackage?: Record<string, unknown>;
    marketingPackage?: Record<string, unknown>;
    candidate?: Record<string, unknown> | null;
    monetizationPlan?: Record<string, unknown> | null;
    selection?: ReturnType<typeof extractSelectionForCandidate>;
    researchRuns?: ReturnType<typeof researchRunsFromRows>;
    opportunityCandidateId?: string | null;
  },
): CanonicalVentureAdapterInput {
  const performanceBlob = asRecord(snapshot.system.performance);
  const identityPackage = extras.identityPackage ?? {};
  const businessModelPackage = extras.businessModelPackage ?? {};
  const monetizationPackage = extras.monetizationPackage ?? {};
  return {
    ventureId: snapshot.venture.ventureAssemblyId,
    organizationId: snapshot.venture.organizationId,
    name: snapshot.venture.ventureName,
    origin: snapshot.venture.origin ?? null,
    assemblyStatus: snapshot.venture.assemblyStatus,
    readinessStatus: snapshot.venture.readinessStatus,
    launchStage: snapshot.venture.launchStage,
    opportunityId: snapshot.venture.opportunityId,
    opportunityCandidateId: extras.opportunityCandidateId ?? null,
    buildId: snapshot.venture.buildId,
    productionArtifactId: snapshot.venture.productionArtifactId,
    identityPackage,
    businessModelPackage,
    monetizationPackage,
    candidate: extras.candidate ? parseCandidate(extras.candidate) : null,
    monetizationPlan: monetizationPlanFrom(extras.monetizationPlan ?? null),
    selection: extras.selection ?? null,
    researchRuns: extras.researchRuns ?? [],
    assemblyEconomics: assemblyEconomicsFromPackages({
      businessModelPackage,
      monetizationPackage,
      marketingPackage: extras.marketingPackage ?? {},
    }),
    performance: fromPerformanceIntelligence({
      aggregates: Array.isArray(performanceBlob?.aggregates) ? (performanceBlob.aggregates as unknown[]) : [],
      packages: Array.isArray(performanceBlob?.packages) ? (performanceBlob.packages as unknown[]) : [],
      decisions: Array.isArray(performanceBlob?.decisions) ? (performanceBlob.decisions as unknown[]) : [],
    }),
    departmentStates: snapshot.departments.map((item) => ({ id: item.id, state: item.state })),
  };
}

function withCanonicalEconomicsOverlay(
  view: VentureIntelligenceView,
  ventureId: string,
): VentureIntelligenceView {
  const expected = isOccupancynpvIdentity(ventureId) || isAskReviewIdentity(ventureId);
  const economics = readVentureEconomicsForIdentity(ventureId) ?? (expected ? ensureVentureEconomics(ventureId) : null);
  return overlayCanonicalEconomicsOnIntelligence(view, {
    economics,
    lifecycle: projectInspectionLifecycle(ventureId),
    expectedCanonical: expected,
    productionPaused: isAskReviewIdentity(ventureId),
  });
}

export async function loadCanonicalVentureIntelligence(
  admin: AdminSupabaseClient,
  snapshot: OperatorVentureSnapshot,
): Promise<VentureIntelligenceView> {
  const orgId = snapshot.venture.organizationId;
  const ventureId = snapshot.venture.ventureAssemblyId;
  const { data: assembly } = await admin
    .from("venture_assemblies")
    .select(
      "identity_package, business_model_package, monetization_package, marketing_package, manifest, opportunity_id, opportunity_candidate_id, venture_blueprint_id",
    )
    .eq("organization_id", orgId)
    .eq("id", ventureId)
    .maybeSingle();

  const identityPackage = asRecord(assembly?.identity_package) ?? {};
  const businessModelPackage = asRecord(assembly?.business_model_package) ?? {};
  const monetizationPackage = asRecord(assembly?.monetization_package) ?? {};
  const marketingPackage = asRecord(assembly?.marketing_package) ?? {};
  const manifest = asRecord(assembly?.manifest) ?? {};
  const typedCandidateId = asUuid(assembly?.opportunity_candidate_id);
  const blueprintId = asString(assembly?.venture_blueprint_id) ?? snapshot.venture.ventureBlueprintId;
  let blueprintCandidateId: string | null = null;
  if (blueprintId && (!asString(identityPackage.workingName) || !typedCandidateId)) {
    const { data: blueprint } = await admin
      .from("company_builder_blueprints")
      .select("venture_name_working, opportunity_candidate_id, business_summary, venture_type, mvp_definition")
      .eq("organization_id", orgId)
      .eq("id", blueprintId)
      .maybeSingle();
    const bp = asRecord(blueprint);
    if (bp) {
      if (asString(bp.venture_name_working)) identityPackage.workingName = asString(bp.venture_name_working);
      blueprintCandidateId = asUuid(bp.opportunity_candidate_id);
      if (asString(bp.business_summary) && !asString(identityPackage.positioning)) {
        identityPackage.positioning = asString(bp.business_summary);
      }
      const mvp = asRecord(bp.mvp_definition);
      if (mvp) {
        if (!asString(identityPackage.targetAudience)) {
          identityPackage.targetAudience = asString(mvp.idealCustomer) ?? asString(mvp.targetCustomer) ?? asString(mvp.customer);
        }
        if (!asString(identityPackage.primaryProblem)) {
          identityPackage.primaryProblem = asString(mvp.coreProblem) ?? asString(mvp.problem);
        }
        if (!asString(identityPackage.primaryPromise)) {
          identityPackage.primaryPromise = asString(mvp.corePromise) ?? asString(mvp.valueProposition);
        }
      }
    }
  }

  const candidateId = resolveCanonicalCandidateId({
    opportunityCandidateId: typedCandidateId,
    identityPackage,
    manifest,
    blueprintOpportunityCandidateId: blueprintCandidateId,
    lineagePackage: asRecord(identityPackage.canonicalLineage),
  });

  let candidate: Record<string, unknown> | null = null;
  if (candidateId) {
    const { data } = await admin
      .from("opportunity_candidates")
      .select("*")
      .eq("organization_id", orgId)
      .eq("id", candidateId)
      .maybeSingle();
    candidate = asRecord(data);
  }

  if (!candidate) {
    const opportunityId = asString(assembly?.opportunity_id) ?? snapshot.venture.opportunityId;
    if (opportunityId) {
      const { data } = await admin
        .from("opportunities")
        .select("id, name, summary, problem, target_customer, business_model, risks")
        .eq("organization_id", orgId)
        .eq("id", opportunityId)
        .maybeSingle();
      const opportunity = asRecord(data);
      if (opportunity) {
        candidate = {
          id: asString(opportunity.id) ?? opportunityId,
          title: asString(opportunity.name) ?? snapshot.venture.ventureName,
          summary: asString(opportunity.summary) ?? "",
          problem: asString(opportunity.problem) ?? "",
          target_customer: asString(opportunity.target_customer) ?? "",
          business_model_candidates: asString(opportunity.business_model) ? [asString(opportunity.business_model)!] : [],
          risks: opportunity.risks,
        };
      }
    }
  }

  const resolvedCandidateId = asUuid(candidate?.id) && candidateId ? candidateId : null;
  let monetizationPlan: Record<string, unknown> | null = null;
  let selection = null;
  let researchRuns: ReturnType<typeof researchRunsFromRows> = [];

  if (resolvedCandidateId) {
    const [{ data: planRows }, { data: selectionRows }] = await Promise.all([
      admin
        .from("monetization_plans")
        .select("*")
        .eq("organization_id", orgId)
        .eq("opportunity_candidate_id", resolvedCandidateId),
      admin
        .from("venture_selection_runs")
        .select("id, status, selection_report, opportunity_candidate_ids, monetization_run_id, created_at, completed_at")
        .eq("organization_id", orgId)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
    ]);

    const parsedCandidate = parseCandidate(candidate);
    selection = extractSelectionForCandidate(
      (selectionRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
      resolvedCandidateId,
    );
    const selected = selectMonetizationPlan(
      (planRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
      {
        candidateId: resolvedCandidateId,
        linkedPlanId:
          asUuid(asRecord(identityPackage.canonicalLineage)?.monetizationPlanId) ?? selection?.monetizationPlanId,
      },
    );
    monetizationPlan = selected.plan
      ? ((planRows ?? []).find((row) => asUuid((row as { id?: unknown }).id) === selected.plan?.id) as Record<string, unknown> | undefined) ?? null
      : null;

    const researchIds = researchRunIdsFromLineage({
      candidateResearchRunIds: parsedCandidate?.researchRunIds ?? candidate?.research_run_ids,
      monetizationResearchRunIds: monetizationPlan?.research_run_ids,
    });
    if (researchIds.length) {
      const { data: runRows } = await admin
        .from("research_runs")
        .select("id, research_objective, status, structured_result")
        .eq("organization_id", orgId)
        .in("id", researchIds);
      researchRuns = researchRunsFromRows(
        (runRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
      );
    }
  }

  return withCanonicalEconomicsOverlay(
    fromCanonicalVenture(
      adapterInputFromSnapshot(snapshot, {
        identityPackage,
        businessModelPackage,
        monetizationPackage,
        marketingPackage,
        candidate,
        monetizationPlan,
        selection,
        researchRuns,
        opportunityCandidateId: resolvedCandidateId,
      }),
    ),
    snapshot.venture.ventureAssemblyId,
  );
}

export async function loadCanonicalCandidateIntelligence(
  admin: AdminSupabaseClient,
  organizationId: string,
  candidateId: string,
): Promise<VentureIntelligenceView> {
  const { data } = await admin
    .from("opportunity_candidates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", candidateId)
    .maybeSingle();
  const candidate = asRecord(data);
  if (!candidate) {
    throw new Error(`Opportunity candidate ${candidateId} was not found`);
  }
  const [{ data: planRows }, { data: selectionRows }] = await Promise.all([
    admin
      .from("monetization_plans")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_candidate_id", candidateId),
    admin
      .from("venture_selection_runs")
      .select("id, status, selection_report, opportunity_candidate_ids, monetization_run_id, created_at, completed_at")
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
  ]);
  const parsed = parseCandidate(candidate);
  const selection = extractSelectionForCandidate(
    (selectionRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
    candidateId,
  );
  const selected = selectMonetizationPlan(
    (planRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
    { candidateId, linkedPlanId: selection?.monetizationPlanId },
  );
  const researchIds = researchRunIdsFromLineage({
    candidateResearchRunIds: parsed?.researchRunIds ?? candidate.research_run_ids,
    monetizationResearchRunIds: selected.plan?.researchRunIds,
  });
  let researchRuns: ReturnType<typeof researchRunsFromRows> = [];
  if (researchIds.length) {
    const { data: runRows } = await admin
      .from("research_runs")
      .select("id, research_objective, status, structured_result")
      .eq("organization_id", organizationId)
      .in("id", researchIds);
    researchRuns = researchRunsFromRows(
      (runRows ?? []).map((row) => asRecord(row)).filter((row): row is Record<string, unknown> => Boolean(row)),
    );
  }
  return withCanonicalEconomicsOverlay(fromCanonicalVenture({
    ventureId: `candidate:${candidateId}`,
    organizationId,
    name: parsed?.title ?? "Opportunity candidate",
    origin: "autonomous_discovery",
    assemblyStatus: "candidate_only",
    readinessStatus: null,
    launchStage: projectInspectionLifecycle(`candidate:${candidateId}`),
    opportunityId: null,
    opportunityCandidateId: candidateId,
    buildId: null,
    productionArtifactId: null,
    identityPackage: { workingName: parsed?.title, opportunityCandidateId: candidateId },
    businessModelPackage: {},
    monetizationPackage: {},
    candidate: parsed,
    monetizationPlan: selected.plan,
    selection,
    researchRuns,
    assemblyEconomics: null,
    performance: emptyPerformanceInput(),
    departmentStates: [],
  }), `candidate:${candidateId}`);
}

export function emptyPerformance(): ReturnType<typeof emptyPerformanceInput> {
  return emptyPerformanceInput();
}
