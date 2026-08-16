import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import { executeLiveCodingRequest, isLiveProviderAvailable } from "@/lib/infinity/multi-brain/coding/live-coding-client";

export type ProviderPreflightResult = {
  provider: string;
  configured: boolean;
  authentication: "PASS" | "FAIL" | "SKIP";
  executable: boolean;
  models: string[];
  capabilities: string[];
  error?: string;
  latencyMs?: number;
};

const PROVIDER_MODELS: Record<string, { models: string[]; capabilities: string[] }> = {
  openai: {
    models: ["gpt-4.1-mini", "gpt-4.1"],
    capabilities: ["coding", "reasoning", "structured_output", "review"],
  },
  gemini: {
    models: ["gemini-2.0-flash", "gemini-2.0-flash-lite"],
    capabilities: ["coding", "reasoning", "structured_output", "review"],
  },
  anthropic: {
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
    capabilities: ["coding", "reasoning", "structured_output", "review", "architecture"],
  },
  xai: {
    models: ["grok-3-mini", "grok-3"],
    capabilities: ["coding", "reasoning", "review"],
  },
};

export async function runProviderPreflight(options?: { liveAuthCheck?: boolean }): Promise<ProviderPreflightResult[]> {
  const config = loadAiProviderEnvConfig();
  const results: ProviderPreflightResult[] = [];

  for (const [provider, meta] of Object.entries(PROVIDER_MODELS)) {
    const providerId = provider === "gemini" ? "google_gemini" : provider;
    const configured =
      provider === "openai"
        ? Boolean(config.openaiApiKey)
        : provider === "gemini"
          ? Boolean(config.geminiApiKey || config.googleApiKey)
          : provider === "anthropic"
            ? Boolean(config.anthropicApiKey) && config.anthropicEnabled
            : provider === "xai"
              ? Boolean(config.xaiApiKey) && config.xaiEnabled
              : false;

    const executable = mayExecuteProvider(providerId as never, config);
    let authentication: ProviderPreflightResult["authentication"] = configured ? "SKIP" : "FAIL";
    let error: string | undefined;
    let latencyMs: number | undefined;

    if (configured && options?.liveAuthCheck && executable) {
      const modelId = meta.models[0]!;
      const auth = await executeLiveCodingRequest({
        provider,
        modelId,
        role: "primary",
        taskType: "preflight_auth",
        systemPrompt: "Respond with JSON: {\"ok\":true}",
        userPrompt: "ping",
        outputMode: "text",
        timeoutMs: 30_000,
      });
      authentication = auth.success ? "PASS" : "FAIL";
      error = auth.error;
      latencyMs = auth.latencyMs;
    } else if (configured) {
      authentication = executable ? "SKIP" : "FAIL";
      if (!executable) error = "AI_PROVIDER_ALLOW_LIVE_EXECUTION not enabled";
    }

    results.push({
      provider,
      configured,
      authentication,
      executable,
      models: meta.models,
      capabilities: meta.capabilities,
      error,
      latencyMs,
    });
  }

  return results;
}

export function getConfiguredLiveProviders(): string[] {
  return ["openai", "gemini", "anthropic", "xai"].filter((p) => isLiveProviderAvailable(p));
}

export function formatPreflightReport(results: ProviderPreflightResult[]): string {
  return results
    .map(
      (r) =>
        `${r.provider}: configured=${r.configured ? "YES" : "NO"} auth=${r.authentication} executable=${r.executable} models=[${r.models.join(", ")}]`,
    )
    .join("\n");
}
