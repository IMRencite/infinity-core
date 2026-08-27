import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { convertFounderIdeaToCandidate } from "../convert";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import { evaluateBuildReadiness } from "../readiness";
import { unitEconomicsNumericallyKnown } from "../economics-known";
import { monetizeFromResearchPacket } from "../monetization-from-research";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { composeFounderExplainability } from "../explainability/compose";
import { modelComparableEconomics } from "../comparable-economics/from-evidence";
import { provenanceMaySatisfyBuildEconomics, unknownToZero } from "../comparable-economics/provenance";
import { qualifyComparables } from "../comparable-economics/qualify";
import { parseMoneyRange, isMonthlyPriceClaim, missingPriceIsNotFree } from "../comparable-economics/pricing";
import { modelCac } from "../comparable-economics/cac";
import { modelLtv } from "../comparable-economics/ltv";
import { ltvCacRange, paybackRange, breakEvenRange, breakEvenCustomers } from "../comparable-economics/unit-economics";
import { cmsComparableEconomicsPacket, cmsLiveV6ExplainabilityGrade, CMS_LIVE_V6_SNAPSHOT } from "../cms-live-v6-fixture";
import { validateUnknownEconomicsPacket, rejectUnknownEconomicsPacket } from "../integrity-fixtures";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import type { FounderIdeaSubmissionInput } from "../types";

const USER_A = "user-a";

function input(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "Maybe $499/month",
    idempotencyKey: "econ",
    ...overrides,
  };
}

describe("COMPARABLE_ECONOMICS_V1 provenance", () => {
  it("never treats economic classes as equivalent for BUILD", () => {
    expect(provenanceMaySatisfyBuildEconomics("OBSERVED")).toBe(true);
    expect(provenanceMaySatisfyBuildEconomics("VALIDATION_ESTIMATE")).toBe(false);
    expect(provenanceMaySatisfyBuildEconomics("COMPARABLE_MODELED")).toBe(false);
    expect(provenanceMaySatisfyBuildEconomics("FOUNDER_HYPOTHESIS")).toBe(false);
    expect(provenanceMaySatisfyBuildEconomics("UNKNOWN")).toBe(false);
    expect(unknownToZero(null)).toBe(false);
    expect(unknownToZero(undefined)).toBe(false);
  });
});

describe("COMPARABLE_ECONOMICS_V1 qualification + pricing + models", () => {
  it("qualifies comparables and excludes weak unrelated giants", () => {
    const packet = cmsComparableEconomicsPacket("s", "c");
    const { included, excluded } = qualifyComparables({
      packet,
      context: {
        title: "Infinity CMS",
        description: "SMB website CMS",
        targetCustomer: "SMB owners",
        problem: "need websites",
        proposedSolution: "managed CMS",
        businessModelHypothesis: "monthly subscription",
        pricingHypothesis: null,
      },
    });
    expect(included.some((row) => row.name === "Northstar Sites")).toBe(true);
    expect(excluded.some((row) => /hyperscale/i.test(row.name))).toBe(true);
    expect(included.every((row) => row.confidenceBand !== "WEAK_EXCLUDED")).toBe(true);
  });

  it("normalizes comparable pricing ranges and does not treat missing price as free", () => {
    const monthly = parseMoneyRange("packages list $149–$399 per month");
    expect(isMonthlyPriceClaim("packages list $149–$399 per month")).toBe(true);
    expect(monthly.low).toBe(149);
    expect(monthly.high).toBe(399);
    expect(monthly.base).toBe(274);
    expect(missingPriceIsNotFree("price not listed")).toBe(true);
    const unknown = parseMoneyRange("no public price disclosed");
    expect(unknown.base).toBeNull();
    expect(unknown.base).not.toBe(0);
  });

  it("models CAC/LTV/LTV-CAC/payback/break-even with unknown != zero", () => {
    const packet = cmsComparableEconomicsPacket("s", "c");
    const cac = modelCac({ findings: packet.findings, provenance: "COMPARABLE_MODELED" });
    expect(cac.range.low).toBe(700);
    expect(cac.range.high).toBe(1800);
    const monthly = parseMoneyRange("$149–$399 per month");
    const ltv = modelLtv({ findings: packet.findings, monthlyPrice: monthly, provenance: "COMPARABLE_MODELED" });
    expect(ltv.grossMarginPercent.low).toBeCloseTo(0.55);
    expect(ltv.monthlyChurn.low).toBeCloseTo(0.03);
    expect(ltv.range.base).not.toBeNull();
    const ratio = ltvCacRange(ltv.range, cac.range);
    expect(ratio.base).not.toBeNull();
    expect(ratio.base).not.toBe(0);
    const payback = paybackRange({
      cac: cac.range,
      monthlyRevenue: ltv.monthlyRevenue,
      grossMarginPercent: ltv.grossMarginPercent,
    });
    expect(payback.base).not.toBeNull();
    expect(breakEvenCustomers({ monthlyFixedCost: null, monthlyContribution: 100 })).toBeNull();
    expect(breakEvenRange({ monthlyFixedCost: null, monthlyRevenue: monthly, grossMarginPercent: ltv.grossMarginPercent }).base).toBeNull();
  });
});

