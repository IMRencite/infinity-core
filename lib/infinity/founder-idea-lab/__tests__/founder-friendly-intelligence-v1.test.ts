import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { composeFounderExplainability, flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderFriendlyBrief } from "../explainability/founder-brief";
import {
  DECISION_DISPLAY,
  STATUS_DISPLAY,
  revenueModelSentence,
  translateDecision,
  translateStatus,
} from "../explainability/founder-language";
import { buildFounderIntelligenceView } from "../explainability/view";
import { founderFriendlyPrimarySections, primarySectionBlob } from "../hq/founder-intelligence-primary";
import { analyzeFounderIdea } from "../analyze";
import { convertFounderIdeaToCandidate } from "../convert";
import { infinityCmsLiveV5ReplayPacket, cmsMoneyResearchAfterPacket } from "../integrity-fixtures";
import { submitFounderIdea } from "../submit";
import { FounderIdeaStore } from "../store";
import type { FounderIdeaSubmissionInput } from "../types";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";

const ORG = "org-founder-friendly-v1";

function cmsHoldStore(packetFactory = infinityCmsLiveV5ReplayPacket) {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, {
    organizationId: ORG,
    submittedByUserId: "user-a",
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "cost per month depending on your package",
    idempotencyKey: "founder-friendly-v1",
  } satisfies FounderIdeaSubmissionInput);
  convertFounderIdeaToCandidate(store, submission);
  const packet = packetFactory(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade) throw new Error("GRADE_MISSING");
  submission.infinityDecision = "HOLD";
  submission.status = "HELD";
  grade.opportunityQuality = 69.73;
  grade.selectionScore = 52.94;
  grade.validationScore = 60.15;
  grade.monetizationScore = 54;
  grade.evaluation = {
    ...grade.evaluation!,
    decision: "HOLD",
    selectionScore: 52.94,
    portfolioAdjustedScore: 52.94,
  };
  grade.explainability = composeFounderExplainability({
    submission,
    grade,
    packet,
    layers: packet.monetizationLayers,
  });
  grade.comparableEconomics = grade.explainability.comparables;
  grade.scoreIntegrity = "EVIDENCE_GROUNDED";
  grade.readyForDecision = true;
  grade.buildReady = false;
  store.grades.set(submission.id, grade);
  store.submissions.set(submission.id, submission);
  return { store, submission, grade, packet };
}

