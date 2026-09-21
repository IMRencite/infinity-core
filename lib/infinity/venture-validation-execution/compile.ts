import { createHash } from "node:crypto";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import type { CompileInput } from "@/lib/infinity/venture-build-orchestration/types";
import { LIVE_QUERY_BUDGET } from "./constants";
import { extractBuildBlockers } from "./blockers";
import type {
  ExecutableValidationPlan,
  PreRunCandidateState,
  ValidationDimension,
  ValidationPhase,
  ValidationTask,
} from "./types";
import type { VentureIntelligenceView } from "@/lib/infinity/venture-intelligence/types";

function stableId(prefix: string, parts: string[]): string {
  return `${prefix}_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20)}`;
}

function roomFor(dimension: ValidationDimension): DepartmentId {
  if (dimension === "CUSTOMER_PROBLEM" || dimension === "CUSTOMER_SEGMENT" || dimension === "MARKET_DEMAND" || dimension === "COMPETITION" || dimension === "DIFFERENTIATION") {
    return "research_department";
  }
  if (dimension === "PRICING" || dimension === "WILLINGNESS_TO_PAY" || dimension === "CAC" || dimension === "LTV" || dimension === "MARGIN" || dimension === "RETENTION") {
    return "strategy_finance";
  }
  return "quality_control";
}

function phaseFor(dimension: ValidationDimension): ValidationPhase {
  if (dimension === "CUSTOMER_PROBLEM" || dimension === "CUSTOMER_SEGMENT" || dimension === "MARKET_DEMAND") return "CUSTOMER_EVIDENCE";
  if (dimension === "PRICING" || dimension === "WILLINGNESS_TO_PAY") return "PRICING_VALIDATION";
  if (dimension === "CAC" || dimension === "LTV" || dimension === "MARGIN" || dimension === "RETENTION") return "ECONOMIC_VALIDATION";
  if (dimension === "COMPETITION" || dimension === "DIFFERENTIATION") return "PRODUCT_ADVANTAGE_VALIDATION";
  return "GROUNDING_RESEARCH";
}

export function validationPlanIdempotencyKey(input: {
  organizationId: string;
  candidateId: string;
  planVersion: number;
  decision: string;
}): string {
  return ["executable_validation_plan", input.organizationId, input.candidateId, String(input.planVersion), input.decision].join(":");
}

