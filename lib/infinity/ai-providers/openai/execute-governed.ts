import { governedReasoningJsonSchema } from "@/lib/infinity/governed-reasoning/schema";
import { GOVERNED_REASONING_SCHEMA_VERSION } from "@/lib/infinity/governed-reasoning/constants";
import {
  createInternalOpenAiClient,
  readOutputText,
  readUsage,
  type OpenAiUsage,
} from "./client";
import type { OpenAiReasoningConfig } from "./config";
import { classifyOpenAiError } from "./errors";

export type OpenAiGovernedExecuteInput = {
  config: OpenAiReasoningConfig;
  systemPrompt: string;
  userPrompt: string;
};

export type OpenAiGovernedExecuteResult = {
  rawText: string;
  usage: OpenAiUsage;
  latencyMs: number;
  model: string;
};

export async function executeOpenAiGovernedReasoning(
  input: OpenAiGovernedExecuteInput,
): Promise<OpenAiGovernedExecuteResult> {
  const started = Date.now();
  const client = createInternalOpenAiClient(input.config);

  try {
    const response = await client.responses.create({
      model: input.config.model,
      input: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
      max_output_tokens: input.config.maxOutputTokens,
      reasoning: { effort: input.config.reasoningEffort },
      text: {
        format: {
          type: "json_schema",
          name: "governed_reasoning_v1",
          schema: governedReasoningJsonSchema(),
          strict: true,
        },
      },
    });

    const rawText = readOutputText(response);

    if (!rawText) {
      throw new Error("OpenAI returned empty structured output.");
    }

    if (!rawText.includes(GOVERNED_REASONING_SCHEMA_VERSION)) {
      throw new Error("OpenAI structured output missing schemaVersion.");
    }

    return {
      rawText,
      usage: readUsage(response),
      latencyMs: Date.now() - started,
      model: input.config.model,
    };
  } catch (error) {
    throw classifyOpenAiError(error);
  }
}

export async function checkOpenAiHealth(config: OpenAiReasoningConfig): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!config.apiKey) {
    return { ok: false, message: "OPENAI_API_KEY not configured." };
  }

  return { ok: true, message: `OpenAI configured for model ${config.model}.` };
}
