import { GoogleGenAI } from "@google/genai";
import type { ResearchConfig } from "../config";
import { estimateResearchCostUsd } from "../cost-pricing";
import { ResearchError } from "../failures";
import { buildGroundingUsageFromMetadata, extractGroundingMetadata } from "../normalization/evidence";
import type { GroundedResearchProvider, GroundedResearchProviderRequest } from "../provider-contract";
import { parseProviderResearchJson } from "../schema";
import type { ResearchProviderCallResult } from "../types";

function readTokenUsage(usage: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
} | null | undefined) {
  const inputTokens = Number(usage?.promptTokenCount ?? 0);
  const outputTokens = Number(usage?.candidatesTokenCount ?? 0);
  const totalTokens = Number(usage?.totalTokenCount ?? inputTokens + outputTokens);
  return { inputTokens, outputTokens, totalTokens };
}

function readInteractionTokenUsage(usage: {
  total_input_tokens?: number;
  total_output_tokens?: number;
} | null | undefined) {
  const inputTokens = Number(usage?.total_input_tokens ?? 0);
  const outputTokens = Number(usage?.total_output_tokens ?? 0);
  return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens };
}

function shouldUseInteractionsApi(modelId: string): boolean {
  return /^gemini-3/i.test(modelId);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function collectUrlCitations(
  value: unknown,
  citations: Array<{ url: string; title?: string }>,
  seenUrls: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectUrlCitations(entry, citations, seenUrls);
    }
    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  if (record.type === "url_citation" && typeof record.url === "string") {
    const url = record.url.trim();
    if (url && /^https?:\/\//i.test(url) && !seenUrls.has(url)) {
      seenUrls.add(url);
      citations.push({
        url,
        title: typeof record.title === "string" ? record.title : undefined,
      });
    }
  }

  for (const nested of Object.values(record)) {
    collectUrlCitations(nested, citations, seenUrls);
  }
}

function buildGroundingMetadataFromInteractionSteps(
  steps: unknown[],
  interaction: Record<string, unknown>,
): Record<string, unknown> | null {
  const webSearchQueries: string[] = [];
  const groundingChunks: Array<{ web?: { uri?: string; title?: string } }> = [];
  const seenUrls = new Set<string>();

  for (const step of steps) {
    const record = asRecord(step);
    if (!record) continue;

    if (record.type === "google_search_call") {
      const args = asRecord(record.arguments);
      const queries = args?.queries;
      if (Array.isArray(queries)) {
        for (const query of queries) {
          if (typeof query === "string" && query.trim()) {
            webSearchQueries.push(query.trim());
          }
        }
      }
    }
  }

  const citations: Array<{ url: string; title?: string }> = [];
  collectUrlCitations(interaction, citations, seenUrls);
  for (const citation of citations) {
    groundingChunks.push({
      web: {
        uri: citation.url,
        title: citation.title,
      },
    });
  }

  if (webSearchQueries.length === 0 && groundingChunks.length === 0) {
    return null;
  }

  return { webSearchQueries, groundingChunks, groundingSupports: [] };
}

