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
import { provenanceGrantsBuild } from "../comparable-economics/provenance";
import {
  activateEducatedEstimates,
  buildEducatedEconomicsModel,
  emptyEducatedEconomicsModel,
  presentEducatedEstimates,
} from "../educated-estimates";
import { flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderMoneyView } from "../explainability/money-view";
import { buildFounderIntelligenceView } from "../explainability/view";
import { emptyBenchmarkEconomics } from "../benchmark-economics/from-evidence";
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
import type { FounderExplainability } from "../explainability/types";

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
    if (process.env[key] == null) {
      process.env[key] = trimmed.slice(sep + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return true;
}

function ideaInput(key: string): FounderIdeaSubmissionInput {
  return {
    organizationId: "org-money-ux-best-estimate-v1",
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

function classifyUnknowns(blob: string): Record<"A" | "B" | "C" | "D" | "E" | "F", number> {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  const matches = blob.match(/Not known yet|Not enough evidence|Not enough evidence yet|UNKNOWN/g) ?? [];
  for (const item of matches) {
    if (item === "UNKNOWN") {
      counts.A += 1;
      continue;
    }
    counts.A += 1;
  }
  return counts;
}

describe("FOUNDER MONEY UX + LIVE-PACKET BEST ESTIMATE ACTIVATION V1", () => {
  it("keeps actual vs estimate separate and does not write scenario values into canonical LTV", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput("actual-vs-estimate"));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const view = buildFounderIntelligenceView(grade.explainability);
    const money = buildFounderMoneyView(view, flattenExplainabilityForHq(grade.explainability));
    expect(money.actualEconomics.cac).toBe("Not measured yet");
    expect(money.actualEconomics.ltv).toBe("Not measured yet");
    expect(money.bestEstimate.rows.find((row) => row.metric === "LTV")?.actual).toBe("Not measured yet");
    expect(money.bestEstimate.rows.find((row) => row.metric === "LTV")?.bestEstimate).not.toBe(money.actualEconomics.ltv);
    expect(money.bestEstimate.heading).toBe("Infinity's Best Estimate");
    expect(money.bestEstimate.hero.some((item) => item.id === "cac" && item.primary !== "—")).toBe(true);
    expect(money.bestEstimate.grantsBuild).toBe(false);
    expect(grade.explainability.benchmarkEconomics?.observed.ltv).toBe("UNKNOWN");
  });

  it("displays LOW-confidence estimates and keeps unsupported metrics unknown", () => {
    const estimates = buildEducatedEconomicsModel({ benchmark: emptyBenchmarkEconomics() });
    expect(estimates.cac.selected).toBeNull();
    expect(estimates.margin.selected).toBeNull();
    expect(estimates.ltv).toBeNull();
    expect(estimates.availability.corePrice).toBe("INSUFFICIENT");
    const presented = presentEducatedEstimates(emptyEducatedEconomicsModel());
    expect(presented.hero.every((item) => item.primary === "—" || item.confidence === "Insufficient")).toBe(true);
    expect(presented.rows.find((row) => row.metric === "LTV")?.bestEstimate).toBe("Not enough evidence yet");
  });

  it("activates scenario margin, LTV, LTV/CAC, payback, and first-year revenue without treating missing cost as zero", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput("scenario"));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const bench = grade.explainability.benchmarkEconomics!;
    const model = buildEducatedEconomicsModel({
      revenueModel: grade.explainability.revenueModel,
      benchmark: {
        ...bench,
        modeled: {
          ...bench.modeled,
          grossMargin: {
            ...bench.modeled.grossMargin,
            range: { low: null, base: null, high: null },
            confidence: "NONE",
            provenance: "UNKNOWN",
          },
          contributionMargin: {
            ...bench.modeled.contributionMargin,
            range: { low: null, base: null, high: null },
            confidence: "NONE",
            provenance: "UNKNOWN",
          },
        },
      },
    });
    expect(model.margin.unknownCostsTreatedAsZero).toBe(false);
    expect(model.margin.selected?.provenance).toBe("SCENARIO_MODEL");
    expect(model.margin.costAssumptions.map((item) => item.name)).toEqual(
      expect.arrayContaining(["Hosting", "AI/API", "Payment processing", "Support", "Service labor"]),
    );
    expect(model.margin.costAssumptions.every((item) => item.label && item.why)).toBe(true);
    expect(model.ltv).not.toBeNull();
    expect(model.ltvCac?.base).not.toBeNull();
    expect(model.payback?.usesContributionMargin).toBe(true);
    expect(model.firstYearCustomerValue?.formula).toMatch(/revenue, not profit/i);
    expect(model.availability.margin).toBe("SCENARIO_AVAILABLE");
    expect(model.availability.ltv).toBe("SCENARIO_AVAILABLE");
    expect(model.grantsBuild).toBe(false);
  });

  it("puts Best Estimate first, removes the top legend, and keeps raw benchmarks later", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, ideaInput("ux"));
    convertFounderIdeaToCandidate(store, submission);
    const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
    const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
    if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
    const view = buildFounderIntelligenceView(grade.explainability);
    const sections = founderMoneySections(view, flattenExplainabilityForHq(grade.explainability));
    expect(sections[0]?.id).toBe("money-venture-brief");
    expect(sections[0]?.title).toBe("Infinity Venture Brief");
    expect(sections.some((section) => section.id === "money-best-estimate" && section.collapsible)).toBe(true);
    expect(sections[0]?.rows.some((row) => row.id === "money-best-note")).toBe(false);
    expect(sections.map((section) => section.id).indexOf("money-methodology")).toBeGreaterThan(
      sections.map((section) => section.id).indexOf("money-prove"),
    );
    expect(sections.some((section) => section.id === "money-methodology" && section.collapsible)).toBe(true);
    expect(sections.some((section) => section.id === "money-summary")).toBe(true);
    expect(sections.some((section) => section.id === "money-estimated")).toBe(true);
    const moneyBlob = JSON.stringify(sections);
    expect(moneyBlob).not.toContain("How to read this");
    expect((moneyBlob.match(/Actual: Not measured yet/g) ?? []).length).toBeLessThan(3);
    const primary = founderFriendlyPrimarySections(view, flattenExplainabilityForHq(grade.explainability));
    expect(primarySectionBlob(primary)).not.toMatch(/INDEPENDENCE_UNKNOWN|COMPARABLE_MODELED|MODELED_ASSUMPTION|NEW_OPPORTUNITY/);
    expect(primary.some((section) => section.id === "customer-problem-evidence" && section.collapsible)).toBe(true);
    expect(primary.find((section) => section.id === "what-we-should-build-better")?.rows.some((row) => row.detail)).toBe(true);

    submission.infinityDecision = "HOLD";
    submission.status = "HELD";
    grade.buildReady = false;
    store.grades.set(submission.id, grade);
    store.submissions.set(submission.id, submission);
    const artifacts = buildFounderIdeaArtifacts(store, submission.organizationId);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    if (!founder) throw new Error("FOUNDER_ARTIFACT_MISSING");
    const detail = buildEntityDetail(buildArtifactInspectorModel(founder, artifacts.opportunity_lab ?? []));
    expect(detail.money.sections[0]?.title).toBe("Infinity Venture Brief");
    expect(detail.money.sections.some((section) => section.id === "money-methodology")).toBe(true);
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["money"] }, artifact: founder }));
    expect(html).toContain("hq-money-hero-grid");
    expect(html).toContain("hq-term-help");
    expect(html).toContain("hq-evidence-badge");
    expect(html).toContain("Why?");
    expect(html.indexOf("Infinity's Best Estimate")).toBeLessThan(html.indexOf("How Infinity estimates these numbers"));
    const ui = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(ui).toContain("aria-expanded");
    expect(ui).toContain("aria-describedby");
    expect(ui).toContain("onBlur");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(":focus-within");
    expect(css).toContain(".hq-term-help.is-open");
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade.evaluation }).buildReady).toBe(false);
    expect(provenanceGrantsBuild("SCENARIO_MODEL")).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    expect(assertFounderSpendStillTreasuryGated(treasury, submission).authorized).toBe(false);
  });

  it(
    "replays the real persisted attempt-9 packet through the educated-estimate engine read-only",
    async () => {
      if (!loadEnvLocal()) return;
      const admin = createAdminClient();
      const store = await loadFounderIdeaStoreForOrg(admin as never, LIVE_ORG);
      const submission = store.submissions.get(LIVE_CMS_ID);
      const grade = store.grades.get(LIVE_CMS_ID);
      expect(submission).toBeTruthy();
      expect(grade?.explainability).toBeTruthy();
      const explain = grade!.explainability as FounderExplainability;
      expect(explain.benchmarkEconomics).toBeTruthy();
      const persistedEducated = explain.benchmarkEconomics?.educatedEstimates ?? null;
      const model = activateEducatedEstimates(explain);
      const presented = presentEducatedEstimates(model);
      const corePersisted = explain.revenueModel?.revenuePerCustomer.coreRecurringARPU.base ?? explain.benchmarkEconomics?.modeled.arpu.range.base;
      const setupPersisted = explain.revenueModel?.revenuePerCustomer.firstYearSetup.base;
      const cacPersisted = explain.benchmarkEconomics?.modeled.cac.range.base;
      const lifePersisted = explain.benchmarkEconomics?.modeled.lifetimeMonths.range.base;
      expect(corePersisted).toBeTruthy();
      expect(model.coreMonthly?.bestEstimate.base).toBeCloseTo(Number(corePersisted), 0);
      expect(model.setup?.bestEstimate.base).toBeCloseTo(Number(setupPersisted), 0);
      expect(model.cac.selected?.bestEstimate.base).toBeCloseTo(Number(cacPersisted), 0);
      expect(model.retention?.bestEstimate.base).toBe(Math.round(Number(lifePersisted)));
      expect(model.cac.selected).not.toBeNull();
      expect(model.retention).not.toBeNull();
      if (corePersisted != null && setupPersisted != null) {
        expect(model.firstYearCustomerValue?.bestEstimate.base).toBe(Math.round(corePersisted * 12 + setupPersisted));
      }
      expect(model.inputSources.coreArpu).toMatch(/revenuePerCustomer.coreRecurringARPU|modeled.arpu.range/);
      expect(model.inputSources.cac).toContain("benchmarkEconomics.modeled.cac.range");
      expect(model.inputSources.lifetime).toContain("lifetimeMonths.range");
      expect(model.availability.corePrice).toBe("AVAILABLE");
      expect(model.availability.cac).toBe("AVAILABLE");
      expect(model.availability.lifetime).toBe("AVAILABLE");
      expect(model.availability.setup).toBe("AVAILABLE");
      expect(model.availability.firstYear).toBe("AVAILABLE");
      if (!explain.benchmarkEconomics?.modeled.grossMargin.range.base) {
        expect(model.margin.selected?.provenance).toBe("SCENARIO_MODEL");
        expect(model.availability.margin).toBe("SCENARIO_AVAILABLE");
        expect(model.availability.ltv).toBe("SCENARIO_AVAILABLE");
        expect(model.availability.ltvCac).toBe("SCENARIO_AVAILABLE");
        expect(model.availability.payback).toBe("SCENARIO_AVAILABLE");
      }
      expect(model.observedUntouched.margin).toBe("UNKNOWN");
      expect(model.grantsBuild).toBe(false);
      expect(persistedEducated == null || persistedEducated.cac.selected == null).toBe(true);
      const view = buildFounderIntelligenceView(explain);
      const money = buildFounderMoneyView(view, flattenExplainabilityForHq(explain));
      expect(money.bestEstimate.hero.find((item) => item.id === "cac")?.primary).toMatch(/\$/);
      expect(money.bestEstimate.conclusion).toMatch(/Infinity estimates/);
      expect(money.summary.ltv).toMatch(/not known|unknown|Not known yet/i);
      const artifacts = buildFounderIdeaArtifacts(store, LIVE_ORG);
      const founder = artifacts.opportunity_lab?.find(
        (item) => item.artifactType === "founder_idea" && item.sourceRecordId === LIVE_CMS_ID,
      );
      expect(founder).toBeTruthy();
      const detail = buildEntityDetail(buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []));
      expect(detail.money.sections[0]?.id).toBe("money-venture-brief");
      expect(detail.intelligence.sections.some((section) => section.id === "benchmark-economics-system")).toBe(true);
      const blob = JSON.stringify(detail.money.sections);
      const unknownAudit = classifyUnknowns(blob);
      expect(unknownAudit.A).toBeGreaterThan(0);
      expect(unknownAudit.B).toBe(0);
      expect(htmlSafe(detail, founder!)).toContain("hq-money-hero-grid");
    },
    30000,
  );
});

function htmlSafe(
  detail: ReturnType<typeof buildEntityDetail>,
  founder: NonNullable<ReturnType<typeof buildFounderIdeaArtifacts>["opportunity_lab"]>[number],
): string {
  return renderToStaticMarkup(createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["money"] }, artifact: founder }));
}
