import { evaluateCommand, evaluatePathMutation } from "./policy";
import { routeCodingAgent } from "./router";
import { runInfinityQa } from "./qa";
import { maybeProductionArtifact, normalizeChangeSet, normalizeMutations, telemetryFromRun } from "./normalize";
import { newId, nowIso, type CodingAgentStore } from "./store";
import { authorizeCursorUsage } from "./treasury";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type {
  CanonicalCodingTask,
  CodingAgentExecutionRequest,
  CodingAgentProvider,
  CodingAgentRun,
  CodingProductionArtifact,
  CodingSimulation,
} from "./types";
import type { CursorExecutionMode } from "./constants";

export function buildExecutionRequest(
  task: CanonicalCodingTask,
  input?: {
    simulation?: CodingSimulation;
    executionMode?: CursorExecutionMode | "NATIVE";
    networkPolicy?: CodingAgentExecutionRequest["networkPolicy"];
  },
): CodingAgentExecutionRequest {
  return {
    task,
    workspace: task.workspace,
    branch: "infinity/coding-agent",
    allowedPaths: task.allowedPaths,
    forbiddenPaths: task.forbiddenPaths,
    commandsAllowed: task.requiredCommands,
    networkPolicy: input?.networkPolicy ?? "PACKAGE_REGISTRY_ONLY",
    externalActionRestrictions: "EAG_ONLY",
    secretPolicy: "SANITIZED_NO_CREDENTIALS",
    timeoutMs: Math.max(5_000, task.expectedDurationMs),
    costCeiling: task.estimatedCost,
    expectedArtifacts: ["CodeChangeSet", "WorkspaceMutation", "ProductionArtifact"],
    executionMode: input?.executionMode,
    simulation: input?.simulation,
    allowCommit: false,
    allowProtectedMerge: false,
    allowForcePush: false,
    allowProductionDeploy: false,
  };
}

export async function executeCodingAgentPipeline(input: {
  store: CodingAgentStore;
  task: CanonicalCodingTask;
  native: CodingAgentProvider;
  cursor: CodingAgentProvider;
  treasury?: TreasuryStore | null;
  simulation?: CodingSimulation;
  forceProvider?: CodingAgentProvider;
}): Promise<{
  run: CodingAgentRun;
  artifact: CodingProductionArtifact | null;
  request: CodingAgentExecutionRequest;
}> {
  input.store.tasks.set(input.task.taskId, input.task);
  const cursorLive = input.cursor.id === "cursor" && input.cursor.availability() === "AVAILABLE";
  const cursorCost = cursorLive
    ? authorizeCursorUsage(input.treasury ?? null, input.task, input.task.estimatedCost)
    : { authorized: true, reasonCodes: [] as string[], executed: false as const };
  const routed = routeCodingAgent({
    task: input.task,
    native: input.native,
    cursor: input.cursor,
    cursorCostAuthorized: cursorCost.authorized && input.cursor.availability() === "AVAILABLE",
  });

  if (routed.outcome === "BLOCK" || routed.outcome === "DEFER" || !routed.providerId) {
    const run = baseRun(input.task, {
      provider: "infinity_native",
      executionMode: "NATIVE",
      routerOutcome: routed.outcome,
      providerStatus: "FAILED",
      infinityAccepted: false,
      status: routed.outcome === "DEFER" ? "DEFERRED" : "BLOCKED",
      failureCode: routed.outcome === "DEFER" ? "COST_DENIED" : "PROVIDER_UNAVAILABLE",
      failureReason: routed.rationale.join(" "),
    });
    input.store.runs.set(run.codingAgentRunId, run);
    return { run, artifact: null, request: buildExecutionRequest(input.task, { simulation: input.simulation }) };
  }

  const provider =
    input.forceProvider ??
    (routed.providerId === "infinity_native" ? input.native : input.cursor);
  const request = buildExecutionRequest(input.task, {
    simulation: input.simulation,
    executionMode: routed.executionMode ?? "NATIVE",
  });

  if (provider.id === "cursor") {
    const gate = authorizeCursorUsage(input.treasury ?? null, input.task, input.task.estimatedCost);
    if (!gate.authorized) {
      if (input.native.availability() === "AVAILABLE") {
        const nativeResult = await input.native.execute({ ...request, executionMode: "NATIVE", simulation: "success" });
        const run = completeRun(input.task, nativeResult, routed.outcome === "CURSOR" ? "INFINITY_NATIVE" : routed.outcome, "Native fallback after Cursor cost denial");
        persist(input.store, input.task, run);
        return { run, artifact: maybeProductionArtifact(run), request };
      }
      const blocked = baseRun(input.task, {
        provider: provider.id,
        executionMode: routed.executionMode ?? "CURSOR_CLI",
        routerOutcome: "DEFER",
        providerStatus: "FAILED",
        infinityAccepted: false,
        status: "DEFERRED",
        failureCode: "COST_DENIED",
        failureReason: gate.reasonCodes.join(","),
      });
      input.store.runs.set(blocked.codingAgentRunId, blocked);
      return { run: blocked, artifact: null, request };
    }
  }

  const result = await provider.execute(request);

  for (const file of result.files.filter((f) => f.operation !== "read")) {
    const pathCheck = evaluatePathMutation(file.path, input.task);
    if (!pathCheck.allowed) {
      const run = completeRun(input.task, { ...result, status: "FAILED", failureCode: "WORKSPACE_VIOLATION" }, routed.outcome, "Forbidden path mutation blocked");
      run.infinityAccepted = false;
      run.productionArtifactId = null;
      run.buildGatePassed = false;
      persist(input.store, input.task, run);
      return { run, artifact: null, request };
    }
  }
  for (const command of result.commandsRun) {
    const cmd = evaluateCommand(command.command);
    if (!cmd.allowed) {
      const run = completeRun(input.task, { ...result, status: "FAILED", failureCode: "COMMAND_POLICY_VIOLATION" }, routed.outcome, "External mutation command blocked; EAG required");
      persist(input.store, input.task, run);
      return { run, artifact: null, request };
    }
  }

  const run = completeRun(input.task, result, routed.outcome);
  persist(input.store, input.task, run);
  return { run, artifact: maybeProductionArtifact(run), request };
}

