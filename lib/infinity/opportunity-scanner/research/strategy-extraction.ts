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

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const modelId = config.modelId;
  const systemInstructions = buildExtractionSystemInstructions();
  const userPrompt = buildExtractionPrompt({
    strategyId: input.strategyId,
    researchSummary: input.researchSummary,
    researchEvidence: input.researchEvidence,
    researchSources: input.researchSources,
  });

  if (shouldUseInteractionsApi(modelId)) {
    const interaction = await ai.interactions.create({
      model: modelId,
      system_instruction: systemInstructions,
      input: userPrompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: providerExtractionJsonSchema(),
      },
      generation_config: { max_output_tokens: config.maxOutputTokens },
    });

    const interactionRecord = interaction as unknown as Record<string, unknown>;
    const direct = interactionRecord.outputText ?? interactionRecord.output_text;
    const rawText = typeof direct === "string" ? direct : "";
    return parseProviderExtractionJson(rawText, input.strategyId);
  }

  const response = await ai.models.generateContent({
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
  });

  const rawText = response.text;
  if (!rawText) {
    throw new ResearchError("Gemini returned empty extraction output.", "malformed_response");
  }

  return parseProviderExtractionJson(rawText, input.strategyId);
}
