import type { AiProviderId } from "./constants";

export type RegisteredAiModel = {
  id: string;
  providerId: AiProviderId;
  displayName: string;
  version: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsJson: boolean;
  supportsReasoning: boolean;
  inputCostPer1kTokens: number | null;
  outputCostPer1kTokens: number | null;
};

const models = new Map<string, RegisteredAiModel>();

function modelKey(providerId: AiProviderId, modelId: string): string {
  return `${providerId}:${modelId}`;
}

export function registerAiModel(model: RegisteredAiModel): void {
  models.set(modelKey(model.providerId, model.id), model);
}

export function unregisterAiModel(providerId: AiProviderId, modelId: string): void {
  models.delete(modelKey(providerId, modelId));
}

export function getRegisteredAiModel(
  providerId: AiProviderId,
  modelId: string,
): RegisteredAiModel | null {
  return models.get(modelKey(providerId, modelId)) ?? null;
}

export function listRegisteredAiModels(filter?: {
  providerId?: AiProviderId;
}): RegisteredAiModel[] {
  const all = [...models.values()];
  if (!filter?.providerId) {
    return all.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  return all
    .filter((model) => model.providerId === filter.providerId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function clearAiModelRegistry(): void {
  models.clear();
}

/** Example catalog entries — vendors registered at runtime, not hardcoded in adapters. */
export function seedExampleModelCatalog(): void {
  const examples: Array<Omit<RegisteredAiModel, "providerId"> & { providerId: AiProviderId }> = [
    {
      providerId: "mock",
      id: "mock-advisory-v1",
      displayName: "Mock Advisory v1",
      version: "1.0.0",
      contextWindowTokens: 128_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsVision: false,
      supportsJson: true,
      supportsReasoning: true,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
    },
    {
      providerId: "openai",
      id: "gpt-5",
      displayName: "GPT-5",
      version: "placeholder",
      contextWindowTokens: 256_000,
      maxOutputTokens: 32_768,
      supportsTools: true,
      supportsVision: true,
      supportsJson: true,
      supportsReasoning: true,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    {
      providerId: "anthropic",
      id: "claude",
      displayName: "Claude",
      version: "placeholder",
      contextWindowTokens: 200_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsVision: true,
      supportsJson: true,
      supportsReasoning: true,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    {
      providerId: "google_gemini",
      id: "gemini",
      displayName: "Gemini",
      version: "placeholder",
      contextWindowTokens: 1_000_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsVision: true,
      supportsJson: true,
      supportsReasoning: true,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    {
      providerId: "openrouter",
      id: "deepseek",
      displayName: "DeepSeek",
      version: "placeholder",
      contextWindowTokens: 128_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsVision: false,
      supportsJson: true,
      supportsReasoning: true,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    {
      providerId: "openrouter",
      id: "qwen",
      displayName: "Qwen",
      version: "placeholder",
      contextWindowTokens: 128_000,
      maxOutputTokens: 8_192,
      supportsTools: true,
      supportsVision: false,
      supportsJson: true,
      supportsReasoning: false,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    },
    {
      providerId: "ollama",
      id: "llama",
      displayName: "Llama",
      version: "placeholder",
      contextWindowTokens: 32_768,
      maxOutputTokens: 4_096,
      supportsTools: false,
      supportsVision: false,
      supportsJson: true,
      supportsReasoning: false,
      inputCostPer1kTokens: 0,
      outputCostPer1kTokens: 0,
    },
  ];

  for (const model of examples) {
    registerAiModel(model);
  }
}
