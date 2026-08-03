import { DEFAULT_OPENAI_MODEL } from "@/lib/infinity/governed-reasoning/constants";

export type OpenAiReasoningConfig = {
  apiKey: string | null;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
};

export function loadOpenAiReasoningConfig(
  env: NodeJS.ProcessEnv = process.env,
): OpenAiReasoningConfig {
  const effort = (env.OPENAI_REASONING_EFFORT ?? "medium").trim().toLowerCase();

  return {
    apiKey: env.OPENAI_API_KEY?.trim() || null,
    model: env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    reasoningEffort:
      effort === "low" || effort === "high" || effort === "medium" ? effort : "medium",
    maxOutputTokens: Number(env.OPENAI_MAX_OUTPUT_TOKENS ?? 4_096),
    timeoutMs: Number(env.OPENAI_TIMEOUT_MS ?? 60_000),
    maxRetries: Number(env.OPENAI_MAX_RETRIES ?? 2),
  };
}

export function assertOpenAiConfigured(config: OpenAiReasoningConfig): void {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

export function validateConfiguredModel(model: string): void {
  if (!model || model.trim().length === 0) {
    throw new Error("OPENAI_MODEL must be configured.");
  }
}
