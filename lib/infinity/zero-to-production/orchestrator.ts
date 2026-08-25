import { analyzeFounderIdea } from "@/lib/infinity/founder-idea-lab/analyze";
import type { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import type { FounderIdeaGrade, FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import type { OpportunityCandidate } from "@/lib/infinity/opportunity-scanner/types";
import { CodingAgentStore } from "@/lib/infinity/coding-agents/store";
import { CommercializationStore } from "@/lib/infinity/commercialization/store";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { SelectionDecision } from "@/lib/infinity/venture-selection/constants";
import { buildCanonicalVentureAssemblyIdentity } from "@/lib/infinity/venture-assembly/identity";
import { PERFORMANCE_HOOKS, ZTP_STAGES, type ZtpFailureCode, type ZtpOrigin, type ZtpStage, type ZtpStatus } from "./constants";
import { assembleCanonicalBlueprint, handoffFromAutonomous, handoffFromFounder } from "./handoff";
import { validateBuildGraphForZtp, ownerForBuildTask } from "./graph";
import { executeZtpCoding } from "./coding";
import { prepareCommercializationPlan } from "./commercialization";
import { planZtpTreasury } from "./treasury";
import { evaluateLaunchReadiness } from "./readiness";
import { computeProgress } from "./progress";
import { newId, nowIso, type ZeroToProductionStore } from "./store";
import type { ZeroToProductionRun, ZeroToProductionStageRun, ZtpRunInput, ZtpRunResult } from "./types";

export type ZtpContext = {
  ztp: ZeroToProductionStore;
  founder: FounderIdeaStore;
  coding: CodingAgentStore;
  commercial: CommercializationStore;
  treasury?: TreasuryStore | null;
};

function emptyReadiness(): ZeroToProductionRun["productReadiness"] {
  return {
    CODE_COMPLETE: false,
    QA_PASSED: false,
    PRODUCTION_ARTIFACT_READY: false,
    COMMERCIALIZATION_READY: false,
    LAUNCH_READY: false,
    PUBLICLY_LAUNCHED: false,
  };
}

function checkpoint(
  ctx: ZtpContext,
  run: ZeroToProductionRun,
  stage: ZtpStage,
  status: ZtpStatus,
  extra?: Partial<ZeroToProductionStageRun>,
): ZeroToProductionStageRun {
  const existing = ctx.ztp.stage(run.id, stage);
  const row: ZeroToProductionStageRun = existing
    ? {
        ...existing,
        status,
        completedAt: status === "COMPLETE" || status === "FAILED" || status === "BLOCKED" ? nowIso() : existing.completedAt,
        ...extra,
      }
    : {
        id: newId(),
        ztpRunId: run.id,
        organizationId: run.organizationId,
        stage,
        status,
        canonicalEntityType: extra?.canonicalEntityType ?? null,
        canonicalEntityId: extra?.canonicalEntityId ?? null,
        startedAt: nowIso(),
        completedAt: status === "COMPLETE" || status === "FAILED" || status === "BLOCKED" ? nowIso() : null,
        cost: extra?.cost ?? { value: null, actuality: "UNKNOWN", currency: "USD" },
        failureCode: extra?.failureCode ?? null,
        failureReason: extra?.failureReason ?? null,
      };
  ctx.ztp.stages.set(row.id, row);
  run.stage = stage;
  run.updatedAt = nowIso();
  run.progress = computeProgress(ctx.ztp.stagesFor(run.id), stage);
  ctx.ztp.runs.set(run.id, run);
  ctx.ztp.events.push({
    id: newId(),
    ztpRunId: run.id,
    organizationId: run.organizationId,
    type: `${stage}_${status}`,
    at: nowIso(),
    payload: { entity: row.canonicalEntityId },
  });
  return row;
}

function finish(
  run: ZeroToProductionRun,
  ctx: ZtpContext,
  status: ZtpStatus,
  extra?: Partial<ZeroToProductionRun>,
): ZeroToProductionRun {
  Object.assign(run, extra);
  run.status = status;
  run.updatedAt = nowIso();
  if (status === "COMPLETE" || status === "FAILED") run.completedAt = nowIso();
  run.progress = computeProgress(ctx.ztp.stagesFor(run.id));
  ctx.ztp.runs.set(run.id, run);
  return run;
}

function fail(run: ZeroToProductionRun, ctx: ZtpContext, code: ZtpFailureCode, reason: string, stage: ZtpStage): ZeroToProductionRun {
  checkpoint(ctx, run, stage, "FAILED", { failureCode: code, failureReason: reason });
  return finish(run, ctx, "FAILED", { failureCode: code, failureReason: reason, currentBlocker: reason });
}

export async function runZeroToProduction(ctx: ZtpContext, input: ZtpRunInput): Promise<ZtpRunResult> {
  const existing = ctx.ztp.findByIdempotency(input.organizationId, input.idempotencyKey);
  if (existing?.status === "COMPLETE" || existing?.status === "FAILED") {
    return snapshot(ctx, existing, true);
  }
  if (existing?.status === "WAITING" && existing.businessOutcome === "VALIDATION_REQUIRED") {
    return snapshot(ctx, existing, true);
  }
  if (existing?.status === "WAITING" && existing.businessOutcome === "BUSINESS_REJECTED") {
    return snapshot(ctx, existing, true);
  }
  const run = existing ?? createRun(ctx, input);
  return executeFrom(ctx, run, input);
}

function createRun(ctx: ZtpContext, input: ZtpRunInput): ZeroToProductionRun {
  const resolved = resolveEntry(ctx, input);
  const run: ZeroToProductionRun = {
    id: newId(),
    organizationId: input.organizationId,
    origin: resolved.origin,
    sourceEntityType: resolved.sourceEntityType,
    sourceEntityId: resolved.sourceEntityId,
    founderIdeaSubmissionId: resolved.founderIdeaSubmissionId,
    opportunityCandidateId: resolved.opportunityCandidateId,
    ventureId: resolved.opportunityCandidateId,
    canonicalVentureIdentity: buildCanonicalVentureAssemblyIdentity({
      opportunityCandidateId: resolved.opportunityCandidateId,
      candidateTitle: resolved.candidate?.title ?? resolved.submission?.title,
      origin: resolved.origin,
    }),
    ventureBlueprintId: null,
    missionId: `mission:ztp:${resolved.sourceEntityId}`,
    buildPackageId: null,
    buildGraphId: null,
    commercializationPlanId: null,
    codingAgentRunIds: [],
    productionArtifactId: null,
    financialActionRequestIds: [],
    infinityDecision: resolved.infinityDecision,
    founderDecision: resolved.founderDecision,
    businessDecision: resolved.infinityDecision,
    businessOutcome: "NONE",
    stage: "SOURCE",
    status: "RUNNING",
    startedAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
    estimatedCostUsd: null,
    actualCostUsd: null,
    costKnown: false,
    failureCode: null,
    failureReason: null,
    idempotencyKey: input.idempotencyKey,
    publiclyLaunched: false,
    readiness: null,
    productReadiness: emptyReadiness(),
    codingProvider: null,
    codingRouterOutcome: null,
    qaPassed: null,
    repairAttempts: 0,
    repairStrategy: null,
    progress: 0,
    currentBlocker: null,
    performanceHooksDeclared: [...PERFORMANCE_HOOKS],
    actualPerformanceObserved: false,
    stale: false,
  };
  ctx.ztp.runs.set(run.id, run);
  ctx.ztp.registerIdempotency(input.organizationId, input.idempotencyKey, run.id);
  return run;
}

function resolveEntry(ctx: ZtpContext, input: ZtpRunInput): {
  origin: ZtpOrigin;
  sourceEntityType: ZeroToProductionRun["sourceEntityType"];
  sourceEntityId: string;
  founderIdeaSubmissionId: string | null;
  opportunityCandidateId: string;
  infinityDecision: SelectionDecision | null;
  founderDecision: SelectionDecision | null;
  submission: FounderIdeaSubmission | null;
  candidate: OpportunityCandidate | null;
  grade: FounderIdeaGrade | null;
} {
  if (input.founderIdeaSubmissionId) {
    const submission = ctx.founder.submissions.get(input.founderIdeaSubmissionId);
    if (!submission || submission.organizationId !== input.organizationId) {
      throw new Error("SOURCE_INVALID");
    }
    return {
      origin: submission.origin,
      sourceEntityType: "founder_idea_submission",
      sourceEntityId: submission.id,
      founderIdeaSubmissionId: submission.id,
      opportunityCandidateId: submission.opportunityCandidateId ?? submission.id,
      infinityDecision: submission.infinityDecision,
      founderDecision: (submission.founderDecision as SelectionDecision | null) ?? null,
      submission,
      candidate: submission.opportunityCandidateId ? ctx.founder.candidates.get(submission.opportunityCandidateId) ?? null : null,
      grade: ctx.founder.grades.get(submission.id) ?? null,
    };
  }
  if (input.opportunityCandidateId) {
    const candidate =
      ctx.ztp.autonomousCandidates.get(input.opportunityCandidateId) ??
      ctx.founder.candidates.get(input.opportunityCandidateId);
    if (!candidate || candidate.organizationId !== input.organizationId) throw new Error("SOURCE_INVALID");
    const grade = ctx.ztp.autonomousGrades.get(candidate.id) ?? null;
    return {
      origin: "AUTONOMOUS_DISCOVERY",
      sourceEntityType: "opportunity_candidate",
      sourceEntityId: candidate.id,
      founderIdeaSubmissionId: null,
      opportunityCandidateId: candidate.id,
      infinityDecision: grade?.buildReadiness ?? null,
      founderDecision: null,
      submission: null,
      candidate,
      grade,
    };
  }
  throw new Error("SOURCE_INVALID");
}

function stageDone(ctx: ZtpContext, run: ZeroToProductionRun, stage: ZtpStage): boolean {
  return ctx.ztp.stage(run.id, stage)?.status === "COMPLETE";
}

async function executeFrom(ctx: ZtpContext, run: ZeroToProductionRun, input: ZtpRunInput): Promise<ZtpRunResult> {
  run.status = "RUNNING";
  const resolved = resolveEntry(ctx, {
    organizationId: run.organizationId,
    idempotencyKey: run.idempotencyKey,
    founderIdeaSubmissionId: run.founderIdeaSubmissionId,
    opportunityCandidateId: run.sourceEntityType === "opportunity_candidate" ? run.opportunityCandidateId : undefined,
  });

  if (!stageDone(ctx, run, "SOURCE")) {
    checkpoint(ctx, run, "SOURCE", "COMPLETE", {
      canonicalEntityType: run.sourceEntityType,
      canonicalEntityId: run.sourceEntityId,
    });
  }
  if (shouldStop(input, "SOURCE")) return snapshot(ctx, run, false);

  let submission = resolved.submission;
  let grade = resolved.grade;
  let candidate = resolved.candidate;

  if (submission && !grade) {
    const analyzed = analyzeFounderIdea(ctx.founder, submission, { researchFixture: "saas_workflow" });
    if (analyzed.grade == null) return snapshot(ctx, fail(run, ctx, "RESEARCH_FAILED", "Canonical research failed", "RESEARCH"), false);
    submission = analyzed.submission;
    grade = analyzed.grade;
    candidate = submission.opportunityCandidateId ? ctx.founder.candidates.get(submission.opportunityCandidateId) ?? null : null;
    run.opportunityCandidateId = candidate?.id ?? run.opportunityCandidateId;
    run.infinityDecision = submission.infinityDecision;
  }

  if (!candidate && run.sourceEntityType === "opportunity_candidate") {
    candidate = ctx.ztp.autonomousCandidates.get(run.opportunityCandidateId) ?? null;
    grade = ctx.ztp.autonomousGrades.get(run.opportunityCandidateId) ?? grade;
  }

  if (!candidate) return snapshot(ctx, fail(run, ctx, "SOURCE_INVALID", "OpportunityCandidate missing", "SOURCE"), false);

  run.canonicalVentureIdentity = buildCanonicalVentureAssemblyIdentity({
    opportunityCandidateId: candidate.id,
    candidateTitle: candidate.title,
    origin: run.origin,
    blueprintId: run.ventureBlueprintId,
  });
  run.opportunityCandidateId = candidate.id;
  run.ventureId = run.ventureId ?? candidate.id;

  if (!stageDone(ctx, run, "RESEARCH")) {
    checkpoint(ctx, run, "RESEARCH", "COMPLETE", {
      canonicalEntityType: "research_run",
      canonicalEntityId: candidate.researchRunIds[0] ?? candidate.discoveryRunId,
    });
  }
  if (shouldStop(input, "RESEARCH")) return snapshot(ctx, run, false);

  if (!grade?.evaluation?.candidate.monetization) {
    return snapshot(ctx, fail(run, ctx, "MONETIZATION_FAILED", "Canonical monetization missing", "MONETIZATION"), false);
  }
  if (!stageDone(ctx, run, "MONETIZATION")) {
    checkpoint(ctx, run, "MONETIZATION", "COMPLETE", {
      canonicalEntityType: "monetization_run",
      canonicalEntityId: grade.evaluation?.candidate.monetization?.monetizationRunId,
    });
  }
  if (shouldStop(input, "MONETIZATION")) return snapshot(ctx, run, false);

  const infinityDecision = submission?.infinityDecision ?? grade.buildReadiness;
  const founderDecision = submission?.founderDecision ?? null;
  run.infinityDecision = infinityDecision;
  run.founderDecision = (founderDecision as SelectionDecision | null) ?? null;
  run.businessDecision = infinityDecision;
  if (!stageDone(ctx, run, "SELECTION")) {
    checkpoint(ctx, run, "SELECTION", "COMPLETE", {
      canonicalEntityType: "venture_selection",
      canonicalEntityId: candidate.id,
    });
  }

  if (infinityDecision === "REJECT" && founderDecision !== "BUILD") {
    run.businessOutcome = "BUSINESS_REJECTED";
    checkpoint(ctx, run, "SELECTION", "COMPLETE", { canonicalEntityType: "business_outcome", canonicalEntityId: "REJECT" });
    return snapshot(ctx, finish(run, ctx, "COMPLETE", { currentBlocker: "BUSINESS_REJECTED", failureCode: null }), false);
  }
  if (infinityDecision === "VALIDATE" && founderDecision !== "BUILD") {
    run.businessOutcome = "VALIDATION_REQUIRED";
    run.failureCode = "VALIDATION_REQUIRED";
    run.failureReason = "Selection requires validation; ZTP will not silently build";
    run.currentBlocker = "VALIDATION_REQUIRED";
    return snapshot(ctx, finish(run, ctx, "WAITING"), false);
  }
  if (infinityDecision === "HOLD" && founderDecision !== "BUILD") {
    run.businessOutcome = "VALIDATION_REQUIRED";
    run.failureCode = "SELECTION_BLOCKED";
    run.currentBlocker = "HOLD";
    return snapshot(ctx, finish(run, ctx, "WAITING"), false);
  }
  if (founderDecision !== "BUILD" && infinityDecision !== "BUILD" && run.origin !== "AUTONOMOUS_DISCOVERY") {
    return snapshot(ctx, fail(run, ctx, "MISSING_AUTHORITY", "ZTP cannot begin build without BUILD authority", "SELECTION"), false);
  }
  if (run.origin === "AUTONOMOUS_DISCOVERY" && infinityDecision !== "BUILD") {
    return snapshot(ctx, fail(run, ctx, "MISSING_AUTHORITY", "Autonomous candidate is not BUILD", "SELECTION"), false);
  }

  run.businessOutcome = "BUILD_AUTHORIZED";
  run.origin = submission?.origin ?? run.origin;
  if (shouldStop(input, "SELECTION")) return snapshot(ctx, run, false);

  if (!run.ventureBlueprintId) {
    const handoff = submission
      ? handoffFromFounder(ctx.founder, submission)
      : handoffFromAutonomous(run.organizationId, candidate, grade, run.origin);
    const assembled = assembleCanonicalBlueprint(ctx.ztp, handoff, {
      opportunityCandidateId: candidate.id,
      discoveryRunId: candidate.discoveryRunId,
      founderIdeaSubmissionId: run.founderIdeaSubmissionId,
      ventureOrigin: run.origin,
      inputMode: "simulation",
    });
    run.ventureBlueprintId = assembled.blueprintId;
    run.buildPackageId = assembled.packageId;
    run.buildGraphId = assembled.graphId;
    run.canonicalVentureIdentity = buildCanonicalVentureAssemblyIdentity({
      opportunityCandidateId: candidate.id,
      candidateTitle: candidate.title,
      origin: run.origin,
      blueprintId: assembled.blueprintId,
    });
    checkpoint(ctx, run, "BLUEPRINT", "COMPLETE", {
      canonicalEntityType: "venture_blueprint",
      canonicalEntityId: assembled.blueprintId,
    });
  }
  if (shouldStop(input, "BLUEPRINT")) return snapshot(ctx, run, false);

  const blueprint = ctx.ztp.blueprints.get(run.ventureBlueprintId)!;
  if (!stageDone(ctx, run, "BUILD_PLANNING")) {
    const graphCheck = validateBuildGraphForZtp(blueprint);
    if (!graphCheck.valid) {
      return snapshot(ctx, fail(run, ctx, "BUILD_PLANNING_FAILED", graphCheck.reasons.join(","), "BUILD_PLANNING"), false);
    }
    const planned = ctx.ztp.packages.get(run.buildPackageId!)!;
    if (planned.status === "BLOCKED") {
      return snapshot(ctx, fail(run, ctx, "BUILD_PLANNING_FAILED", planned.blockedReasons.join(","), "BUILD_PLANNING"), false);
    }
    checkpoint(ctx, run, "BUILD_PLANNING", "COMPLETE", {
      canonicalEntityType: "build_package",
      canonicalEntityId: run.buildPackageId,
    });
  }
  if (shouldStop(input, "BUILD_PLANNING")) return snapshot(ctx, finish(run, ctx, "WAITING"), false);

  const buildPackage = ctx.ztp.packages.get(run.buildPackageId!)!;

  let codingRunId = run.codingAgentRunIds[0] ?? null;
  if (!stageDone(ctx, run, "BUILD")) {
    const owners = new Set(blueprint.buildGraph.tasks.map(ownerForBuildTask));
    void owners;
    const coding = await executeZtpCoding({
      run,
      codingStore: ctx.coding,
      treasury: ctx.treasury,
      preferMockCursor: input.preferMockCursor,
      simulation: input.codingSimulation,
      large: input.preferMockCursor === true,
      haltAfterQaFailure: input.haltAfterQaFailure,
      exhaustRepair: input.exhaustRepair,
    });
    codingRunId = coding.codingRun.codingAgentRunId;
    run.codingAgentRunIds = [coding.codingRun.codingAgentRunId];
    run.codingProvider = coding.codingRun.provider;
    run.codingRouterOutcome = coding.routerOutcome;
    run.repairAttempts = coding.repairAttempts;
    run.repairStrategy = coding.repairStrategy;
    run.qaPassed = coding.codingRun.infinityAccepted;
    run.productReadiness.CODE_COMPLETE = coding.codingRun.providerStatus === "COMPLETED";
    checkpoint(ctx, run, "BUILD", coding.codingRun.providerStatus === "COMPLETED" ? "COMPLETE" : "FAILED", {
      canonicalEntityType: "coding_agent_run",
      canonicalEntityId: coding.codingRun.codingAgentRunId,
      cost: coding.codingRun.cost,
    });
  }
  const codingRun = codingRunId ? ctx.coding.runs.get(codingRunId) : null;
  if (!codingRun) {
    return snapshot(ctx, fail(run, ctx, "CODING_FAILED", "Coding stage produced no run", "BUILD"), false);
  }

  if (!stageDone(ctx, run, "QA")) {
    checkpoint(ctx, run, "QA", codingRun.infinityAccepted ? "COMPLETE" : "FAILED", {
      canonicalEntityType: "infinity_qa",
      canonicalEntityId: codingRun.codingAgentRunId,
      failureCode: codingRun.infinityAccepted ? null : "QA_FAILED",
    });
  }
  run.productReadiness.QA_PASSED = codingRun.infinityAccepted === true;

  if (input.haltAfterQaFailure && !codingRun.infinityAccepted) {
    checkpoint(ctx, run, "REPAIR", "RUNNING", {
      canonicalEntityType: "repair",
      canonicalEntityId: run.repairStrategy,
      failureCode: "QA_FAILED",
    });
    return snapshot(ctx, fail(run, ctx, "QA_FAILED", "Infinity QA failed; repair initiated", "QA"), false);
  }

  if (input.exhaustRepair && !codingRun.infinityAccepted) {
    checkpoint(ctx, run, "REPAIR", "FAILED", { failureCode: "REPAIR_EXHAUSTED" });
    return snapshot(ctx, fail(run, ctx, "REPAIR_EXHAUSTED", "Bounded repair exhausted", "REPAIR"), false);
  }

  if (!codingRun.infinityAccepted) {
    checkpoint(ctx, run, "REPAIR", "FAILED", { failureCode: "QA_FAILED" });
    return snapshot(ctx, fail(run, ctx, "QA_FAILED", "Infinity QA failed", "QA"), false);
  }

  if (run.repairAttempts > 0 && !stageDone(ctx, run, "REPAIR")) {
    checkpoint(ctx, run, "REPAIR", "COMPLETE", { canonicalEntityType: "repair", canonicalEntityId: run.repairStrategy });
  }

  if (!codingRun.productionArtifactId) {
    return snapshot(ctx, fail(run, ctx, "PRODUCTION_ARTIFACT_FAILED", "No accepted ProductionArtifact", "PACKAGE"), false);
  }
  if (!stageDone(ctx, run, "PACKAGE")) {
    run.productionArtifactId = codingRun.productionArtifactId;
    run.productReadiness.PRODUCTION_ARTIFACT_READY = true;
    checkpoint(ctx, run, "PACKAGE", "COMPLETE", {
      canonicalEntityType: "production_artifact",
      canonicalEntityId: codingRun.productionArtifactId,
    });
  }
  if (shouldStop(input, "PACKAGE")) return snapshot(ctx, run, false);

  if (!stageDone(ctx, run, "COMMERCIALIZATION")) {
    const commercial = await prepareCommercializationPlan({
      run,
      store: ctx.commercial,
      brandName: candidate.title.slice(0, 24),
      modelType: grade.evaluation?.candidate.monetization?.primaryPlan?.modelType ?? "saas_subscription",
      plannedPriceUsd: grade.evaluation?.candidate.monetization?.primaryPlan?.estimatedPriceBase ?? 49,
    });
    run.commercializationPlanId = commercial.plan.id;
    run.productReadiness.COMMERCIALIZATION_READY = true;
    checkpoint(ctx, run, "COMMERCIALIZATION", "COMPLETE", {
      canonicalEntityType: "commercialization_plan",
      canonicalEntityId: commercial.plan.id,
    });
  }
  const commercialPlan = run.commercializationPlanId ? ctx.commercial.plans.get(run.commercializationPlanId) ?? null : null;

  const treasury = planZtpTreasury({
    treasury: ctx.treasury ?? null,
    run,
    plannedCostUsd: input.plannedCommercialCostUsd,
    unknown: input.unknownCommercialCost,
  });
  if (treasury.requestId) run.financialActionRequestIds.push(treasury.requestId);
  if (treasury.blocked) {
    checkpoint(ctx, run, "TREASURY", "BLOCKED", { failureCode: "TREASURY_BLOCKED", failureReason: treasury.reasonCodes.join(",") });
    run.productReadiness.COMMERCIALIZATION_READY = false;
    return snapshot(ctx, finish(run, ctx, "BLOCKED", { failureCode: "TREASURY_BLOCKED", failureReason: treasury.reasonCodes.join(","), currentBlocker: "TREASURY_BLOCKED" }), false);
  }
  checkpoint(ctx, run, "TREASURY", "COMPLETE", {
    canonicalEntityType: "financial_action_request",
    canonicalEntityId: treasury.requestId,
    cost: { value: input.plannedCommercialCostUsd ?? 12.99, actuality: "ESTIMATE", currency: "USD" },
  });
  run.estimatedCostUsd = (codingRun.cost.value ?? 0) + (input.plannedCommercialCostUsd ?? 12.99);
  run.costKnown = codingRun.cost.actuality !== "UNKNOWN";

  const readiness = evaluateLaunchReadiness({
    run,
    buildPackage,
    commercializationPlan: commercialPlan,
    treasuryReady: !treasury.blocked,
    domainRequirementReady: Boolean(commercialPlan),
  });
  ctx.ztp.launchReports.set(run.id, readiness);
  run.readiness = readiness.result;
  run.productReadiness.LAUNCH_READY = readiness.result === "READY";
  checkpoint(ctx, run, "LAUNCH_READINESS", readiness.result === "BLOCKED" ? "BLOCKED" : "COMPLETE", {
    canonicalEntityType: "launch_readiness",
    canonicalEntityId: readiness.label,
  });
  if (readiness.result === "BLOCKED") {
    return snapshot(ctx, finish(run, ctx, "BLOCKED", { failureCode: "LAUNCH_NOT_READY", currentBlocker: "LAUNCH_NOT_READY" }), false);
  }
  checkpoint(ctx, run, "READY", "COMPLETE", { canonicalEntityType: "ztp_run", canonicalEntityId: run.id });
  return snapshot(ctx, finish(run, ctx, "COMPLETE"), false);
}

function shouldStop(input: ZtpRunInput, stage: ZtpStage): boolean {
  return input.stopAfter === stage;
}

function snapshot(ctx: ZtpContext, run: ZeroToProductionRun, duplicate: boolean): ZtpRunResult {
  return {
    run,
    stages: ctx.ztp.stagesFor(run.id),
    blueprint: run.ventureBlueprintId ? ctx.ztp.blueprints.get(run.ventureBlueprintId) ?? null : null,
    buildPackage: run.buildPackageId ? ctx.ztp.packages.get(run.buildPackageId) ?? null : null,
    buildGraph: run.buildGraphId ? ctx.ztp.graphs.get(run.buildGraphId) ?? null : null,
    codingRuns: run.codingAgentRunIds.map((id) => ctx.coding.runs.get(id)).filter((row): row is NonNullable<typeof row> => Boolean(row)),
    commercializationPlan: run.commercializationPlanId ? ctx.commercial.plans.get(run.commercializationPlanId) ?? null : null,
    launchReadiness: ctx.ztp.launchReports.get(run.id) ?? null,
    duplicate,
  };
}

export { ZTP_STAGES };
