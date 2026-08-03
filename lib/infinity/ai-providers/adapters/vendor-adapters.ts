import type { AiProviderEnvConfig } from "../config";
import { createOpenAiProviderAdapter } from "../openai/provider";
import { createDisabledLiveAdapter } from "./disabled-live-adapter";

export function createOpenAiAdapter(config: AiProviderEnvConfig, env?: NodeJS.ProcessEnv) {
  const mergedEnv = env ? { ...process.env, ...env } : process.env;
  void config;
  return createOpenAiProviderAdapter(mergedEnv);
}

export function createAnthropicAdapter(config: AiProviderEnvConfig) {
  return createDisabledLiveAdapter({
    id: "anthropic",
    name: "Anthropic",
    config,
    supports: { tools: true, vision: true, json: true, reasoning: true },
  });
}

export function createGeminiAdapter(config: AiProviderEnvConfig) {
  return createDisabledLiveAdapter({
    id: "google_gemini",
    name: "Google Gemini",
    config,
    supports: { tools: true, vision: true, json: true, reasoning: true },
  });
}

export function createOpenRouterAdapter(config: AiProviderEnvConfig) {
  return createDisabledLiveAdapter({
    id: "openrouter",
    name: "OpenRouter",
    config,
    supports: { tools: true, vision: false, json: true, reasoning: true },
  });
}

export function createOllamaAdapter(config: AiProviderEnvConfig) {
  return createDisabledLiveAdapter({
    id: "ollama",
    name: "Ollama",
    config,
    supports: { tools: false, vision: false, json: true, reasoning: false },
  });
}
