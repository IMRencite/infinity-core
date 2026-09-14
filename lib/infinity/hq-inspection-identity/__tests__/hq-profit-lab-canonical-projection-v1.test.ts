import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { parseInspectionQuery, resolveHqInspectionContext } from "@/lib/infinity/operator-console/inspection-context";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import {
  ASKREVIEW_CANDIDATE_ID,
  ASKREVIEW_VENTURE_ID,
  ASKREVIEW_WORKING_NAME,
} from "@/lib/infinity/second-venture-factory/constants";
import { persistAskReviewOperationalRecord } from "@/lib/infinity/second-venture-factory/persist-record";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { backfillCreVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import { fromCanonicalVenture } from "@/lib/infinity/venture-intelligence/adapters/from-canonical-venture";
import { emptyPerformanceInput } from "@/lib/infinity/venture-intelligence/adapters/from-performance-intelligence";
import { buildAskReviewEconomics } from "@/lib/infinity/venture-economics/askreview";
import { buildOccupancynpvEconomics } from "@/lib/infinity/venture-economics/occupancynpv";
import { filterProfitLabViewForVenture, projectProfitLabHq } from "@/lib/infinity/venture-economics/hq";
import {
  evaluateHQVentureEconomicsVisibilityGate,
  evaluateProfitLabCompletenessGate,
} from "@/lib/infinity/venture-economics/gates";
import {
  persistVentureEconomics,
  resetVentureEconomicsStore,
} from "@/lib/infinity/venture-economics/persist";
import {
  ASKREVIEW_INSPECTION_LIFECYCLE,
  CANONICAL_PROJECTION_FALLBACK_MASKING_GATE,
  GENERIC_NO_RELIABLE_ESTIMATE,
  HQ_CANONICAL_VENTURE_IDENTITY_GATE,
  HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT,
  HQ_VENTURE_INSPECTION_CONTEXT_GATE,
  HQ_VENTURE_LIFECYCLE_PROJECTION_GATE,
  OCCUPANCYNPV_INSPECTION_TITLE,
  PARTIAL_ECONOMICS_PRESENTATION_CONTRACT,
  RENDERED_PROFIT_LAB_COMPLETENESS_GATE,
} from "../types";
import { buildCanonicalOperatorSnapshot } from "../canonical-snapshot";
import {
  evaluateCanonicalProjectionFallbackMaskingGate,
  evaluateHQCanonicalVentureIdentityGate,
  evaluateHQVentureInspectionContextGate,
  evaluateHQVentureLifecycleProjectionGate,
  evaluateInspectionFixture,
  evaluateRenderedProfitLabCompletenessGate,
  renderedUsesGenericFallback,
} from "../gates";
import { overlayCanonicalEconomicsOnIntelligence, presentPartialEconomics } from "../overlay";
import {
  canonicalizeInspectionRef,
  resolveHqInspectionVentureIdentity,
  resolvePreferredVentureIdFromInspect,
} from "../resolve";

const ROOT = process.cwd();

function emptyAdapter(ventureId: string, name: string) {
  return fromCanonicalVenture({
    ventureId,
    organizationId: "org",
    name,
    origin: null,
    assemblyStatus: "candidate_only",
    readinessStatus: null,
    launchStage: null,
    opportunityId: null,
    opportunityCandidateId: ventureId.replace(/^candidate:/, ""),
    buildId: null,
    productionArtifactId: null,
    identityPackage: {},
    businessModelPackage: {},
    monetizationPackage: {},
    candidate: null,
    monetizationPlan: null,
    selection: null,
    researchRuns: [],
    assemblyEconomics: null,
    performance: emptyPerformanceInput(),
    departmentStates: [],
  });
}

function snapshotFor(id: string, name: string, lifecycle: string): OperatorVentureSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    venture: {
      ventureAssemblyId: id,
      organizationId: "org",
      missionId: "canonical",
      opportunityId: id.replace(/^candidate:/, ""),
      companyId: null,
      ventureBlueprintId: null,
      buildId: null,
      productionArtifactId: null,
      ventureName: name,
      ventureType: name,
      assemblyStatus: lifecycle,
      readinessStatus: lifecycle,
      launchStage: lifecycle,
      origin: "canonical_operating_venture",
      correlationIds: [id],
    },
    overallStatus: "COMPLETE",
    currentDepartments: [],
    currentActivity: {
      active: false,
      departmentId: null,
      departmentLabel: null,
      engine: null,
      task: null,
      provider: null,
      model: null,
      status: null,
      startedAt: null,
      elapsedSeconds: null,
      attempt: null,
      costUsd: null,
      costKnown: false,
      artifactStatus: null,
      latestActivitySummary: null,
      latestActivityAt: null,
    },
    departments: [],
    pipeline: { stagesCompleted: 0, stagesTotal: 11, stageLabels: [] },
    activityFeed: [],
    providers: [],
    costs: { knownSpendUsd: 0, unpricedProviderCalls: 0, breakdown: [] },
    lineage: [],
    closedLoopRoute: {
      active: false,
      fromDepartmentId: null,
      viaDepartmentId: null,
      toDepartmentId: null,
      decisionType: null,
      missionId: null,
      missionStatus: null,
    },
    system: { engineRuns: {}, artifacts: {}, performance: {}, learning: {} },
  };
}

