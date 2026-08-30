import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { hydrateFounderStore, type FounderIdeaSubmissionRow } from "../persistence";
import { FounderIdeaStore } from "../store";
import { listFounderIdeas, buildFounderIdeaArtifacts } from "../hq/artifacts";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { HQOutputDetail } from "@/components/dashboard/operator-console/artifacts/hq-output-detail";
import { composeFounderExplainability } from "../explainability/compose";
import { submitFounderIdea } from "../submit";
import { convertFounderIdeaToCandidate } from "../convert";
import { analyzeFounderIdea } from "../analyze";
import { infinityCmsLiveV5ReplayPacket } from "../integrity-fixtures";
import type { FounderIdeaSubmissionInput } from "../types";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadFounderIdeaStoreForOrg } from "../hq/load";

const ORG = "org-frontend-v1";

function liveUnknownEconomicsStore() {
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
    idempotencyKey: "frontend-v1",
  } satisfies FounderIdeaSubmissionInput);
  convertFounderIdeaToCandidate(store, submission);
  const packet = infinityCmsLiveV5ReplayPacket(submission.id, submission.opportunityCandidateId!);
  const { grade } = analyzeFounderIdea(store, submission, { researchPacket: packet });
  if (!grade?.explainability) throw new Error("EXPLAINABILITY_MISSING");
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
  return { store, submission, grade };
}

const REQUIRED_HEADINGS = [
  "Executive Summary",
  "Why Infinity Chose HOLD",
  "Evidence",
  "Key Insights",
  "Score Breakdown",
  "Pricing Recommendation",
  "Comparable Businesses",
  "Modeled Unit Economics",
  "Risks + Uncertainties",
  "What Would Change the Decision",
  "Next Validation Steps",
  "Source Trace",
];

