import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { AiBrainObjectiveType } from "./constants";
import { assertAiBrainProviderExecutable, isMockProvider, loadAiBrainConfig } from "./config";
import {
  assertPreCallCostPolicy,
  estimateInputTokens,
  isModelAllowed,
  loadAiBrainCostPolicy,
} from "./cost-governance";
import { AiBrainError, classifyProviderFailure } from "./failures";
import { transformMissionProposalToCanonicalDraft } from "./mission-proposal";
import {
  findAiBrainRunByIdempotencyKey,
  insertAiBrainReasoningRun,
  mapCompletedRunToResult,
  mapFailedRunToResult,
  updateAiBrainReasoningRun,
} from "./persistence";
import { buildAiBrainSystemInstructions, buildAiBrainUserPrompt } from "./prompts";
import { getStructuredReasoningProvider } from "./providers/registry";
import { assertNoSecretsInPayload, redactSecrets } from "./redaction";
import { aiBrainReasoningJsonSchema, hashReasoningInput, parseAiBrainStructuredJson } from "./schema";
import type { RunAiBrainReasoningInput, RunAiBrainReasoningOutput } from "./types";

async function persistFailure(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    runId: string;
    classification: import("./constants").AiBrainFailureClassification;
    message: string;
    tokenUsage?: import("./types").AiBrainTokenUsage | null;
    estimatedCostUsd?: number | null;
    latencyMs?: number | null;
    requestId?: string | null;
    retryCount?: number;
  },
): Promise<RunAiBrainReasoningOutput> {
  const failedAt = new Date().toISOString();
  const status =
    input.classification === "schema_validation_failure"
      ? "validation_failed"
      : input.classification === "budget_rejection"
        ? "policy_blocked"
        : "failed";

  await updateAiBrainReasoningRun(admin, input.organizationId, input.runId, {
    status,
    failure_classification: input.classification,
    error_message: redactSecrets(input.message),
    token_usage: (input.tokenUsage ?? {}) as never,
    estimated_cost: input.estimatedCostUsd ?? null,
    latency_ms: input.latencyMs ?? null,
    request_id: input.requestId ?? null,
    retry_count: input.retryCount ?? 0,
    failed_at: failedAt,
  });

  const { data: row } = await admin
    .from("ai_brain_reasoning_runs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.runId)
    .single();

  return {
    ok: false,
    failure: mapFailedRunToResult(
      row as never,
      input.classification,
      redactSecrets(input.message),
    ),
  };
}

export async function runAiBrainReasoning(
  admin: AdminSupabaseClient,
  input: RunAiBrainReasoningInput,
): Promise<RunAiBrainReasoningOutput> {
  const config = loadAiBrainConfig();
  const providerId = input.providerId ?? config.providerId;
  const modelId = input.modelId ?? config.modelId;
  const objectiveType: AiBrainObjectiveType = input.objectiveType ?? "opportunity_identification";

  const existing = await findAiBrainRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );

  if (existing?.status === "completed") {
    const structuredOutput = existing.structured_output as import("./types").AiBrainStructuredOutput;
    const canonicalMissionDraft =
      existing.canonical_mission_draft as import("./types").CanonicalMissionDraft;
    return {
      ok: true,
      result: mapCompletedRunToResult(existing, structuredOutput, canonicalMissionDraft),
    };
  }

  if (existing && ["failed", "policy_blocked", "validation_failed"].includes(existing.status)) {
    return {
      ok: false,
      failure: mapFailedRunToResult(
        existing,
        (existing.failure_classification as import("./constants").AiBrainFailureClassification) ??
          "provider_unavailable",
        existing.error_message ?? "Previous AI Brain run failed.",
      ),
    };
  }

  try {
    assertAiBrainProviderExecutable({ ...config, providerId, modelId });
  } catch (error) {
    throw classifyProviderFailure(error);
  }

  const systemInstructions = buildAiBrainSystemInstructions();
  const userPrompt = buildAiBrainUserPrompt({
    objective: input.objective,
    objectiveType,
  });

  const inputHash = hashReasoningInput({
    objective: input.objective,
    objectiveType,
    systemInstructions,
    providerId,
    modelId,
  });

  const costPolicy = loadAiBrainCostPolicy(config);
  const estimatedInputTokens = estimateInputTokens(`${systemInstructions}\n${userPrompt}`);

  try {
    assertPreCallCostPolicy({
      policy: costPolicy,
      estimatedInputTokens,
      configuredOutputTokens: config.maxOutputTokens,
      providerEnabled: config.enabled,
      modelAllowed: isModelAllowed(modelId),
    });
  } catch (error) {
    const classified = classifyProviderFailure(error);
    if (!existing) {
      const row = await insertAiBrainReasoningRun(admin, {
        organizationId: input.organizationId,
        missionId: input.missionId,
        provider: providerId,
        model: modelId,
        objective: input.objective,
        objectiveType,
        inputHash,
        idempotencyKey: input.idempotencyKey,
        correlationId: randomUUID(),
      });
      return persistFailure(admin, {
        organizationId: input.organizationId,
        runId: row.id,
        classification: classified.classification,
        message: classified.message,
      });
    }
    return persistFailure(admin, {
      organizationId: input.organizationId,
      runId: existing.id,
      classification: classified.classification,
      message: classified.message,
    });
  }

  const correlationId = randomUUID();
  const runRow =
    existing ??
    (await insertAiBrainReasoningRun(admin, {
      organizationId: input.organizationId,
      missionId: input.missionId,
      provider: providerId,
      model: modelId,
      objective: input.objective,
      objectiveType,
      inputHash,
      idempotencyKey: input.idempotencyKey,
      correlationId,
    }));

  const provider = getStructuredReasoningProvider(providerId);

  try {
    await updateAiBrainReasoningRun(admin, input.organizationId, runRow.id, {
      status: "provider_called",
    });

    const providerResult = await provider.executeStructuredReasoning({
      correlationId,
      systemInstructions,
      userInput: userPrompt,
      modelId,
      schemaName: "ai_brain_reasoning_v1",
      responseSchema: aiBrainReasoningJsonSchema(),
      maxOutputTokens: config.maxOutputTokens,
      timeoutMs: config.timeoutMs,
      maxRetries: costPolicy.maxRetries,
    });

    assertNoSecretsInPayload(providerResult);

    const structuredOutput = parseAiBrainStructuredJson(providerResult.rawText);
    structuredOutput.objective = input.objective;

    const canonicalMissionDraft = transformMissionProposalToCanonicalDraft({
      organizationId: input.organizationId,
      reasoningRunId: runRow.id,
      missionProposal: structuredOutput.missionProposal,
    });

    const completedAt = new Date().toISOString();
    await updateAiBrainReasoningRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      validation_status: "validated",
      structured_output: structuredOutput as never,
      canonical_mission_draft: canonicalMissionDraft as never,
      token_usage: providerResult.tokenUsage as never,
      estimated_cost: providerResult.estimatedCostUsd,
      latency_ms: providerResult.latencyMs,
      request_id: providerResult.requestId,
      retry_count: providerResult.retryMetadata.attemptCount - 1,
      completed_at: completedAt,
      failure_classification: null,
      error_message: null,
    });

    const { data: completedRow } = await admin
      .from("ai_brain_reasoning_runs")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("id", runRow.id)
      .single();

    const result = mapCompletedRunToResult(
      completedRow as never,
      structuredOutput,
      canonicalMissionDraft,
    );

    const serialized = JSON.stringify(result);
    if (redactSecrets(serialized) !== serialized) {
      throw new AiBrainError("Secret leak in reasoning result.", "configuration_error");
    }

    if (isMockProvider({ ...config, providerId }) && process.env.NODE_ENV === "production") {
      throw new AiBrainError("Mock provider used in production.", "configuration_error");
    }

    return { ok: true, result };
  } catch (error) {
    const classified = classifyProviderFailure(error);
    return persistFailure(admin, {
      organizationId: input.organizationId,
      runId: runRow.id,
      classification: classified.classification,
      message: classified.message,
    });
  }
}

export async function runFirstIntelligenceTest(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunAiBrainReasoningOutput> {
  const { FIRST_INTELLIGENCE_TEST_OBJECTIVE } = await import("./constants");
  const suffix = process.env.AI_BRAIN_TEST_IDEMPOTENCY_SUFFIX?.trim() || "v1";
  return runAiBrainReasoning(admin, {
    organizationId,
    objective: FIRST_INTELLIGENCE_TEST_OBJECTIVE,
    objectiveType: "opportunity_identification",
    idempotencyKey: `ai-brain-v1-first-intelligence-test:${organizationId}:${suffix}`,
  });
}
