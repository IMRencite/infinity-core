import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ESTIMATE_CLASSES } from "@/lib/infinity/founder-idea-lab/educated-estimates/types";
import { fromCanonicalVenture, fromOpportunityCandidate } from "@/lib/infinity/venture-intelligence";
import { emptyPerformanceInput, fromPerformanceIntelligence } from "@/lib/infinity/venture-intelligence/adapters/from-performance-intelligence";
import {
  activateAutonomousEducatedEstimates,
  assessAutonomousQualityReplacement,
  buildAutonomousProductAdvantage,
  buildAutonomousVentureBuildPlan,
  planAutonomousResearchCoverage,
  presentAutonomousVentureBrief,
  QUALITY_REPLACEMENT_POLICY,
  researchAutonomousBenchmarkEconomics,
  researchAutonomousRevenueModel,
} from "@/lib/infinity/venture-intelligence/engines";
import {
  extractSelectionForCandidate,
  MONETIZATION_PLAN_SELECTION_RULE,
  resolveCanonicalCandidateId,
  selectMonetizationPlan,
} from "@/lib/infinity/venture-intelligence/lineage";
import { loadCanonicalVentureIntelligence } from "@/lib/infinity/venture-intelligence/load";
import { mapLifecycleStep, nextMoveFrom } from "@/lib/infinity/venture-intelligence/lifecycle";
import { assessCanonicalSystemReadiness } from "@/lib/infinity/venture-intelligence/system-readiness";
import type { CanonicalCandidateInput, CanonicalVentureAdapterInput } from "@/lib/infinity/venture-intelligence/types";
import { persistCanonicalVentureAssemblyIdentity, buildCanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import { handoffFromCanonicalVenture } from "@/lib/infinity/zero-to-production/handoff";

const CANDIDATE_ID = "7e7e924e-0741-4155-a729-8d529da77ea9";
const RESEARCH_ID = "aaaaaaaa-1111-4111-8111-000000000001";
const PLAN_ID = "bbbbbbbb-2222-4222-8222-000000000002";
const SELECTION_ID = "cccccccc-3333-4333-8333-000000000003";
const ASSEMBLY_ID = "dddddddd-4444-4444-8444-000000000004";
const LEGACY_OPP_ID = "eeeeeeee-5555-4555-8555-000000000005";
const OTHER_CANDIDATE_ID = "ffffffff-6666-4666-8666-000000000006";

function creCandidate(overrides: Partial<CanonicalCandidateInput> = {}): CanonicalCandidateInput {
  return {
    id: CANDIDATE_ID,
    title: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
    summary: "A calculator that compares commercial leases and NPV for brokers.",
    problem: "Brokers rebuild lease comparison math in spreadsheets for every deal.",
    targetCustomer: "Independent CRE brokers and tenant reps",
    market: "Commercial real estate software",
    businessModelCandidates: ["subscription"],
    revenueMechanismCandidates: ["monthly_saas"],
    demandEvidence: ["Brokers complain they struggle with spreadsheet surgery on every lease comparison."],
    marketEvidence: ["CRE software spend is concentrated in brokerage workflow tools."],
    monetizationEvidence: ["Comparable lease-analysis tools charge a monthly software fee."],
    distributionEvidence: ["Brokers discover workflow tools through industry associations."],
    buildabilityEvidence: ["NPV and rent-comparison math can be implemented as software."],
    competitionEvidence: ["Incumbent Excel templates are a weakness: they are error-prone and hard to share with clients."],
    researchSources: ["https://example.com/cre-lease-tools"],
    researchRunIds: [RESEARCH_ID],
    risks: ["Willingness to pay is still modeled."],
    unknowns: ["Observed CAC"],
    ...overrides,
  };
}

function assemblyInput(overrides: Partial<CanonicalVentureAdapterInput> = {}): CanonicalVentureAdapterInput {
  return {
    ventureId: ASSEMBLY_ID,
    organizationId: "org-lineage",
    name: "CRE Lease Comparison",
    origin: "autonomous_discovery",
    assemblyStatus: "assembled",
    readinessStatus: "needs_review",
    launchStage: null,
    opportunityId: LEGACY_OPP_ID,
    opportunityCandidateId: CANDIDATE_ID,
    buildId: null,
    productionArtifactId: null,
    identityPackage: {
      workingName: "CRE Lease Comparison",
      opportunityCandidateId: CANDIDATE_ID,
      canonicalLineage: {
        opportunityCandidateId: CANDIDATE_ID,
        ventureSelectionRunId: SELECTION_ID,
        monetizationPlanId: PLAN_ID,
        researchRunIds: [RESEARCH_ID],
        selectionDecision: "VALIDATE",
      },
    },
    businessModelPackage: {
      pricingHypothesis: { value: "Monthly software subscription" },
      acquisitionChannels: { value: ["industry associations"] },
      costAssumptions: { value: "Software delivery, not field staff" },
      majorRisks: { value: ["Modeled CAC is unproven"] },
      keyMetrics: { value: ["LTV/CAC", "payback"] },
    },
    monetizationPackage: { revenueMechanism: "subscription" },
    candidate: creCandidate(),
    monetizationPlan: {
      id: PLAN_ID,
      estimatedPriceBase: 149,
      estimatedRevenuePerCustomer: 1790,
      estimatedCAC: 350,
      estimatedLTV: 4470,
      estimatedGrossMarginPercent: 80,
      contributionMarginPerCustomer: 1440,
      ltvCacRatio: 12.77,
      estimatedMonthsToBreakEven: 9,
      customerType: "Independent CRE brokers",
      valueProposition: "Compare leases and NPV without spreadsheet rebuilds",
      offerDescription: "CRE lease comparison and NPV calculator",
      pricingModel: "Monthly software subscription",
      modelName: "SaaS subscription",
      risks: ["CAC is modeled"],
    },
    selection: {
      runId: SELECTION_ID,
      decision: "VALIDATE",
      selectionScore: 75.15,
      opportunityScore: 84.03,
      rank: 1,
      reason: "Strong modeled economics with remaining validation risk",
      risk: "Acquisition cost is modeled",
      counterfactual: "A weaker candidate would delay validation",
      monetizationPlanId: PLAN_ID,
      monetizationRunId: null,
      createdAt: "2026-08-01T00:00:00.000Z",
    },
    researchRuns: [{ id: RESEARCH_ID, objective: "CRE lease workflow", status: "completed", summary: "Brokers still use spreadsheets." }],
    assemblyEconomics: {
      pricingHypothesis: "Monthly software subscription",
      acquisitionChannels: ["industry associations"],
      costAssumptions: "Software delivery, not field staff",
      majorRisks: ["Modeled CAC is unproven"],
      keyMetrics: ["LTV/CAC", "payback"],
    },
    performance: emptyPerformanceInput(),
    departmentStates: [],
    ...overrides,
  };
}

function mockAdmin(tables: Record<string, Record<string, unknown>[]>) {
  const queried: string[] = [];
  const client = {
    queried,
    from(table: string) {
      queried.push(table);
      const rows = tables[table] ?? [];
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const api = {
        select() {
          return api;
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return api;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return api;
        },
        order() {
          return api;
        },
        limit() {
          return api;
        },
        maybeSingle: async () => ({ data: rows.filter((row) => filters.every((fn) => fn(row)))[0] ?? null }),
        then: undefined as undefined,
      };
      return Object.assign(api, {
        then(resolve: (value: { data: Record<string, unknown>[] }) => unknown) {
          return Promise.resolve({ data: rows.filter((row) => filters.every((fn) => fn(row))) }).then(resolve);
        },
      });
    },
  };
  return client;
}

describe("AUTONOMOUS VENTURE LINEAGE + INTELLIGENCE PARITY FOUNDATION V1", () => {
  it("resolves assembly → candidate without treating legacy opportunity_id as a candidate", () => {
    expect(
      resolveCanonicalCandidateId({
        opportunityCandidateId: CANDIDATE_ID,
        identityPackage: {},
        manifest: {},
      }),
    ).toBe(CANDIDATE_ID);
    expect(
      resolveCanonicalCandidateId({
        identityPackage: { opportunityCandidateId: CANDIDATE_ID },
        manifest: {},
      }),
    ).toBe(CANDIDATE_ID);
    expect(
      resolveCanonicalCandidateId({
        identityPackage: {},
        manifest: { opportunityCandidateId: CANDIDATE_ID },
      }),
    ).toBe(CANDIDATE_ID);
    expect(
      resolveCanonicalCandidateId({
        identityPackage: {},
        manifest: {},
        blueprintOpportunityCandidateId: CANDIDATE_ID,
      }),
    ).toBe(CANDIDATE_ID);
    expect(
      resolveCanonicalCandidateId({
        identityPackage: { opportunityId: LEGACY_OPP_ID },
        manifest: { opportunityId: LEGACY_OPP_ID },
      }),
    ).toBeNull();
  });

  it("selects monetization plans deterministically and never takes an unrelated first row", () => {
    const selected = selectMonetizationPlan(
      [
        {
          id: "old",
          opportunity_candidate_id: CANDIDATE_ID,
          model_name: "Old",
          plan_role: "secondary",
          monetization_confidence: 0.2,
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: PLAN_ID,
          opportunity_candidate_id: CANDIDATE_ID,
          model_name: "Canonical",
          plan_role: "accepted",
          monetization_confidence: 0.9,
          created_at: "2026-02-01T00:00:00.000Z",
        },
        {
          id: "other",
          opportunity_candidate_id: OTHER_CANDIDATE_ID,
          model_name: "Wrong candidate",
          plan_role: "canonical",
          monetization_confidence: 1,
          created_at: "2026-03-01T00:00:00.000Z",
        },
      ],
      { candidateId: CANDIDATE_ID },
    );
    expect(selected.plan?.id).toBe(PLAN_ID);
    expect(selected.rule).toBe(MONETIZATION_PLAN_SELECTION_RULE);
    const linked = selectMonetizationPlan(
      [
        { id: "later", opportunity_candidate_id: CANDIDATE_ID, model_name: "Later", plan_role: "canonical", created_at: "2026-09-01T00:00:00.000Z" },
        { id: PLAN_ID, opportunity_candidate_id: CANDIDATE_ID, model_name: "Linked", plan_role: "secondary", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      { candidateId: CANDIDATE_ID, linkedPlanId: PLAN_ID },
    );
    expect(linked.plan?.id).toBe(PLAN_ID);
  });

  it("reads candidate evidence arrays and assembly economics through the canonical adapters", () => {
    const candidate = fromOpportunityCandidate({
      id: CANDIDATE_ID,
      title: "CRE Lease Comparison",
      summary: "Compare leases",
      problem: "Spreadsheet rebuilds",
      target_customer: "CRE brokers",
      demand_evidence: [{ claim: "Brokers rebuild worksheets" }],
      market_evidence: [{ claim: "CRE software category exists" }],
      monetization_evidence: [{ claim: "Monthly software fees exist" }],
      distribution_evidence: [{ claim: "Association distribution" }],
      buildability_evidence: [{ claim: "NPV math is software" }],
      competition_evidence: [{ claim: "Excel templates are weak" }],
      research_sources: [{ url: "https://example.com/cre" }],
      research_run_ids: [RESEARCH_ID],
    });
    expect(candidate?.marketEvidence[0]).toMatch(/CRE software/i);
    expect(candidate?.monetizationEvidence[0]).toMatch(/Monthly/i);
    expect(candidate?.distributionEvidence[0]).toMatch(/Association/i);
    expect(candidate?.buildabilityEvidence[0]).toMatch(/NPV/i);
    expect(candidate?.researchSources[0]).toContain("example.com");
    const view = fromCanonicalVenture(assemblyInput({ candidate }));
    expect(view.sourceContext.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(view.evidence.summary.join(" ")).toMatch(/Monthly software fees|Association|NPV|VALIDATE/i);
    expect(view.businessModel.summary).toMatch(/subscription|software/i);
  });

  it("traverses candidate → research → monetization → selection → assembly in the loader", async () => {
    const admin = mockAdmin({
      venture_assemblies: [
        {
          id: ASSEMBLY_ID,
          organization_id: "org-lineage",
          identity_package: { opportunityCandidateId: CANDIDATE_ID, workingName: "CRE Lease Comparison" },
          business_model_package: { pricingHypothesis: { value: "Monthly software subscription" } },
          monetization_package: { revenueMechanism: "subscription" },
          marketing_package: {},
          manifest: { opportunityCandidateId: CANDIDATE_ID },
          opportunity_id: LEGACY_OPP_ID,
          opportunity_candidate_id: CANDIDATE_ID,
          venture_blueprint_id: null,
        },
      ],
      opportunity_candidates: [
        {
          id: CANDIDATE_ID,
          organization_id: "org-lineage",
          title: "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator",
          summary: "Lease NPV calculator",
          problem: "Spreadsheet rebuilds",
          target_customer: "Independent CRE brokers",
          demand_evidence: [{ claim: "Brokers rebuild worksheets" }],
          competition_evidence: [{ claim: "Excel templates are weak" }],
          research_run_ids: [RESEARCH_ID],
        },
        {
          id: OTHER_CANDIDATE_ID,
          organization_id: "org-lineage",
          title: "Unrelated first org candidate",
          summary: "Should not be chosen",
          problem: "Other",
          target_customer: "Other",
        },
      ],
      monetization_plans: [
        {
          id: "wrong",
          organization_id: "org-lineage",
          opportunity_candidate_id: OTHER_CANDIDATE_ID,
          model_name: "Wrong",
          monetization_confidence: 1,
          created_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: PLAN_ID,
          organization_id: "org-lineage",
          opportunity_candidate_id: CANDIDATE_ID,
          model_name: "CRE SaaS",
          estimated_revenue_per_customer: 1790,
          estimated_cac: 350,
          estimated_ltv: 4470,
          ltv_cac_ratio: 12.77,
          created_at: "2026-08-01T00:00:00.000Z",
        },
      ],
      venture_selection_runs: [
        {
          id: SELECTION_ID,
          organization_id: "org-lineage",
          status: "completed",
          opportunity_candidate_ids: [CANDIDATE_ID],
          created_at: "2026-08-02T00:00:00.000Z",
          selection_report: {
            queue: [{ candidateId: CANDIDATE_ID, decision: "VALIDATE", selectionScore: 75.15, opportunityScore: 84.03, rank: 1 }],
          },
        },
      ],
      research_runs: [
        { id: RESEARCH_ID, organization_id: "org-lineage", research_objective: "CRE lease workflow", status: "completed", structured_result: { summary: "Spreadsheets remain the default." } },
      ],
      opportunities: [{ id: LEGACY_OPP_ID, organization_id: "org-lineage", name: "Legacy empty opportunity", summary: "" }],
    });
    const view = await loadCanonicalVentureIntelligence(admin as never, {
      venture: {
        ventureAssemblyId: ASSEMBLY_ID,
        organizationId: "org-lineage",
        ventureName: "Legacy empty opportunity",
        origin: "autonomous_discovery",
        assemblyStatus: "assembled",
        readinessStatus: "needs_review",
        launchStage: null,
        opportunityId: LEGACY_OPP_ID,
        buildId: null,
        productionArtifactId: null,
        ventureBlueprintId: null,
      },
      departments: [],
      system: { performance: {} },
    } as never);
    expect(view.sourceContext.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(view.identity.name).toMatch(/CRE|Lease/i);
    expect(view.customer.targetCustomer).toMatch(/broker/i);
    expect(view.economics.cac.display).toMatch(/350/);
    expect(view.evidence.summary.join(" ")).toMatch(/VALIDATE|Spreadsheet/i);
    expect(admin.queried.includes("opportunity_candidates")).toBe(true);
    expect(admin.queried.filter((table) => table === "opportunity_candidates").length).toBe(1);
  });

  it("falls back to legacy opportunities when no candidate id is proven", async () => {
    const admin = mockAdmin({
      venture_assemblies: [
        {
          id: ASSEMBLY_ID,
          organization_id: "org-lineage",
          identity_package: {},
          business_model_package: {},
          monetization_package: {},
          marketing_package: {},
          manifest: {},
          opportunity_id: LEGACY_OPP_ID,
          opportunity_candidate_id: null,
          venture_blueprint_id: null,
        },
      ],
      opportunities: [
        {
          id: LEGACY_OPP_ID,
          organization_id: "org-lineage",
          name: "executive_selection_e2e_v1 strong_in_policy",
          summary: "Historical e2e shell",
          problem: "",
          target_customer: "",
        },
      ],
      opportunity_candidates: [{ id: CANDIDATE_ID, organization_id: "org-lineage", title: "Should not match" }],
    });
    const view = await loadCanonicalVentureIntelligence(admin as never, {
      venture: {
        ventureAssemblyId: ASSEMBLY_ID,
        organizationId: "org-lineage",
        ventureName: "e2e shell",
        origin: "executive_selection_e2e_v1",
        assemblyStatus: "internally_ready",
        readinessStatus: "internally_ready",
        launchStage: "internally_ready",
        opportunityId: LEGACY_OPP_ID,
        buildId: "build-1",
        productionArtifactId: "art-1",
        ventureBlueprintId: null,
      },
      departments: [],
      system: { performance: { aggregates: [{ metric: "execution_success_rate", value: 1 }] } },
    } as never);
    expect(view.sourceContext.opportunityCandidateId).toBeNull();
    expect(view.identity.name).toMatch(/e2e|executive_selection/i);
    expect(view.currentPosition.step).not.toBe("LEARN");
    expect(view.currentPosition.step).not.toBe("SCALE");
  });

  it("preserves candidate, selection, monetization, and research lineage on assembly identity", () => {
    const identity = persistCanonicalVentureAssemblyIdentity(
      buildCanonicalVentureAssemblyIdentity({
        opportunityCandidateId: CANDIDATE_ID,
        opportunityId: LEGACY_OPP_ID,
        candidateTitle: "CRE Lease Comparison",
        workingName: "placeholder",
        origin: "venture_assembly",
        rank: 1,
      }),
    );
    expect(identity.identityPackage.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(identity.manifestLineage.opportunityCandidateId).toBe(CANDIDATE_ID);
    const creation = readFileSync(join(process.cwd(), "lib/infinity/venture-assembly/orchestrator.ts"), "utf8");
    const persist = readFileSync(join(process.cwd(), "lib/infinity/venture-assembly/persistence.ts"), "utf8");
    expect(creation).toContain("opportunityCandidateId");
    expect(creation).toContain("opportunity_candidate_id");
    expect(persist).toContain("opportunity_candidate_id");
    expect(readFileSync(join(process.cwd(), "lib/infinity/company-builder/persistence.ts"), "utf8")).toContain(
      "opportunity_candidate_id: input.candidateId",
    );
  });

  it("reuses existing intelligence engines without a FounderIdea id", () => {
    const candidate = creCandidate();
    const coverage = planAutonomousResearchCoverage(candidate);
    expect(coverage.dimensions.map((item) => item.dimension)).toEqual(
      expect.arrayContaining(["demand", "market", "competition", "pricing", "monetization", "distribution", "buildability"]),
    );
    const revenue = researchAutonomousRevenueModel(candidate);
    expect(revenue).toBeTruthy();
    const benchmarks = researchAutonomousBenchmarkEconomics(candidate);
    expect(benchmarks).toBeTruthy();
    const quality = assessAutonomousQualityReplacement(candidate);
    expect(QUALITY_REPLACEMENT_POLICY).toEqual({ maxPhases: 1, maxQueries: 5, hardCap: 8 });
    expect(quality.dimensions.length).toBeGreaterThan(0);
    const educated = activateAutonomousEducatedEstimates(candidate);
    expect(ESTIMATE_CLASSES).toEqual(
      expect.arrayContaining(["OBSERVED", "DIRECT_COMPARABLE", "CATEGORY_BENCHMARK", "ADJACENT_BENCHMARK", "COMPONENT_MODEL", "SCENARIO_MODEL", "FOUNDER_HYPOTHESIS", "UNKNOWN"]),
    );
    expect(educated).toBeTruthy();
    const advantage = buildAutonomousProductAdvantage(candidate);
    expect(advantage.insufficient).toBe(false);
    expect(advantage.view?.summary.biggestPains.join(" ")).toMatch(/lease|spreadsheet|broker/i);
    const brief = presentAutonomousVentureBrief(candidate);
    expect(brief.summary.length).toBeGreaterThan(8);
    const plan = buildAutonomousVentureBuildPlan({ candidate, recommendedModel: "Monthly software subscription", buildReady: false });
    expect(plan.grantsBuild).toBe(false);
    expect(plan.mvp.coreProblem.length).toBeGreaterThan(4);
    const noEvidence = buildAutonomousProductAdvantage(
      creCandidate({ problem: "", demandEvidence: [], competitionEvidence: [], summary: "A title is not evidence" }),
    );
    expect(noEvidence.insufficient).toBe(true);
    expect(noEvidence.view).toBeNull();
  });

  it("does not create a second research, economics, advantage, or build-plan engine", () => {
    const engines = readFileSync(join(process.cwd(), "lib/infinity/venture-intelligence/engines.ts"), "utf8");
    expect(engines).toContain('from "@/lib/infinity/research/coverage/plan"');
    expect(engines).toContain('from "@/lib/infinity/founder-idea-lab/revenue-model-research"');
    expect(engines).toContain('from "@/lib/infinity/founder-idea-lab/benchmark-economics"');
    expect(engines).toContain('from "@/lib/infinity/founder-idea-lab/product-advantage"');
    expect(engines).toContain('from "@/lib/infinity/founder-idea-lab/build-plan"');
    expect(engines).not.toContain("autonomous-revenue-research-v2");
  });

  it("separates platform capability from venture readiness and evidence blocks", () => {
    const ready = assessCanonicalSystemReadiness({
      hasCandidate: true,
      hasResearch: true,
      hasMonetization: true,
      hasAdvantage: true,
      built: true,
      live: false,
      hasCustomerLearning: false,
    });
    expect(ready.platformAvailable + ready.platformPartial).toBe(8);
    expect(ready.platformSummary).not.toMatch(/0 of 8/);
    const blocked = assessCanonicalSystemReadiness({
      hasCandidate: false,
      hasResearch: false,
      hasMonetization: false,
      hasAdvantage: false,
      built: true,
      live: true,
      hasCustomerLearning: false,
    });
    expect(blocked.platformAvailable + blocked.platformPartial).toBe(8);
    expect(blocked.rows.some((row) => row.venture === "VENTURE_EVIDENCE_BLOCKED")).toBe(true);
    const internallyReady = fromCanonicalVenture(
      assemblyInput({
        assemblyStatus: "internally_ready",
        readinessStatus: "internally_ready",
        launchStage: "internally_ready",
        buildId: "build-1",
        productionArtifactId: "art-1",
      }),
    );
    expect(internallyReady.capabilityCoverage.coverageSummary).not.toMatch(/0 of 8/);
    expect((internallyReady.capabilityCoverage.platformAvailable ?? 0) + (internallyReady.capabilityCoverage.platformPartial ?? 0)).toBe(8);
    const live = fromCanonicalVenture(
      assemblyInput({
        assemblyStatus: "internally_ready",
        readinessStatus: "internally_ready",
        launchStage: "externally_live",
        buildId: "build-1",
        productionArtifactId: "art-1",
        performance: fromPerformanceIntelligence({ aggregates: [{ metric: "execution_success_rate", value: 1 }] }),
      }),
    );
    expect(live.capabilityCoverage.coverageSummary).not.toMatch(/0 of 8/);
    expect(live.currentPosition.step).toBe("ACQUIRE");
  });

  it("does not treat technical execution as LEARN or SCALE", () => {
    expect(
      mapLifecycleStep({
        live: false,
        building: false,
        built: true,
        hasPerformance: true,
        hasCustomerLearning: false,
        hasEconomics: true,
        hasResearch: true,
        underperforming: false,
        performingWell: false,
      }),
    ).toBe("LAUNCH");
    expect(
      mapLifecycleStep({
        live: true,
        building: false,
        built: true,
        hasPerformance: true,
        hasCustomerLearning: false,
        hasEconomics: true,
        hasResearch: true,
        underperforming: false,
        performingWell: false,
      }),
    ).toBe("ACQUIRE");
    expect(
      mapLifecycleStep({
        live: true,
        building: false,
        built: true,
        hasPerformance: true,
        hasCustomerLearning: true,
        hasEconomics: true,
        hasResearch: true,
        underperforming: false,
        performingWell: false,
      }),
    ).toBe("LEARN");
    const validating = fromCanonicalVenture(assemblyInput());
    expect(validating.currentPosition.step).toBe("VALIDATE");
    const buildReady = fromCanonicalVenture(
      assemblyInput({
        selection: {
          runId: SELECTION_ID,
          decision: "BUILD",
          selectionScore: 90,
          opportunityScore: 90,
          rank: 1,
          reason: "Gates passed",
          risk: null,
          counterfactual: null,
          monetizationPlanId: PLAN_ID,
          monetizationRunId: null,
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      }),
    );
    expect(buildReady.currentPosition.step).toBe("DESIGN");
  });

  it("derives next move from actual gaps", () => {
    const sparse = fromCanonicalVenture(
      assemblyInput({
        candidate: creCandidate({
          targetCustomer: "",
          summary: "",
          problem: "",
          demandEvidence: [],
          competitionEvidence: [],
          monetizationEvidence: [],
        }),
        monetizationPlan: null,
        assemblyEconomics: null,
        identityPackage: { workingName: "Sparse shell" },
        businessModelPackage: {},
        monetizationPackage: {},
      }),
    );
    expect(sparse.nextMove.recommendation.toLowerCase()).toMatch(/buyer|offer|customer/);
    const noPrice = fromCanonicalVenture(
      assemblyInput({
        monetizationPlan: null,
        assemblyEconomics: { pricingHypothesis: null, acquisitionChannels: [], costAssumptions: null, majorRisks: [], keyMetrics: [] },
      }),
    );
    expect(noPrice.nextMove.recommendation.toLowerCase()).toMatch(/pric|offer|validate/);
    const validating = fromCanonicalVenture(assemblyInput());
    expect(validating.nextMove.recommendation.toLowerCase()).toMatch(/validate|pay|wtp|experiment/);
    const buildReady = fromCanonicalVenture(
      assemblyInput({
        selection: {
          runId: SELECTION_ID,
          decision: "BUILD",
          selectionScore: 90,
          opportunityScore: 90,
          rank: 1,
          reason: "Gates passed",
          risk: null,
          counterfactual: null,
          monetizationPlanId: PLAN_ID,
          monetizationRunId: null,
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      }),
    );
    expect(buildReady.nextMove.recommendation.toLowerCase()).toMatch(/mvp|build|architect/);
    const live = nextMoveFrom({
      step: "ACQUIRE",
      customer: "CRE brokers",
      price: "$149",
      hasCustomer: true,
      hasOffer: true,
      hasPricing: true,
      hasEconomics: true,
      hasObservedCac: false,
      underperforming: false,
      conversionWeak: false,
      retentionWeak: false,
      firstValidation: "",
    });
    expect(live.recommendation.toLowerCase()).toMatch(/acquir/);
    const measure = nextMoveFrom({
      step: "LEARN",
      customer: "CRE brokers",
      price: "$149",
      hasCustomer: true,
      hasOffer: true,
      hasPricing: true,
      hasEconomics: true,
      hasObservedCac: false,
      underperforming: false,
      conversionWeak: false,
      retentionWeak: false,
      firstValidation: "",
    });
    expect(measure.recommendation.toLowerCase()).toMatch(/measure cac|cac/);
  });

  it("hands candidate identity and product requirements to Zero-to-Production", () => {
    const view = fromCanonicalVenture(assemblyInput());
    const handoff = handoffFromCanonicalVenture({
      organizationId: view.identity.ventureId,
      candidateId: view.sourceContext.opportunityCandidateId!,
      name: view.identity.name,
      customer: view.customer.targetCustomer,
      problem: view.problem.coreProblem,
      solution: view.solution.solution,
      monetization: view.businessModel.summary,
      researchRunIds: [RESEARCH_ID],
      ventureSelectionRunId: SELECTION_ID,
      decision: "VALIDATE",
    });
    expect(handoff.opportunityCandidateId).toBe(CANDIDATE_ID);
    expect(handoff.problem.length).toBeGreaterThan(8);
    expect(handoff.primaryMonetizationModel.length).toBeGreaterThan(3);
    expect(handoff.mvpRequirements.length).toBeGreaterThan(0);
    expect(handoff.requiredCapabilities.length).toBeGreaterThan(0);
    expect(view.buildPlan.mvp.mustHaveFeatures.length).toBeGreaterThan(0);
    expect(view.systemRequirements.length).toBeGreaterThan(0);
  });

  it("keeps the migration forward-only and unrelated scanner migration untouched", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260828010000_venture_assembly_opportunity_candidate_lineage_v1.sql"),
      "utf8",
    );
    expect(migration).toContain("opportunity_candidate_id");
    expect(migration).toContain("REFERENCES public.opportunity_candidates");
    expect(migration).toContain("opportunity_id");
    expect(migration).not.toContain("opportunity_scanner_evidence_org_idx");
    expect(existsSync(join(process.cwd(), "supabase/migrations/20260816150000_opportunity_scanner_evidence_org_idx.sql"))).toBe(true);
  });
});

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

function loadEnvLocal(): boolean {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep);
    if (process.env[key] == null) process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
  }
  return true;
}

describe("AUTONOMOUS LINEAGE — strong candidate read-only", () => {
  it(
    "recovers persisted CRE candidate intelligence without writes",
    async () => {
      if (!loadEnvLocal() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { loadCanonicalCandidateIntelligence } = await import("@/lib/infinity/venture-intelligence/load");
      const view = await loadCanonicalCandidateIntelligence(createAdminClient(), LIVE_ORG, CANDIDATE_ID);
      expect(view.sourceContext.opportunityCandidateId).toBe(CANDIDATE_ID);
      expect(view.identity.name).toMatch(/lease|CRE|NPV/i);
      expect(view.customer.targetCustomer.length).toBeGreaterThan(4);
      expect(view.problem.coreProblem.length).toBeGreaterThan(4);
      expect(view.grantsBuild).toBe(false);
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          business: view.identity.name,
          customer: view.customer.targetCustomer,
          problem: view.problem.coreProblem,
          monetization: view.businessModel.summary,
          economics: {
            revenue: view.economics.monthlyRevenuePerCustomer.display,
            cac: view.economics.cac.display,
            ltv: view.economics.ltv.display,
            ltvCac: view.economics.ltvCac.display,
            payback: view.economics.payback.display,
          },
          selection: view.evidence.summary.find((item) => /VALIDATE|BUILD|HOLD|REJECT/i.test(item)) ?? view.nextMove.recommendation,
          productAdvantage: view.marketAdvantage.strongestDifferentiator,
          nextMove: view.nextMove.recommendation,
          stage: view.currentPosition.step,
        }),
      );
    },
    30000,
  );
});
