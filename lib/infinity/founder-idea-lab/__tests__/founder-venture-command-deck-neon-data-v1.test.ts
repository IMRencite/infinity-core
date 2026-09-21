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
import { flattenExplainabilityForHq } from "../explainability/compose";
import { buildFounderIntelligenceView } from "../explainability/view";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { founderFriendlyPrimarySections, primarySectionBlob } from "../hq/founder-intelligence-primary";
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
    organizationId: "org-command-deck-neon-v1",
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
  const submission = submitFounderIdea(store, ideaInput("deck"));
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

describe("FOUNDER VENTURE COMMAND DECK + NEON DATA SYSTEM V1", () => {
  it("renders the Command Deck with thesis, economics, systems, and separated business case vs build readiness", () => {
    const { view, detail, grade } = persist();
    const deck = view.commandDeck;
    expect(deck?.heading).toBe("Venture Command Deck");
    expect(deck?.identity.customer.length).toBeGreaterThan(4);
    expect(deck?.identity.problem.length).toBeGreaterThan(8);
    expect(deck?.identity.solution.length).toBeGreaterThan(8);
    expect(deck?.identity.businessModel.length).toBeGreaterThan(8);
    expect(deck?.thesis.length).toBeGreaterThan(20);
    expect(deck?.metrics.map((item) => item.id)).toEqual(
      expect.arrayContaining(["core", "contribution", "cac", "lifetime", "ltv", "ltv-cac", "payback", "first-year"]),
    );
    expect(deck?.profit.monthlyContribution).toMatch(/\$|Not known yet/);
    expect(deck?.buildReadiness).toBe("Not ready to build");
    expect(deck?.businessCase).not.toBe(deck?.buildReadiness);
    expect(deck?.grantsBuild).toBe(false);
    expect(deck?.requiredSystems.length).toBeGreaterThan(3);
    expect(deck?.next3Phases).toHaveLength(3);
    expect(JSON.stringify(deck)).not.toMatch(/estimated net profit|labeled (?:as )?net profit/i);
    expect(detail.intelligence.sections[0]?.title).toBe("Venture Command Deck");
    const blob = primarySectionBlob(founderFriendlyPrimarySections(view, flattenExplainabilityForHq(grade.explainability!)));
    expect(blob).toMatch(/Target customer|Venture concept|Business model|Contribution profit|Biggest risk|Current position|What Infinity recommends next/i);
    expect(blob).not.toMatch(/BENCHMARK_PARTIAL|INDEPENDENCE_UNKNOWN|COMPARABLE_MODELED/);
    expect(grade.buildReady).toBe(false);
  });

  it("keeps neon table chrome, hover/focus, numeric alignment, and progressive full build path", () => {
    const { detail, founder, view } = persist();
    expect(view.buildPlan?.phases).toHaveLength(11);
    const html = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["intelligence"] }, artifact: founder }),
    );
    expect(html).toContain("hq-command-deck");
    expect(html).toContain("infinity-data-grid");
    expect(html).toContain("View full build path");
    expect(html).toContain("Next 3 phases");
    expect(html).toContain("hq-confidence-dot");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain(".infinity-data-grid");
    expect(css).toContain("0 0 12px rgba(34, 211, 238");
    expect(css).toContain(".hq-founder-table-row:nth-child(even)");
    expect(css).toContain(".hq-founder-table-row:hover");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("outline: 2px solid");
    expect(css).toContain(":focus-within");
    const ui = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(ui).toContain("aria-expanded");
  });

  it("does not create missions, mutate roadmap, or authorize BUILD", () => {
    const { store, submission, grade } = persist();
    expect(evaluateBuildReadiness({ decisionReady: true, evaluation: grade.evaluation }).buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    expect(assertFounderSpendStillTreasuryGated(treasury, submission).authorized).toBe(false);
  });

  it(
    "replays the real attempt-9 packet into the Command Deck without writes",
    async () => {
      if (!loadEnvLocal()) return;
      const store = await loadFounderIdeaStoreForOrg(createAdminClient() as never, LIVE_ORG);
      const grade = store.grades.get(LIVE_CMS_ID);
      expect(grade?.explainability).toBeTruthy();
      const view = buildFounderIntelligenceView(grade!.explainability!);
      expect(view.commandDeck?.metrics.find((item) => item.id === "core")?.value).toMatch(/\$/);
      expect(view.commandDeck?.profit.monthlyContribution).toMatch(/\$|Not known yet/);
      expect(view.commandDeck?.currentPosition).not.toMatch(/READY TO BUILD/i);
      expect(view.commandDeck?.buildReadiness).toBe("Not ready to build");
      expect(view.commandDeck?.requiredSystems.length).toBeGreaterThan(3);
      expect(view.commandDeck?.next3Phases).toHaveLength(3);
      expect(view.commandDeck?.grantsBuild).toBe(false);
      expect(JSON.stringify(view.commandDeck)).not.toMatch(/COMPARABLE_MODELED|promising_but_unvalidated|estimated net profit/i);
      const artifacts = buildFounderIdeaArtifacts(store, LIVE_ORG);
      const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea" && item.sourceRecordId === LIVE_CMS_ID);
      expect(founder).toBeTruthy();
      const detail = buildEntityDetail(buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []));
      expect(detail.intelligence.sections[0]?.id).toBe("venture-command-deck");
    },
    30000,
  );
});
