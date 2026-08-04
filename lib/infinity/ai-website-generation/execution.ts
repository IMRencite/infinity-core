import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { createInternalOpenAiClient, readOutputText, readUsage } from "@/lib/infinity/ai-providers/openai/client";
import { classifyOpenAiError } from "@/lib/infinity/ai-providers/openai/errors";
import type { AiWebsiteContextBundle } from "./context";
import { AI_WEBSITE_COST_LIMITS } from "./constants";
import { buildMockWebsiteGenerationPlan } from "./mock-output";
import {
  loadAiWebsiteGenerationMode,
  modeAllowsProviderNetwork,
  modeUsesMockProvider,
} from "./modes";
import { buildAiWebsiteSystemPrompt, buildAiWebsiteUserPrompt } from "./prompts";
import { validateWebsiteGenerationPlanPayload } from "./plan-validation";
import type { WebsiteGenerationPlanPayload } from "./types";
import { AI_WEBSITE_GENERATION_SCHEMA_VERSION } from "./constants";

export type ExecuteAiWebsitePlanResult = {
  payload: WebsiteGenerationPlanPayload;
  provider: string;
  model: string;
  latencyMs: number;
  usage: Record<string, unknown>;
  estimatedCost: number;
  usedNetwork: boolean;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function evaluateAiWebsiteBudget(context: AiWebsiteContextBundle): {
  allowed: boolean;
  reason?: string;
} {
  if (context.manifest.length > AI_WEBSITE_COST_LIMITS.maxContextRecords) {
    return { allowed: false, reason: "Too many context records" };
  }
  const bytes = JSON.stringify(context.userPayload).length;
  if (bytes > AI_WEBSITE_COST_LIMITS.maxContextBytes) {
    return { allowed: false, reason: "Context bytes exceed policy" };
  }
  const system = buildAiWebsiteSystemPrompt();
  const user = buildAiWebsiteUserPrompt(context.userPayload);
  const tokens = estimateTokens(`${system}\n${user}`);
  if (tokens > AI_WEBSITE_COST_LIMITS.maxEstimatedInputTokens) {
    return { allowed: false, reason: "Estimated input tokens exceed policy" };
  }
  return { allowed: true };
}

export async function executeAiWebsitePlanGeneration(input: {
  context: AiWebsiteContextBundle;
  buildId: string;
  projectType: string;
  siteName: string;
  modeOverride?: ReturnType<typeof loadAiWebsiteGenerationMode>;
}): Promise<ExecuteAiWebsitePlanResult> {
  const mode = input.modeOverride ?? loadAiWebsiteGenerationMode();
  if (mode === "disabled") {
    throw new Error("AI website generation is disabled");
  }

  const budget = evaluateAiWebsiteBudget(input.context);
  if (!budget.allowed) {
    throw new Error(budget.reason ?? "Policy blocked");
  }

  if (modeUsesMockProvider(mode) || !modeAllowsProviderNetwork(mode)) {
    const started = Date.now();
    const payload = buildMockWebsiteGenerationPlan({
      buildId: input.buildId,
      projectType: input.projectType,
      siteName: input.siteName,
      allowedEvidenceReferenceIds: input.context.allowedEvidenceReferenceIds,
    });
    const validation = validateWebsiteGenerationPlanPayload(payload, {
      allowedEvidenceReferenceIds: input.context.allowedEvidenceReferenceIds,
    });
    if (!validation.valid) {
      throw new Error(`Mock plan validation failed: ${validation.issues.join("; ")}`);
    }
    return {
      payload,
      provider: "mock",
      model: "mock-website-plan-v1",
      latencyMs: Date.now() - started,
      usage: { input_tokens: 0, output_tokens: 0 },
      estimatedCost: 0,
      usedNetwork: false,
    };
  }

  const openAiConfig = loadOpenAiReasoningConfig();
  if (!openAiConfig.apiKey) {
    throw new Error("Real provider requires OPENAI_API_KEY");
  }

  const started = Date.now();
  const systemPrompt = buildAiWebsiteSystemPrompt();
  const userPrompt = buildAiWebsiteUserPrompt(input.context.userPayload);

  try {
    const client = createInternalOpenAiClient(openAiConfig);
    const response = await client.responses.create({
      model: openAiConfig.model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: Math.min(openAiConfig.maxOutputTokens, AI_WEBSITE_COST_LIMITS.maxOutputTokens),
      text: { format: { type: "json_object" } },
    });
    const rawText = readOutputText(response);
    if (!rawText) {
      throw new Error("Empty provider output");
    }
    const parsed = JSON.parse(rawText) as WebsiteGenerationPlanPayload;
    if (parsed.schemaVersion !== AI_WEBSITE_GENERATION_SCHEMA_VERSION) {
      parsed.schemaVersion = AI_WEBSITE_GENERATION_SCHEMA_VERSION;
    }
    const validation = validateWebsiteGenerationPlanPayload(parsed, {
      allowedEvidenceReferenceIds: input.context.allowedEvidenceReferenceIds,
    });
    if (!validation.valid) {
      throw new Error(`Provider plan rejected: ${validation.issues.join("; ")}`);
    }
    const usage = readUsage(response);
    return {
      payload: parsed,
      provider: "openai",
      model: openAiConfig.model,
      latencyMs: Date.now() - started,
      usage: usage as unknown as Record<string, unknown>,
      estimatedCost: 0,
      usedNetwork: true,
    };
  } catch (error) {
    throw classifyOpenAiError(error);
  }
}

export async function assertBuildEligibleForAiWebsite(
  admin: AdminSupabaseClient,
  organizationId: string,
  buildId: string,
): Promise<void> {
  const { data: build } = await admin
    .from("builds")
    .select("id, status, venture_blueprint_id, specification_hash")
    .eq("organization_id", organizationId)
    .eq("id", buildId)
    .maybeSingle();
  if (!build) {
    throw new Error("Build not found");
  }
}
