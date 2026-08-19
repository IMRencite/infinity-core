import { executeCodingAgentPipeline } from "@/lib/infinity/coding-agents/execute";
import { routeCodingAgent } from "@/lib/infinity/coding-agents/router";
import { createCodingTask, knownCost } from "@/lib/infinity/coding-agents/task";
import { decideRepair } from "@/lib/infinity/coding-agents/repair";
import { MAX_REPAIR_ATTEMPTS } from "@/lib/infinity/coding-agents/constants";
import {
  createCursorCodingAgentProvider,
  createInfinityNativeCoder,
  createMockCursorCodingAgentProvider,
} from "@/lib/infinity/coding-agents/providers/factory";
import type { CodingAgentStore } from "@/lib/infinity/coding-agents/store";
import type { CodingAgentRun, CodingSimulation } from "@/lib/infinity/coding-agents/types";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { ZeroToProductionRun } from "./types";

export async function executeZtpCoding(input: {
  run: ZeroToProductionRun;
  codingStore: CodingAgentStore;
  treasury?: TreasuryStore | null;
  preferMockCursor?: boolean;
  simulation?: CodingSimulation;
  large?: boolean;
  haltAfterQaFailure?: boolean;
  exhaustRepair?: boolean;
}): Promise<{
  codingRun: CodingAgentRun;
  routerOutcome: string;
  repairAttempts: number;
  repairStrategy: string | null;
}> {
  const native = createInfinityNativeCoder();
  const cursor = input.preferMockCursor ? createMockCursorCodingAgentProvider() : createCursorCodingAgentProvider();
  const task = createCodingTask({
    organizationId: input.run.organizationId,
    ventureId: input.run.ventureId,
    missionId: input.run.missionId,
    buildRunId: input.run.buildPackageId,
    founderIdeaSubmissionId: input.run.founderIdeaSubmissionId,
    objective: `ZTP implement venture ${input.run.opportunityCandidateId}`,
    estimatedComplexity: input.large ? "high" : "low",
    filesAffectedEstimate: input.large ? 20 : 2,
    repository: {
      root: `ventures/${input.run.ventureId ?? input.run.opportunityCandidateId}`,
      sizeClass: input.large ? "large" : "small",
      fileCount: input.large ? 220 : 4,
    },
    terminalNeeded: Boolean(input.large),
    repositoryExplorationNeeded: Boolean(input.large),
    debuggingDepth: input.large ? "deep" : "shallow",
    estimatedCost: knownCost(input.large ? 0.4 : 0),
    allowedPaths: ["src", "app"],
  });

  const routed = routeCodingAgent({
    task,
    native,
    cursor,
    cursorCostAuthorized: true,
  });

  let repairAttempts = 0;
  let repairStrategy: string | null = null;
  const first = await executeCodingAgentPipeline({
    store: input.codingStore,
    task,
    native,
    cursor,
    treasury: input.treasury,
    simulation: input.simulation,
  });
  let codingRun = first.run;

  if (codingRun.infinityAccepted) {
    return { codingRun, routerOutcome: routed.outcome, repairAttempts, repairStrategy };
  }

  if (input.haltAfterQaFailure) {
    repairStrategy = decideRepair(codingRun);
    repairAttempts = 1;
    return { codingRun, routerOutcome: routed.outcome, repairAttempts, repairStrategy };
  }

  if (input.exhaustRepair) {
    while (repairAttempts < MAX_REPAIR_ATTEMPTS) {
      repairAttempts += 1;
      repairStrategy = "FAIL";
      const next = await executeCodingAgentPipeline({
        store: input.codingStore,
        task: { ...task, taskId: `${task.taskId}:repair:${repairAttempts}` },
        native,
        cursor,
        treasury: input.treasury,
        simulation: "compile_failure",
      });
      codingRun = { ...next.run, repairAttempts };
    }
    return { codingRun, routerOutcome: routed.outcome, repairAttempts, repairStrategy };
  }

  while (!codingRun.infinityAccepted && repairAttempts < MAX_REPAIR_ATTEMPTS) {
    const decision = decideRepair({ ...codingRun, repairAttempts });
    repairStrategy = decision;
    if (decision === "FAIL" || decision === "HOLD") break;
    repairAttempts += 1;
    const next = await executeCodingAgentPipeline({
      store: input.codingStore,
      task: { ...task, taskId: `${task.taskId}:repair:${repairAttempts}` },
      native,
      cursor: decision === "NATIVE_REPAIR" ? native : cursor,
      forceProvider: decision === "NATIVE_REPAIR" ? native : undefined,
      treasury: input.treasury,
      simulation: input.exhaustRepair ? "compile_failure" : "success",
    });
    codingRun = { ...next.run, repairAttempts };
  }

  if (!codingRun.infinityAccepted && repairAttempts >= MAX_REPAIR_ATTEMPTS) {
    repairStrategy = "FAIL";
  }

  return { codingRun, routerOutcome: routed.outcome, repairAttempts, repairStrategy };
}
