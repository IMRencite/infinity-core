import type { LiveCodingResult } from "@/lib/infinity/multi-brain/coding/live-coding-client";
import type { ProviderUsageRecord } from "../types";

const MODEL_RATES: Record<string, { in: number; out: number }> = {
  openai: { in: 0.00015, out: 0.0006 },
  anthropic: { in: 0.0003, out: 0.0015 },
  gemini: { in: 0.0001, out: 0.0004 },
  xai: { in: 0.0002, out: 0.0006 },
};

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function normalizeProviderUsage(input: {
  provider: string;
  modelId: string;
  role: string;
  taskType: string;
  codingTaskId?: string;
  systemPrompt: string;
  userPrompt: string;
  result: LiveCodingResult;
}): ProviderUsageRecord {
  let inputTokens = input.result.inputTokens;
  let outputTokens = input.result.outputTokens;
  let usageSource: "provider" | "estimated" = "provider";

  if (inputTokens === 0 && outputTokens === 0 && input.result.success) {
    inputTokens = estimateTokensFromText(`${input.systemPrompt}\n${input.userPrompt}`);
    outputTokens = estimateTokensFromText(input.result.rawText);
    usageSource = "estimated";
  }

  const totalTokens = inputTokens + outputTokens;
  const rates = MODEL_RATES[input.provider] ?? { in: 0.0002, out: 0.0008 };
  const estimatedCostUsd =
    input.result.estimatedCostUsd > 0
      ? input.result.estimatedCostUsd
      : (inputTokens / 1000) * rates.in + (outputTokens / 1000) * rates.out;

  return {
    provider: input.provider,
    modelId: input.modelId,
    role: input.role,
    taskType: input.taskType,
    codingTaskId: input.codingTaskId,
    inputTokens,
    outputTokens,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens,
    estimatedCostUsd,
    latencyMs: input.result.latencyMs,
    usageSource,
    success: input.result.success,
    error: input.result.error,
  };
}

export function aggregateUsage(records: ProviderUsageRecord[]): {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, { tasks: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  usageSourceByProvider: Record<string, "provider" | "estimated">;
} {
  const byProvider: Record<string, { tasks: number; inputTokens: number; outputTokens: number; costUsd: number }> = {};
  const usageSourceByProvider: Record<string, "provider" | "estimated"> = {};
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  for (const r of records) {
    totalInputTokens += r.inputTokens;
    totalOutputTokens += r.outputTokens;
    totalCostUsd += r.estimatedCostUsd;
    const bucket = byProvider[r.provider] ?? { tasks: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    bucket.tasks += 1;
    bucket.inputTokens += r.inputTokens;
    bucket.outputTokens += r.outputTokens;
    bucket.costUsd += r.estimatedCostUsd;
    byProvider[r.provider] = bucket;
    if (r.usageSource === "estimated") usageSourceByProvider[r.provider] = "estimated";
    else if (!usageSourceByProvider[r.provider]) usageSourceByProvider[r.provider] = "provider";
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCostUsd,
    byProvider,
    usageSourceByProvider,
  };
}
