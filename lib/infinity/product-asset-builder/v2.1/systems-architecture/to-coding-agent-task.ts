import { createCodingTask } from "@/lib/infinity/coding-agents/task";
import type { CanonicalCodingTask } from "@/lib/infinity/coding-agents/types";
import type { CodingTask } from "../types";

/** Map an architecture-scoped PAB task onto the committed coding-agent task contract. */
export function architectureTaskToCanonical(organizationId: string, task: CodingTask): CanonicalCodingTask {
  const files = Math.max(task.relevantFiles.length, task.maxFilesChanged, 1);
  return createCodingTask({
    taskId: task.id,
    organizationId,
    ventureId: task.ventureId,
    companyId: task.companyId ?? null,
    missionId: task.missionId ?? null,
    buildRunId: task.buildRunId,
    buildContractId: task.buildContractId ?? null,
    ventureSystemsBuildContractId: task.ventureSystemsBuildContractId ?? null,
    architectureFamily: task.architectureFamily ?? null,
    objective: task.objective,
    scope: task.architectureFamily ? `architecture:${task.architectureFamily}` : "venture-workspace",
    allowedPaths: task.allowedPaths,
    forbiddenPaths: task.forbiddenPaths,
    acceptanceCriteria: task.acceptanceCriteria,
    estimatedComplexity: task.complexity,
    filesAffectedEstimate: files,
    repository: {
      root: "venture-sandbox",
      sizeClass: task.complexity === "high" || task.complexity === "critical" ? "large" : "small",
      fileCount: files,
    },
    workspace: { root: "venture-sandbox", isolated: true, ventureId: task.ventureId },
    taskType: files > 8 ? "MODIFY_MULTIPLE_FILES" : "IMPLEMENT_FEATURE",
  });
}