function extractInteractionOutputText(interaction: Record<string, unknown>): string {
  const direct = interaction.outputText ?? interaction.output_text;
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const steps = interaction.steps;
  if (!Array.isArray(steps)) {
    return "";
  }

  for (const step of steps) {
    const record = asRecord(step);
    if (!record || record.type !== "model_output" || !Array.isArray(record.content)) {
      continue;
    }
    for (const block of record.content) {
      const content = asRecord(block);
      if (content?.type === "text" && typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }

  return "";
}

function classifyGeminiTransportError(error: unknown): ResearchError {
  if (error instanceof ResearchError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Gemini request failed.";
  return new ResearchError(
    message,
    /404|not found|no longer available|unsupported model/i.test(String(error))
      ? "unsupported_model"
      : /quota|resource exhausted|credits/i.test(String(error))
        ? "quota_exhausted"
        : /429|rate limit/i.test(String(error))
          ? "rate_limit"
          : "provider_unavailable",
    { retryable: /429|timeout|unavailable/i.test(String(error)) },
  );
}

function parseStructuredResearchOutput(rawText: string): void {
  try {
    parseProviderResearchJson(rawText);
  } catch (error) {
    throw new ResearchError(
      error instanceof Error ? error.message : "Malformed JSON response from research provider.",
      "malformed_response",
      { retryable: true },
    );
  }
}

async function executeViaInteractionsApi(
  ai: GoogleGenAI,
  request: GroundedResearchProviderRequest,
  started: number,
  attemptCount: number,
  maxAttempts: number,
): Promise<ResearchProviderCallResult> {
  const interaction = await ai.interactions.create({
    model: request.modelId,
    system_instruction: request.systemInstructions,
    input: request.researchObjective,
    tools: [{ type: "google_search" }],
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: request.responseSchema,
    },
    generation_config: {
      max_output_tokens: request.maxOutputTokens,
    },
  });

  const rawProviderResponse = JSON.parse(JSON.stringify(interaction)) as Record<string, unknown>;
  const rawText = extractInteractionOutputText(rawProviderResponse);
  if (!rawText) {
    throw new ResearchError("Gemini returned empty structured output.", "malformed_response", {
      retryable: true,
    });
  }

  parseStructuredResearchOutput(rawText);

  const steps = Array.isArray(interaction.steps) ? interaction.steps : [];
  const groundingMetadata = buildGroundingMetadataFromInteractionSteps(steps, rawProviderResponse);
  const groundingUsage = buildGroundingUsageFromMetadata(groundingMetadata as never);

  if (!groundingUsage.groundingInvoked) {
    throw new ResearchError(
      "Google Search grounding metadata missing from Gemini response.",
      "grounding_unavailable",
    );
  }

  const tokenUsage = readInteractionTokenUsage(interaction.usage ?? null);
  const { estimatedCostUsd, costUncertainty } = estimateResearchCostUsd({
    modelId: request.modelId,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    searchQueryCount: groundingUsage.searchQueryCount,
  });

  return {
    providerId: "gemini",
    modelId: request.modelId,
    requestId: typeof interaction.id === "string" ? interaction.id : null,
    rawText,
    rawProviderResponse,
    groundingMetadata: groundingMetadata as Record<string, unknown> | null,
    tokenUsage,
    groundingUsage,
    estimatedCostUsd,
    costUncertainty,
    latencyMs: Date.now() - started,
    retryMetadata: {
      attemptCount,
      maxAttempts,
      retried: attemptCount > 1,
    },
  };
}

async function executeViaGenerateContentApi(
  ai: GoogleGenAI,
  request: GroundedResearchProviderRequest,
  started: number,
  attemptCount: number,
  maxAttempts: number,
): Promise<ResearchProviderCallResult> {
  const response = await ai.models.generateContent({
    model: request.modelId,
    contents: [
      { role: "user", parts: [{ text: request.systemInstructions }] },
      {
        role: "user",
        parts: [{ text: request.researchObjective }],
      },
    ],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: request.responseSchema,
      maxOutputTokens: request.maxOutputTokens,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new ResearchError("Gemini returned empty structured output.", "malformed_response", {
      retryable: true,
    });
  }

  const rawProviderResponse = JSON.parse(JSON.stringify(response)) as Record<string, unknown>;
  const candidate = (rawProviderResponse.candidates as unknown[] | undefined)?.[0] as
    | Record<string, unknown>
    | undefined;
  const finishReason = String(candidate?.finishReason ?? "");
  if (finishReason === "MAX_TOKENS") {
    throw new ResearchError(
      "Gemini structured output truncated (MAX_TOKENS).",
      "malformed_response",
      { retryable: true },
    );
  }

  parseStructuredResearchOutput(rawText);

  const groundingMetadata = extractGroundingMetadata(rawProviderResponse);
  const groundingUsage = buildGroundingUsageFromMetadata(groundingMetadata);

  if (!groundingUsage.groundingInvoked) {
    throw new ResearchError(
      "Google Search grounding metadata missing from Gemini response.",
      "grounding_unavailable",
    );
  }

  const tokenUsage = readTokenUsage(response.usageMetadata ?? null);
  const { estimatedCostUsd, costUncertainty } = estimateResearchCostUsd({
    modelId: request.modelId,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    searchQueryCount: groundingUsage.searchQueryCount,
  });

  return {
    providerId: "gemini",
    modelId: request.modelId,
    requestId: response.responseId ?? null,
    rawText,
    rawProviderResponse,
    groundingMetadata: groundingMetadata as Record<string, unknown> | null,
    tokenUsage,
    groundingUsage,
    estimatedCostUsd,
    costUncertainty,
    latencyMs: Date.now() - started,
    retryMetadata: {
      attemptCount,
      maxAttempts,
      retried: attemptCount > 1,
    },
  };
}

export function createGeminiGroundedResearchProvider(
  config: ResearchConfig,
): GroundedResearchProvider {
  return {
    providerId: "gemini",
    isSimulation: false,

    async executeGroundedResearch(
      request: GroundedResearchProviderRequest,
    ): Promise<ResearchProviderCallResult> {
      if (!config.geminiApiKey) {
        throw new ResearchError("GEMINI_API_KEY is not configured.", "authentication_failure");
      }

      const started = Date.now();
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const useInteractionsApi = shouldUseInteractionsApi(request.modelId);

      let lastError: unknown;

      for (let attempt = 0; attempt <= request.maxRetries; attempt += 1) {
        const attemptCount = attempt + 1;
        const maxAttempts = request.maxRetries + 1;
        try {
          return useInteractionsApi
            ? await executeViaInteractionsApi(ai, request, started, attemptCount, maxAttempts)
            : await executeViaGenerateContentApi(ai, request, started, attemptCount, maxAttempts);
        } catch (error) {
          lastError = error;
          const classified = classifyGeminiTransportError(error);

          if (!classified.retryable || attempt >= request.maxRetries) {
            throw classified;
          }
        }
      }

      throw lastError instanceof ResearchError
        ? lastError
        : new ResearchError("Gemini request failed.", "unknown_provider_failure");
    },
  };
}
