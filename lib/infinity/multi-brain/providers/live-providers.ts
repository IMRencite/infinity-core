import type { BrainRole } from "@/lib/infinity/multi-brain/constants";
import { executeLiveCodingRequest } from "@/lib/infinity/multi-brain/coding/live-coding-client";
import type { BrainExecutionOutput, BrainProvider } from "@/lib/infinity/multi-brain/types";
import { isLiveProviderAvailable } from "@/lib/infinity/multi-brain/coding/live-coding-client";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4.1-mini",
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-20250514",
  xai: "grok-3-mini",
};

function roleOutputMode(role: BrainRole): "coding" | "review" | "text" {
  if (role === "critic" || role === "reviewer") return "review";
  if (role === "primary" || role === "specialist") return "coding";
  return "text";
}

export function createLiveBrainProvider(provider: string): BrainProvider {
  return {
    provider,
    isConfigured: () => isLiveProviderAvailable(provider),
    async execute(input) {
      const modelId = input.modelId || DEFAULT_MODELS[provider] || "gpt-4.1-mini";
      const outputMode = roleOutputMode(input.role);
      const systemPrompt = `You are Infinity multi-brain role=${input.role} for task=${input.taskType}. Return strict JSON only when coding/review mode. Never include secrets. Stay within allowed workspace paths.`;
      const userPrompt = [
        input.prompt,
        input.context ? `\nContext:\n${JSON.stringify(input.context).slice(0, 12000)}` : "",
      ].join("");

      const result = await executeLiveCodingRequest({
        provider,
        modelId,
        role: input.role,
        taskType: input.taskType,
        systemPrompt,
        userPrompt,
        outputMode,
      });

      const structured: Record<string, unknown> = {
        ...(result.coding ?? {}),
        ...(result.review ?? {}),
        role: input.role,
        taskType: input.taskType,
      };

      return {
        provider,
        modelId,
        role: input.role,
        content: result.rawText.slice(0, 4000),
        structured,
        confidence: result.review?.confidence ?? result.coding?.confidence ?? (result.success ? 0.8 : 0),
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        latencyMs: result.latencyMs,
        success: result.success,
        error: result.error,
      } satisfies BrainExecutionOutput;
    },
  };
}

export function getLiveBrainProviders(): BrainProvider[] {
  return ["openai", "gemini", "anthropic", "xai"]
    .filter((p) => isLiveProviderAvailable(p))
    .map((p) => createLiveBrainProvider(p));
}

import { createMockBrainProvider } from "./mock";

export function getBrainProvidersForMode(liveMode: boolean, simulatedOutage?: string): BrainProvider[] {
  if (!liveMode) {
    return [createMockBrainProvider()];
  }
  const live = getLiveBrainProviders().filter((p) => p.provider !== simulatedOutage);
  if (live.length === 0) {
    throw new Error("No live providers configured for PAB V2 live mode");
  }
  return live;
}

export function resolveLiveProvider(providers: BrainProvider[], providerName: string): BrainProvider | undefined {
  return providers.find((p) => p.provider === providerName);
}