describe("founder-friendly intelligence explanation v1", () => {
  it("translates internal enums into founder language", () => {
    expect(translateDecision("HOLD")).toBe("Hold for now");
    expect(translateDecision("VALIDATE")).toBe("Worth testing");
    expect(translateDecision("BUILD")).toBe("Ready to build");
    expect(translateDecision("REJECT")).toBe("Do not pursue");
    expect(translateStatus("REVENUE_MODEL_INSUFFICIENT")).toBe("We still need better money-model evidence");
    expect(translateStatus("INSUFFICIENT_DATA")).toBe("Not enough data yet");
    expect(translateStatus("COMPARABLE_MODELED")).toBe("Estimated from similar businesses");
    expect(translateStatus("EVIDENCE_GROUNDED")).toBe("Based on researched evidence");
    expect(translateStatus("UNKNOWN")).toBe("Not known yet");
    expect(revenueModelSentence("HYBRID_SOFTWARE_SERVICE")).toBe(
      "Monthly software subscription + setup fee + optional SEO/content services",
    );
    expect(DECISION_DISPLAY.HOLD).toBe("Hold for now");
    expect(STATUS_DISPLAY.COMPARABLE_MODELED).toBe("Estimated from similar businesses");
  });

  it("builds a CMS read-only founder brief from evidence, not hardcoded copy", () => {
    const { grade, packet } = cmsHoldStore();
    const view = buildFounderIntelligenceView(grade.explainability!);
    const metadata = flattenExplainabilityForHq(grade.explainability!);
    metadata.opportunityScore = 69.73;
    metadata.selectionScore = 52.94;
    metadata.buildReady = false;
    metadata.infinityDecision = "HOLD";
    const brief = buildFounderFriendlyBrief(view, metadata);

    expect(brief.takeLabel).toBe("Hold for now");
    expect(brief.takeExplanation).toMatch(/real opportunity/i);
    expect(brief.takeExplanation).not.toMatch(/HOLD|VALIDATE|portfolioAdjustedScore|REVENUE_MODEL/);
    expect(brief.looksGood.length).toBeGreaterThan(0);
    expect(brief.looksGood.some((item) => /CMS|website|SMB|search|AEO|SEO/i.test(item))).toBe(true);
    expect(brief.looksGood.join(" ")).not.toMatch(/capital_efficiency|speed_to_revenue/);
    expect(brief.holdingBack.join("\n")).toMatch(/charge|pricing/i);
    expect(brief.holdingBack.join("\n")).toMatch(/acquisition cost/i);
    expect(brief.holdingBack.join("\n")).toMatch(/retention|churn/i);
    expect(brief.holdingBack.join(" ")).not.toMatch(/capital_efficiency|speed_to_revenue|COMPARABLE_MODELED/);
    expect(brief.nextResearch.length).toBeGreaterThanOrEqual(3);
    expect(brief.nextResearch.length).toBeLessThanOrEqual(5);
    expect(brief.money.unknown).toBe(true);
    expect(brief.money.explanation).toBe("We have not found enough real pricing data yet to recommend a money model.");
    expect(brief.money.recommended).toBe("Not enough evidence yet");
    expect(brief.build.ready).toBe("NO");
    expect(brief.build.why).toMatch(/customer acquisition cost/i);
    expect(brief.build.modeledNote).toMatch(/not enough to approve a build/i);
    expect(brief.scores.opportunity).toBe("69.73");
    expect(brief.scores.decision).toBe("52.94");
    expect(brief.scores.validateThreshold).toBe("58");
    expect(brief.scores.explanation).toMatch(/promising/i);
    expect(brief.scores.decisionExplanation).toMatch(/holding the idea/i);
    expect(JSON.stringify(brief)).not.toMatch(/SOURCE_BACKED_FINDING/);
    expect(packet.findings.some((item) => brief.looksGood.some((line) => line.includes(item.claim.split(".")[0]!)))).toBe(true);
    expect(primarySectionBlob(founderFriendlyPrimarySections(view, metadata)).match(/UNKNOWN/g)?.length ?? 0).toBe(0);
  });

  it("simplifies comparables and consolidates UNKNOWN money fields", () => {
    const { grade } = cmsHoldStore();
    const view = buildFounderIntelligenceView(grade.explainability!);
    const metadata = flattenExplainabilityForHq(grade.explainability!);
    metadata.opportunityScore = 69.73;
    metadata.classifierMetric = 52.94;
    const brief = buildFounderFriendlyBrief(view, metadata);
    const hibu = brief.comparables.find((item) => /hibu/i.test(item.name));
    expect(hibu?.whatInfinityKnows).toMatch(/strategic overlap/i);
    expect(hibu?.whatInfinityDoesNotKnow).toMatch(/pricing/i);
    expect(brief.comparables.some((item) => /DealerSpike|Dealerspike/i.test(item.name))).toBe(true);
    expect(JSON.stringify(brief.comparables)).not.toMatch(/Strategic HIGH/);
    expect(brief.money.unknown).toBe(true);
    expect([brief.money.monthly, brief.money.setup, brief.money.upsells].join(" ")).not.toMatch(/UNKNOWN/);
    expect(brief.numbers.unknown).toBe(true);
    expect(brief.numbers.explanation).toBe("Not enough data yet.");
    expect(brief.numbers.stillNeeded).toEqual(expect.arrayContaining(["CAC", "LTV"]));
  });

  it("uses a human revenue sentence when money-model evidence exists", () => {
    const { grade } = cmsHoldStore(cmsMoneyResearchAfterPacket);
    const view = buildFounderIntelligenceView(grade.explainability!);
    const metadata = flattenExplainabilityForHq(grade.explainability!);
    metadata.opportunityScore = 69.73;
    metadata.classifierMetric = 52.94;
    const brief = buildFounderFriendlyBrief(view, metadata);
    if (brief.money.unknown) {
      expect(brief.money.explanation).toMatch(/pricing data/i);
    } else {
      expect(brief.money.recommended).not.toBe("HYBRID_SOFTWARE_SERVICE");
      expect(brief.money.recommended).toMatch(/subscription|setup|service/i);
    }
    expect(brief.build.ready).toBe("NO");
  });

  it("keeps technical values unchanged and advanced/system detail complete", () => {
    const { store, grade } = cmsHoldStore();
    const explain = grade.explainability!;
    expect(explain.decision.why).toMatch(/Classifier metric 52\.94 is below VALIDATE 58/);
    expect(explain.decision.classifierMetricField).toBe("portfolioAdjustedScore");
    expect(explain.scores.portfolioAdjustedScore.value).toBe(52.94);
    const view = buildFounderIntelligenceView(explain);
    expect(view.revenueModel?.coverage).toBe("REVENUE_MODEL_INSUFFICIENT");
    expect(view.howShouldThisMakeMoney?.recommendedModel).toBe("UNKNOWN");
    expect(view.economics.cac).toBe("UNKNOWN");

    const artifacts = buildFounderIdeaArtifacts(store, ORG);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    const titles = detail.intelligence.sections.map((section) => section.title);
    expect(titles[0]).toBe("Venture Command Deck");
    expect(titles).toEqual(
      expect.arrayContaining([
        "Venture Command Deck",
        "Infinity's Take",
        "What Looks Good",
        "What Is Holding It Back",
        "What Infinity Should Do Next",
        "Money",
        "What Similar Companies Are Doing",
        "How Strong Is This Idea?",
        "Evidence",
        "Risks",
        "Sources",
        "Executive Summary",
        "Score Breakdown",
        "Comparable Businesses",
        "Modeled Unit Economics",
        "Source Trace",
      ]),
    );
    expect(titles).not.toContain("How This Business Could Make Money");
    expect(titles).not.toContain("What The Market Says About The Numbers");
    expect(titles).not.toContain("Do The Numbers Look Good?");
    expect(detail.availableTabs[1]).toBe("money");
    expect(detail.money.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(["Money Summary", "What we know", "What we still need"]),
    );
    const primary = founderFriendlyPrimarySections(view, founder!.metadata);
    const primaryBlob = primarySectionBlob(primary);
    expect(primaryBlob).toContain("HOLD FOR NOW");
    expect(primaryBlob).not.toMatch(/portfolioAdjustedScore|REVENUE_MODEL_INSUFFICIENT|SOURCE_BACKED_FINDING|capital_efficiency|speed_to_revenue/);
    expect(primaryBlob.match(/UNKNOWN/g)?.length ?? 0).toBe(0);

    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact: founder! }));
    expect(html).toMatch(/Infinity(?:'|&#x27;|&apos;)s Take/);
    expect(html).toContain("HOLD FOR NOW");
    expect(html).toContain("Advanced Analysis / System View");
    expect(html).toContain("View Money");
    expect(html).toContain(">Money<");
    expect(html).toContain("See exact score calculation");
    expect(html).toContain("portfolioAdjustedScore");
    expect(html).toContain("REVENUE_MODEL_INSUFFICIENT");
    expect(html).toContain("SOURCE_BACKED_FINDING");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("INSUFFICIENT_DATA");
    expect(html).toContain("Classifier metric 52.94");
    expect(detail.availableTabs).toContain("system");
    expect(detail.system.rows.some((row) => row.label === "Submission ID")).toBe(true);
    expect(detail.system.rows.some((row) => /HOLD/.test(row.value) || row.label === "Infinity decision")).toBe(true);
  });

  it("does not put raw arithmetic in the primary score section", () => {
    const { grade } = cmsHoldStore();
    const view = buildFounderIntelligenceView(grade.explainability!);
    const metadata = flattenExplainabilityForHq(grade.explainability!);
    metadata.opportunityScore = 69.73;
    metadata.classifierMetric = 52.94;
    const primary = founderFriendlyPrimarySections(view, metadata);
    const score = primary.find((section) => section.id === "how-strong-is-this-idea");
    expect(score?.rows.some((row) => /52\.94 \/ 100/.test(row.value))).toBe(true);
    expect(score?.rows.some((row) => /69\.73 \/ 100/.test(row.value))).toBe(true);
    expect(score?.rows.some((row) => /58 to move into validation/.test(row.value))).toBe(true);
    expect(JSON.stringify(score)).not.toMatch(/threshold arithmetic|weighted sum|DEFAULT_SELECTION_WEIGHTS/i);
  });
});
