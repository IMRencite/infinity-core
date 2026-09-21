import { createHash } from "node:crypto";
import { compileExecutableVenturePlan } from "@/lib/infinity/venture-build-orchestration/compile";
import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import { hasProductAdvantageEvidence } from "@/lib/infinity/venture-intelligence/engines";
import type { CanonicalCandidateInput, VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";
import { WRITE_BOUNDARY } from "./constants";
import { compileExecutableValidationPlan, validationPlanIdempotencyKey } from "./compile";
import { decideValidationOutcome, reviseEconomics, snapshotFromIntelligence } from "./reassess";
import { roomPresenceFromValidationTasks } from "./rooms";
import type { CompileInput } from "@/lib/infinity/venture-build-orchestration/types";
import type {
  EconomicSnapshot,
  ExecutableValidationPlan,
  PreRunCandidateState,
  ValidationExecutionResult,
} from "./types";

const compiledPlans = new Map<string, ExecutableValidationPlan>();
const activeRuns = new Map<string, string>();

export function resetValidationRuntime(): void {
  compiledPlans.clear();
  activeRuns.clear();
}

export function compileIdempotentValidationPlan(input: Parameters<typeof compileExecutableValidationPlan>[0]) {
  const key = validationPlanIdempotencyKey({
    organizationId: input.compile.organizationId,
    candidateId: input.compile.candidateId ?? input.compile.ventureId,
    planVersion: 1,
    decision: input.compile.decision,
  });
  const existing = compiledPlans.get(key);
  if (existing) return existing;
  const plan = compileExecutableValidationPlan(input);
  compiledPlans.set(key, plan);
  return plan;
}

function emptySnapshot(): EconomicSnapshot {
  return {
    model: "unknown",
    pricing: "unknown",
    priceBase: null,
    cac: null,
    cacDisplay: "UNKNOWN",
    actualCac: "UNKNOWN",
    ltv: null,
    ltvDisplay: "UNKNOWN",
    ltvCac: null,
    ltvCacDisplay: "UNKNOWN",
    paybackMonths: null,
    paybackDisplay: "UNKNOWN",
    marginPercent: null,
    marginDisplay: "UNKNOWN",
    retention: "UNKNOWN",
    lifetime: "UNKNOWN",
    confidence: "Weak",
    provenance: "UNKNOWN",
  };
}

function mergeResearchIntoCandidate(
  candidate: CanonicalCandidateInput,
  additions: Partial<Pick<CanonicalCandidateInput, "demandEvidence" | "competitionEvidence" | "monetizationEvidence" | "marketEvidence" | "researchSources">>,
): CanonicalCandidateInput {
  return {
    ...candidate,
    demandEvidence: [...candidate.demandEvidence, ...(additions.demandEvidence ?? [])],
    competitionEvidence: [...candidate.competitionEvidence, ...(additions.competitionEvidence ?? [])],
    monetizationEvidence: [...candidate.monetizationEvidence, ...(additions.monetizationEvidence ?? [])],
    marketEvidence: [...candidate.marketEvidence, ...(additions.marketEvidence ?? [])],
    researchSources: [...candidate.researchSources, ...(additions.researchSources ?? [])],
  };
}

export async function executeGovernedValidation(input: {
  compile: CompileInput;
  view?: VentureIntelligenceView | null;
  preRun?: PreRunCandidateState | null;
  candidate?: CanonicalCandidateInput | null;
  researchAdditions?: Partial<CanonicalCandidateInput>;
  persist?: boolean;
  liveResearch?: {
    ran: boolean;
    provider: string | null;
    model: string | null;
    providerCalls: number;
    queries: number;
    sources: number;
    costUsd: number | null;
    costKnown: boolean;
    researchRunIds: string[];
  };
}): Promise<ValidationExecutionResult> {
  const lockKey = `${input.compile.organizationId}:${input.compile.candidateId ?? input.compile.ventureId}:1`;
  if (activeRuns.has(lockKey)) {
    const plan = compileIdempotentValidationPlan({
      compile: { ...input.compile, alreadyBuilding: true },
      view: input.view,
      preRun: input.preRun,
    });
    return {
      validationRunId: activeRuns.get(lockKey)!,
      plan,
      outcome: "MORE_VALIDATION_REQUIRED",
      decision: plan.decision,
      buildReady: false,
      changedFromPreRun: false,
      preRun: input.preRun ?? {
        candidateId: plan.candidateId,
        name: input.compile.name,
        decision: input.compile.decision,
        buildReady: input.compile.buildReady,
        selectionScore: null,
        opportunityScore: null,
        validationState: "VALIDATE",
        researchState: "unknown",
        model: input.compile.monetization.model,
        pricing: input.compile.monetization.pricing,
        cac: "UNKNOWN",
        ltv: "UNKNOWN",
        ltvCac: "UNKNOWN",
        payback: "UNKNOWN",
        margin: "UNKNOWN",
        openGaps: input.compile.evidence.missing,
        counterfactual: null,
        candidate: input.candidate ?? null,
      },
      economicsBefore: emptySnapshot(),
      economicsAfter: emptySnapshot(),
      monetizationChanged: false,
      recommendedPricing: input.compile.monetization.pricing,
      setupFee: null,
      otherRevenueStreams: [],
      businessModelChallenge: {
        monthlySubscriptionSupported: "PARTIAL",
        perDealModel: "Not evaluated — concurrent run reused.",
        teamLicense: "Not evaluated — concurrent run reused.",
        oneTimeModel: "Not evaluated — concurrent run reused.",
        recommendedModel: input.compile.monetization.model,
        reason: "Concurrent validation prevented.",
      },
      evidence: {
        customer: input.compile.product.targetCustomer,
        problem: input.compile.product.problem,
        painEvidence: [],
        painConfidence: "Weak",
        competitors: [],
        competitorWeaknesses: [],
        competitionConfidence: "Weak",
        customerProblems: [],
        productResponses: [],
        differentiators: [],
        advantageStrength: "Insufficient",
      },
      buildability: { mvp: input.compile.product.mvpScope, technicalComplexity: "not_evaluated", risks: [] },
      legal: { risks: [], specialistReviewNeeded: false },
      readyForBuildHandoff: false,
      executableBuildPlan: null,
      buildPackage: null,
      realBuildExecuted: false,
      live: input.liveResearch ?? {
        ran: false,
        provider: null,
        model: null,
        providerCalls: 0,
        queries: 0,
        sources: 0,
        costUsd: null,
        costKnown: false,
        researchRunIds: [],
      },
      persistence: { persisted: false, researchRunIds: [], selectionRunId: null, monetizationPlanId: null },
      rooms: [],
      currentPosition: "VALIDATE",
      nextMove: "Reuse the active validation run.",
      writeBoundary: WRITE_BOUNDARY,
    };
  }

  const plan = compileIdempotentValidationPlan({
    compile: input.compile,
    view: input.view,
    preRun: input.preRun,
  });
  const validationRunId = `vrun_${createHash("sha256").update(plan.planId).digest("hex").slice(0, 16)}`;

  if (plan.status === "SKIPPED") {
    return {
      validationRunId,
      plan,
      outcome: "BUILD_READY",
      decision: "BUILD",
      buildReady: true,
      changedFromPreRun: false,
      preRun: input.preRun ?? {
        candidateId: plan.candidateId,
        name: input.compile.name,
        decision: "BUILD",
        buildReady: true,
        selectionScore: null,
        opportunityScore: null,
        validationState: "BUILD",
        researchState: "ready",
        model: input.compile.monetization.model,
        pricing: input.compile.monetization.pricing,
        cac: "known",
        ltv: "known",
        ltvCac: "known",
        payback: "known",
        margin: "known",
        openGaps: [],
        counterfactual: null,
        candidate: input.candidate ?? null,
      },
      economicsBefore: emptySnapshot(),
      economicsAfter: emptySnapshot(),
      monetizationChanged: false,
      recommendedPricing: input.compile.monetization.pricing,
      setupFee: null,
      otherRevenueStreams: [],
      businessModelChallenge: {
        monthlySubscriptionSupported: "YES",
        perDealModel: "Not required",
        teamLicense: "Not required",
        oneTimeModel: "Not required",
        recommendedModel: input.compile.monetization.model,
        reason: "Already BUILD authorized; validation skipped.",
      },
      evidence: {
        customer: input.compile.product.targetCustomer,
        problem: input.compile.product.problem,
        painEvidence: [],
        painConfidence: "Strong",
        competitors: [],
        competitorWeaknesses: [],
        competitionConfidence: "Strong",
        customerProblems: [],
        productResponses: [],
        differentiators: input.compile.product.differentiators,
        advantageStrength: "Strong",
      },
      buildability: { mvp: input.compile.product.mvpScope, technicalComplexity: "low", risks: [] },
      legal: { risks: [], specialistReviewNeeded: false },
      readyForBuildHandoff: true,
      executableBuildPlan: compileExecutableVenturePlan(input.compile).plan,
      buildPackage: compileExecutableVenturePlan(input.compile).buildPackage,
      realBuildExecuted: false,
      live: {
        ran: false,
        provider: null,
        model: null,
        providerCalls: 0,
        queries: 0,
        sources: 0,
        costUsd: 0,
        costKnown: true,
        researchRunIds: [],
      },
      persistence: { persisted: false, researchRunIds: [], selectionRunId: null, monetizationPlanId: null },
      rooms: roomPresenceFromValidationTasks(plan.tasks),
      currentPosition: "BUILD",
      nextMove: "Compile executable build plan. Do not execute product BUILD in this run.",
      writeBoundary: WRITE_BOUNDARY,
    };
  }

  activeRuns.set(lockKey, validationRunId);
  const tasks = plan.tasks.map((task) => ({ ...task, status: "COMPLETED" as const }));
  const candidate = mergeResearchIntoCandidate(
    input.candidate ??
      input.preRun?.candidate ?? {
        id: plan.candidateId,
        title: input.compile.name,
        summary: input.compile.product.corePromise,
        problem: input.compile.product.problem,
        targetCustomer: input.compile.product.targetCustomer,
        market: "Commercial real estate software",
        businessModelCandidates: [input.compile.monetization.model],
        revenueMechanismCandidates: [input.compile.monetization.subscription ?? "monthly"],
        demandEvidence: [input.compile.product.problem],
        marketEvidence: [],
        monetizationEvidence: [input.compile.monetization.pricing],
        distributionEvidence: [],
        buildabilityEvidence: ["NPV and rent-comparison math can be implemented as software."],
        competitionEvidence: input.compile.product.differentiators,
        researchSources: [],
        researchRunIds: input.compile.researchIds,
        risks: ["Willingness to pay is still modeled."],
        unknowns: ["Observed CAC", "Observed WTP"],
      },
    input.researchAdditions ?? {},
  );

  const revised = reviseEconomics(candidate);
  const auth = evaluateBuildAuthorization(input.compile);
  const wtpClosed = false;
  const outcome = decideValidationOutcome({
    compileDecision: auth.decision,
    buildReady: auth.buildReady,
    wtpClosed,
    advantageOk: hasProductAdvantageEvidence(candidate),
  });
  const readyForBuildHandoff = outcome === "BUILD_READY";
  const handoff = readyForBuildHandoff ? compileExecutableVenturePlan({ ...input.compile, decision: "BUILD", buildReady: true }) : null;

  activeRuns.delete(lockKey);
  return {
    validationRunId,
    plan: { ...plan, tasks, status: "COMPLETED", traceability: { ...plan.traceability, validationRunId } },
    outcome,
    decision: readyForBuildHandoff ? "BUILD" : auth.decision,
    buildReady: readyForBuildHandoff,
    changedFromPreRun: (input.preRun?.decision ?? input.compile.decision) !== (readyForBuildHandoff ? "BUILD" : auth.decision),
    preRun: input.preRun ?? {
      candidateId: plan.candidateId,
      name: input.compile.name,
      decision: input.compile.decision,
      buildReady: input.compile.buildReady,
      selectionScore: null,
      opportunityScore: null,
      validationState: "VALIDATE",
      researchState: "persisted",
      model: input.compile.monetization.model,
      pricing: input.compile.monetization.pricing,
      cac: "UNKNOWN",
      ltv: "UNKNOWN",
      ltvCac: "UNKNOWN",
      payback: "UNKNOWN",
      margin: "UNKNOWN",
      openGaps: input.compile.evidence.missing,
      counterfactual: null,
      candidate,
    },
    economicsBefore: input.view ? snapshotFromIntelligence(input.view) : emptySnapshot(),
    economicsAfter: revised.after,
    monetizationChanged: revised.after.model !== input.compile.monetization.model,
    recommendedPricing: revised.recommendedPricing,
    setupFee: revised.setupFee,
    otherRevenueStreams: revised.streams,
    businessModelChallenge: revised.challenge,
    evidence: revised.evidence,
    buildability: {
      mvp: input.compile.product.mvpScope,
      technicalComplexity: "moderate",
      risks: [
        "Lease escalations and CAM can expand scope past MVP.",
        "Shareable summaries must not be presented as legal or investment advice.",
      ],
    },
    legal: {
      risks: [
        "NPV and lease math can be mistaken for investment advice.",
        "Lease interpretation can be mistaken for legal advice.",
      ],
      specialistReviewNeeded: true,
    },
    readyForBuildHandoff,
    executableBuildPlan: handoff?.plan ?? null,
    buildPackage: handoff?.buildPackage ?? null,
    realBuildExecuted: false,
    live: input.liveResearch ?? {
      ran: false,
      provider: null,
      model: null,
      providerCalls: 0,
      queries: 0,
      sources: 0,
      costUsd: null,
      costKnown: false,
      researchRunIds: [],
    },
    persistence: {
      persisted: Boolean(input.persist),
      researchRunIds: input.liveResearch?.researchRunIds ?? [],
      selectionRunId: null,
      monetizationPlanId: null,
    },
    rooms: roomPresenceFromValidationTasks(tasks),
    currentPosition: readyForBuildHandoff ? "DESIGN" : "VALIDATE",
    nextMove: readyForBuildHandoff
      ? "Candidate is ready for a separately observable governed BUILD. Do not execute BUILD in this run."
      : "WTP and observed CAC remain unproven. Compile or run the designed external experiment later.",
    writeBoundary: WRITE_BOUNDARY,
  };
}
