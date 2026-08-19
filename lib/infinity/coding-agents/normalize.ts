import type { CodeChangeSet, WorkspaceMutationRecord } from "@/lib/infinity/product-asset-builder/v2.1/types";
import { newId } from "./store";
import type {
  CanonicalCodingTask,
  CodingAgentProviderResult,
  CodingAgentRun,
  CodingProductionArtifact,
  CodingTelemetryRecord,
} from "./types";

export function normalizeChangeSet(
  task: CanonicalCodingTask,
  result: CodingAgentProviderResult,
): CodeChangeSet | null {
  if (!result.changeSet) return null;
  return {
    ...result.changeSet,
    taskId: task.taskId,
    provider: result.provider,
  };
}

export function normalizeMutations(runId: string, changeSet: CodeChangeSet | null): WorkspaceMutationRecord[] {
  if (!changeSet) return [];
  return changeSet.changes.map((change) => ({
    id: newId(),
    codingTaskId: changeSet.taskId,
    codeChangeSetId: runId,
    featureContractIds: [],
    provider: changeSet.provider,
    model: changeSet.model,
    relativePath: change.path,
    operation: change.operation,
    rolledBack: false,
  }));
}

export function maybeProductionArtifact(run: CodingAgentRun): CodingProductionArtifact | null {
  if (!run.infinityAccepted || !run.buildGatePassed) return null;
  return {
    id: `artifact:${run.codingAgentRunId}`,
    organizationId: run.organizationId,
    codingAgentRunId: run.codingAgentRunId,
    taskId: run.taskId,
    provider: run.provider,
    accepted: true,
    publiclyDeployed: false,
  };
}

export function telemetryFromRun(run: CodingAgentRun, taskType: CanonicalCodingTask["taskType"], repoSize: CanonicalCodingTask["repository"]["sizeClass"]): CodingTelemetryRecord {
  return {
    provider: run.provider,
    mode: run.executionMode,
    taskType,
    repoSize,
    filesChanged: run.filesCreated.length + run.filesModified.length + run.filesDeleted.length,
    commandsRun: run.commandsRun.length,
    durationMs: run.durationMs,
    cost: run.cost,
    testsPassed: run.testsRun.every((t) => t.passed),
    buildSuccess: Boolean(run.buildGatePassed),
    repairCount: run.repairAttempts,
    reviewDefects: run.reviewDefects,
    finalAcceptance: run.infinityAccepted,
  };
}
