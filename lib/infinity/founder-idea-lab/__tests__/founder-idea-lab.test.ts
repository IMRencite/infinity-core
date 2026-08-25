import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { analyzeFounderIdea } from "../analyze";
import { applyFounderDecision } from "../decide";
import { routeFounderBuild } from "../build-route";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import { classifyFounderFailure, technicalFailureIsNotBusinessRejection } from "../failures";
import { applyCanonicalResearchFixture, rejectScoringFixture, saasWorkflowResearchFixture } from "../fixtures";
import { founderDedupKey } from "../convert";
import { normalizeFounderIdea } from "../normalize";
import { founderHotTakes } from "../hq/hot-takes-from-store";
import { buildFounderIdeaArtifacts, listFounderIdeas } from "../hq/artifacts";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { performanceRecordForOrigin, segmentPerformanceByOrigin } from "../origin";
import { createGovernedStore, ORG_A, ORG_B } from "@/lib/infinity/treasury/__tests__/fixtures";
import type { FounderIdeaSubmissionInput } from "../types";

const USER_A = "user-a";
const USER_B = "user-b";

function minimalInput(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: "Simple SaaS that solves a clear business workflow.",
    description: "Simple SaaS that solves a clear business workflow.",
    idempotencyKey: "idea-1",
    ...overrides,
  };
}

