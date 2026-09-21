import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import type { HQDetailTab } from "@/lib/infinity/operator-console/details/entity-detail-types";
import { createGovernedStore } from "@/lib/infinity/treasury/__tests__/fixtures";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { convertFounderIdeaToCandidate } from "../convert";
import { composeFounderExplainability, flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderMoneyView } from "../explainability/money-view";
import { buildFounderIntelligenceView } from "../explainability/view";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { cmsBenchmarkEconomicsAfterPacket, infinityCmsLiveV5ReplayPacket } from "../integrity-fixtures";
import { evaluateBuildReadiness } from "../readiness";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import type { FounderIdeaSubmissionInput } from "../types";

const ORG = "org-founder-money-tab-v1";

function ideaInput(idempotencyKey: string): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG,
    submittedByUserId: "user-a",
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "cost per month depending on your package",
    idempotencyKey,
  };
}

function persistStore(packetFactory: typeof infinityCmsLiveV5ReplayPacket, key: string) {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, ideaInput(key));
  convertFounderIdeaToCandidate(store, submission);
  const packet = packetFactory(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
  submission.infinityDecision = "HOLD";
  submission.status = "HELD";
  grade.buildReady = false;
  store.grades.set(submission.id, grade);
  store.submissions.set(submission.id, submission);
  const artifacts = buildFounderIdeaArtifacts(store, ORG);
  const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
  if (!founder) throw new Error("FOUNDER_ARTIFACT_MISSING");
  const inspector = buildArtifactInspectorModel(founder, artifacts.opportunity_lab ?? []);
  const detail = buildEntityDetail(inspector);
  return { store, submission, grade, packet, founder, detail };
}

