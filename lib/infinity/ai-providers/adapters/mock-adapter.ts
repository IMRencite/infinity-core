import { STRUCTURED_OUTPUT_SCHEMA_VERSION } from "../constants";
import {
  parseStructuredAdvisoryJson,
  validateStructuredAdvisoryPayload,
  type StructuredAdvisoryPayload,
} from "../structured-output";
import type {
  AiProviderAdapter,
  ProviderExecuteRequest,
  ProviderExecuteResult,
} from "../types";
import { listRegisteredAiModels } from "../model-registry";

function buildMockStructuredOutput(prompt: string): StructuredAdvisoryPayload {
  return validateStructuredAdvisoryPayload({
    schemaVersion: STRUCTURED_OUTPUT_SCHEMA_VERSION,
    summary: "Mock provider advisory summary (deterministic).",
    recommendations: [
      "Continue executive-gated planning only.",
      "Treat AI output as non-binding advice.",
    ],
    confidence: 72,
    rationale: [
      `Prompt length ${prompt.length} processed locally.`,
      "No external model invoked.",
    ],
    advisoryOnly: true,
    binding: false,
    executiveReviewRequired: true,
  });
}

export function buildMockStructuredOutputForPrompt(prompt: string): StructuredAdvisoryPayload {
  return buildMockStructuredOutput(prompt);
}

export const mockProviderAdapter: AiProviderAdapter = {
  id: "mock",
  name: "Mock Provider",
  version: "1.0.0",

  async initialize() {
    return { ok: true, message: "Mock provider ready." };
  },

  async health() {
    return {
      ok: true,
      providerId: "mock",
      message: "Mock provider healthy.",
      configured: true,
      executable: true,
    };
  },

  async listModels() {
    return listRegisteredAiModels({ providerId: "mock" }).map((model) => ({
      id: model.id,
      displayName: model.displayName,
    }));
  },

  estimateTokens({ prompt, systemPrompt }) {
    const text = `${systemPrompt ?? ""}\n${prompt}`;
    const inputTokens = Math.max(1, Math.ceil(text.length / 4));
    const outputTokens = 256;
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  },

  estimateCost({ tokenEstimate: _tokenEstimate }) {
    void _tokenEstimate;
    return {
      currency: "USD",
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
    };
  },

  async execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    const started = Date.now();
    const structured = buildMockStructuredOutput(request.prompt);
    const rawText = JSON.stringify(structured);

    parseStructuredAdvisoryJson(rawText);

    const tokenEstimate = mockProviderAdapter.estimateTokens({
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
    });

    const modelId = request.modelId || "mock-advisory-v1";

    return {
      providerId: "mock",
      modelId,
      rawText,
      structured,
      latencyMs: Date.now() - started,
      tokenEstimate,
      costEstimate: mockProviderAdapter.estimateCost({ modelId, tokenEstimate }),
      retries: 0,
    };
  },

  supportsTools: () => true,
  supportsVision: () => false,
  supportsJSON: () => true,
  supportsReasoning: () => true,

  async shutdown() {},
};
