import type { CodingTask } from "@/lib/infinity/product-asset-builder/v2.1/types";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import { createCodingTask } from "./task";
import { executeCodingAgentPipeline } from "./execute";
import { CodingAgentStore } from "./store";
import { createCursorCodingAgentProvider, createInfinityNativeCoder, createMockCursorCodingAgentProvider } from "./providers/factory";
import type { CanonicalCodingTask } from "./types";

/** Map a PAB CodingTask onto the canonical coding-agent task without changing BuildPackage semantics. */
export function pabTaskToCanonical(organizationId: string, task: CodingTask): CanonicalCodingTask {
  const files = Math.max(task.relevantFiles.length, task.maxFilesChanged, 1);
  return createCodingTask({
    taskId: task.id,
    organizationId,
    ventureId: task.ventureId,
    buildRunId: task.buildRunId,
    objective: task.objective,
    allowedPaths: task.allowedPaths,
    forbiddenPaths: task.forbiddenPaths,
    acceptanceCriteria: task.acceptanceCriteria,
    estimatedComplexity: task.complexity,
    filesAffectedEstimate: files,
    repository: {
      root: "venture-sandbox",
      sizeClass: files > 8 || task.complexity === "high" || task.complexity === "critical" ? "large" : "small",
      fileCount: task.repositoryContext.fileTree.length || files,
    },
    taskType: task.taskType === "REFACTOR" ? "REFACTOR" : files > 8 ? "MODIFY_MULTIPLE_FILES" : "IMPLEMENT_FEATURE",
  });
}

export async function executePabCodingTaskWithAgents(input: {
  organizationId: string;
  task: CodingTask;
  store?: CodingAgentStore;
  useMockCursor?: boolean;
}): Promise<{ changeSet: CodeChangeSet | null; provider: string; infinityAccepted: boolean }> {
  const store = input.store ?? new CodingAgentStore();
  const canonical = pabTaskToCanonical(input.organizationId, input.task);
  const result = await executeCodingAgentPipeline({
    store,
    task: canonical,
    native: createInfinityNativeCoder(),
    cursor: input.useMockCursor ? createMockCursorCodingAgentProvider() : createCursorCodingAgentProvider(),
  });
  return {
    changeSet: result.run.changeSet,
    provider: result.run.provider,
    infinityAccepted: result.run.infinityAccepted,
  };
}