describe("FOUNDER IDEA MONEY TAB V1", () => {
  it("adds a selectable Money tab in the preferred order without research or writes", () => {
    const { detail, founder } = persistStore(cmsBenchmarkEconomicsAfterPacket, "nav");
    expect(detail.availableTabs).toEqual([
      "intelligence",
      "money",
      "overview",
      "insights",
      "evidence",
      "timeline",
      "system",
    ] satisfies HQDetailTab[]);
    expect(detail.money.sections.length).toBeGreaterThan(3);
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact: founder }));
    expect(html).toContain(">Intelligence<");
    expect(html).toContain(">Money<");
    expect(html).toContain("View Money");
    const tabIndex = html.indexOf("hq-output-detail-tabs");
    const intelligenceAt = html.indexOf(">Intelligence<", tabIndex);
    const moneyAt = html.indexOf(">Money<", tabIndex);
    const overviewAt = html.indexOf(">Overview<", tabIndex);
    expect(intelligenceAt).toBeGreaterThan(-1);
    expect(moneyAt).toBeGreaterThan(intelligenceAt);
    expect(overviewAt).toBeGreaterThan(moneyAt);
    const uiSource = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"),
      "utf8",
    );
    expect(uiSource).toContain('money: "Money"');
    expect(uiSource).toContain('case "money"');
    expect(uiSource).toContain("setActiveTab(tab)");
    expect(uiSource).not.toMatch(/analyzeFounderIdea|executeResearch|createResearchRun/);
    const moneyViewSource = readFileSync(
      join(process.cwd(), "lib/infinity/founder-idea-lab/explainability/money-view.ts"),
      "utf8",
    );
    expect(moneyViewSource).not.toMatch(/: any\b|as any\b/);
    expect(moneyViewSource).not.toMatch(/analyzeFounderIdea|researchBenchmarkEconomics|researchRevenueModel/);
  });

  it("renders founder-facing money summary from persisted intelligence", () => {
    const { detail, grade, founder } = persistStore(cmsBenchmarkEconomicsAfterPacket, "summary");
    const view = buildFounderIntelligenceView(grade.explainability!);
    const money = buildFounderMoneyView(view, flattenExplainabilityForHq(grade.explainability!));
    const before = JSON.stringify(view);
    buildFounderMoneyView(view, flattenExplainabilityForHq(grade.explainability!));
    expect(JSON.stringify(view)).toBe(before);
    expect(money.empty).toBe(false);
    expect(money.summary.recommendedModel).not.toMatch(/UNKNOWN|HYBRID_SOFTWARE_SERVICE/);
    expect(money.summary.monthlyRevenuePerCustomer).toBeTruthy();
    expect(money.summary.cac).toBeTruthy();
    expect(money.summary.ltv).toBeTruthy();
    expect(money.summary.ltvCac).toBeTruthy();
    expect(money.summary.grossMargin).toBeTruthy();
    expect(money.summary.payback).toBeTruthy();
    expect(money.summary.economicAttractiveness).toMatch(/Promising but unvalidated|Attractive|Marginal|Unattractive|Not enough data/);
    const titles = detail.money.sections.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Money Summary",
        "Actual venture numbers",
        "Market estimates",
        "How this business makes money",
        "Pricing & Packaging",
        "Revenue per customer",
        "What the market says about the numbers",
        "Customer acquisition cost",
        "Customer value",
        "LTV/CAC",
        "CAC payback period",
        "What could this look like at scale?",
        "What similar businesses tell us",
        "Revenue streams & upsells",
        "What could break the economics?",
        "What we need to learn before building",
        "Source evidence",
      ]),
    );
    const blob = JSON.stringify(detail.money.sections);
    expect(blob).toContain("Not measured yet");
    expect(blob).toContain("SCENARIO — NOT FORECAST");
    expect(blob).toContain("MODELED — NOT OBSERVED");
    expect(blob).toContain("contribution margin");
    expect(blob).not.toMatch(/PROMISING_BUT_UNVALIDATED/);
    const actual = detail.money.sections.find((section) => section.id === "money-actual");
    const estimated = detail.money.sections.find((section) => section.id === "money-estimated");
    expect(actual?.toneGroup).toBe("actual");
    expect(estimated?.toneGroup).toBe("estimated");
    expect(actual?.rows.every((row) => row.value === "Not measured yet")).toBe(true);
    expect(estimated?.rows.some((row) => row.value === "Not measured yet")).toBe(false);
    const scenarios = detail.money.sections.find((section) => section.id === "money-scenarios");
    expect(scenarios?.rows.map((row) => row.label)).toEqual(["10 customers", "25 customers", "50 customers", "100 customers"]);
    expect(scenarios?.badge).toBe("SCENARIO — NOT FORECAST");
    const names = detail.money.sections
      .find((section) => section.id === "money-comparables")
      ?.rows.map((row) => row.label.toLowerCase()) ?? [];
    expect(new Set(names).size).toBe(names.length);
    const strategic = money.comparables.filter((item) => item.strategicOnly || item.noEconomicEvidence);
    expect(strategic.every((item) => /no economic evidence/i.test(item.knownPricing))).toBe(true);
    expect(money.benchmarks.length).toBeGreaterThan(0);
    expect(money.benchmarks.some((item) => item.metric === "CAC" || /CAC|Churn|margin/i.test(item.metric))).toBe(true);
    expect(JSON.stringify(money.benchmarks)).not.toMatch(/obs_[0-9a-f-]{8}/i);
    const moneyHtml = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["money"] }, artifact: founder }),
    );
    expect(moneyHtml).toContain("Money Summary");
    expect(moneyHtml).toContain("SCENARIO — NOT FORECAST");
    expect(moneyHtml).toContain("hq-money-card-grid");
    expect(moneyHtml).toContain("Not measured yet");
    expect(moneyHtml).not.toContain("View Money");
  });

  it("shows an empty state instead of a wall of UNKNOWN values", () => {
    const { detail, grade } = persistStore(infinityCmsLiveV5ReplayPacket, "empty");
    const view = buildFounderIntelligenceView(grade.explainability!);
    const money = buildFounderMoneyView(view, flattenExplainabilityForHq(grade.explainability!));
    expect(money.empty).toBe(true);
    const titles = detail.money.sections.map((section) => section.title);
    expect(titles).toEqual([
      "Infinity Venture Brief",
      "Infinity's Best Estimate",
      "Money Summary",
      "What we know",
      "What we still need",
      "What Infinity should research next",
    ]);
    const blob = JSON.stringify(detail.money.sections);
    expect(blob).toContain("We do not have enough market evidence yet to estimate the economics of this idea.");
    expect(blob).toContain("pricing");
    expect(blob).toContain("CAC");
    expect(blob.match(/UNKNOWN/g)?.length ?? 0).toBe(0);
    expect(detail.intelligence.sections.some((section) => section.id === "intelligence-money-summary")).toBe(true);
    expect(detail.intelligence.sections.some((section) => section.id === "money-summary")).toBe(false);
    expect(detail.intelligence.sections.find((section) => section.id === "intelligence-money-summary")?.rows).toHaveLength(3);
  });

  it("keeps System View technical economics and does not open BUILD or Treasury", () => {
    const { detail, grade, submission, store } = persistStore(cmsBenchmarkEconomicsAfterPacket, "gates");
    expect(detail.availableTabs).toContain("system");
    expect(detail.intelligence.sections.some((section) => section.id === "benchmark-economics-system")).toBe(true);
    const system = detail.intelligence.sections.find((section) => section.id === "benchmark-economics-system");
    expect(JSON.stringify(system)).toMatch(/BENCHMARK_|COMPARABLE_MODELED|CATEGORY_BENCHMARK|UNKNOWN/);
    expect(grade.buildReady).toBe(false);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade.evaluation ?? null }).buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
  });
});
