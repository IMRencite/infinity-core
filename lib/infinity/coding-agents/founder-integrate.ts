import type { FounderIdeaStore } from "@/lib/infinity/founder-idea-lab/store";
import type { FounderIdeaSubmission } from "@/lib/infinity/founder-idea-lab/types";
import type { FounderBuildRouteResult } from "@/lib/infinity/founder-idea-lab/types";
import { CodingAgentStore } from "./store";
import { createCodingTask, knownCost } from "./task";
import { executeCodingAgentPipeline } from "./execute";
import { createCursorCodingAgentProvider, createInfinityNativeCoder, createMockCursorCodingAgentProvider } from "./providers/factory";
import type { TreasuryStore } from "@/lib/infinity/treasury/store";
import type { CodingAgentRun, CodingProductionArtifact } from "./types";

export type FounderCodingBuildResult = FounderBuildRouteResult & {
  codingTaskId: string | null;
  codingAgentRunId: string | null;
  codingProvider: string | null;
  codeChangeSetCreated: boolean;
  productionArtifactCreated: boolean;
  infinityAccepted: boolean;
  origin: FounderIdeaSubmission["origin"];
};

export async function runFounderIdeaCodingBuild(input: {
  founderStore: FounderIdeaStore;
  submission: FounderIdeaSubmission;
  build: FounderBuildRouteResult;
  codingStore?: CodingAgentStore;
  treasury?: TreasuryStore | null;
  preferMockCursor?: boolean;
}): Promise<FounderCodingBuildResult> {
  const codingStore = input.codingStore ?? new CodingAgentStore();
  const task = createCodingTask({
    organizationId: input.submission.organizationId,
    ventureId: input.submission.opportunityCandidateId,
    missionId: input.build.missionId,
    buildRunId: input.build.buildPackageId,
    founderIdeaSubmissionId: input.submission.id,
    objective: `Implement founder-approved venture: ${input.submission.title}`,
    estimatedComplexity: "high",
    filesAffectedEstimate: 16,
    repository: { root: `ventures/${input.submission.id}`, sizeClass: "large", fileCount: 180 },
    terminalNeeded: true,
    repositoryExplorationNeeded: true,
    debuggingDepth: "deep",
    estimatedCost: knownCost(0.2),
    allowedPaths: ["src", "app"],
  });
  const executed = await executeCodingAgentPipeline({
    store: codingStore,
    task,
    native: createInfinityNativeCoder(),
    cursor: input.preferMockCursor ? createMockCursorCodingAgentProvider() : createCursorCodingAgentProvider(),
    treasury: input.treasury,
  });
  return {
    ...input.build,
    codingTaskId: task.taskId,
    codingAgentRunId: executed.run.codingAgentRunId,
    codingProvider: executed.run.provider,
    codeChangeSetCreated: Boolean(executed.run.changeSet),
    productionArtifactCreated: Boolean(executed.artifact),
    infinityAccepted: executed.run.infinityAccepted,
    origin: input.submission.origin,
  };
}

export type FounderCodingLineage = {
  run: CodingAgentRun;
  artifact: CodingProductionArtifact | null;
};
