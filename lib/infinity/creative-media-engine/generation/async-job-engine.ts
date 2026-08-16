import { randomUUID } from "node:crypto";
import type { MediaJobStatus } from "../constants";
import type { MediaGenerationJob, MediaProviderAdapter, MediaProviderCallResult } from "../types";

export function submitMediaJob(input: {
  taskId: string;
  provider: string;
  model: string;
  estimatedCost?: number;
}): MediaGenerationJob {
  return {
    id: randomUUID(),
    taskId: input.taskId,
    provider: input.provider,
    model: input.model,
    providerJobId: null,
    status: "SUBMITTED",
    submittedAt: new Date().toISOString(),
    lastPolledAt: null,
    completedAt: null,
    attemptCount: 1,
    estimatedCost: input.estimatedCost ?? null,
    actualCost: null,
    outputAssetIds: [],
    failureCode: null,
    failureMessage: null,
    providerMetadata: {},
  };
}

export function transitionJobStatus(job: MediaGenerationJob, status: MediaJobStatus): MediaGenerationJob {
  return {
    ...job,
    status,
    lastPolledAt: new Date().toISOString(),
    completedAt: status === "COMPLETED" || status === "FAILED" || status === "EXPIRED"
      ? new Date().toISOString()
      : job.completedAt,
  };
}

export async function pollMediaJobUntilComplete(input: {
  job: MediaGenerationJob;
  adapter: MediaProviderAdapter;
  model: string;
  outputDir: string;
  maxPolls?: number;
  pollIntervalMs?: number;
}): Promise<{ job: MediaGenerationJob; result: MediaProviderCallResult }> {
  let job = input.job;
  let result: MediaProviderCallResult = {
    success: false,
    provider: input.job.provider,
    model: input.model,
    sync: false,
    usageSource: "UNKNOWN",
    error: "Not polled",
  };

  const polls = input.maxPolls ?? 5;
  for (let i = 0; i < polls; i += 1) {
    if (!input.adapter.pollJob || !job.providerJobId) break;
    result = await input.adapter.pollJob({
      providerJobId: job.providerJobId,
      model: input.model,
      outputDir: input.outputDir,
    });
    job = transitionJobStatus(job, result.outputPath ? "COMPLETED" : "PROCESSING");
    if (result.outputPath) break;
    if (input.pollIntervalMs) {
      await new Promise((r) => setTimeout(r, input.pollIntervalMs));
    }
  }

  if (!result.outputPath && job.status !== "COMPLETED") {
    if (job.attemptCount >= (input.maxPolls ?? 5)) {
      job = transitionJobStatus({ ...job, status: "EXPIRED" }, "EXPIRED");
      result = { ...result, success: false, error: "Job polling expired" };
    }
  }

  return { job, result };
}

export function canRetryJob(job: MediaGenerationJob, maxRetries: number): boolean {
  return job.attemptCount < maxRetries && job.status === "FAILED";
}
