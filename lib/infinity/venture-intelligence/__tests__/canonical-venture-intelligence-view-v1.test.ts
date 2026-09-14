import { createElement } from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { analyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/analyze";
import { convertFounderIdeaToCandidate } from "@/lib/infinity/founder-idea-lab/convert";
import { flattenExplainabilityForHq } from "@/lib/infinity/founder-idea-lab/explainability/compose";
import { buildFounderIntelligenceView } from "@/lib/infinity/founder-idea-lab/explainability/view";
import { founderFriendlyPrimarySections, primarySectionBlob } from "@/lib/infinity/founder-idea-lab/hq/founder-intelligence-primary";
import { cmsBenchmarkEconomicsAfterPacket } from "@/lib/infinity/founder-idea-lab/integrity-fixtures";
import { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import { submitFounderIdea } from "@/lib/infinity/founder-idea-lab/submit";
import type { FounderIdeaSubmissionInput } from "@/lib/infinity/founder-idea-lab/types";
import { BUILD_PLAN_AUTHORITY } from "@/lib/infinity/founder-idea-lab/build-plan/types";
import {
  fromCanonicalVenture,
  fromFounderIdea,
  fromOpportunityCandidate,
  fromPerformanceIntelligence,
  buildVentureIntelligenceEntityDetail,
  ventureIntelligenceArtifact,
  ventureIntelligenceHqSections,
  VENTURE_INTELLIGENCE_AUTHORITY,
} from "@/lib/infinity/venture-intelligence";
import type { CanonicalVentureAdapterInput } from "@/lib/infinity/venture-intelligence/types";
import { emptyPerformanceInput } from "@/lib/infinity/venture-intelligence/adapters/from-performance-intelligence";

function ideaInput(key: string): FounderIdeaSubmissionInput {
  return {
    organizationId: "org-canonical-view-v1",
    submittedByUserId: "user-a",
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "cost per month depending on your package",
    idempotencyKey: key,
  };
}

function founderView() {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, ideaInput("canonical"));
  convertFounderIdeaToCandidate(store, submission);
  const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
  return { view: buildFounderIntelligenceView(grade.explainability), grade };
}

function canonicalInput(overrides: Partial<CanonicalVentureAdapterInput> = {}): CanonicalVentureAdapterInput {
  return {
    ventureId: "240032f1-18c2-4fb4-8b63-60e013f9174c",
    organizationId: "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494",
    name: "WorkflowPilot",
    origin: "first_autonomous_venture_cycle_v1",
    assemblyStatus: "internally_ready",
    readinessStatus: "internally_ready",
    launchStage: "internally_ready",
    opportunityId: "candidate-1",
    buildId: "build-1",
    productionArtifactId: "artifact-1",
    identityPackage: {
      workingName: "WorkflowPilot",
      targetAudience: "Operations managers",
      primaryProblem: "Manual handoffs stall delivery",
      primaryPromise: "Automated workflow routing",
      origin: "first_autonomous_venture_cycle_v1",
      opportunityCandidateId: "candidate-1",
    },
    businessModelPackage: {
      customer: { value: "Operations managers" },
      problem: { value: "Manual handoffs stall delivery" },
      solution: { value: "Automated workflow routing" },
      revenueModel: { value: "Monthly software subscription" },
    },
    monetizationPackage: { revenueMechanism: "subscription" },
    candidate: {
      id: "candidate-1",
      title: "WorkflowPilot",
      summary: "Route work automatically for operations teams.",
      problem: "Manual handoffs stall delivery",
      targetCustomer: "Operations managers",
      market: "B2B workflow software",
      businessModelCandidates: ["subscription"],
      revenueMechanismCandidates: ["monthly_saas"],
      demandEvidence: ["Teams pay for workflow routing today."],
      marketEvidence: [],
      monetizationEvidence: [],
      distributionEvidence: [],
      buildabilityEvidence: [],
      competitionEvidence: ["Current tools are rigid and slow to change."],
      researchSources: [],
      researchRunIds: [],
      risks: ["Willingness to pay is unproven."],
      unknowns: ["Actual CAC"],
    },
    monetizationPlan: {
      estimatedPriceBase: 99,
      estimatedRevenuePerCustomer: 99,
      estimatedCAC: 250,
      estimatedLTV: 1200,
      estimatedGrossMarginPercent: 70,
      contributionMarginPerCustomer: 60,
      ltvCacRatio: 4.8,
      estimatedMonthsToBreakEven: 5,
      customerType: "Operations managers",
      valueProposition: "Automated workflow routing",
      offerDescription: "Monthly operations software",
      pricingModel: "Monthly software subscription",
      modelName: "SaaS subscription",
      risks: ["CAC may exceed modeled range."],
    },
    performance: emptyPerformanceInput(),
    departmentStates: [{ id: "product_lab", state: "COMPLETE" }],
    ...overrides,
  };
}

describe("CANONICAL VENTURE INTELLIGENCE VIEW V1", () => {
  it("builds a typed VentureIntelligenceView from a Founder Idea without binding to Founder as the data model", () => {
    const { view } = founderView();
    const canonical = fromFounderIdea({ view, founderIdeaId: "idea-1", title: "Infinity CMS" });
    expect(canonical.identity.name).toBe("Infinity CMS");
    expect(canonical.sourceContext.id).toBe("FOUNDER_IDEA");
    expect(canonical.commandDeck.heading).toBe("Venture Command Deck");
    expect(canonical.grantsBuild).toBe(false);
    expect(canonical.authority.canApproveBuild).toBe(false);
    expect(canonical.economics.prefersActuals).toBe(true);
  });

  it("builds the same command deck quality for a non-Founder canonical venture", () => {
    const view = fromCanonicalVenture(canonicalInput());
    expect(view.sourceContext.id).not.toBe("FOUNDER_IDEA");
    expect(view.identity.originEntityType).toBe("venture_assembly");
    expect(view.thesis.thesis.toLowerCase()).toContain("manual handoffs");
    expect(view.economics.monthlyRevenuePerCustomer.display).toMatch(/\$/);
    expect(view.marketAdvantage.primaryCustomerPain.length).toBeGreaterThan(8);
    expect(view.systemRequirements.length).toBeGreaterThan(3);
    expect(view.buildPlan.next3Phases).toHaveLength(3);
    expect(view.nextMove.recommendation.length).toBeGreaterThan(8);
    expect(view.risks.biggest.length).toBeGreaterThan(4);
    expect(view.commandDeck.heading).toBe("Venture Command Deck");
    expect(JSON.stringify(view)).not.toMatch(/Submitted idea|Founder Idea Lab/i);
  });

  it("parses opportunity candidates into canonical input without inventing a second identity", () => {
    const candidate = fromOpportunityCandidate({
      id: "candidate-1",
      title: "WorkflowPilot",
      summary: "Route work",
      problem: "Handoffs stall",
      target_customer: "Ops managers",
      demand_evidence: [{ claim: "Teams already buy workflow tools" }],
      risks: ["Unproven CAC"],
    });
    expect(candidate?.id).toBe("candidate-1");
    expect(candidate?.demandEvidence[0]).toMatch(/workflow/i);
  });

  it("lets origin change the badge without changing command-deck quality", () => {
    const founder = fromFounderIdea({ view: founderView().view, title: "Infinity CMS" });
    const autonomous = fromCanonicalVenture(canonicalInput());
    const founderSection = ventureIntelligenceHqSections(founder).find((item) => item.id === "venture-command-deck");
    const autoSection = ventureIntelligenceHqSections(autonomous).find((item) => item.id === "venture-command-deck");
    expect(founderSection?.layout).toBe("command-deck");
    expect(autoSection?.layout).toBe("command-deck");
    expect(founderSection?.title).toBe(autoSection?.title);
    expect(autoSection?.rows.some((row) => row.id === "deck-source" && row.value === "Founder submitted")).toBe(false);
    expect(founderSection?.rows.some((row) => row.value === "Founder submitted")).toBe(true);
  });

  it("prefers actual operating data over modeled estimates and keeps expected vs actual", () => {
    const performance = fromPerformanceIntelligence({
      aggregates: [
        { metric: "cac", value: 80, unit: "usd", sampleSize: 12 },
        { metric: "conversion_rate", value: 0.04, unit: "ratio", sampleSize: 12 },
      ],
      packages: [
        {
          kpiAssessments: [
            {
              metric: "cac",
              expectedValue: 250,
              actualValue: 80,
              variance: -170,
              variancePercent: -68,
              status: "above_plan",
              expectationSource: "monetization_plan",
              actualSource: "normalized_events",
            },
          ],
          diagnoses: [{ observation: "Paid channel converting below plan", category: "ACQUISITION" }],
        },
      ],
    });
    const view = fromCanonicalVenture(
      canonicalInput({
        launchStage: "live",
        performance,
      }),
    );
    expect(view.economics.cac.origin).toBe("OBSERVED");
    expect(view.economics.cac.display).toMatch(/80/);
    expect(view.economics.cac.expectedDisplay).toMatch(/250/);
    expect(view.performance.expectedVsActual.some((row) => row.metric === "CAC")).toBe(true);
    expect(view.performance.actualMetrics).toContain("CAC");
    expect(view.buildReadiness).toBe("Deployed");
    expect(view.buildPlan.heading).toBe("How This Venture Is Operating");
    expect(view.buildPlan.next3Phases.some((item) => item.name === "Build MVP")).toBe(false);
  });

  it("renders missing data in plain language instead of UNKNOWN walls", () => {
    const view = fromCanonicalVenture(
      canonicalInput({
        buildId: null,
        productionArtifactId: null,
        launchStage: null,
        assemblyStatus: "assembling",
        monetizationPlan: null,
        candidate: {
          id: "early-1",
          title: "Early autonomous",
          summary: "A research-backed workflow idea.",
          problem: "Ops teams lose time in handoffs",
          targetCustomer: "Ops managers",
          market: "B2B",
          businessModelCandidates: ["subscription"],
          revenueMechanismCandidates: [],
          demandEvidence: ["Search demand for workflow routing is visible."],
          marketEvidence: [],
          monetizationEvidence: [],
          distributionEvidence: [],
          buildabilityEvidence: [],
          competitionEvidence: [],
          researchSources: [],
          researchRunIds: [],
          risks: [],
          unknowns: ["Price", "CAC"],
        },
        performance: emptyPerformanceInput(),
      }),
    );
    const blob = JSON.stringify(ventureIntelligenceHqSections(view));
    expect(blob).not.toMatch(/UNKNOWN/);
    expect(view.economics.cac.display).toMatch(/Not measured yet|No reliable estimate yet|Not applicable at this stage/);
    expect(view.thesis.thesis.toLowerCase()).toContain("handoffs");
    expect(view.nextMove.recommendation.toLowerCase()).toMatch(/validate|demand|offer/);
  });

  it("derives business case, systems readiness, build plan, next move, and risk summary from persisted state", () => {
    const view = fromCanonicalVenture(canonicalInput());
    expect(view.businessCase.label).toMatch(/Looks promising|Worth validating|Needs more evidence|Economics are weak|Performing well|Underperforming expectations/);
    expect(view.systemRequirements.some((item) => item.coverageLabel.length > 0)).toBe(true);
    expect(view.capabilityCoverage.alreadyAvailable.length + view.capabilityCoverage.productSpecificWork.length).toBeGreaterThan(0);
    expect(view.buildPlan.authority).toEqual(BUILD_PLAN_AUTHORITY);
    expect(view.nextMove.recommendation.length).toBeGreaterThan(8);
    expect(view.risks.economic.length).toBeGreaterThan(3);
  });

  it("does not create a second economic, product-advantage, or build-plan engine", () => {
    const present = readFileSync(join(process.cwd(), "lib/infinity/venture-intelligence/present-command-deck.ts"), "utf8");
    const canonical = readFileSync(join(process.cwd(), "lib/infinity/venture-intelligence/adapters/from-canonical-venture.ts"), "utf8");
    expect(present).toContain("presentVentureCommandDeck");
    expect(present).toContain("buildFounderVentureBuildPlan");
    expect(present).toContain("emptyEducatedEconomicsModel");
    expect(canonical).not.toContain("activateEducatedEstimates");
    expect(canonical).not.toContain("activateProductAdvantage");
    expect(canonical).not.toContain("diagnosePerformance");
  });

  it("keeps System View provenance and read-only BUILD safety", () => {
    const view = fromCanonicalVenture(canonicalInput());
    const detail = buildVentureIntelligenceEntityDetail(view);
    expect(detail.system.rows.some((row) => row.label === "Can grant BUILD" && row.value === "NO")).toBe(true);
    expect(detail.system.rows.some((row) => /Provenance/.test(row.label))).toBe(true);
    expect(view.grantsBuild).toBe(false);
    expect(VENTURE_INTELLIGENCE_AUTHORITY.canApproveBuild).toBe(false);
    expect(VENTURE_INTELLIGENCE_AUTHORITY.canModifyVentureState).toBe(false);
    expect(view.commandDeck.grantsBuild).toBe(false);
  });

  it("renders neon/holographic command deck tables for non-Founder ventures", () => {
    const view = fromCanonicalVenture(canonicalInput());
    const detail = buildVentureIntelligenceEntityDetail(view);
    const artifact = ventureIntelligenceArtifact(view);
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact, embedded: true }));
    expect(html).toContain("hq-command-deck");
    expect(html).toContain("infinity-holographic-surface");
    expect(html).toContain("infinity-data-grid");
    expect(html).not.toContain("Back to room inventory");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".infinity-data-grid");
    expect(css).toContain(".infinity-holographic-surface");
    expect(css).toContain("@media (max-width: 720px)");
  });

  it("keeps Founder Idea Command Deck compatibility", () => {
    const { view, grade } = founderView();
    if (!grade.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const blob = primarySectionBlob(founderFriendlyPrimarySections(view, flattenExplainabilityForHq(grade.explainability)));
    expect(blob).toMatch(/Venture Command Deck|Target customer|What Infinity recommends next/i);
    expect(view.commandDeck?.buildReadiness).toBe("Not ready to build");
    const canonical = fromFounderIdea({ view, title: "Infinity CMS" });
    expect(canonical.commandDeck.metrics.map((item) => item.id)).toEqual(
      expect.arrayContaining(["core", "contribution", "cac", "lifetime", "ltv", "ltv-cac", "payback", "first-year"]),
    );
  });
});

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const LIVE_CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";
const LIVE_BUILT_ID = "240032f1-18c2-4fb4-8b63-60e013f9174c";

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

