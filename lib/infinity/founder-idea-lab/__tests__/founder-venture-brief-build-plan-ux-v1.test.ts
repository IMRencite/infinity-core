import { createElement } from "react";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { createGovernedStore } from "@/lib/infinity/treasury/__tests__/fixtures";
import { analyzeFounderIdea } from "../analyze";
import { routeFounderBuild } from "../build-route";
import { convertFounderIdeaToCandidate } from "../convert";
import { BUILD_PLAN_AUTHORITY } from "../build-plan/types";
import { flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderIntelligenceView } from "../explainability/view";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { founderFriendlyPrimarySections, primarySectionBlob } from "../hq/founder-intelligence-primary";
import { founderMoneySections } from "../hq/founder-money-sections";
import { loadFounderIdeaStoreForOrg } from "../hq/load";
import { cmsBenchmarkEconomicsAfterPacket } from "../integrity-fixtures";
import { evaluateBuildReadiness } from "../readiness";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import type { FounderIdeaSubmissionInput } from "../types";

const LIVE_ORG = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const LIVE_CMS_ID = "69d45f14-ca07-4a30-b601-54af6d05953f";

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

function ideaInput(key: string): FounderIdeaSubmissionInput {
  return {
    organizationId: "org-venture-brief-build-plan-v1",
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

function persist() {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, ideaInput("ux"));
  convertFounderIdeaToCandidate(store, submission);
  const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
  submission.infinityDecision = "HOLD";
  submission.status = "HELD";
  grade.buildReady = false;
  store.grades.set(submission.id, grade);
  store.submissions.set(submission.id, submission);
  const view = buildFounderIntelligenceView(grade.explainability);
  const artifacts = buildFounderIdeaArtifacts(store, submission.organizationId);
  const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
  if (!founder) throw new Error("FOUNDER_ARTIFACT_MISSING");
  const detail = buildEntityDetail(buildArtifactInspectorModel(founder, artifacts.opportunity_lab ?? []));
  return { store, submission, grade, view, founder, detail };
}

describe("FUTURISTIC FOUNDER VENTURE BRIEF + BUILD PLAN UX V1", () => {
  it("renders the Venture Brief with profit terminology and no net-profit mislabeling", () => {
    const { view, detail } = persist();
    expect(view.ventureBrief?.heading).toBe("Infinity Venture Brief");
    expect(view.ventureBrief?.outlook.length).toBeGreaterThan(8);
    expect(view.ventureBrief?.metrics.map((item) => item.id)).toEqual(
      expect.arrayContaining(["core", "first-year", "contribution", "cac", "lifetime", "ltv", "ltv-cac", "payback", "margin"]),
    );
    expect(view.ventureBrief?.profit.labelsContributionNotNet).toBe(true);
    expect(view.ventureBrief?.profit.setupProfitIncluded).toBe(false);
    expect(JSON.stringify(view.ventureBrief)).not.toMatch(/estimated net profit|call(?:ed|s) (?:it )?net profit/i);
    expect(view.ventureBrief?.profit.labelsContributionNotNet).toBe(true);
    expect(view.ventureBrief?.grantsBuild).toBe(false);
    expect(detail.money.sections[0]?.title).toBe("Infinity Venture Brief");
    expect(detail.money.sections.some((section) => section.id === "money-how-it-works")).toBe(true);
    expect(detail.money.sections.find((section) => section.id === "money-best-estimate")?.collapsible).toBe(true);
    const blob = JSON.stringify(detail.money.sections);
    expect(blob).toMatch(/contribution profit/i);
    expect(blob).toMatch(/not final company net profit/i);
    expect(blob).not.toMatch(/estimated net profit|labeled (?:as )?net profit/i);
    expect(blob).not.toMatch(/BENCHMARK_PARTIAL|INDEPENDENCE_UNKNOWN|COMPARABLE_MODELED/);
  });

  it("renders market advantage, market-vs-Infinity, and a read-only build plan mapped to canonical systems", () => {
    const { view, detail, store, submission, grade } = persist();
    expect(view.ventureBrief?.advantage.biggestProblem.length).toBeGreaterThan(8);
    expect(view.ventureBrief?.whyThisCouldWin.length).toBeGreaterThan(0);
    expect(view.ventureBrief?.marketVsInfinity.length).toBeGreaterThan(0);
    expect(view.buildPlan?.heading).toBe("How Infinity Could Build This");
    expect(view.buildPlan?.phases).toHaveLength(11);
    expect(view.buildPlan?.phases.every((phase) => phase.systems.length > 0)).toBe(true);
    expect(view.buildPlan?.sequence.some((item) => item.sequence === "MVP")).toBe(true);
    expect(view.buildPlan?.mvp.coreProblem.length).toBeGreaterThan(5);
    expect(view.buildPlan?.currentPosition).not.toMatch(/READY TO BUILD/i);
    expect(view.buildPlan?.authority).toEqual(BUILD_PLAN_AUTHORITY);
    expect(view.buildPlan?.grantsBuild).toBe(false);
    const titles = detail.intelligence.sections.map((section) => section.title);
    expect(titles[0]).toBe("Venture Command Deck");
    expect(titles).toEqual(
      expect.arrayContaining([
        "Why This Could Win",
        "Customer Problems & Product Advantage",
        "What Infinity Should Do Differently",
        "How Infinity Could Build This",
        "Market today vs what Infinity could do differently",
      ]),
    );
    expect(titles.indexOf("Why This Could Win")).toBeLessThan(titles.indexOf("How Infinity Could Build This"));
    const primary = founderFriendlyPrimarySections(view, flattenExplainabilityForHq(grade.explainability!));
    expect(primarySectionBlob(primary)).not.toMatch(/BENCHMARK_PARTIAL|INDEPENDENCE_UNKNOWN|COMPARABLE_MODELED|QUALITY_REPLACEMENT_EXHAUSTED/);
    expect(detail.intelligence.sections.find((section) => section.id === "build-plan-system")?.rows.some((row) => row.value === "false")).toBe(true);
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade.evaluation }).buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    expect(assertFounderSpendStillTreasuryGated(treasury, submission).authorized).toBe(false);
  });

  it("applies table readability, compact confidence, and collapsed breakdown in the HQ chrome", () => {
    const { detail, founder } = persist();
    const html = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["money"] }, artifact: founder }),
    );
    const intelligenceHtml = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["intelligence"] }, artifact: founder }),
    );
    expect(html).toContain("hq-founder-table");
    expect(html).toContain("hq-founder-table-row");
    expect(html).toContain("hq-founder-num");
    expect(html).toContain("hq-confidence-dot");
    expect(html).toContain("See the breakdown");
    expect(intelligenceHtml).toContain("hq-founder-path");
    const ui = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(ui).toContain("aria-expanded");
    expect(ui).toContain("hq-founder-table-scroll");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".hq-founder-table-row:nth-child(even)");
    expect(css).toContain(".hq-founder-table-row:hover");
    expect(css).toContain(".hq-founder-table-row:focus-within");
    expect(css).toContain("position: sticky");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("overflow-x: auto");
    expect(css).not.toContain("neon arcade");
    expect(founderMoneySections(null, {}).length).toBeGreaterThan(0);
  });

  it(
    "replays the real attempt-9 packet into Venture Brief, profit, and build plan without writes",
    async () => {
      if (!loadEnvLocal()) return;
      const store = await loadFounderIdeaStoreForOrg(createAdminClient() as never, LIVE_ORG);
      const grade = store.grades.get(LIVE_CMS_ID);
      expect(grade?.explainability).toBeTruthy();
      const view = buildFounderIntelligenceView(grade!.explainability!);
      expect(view.ventureBrief?.metrics.find((item) => item.id === "core")?.primary).toMatch(/\$/);
      expect(view.ventureBrief?.profit.monthlyRevenue).toMatch(/\$/);
      expect(view.ventureBrief?.profit.monthlyContributionProfit).toMatch(/\$|Not known yet/);
      expect(view.ventureBrief?.advantage.biggestProblem.length).toBeGreaterThan(8);
      expect(view.buildPlan?.phases).toHaveLength(11);
      expect(view.buildPlan?.currentPosition).not.toMatch(/READY TO BUILD/i);
      expect(view.buildPlan?.authority.canCreateMissions).toBe(false);
      const artifacts = buildFounderIdeaArtifacts(store, LIVE_ORG);
      const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea" && item.sourceRecordId === LIVE_CMS_ID);
      expect(founder).toBeTruthy();
      const detail = buildEntityDetail(buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []));
      expect(detail.money.sections[0]?.title).toBe("Infinity Venture Brief");
      expect(detail.intelligence.sections.some((section) => section.id === "how-infinity-could-build-this")).toBe(true);
      expect(JSON.stringify(view.ventureBrief)).not.toMatch(/COMPARABLE_MODELED|promising_but_unvalidated|BENCHMARK_PARTIAL|INDEPENDENCE_UNKNOWN/);
    },
    30000,
  );
});