describe("COMPARABLE_ECONOMICS_V1 modeled economics and BUILD safety", () => {
  it("modeled economics stay COMPARABLE_MODELED and cannot satisfy BUILD", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "model" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!);
    const modeled = modelComparableEconomics({
      packet,
      context: {
        title: submission.title,
        description: submission.description,
        targetCustomer: submission.targetCustomer,
        problem: submission.problem,
        proposedSolution: submission.proposedSolution,
        businessModelHypothesis: submission.businessModelHypothesis,
        pricingHypothesis: submission.pricingHypothesis,
      },
      layers: packet.monetizationLayers,
      founderPricingHypothesis: submission.pricingHypothesis,
    });
    expect(modeled.pricing.provenance).toBe("COMPARABLE_MODELED");
    expect(modeled.pricing.recommendation?.monthly).toEqual({ low: 149, base: 274, high: 399 });
    expect(modeled.pricing.recommendation?.setup).toEqual({ low: 499, base: 1000, high: 1500 });
    expect(modeled.outputs.cac).toEqual({ low: 700, base: 1250, high: 1800 });
    expect(modeled.outputs.ltv.base).toBeGreaterThan(0);
    expect(modeled.outputs.ltv.base).not.toBe(0);
    expect(modeled.outputs.ltvCac.base).not.toBeNull();
    expect(modeled.outputs.paybackMonths.base).not.toBeNull();
    expect(modeled.outputs.breakEvenCustomers.base).toBeNull();
    expect(modeled.scenarios.map((row) => row.id)).toEqual(["CONSERVATIVE", "BASE", "UPSIDE"]);
    expect(modeled.buildImplication.modeledSatisfiesBuild).toBe(false);
    expect(modeled.health).toBe("PROMISING_BUT_UNVALIDATED");
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet,
    });
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(unitEconomicsNumericallyKnown(monetization?.primaryPlan)).toBe(false);
    expect(modeled.assumptions.some((item) => /FOUNDER_HYPOTHESIS/.test(item.assumption) || modeled.pricing.rationale.includes("FOUNDER_HYPOTHESIS"))).toBe(true);
  });
});

