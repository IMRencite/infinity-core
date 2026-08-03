import type { ReasoningModelMetadata } from "./types";
import type { ReasoningProviderId } from "./providers";

/** Catalog metadata for future models — no provider SDKs. */
export type ReasoningModelDescriptor = ReasoningModelMetadata & {
  status: "registered" | "deprecated";
  registeredAt: string;
};

const MODEL_CATALOG: ReasoningModelDescriptor[] = [
  {
    providerId: "openai",
    modelId: "placeholder-gpt",
    displayName: "Placeholder OpenAI Model",
    version: "0.0.0",
    contextWindowTokens: 128_000,
    maxOutputTokens: 16_384,
    status: "registered",
    registeredAt: "2026-08-03T00:00:00.000Z",
  },
  {
    providerId: "anthropic",
    modelId: "placeholder-claude",
    displayName: "Placeholder Anthropic Model",
    version: "0.0.0",
    contextWindowTokens: 200_000,
    maxOutputTokens: 8_192,
    status: "registered",
    registeredAt: "2026-08-03T00:00:00.000Z",
  },
  {
    providerId: "gemini",
    modelId: "placeholder-gemini",
    displayName: "Placeholder Gemini Model",
    version: "0.0.0",
    contextWindowTokens: 1_000_000,
    maxOutputTokens: 8_192,
    status: "registered",
    registeredAt: "2026-08-03T00:00:00.000Z",
  },
  {
    providerId: "local",
    modelId: "placeholder-local",
    displayName: "Placeholder Local Model",
    version: "0.0.0",
    contextWindowTokens: 32_768,
    maxOutputTokens: 4_096,
    status: "registered",
    registeredAt: "2026-08-03T00:00:00.000Z",
  },
];

export function listRegisteredModels(): ReasoningModelDescriptor[] {
  return [...MODEL_CATALOG];
}

export function listModelsForProvider(
  providerId: ReasoningProviderId,
): ReasoningModelDescriptor[] {
  return MODEL_CATALOG.filter((model) => model.providerId === providerId);
}

export function getModelDescriptor(
  providerId: ReasoningProviderId,
  modelId: string,
): ReasoningModelDescriptor | null {
  return (
    MODEL_CATALOG.find(
      (model) => model.providerId === providerId && model.modelId === modelId,
    ) ?? null
  );
}