describe("founder intelligence frontend v1", () => {
  it("keeps explainability through scores_json hydrate → artifact → HQOutputDetail", () => {
    const { store, submission, grade } = liveUnknownEconomicsStore();
    const row: FounderIdeaSubmissionRow = {
      id: submission.id,
      organization_id: submission.organizationId,
      submitted_by_user_id: submission.submittedByUserId,
      title: submission.title,
      description: submission.description,
      target_customer: submission.targetCustomer,
      problem: submission.problem,
      proposed_solution: submission.proposedSolution,
      business_model_hypothesis: submission.businessModelHypothesis,
      pricing_hypothesis: submission.pricingHypothesis,
      competitors: submission.competitors,
      notes: submission.notes,
      desired_mode: submission.desiredMode,
      status: submission.status,
      opportunity_candidate_id: submission.opportunityCandidateId,
      infinity_decision: submission.infinityDecision,
      founder_decision: submission.founderDecision ? String(submission.founderDecision) : null,
      origin: submission.origin,
      failure_code: submission.failureCode,
      analyzed_by_user_id: submission.analyzedByUserId,
      approved_by_user_id: submission.approvedByUserId,
      idempotency_key: submission.idempotencyKey,
      opportunity_quality: grade.opportunityQuality,
      selection_score: grade.selectionScore,
      validation_score: grade.validationScore,
      monetization_score: grade.monetizationScore,
      fatal_assumption_risk: grade.fatalAssumptionRisk,
      expected_roi: grade.expectedRoi,
      estimated_capital_required: grade.estimatedCapitalRequired,
      scores_json: {
        opportunityScores: grade.opportunityScores,
        scoreIntegrity: grade.scoreIntegrity,
        needsReanalysis: false,
        researchRunId: submission.researchRunId,
        readyForDecision: true,
        buildReady: false,
        explainability: grade.explainability,
        comparableEconomics: grade.comparableEconomics,
        evaluationHistory: [
          {
            archivedAt: "2026-08-01T00:00:00.000Z",
            evaluationVersion: "test",
            opportunityScore: 43.61,
            selectionScore: null,
            validationScore: null,
            monetizationScore: null,
            decision: "HOLD",
            status: "HELD",
            scoreIntegrity: "FALLBACK_HISTORICAL",
            provenance: [],
            candidateId: "6f1eb4e3-14d3-405a-b016-ad978222a36b",
            researchRunId: null,
            reason: "REANALYSIS",
          },
        ],
      },
      blocking_assumptions: grade.evaluation?.blockingAssumptions ?? [],
      created_at: submission.createdAt,
      updated_at: submission.updatedAt,
    };

    const hydrated = new FounderIdeaStore();
    hydrateFounderStore(hydrated, [row]);
    expect(hydrated.grades.get(submission.id)?.explainability?.executiveSummary).toBeTruthy();
    expect(hydrated.grades.get(submission.id)?.comparableEconomics).toBeTruthy();
    expect(hydrated.grades.get(submission.id)?.buildReady).toBe(false);
    expect(hydrated.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);

    const rows = listFounderIdeas(hydrated, ORG);
    expect(rows[0]?.infinityDecision).toBe("HOLD");
    const artifacts = buildFounderIdeaArtifacts(hydrated, ORG);
    const founder = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    expect(founder?.metadata.founderIntelligenceJson).toBeTruthy();
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs[0]).toBe("intelligence");
    expect(detail.decision).toBe("HOLD");
    expect(detail.decisionWhy).toMatch(/HOLD|52\.94|58/);

    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact: founder! }));
    spy.mockRestore();

    for (const heading of REQUIRED_HEADINGS) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("Insufficient economic evidence");
    expect(html).toContain(">CAC<");
    expect(html).toContain(">LTV<");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("INSUFFICIENT_DATA");
    expect(html).toContain("Hibu");
    expect(html).toMatch(/DealerSpike|Dealerspike/);
    expect(html).toContain("NO ECONOMIC EVIDENCE");
    expect(html).toContain("Opportunity quality (diagnostic, not the VALIDATE classifier)");
    expect(html).toContain("VALIDATE threshold");
    expect(html).toContain("REJECT threshold");
    expect(html).toContain("Why not BUILD");
    expect(html.split("Selection score").length - 1).toBe(1);
    expect(html.split("Validation score").length - 1).toBe(1);
    expect(html.split("Monetization score").length - 1).toBe(1);
    expect(errors.some((line) => /Encountered two children with the same key/i.test(line))).toBe(false);

    const labSource = readFileSync(join(process.cwd(), "components/dashboard/founder-ideas/founder-idea-lab.tsx"), "utf8");
    const pageSource = readFileSync(join(process.cwd(), "app/dashboard/founder-ideas/page.tsx"), "utf8");
    expect(labSource).toContain("HQOutputDetail");
    expect(labSource).toContain("Founder idea intelligence");
    expect(labSource).not.toContain("detailOpen");
    expect(labSource).not.toContain("HQOutputDetailShell");
    expect(pageSource).toContain("loadFounderIdeaStoreForOrg");
    expect(pageSource).toContain("buildFounderIdeaArtifacts");
    expect(pageSource).toContain("buildEntityDetail");
    expect(pageSource).toContain("FounderIdeaLab");
    expect(store.submissions.get(submission.id)?.infinityDecision).toBe("HOLD");
  });

  it("does not import cms-live-v6-fixture into production Founder Ideas UI", () => {
    const files = [
      "app/dashboard/founder-ideas/page.tsx",
      "components/dashboard/founder-ideas/founder-idea-lab.tsx",
      "components/dashboard/operator-console/artifacts/hq-output-detail.tsx",
      "lib/infinity/founder-idea-lab/hq/artifacts.ts",
      "lib/infinity/founder-idea-lab/hq/intelligence-sections.ts",
      "lib/infinity/operator-console/details/build-entity-detail.ts",
    ];
    for (const file of files) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toContain("cms-live-v6-fixture");
    }
  });

  it(
    "renders production HQOutputDetail from the live Infinity CMS persisted row",
    async () => {
    const envPath = join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      if (!process.env[trimmed.slice(0, sep)]) {
        process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
      }
    }
    const admin = createAdminClient();
    const store = await loadFounderIdeaStoreForOrg(admin as never, "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494");
    const artifacts = buildFounderIdeaArtifacts(store, "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494");
    const founder = artifacts.opportunity_lab?.find(
      (item) => item.artifactType === "founder_idea" && item.sourceRecordId === "69d45f14-ca07-4a30-b601-54af6d05953f",
    );
    expect(founder).toBeTruthy();
    const inspector = buildArtifactInspectorModel(founder!, artifacts.opportunity_lab ?? []);
    const detail = buildEntityDetail(inspector);
    const html = renderToStaticMarkup(createElement(HQOutputDetail, { detail, artifact: founder! }));
    writeFileSync("C:/Users/Antivist/AppData/Local/Temp/infinity-cms-frontend-render.html", html);
    expect(detail.decision).toBe("HOLD");
    expect(detail.insights.metrics.find((item) => item.id === "opportunity-quality")?.value).toBe("69.73");
    expect(detail.insights.metrics.find((item) => item.id === "selection-score")?.value).toBe("52.94");
    expect(detail.insights.metrics.find((item) => item.id === "build-readiness")?.value).toBe("NO");
    for (const heading of REQUIRED_HEADINGS) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("Hibu");
    expect(html).toMatch(/DealerSpike|Dealerspike/);
    expect(html).toContain("Insufficient economic evidence");
    expect(html).toContain("UNKNOWN");
    },
    30000,
  );
});
