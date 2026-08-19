import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { submitFounderIdea } from "@/lib/infinity/founder-idea-lab/submit";
import { analyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/analyze";
import { applyFounderDecision } from "@/lib/infinity/founder-idea-lab/decide";
import { rejectScoringFixture, saasWorkflowResearchFixture } from "@/lib/infinity/founder-idea-lab/fixtures";
import { createGovernedStore, ORG_A, ORG_B } from "@/lib/infinity/treasury/__tests__/fixtures";
import { buildArtifactInspectorModel } from "@/lib/infinity/operator-console/artifacts/build-inspector-model";
import { buildEntityDetail } from "@/lib/infinity/operator-console/details/build-entity-detail";
import { createZtpContext } from "../context";
import { runZeroToProduction } from "../orchestrator";
import { createAutonomousBuildCandidate, ingestAutonomousCandidate } from "../source";
import { buildZtpHqArtifacts, buildZtpHqReadModel } from "../hq/read-model";
import { classifyZtpFailure } from "../failures";
import { ownerForBuildTask } from "../graph";

function founderBuild(ctx: ReturnType<typeof createZtpContext>, key: string) {
  const submission = submitFounderIdea(ctx.founder, {
    organizationId: ORG_A,
    submittedByUserId: "user-a",
    title: "Simple SaaS that solves a clear business workflow.",
    description: "Simple SaaS that solves a clear business workflow.",
    idempotencyKey: key,
  });
  analyzeFounderIdea(ctx.founder, submission, { researchFixture: "saas_workflow" });
  applyFounderDecision(ctx.founder, {
    submissionId: submission.id,
    action: "BUILD_THIS_BUSINESS",
    actorUserId: "user-a",
    actorOrganizationId: ORG_A,
  });
  return submission;
}

describe("ztp-dry-run-closed-loop", () => {
  it("walks founder BUILD through READY without external mutation", async () => {
    const { store: treasury } = createGovernedStore();
    const ctx = createZtpContext(treasury);
    const submission = founderBuild(ctx, "ztp-dry");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-dry",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.origin).toBe("FOUNDER_SUBMITTED");
    expect(result.run.opportunityCandidateId).toBeTruthy();
    expect(result.run.ventureBlueprintId).toBeTruthy();
    expect(result.buildPackage).toBeTruthy();
    expect(result.buildGraph?.tasks.length).toBeGreaterThan(0);
    expect(result.run.codingProvider).toBe("infinity_native");
    expect(result.run.qaPassed).toBe(true);
    expect(result.run.productionArtifactId).toBeTruthy();
    expect(result.commercializationPlan).toBeTruthy();
    expect(result.launchReadiness?.label).toBe("READY_FOR_CONTROLLED_LAUNCH");
    expect(result.run.productReadiness.PUBLICLY_LAUNCHED).toBe(false);
    expect(result.run.publiclyLaunched).toBe(false);
    expect(ctx.commercial.domainAssets.size).toBe(0);
    expect(ctx.commercial.products.size).toBe(0);
    expect(ctx.commercial.spendExecutions.size).toBe(0);
    expect(result.run.actualPerformanceObserved).toBe(false);
    expect(result.run.performanceHooksDeclared).toContain("purchase");
    expect(result.buildGraph?.tasks.some((t) => ownerForBuildTask(t) === "coding")).toBe(true);
    expect(result.buildGraph?.tasks.some((t) => ownerForBuildTask(t) === "commercialization" || t.category === "launch")).toBe(true);
  });
});

describe("ztp-founder-submitted", () => {
  it("uses the same canonical ZTP path for founder acceptance", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-founder");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-founder",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.sourceEntityType).toBe("founder_idea_submission");
    expect(result.run.origin).toBe("FOUNDER_SUBMITTED");
    expect(result.run.status).toBe("COMPLETE");
  });
});

describe("ztp-founder-override", () => {
  it("starts ZTP from BUILD ANYWAY with FOUNDER_OVERRIDE and original decision preserved", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = submitFounderIdea(ctx.founder, {
      organizationId: ORG_A,
      submittedByUserId: "user-a",
      title: "Simple SaaS that solves a clear business workflow.",
      description: "Simple SaaS that solves a clear business workflow.",
      idempotencyKey: "ztp-override",
    });
    analyzeFounderIdea(ctx.founder, submission, {
      researchFixture: "none",
      monetizationFixture: "saas_workflow",
      scores: saasWorkflowResearchFixture(),
    });
    expect(submission.infinityDecision).toBe("VALIDATE");
    applyFounderDecision(ctx.founder, {
      submissionId: submission.id,
      action: "BUILD_ANYWAY",
      actorUserId: "user-a",
      actorOrganizationId: ORG_A,
      riskAcknowledged: true,
    });
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-override",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.origin).toBe("FOUNDER_OVERRIDE");
    expect(result.run.infinityDecision).toBe("VALIDATE");
    expect(result.run.founderDecision).toBe("BUILD");
    expect(result.run.status).toBe("COMPLETE");
    expect(result.run.publiclyLaunched).toBe(false);
  });
});