describe("HQ Profit Lab canonical projection + inspection context V1", () => {
  beforeEach(() => {
    resetVentureEconomicsStore();
    persistAskReviewOperationalRecord();
    if (!readVentureOperationalRecord(CRE_VENTURE_ID)) {
      writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    }
    persistVentureEconomics(buildOccupancynpvEconomics());
    persistVentureEconomics(buildAskReviewEconomics());
  });

  it("resolves opportunity_candidate OccupancyNPV inspect to the canonical venture, not AskReview", () => {
    const inspect = parseInspectionQuery(`opportunity_candidate:${CRE_CANDIDATE_ID}`);
    const identity = resolveHqInspectionVentureIdentity(inspect);
    expect(identity.contract).toBe(HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT);
    expect(identity.canonicalVentureId).toBe(CRE_VENTURE_ID);
    expect(identity.ventureName).toBe("OccupancyNPV");
    expect(identity.lifecycle).toBe("PUBLICLY_LAUNCHED");
    expect(resolvePreferredVentureIdFromInspect(inspect)).toBe(CRE_VENTURE_ID);
    expect(canonicalizeInspectionRef(inspect)).toEqual({ entityType: "VENTURE", entityId: CRE_VENTURE_ID });
    expect(resolvePreferredVentureIdFromInspect(inspect)).not.toBe(ASKREVIEW_VENTURE_ID);
  });

  it("fails route OccupancyNPV + selector AskReview", () => {
    const fixtures = evaluateInspectionFixture({
      routeVentureId: CRE_VENTURE_ID,
      selectorVentureId: ASKREVIEW_VENTURE_ID,
      canonicalEconomicsPopulated: true,
      renderedGenericEmpty: false,
      canonicalLifecycle: "PUBLICLY_LAUNCHED",
      renderedLifecycle: "PUBLICLY_LAUNCHED",
      knownPriceRendered: "$290/year",
      renderedCac: "UNKNOWN — RESEARCH REQUIRED",
      selectedVentureId: ASKREVIEW_VENTURE_ID,
      displayedEconomicsVentureId: ASKREVIEW_VENTURE_ID,
    });
    expect(fixtures[0]?.result).toBe("FAIL");
  });

  it("fails populated economics rendered as generic empty Profit Lab", () => {
    const fixtures = evaluateInspectionFixture({
      routeVentureId: CRE_VENTURE_ID,
      selectorVentureId: CRE_VENTURE_ID,
      canonicalEconomicsPopulated: true,
      renderedGenericEmpty: true,
      canonicalLifecycle: "PUBLICLY_LAUNCHED",
      renderedLifecycle: "PUBLICLY_LAUNCHED",
      knownPriceRendered: GENERIC_NO_RELIABLE_ESTIMATE,
      renderedCac: GENERIC_NO_RELIABLE_ESTIMATE,
      selectedVentureId: CRE_VENTURE_ID,
      displayedEconomicsVentureId: CRE_VENTURE_ID,
    });
    expect(fixtures[1]?.result).toBe("FAIL");
  });

  it("fails PUBLICLY_LAUNCHED rendered as IDEA", () => {
    expect(
      evaluateHQVentureLifecycleProjectionGate({
        canonicalLifecycle: "PUBLICLY_LAUNCHED",
        renderedLifecycle: "Idea — still assembling the venture thesis",
      }).result,
    ).toBe("FAIL");
    const fixtures = evaluateInspectionFixture({
      routeVentureId: CRE_VENTURE_ID,
      selectorVentureId: CRE_VENTURE_ID,
      canonicalEconomicsPopulated: true,
      renderedGenericEmpty: false,
      canonicalLifecycle: "PUBLICLY_LAUNCHED",
      renderedLifecycle: "Idea — still assembling the venture thesis",
      knownPriceRendered: "$290/year",
      renderedCac: "UNKNOWN — RESEARCH REQUIRED",
      selectedVentureId: CRE_VENTURE_ID,
      displayedEconomicsVentureId: CRE_VENTURE_ID,
    });
    expect(fixtures[2]?.result).toBe("FAIL");
  });

  it("fails known pricing collapsed to No reliable estimate yet", () => {
    const partial = presentPartialEconomics({
      economics: buildOccupancynpvEconomics(),
      renderedCac: GENERIC_NO_RELIABLE_ESTIMATE,
      renderedLtv: GENERIC_NO_RELIABLE_ESTIMATE,
      renderedPrice: GENERIC_NO_RELIABLE_ESTIMATE,
      renderedMonetization: GENERIC_NO_RELIABLE_ESTIMATE,
    });
    expect(partial.contract).toBe(PARTIAL_ECONOMICS_PRESENTATION_CONTRACT);
    expect(partial.collapsedToGenericUnknown).toBe(true);
    const fixtures = evaluateInspectionFixture({
      routeVentureId: CRE_VENTURE_ID,
      selectorVentureId: CRE_VENTURE_ID,
      canonicalEconomicsPopulated: true,
      renderedGenericEmpty: true,
      canonicalLifecycle: "PUBLICLY_LAUNCHED",
      renderedLifecycle: "PUBLICLY_LAUNCHED",
      knownPriceRendered: GENERIC_NO_RELIABLE_ESTIMATE,
      renderedCac: GENERIC_NO_RELIABLE_ESTIMATE,
      selectedVentureId: CRE_VENTURE_ID,
      displayedEconomicsVentureId: CRE_VENTURE_ID,
    });
    expect(fixtures[3]?.result).toBe("FAIL");
  });

  it("fails AskReview selected with OccupancyNPV economics displayed", () => {
    const fixtures = evaluateInspectionFixture({
      routeVentureId: ASKREVIEW_VENTURE_ID,
      selectorVentureId: ASKREVIEW_VENTURE_ID,
      canonicalEconomicsPopulated: true,
      renderedGenericEmpty: false,
      canonicalLifecycle: ASKREVIEW_INSPECTION_LIFECYCLE,
      renderedLifecycle: ASKREVIEW_INSPECTION_LIFECYCLE,
      knownPriceRendered: "$29/month HYPOTHESIS",
      renderedCac: "UNKNOWN — RESEARCH REQUIRED",
      selectedVentureId: ASKREVIEW_VENTURE_ID,
      displayedEconomicsVentureId: CRE_VENTURE_ID,
    });
    expect(fixtures[4]?.result).toBe("FAIL");
  });

  it("aligns OccupancyNPV header, selector, inspection, and lifecycle after promotion", () => {
    const inspect = parseInspectionQuery(`opportunity_candidate:${CRE_CANDIDATE_ID}`);
    const snapshot = snapshotFor(CRE_VENTURE_ID, "OccupancyNPV", "PUBLICLY_LAUNCHED");
    const context = resolveHqInspectionContext(snapshot, inspect);
    expect(context.status).toBe("ACTIVE");
    expect(context.entityType).toBe("VENTURE");
    expect(context.entityId).toBe(CRE_VENTURE_ID);
    expect(context.displayName).toBe("OccupancyNPV");
    expect(context.stage).toBe("PUBLICLY_LAUNCHED");
    expect(context.origin).toBe(OCCUPANCYNPV_INSPECTION_TITLE);
    const identity = resolveHqInspectionVentureIdentity(inspect);
    const surfaces = {
      route: identity.canonicalVentureId,
      header: context.entityId,
      selector: CRE_VENTURE_ID,
      intelligence: CRE_VENTURE_ID,
      economics: CRE_VENTURE_ID,
      evidence: CRE_VENTURE_ID,
      systemView: CRE_VENTURE_ID,
    };
    expect(evaluateHQVentureInspectionContextGate({ identity, surfaces }).gate).toBe(HQ_VENTURE_INSPECTION_CONTEXT_GATE);
    expect(evaluateHQVentureInspectionContextGate({ identity, surfaces }).result).toBe("PASS");
    expect(
      evaluateHQCanonicalVentureIdentityGate({
        candidateId: CRE_CANDIDATE_ID,
        ventureId: CRE_VENTURE_ID,
        ventureName: "OccupancyNPV",
        economicsVentureId: CRE_VENTURE_ID,
        lifecycle: "PUBLICLY_LAUNCHED",
        selectorVentureId: CRE_VENTURE_ID,
        inspectRoute: CRE_VENTURE_ID,
      }).gate,
    ).toBe(HQ_CANONICAL_VENTURE_IDENTITY_GATE);
    expect(
      evaluateHQCanonicalVentureIdentityGate({
        candidateId: CRE_CANDIDATE_ID,
        ventureId: CRE_VENTURE_ID,
        ventureName: "OccupancyNPV",
        economicsVentureId: CRE_VENTURE_ID,
        lifecycle: "PUBLICLY_LAUNCHED",
        selectorVentureId: CRE_VENTURE_ID,
        inspectRoute: CRE_VENTURE_ID,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateHQVentureLifecycleProjectionGate({
        canonicalLifecycle: "PUBLICLY_LAUNCHED",
        renderedLifecycle: context.stage,
      }).gate,
    ).toBe(HQ_VENTURE_LIFECYCLE_PROJECTION_GATE);
    expect(
      evaluateHQVentureLifecycleProjectionGate({
        canonicalLifecycle: "PUBLICLY_LAUNCHED",
        renderedLifecycle: context.stage,
      }).result,
    ).toBe("PASS");
  });

  it("overlays OccupancyNPV canonical economics instead of Autonomous Venture Cycle placeholders", () => {
    const occ = buildOccupancynpvEconomics();
    const generic = emptyAdapter(CRE_VENTURE_ID, "Autonomous Venture Cycle");
    expect(generic.currentPosition.label).toMatch(/Idea/i);
    expect(generic.economics.cac.display).toBe(GENERIC_NO_RELIABLE_ESTIMATE);
    const overlaid = overlayCanonicalEconomicsOnIntelligence(generic, {
      economics: occ,
      lifecycle: "PUBLICLY_LAUNCHED",
      expectedCanonical: true,
    });
    expect(overlaid.identity.name).toBe("OccupancyNPV");
    expect(overlaid.identity.concept).toBe(OCCUPANCYNPV_INSPECTION_TITLE);
    expect(overlaid.customer.targetCustomer).toContain("tenant-representation");
    expect(overlaid.problem.coreProblem).toContain("NPV");
    expect(overlaid.businessModel.summary).toContain("Professional");
    expect(overlaid.currentPosition.label).toBe("PUBLICLY_LAUNCHED");
    expect(overlaid.economics.cac.display).toContain("UNKNOWN");
    expect(overlaid.economics.ltv.display).toContain("UNKNOWN");
    expect(overlaid.economics.monthlyRevenuePerCustomer.display).toContain("$290");
    expect(overlaid.commandDeck.metrics.some((row) => row.value.includes("$290"))).toBe(true);
    expect(overlaid.commandDeck.metrics.some((row) => row.value.includes("UNKNOWN"))).toBe(true);
    expect(overlaid.evidence.summary.some((row) => /ARGUS|Prophia|Occupier|Lextract/i.test(row))).toBe(true);
    expect(renderedUsesGenericFallback({
      headerName: overlaid.identity.name,
      customer: overlaid.customer.targetCustomer,
      cac: overlaid.economics.cac.display,
      ltv: overlaid.economics.ltv.display,
    })).toBe(false);
    const partial = presentPartialEconomics({
      economics: occ,
      renderedCac: overlaid.economics.cac.display,
      renderedLtv: overlaid.economics.ltv.display,
      renderedPrice: overlaid.economics.monthlyRevenuePerCustomer.display,
      renderedMonetization: overlaid.businessModel.summary,
    });
    expect(partial.knownPricingVisible).toBe(true);
    expect(partial.unknownCacPreserved).toBe(true);
    expect(partial.collapsedToGenericUnknown).toBe(false);
  });

  it("keeps AskReview isolated, hypothesized, and production paused", () => {
    const inspect = parseInspectionQuery(`opportunity_candidate:${ASKREVIEW_CANDIDATE_ID}`);
    const identity = resolveHqInspectionVentureIdentity(inspect);
    expect(identity.canonicalVentureId).toBe(ASKREVIEW_VENTURE_ID);
    expect(identity.ventureName).toBe(ASKREVIEW_WORKING_NAME);
    expect(identity.lifecycle).toBe(ASKREVIEW_INSPECTION_LIFECYCLE);
    const ask = buildAskReviewEconomics();
    const overlaid = overlayCanonicalEconomicsOnIntelligence(emptyAdapter(ASKREVIEW_VENTURE_ID, "AskReview"), {
      economics: ask,
      lifecycle: ASKREVIEW_INSPECTION_LIFECYCLE,
      productionPaused: true,
      expectedCanonical: true,
    });
    expect(overlaid.currentPosition.label).toContain("SELECTION_UNDER_REVIEW");
    expect(overlaid.currentPosition.label).toContain("PRODUCTION PAUSED");
    expect(overlaid.economics.monthlyRevenuePerCustomer.display).toContain("$29/month");
    expect(overlaid.economics.monthlyRevenuePerCustomer.display).toContain("HYPOTHESIS");
    expect(ask.unit_economics.price.display).toContain("$49 one-time HYPOTHESIS");
    expect(overlaid.evidence.summary.join(" ")).not.toMatch(/ARGUS|OccupancyNPV Professional/);
    const view = filterProfitLabViewForVenture(projectProfitLabHq([ask, buildOccupancynpvEconomics()]), ASKREVIEW_VENTURE_ID);
    expect(view.ventures).toHaveLength(1);
    expect(view.ventures[0]?.venture_name).toBe("AskReview");
    expect(view.competitors.some((row) => row.name.includes("ARGUS"))).toBe(false);
    expect(ask.production_advancement).toBe("PAUSED");
  });

  it("builds a canonical OccupancyNPV snapshot instead of falling back to a generic cycle", () => {
    const snapshot = buildCanonicalOperatorSnapshot("org", CRE_VENTURE_ID);
    expect(snapshot?.venture.ventureAssemblyId).toBe(CRE_VENTURE_ID);
    expect(snapshot?.venture.ventureName).toBe("OccupancyNPV");
    expect(snapshot?.venture.launchStage).toBe("PUBLICLY_LAUNCHED");
    const finance = snapshot?.departments.find((dept) => dept.id === "strategy_finance");
    const profitLab = finance?.detail.profitLabView as ReturnType<typeof projectProfitLabHq> | undefined;
    expect(profitLab?.inspected_venture_id).toBe(CRE_VENTURE_ID);
    expect(profitLab?.ventures).toHaveLength(1);
    expect(profitLab?.ventures[0]?.current_price).toContain("$290");
    expect(profitLab?.ventures[0]?.current_price).toContain("$149");
    expect(profitLab?.competitors.some((row) => /ARGUS|Prophia|Occupier/i.test(row.name))).toBe(true);
    expect(profitLab?.competitors.some((row) => /Excel|Lextract/i.test(row.name))).toBe(true);
    expect(profitLab?.pricing_benchmarks.length).toBeGreaterThanOrEqual(5);
    expect(profitLab?.ventures[0]?.scenarios.map((row) => row.name)).toEqual(["LOW", "BASE", "HIGH"]);
    expect(profitLab?.evidence.length).toBeGreaterThanOrEqual(8);
    expect(finance?.state).not.toBe("BLOCKED");
    expect(snapshot?.departments.find((dept) => dept.id === "research_department")?.state).not.toBe("BLOCKED");
  });

  it("fails silent generic fallback when canonical economics exist", () => {
    expect(
      evaluateCanonicalProjectionFallbackMaskingGate({
        canonicalRecordExists: true,
        projectionLoadFailed: true,
        renderedGenericEmpty: true,
        renderedProjectionError: null,
      }).gate,
    ).toBe(CANONICAL_PROJECTION_FALLBACK_MASKING_GATE);
    expect(
      evaluateCanonicalProjectionFallbackMaskingGate({
        canonicalRecordExists: true,
        projectionLoadFailed: true,
        renderedGenericEmpty: true,
        renderedProjectionError: null,
      }).result,
    ).toBe("FAIL");
    const occ = buildOccupancynpvEconomics();
    const view = filterProfitLabViewForVenture(projectProfitLabHq([occ]), CRE_VENTURE_ID);
    const rendered = {
      routeVentureId: CRE_VENTURE_ID,
      headerVentureId: CRE_VENTURE_ID,
      headerName: "OccupancyNPV",
      selectorVentureId: CRE_VENTURE_ID,
      selectorName: "OccupancyNPV",
      intelligenceVentureId: CRE_VENTURE_ID,
      economicsVentureId: CRE_VENTURE_ID,
      evidenceVentureId: CRE_VENTURE_ID,
      systemViewVentureId: CRE_VENTURE_ID,
      lifecycle: "PUBLICLY_LAUNCHED",
      customer: occ.customer_segment,
      problem: occ.primary_job_to_be_done,
      solution: occ.primary_job_to_be_done,
      businessModel: occ.recommended_monetization_model,
      monetization: occ.recommended_monetization_model,
      currentPrice: occ.unit_economics.price.display,
      cac: occ.customer_acquisition_model.display,
      ltv: occ.lifetime_value_model.display,
      contribution: occ.contribution_margin_model.display,
      payback: occ.payback_period.display,
      breakEven: occ.break_even_model.display,
      competitors: occ.competitors.map((row) => row.name),
      substitutes: occ.substitutes.map((row) => row.name),
      pricingBenchmarks: occ.pricing_benchmarks.map((row) => row.amount_display),
      scenarios: ["LOW", "BASE", "HIGH"],
      unknowns: occ.economic_unknowns,
      evidence: occ.evidence.map((row) => row.label),
      confidence: occ.confidence.overall,
      genericFallback: false,
      projectionError: null,
      canonicalEconomicsExisted: true,
    };
    expect(evaluateRenderedProfitLabCompletenessGate({ rendered, view }).gate).toBe(RENDERED_PROFIT_LAB_COMPLETENESS_GATE);
    expect(evaluateRenderedProfitLabCompletenessGate({ rendered, view }).result).toBe("PASS");
    expect(evaluateProfitLabCompletenessGate(view).result).toBe("PASS");
    expect(
      evaluateHQVentureEconomicsVisibilityGate({
        view,
        artifactsVisible: true,
        rendered: {
          ventureId: CRE_VENTURE_ID,
          lifecycle: "PUBLICLY_LAUNCHED",
          competitorsVisible: true,
          pricingVisible: true,
          scenariosVisible: true,
          unknownsVisible: true,
          evidenceVisible: true,
          confidenceVisible: true,
          genericFallback: false,
          wrongVenture: false,
        },
      }).result,
    ).toBe("PASS");
    expect(
      evaluateCanonicalProjectionFallbackMaskingGate({
        canonicalRecordExists: true,
        projectionLoadFailed: false,
        renderedGenericEmpty: false,
        renderedProjectionError: null,
      }).result,
    ).toBe("PASS");
  });

  it("wires the dashboard inspect route to preferredVentureId through identity resolution", () => {
    const page = readFileSync(join(ROOT, "app/dashboard/page.tsx"), "utf8");
    expect(page).toContain("preferredVentureId");
    expect(page).toContain("resolvePreferredVentureIdFromInspect");
    const load = readFileSync(join(ROOT, "lib/infinity/operator-console/load-hq-dashboard.ts"), "utf8");
    expect(load).toContain("buildCanonicalOperatorSnapshot");
    expect(load).not.toMatch(/else if \(preferredVentureId && preferredVentureId === resolvedId\) \{\s*resolvedId = resolveDefaultVentureId/);
    const intelligence = readFileSync(join(ROOT, "lib/infinity/venture-intelligence/load.ts"), "utf8");
    expect(intelligence).toContain("overlayCanonicalEconomicsOnIntelligence");
  });
});