describe("EXPLAINABILITY_V1", () => {
  it("explains CMS live HOLD from frozen live-derived inputs without changing the decision", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "cms" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!);
    const grade = cmsLiveV6ExplainabilityGrade(submission, packet);
    const explain = composeFounderExplainability({
      submission,
      grade,
      packet,
      layers: packet.monetizationLayers,
    });
    expect(explain.decision.decision).toBe("HOLD");
    expect(explain.scores.opportunityQuality.value).toBe(65.46);
    expect(explain.scores.selectionScore.value).toBe(52.49);
    expect(explain.scores.portfolioAdjustedScore.value).toBe(52.49);
    expect(explain.decision.classifierMetricField).toBe("portfolioAdjustedScore");
    expect(explain.decision.validateThreshold).toBe(58);
    expect(explain.decision.rejectThreshold).toBe(45);
    expect(explain.decision.why).toMatch(/52\.49/);
    expect(explain.decision.why).not.toMatch(/65\.46 is below 58/);
    expect(explain.decision.whyNotHigher).toMatch(/5\.51/);
    expect(explain.decision.whyNotLower).toMatch(/45/);
    expect(explain.decision.whyNotBuild).toMatch(/UNKNOWN/);
    expect(explain.scores.opportunityQuality.classifierMetric).toBe(false);
    expect(explain.scores.portfolioAdjustedScore.classifierMetric).toBe(true);
    expect(explain.scores.portfolioAdjustedScore.note).toMatch(/portfolioAdjustedScore = selectionScore/);
    const demand = explain.scores.opportunityQuality.components.find((row) => row.name === "demandStrength");
    expect(demand?.contribution).toBe(15.46);
    expect(explain.keyFindings.some((item) => item.displayKind === "SOURCE_BACKED_FINDING")).toBe(true);
    expect(explain.sourceTrace.length).toBeGreaterThan(0);
    expect(explain.economics.provenance).toBe("COMPARABLE_MODELED");
    expect(explain.comparables.buildImplication.modeledSatisfiesBuild).toBe(false);
    expect(grade.buildReady).toBe(false);
    expect(CMS_LIVE_V6_SNAPSHOT.decision).toBe("HOLD");
    expect(explain.decision.whatWouldChange.some((item) => /5\.51/.test(item))).toBe(true);
    expect(explain.decision.nextValidationQuestions.length).toBeGreaterThan(0);
    expect(explain.scores.opportunityQuality.value).toBe(CMS_LIVE_V6_SNAPSHOT.opportunityQuality);
    expect(explain.scores.selectionScore.value).toBe(CMS_LIVE_V6_SNAPSHOT.selectionScore);
    expect(explain.scores.portfolioAdjustedScore.value).toBe(CMS_LIVE_V6_SNAPSHOT.portfolioAdjustedScore);
    expect(explain.scores.validationScore.value).toBe(CMS_LIVE_V6_SNAPSHOT.validationScore);
    expect(explain.scores.monetizationScore.value).toBe(CMS_LIVE_V6_SNAPSHOT.monetizationScore);
    expect(explain.decision.decision).toBe("HOLD");
    expect(grade.buildReady).toBe(false);
  });

  it("emits unique CMS HQ insight metrics without duplicating score labels", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "cms-metrics" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!);
    const grade = cmsLiveV6ExplainabilityGrade(submission, packet);
    const explain = composeFounderExplainability({
      submission,
      grade,
      packet,
      layers: packet.monetizationLayers,
    });
    grade.explainability = explain;
    grade.comparableEconomics = explain.comparables;
    store.grades.set(submission.id, grade);
    submission.infinityDecision = "HOLD";
    submission.status = "HELD";
    store.submissions.set(submission.id, submission);
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    const byId = Object.fromEntries(detail.insights.metrics.map((item) => [item.id, item]));
    expect(byId["opportunity-quality"]?.value).toBe("65.46");
    expect(byId["selection-score"]?.value).toBe("52.49");
    expect(byId["portfolio-adjusted-score"]?.value).toBe("52.49");
    expect(byId["validation-score"]?.value).toBe("59.85");
    expect(byId["monetization-score"]?.value).toBe("54");
    expect(byId["validate-threshold"]?.value).toBe("58");
    expect(byId["reject-threshold"]?.value).toBe("45");
    expect(byId["build-readiness"]?.value).toBe("NO");
    expect(byId["build-readiness"]?.value).not.toBe("HOLD");
    expect(founder?.metadata.infinityDecision).toBe("HOLD");
    expect(detail.decision).toBe("HOLD");
    expect(byId["portfolio-adjustment"]?.value).toMatch(/None/);
    expect(detail.insights.metrics.filter((item) => item.label === "Selection score")).toHaveLength(1);
    expect(detail.insights.metrics.filter((item) => item.label === "Validation score")).toHaveLength(1);
    expect(detail.insights.metrics.filter((item) => item.label === "Monetization score")).toHaveLength(1);
    expect(new Set(detail.insights.metrics.map((item) => item.id)).size).toBe(detail.insights.metrics.length);
    expect(grade.opportunityQuality).toBe(65.46);
    expect(grade.selectionScore).toBe(52.49);
    expect(grade.evaluation?.portfolioAdjustedScore).toBe(52.49);
    expect(grade.validationScore).toBe(59.85);
    expect(grade.monetizationScore).toBe(54);
    expect(grade.evaluation?.decision).toBe("HOLD");
    expect(grade.buildReady).toBe(false);
  });

  it("explains VALIDATE and REJECT from classifier arithmetic", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "states" }));
    const packet = validateUnknownEconomicsPacket(submission.id, "c");
    const base = cmsLiveV6ExplainabilityGrade(submission, packet);
    const validateGrade = {
      ...base,
      selectionScore: 70,
      evaluation: { ...base.evaluation!, decision: "VALIDATE" as const, selectionScore: 70, portfolioAdjustedScore: 70 },
    };
    const validateExplain = composeFounderExplainability({ submission, grade: validateGrade, packet, layers: packet.monetizationLayers });
    expect(validateExplain.decision.why).toMatch(/VALIDATE/);
    const rejectPacket = rejectUnknownEconomicsPacket(submission.id, "c");
    const rejectGrade = {
      ...base,
      selectionScore: 40,
      evaluation: { ...base.evaluation!, decision: "REJECT" as const, selectionScore: 40, portfolioAdjustedScore: 40 },
    };
    const rejectExplain = composeFounderExplainability({
      submission,
      grade: rejectGrade,
      packet: rejectPacket,
      layers: rejectPacket.monetizationLayers,
    });
    expect(rejectExplain.decision.why).toMatch(/REJECT/);
  });

  it("shows build readiness NO for HOLD, VALIDATE, and REJECT when buildReady is false", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "readiness-display" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!);

    const cases = [
      { decision: "HOLD" as const, status: "HELD" as const, packet, score: 52.49 },
      { decision: "VALIDATE" as const, status: "VALIDATING" as const, packet: validateUnknownEconomicsPacket(submission.id, submission.opportunityCandidateId!), score: 70 },
      { decision: "REJECT" as const, status: "REJECTED" as const, packet: rejectUnknownEconomicsPacket(submission.id, submission.opportunityCandidateId!), score: 40 },
    ];

    for (const row of cases) {
      const grade = {
        ...cmsLiveV6ExplainabilityGrade(submission, row.packet),
        selectionScore: row.score,
        buildReady: false,
        evaluation: {
          ...cmsLiveV6ExplainabilityGrade(submission, row.packet).evaluation!,
          decision: row.decision,
          selectionScore: row.score,
          portfolioAdjustedScore: row.score,
        },
      };
      const explain = composeFounderExplainability({
        submission,
        grade,
        packet: row.packet,
        layers: row.packet.monetizationLayers,
      });
      grade.explainability = explain;
      grade.comparableEconomics = explain.comparables;
      store.grades.set(submission.id, grade);
      submission.infinityDecision = row.decision;
      submission.status = row.status;
      store.submissions.set(submission.id, submission);
      const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
      const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
      const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
      const detail = buildEntityDetail(inspector);
      const buildMetric = detail.insights.metrics.find((item) => item.id === "build-readiness");
      expect(detail.decision).toBe(row.decision);
      expect(buildMetric?.label).toBe("Build readiness");
      expect(buildMetric?.value).toBe("NO");
      expect(buildMetric?.value).not.toBe(row.decision);
      expect(grade.buildReady).toBe(false);
      expect(grade.selectionScore).toBe(row.score);
    }
  });

  it("labels direct vs inference vs founder hypothesis vs unknown", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "kinds" }));
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.explainability?.keyFindings.some((item) => item.displayKind === "SOURCE_BACKED_FINDING")).toBe(true);
    expect(grade?.explainability?.keyFindings.some((item) => item.displayKind === "INFINITY_INFERENCE")).toBe(true);
    expect(grade?.explainability?.keyFindings.some((item) => item.displayKind === "FOUNDER_HYPOTHESIS")).toBe(true);
    expect(grade?.explainability?.economics.pricingAnswer).not.toMatch(/AI thinks/);
    expect(grade?.comparableEconomics?.pricing.rationale).toMatch(/FOUNDER_HYPOTHESIS/);
    expect(grade?.comparableEconomics?.pricing.provenance).not.toBe("OBSERVED");
    expect(grade?.comparableEconomics?.pricing.provenance).not.toBe("FOUNDER_HYPOTHESIS");
  });
});

