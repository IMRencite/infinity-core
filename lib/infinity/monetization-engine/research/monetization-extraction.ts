import { GoogleGenAI } from "@google/genai";
import { loadResearchConfig } from "@/lib/infinity/research/config";
import { ResearchError } from "@/lib/infinity/research/failures";
import {
  buildMonetizationExtractionPrompt,
  buildMonetizationExtractionSystemInstructions,
} from "../prompts";
import {
  parseProviderMonetizationExtractionJson,
  providerMonetizationExtractionJsonSchema,
} from "../schema";
import type { LoadedOpportunityCandidate, ProviderMonetizationExtractionOutput } from "../types";

function shouldUseInteractionsApi(modelId: string): boolean {
  return /^gemini-3/i.test(modelId);
}

export async function runMonetizationExtractionResearch(input: {
  candidate: LoadedOpportunityCandidate;
  researchSummary: string;
  researchEvidence: Array<{ claim: string; sourceUrls: string[]; grounded: boolean }>;
  researchSources: Array<{ url: string; title?: string }>;
  parentResearchGrounded: boolean;
}): Promise<ProviderMonetizationExtractionOutput> {
  if (!input.parentResearchGrounded) {
    throw new ResearchError(
      "Cannot extract monetization plans from ungrounded research.",
      "grounding_unavailable",
    );
  }

  const config = loadResearchConfig();
  if (!config.geminiApiKey) {
    throw new ResearchError("GEMINI_API_KEY is not configured.", "authentication_failure");
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  const modelId = config.modelId;
  const systemInstructions = buildMonetizationExtractionSystemInstructions();
  const userPrompt = buildMonetizationExtractionPrompt(input);

  if (shouldUseInteractionsApi(modelId)) {
    const interaction = await ai.interactions.create({
      model: modelId,
      system_instruction: systemInstructions,
      input: userPrompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: providerMonetizationExtractionJsonSchema(),
      },
      generation_config: { max_output_tokens: config.maxOutputTokens },
    });

    const interactionRecord = interaction as unknown as Record<string, unknown>;
    const direct = interactionRecord.outputText ?? interactionRecord.output_text;
    const rawText = typeof direct === "string" ? direct : "";
    return parseProviderMonetizationExtractionJson(rawText, input.candidate.id);
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      { role: "user", parts: [{ text: systemInstructions }] },
      { role: "user", parts: [{ text: userPrompt }] },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: providerMonetizationExtractionJsonSchema(),
      maxOutputTokens: config.maxOutputTokens,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new ResearchError("Gemini returned empty monetization extraction output.", "malformed_response");
  }

  return parseProviderMonetizationExtractionJson(rawText, input.candidate.id);
}
