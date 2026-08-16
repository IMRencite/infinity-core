import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { loadAiProviderEnvConfig, mayExecuteProvider } from "@/lib/infinity/ai-providers/config";
import type { BrainRole } from "../constants";
import {
  CODING_OUTPUT_SCHEMA,
  REVIEW_OUTPUT_SCHEMA,
  parseCodingOutput,
  parseReviewOutput,
  redactSecrets,
  type CodingTaskOutput,
  type ReviewOutput,
} from "./schema";

export type LiveCodingRequest = {
  provider: string;
  modelId: string;
  role: BrainRole;
  taskType: string;
  systemPrompt: string;
  userPrompt: string;
  outputMode: "coding" | "review" | "text";
  timeoutMs?: number;
};

export type LiveCodingResult = {
  provider: string;
  modelId: string;
  rawText: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  usageSource: "provider" | "estimated";
  success: boolean;
  error?: string;
  coding?: CodingTaskOutput;
  review?: ReviewOutput;
};

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function finalizeUsage(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  estimatedCostUsd: number,
  systemPrompt: string,
  userPrompt: string,
  rawText: string,
  success: boolean,
): Pick<LiveCodingResult, "inputTokens" | "outputTokens" | "cachedTokens" | "reasoningTokens" | "totalTokens" | "estimatedCostUsd" | "usageSource"> {
  let inTok = inputTokens;
  let outTok = outputTokens;
  let usageSource: "provider" | "estimated" = "provider";
  if (success && inTok === 0 && outTok === 0) {
    inTok = estimateTokensFromText(`${systemPrompt}\n${userPrompt}`);
    outTok = estimateTokensFromText(rawText);
    usageSource = "estimated";
  }
  const totalTokens = inTok + outTok;
  const cost =
    estimatedCostUsd > 0
      ? estimatedCostUsd
      : estimateCost(provider, inTok, outTok);
  return {
    inputTokens: inTok,
    outputTokens: outTok,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens,
    estimatedCostUsd: cost,
    usageSource,
  };
}

function estimateCost(provider: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, { in: number; out: number }> = {
    openai: { in: 0.002, out: 0.008 },
    anthropic: { in: 0.003, out: 0.015 },
    gemini: { in: 0.001, out: 0.004 },
    xai: { in: 0.002, out: 0.006 },
  };
  const rate = rates[provider] ?? { in: 0.002, out: 0.008 };
  return (inputTokens / 1000) * rate.in + (outputTokens / 1000) * rate.out;
}

function attachStructuredOutput(result: LiveCodingResult, rawText: string, outputMode: LiveCodingRequest["outputMode"]): void {
  if (outputMode === "coding") {
    try {
      result.coding = parseCodingOutput(rawText);
    } catch {
      /* retain rawText for fallback parsing */
    }
  }
  if (outputMode === "review") {
    try {
      result.review = parseReviewOutput(rawText);
    } catch {
      /* retain rawText for fallback parsing */
    }
  }
}

async function callOpenAi(req: LiveCodingRequest, apiKey: string): Promise<LiveCodingResult> {
  const started = Date.now();
  const client = new OpenAI({ apiKey, timeout: req.timeoutMs ?? 90_000 });
  const schema = req.outputMode === "review" ? REVIEW_OUTPUT_SCHEMA : CODING_OUTPUT_SCHEMA;
  const response = await client.chat.completions.create({
    model: req.modelId,
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user", content: req.userPrompt },
    ],
    response_format:
      req.outputMode === "text"
        ? undefined
        : {
            type: "json_schema",
            json_schema: {
              name: req.outputMode === "review" ? "review_output" : "coding_output",
              schema: schema as Record<string, unknown>,
              strict: true,
            },
          },
  });
  const rawText = redactSecrets(response.choices[0]?.message?.content ?? "");
  const success = Boolean(rawText);
  const usage = finalizeUsage(
    "openai",
    response.usage?.prompt_tokens ?? 0,
    response.usage?.completion_tokens ?? 0,
    estimateCost("openai", response.usage?.prompt_tokens ?? 0, response.usage?.completion_tokens ?? 0),
    req.systemPrompt,
    req.userPrompt,
    rawText,
    success,
  );
  const result: LiveCodingResult = {
    provider: "openai",
    modelId: req.modelId,
    rawText,
    ...usage,
    latencyMs: Date.now() - started,
    success,
  };
  attachStructuredOutput(result, rawText, req.outputMode);
  return result;
}

