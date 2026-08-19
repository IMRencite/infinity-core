import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { CodingAgentStore } from "../store";
import type { CodingAgentRun } from "../types";

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export type CodingIntelligenceRow = {
  runId: string;
  venture: string;
  task: string;
  provider: string;
  executionMode: string;
  status: string;
  duration: string;
  knownCost: string;
  filesAffected: number;
  tests: string;
  build: string;
  repairAttempts: number;
  validationState: string;
};

export type CodingHqReadModel = {
  organizationId: string;
  rows: CodingIntelligenceRow[];
  providers: Array<{
    provider: string;
    executionMode: string;
    capabilities: string;
    availability: string;
    historicalSuccess: string;
    cost: string;
    status: string;
  }>;
};

export function emptyCodingHqReadModel(organizationId: string): CodingHqReadModel {
  return {
    organizationId,
    rows: [],
    providers: [
      {
        provider: "Infinity Native Coder",
        executionMode: "NATIVE",
        capabilities: "IMPLEMENT_FEATURE, REFACTOR, RUN_TESTS",
        availability: "AVAILABLE",
        historicalSuccess: "NOT YET MEASURED",
        cost: "ACTUAL $0 in mock",
        status: "READY",
      },
      {
        provider: "Cursor",
        executionMode: process.env.CURSOR_API_KEY ? "CURSOR_CLI / CURSOR_CLOUD_AGENT" : "NOT_CONFIGURED",
        capabilities: "LARGE_REPOSITORY_EXECUTION, MODIFY_MULTIPLE_FILES",
        availability: process.env.CURSOR_API_KEY ? "AVAILABLE" : "NOT_CONFIGURED",
        historicalSuccess: "NOT YET MEASURED",
        cost: "UNKNOWN until authorized run",
        status: process.env.CURSOR_API_KEY ? "READY" : "NOT_CONFIGURED",
      },
    ],
  };
}

export function buildCodingHqReadModel(store: CodingAgentStore, organizationId: string): CodingHqReadModel {
  const model = emptyCodingHqReadModel(organizationId);
  model.rows = store.scoped(organizationId).map(rowFromRun);
  return model;
}

function rowFromRun(run: CodingAgentRun): CodingIntelligenceRow {
  const cost =
    run.cost.actuality === "UNKNOWN" || run.cost.value == null
      ? "UNKNOWN"
      : `${run.cost.actuality} $${run.cost.value}`;
  return {
    runId: run.codingAgentRunId,
    venture: run.ventureId ?? "NONE",
    task: run.taskId,
    provider: run.provider === "infinity_native" ? "Native Coder" : "Cursor",
    executionMode: run.executionMode,
    status: run.status,
    duration: `${run.durationMs}ms`,
    knownCost: cost,
    filesAffected: run.filesCreated.length + run.filesModified.length + run.filesDeleted.length,
    tests: run.testsRun.length ? (run.testsRun.every((t) => t.passed) ? "PASS" : "FAIL") : "UNKNOWN",
    build: run.buildGatePassed ? "PASS" : run.buildGatePassed === false ? "FAIL" : "UNKNOWN",
    repairAttempts: run.repairAttempts,
    validationState: run.infinityAccepted ? "ACCEPTED" : run.providerStatus === "COMPLETED" ? "QA_FAILED" : run.status,
  };
}

export function buildCodingHqArtifacts(model: CodingHqReadModel): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};
  for (const row of model.rows) {
    const active = row.status === "RUNNING" || row.status === "QA_RUNNING";
    push(map, "product_lab", {
      id: buildArtifactRenderId({
        artifactType: "coding_agent_run",
        sourceRecordType: "coding_agent_run",
        sourceRecordId: row.runId,
      }),
      roomId: "product_lab",
      artifactType: "coding_agent_run",
      title: `${row.provider} · ${row.task.slice(0, 8)}`,
      subtitle: `${row.provider === "Cursor" ? "Cursor" : "Native Coder"} · ${active ? "ACTIVE" : row.status}`,
      state: row.status === "FAILED" || row.status === "BLOCKED" ? "FAILED" : active ? "CREATING" : "READY",
      createdAt: null,
      sourceRecordType: "coding_agent_run",
      sourceRecordId: row.runId,
      metadata: {
        provider: row.provider,
        executionMode: row.executionMode,
        status: row.status,
        duration: row.duration,
        knownCost: row.knownCost,
        filesAffected: row.filesAffected,
        tests: row.tests,
        build: row.build,
        repairAttempts: row.repairAttempts,
        validationState: row.validationState,
        ventureId: row.venture,
        taskId: row.task,
        codingAgentRunId: row.runId,
      },
    });
    push(map, "product_lab", {
      id: buildArtifactRenderId({
        artifactType: "coding_task",
        sourceRecordType: "coding_task",
        sourceRecordId: row.task,
      }),
      roomId: "product_lab",
      artifactType: "coding_task",
      title: `Coding task ${row.task.slice(0, 8)}`,
      subtitle: row.provider,
      state: "READY",
      createdAt: null,
      sourceRecordType: "coding_task",
      sourceRecordId: row.task,
      metadata: {
        provider: row.provider,
        executionMode: row.executionMode,
        status: row.status,
        codingAgentRunId: row.runId,
        taskId: row.task,
      },
    });
  }
  for (const provider of model.providers) {
    push(map, "product_lab", {
      id: buildArtifactRenderId({
        artifactType: "coding_provider",
        sourceRecordType: "coding_provider",
        sourceRecordId: provider.provider,
      }),
      roomId: "product_lab",
      artifactType: "coding_provider",
      title: provider.provider,
      subtitle: `${provider.executionMode} · ${provider.availability}`,
      state: provider.availability === "AVAILABLE" ? "READY" : "FAILED",
      createdAt: null,
      sourceRecordType: "coding_provider",
      sourceRecordId: provider.provider,
      metadata: {
        provider: provider.provider,
        executionMode: provider.executionMode,
        capabilities: provider.capabilities,
        availability: provider.availability,
        historicalSuccess: provider.historicalSuccess,
        cost: provider.cost,
        status: provider.status,
        token: null,
        apiKey: null,
      },
    });
  }
  return map;
}