describe("ztp-autonomous-entry", () => {
  it("starts from an autonomous candidate without founder metadata", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const { candidate, grade } = createAutonomousBuildCandidate(ORG_A);
    ingestAutonomousCandidate(ctx.ztp, candidate, grade);
    expect(grade.buildReadiness).toBe("BUILD");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-auto",
      opportunityCandidateId: candidate.id,
    });
    expect(result.run.origin).toBe("AUTONOMOUS_DISCOVERY");
    expect(result.run.founderIdeaSubmissionId).toBeNull();
    expect(result.run.status).toBe("COMPLETE");
  });
});

describe("ztp-reject", () => {
  it("preserves business REJECT without technical failure or ProductionArtifact", async () => {
    const ctx = createZtpContext();
    const submission = submitFounderIdea(ctx.founder, {
      organizationId: ORG_A,
      submittedByUserId: "user-a",
      title: "Simple SaaS that solves a clear business workflow.",
      description: "Simple SaaS that solves a clear business workflow.",
      idempotencyKey: "ztp-reject",
    });
    analyzeFounderIdea(ctx.founder, submission, { scores: rejectScoringFixture(), monetizationFixture: "weak" });
    applyFounderDecision(ctx.founder, {
      submissionId: submission.id,
      action: "ACCEPT_REJECT",
      actorUserId: "user-a",
      actorOrganizationId: ORG_A,
    });
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-reject",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.businessOutcome).toBe("BUSINESS_REJECTED");
    expect(result.run.status).toBe("COMPLETE");
    expect(result.run.failureCode).toBeNull();
    expect(result.run.productionArtifactId).toBeNull();
    expect(classifyZtpFailure(result.run)).toBe("BUSINESS");
  });
});

describe("ztp-validate", () => {
  it("waits on VALIDATE and does not build", async () => {
    const ctx = createZtpContext();
    const submission = submitFounderIdea(ctx.founder, {
      organizationId: ORG_A,
      submittedByUserId: "user-a",
      title: "Simple SaaS that solves a clear business workflow.",
      description: "Simple SaaS that solves a clear business workflow.",
      idempotencyKey: "ztp-validate",
    });
    analyzeFounderIdea(ctx.founder, submission, {
      scores: saasWorkflowResearchFixture(),
      researchFixture: "none",
      monetizationFixture: "saas_workflow",
    });
    expect(submission.infinityDecision).toBe("VALIDATE");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-validate",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.status).toBe("WAITING");
    expect(result.run.businessOutcome).toBe("VALIDATION_REQUIRED");
    expect(result.run.failureCode).toBe("VALIDATION_REQUIRED");
    expect(result.run.productionArtifactId).toBeNull();
  });
});

describe("ztp-native-coder", () => {
  it("uses Native when Cursor is NOT_CONFIGURED", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-native");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-native",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.run.codingProvider).toBe("infinity_native");
    expect(result.run.codingRouterOutcome).toBe("INFINITY_NATIVE");
  });
});

describe("ztp-cursor-route", () => {
  it("lets Coding Router select mock Cursor for a large task", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-cursor");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-cursor",
      founderIdeaSubmissionId: submission.id,
      preferMockCursor: true,
    });
    expect(["CURSOR", "MULTI_AGENT"]).toContain(result.run.codingRouterOutcome);
    expect(result.run.codingProvider).toBe("mock_cursor");
    expect(readFileSync(join(process.cwd(), "lib/infinity/zero-to-production/orchestrator.ts"), "utf8")).not.toContain("createCursorCodingAgentProvider().execute");
  });
});

describe("ztp-qa-failure", () => {
  it("does not accept an artifact when QA fails and initiates repair", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-qa");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-qa",
      founderIdeaSubmissionId: submission.id,
      preferMockCursor: true,
      codingSimulation: "compile_failure",
      haltAfterQaFailure: true,
    });
    expect(result.codingRuns[0]?.providerStatus).toBe("COMPLETED");
    expect(result.run.qaPassed).toBe(false);
    expect(result.run.productionArtifactId).toBeNull();
    expect(result.run.failureCode).toBe("QA_FAILED");
    expect(result.run.repairStrategy).toBeTruthy();
    expect(result.run.productReadiness.PRODUCTION_ARTIFACT_READY).toBe(false);
  });
});

describe("ztp-repair-exhaustion", () => {
  it("fails with REPAIR_EXHAUSTED and no ProductionArtifact", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-repair");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-repair",
      founderIdeaSubmissionId: submission.id,
      preferMockCursor: true,
      codingSimulation: "compile_failure",
      exhaustRepair: true,
    });
    expect(result.run.failureCode).toBe("REPAIR_EXHAUSTED");
    expect(result.run.productionArtifactId).toBeNull();
  });
});

