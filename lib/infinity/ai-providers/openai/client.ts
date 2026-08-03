import OpenAI from "openai";
import type { OpenAiReasoningConfig } from "./config";

export function createInternalOpenAiClient(config: OpenAiReasoningConfig): OpenAI {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  return new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
    maxRetries: 0,
  });
}

export type OpenAiUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function readUsage(response: OpenAI.Responses.Response): OpenAiUsage {
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

export function readOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    if (item.type === "message") {
      for (const content of item.content ?? []) {
        if (content.type === "output_text" && content.text) {
          return content.text;
        }
      }
    }
  }

  return "";
}