describe("HQ + authority regressions", () => {
  it("surfaces explainability sections on founder idea artifacts without granting spend or launch", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "hq" }));
    convertFounderIdeaToCandidate(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: cmsComparableEconomicsPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.buildReady).toBe(false);
    expect(grade?.comparableEconomics?.buildImplication.modeledSatisfiesBuild).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    expect(founder?.metadata.whyDecision).toBeTruthy();
    expect(founder?.metadata.pricingRecommendation).toBeTruthy();
    expect(founder?.metadata.economicProvenance).toBe("COMPARABLE_MODELED");
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const titles = inspector.sections.map((section) => section.title);
    expect(titles).toContain("Executive summary");
    expect(titles).toContain("Why Infinity chose this decision");
    expect(titles).toContain("Evidence");
    expect(titles).toContain("Key insights");
    expect(titles).toContain("Score breakdown");
    expect(titles).toContain("Market + competition");
    expect(titles).toContain("Pricing recommendation");
    expect(titles).toContain("Comparable businesses");
    expect(titles).toContain("Modeled unit economics");
    expect(titles).toContain("Risks + uncertainties");
    expect(titles).toContain("Next validation steps");
    expect(titles).toContain("Source trace");
    const detail = buildEntityDetail(inspector);
    const metricIds = detail.insights.metrics.map((item) => item.id);
    expect(new Set(metricIds).size).toBe(metricIds.length);
    expect(detail.insights.metrics.filter((item) => item.label === "Selection score")).toHaveLength(1);
    expect(detail.insights.metrics.filter((item) => item.label === "Validation score")).toHaveLength(1);
    expect(detail.insights.metrics.filter((item) => item.label === "Monetization score")).toHaveLength(1);
    expect(detail.insights.metrics.some((item) => item.label === "Portfolio-adjusted score")).toBe(true);
    expect(detail.insights.metrics.some((item) => item.label === "VALIDATE threshold")).toBe(true);
    expect(detail.insights.metrics.some((item) => item.label === "REJECT threshold")).toBe(true);
    expect(founder?.metadata.opportunityScore).toBe(grade?.opportunityQuality);
    expect(founder?.metadata.selectionScore).toBe(grade?.selectionScore);
    expect(founder?.metadata.validationScore).toBe(grade?.validationScore);
    expect(founder?.metadata.monetizationScore).toBe(grade?.monetizationScore);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null }).buildReady).toBe(false);
  });
});