describe("ztp-treasury-block", () => {
  it("blocks commercialization readiness when planned cost exceeds policy", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-treasury");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-treasury",
      founderIdeaSubmissionId: submission.id,
      plannedCommercialCostUsd: 999_999,
    });
    expect(result.run.failureCode).toBe("TREASURY_BLOCKED");
    expect(result.run.status).toBe("BLOCKED");
    expect(ctx.commercial.spendExecutions.size).toBe(0);
  });
});

describe("ztp-launch-readiness", () => {
  it("returns READY_FOR_CONTROLLED_LAUNCH and never PUBLICLY_LAUNCHED", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-ready");
    const result = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-ready",
      founderIdeaSubmissionId: submission.id,
    });
    expect(result.launchReadiness?.label).toBe("READY_FOR_CONTROLLED_LAUNCH");
    expect(result.launchReadiness?.publiclyLaunched).toBe(false);
    expect(result.run.productReadiness.LAUNCH_READY).toBe(true);
    expect(result.run.productReadiness.PUBLICLY_LAUNCHED).toBe(false);
  });
});

describe("ztp-idempotency", () => {
  it("reuses one run and does not duplicate blueprint or artifact", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-idemp");
    const first = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-idemp",
      founderIdeaSubmissionId: submission.id,
    });
    const second = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-idemp",
      founderIdeaSubmissionId: submission.id,
    });
    expect(second.duplicate).toBe(true);
    expect(second.run.id).toBe(first.run.id);
    expect(second.run.ventureBlueprintId).toBe(first.run.ventureBlueprintId);
    expect(second.run.productionArtifactId).toBe(first.run.productionArtifactId);
    expect(ctx.ztp.blueprints.size).toBe(1);
  });
});

describe("ztp-resume", () => {
  it("resumes from BuildPackage without assembling a second blueprint", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-resume");
    const paused = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-resume",
      founderIdeaSubmissionId: submission.id,
      stopAfter: "BUILD_PLANNING",
    });
    expect(paused.run.status).toBe("WAITING");
    expect(paused.run.buildPackageId).toBeTruthy();
    const resumed = await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-resume",
      founderIdeaSubmissionId: submission.id,
    });
    expect(resumed.run.ventureBlueprintId).toBe(paused.run.ventureBlueprintId);
    expect(resumed.run.status).toBe("COMPLETE");
    expect(ctx.ztp.blueprints.size).toBe(1);
  });
});

describe("ztp-hq", () => {
  it("shows ZTP in Command/Creation Lab/Deployment Depot and reuses HQOutputDetail", async () => {
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-hq");
    await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-hq",
      founderIdeaSubmissionId: submission.id,
    });
    const model = buildZtpHqReadModel(ctx.ztp, ORG_A);
    expect(model.rows[0]?.stage).toBe("READY");
    const artifacts = buildZtpHqArtifacts(model);
    expect(artifacts.executive_office?.[0]?.artifactType).toBe("ztp_run");
    expect(artifacts.product_lab?.[0]?.artifactType).toBe("ztp_run");
    expect(artifacts.launch_operations?.[0]?.artifactType).toBe("ztp_run");
    const inspector = buildArtifactInspectorModel(artifacts.executive_office![0], artifacts.executive_office ?? []);
    const detail = buildEntityDetail(inspector);
    expect(detail.availableTabs).toEqual(expect.arrayContaining(["overview", "insights", "evidence", "timeline", "system"]));
    const strip = readFileSync(join(process.cwd(), "components/dashboard/operator-console/ztp-intelligence-strip.tsx"), "utf8");
    expect(strip).toContain("Zero-to-Production");
    expect(strip).not.toMatch(/drawer|dialog|\borb\b/i);
    expect(readFileSync(join(process.cwd(), "components/dashboard/operator-console/artifacts/artifact-inspector-modal.tsx"), "utf8")).toContain("HQOutputDetail");
    expect(readFileSync(join(process.cwd(), "lib/infinity/zero-to-production/orchestrator.ts"), "utf8")).not.toContain("first-autonomous-venture-cycle");
  });
});

describe("ztp-rls", () => {
  it("denies cross-org access and enables RLS without blanket policies", async () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260818040000_zero_to_production_v1.sql"), "utf8");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("GRANT ALL ON public.zero_to_production_runs TO service_role");
    expect(sql).not.toMatch(/CREATE POLICY/i);
    const ctx = createZtpContext(createGovernedStore().store);
    const submission = founderBuild(ctx, "ztp-rls");
    await runZeroToProduction(ctx, {
      organizationId: ORG_A,
      idempotencyKey: "ztp-rls",
      founderIdeaSubmissionId: submission.id,
    });
    expect(ctx.ztp.scoped(ORG_A).every((run) => run.organizationId === ORG_A)).toBe(true);
    expect(ctx.ztp.scoped(ORG_B)).toEqual([]);
  });
});
