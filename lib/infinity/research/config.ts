import {
  DEFAULT_GEMINI_RESEARCH_MODEL,
  type ResearchProviderId,
} from "./constants";

export type ResearchConfig = {
  providerId: ResearchProviderId;
  modelId: string;
  enabled: boolean;
  isProduction: boolean;
  geminiApiKey: string | null;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxEstimatedCostUsd: number;
  maxRetries: number;
  timeoutMs: number;
  maxSearchQueries: number;
};

export function loadResearchConfig(env: NodeJS.ProcessEnv = process.env): ResearchConfig {
  const rawProvider = (env.RESEARCH_PROVIDER ?? "").trim().toLowerCase();
  const isProduction = env.NODE_ENV === "production";
  const modelId =
    env.GEMINI_RESEARCH_MODEL?.trim() ||
    env.GOOGLE_GEMINI_MODEL?.trim() ||
    DEFAULT_GEMINI_RESEARCH_MODEL;

  let providerId: ResearchProviderId;
  if (rawProvider === "mock") {
    providerId = "mock";
  } else if (rawProvider === "gemini" || rawProvider === "google" || rawProvider === "google_gemini") {
    providerId = "gemini";
  } else if (!rawProvider && !isProduction) {
    providerId = "mock";
  } else if (!rawProvider && isProduction) {
    throw new Error("RESEARCH_PROVIDER must be configured in production.");
  } else {
    throw new Error(`Unsupported RESEARCH_PROVIDER: ${rawProvider}`);
  }

  if (isProduction && providerId === "mock") {
    throw new Error("Mock research provider is not allowed in production.");
  }

  const geminiApiKey =
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || null;

  return {
    providerId,
    modelId,
    enabled: env.RESEARCH_ENABLED !== "false",
    isProduction,
    geminiApiKey,
    maxInputTokens: Number(env.RESEARCH_MAX_INPUT_TOKENS ?? 24_000),
    maxOutputTokens: Number(env.RESEARCH_MAX_OUTPUT_TOKENS ?? 16_384),
    maxEstimatedCostUsd: Number(env.RESEARCH_MAX_ESTIMATED_COST_USD ?? 2),
    maxRetries: Number(env.RESEARCH_MAX_RETRIES ?? env.GEMINI_MAX_RETRIES ?? 2),
    timeoutMs: Number(env.GEMINI_TIMEOUT_MS ?? env.RESEARCH_TIMEOUT_MS ?? 90_000),
    maxSearchQueries: Number(env.RESEARCH_MAX_SEARCH_QUERIES ?? 5),
  };
}

export function assertResearchProviderExecutable(config: ResearchConfig): void {
  if (!config.enabled) {
    throw new Error("Research is disabled (RESEARCH_ENABLED=false).");
  }
  if (!config.modelId) {
    throw new Error("GEMINI_RESEARCH_MODEL must be configured.");
  }
  if (config.providerId === "gemini" && !config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is required when RESEARCH_PROVIDER=gemini.");
  }
}

export function isMockResearchProvider(config: ResearchConfig): boolean {
  return config.providerId === "mock";
}