async function callAnthropic(req: LiveCodingRequest, apiKey: string): Promise<LiveCodingResult> {
  const started = Date.now();
  const schema = req.outputMode === "review" ? REVIEW_OUTPUT_SCHEMA : CODING_OUTPUT_SCHEMA;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.modelId,
      max_tokens: 8192,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
      ...(req.outputMode !== "text"
        ? {
            tools: [{ name: "structured_output", description: "JSON", input_schema: schema }],
            tool_choice: { type: "tool", name: "structured_output" },
          }
        : {}),
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 90_000),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${redactSecrets((await response.text()).slice(0, 300))}`);
  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  let rawText = "";
  for (const block of data.content ?? []) {
    if (block.type === "tool_use" && block.input) rawText = JSON.stringify(block.input);
    else if (block.type === "text" && block.text) rawText = block.text;
  }
  rawText = redactSecrets(rawText);
  const success = Boolean(rawText);
  const usage = finalizeUsage(
    "anthropic",
    data.usage?.input_tokens ?? 0,
    data.usage?.output_tokens ?? 0,
    estimateCost("anthropic", data.usage?.input_tokens ?? 0, data.usage?.output_tokens ?? 0),
    req.systemPrompt,
    req.userPrompt,
    rawText,
    success,
  );
  const result: LiveCodingResult = {
    provider: "anthropic",
    modelId: req.modelId,
    rawText,
    ...usage,
    latencyMs: Date.now() - started,
    success,
  };
  attachStructuredOutput(result, rawText, req.outputMode);
  return result;
}

async function callGemini(req: LiveCodingRequest, apiKey: string): Promise<LiveCodingResult> {
  const started = Date.now();
  const client = new GoogleGenAI({ apiKey });
  const schema = req.outputMode === "review" ? REVIEW_OUTPUT_SCHEMA : CODING_OUTPUT_SCHEMA;
  const response = await client.models.generateContent({
    model: req.modelId,
    contents: [{ role: "user", parts: [{ text: `${req.systemPrompt}\n\n${req.userPrompt}` }] }],
    config: req.outputMode === "text" ? undefined : { responseMimeType: "application/json", responseSchema: schema },
  });
  const rawText = redactSecrets(response.text ?? "");
  const success = Boolean(rawText);
  const usageMeta = response.usageMetadata;
  const usage = finalizeUsage(
    "gemini",
    Number(usageMeta?.promptTokenCount ?? 0),
    Number(usageMeta?.candidatesTokenCount ?? 0),
    estimateCost("gemini", Number(usageMeta?.promptTokenCount ?? 0), Number(usageMeta?.candidatesTokenCount ?? 0)),
    req.systemPrompt,
    req.userPrompt,
    rawText,
    success,
  );
  const result: LiveCodingResult = {
    provider: "gemini",
    modelId: req.modelId,
    rawText,
    ...usage,
    latencyMs: Date.now() - started,
    success,
  };
  attachStructuredOutput(result, rawText, req.outputMode);
  return result;
}

async function callXai(req: LiveCodingRequest, apiKey: string): Promise<LiveCodingResult> {
  const started = Date.now();
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: req.modelId,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userPrompt },
      ],
      response_format: req.outputMode === "text" ? undefined : { type: "json_object" },
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 90_000),
  });
  if (!response.ok) throw new Error(`xAI ${response.status}: ${redactSecrets((await response.text()).slice(0, 300))}`);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const rawText = redactSecrets(data.choices?.[0]?.message?.content ?? "");
  const success = Boolean(rawText);
  const usage = finalizeUsage(
    "xai",
    data.usage?.prompt_tokens ?? 0,
    data.usage?.completion_tokens ?? 0,
    estimateCost("xai", data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0),
    req.systemPrompt,
    req.userPrompt,
    rawText,
    success,
  );
  const result: LiveCodingResult = {
    provider: "xai",
    modelId: req.modelId,
    rawText,
    ...usage,
    latencyMs: Date.now() - started,
    success,
  };
  attachStructuredOutput(result, rawText, req.outputMode);
  return result;
}

function emptyResult(req: LiveCodingRequest, error: string, latencyMs = 0): LiveCodingResult {
  return {
    provider: req.provider,
    modelId: req.modelId,
    rawText: "",
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    latencyMs,
    usageSource: "provider",
    success: false,
    error,
  };
}

export async function executeLiveCodingRequest(req: LiveCodingRequest): Promise<LiveCodingResult> {
  const config = loadAiProviderEnvConfig();
  if (!config.allowLiveProviderExecution) {
    return emptyResult(req, "Live execution disabled");
  }
  try {
    if (req.provider === "openai" && config.openaiApiKey) return await callOpenAi(req, config.openaiApiKey);
    if (req.provider === "anthropic" && config.anthropicApiKey && config.anthropicEnabled) return await callAnthropic(req, config.anthropicApiKey);
    if (req.provider === "gemini" && (config.geminiApiKey || config.googleApiKey)) return await callGemini(req, (config.geminiApiKey ?? config.googleApiKey)!);
    if (req.provider === "xai" && config.xaiApiKey && config.xaiEnabled) return await callXai(req, config.xaiApiKey);
    return emptyResult(req, `Provider ${req.provider} unavailable`);
  } catch (err) {
    return emptyResult(req, redactSecrets(err instanceof Error ? err.message : String(err)));
  }
}

export function isLiveProviderAvailable(provider: string): boolean {
  const config = loadAiProviderEnvConfig();
  const map: Record<string, boolean> = {
    openai: mayExecuteProvider("openai", config),
    anthropic: mayExecuteProvider("anthropic", config),
    gemini: mayExecuteProvider("google_gemini", config),
    xai: mayExecuteProvider("xai", config),
  };
  return map[provider] ?? false;
}
