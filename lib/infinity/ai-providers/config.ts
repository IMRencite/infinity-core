import type { AiProviderId } from "./constants";

export type AiProviderEnvConfig = {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  googleApiKey: string | null;
  openrouterApiKey: string | null;
  ollamaUrl: string | null;
  /** When false, only mock may execute (default). */
  allowLiveProviderExecution: boolean;
  defaultProviderId: AiProviderId;
  requestTimeoutMs: number;
  maxRetries: number;
};

export function loadAiProviderEnvConfig(
  env: NodeJS.ProcessEnv = process.env,
): AiProviderEnvConfig {
  return {
    openaiApiKey: env.OPENAI_API_KEY?.trim() || null,
    anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || null,
    googleApiKey: env.GOOGLE_API_KEY?.trim() || null,
    openrouterApiKey: env.OPENROUTER_API_KEY?.trim() || null,
    ollamaUrl: env.OLLAMA_URL?.trim() || null,
    allowLiveProviderExecution: env.AI_PROVIDER_ALLOW_LIVE_EXECUTION === "true",
    defaultProviderId: (env.AI_PROVIDER_DEFAULT as AiProviderId | undefined) ?? "mock",
    requestTimeoutMs: Number(env.AI_PROVIDER_TIMEOUT_MS ?? 30_000),
    maxRetries: Number(env.AI_PROVIDER_MAX_RETRIES ?? 2),
  };
}

export function isProviderConfigured(
  providerId: AiProviderId,
  config: AiProviderEnvConfig,
): boolean {
  switch (providerId) {
    case "mock":
      return true;
    case "openai":
      return Boolean(config.openaiApiKey);
    case "anthropic":
      return Boolean(config.anthropicApiKey);
    case "google_gemini":
      return Boolean(config.googleApiKey);
    case "openrouter":
      return Boolean(config.openrouterApiKey);
    case "ollama":
      return Boolean(config.ollamaUrl);
    default:
      return false;
  }
}

export function mayExecuteProvider(
  providerId: AiProviderId,
  config: AiProviderEnvConfig,
): boolean {
  if (providerId === "mock") {
    return true;
  }

  return config.allowLiveProviderExecution && isProviderConfigured(providerId, config);
}
