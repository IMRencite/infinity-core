import type { CanonicalCodingTask, EpistemicCost } from "./types";
import { newId } from "./store";
import type { CanonicalCodingTaskType, CodingCapability } from "./constants";

export function knownCost(value: number): EpistemicCost {
  return { value, actuality: "ESTIMATE", currency: "USD" };
}

export function unknownCost(): EpistemicCost {
  return { value: null, actuality: "UNKNOWN", currency: "USD" };
}

export function createCodingTask(input: Partial<CanonicalCodingTask> & { organizationId: string; objective: string }): CanonicalCodingTask {
  const small = input.repository?.sizeClass === "small" || input.filesAffectedEstimate == null || input.filesAffectedEstimate <= 3;
  return {
    taskId: input.taskId ?? newId(),
    organizationId: input.organizationId,
    ventureId: input.ventureId ?? null,
    missionId: input.missionId ?? null,
    buildRunId: input.buildRunId ?? null,
    founderIdeaSubmissionId: input.founderIdeaSubmissionId ?? null,
    taskType: input.taskType ?? (small ? "IMPLEMENT_FEATURE" : "MODIFY_MULTIPLE_FILES"),
    objective: input.objective,
    repository: input.repository ?? {
      root: "/tmp/infinity-venture",
      sizeClass: small ? "small" : "large",
      fileCount: small ? 4 : 240,
    },
    workspace: input.workspace ?? { root: "/tmp/infinity-venture", isolated: true, ventureId: input.ventureId ?? null },
    scope: input.scope ?? "venture-workspace",
    allowedPaths: input.allowedPaths ?? ["src"],
    forbiddenPaths: input.forbiddenPaths ?? [],
    acceptanceCriteria: input.acceptanceCriteria ?? ["Compiles", "Tests pass"],
    requiredCommands: input.requiredCommands ?? ["npx tsc --noEmit", "npm test"],
    requiredTests: input.requiredTests ?? ["feature.test.ts"],
    estimatedComplexity: input.estimatedComplexity ?? (small ? "low" : "high"),
    estimatedCost: input.estimatedCost ?? knownCost(small ? 0 : 0.5),
    securityLevel: input.securityLevel ?? "standard",
    status: input.status ?? "PENDING",
    requiredCapabilities: input.requiredCapabilities ?? defaultCaps(input.taskType ?? (small ? "IMPLEMENT_FEATURE" : "MODIFY_MULTIPLE_FILES")),
    filesAffectedEstimate: input.filesAffectedEstimate ?? (small ? 2 : 18),
    terminalNeeded: input.terminalNeeded ?? !small,
    repositoryExplorationNeeded: input.repositoryExplorationNeeded ?? !small,
    debuggingDepth: input.debuggingDepth ?? (small ? "shallow" : "deep"),
    expectedDurationMs: input.expectedDurationMs ?? (small ? 8_000 : 120_000),
    asyncPreferred: input.asyncPreferred ?? !small,
  };
}

function defaultCaps(taskType: CanonicalCodingTaskType): CodingCapability[] {
  if (taskType === "MODIFY_MULTIPLE_FILES" || taskType === "REFACTOR") {
    return ["MODIFY_MULTIPLE_FILES", "RUN_TESTS", "LARGE_REPOSITORY_EXECUTION"];
  }
  return ["IMPLEMENT_FEATURE", "PRODUCE_DIFF"];
}
