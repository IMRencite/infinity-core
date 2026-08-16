import { createInternalOpenAiClient, readOutputText, readUsage } from "@/lib/infinity/ai-providers/openai/client";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { ADVERSARIAL_REVIEW_SCHEMA_VERSION } from "../constants";
import type { AdversarialReviewResult, LoadedCandidateBundle } from "../types";

function adversarialReviewSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "summary", "findings", "riskInputs", "confidence"],
    properties: {
      schemaVersion: { type: "string", enum: [ADVERSARIAL_REVIEW_SCHEMA_VERSION] },
      summary: { type: "string" },
      confidence: { type: "number" },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["question", "finding", "severity", "category"],
          properties: {
            question: { type: "string" },
            finding: { type: "string" },
            severity: { type: "number" },
            category: { type: "string" },
          },
        },
      },
      riskInputs: {
        type: "object",
        additionalProperties: false,
        required: [
          "acquisition_risk",
          "competition_risk",
          "execution_risk",
          "platform_risk",
          "regulatory_risk",
          "pricing_risk",
          "demand_risk",
        ],
        properties: {
          acquisition_risk: { type: "number" },
          competition_risk: { type: "number" },
          execution_risk: { type: "number" },
          platform_risk: { type: "number" },
          regulatory_risk: { type: "number" },
          pricing_risk: { type: "number" },
          demand_risk: { type: "number" },
        },
      },
    },
  };
}

function clamp01(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

export function parseAdversarialReviewJson(rawText: string): Omit<
  AdversarialReviewResult,
  "provider" | "model" | "tokenUsage" | "estimatedCostUsd"
> {
  const parsed = JSON.parse(rawText) as Record<string, unknown>;
  if (parsed.schemaVersion !== ADVERSARIAL_REVIEW_SCHEMA_VERSION) {
    throw new Error("Unsupported adversarial review schema version.");
  }

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map((entry) => {
        const record = entry as Record<string, unknown>;
        return {
          question: String(record.question ?? ""),
          finding: String(record.finding ?? ""),
          severity: clamp01(record.severity),
          category: String(record.category ?? "general"),
        };
      })
    : [];

  const riskRecord =
    typeof parsed.riskInputs === "object" && parsed.riskInputs !== null
      ? (parsed.riskInputs as Record<string, unknown>)
      : {};

  return {
    summary: String(parsed.summary ?? ""),
    findings,
    riskInputs: {
      acquisition_risk: clamp01(riskRecord.acquisition_risk),
      competition_risk: clamp01(riskRecord.competition_risk),
      execution_risk: clamp01(riskRecord.execution_risk),
      platform_risk: clamp01(riskRecord.platform_risk),
      regulatory_risk: clamp01(riskRecord.regulatory_risk),
      pricing_risk: clamp01(riskRecord.pricing_risk),
      demand_risk: clamp01(riskRecord.demand_risk),
    },
    confidence: clamp01(parsed.confidence),
  };
}

export async function runAdversarialReview(
  candidate: LoadedCandidateBundle,
): Promise<AdversarialReviewResult> {
  const config = loadOpenAiReasoningConfig();
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for adversarial review.");
  }

  const client = createInternalOpenAiClient(config);
  const systemInstructions = [
    "You are Infinity's adversarial venture reviewer.",
    "Attempt to invalidate the opportunity using skeptical reasoning.",
    "Do NOT approve or reject the venture — only provide structured risk findings.",
    "Severity and riskInputs must be between 0 and 1.",
    "Do not fabricate sources.",
  ].join(" ");

  const userPrompt = [
    `Candidate: ${candidate.title}`,
    `Summary: ${candidate.summary}`,
    candidate.problem ? `Problem: ${candidate.problem}` : null,
    candidate.monetization
      ? `Monetization model: ${candidate.monetization.recommendation.recommendedPrimaryModel}`
      : null,
    candidate.monetization?.recommendation.largestEconomicRisks
      ? `Known risks: ${candidate.monetization.recommendation.largestEconomicRisks.join("; ")}`
      : null,
    "Answer the adversarial questions and populate riskInputs.",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.responses.create({
    model: config.model,
    input: [
      { role: "system", content: systemInstructions },
      { role: "user", content: userPrompt },
    ],
    max_output_tokens: config.maxOutputTokens,
    reasoning: { effort: config.reasoningEffort },
    text: {
      format: {
        type: "json_schema",
        name: "venture_selection_adversarial_review",
        schema: adversarialReviewSchema(),
        strict: true,
      },
    },
  });

  const rawText = readOutputText(response);
  if (!rawText) {
    throw new Error("OpenAI returned empty adversarial review output.");
  }

  const parsed = parseAdversarialReviewJson(rawText);
  const usage = readUsage(response);
  const tokenUsage = {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
  };

  return {
    provider: "openai",
    model: config.model,
    ...parsed,
    tokenUsage,
    estimatedCostUsd: null,
  };
}