function completeRun(
  task: CanonicalCodingTask,
  result: Awaited<ReturnType<CodingAgentProvider["execute"]>>,
  routerOutcome: CodingAgentRun["routerOutcome"],
  failureReason?: string,
): CodingAgentRun {
  const qa = result.status === "COMPLETED" ? runInfinityQa({ task, providerResult: result }) : {
    typecheck: false,
    tests: false,
    build: false,
    security: false,
    featureContract: false,
    secretScan: true,
    placeholderScan: true,
    workspaceIsolation: result.failureCode !== "WORKSPACE_VIOLATION",
    passed: false,
    failures: [result.failureCode ?? "BUILD_FAILED"],
  };
  const accepted = result.status === "COMPLETED" && qa.passed;
  const changeSet = normalizeChangeSet(task, result);
  const runId = newId();
  const filesCreated = result.files.filter((f) => f.operation === "create").map((f) => f.path);
  const filesModified = result.files.filter((f) => f.operation === "modify").map((f) => f.path);
  const filesDeleted = result.files.filter((f) => f.operation === "delete").map((f) => f.path);
  const run: CodingAgentRun = {
    codingAgentRunId: runId,
    organizationId: task.organizationId,
    ventureId: task.ventureId,
    missionId: task.missionId,
    taskId: task.taskId,
    buildRunId: task.buildRunId,
    founderIdeaSubmissionId: task.founderIdeaSubmissionId,
    provider: result.provider,
    executionMode: result.executionMode,
    routerOutcome,
    providerStatus: result.status,
    infinityAccepted: accepted,
    status: accepted ? "ACCEPTED" : result.status === "COMPLETED" ? "FAILED" : "FAILED",
    durationMs: result.durationMs,
    cost: result.cost,
    filesRead: result.filesRead,
    filesCreated,
    filesModified,
    filesDeleted,
    commandsRun: result.commandsRun,
    testsRun: result.testsRun,
    branch: result.branch,
    commitSha: result.commitSha,
    failureCode: accepted ? null : result.failureCode ?? (result.status === "COMPLETED" ? "QA_FAILED" : result.failureCode),
    failureReason: failureReason ?? (accepted ? null : qa.failures.join(",") || result.failureCode),
    repairAttempts: 0,
    reviewDefects: 0,
    qa,
    changeSet,
    mutations: accepted ? normalizeMutations(runId, changeSet) : [],
    productionArtifactId: null,
    buildGatePassed: accepted,
    externalActionRequirements: result.externalActionRequirements,
    createdAt: nowIso(),
    completedAt: nowIso(),
  };
  if (accepted) {
    const artifact = maybeProductionArtifact(run);
    run.productionArtifactId = artifact?.id ?? null;
  }
  return run;
}

function persist(store: CodingAgentStore, task: CanonicalCodingTask, run: CodingAgentRun): void {
  store.runs.set(run.codingAgentRunId, run);
  store.telemetry.push(telemetryFromRun(run, task.taskType, task.repository.sizeClass));
  task.status = run.status;
  store.tasks.set(task.taskId, task);
}

function baseRun(
  task: CanonicalCodingTask,
  partial: Pick<
    CodingAgentRun,
    | "provider"
    | "executionMode"
    | "routerOutcome"
    | "providerStatus"
    | "infinityAccepted"
    | "status"
    | "failureCode"
    | "failureReason"
  >,
): CodingAgentRun {
  return {
    codingAgentRunId: newId(),
    organizationId: task.organizationId,
    ventureId: task.ventureId,
    missionId: task.missionId,
    taskId: task.taskId,
    buildRunId: task.buildRunId,
    founderIdeaSubmissionId: task.founderIdeaSubmissionId,
    durationMs: 0,
    cost: task.estimatedCost,
    filesRead: [],
    filesCreated: [],
    filesModified: [],
    filesDeleted: [],
    commandsRun: [],
    testsRun: [],
    branch: null,
    commitSha: null,
    repairAttempts: 0,
    reviewDefects: 0,
    qa: null,
    changeSet: null,
    mutations: [],
    productionArtifactId: null,
    buildGatePassed: false,
    externalActionRequirements: [],
    createdAt: nowIso(),
    completedAt: nowIso(),
    ...partial,
  };
}
