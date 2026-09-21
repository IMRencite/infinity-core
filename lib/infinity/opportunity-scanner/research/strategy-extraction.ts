import { GoogleGenAI } from "@google/genai";
import { loadResearchConfig } from "@/lib/infinity/research/config";
import { ResearchError } from "@/lib/infinity/research/failures";
import type { ResearchResult } from "@/lib/infinity/research/types";
import type { DiscoveryStrategyId } from "../constants";
import {
  parseProviderExtractionJson,
  providerExtractionJsonSchema,
} from "../schema";
import type { ProviderExtractionOutput } from "../types";
import { buildExtractionPrompt, buildExtractionSystemInstructions } from "../prompts";

function shouldUseInteractionsApi(modelId: string): boolean {
  return /^gemini-3/i.test(modelId);
}

function withExtractionTimeout<T>(promise: Promise<T>, timeoutMs: number, strategyId: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ResearchError(`Strategy extraction timed out after ${timeoutMs}ms`, "timeout"));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function runStrategyExtractionResearch(input: {
  strategyId: DiscoveryStrategyId;
  researchSummary: string;
  researchEvidence: ResearchResult["evidence"];
  researchSources: ResearchResult["sources"];
  parentResearchGrounded: boolean;
}): Promise<ProviderExtractionOutput> {
  if (!input.parentResearchGrounded) {
    throw new ResearchError(
      "Cannot extract candidates from ungrounded research.",
      "grounding_unavailable",
    );
  }

  const config = loadResearchConfig();
  if (!config.geminiApiKey) {
    throw new ResearchError("GEMINI_API_KEY is not configured.", "authentication_failure");
  }

  const timeoutMs = Number(process.env.OPPORTUNITY_SCANNER_EXTRACTION_TIMEOUT_MS ?? 120_000);
  const startedAt = Date.now();
  console.info("[FAVC1] strategy extraction start", {
    strategyId: input.strategyId,
    timeoutMs,
  });

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const modelId = config.modelId;
  const systemInstructions = buildExtractionSystemInstructions();
  const userPrompt = buildExtractionPrompt({
    strategyId: input.strategyId,
    researchSummary: input.researchSummary,
    researchEvidence: input.researchEvidence,
    researchSources: input.researchSources,
  });

  let output: ProviderExtractionOutput;
  if (shouldUseInteractionsApi(modelId)) {
    const interaction = await withExtractionTimeout(
      ai.interactions.create({
        model: modelId,
        system_instruction: systemInstructions,
        input: userPrompt,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: providerExtractionJsonSchema(),
        },
        generation_config: { max_output_tokens: config.maxOutputTokens },
      }),
      timeoutMs,
      input.strategyId,
    );

    const interactionRecord = interaction as unknown as Record<string, unknown>;
    const direct = interactionRecord.outputText ?? interactionRecord.output_text;
    const rawText = typeof direct === "string" ? direct : "";
    output = parseProviderExtractionJson(rawText, input.strategyId);
  } else {
    const response = await withExtractionTimeout(
      ai.models.generateContent({
        model: modelId,
        contents: [
          { role: "user", parts: [{ text: systemInstructions }] },
          { role: "user", parts: [{ text: userPrompt }] },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: providerExtractionJsonSchema(),
          maxOutputTokens: config.maxOutputTokens,
        },
      }),
      timeoutMs,
      input.strategyId,
    );

    const rawText = response.text;
    if (!rawText) {
      throw new ResearchError("Gemini returned empty extraction output.", "malformed_response");
    }

    output = parseProviderExtractionJson(rawText, input.strategyId);
  }

  console.info("[FAVC1] strategy extraction complete", {
    strategyId: input.strategyId,
    candidateCount: output.candidates.length,
    durationMs: Date.now() - startedAt,
  });

  return output;
}
