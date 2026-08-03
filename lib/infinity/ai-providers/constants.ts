export const AI_PROVIDER_IDS = [
  "mock",
  "openai",
  "anthropic",
  "google_gemini",
  "openrouter",
  "ollama",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export const DEFAULT_AI_PROVIDER_ID: AiProviderId = "mock";

export const STRUCTURED_OUTPUT_SCHEMA_VERSION = "ai_structured_output_v1";

export const PROVIDER_ERROR_CODES = [
  "provider_disabled",
  "provider_unavailable",
  "not_configured",
  "timeout",
  "rate_limit",
  "invalid_response",
  "malformed_json",
  "validation_failed",
  "network_forbidden",
] as const;

export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];