export function compileExecutableValidationPlan(input: {
  compile: CompileInput;
  view?: VentureIntelligenceView | null;
  preRun?: PreRunCandidateState | null;
}): ExecutableValidationPlan {
  const auth = evaluateBuildAuthorization(input.compile);
  const planId = stableId("vplan", [
    input.compile.organizationId,
    input.compile.candidateId ?? input.compile.ventureId,
    "1",
    auth.result,
  ]);

  if (auth.result === "AUTHORIZED_BUILD") {
    return {
      schemaVersion: "executable_validation_plan_v1",
      planId,
      planVersion: 1,
      candidateId: input.compile.candidateId ?? input.compile.ventureId,
      ventureId: input.compile.ventureId,
      organizationId: input.compile.organizationId,
      decision: "BUILD",
      buildReady: true,
      blockingDimensions: [],
      validationObjectives: [],
      blockers: [],
      phases: [],
      tasks: [],
      dependencies: [],
      capabilityRoutes: [],
      queryBudget: LIVE_QUERY_BUDGET,
      economicBudget: { researchOnly: true, adSpend: 0, domainSpend: 0, externalPurchase: 0 },
      successCriteria: [],
      stopConditions: ["BUILD is already authorized. Do not run unnecessary validation."],
      evidenceRequirements: [],
      traceability: {
        candidateId: input.compile.candidateId ?? input.compile.ventureId,
        selectionId: input.compile.selectionId,
        researchIds: input.compile.researchIds,
        monetizationPlanId: input.compile.monetizationPlanId,
        validationRunId: null,
      },
      status: "SKIPPED",
    };
  }

  const blockers = extractBuildBlockers(input);
  const defineId = stableId("vtask", [planId, "define"]);
  const tasks: ValidationTask[] = [
    {
      taskId: defineId,
      phase: "VALIDATION_DEFINITION",
      dimension: blockers[0]?.dimension ?? "CUSTOMER_PROBLEM",
      question: "What exact blockers keep this candidate at VALIDATE?",
      evidenceNeeded: "Ordered blockers with current vs required evidence.",
      requiredCapability: "research",
      capabilityRoute: {
        capability: "research",
        requiredCapabilityKey: "research.summarize_internal_evidence",
        roomId: "research_department",
        providerNeutral: true,
      },
      dependencies: [],
      budget: { maxQueries: 0, estimatedCostUsd: 0, costKnown: true, unknownCostTreatedAsZero: false },
      stopCondition: "Blockers compiled.",
      expectedResult: "Executable validation graph",
      externalActionRequired: false,
      mode: "RESEARCH_VALIDATION",
      status: "READY",
      traceability: { planId, candidateId: input.compile.candidateId ?? input.compile.ventureId },
    },
  ];

  for (const item of blockers) {
    const research = item.mode === "RESEARCH_VALIDATION";
    tasks.push({
      taskId: stableId("vtask", [planId, item.dimension]),
      phase: phaseFor(item.dimension),
      dimension: item.dimension,
      question: item.gap,
      evidenceNeeded: item.requiredEvidence,
      requiredCapability: research ? "research" : "validation",
      capabilityRoute: {
        capability: research ? "research" : "validation",
        requiredCapabilityKey: research ? "research.summarize_internal_evidence" : "qa.verify_plan_step_output",
        roomId: roomFor(item.dimension),
        providerNeutral: true,
      },
      dependencies: [defineId],
      budget: {
        maxQueries: research ? LIVE_QUERY_BUDGET.maxQueriesPerPhase : 0,
        estimatedCostUsd: research ? null : 0,
        costKnown: !research,
        unknownCostTreatedAsZero: false,
      },
      stopCondition: item.successCriterion,
      expectedResult: item.validationAction,
      externalActionRequired: item.mode === "MARKET_EXPERIMENT",
      mode: item.mode,
      status: "PENDING",
      traceability: { planId, candidateId: input.compile.candidateId ?? input.compile.ventureId },
    });
  }

  const reassessId = stableId("vtask", [planId, "reassess"]);
  tasks.push({
    taskId: reassessId,
    phase: "DECISION_REASSESSMENT",
    dimension: "LTV",
    question: "After bounded evidence, does canonical readiness now authorize BUILD?",
    evidenceNeeded: "Updated economics, advantage, and decision gate.",
    requiredCapability: "validation",
    capabilityRoute: {
      capability: "validation",
      requiredCapabilityKey: "qa.verify_plan_step_output",
      roomId: "quality_control",
      providerNeutral: true,
    },
    dependencies: tasks.filter((task) => task.taskId !== defineId).map((task) => task.taskId),
    budget: { maxQueries: 0, estimatedCostUsd: 0, costKnown: true, unknownCostTreatedAsZero: false },
    stopCondition: "Decision recomputed. Do not force BUILD_READY.",
    expectedResult: "Canonical outcome",
    externalActionRequired: false,
    mode: "RESEARCH_VALIDATION",
    status: "PENDING",
    traceability: { planId, candidateId: input.compile.candidateId ?? input.compile.ventureId },
  });

  const phases = [...new Set(tasks.map((task) => task.phase))].map((phase) => ({
    phase,
    purpose: phase,
    taskIds: tasks.filter((task) => task.phase === phase).map((task) => task.taskId),
  }));

  return {
    schemaVersion: "executable_validation_plan_v1",
    planId,
    planVersion: 1,
    candidateId: input.compile.candidateId ?? input.compile.ventureId,
    ventureId: input.compile.ventureId,
    organizationId: input.compile.organizationId,
    decision: auth.decision,
    buildReady: false,
    blockingDimensions: [...new Set(blockers.map((item) => item.dimension))],
    validationObjectives: blockers.map((item) => item.validationAction),
    blockers,
    phases,
    tasks,
    dependencies: tasks.flatMap((task) => task.dependencies.map((from) => ({ from, to: task.taskId }))),
    capabilityRoutes: tasks.map((task) => task.capabilityRoute),
    queryBudget: LIVE_QUERY_BUDGET,
    economicBudget: { researchOnly: true, adSpend: 0, domainSpend: 0, externalPurchase: 0 },
    successCriteria: blockers.map((item) => item.successCriterion),
    stopConditions: [
      "Hard query cap 15",
      "Max 3 provider phases",
      "Do not execute market experiments",
      "Do not execute product BUILD in this run",
    ],
    evidenceRequirements: blockers.map((item) => item.requiredEvidence),
    traceability: {
      candidateId: input.compile.candidateId ?? input.compile.ventureId,
      selectionId: input.compile.selectionId,
      researchIds: input.compile.researchIds,
      monetizationPlanId: input.compile.monetizationPlanId,
      validationRunId: null,
    },
    status: "READY",
  };
}
