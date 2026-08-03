import { loadAiProviderEnvConfig } from "./config";
import { bootstrapAiProviders } from "./bootstrap";
import { isAiProviderError } from "./errors";
import { renderPromptSegment } from "@/lib/infinity/reasoning/prompts";
import type { ReasoningSession } from "@/lib/infinity/reasoning/types";
import { defaultRetryPolicy, withProviderRetry } from "./retry";
import { getAiProvider, selectAiProvider } from "./registry";
import { recordProviderTelemetry } from "./observability";
import type { AiProviderId } from "./constants";
import { DEFAULT_AI_PROVIDER_ID } from "./constants";
import type { ExecutiveReviewEnvelope, ProviderExecuteResult } from "./types";
import { parseStructuredAdvisoryJson } from "./structured-output";
import { mockProviderAdapter, buildMockStructuredOutputForPrompt } from "./adapters/mock-adapter";

export type ProviderRuntimeInput = {
  session: ReasoningSession;
  preferredProviderId?: AiProviderId | null;
  fallbackProviderIds?: AiProviderId[];
  env?: NodeJS.ProcessEnv;
};

export type ProviderRuntimeResult = {
  status: "completed" | "skipped" | "failed";
  message: string;
  providerId: AiProviderId | null;
  modelId: string | null;
  execution: ProviderExecuteResult | null;
  executiveReview: ExecutiveReviewEnvelope | null;
};

function buildPromptFromSession(session: ReasoningSession): {
  prompt: string;
  systemPrompt: string;
} {
  const segments = session.composedPrompts?.segments ?? [];
  const rendered = segments.map((segment) => renderPromptSegment(segment));

  return {
    systemPrompt: "Infinity advisory reasoning runtime. Output is non-binding.",
    prompt: rendered.join("\n") || "No composed prompt segments available.",
  };
}

export function buildExecutiveReviewEnvelope(
  execution: ProviderExecuteResult,
): ExecutiveReviewEnvelope {
  return {
    structured: execution.structured,
    executiveAuthoritative: true,
    accepted: false,
    reviewRequired: true,
    message:
      "Executive review required. AI structured output is advisory and cannot override Executive decisions.",
  };
}

function applyExecutionResult(
  execution: ProviderExecuteResult,
  retries: number,
  correlationId: string,
): ProviderRuntimeResult {
  recordProviderTelemetry({
    id: crypto.randomUUID(),
    correlationId,
    providerId: execution.providerId,
    modelId: execution.modelId,
    latencyMs: execution.latencyMs,
    tokenEstimate: execution.tokenEstimate,
    costEstimate: execution.costEstimate,
    retries,
    errorCode: null,
    errorMessage: null,
    occurredAt: new Date().toISOString(),
  });

  return {
    status: "completed",
    message: `Provider ${execution.providerId} execution completed (advisory only).`,
    providerId: execution.providerId,
    modelId: execution.modelId,
    execution: { ...execution, retries },
    executiveReview: buildExecutiveReviewEnvelope(execution),
  };
}

/** Synchronous mock execution for deterministic reasoning pipeline stages. */
export function executeProviderRuntimeSync(input: ProviderRuntimeInput): ProviderRuntimeResult {
  bootstrapAiProviders({ env: input.env, registerReasoning: false });

  const config = loadAiProviderEnvConfig(input.env);
  const providerId =
    input.preferredProviderId ??
    (input.session.selectedProviderId as AiProviderId | null) ??
    config.defaultProviderId ??
    DEFAULT_AI_PROVIDER_ID;

  if (providerId !== "mock") {
    return {
      status: "skipped",
      message: "Synchronous pipeline execution supports mock provider only.",
      providerId,
      modelId: null,
      execution: null,
      executiveReview: null,
    };
  }

  const provider = getAiProvider("mock") ?? mockProviderAdapter;
  const { prompt, systemPrompt } = buildPromptFromSession(input.session);
  const modelId = input.session.selectedModel?.modelId ?? "mock-advisory-v1";

  const started = Date.now();
  const tokenEstimate = provider.estimateTokens({ prompt, systemPrompt });
  const structured = buildMockStructuredOutputForPrompt(prompt);
  const rawText = JSON.stringify(structured);

  return applyExecutionResult(
    {
      providerId: "mock",
      modelId,
      rawText,
      structured,
      latencyMs: Date.now() - started,
      tokenEstimate,
      costEstimate: provider.estimateCost({ modelId, tokenEstimate }),
      retries: 0,
    },
    0,
    input.session.refs.correlationId,
  );
}

export async function executeProviderRuntime(
  input: ProviderRuntimeInput,
): Promise<ProviderRuntimeResult> {
  bootstrapAiProviders({ env: input.env, registerReasoning: false });

  const config = loadAiProviderEnvConfig(input.env);
  const provider =
    selectAiProvider({
      preferredProviderId:
        input.preferredProviderId ??
        (input.session.selectedProviderId as AiProviderId | null) ??
        config.defaultProviderId ??
        DEFAULT_AI_PROVIDER_ID,
      fallbackProviderIds: input.fallbackProviderIds ?? ["mock"],
    }) ?? selectAiProvider({ preferredProviderId: "mock" });

  if (!provider) {
    return {
      status: "skipped",
      message: "No AI provider registered.",
      providerId: null,
      modelId: null,
      execution: null,
      executiveReview: null,
    };
  }

  const { mayExecuteProvider } = await import("./config");

  if (!mayExecuteProvider(provider.id, config) && provider.id !== "mock") {
    return executeProviderRuntimeSync({
      ...input,
      preferredProviderId: "mock",
      fallbackProviderIds: input.fallbackProviderIds ?? ["mock"],
    });
  }

  if (provider.id === "mock") {
    return executeProviderRuntimeSync(input);
  }

  const { prompt, systemPrompt } = buildPromptFromSession(input.session);
  const modelId = input.session.selectedModel?.modelId ?? `${provider.id}-default`;

  try {
    const policy = defaultRetryPolicy(config.maxRetries);

    const { result, retries } = await withProviderRetry(policy, async () =>
      provider.execute({
        correlationId: input.session.refs.correlationId,
        modelId,
        prompt,
        systemPrompt,
        timeoutMs: config.requestTimeoutMs,
        requireJson: true,
      }),
    );

    parseStructuredAdvisoryJson(result.rawText || JSON.stringify(result.structured));

    return applyExecutionResult(result, retries, input.session.refs.correlationId);
  } catch (error) {
    const code = isAiProviderError(error) ? error.code : "provider_unavailable";
    const message = error instanceof Error ? error.message : "Provider execution failed.";

    recordProviderTelemetry({
      id: crypto.randomUUID(),
      correlationId: input.session.refs.correlationId,
      providerId: provider.id,
      modelId,
      latencyMs: 0,
      tokenEstimate: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      costEstimate: {
        currency: "USD",
        inputCost: null,
        outputCost: null,
        totalCost: null,
      },
      retries: 0,
      errorCode: code,
      errorMessage: message,
      occurredAt: new Date().toISOString(),
    });

    return executeProviderRuntimeSync({
      ...input,
      preferredProviderId: "mock",
      fallbackProviderIds: [],
    });
  }
}
