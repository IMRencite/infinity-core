import {
  AI_BRAIN_PROVIDER_IDS,
  DEFAULT_AI_REASONING_MODEL,
  type AiBrainProviderId,
} from "./constants";

export type AiBrainConfig = {
  providerId: AiBrainProviderId;
  modelId: string;
  enabled: boolean;
  isProduction: boolean;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
  timeoutMs: number;
  openaiApiKey: string | null;
};

export function loadAiBrainConfig(env: NodeJS.ProcessEnv = process.env): AiBrainConfig {
  const rawProvider = (env.AI_PROVIDER ?? "").trim().toLowerCase();
  const isProduction = env.NODE_ENV === "production";
  const modelId =
    env.AI_REASONING_MODEL?.trim() ||
    env.OPENAI_MODEL?.trim() ||
    DEFAULT_AI_REASONING_MODEL;

  let providerId: AiBrainProviderId;
  if (rawProvider === "mock") {
    providerId = "mock";
  } else if (rawProvider === "openai") {
    providerId = "openai";
  } else if (rawProvider === "anthropic") {
    providerId = "anthropic";
  } else if (rawProvider === "google" || rawProvider === "google_gemini") {
    providerId = "google";
  } else if (!rawProvider && !isProduction) {
    providerId = "mock";
  } else if (!rawProvider && isProduction) {
    throw new Error("AI_PROVIDER must be configured in production.");
  } else {
    throw new Error(`Unsupported AI_PROVIDER: ${rawProvider}`);
  }

  if (isProduction && providerId === "mock") {
    throw new Error("Mock AI provider is not allowed in production.");
  }

  const enabled = env.AI_BRAIN_ENABLED !== "false";

  return {
    providerId,
    modelId,
    enabled,
    isProduction,
    maxInputTokens: Number(env.AI_REASONING_MAX_INPUT_TOKENS ?? 16_000),
    maxOutputTokens: Number(
      env.AI_REASONING_MAX_OUTPUT_TOKENS ?? env.OPENAI_MAX_OUTPUT_TOKENS ?? 8_192,
    ),
    maxEstimatedCostUsd: Number(env.AI_REASONING_MAX_ESTIMATED_COST_USD ?? 2),
    maxRetries: Number(env.OPENAI_MAX_RETRIES ?? 2),
    timeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 60_000),
    openaiApiKey: env.OPENAI_API_KEY?.trim() || null,
  };
}

export function assertAiBrainProviderExecutable(config: AiBrainConfig): void {
  if (!config.enabled) {
    throw new Error("AI Brain is disabled (AI_BRAIN_ENABLED=false).");
  }

  if (!(AI_BRAIN_PROVIDER_IDS as readonly string[]).includes(config.providerId)) {
    throw new Error(`Unsupported provider: ${config.providerId}`);
  }

  if (!config.modelId || config.modelId.trim().length === 0) {
    throw new Error("AI_REASONING_MODEL must be configured.");
  }

  if (config.providerId === "openai" && !config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai.");
  }

  if (config.providerId !== "mock" && config.providerId !== "openai") {
    throw new Error(`Provider ${config.providerId} is not yet implemented.`);
  }
}

export function isMockProvider(config: AiBrainConfig): boolean {
  return config.providerId === "mock";
}