describe("founder-idea-lab", () => {
  it("submits a minimal founder idea", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput());
    expect(submission.title).toBe("Simple SaaS that solves a clear business workflow.");
    expect(submission.status).toBe("SUBMITTED");
    expect(submission.origin).toBe("FOUNDER_SUBMITTED");
    expect(submission.targetCustomer).toBeNull();
  });

  it("submits a detailed founder idea without requiring unused fields", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      minimalInput({
        idempotencyKey: "detailed",
        targetCustomer: "Contractors",
        problem: "Estimates take too long",
        proposedSolution: "Guided estimator",
        businessModelHypothesis: "saas",
        pricingHypothesis: "$49/mo",
        competitors: "Spreadsheets",
        notes: "Start in Texas",
        desiredMode: "GRADE_AND_VALIDATE",
      }),
    );
    const thesis = normalizeFounderIdea(submission);
    expect(thesis.problem.source).toBe("FOUNDER_PROVIDED");
    expect(thesis.market.source).toBe("INFINITY_INFERRED");
    expect(thesis.targetCustomer.value).toBe("Contractors");
  });

  it("creates one canonical candidate and does not duplicate on repeated submit/analyze", () => {
    const store = new FounderIdeaStore();
    const first = submitFounderIdea(store, minimalInput());
    const again = submitFounderIdea(store, minimalInput());
    expect(again.id).toBe(first.id);
    analyzeFounderIdea(store, first, { researchFixture: "saas_workflow" });
    analyzeFounderIdea(store, first, { researchFixture: "saas_workflow" });
    expect(store.candidates.size).toBe(1);
    const candidate = [...store.candidates.values()][0]!;
    expect(candidate.dedupKey).toBe(
      founderDedupKey(ORG_A, first.title, first.description),
    );
  });

  it("research uses the canonical grounded_research pipeline and does not ground founder claims", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      minimalInput({ competitors: "Acme Suite", idempotencyKey: "research" }),
    );
    const { researchPipeline } = analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    expect(researchPipeline).toBe("grounded_research");
    const topics = applyCanonicalResearchFixture(true).topics;
    expect(topics).toEqual(
      expect.arrayContaining([
        "demand",
        "market",
        "competitors",
        "pricing",
        "customer pain",
        "distribution",
        "technology feasibility",
        "regulatory/platform risk",
        "economic benchmarks",
      ]),
    );
    const candidate = store.candidates.get(submission.opportunityCandidateId!)!;
    expect(candidate.demandEvidence.every((item) => item.grounded)).toBe(true);
    expect(candidate.competitionEvidence.some((item) => item.grounded === false && item.limitations.includes("FOUNDER_PROVIDED — not independently verified"))).toBe(true);
  });

  it("grading uses canonical scores and keeps opportunity quality separate from build readiness", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "grade" }));
    const { grade } = analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    expect(grade).toBeTruthy();
    const canonical = calculateDeterministicScores(grade!.opportunityScores!.scoringInputs);
    expect(grade!.opportunityQuality).toBe(canonical.opportunityScore);
    expect(grade!.opportunityQuality).not.toBe(grade!.buildReadiness);
    expect(["BUILD", "VALIDATE", "HOLD", "REJECT"]).toContain(grade!.buildReadiness);
    expect(grade!.selectionScore).toBeGreaterThan(0);
    expect(grade!.opportunityScores!.demandScore).toBeGreaterThan(0);
  });

  it("Infinity can recommend BUILD for a strong SaaS workflow idea", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "build-rec" }));
    const { grade } = analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    expect(grade?.buildReadiness).toBe("BUILD");
    expect(submission.infinityDecision).toBe("BUILD");
  });

  it("Infinity can recommend VALIDATE when economics/evidence are incomplete", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "validate-rec" }));
    const { grade } = analyzeFounderIdea(store, submission, {
      scores: saasWorkflowResearchFixture(),
      researchFixture: "none",
      monetizationFixture: "saas_workflow",
    });
    expect(grade?.buildReadiness).toBe("VALIDATE");
  });

  it("founder can accept BUILD and route through Company Builder / PAB without public deploy", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "dry-run" }));
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    expect(submission.infinityDecision).toBe("BUILD");
    applyFounderDecision(store, {
      submissionId: submission.id,
      action: "BUILD_THIS_BUSINESS",
      actorUserId: USER_A,
      actorOrganizationId: ORG_A,
    });
    const routed = routeFounderBuild(store, submission);
    expect(routed.companyBuilderInvoked).toBe(true);
    expect(routed.blueprintCreated).toBe(true);
    expect(routed.buildPackageCreated).toBe(true);
    expect(routed.buildMissionCreated).toBe(true);
    expect(routed.pabReused).toBe(true);
    expect(routed.codingRouterCompatible).toBe(true);
    expect(routed.publiclyDeployed).toBe(false);
    expect(routed.treasuryBypassed).toBe(false);
    expect(routed.ventureOrigin).toBe("FOUNDER_SUBMITTED");
    expect(routed.canonicalVentureIdentity.opportunityCandidateId).toBe(submission.opportunityCandidateId);
    expect(routed.canonicalVentureIdentity.origin).toBe("FOUNDER_SUBMITTED");
    expect(routed.canonicalVentureIdentity.workingName.length).toBeGreaterThan(0);
    expect(routed.canonicalVentureIdentity.workingName).not.toMatch(/e2e|fixture|strong_in_policy/i);
    const replay = routeFounderBuild(store, submission);
    expect(replay.missionId).toBe(routed.missionId);
    expect(store.builds.size).toBe(1);
  });

  it("founder can request more validation", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "validate-more" }));
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    applyFounderDecision(store, {
      submissionId: submission.id,
      action: "VALIDATE_MORE",
      actorUserId: USER_A,
      actorOrganizationId: ORG_A,
    });
    expect(submission.founderDecision).toBe("VALIDATE");
    expect(submission.status).toBe("VALIDATING");
  });

  it("BUILD ANYWAY preserves Infinity VALIDATE and marks FOUNDER_OVERRIDE while Treasury stays enforced", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "override" }));
    analyzeFounderIdea(store, submission, {
      researchFixture: "none",
      monetizationFixture: "saas_workflow",
      scores: saasWorkflowResearchFixture(),
    });
    expect(submission.infinityDecision).toBe("VALIDATE");
    const { override, originalInfinityDecision } = applyFounderDecision(store, {
      submissionId: submission.id,
      action: "BUILD_ANYWAY",
      actorUserId: USER_A,
      actorOrganizationId: ORG_A,
      reason: "Founder believes demand is already proven",
      riskAcknowledged: true,
    });
    expect(originalInfinityDecision).toBe("VALIDATE");
    expect(submission.infinityDecision).toBe("VALIDATE");
    expect(override?.infinityDecision).toBe("VALIDATE");
    expect(override?.founderDecision).toBe("BUILD");
    expect(submission.founderDecision).toBe("BUILD");
    expect(submission.origin).toBe("FOUNDER_OVERRIDE");
    const routed = routeFounderBuild(store, submission);
    expect(routed.ventureOrigin).toBe("FOUNDER_OVERRIDE");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
    expect(gate.reasonCodes).toContain("FINANCIAL_AUTONOMY_DISABLED");
  });

  it("accepting REJECT creates no venture or build mission and retains candidate history", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "reject" }));
    analyzeFounderIdea(store, submission, { scores: rejectScoringFixture(), monetizationFixture: "weak" });
    expect(submission.infinityDecision).toBe("REJECT");
    applyFounderDecision(store, {
      submissionId: submission.id,
      action: "ACCEPT_REJECT",
      actorUserId: USER_A,
      actorOrganizationId: ORG_A,
    });
    expect(submission.status).toBe("REJECTED");
    expect(submission.failureCode).toBe("BUSINESS_REJECTED");
    expect(store.builds.size).toBe(0);
    expect(store.candidates.size).toBe(1);
  });

  it("technical failure is not a business rejection", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "fail" }));
    analyzeFounderIdea(store, submission, { researchFixture: "failed" });
    expect(submission.status).toBe("FAILED");
    expect(submission.failureCode).toBe("RESEARCH_FAILED");
    expect(technicalFailureIsNotBusinessRejection("RESEARCH_FAILED")).toBe(true);
    expect(classifyFounderFailure("RESEARCH_FAILED").businessRejected).toBe(false);
    expect(classifyFounderFailure("BUSINESS_REJECTED").businessRejected).toBe(true);
  });

  it("org isolation blocks cross-org reads and approvals", () => {
    const store = new FounderIdeaStore();
    const a = submitFounderIdea(store, minimalInput({ organizationId: ORG_A, idempotencyKey: "org-a" }));
    submitFounderIdea(store, minimalInput({ organizationId: ORG_B, submittedByUserId: USER_B, idempotencyKey: "org-b" }));
    expect(store.scoped(ORG_A)).toHaveLength(1);
    expect(store.scoped(ORG_B)).toHaveLength(1);
    analyzeFounderIdea(store, a, { researchFixture: "saas_workflow" });
    expect(() =>
      applyFounderDecision(store, {
        submissionId: a.id,
        action: "BUILD_THIS_BUSINESS",
        actorUserId: USER_B,
        actorOrganizationId: ORG_B,
      }),
    ).toThrow("ORG_SCOPE_VIOLATION");
  });

  it("reuses holographic HQOutputDetail and does not add a new modal", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "hq" }));
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    const artifacts = buildFounderIdeaArtifacts(store, ORG_A);
    const idea = artifacts.opportunity_lab?.find((item) => item.artifactType === "founder_idea");
    expect(idea?.lineageLabel).toBe("FOUNDER");
    expect(idea?.metadata.origin).toBe("FOUNDER_SUBMITTED");
    const inspector = buildArtifactInspectorModel(idea!, Object.values(artifacts).flat());
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["overview", "insights", "evidence", "timeline", "system"]));
    const takes = founderHotTakes(submission, store);
    expect(takes.some((row) => row.startsWith("[FACT]"))).toBe(true);
    expect(takes.some((row) => row.startsWith("[INFERENCE]"))).toBe(true);

    const page = readFileSync(join(process.cwd(), "components/dashboard/founder-ideas/founder-idea-lab.tsx"), "utf8");
    const modal = readFileSync(
      join(process.cwd(), "components/dashboard/operator-console/artifacts/artifact-inspector-modal.tsx"),
      "utf8",
    );
    expect(page).toContain("HQOutputDetail");
    expect(page).not.toMatch(/drawer/i);
    expect(modal).toContain("HQOutputDetail");
    expect(readFileSync(join(process.cwd(), "components/dashboard/sidebar.tsx"), "utf8")).toContain("Founder Ideas");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/venture-command-bar.tsx"), "utf8")).toContain("Submit Idea");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/hq-idle-shell.tsx"), "utf8")).toContain("Submit an Idea");
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/lineage-accent.tsx"), "utf8")).toContain("FOUNDER");
    expect(readFileSync(join(process.cwd(), "lib/infinity/operator-console/artifacts/types.ts"), "utf8")).toContain("founder_idea");
    expect(readFileSync(join(process.cwd(), "lib/infinity/founder-idea-lab/build-route.ts"), "utf8")).toContain("assembleVentureBlueprint");
    expect(readFileSync(join(process.cwd(), "lib/infinity/founder-idea-lab/build-route.ts"), "utf8")).toContain("assembleBuildPackage");
    expect(readFileSync(join(process.cwd(), "lib/infinity/founder-idea-lab/build-route.ts"), "utf8")).not.toMatch(/function assembleVentureBlueprint/);
  });

  it("list rows keep revenue/profit UNKNOWN until measured and origin is segmentable", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, minimalInput({ idempotencyKey: "list" }));
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    const rows = listFounderIdeas(store, ORG_A);
    expect(rows[0]?.revenue).toBe("NOT YET MEASURED");
    expect(rows[0]?.profit).toBe("NOT YET MEASURED");
    const segments = segmentPerformanceByOrigin([
      performanceRecordForOrigin("FOUNDER_SUBMITTED", submission.opportunityCandidateId),
      performanceRecordForOrigin("AUTONOMOUS_DISCOVERY"),
      performanceRecordForOrigin("FOUNDER_OVERRIDE"),
    ]);
    expect(segments.map((s) => s.origin)).toEqual([
      "AUTONOMOUS_DISCOVERY",
      "FOUNDER_SUBMITTED",
      "FOUNDER_OVERRIDE",
    ]);
    expect(segments.find((s) => s.origin === "FOUNDER_SUBMITTED")?.count).toBe(1);
  });

  it("migration enables RLS and grants service_role without blanket policies", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260818020000_founder_idea_lab_v1.sql"), "utf8");
    expect(sql).toContain("ALTER TABLE public.founder_idea_submissions ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.founder_decision_overrides ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("GRANT ALL ON public.founder_idea_submissions TO service_role");
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });
});
