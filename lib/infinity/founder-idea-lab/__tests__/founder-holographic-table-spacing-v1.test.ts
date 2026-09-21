import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { analyzeFounderIdea } from "../analyze";
import { convertFounderIdeaToCandidate } from "../convert";
import { buildFounderIdeaArtifacts } from "../hq/artifacts";
import { cmsBenchmarkEconomicsAfterPacket } from "../integrity-fixtures";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import type { FounderIdeaSubmissionInput } from "../types";

function persist() {
  const store = new FounderIdeaStore();
  const input: FounderIdeaSubmissionInput = {
    organizationId: "org-holographic-table-spacing-v1",
    submittedByUserId: "user-a",
    title: "Infinity CMS",
    description: "Build a cms for businesses that they would fill out a knowledge base when they sign up",
    targetCustomer: "SMB owners",
    problem: "Local businesses need rankable sites",
    proposedSolution: "AI CMS with SEO/AEO publishing",
    businessModelHypothesis: "Monthly website package plus setup",
    pricingHypothesis: "cost per month depending on your package",
    idempotencyKey: "holographic-spacing",
  };
  const submission = submitFounderIdea(store, input);
  convertFounderIdeaToCandidate(store, submission);
  const packet = cmsBenchmarkEconomicsAfterPacket(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
  submission.infinityDecision = "HOLD";
  submission.status = "HELD";
  grade.buildReady = false;
  store.grades.set(submission.id, grade);
  store.submissions.set(submission.id, submission);
  const artifacts = buildFounderIdeaArtifacts(store, submission.organizationId);
  const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
  if (!founder) throw new Error("FOUNDER_ARTIFACT_MISSING");
  const detail = buildEntityDetail(buildArtifactInspectorModel(founder, artifacts.opportunity_lab ?? []));
  return { founder, detail };
}

describe("HOLOGRAPHIC TABLE SPACING + DATA SURFACE POLISH V1", () => {
  it("scopes holographic treatment and table padding to Founder Idea surfaces only", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("--infinity-table-pad-x: 1.125rem");
    expect(css).toContain("--infinity-table-pad-y: 0.875rem");
    expect(css).toContain("--infinity-table-header-pad-x: 1.125rem");
    expect(css).toContain("--infinity-table-header-pad-y: 1rem");
    expect(css).toContain("--infinity-table-edge-x: 1.35rem");
    expect(css).toContain("padding-left: var(--infinity-table-edge-x)");
    expect(css).toContain("padding-right: var(--infinity-table-edge-x)");
    expect(css).toContain("line-height: 1.5");
    expect(css).toContain("--infinity-table-pad-x: 0.8rem");
    expect(css).toContain("--infinity-table-pad-y: 0.7rem");
    expect(css).toContain(".infinity-holographic-surface");
    expect(css).toContain(".infinity-command-deck::before");
    expect(css).toContain("32px 32px");
    expect(css).toContain("radial-gradient(110% 70% at 6% 0%");
    expect(css).not.toContain("rainbow holographic");
    expect(css).toContain("border: 1px solid rgba(34, 211, 238, 0.42)");
    expect(css).toContain(".hq-founder-table-row:nth-child(even)");
    expect(css).toContain(".hq-founder-table-row:hover");
    expect(css).toContain("font-variant-numeric: tabular-nums");
    expect(css).toContain("outline: 2px solid");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toMatch(/^table\s*\{/m);
    const ui = readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/hq-output-detail.tsx"), "utf8");
    expect(ui).toContain("infinity-holographic-surface");
    expect(ui).toContain("infinity-command-deck");
    expect(ui).toContain("infinity-table-shell");
    expect(ui).toContain("infinity-build-plan");
  });

  it("renders Command Deck, Money, comparison, and Build Plan holographic shells without cramped cells", () => {
    const { detail, founder } = persist();
    const intelligence = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["intelligence"] }, artifact: founder }),
    );
    const money = renderToStaticMarkup(
      createElement(HQOutputDetail, { detail: { ...detail, availableTabs: ["money"] }, artifact: founder }),
    );
    expect(intelligence).toContain("infinity-command-deck");
    expect(intelligence).toContain("infinity-holographic-surface");
    expect(intelligence).toContain("infinity-data-grid");
    expect(intelligence).toContain("infinity-build-plan");
    expect(intelligence).toContain("infinity-data-grid--compare");
    expect(money).toContain("hq-money-tab");
    expect(money).toContain("infinity-holographic-surface");
    expect(money).toContain("infinity-data-grid");
    expect(intelligence).toContain("hq-founder-table-row");
  });
});
