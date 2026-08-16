import { randomUUID } from "node:crypto";
import path from "node:path";
import { resolveRepoRoot } from "@/lib/infinity/product-asset-builder/paths";
import type {
  CreativeBrief,
  GeneratedMediaAsset,
  MediaGenerationJob,
  MediaGenerationTask,
  MediaProviderCallResult,
  MediaRoutingDecision,
} from "../types";
import { getMediaProviderAdapter } from "../providers/media-provider-registry";
import { submitMediaJob, pollMediaJobUntilComplete } from "./async-job-engine";

export function buildMediaOutputDir(organizationId: string, runId: string): string {
  return path.join(resolveRepoRoot(), ".infinity", "media", organizationId, runId);
}

export function providerResultToAsset(input: {
  result: MediaProviderCallResult;
  task: MediaGenerationTask;
  brief: CreativeBrief;
  routing: MediaRoutingDecision;
  job: MediaGenerationJob;
  attempt: number;
}): GeneratedMediaAsset {
  return {
    assetId: randomUUID(),
    mediaType: input.task.taskType.includes("VIDEO") ? "video" : "image",
    mimeType: input.result.mimeType ?? "application/octet-stream",
    filePath: input.result.outputPath ?? "",
    width: input.result.width ?? null,
    height: input.result.height ?? null,
    durationSec: input.result.durationSec ?? null,
    fileSizeBytes: input.result.fileSizeBytes ?? null,
    checksum: input.result.checksum ?? null,
    sourceType: "generated",
    provider: input.result.provider,
    model: input.result.model,
    providerJobId: input.result.providerJobId ?? input.job.providerJobId,
    generationAttempt: input.attempt,
    creativeBriefId: input.brief.briefId,
    generationTaskId: input.task.taskId,
    routingDecisionId: input.routing.id,
    prompt: input.task.prompt,
    negativeConstraints: input.task.negativeConstraints,
    referenceAssetIds: input.task.referenceAssetIds,
    generationParameters: input.result.providerMetadata,
    createdAt: new Date().toISOString(),
    estimatedCost: input.result.estimatedCostUsd ?? null,
    actualCost: input.result.actualCostUsd ?? null,
    qualityStatus: "pending",
    productionStatus: "GENERATED",
    usageRights: "UNKNOWN",
  };
}

export async function executeMediaGenerationTask(input: {
  task: MediaGenerationTask;
  brief: CreativeBrief;
  routing: MediaRoutingDecision;
  outputDir: string;
  maxAttempts?: number;
}): Promise<{ job: MediaGenerationJob; result: MediaProviderCallResult; asset: GeneratedMediaAsset | null }> {
  const adapter = getMediaProviderAdapter(input.routing.selectedProvider);
  if (!adapter) {
    throw new Error(`No adapter registered for provider ${input.routing.selectedProvider}`);
  }

  let attempt = 0;
  let lastResult: MediaProviderCallResult | null = null;
  let job = submitMediaJob({
    taskId: input.task.taskId,
    provider: input.routing.selectedProvider,
    model: input.routing.selectedModel,
    estimatedCost: adapter.estimateCost({
      taskType: input.task.taskType,
      durationSec: input.task.durationSec,
    }),
  });

  const maxAttempts = input.maxAttempts ?? 2;
  while (attempt < maxAttempts) {
    attempt += 1;
    lastResult = await adapter.submitJob({
      task: input.task,
      brief: input.brief,
      model: input.routing.selectedModel,
      outputDir: input.outputDir,
    });

    if (lastResult.success && lastResult.sync && lastResult.outputPath) {
      job = {
        ...job,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        outputAssetIds: [],
        actualCost: lastResult.actualCostUsd ?? lastResult.estimatedCostUsd ?? null,
        providerJobId: lastResult.providerJobId ?? null,
      };
      break;
    }

    if (lastResult.success && !lastResult.sync && lastResult.providerJobId && adapter.pollJob) {
      job = {
        ...job,
        status: "PROCESSING",
        providerJobId: lastResult.providerJobId,
        submittedAt: new Date().toISOString(),
      };
      const polled = await pollMediaJobUntilComplete({
        job,
        adapter,
        model: input.routing.selectedModel,
        outputDir: input.outputDir,
        maxPolls: 3,
        pollIntervalMs: 100,
      });
      job = polled.job;
      lastResult = polled.result;
      if (polled.result.success && polled.result.outputPath) break;
    }

    if (!lastResult.success) {
      job = { ...job, status: "FAILED", failureMessage: lastResult.error ?? "Provider failure" };
      break;
    }
  }

  const asset =
    lastResult?.success && lastResult.outputPath
      ? providerResultToAsset({
          result: lastResult,
          task: input.task,
          brief: input.brief,
          routing: input.routing,
          job,
          attempt,
        })
      : null;

  return { job, result: lastResult!, asset };
}