describe("CANONICAL VENTURE INTELLIGENCE VIEW V1 — live read-only cases", () => {
  it(
    "CASE A replays Infinity CMS Founder Idea intelligence without writes",
    async () => {
      if (!loadEnvLocal() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { loadFounderIdeaStoreForOrg } = await import("@/lib/infinity/founder-idea-lab/hq/load");
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const store = await loadFounderIdeaStoreForOrg(createAdminClient() as never, LIVE_ORG);
      const grade = store.grades.get(LIVE_CMS_ID);
      expect(grade?.explainability).toBeTruthy();
      const view = buildFounderIntelligenceView(grade!.explainability!);
      const canonical = fromFounderIdea({ view, founderIdeaId: LIVE_CMS_ID, title: "Infinity CMS" });
      expect(canonical.commandDeck.heading).toBe("Venture Command Deck");
      expect(canonical.buildReadiness.toLowerCase()).toMatch(/not ready/);
      expect(canonical.grantsBuild).toBe(false);
    },
    30000,
  );

  it(
    "CASE B loads an existing non-Founder venture read-only",
    async () => {
      if (!loadEnvLocal() || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const { loadOperatorVentureSnapshot } = await import("@/lib/infinity/operator-console");
      const { loadCanonicalVentureIntelligence } = await import("@/lib/infinity/venture-intelligence/load");
      const admin = createAdminClient();
      const snapshot = await loadOperatorVentureSnapshot(admin, LIVE_ORG, LIVE_BUILT_ID);
      expect(snapshot).toBeTruthy();
      const view = await loadCanonicalVentureIntelligence(admin, snapshot!);
      expect(view.identity.ventureId).toBe(LIVE_BUILT_ID);
      expect(view.sourceContext.id).not.toBe("FOUNDER_IDEA");
      expect(view.thesis.thesis.length).toBeGreaterThan(12);
      expect(view.commandDeck.heading).toBe("Venture Command Deck");
      expect(view.grantsBuild).toBe(false);
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          name: view.identity.name,
          origin: view.sourceContext,
          thesis: view.thesis.thesis,
          economics: view.economics.evidenceStrength,
          systems: view.capabilityCoverage.coverageSummary,
          next: view.nextMove.recommendation,
          position: view.currentPosition.label,
          readiness: view.buildReadiness,
          performanceAvailable: view.performance.available,
          actualMetrics: view.performance.actualMetrics,
          expectedVsActual: view.performance.expectedVsActual,
          happening: view.performance.whatIsActuallyHappening.slice(0, 8),
        }),
      );
    },
    30000,
  );
});
