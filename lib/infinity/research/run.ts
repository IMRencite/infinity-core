import { randomUUID } from "node:crypto";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { assertResearchProviderExecutable, isMockResearchProvider, loadResearchConfig } from "./config";
import {
  assertPreCallResearchPolicy,
  estimateInputTokens,
  isResearchModelAllowed,
  loadResearchCostPolicy,
} from "./cost-governance";
import { estimateResearchCostUsd } from "./cost-pricing";
import { classifyResearchFailure, ResearchError } from "./failures";
import { normalizeGroundedResearch } from "./normalization/evidence";
import {
  findResearchRunByIdempotencyKey,
  insertResearchRun,
  mapCompletedResearchRunToResult,
  mapFailedResearchRunToResult,
  updateResearchRun,
} from "./persistence";
import { buildResearchSystemInstructions, buildResearchUserPrompt } from "./prompts";
import { getGroundedResearchProvider } from "./providers/registry";
import { assertNoSecretsInPayload, redactSecrets } from "./redaction";
import {
  hashResearchInput,
  parseProviderResearchJson,
  providerResearchJsonSchema,
} from "./schema";
import type {
  ResearchProviderCallResult,
  RunGroundedResearchInput,
  RunGroundedResearchOutput,
} from "./types";
import { canonicalizeResearchCandidateId } from "./candidate-lineage";
import {
  buildResearchCoveragePlan,
  loadResearchCoveragePolicy,
  runCoverageDirectedPhases,
} from "./coverage";

async function persistResearchFailure(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    runId: string;
    classification: import("./constants").ResearchFailureClassification;
    message: string;
    tokenUsage?: import("./types").ResearchTokenUsage | null;
    estimatedCostUsd?: number | null;
    costUncertainty?: string | null;
    latencyMs?: number | null;
    requestId?: string | null;
    retryCount?: number;
    groundingMetadata?: Record<string, unknown> | null;
    groundingUsage?: import("./types").GroundingUsage | null;
    rawProviderResponse?: Record<string, unknown> | null;
    structuredResult?: Record<string, unknown> | null;
    candidateId?: string | null;
  },
): Promise<RunGroundedResearchOutput> {
  const failedAt = new Date().toISOString();
  const status =
    input.classification === "schema_validation_failure" ||
    input.classification === "evidence_validation_failure"
      ? "validation_failed"
      : input.classification === "budget_exceeded"
        ? "policy_blocked"
        : "failed";

  await updateResearchRun(admin, input.organizationId, input.runId, {
    status,
    failure_classification: input.classification,
    error_message: redactSecrets(input.message),
    token_usage: (input.tokenUsage ?? {}) as never,
    estimated_cost: input.estimatedCostUsd ?? null,
    cost_uncertainty: input.costUncertainty ?? null,
    latency_ms: input.latencyMs ?? null,
    request_id: input.requestId ?? null,
    retry_count: input.retryCount ?? 0,
    failed_at: failedAt,
    grounding_metadata: (input.groundingMetadata ?? {}) as never,
    grounding_usage: (input.groundingUsage ?? {}) as never,
    raw_provider_response: (input.rawProviderResponse ?? {}) as never,
    structured_result: {
      ...(input.structuredResult ?? {}),
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
    } as never,
  });

  const { data: row } = await admin
    .from("research_runs")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.runId)
    .single();

  return {
    ok: false,
    failure: mapFailedResearchRunToResult(
      row as never,
      input.classification,
      redactSecrets(input.message),
    ),
  };
}

export async function runGroundedResearch(
  admin: AdminSupabaseClient,
  input: RunGroundedResearchInput,
): Promise<RunGroundedResearchOutput> {
  const config = loadResearchConfig();
  const providerId = input.providerId ?? config.providerId;
  const modelId = input.modelId ?? config.modelId;
  const candidateId = canonicalizeResearchCandidateId(input.candidateId);

  const existing = await findResearchRunByIdempotencyKey(
    admin,
    input.organizationId,
    input.idempotencyKey,
  );

  if (existing?.status === "completed") {
    return {
      ok: true,
      result: mapCompletedResearchRunToResult(existing),
    };
  }

  if (existing && ["failed", "policy_blocked", "validation_failed"].includes(existing.status)) {
    return {
      ok: false,
      failure: mapFailedResearchRunToResult(
        existing,
        (existing.failure_classification as import("./constants").ResearchFailureClassification) ??
          "unknown_provider_failure",
        existing.error_message ?? "Previous research run failed.",
      ),
    };
  }

  try {
    assertResearchProviderExecutable({ ...config, providerId, modelId });
  } catch (error) {
    throw classifyResearchFailure(error);
  }

  const modelProvidedSources = /^gemini-3/i.test(modelId);
  const requireSourceUrls = Boolean(input.requireSourceBackedFindings) || modelProvidedSources;
  const costPolicy = loadResearchCostPolicy(config);
  const coveragePolicy = loadResearchCoveragePolicy(process.env, costPolicy);
  const coveragePlan = buildResearchCoveragePlan({
    seed: input.coverageSeed,
    objective: input.researchObjective,
    policy: coveragePolicy,
    requireSourceBackedFindings: requireSourceUrls,
  });
  const systemInstructions = buildResearchSystemInstructions({
    modelProvidedSources,
    requireSourceUrls,
  });
  const initialPrompt = buildResearchUserPrompt(input.researchObjective, {
    requireSourceUrls,
    modelProvidedSources,
    plannedQueries: coveragePlan.steps[0]?.queries.map((query) => query.query) ?? [],
    targetDimensions: coveragePlan.steps[0]?.targetDimensions,
    maxFindings: coveragePolicy.maxFindings,
    phase: "initial",
  });
  const inputHash = hashResearchInput({
    researchObjective: `${input.researchObjective}\n${initialPrompt}`,
    systemInstructions,
    providerId,
    modelId,
  });
  const estimatedInputTokens = estimateInputTokens(`${systemInstructions}\n${initialPrompt}`);
  const preCost = estimateResearchCostUsd({
    modelId,
    inputTokens: estimatedInputTokens,
    outputTokens: config.maxOutputTokens,
    searchQueryCount: Math.max(1, coveragePlan.steps[0]?.queries.length ?? 1),
  });

  try {
    assertPreCallResearchPolicy({
      policy: costPolicy,
      estimatedInputTokens,
      configuredOutputTokens: config.maxOutputTokens,
      providerEnabled: config.enabled,
      modelAllowed: isResearchModelAllowed(modelId),
      estimatedCostUsd: preCost.estimatedCostUsd,
    });
  } catch (error) {
    const classified = classifyResearchFailure(error);
    if (!existing) {
      const row = await insertResearchRun(admin, {
        organizationId: input.organizationId,
        candidateId,
        missionId: input.missionId,
        provider: providerId,
        model: modelId,
        researchObjective: input.researchObjective,
        inputHash,
        idempotencyKey: input.idempotencyKey,
        correlationId: randomUUID(),
      });
      return persistResearchFailure(admin, {
        organizationId: input.organizationId,
        runId: row.id,
        classification: classified.classification,
        message: classified.message,
        candidateId,
      });
    }
    return persistResearchFailure(admin, {
      organizationId: input.organizationId,
      runId: existing.id,
      classification: classified.classification,
      message: classified.message,
      candidateId,
    });
  }

  const correlationId = randomUUID();
  const runRow =
    existing ??
    (await insertResearchRun(admin, {
      organizationId: input.organizationId,
      candidateId,
      missionId: input.missionId,
      provider: providerId,
      model: modelId,
      researchObjective: input.researchObjective,
      inputHash,
      idempotencyKey: input.idempotencyKey,
      correlationId,
    }));

  const provider = getGroundedResearchProvider(providerId, config);
  const lastProviderCall: { value: ResearchProviderCallResult | null } = { value: null };
  const lastStructured: { value: ReturnType<typeof parseProviderResearchJson> | null } = { value: null };

  try {
    await updateResearchRun(admin, input.organizationId, runRow.id, {
      status: "provider_called",
    });

    const directed = await runCoverageDirectedPhases({
      plan: coveragePlan,
      policy: coveragePolicy,
      seed: input.coverageSeed,
      objective: input.researchObjective,
      modelId,
      executePhase: async ({ phase, queries }) => {
        const userPrompt = buildResearchUserPrompt(input.researchObjective, {
          requireSourceUrls,
          modelProvidedSources,
          plannedQueries: queries.map((query) => query.query),
          targetDimensions: [...new Set(queries.flatMap((query) => query.targetDimensions))],
          maxFindings: coveragePolicy.maxFindings,
          phase,
        });
        const providerResult = await provider.executeGroundedResearch({
          correlationId,
          systemInstructions,
          researchObjective: userPrompt,
          modelId,
          responseSchema: providerResearchJsonSchema(),
          maxOutputTokens: config.maxOutputTokens,
          timeoutMs: costPolicy.timeoutMs,
          maxRetries: coveragePolicy.maxRetries,
        });
        lastProviderCall.value = providerResult;
        assertNoSecretsInPayload(providerResult);
        const parsedStructured = parseProviderResearchJson(providerResult.rawText);
        lastStructured.value = parsedStructured;
        const phaseResult = normalizeGroundedResearch({
          researchRunId: runRow.id,
          organizationId: input.organizationId,
          missionId: input.missionId ?? null,
          providerId,
          modelId,
          researchObjective: input.researchObjective,
          inputHash,
          structured: parsedStructured,
          groundingMetadata: providerResult.groundingMetadata as never,
          tokenUsage: providerResult.tokenUsage,
          groundingUsage: providerResult.groundingUsage,
          estimatedCostUsd: providerResult.estimatedCostUsd,
          costUncertainty: providerResult.costUncertainty,
          latencyMs: providerResult.latencyMs,
          requestId: providerResult.requestId,
          retryMetadata: providerResult.retryMetadata,
          rawProviderResponseStored: true,
          runPurpose: input.runPurpose,
          candidateId,
        });
        return { result: phaseResult, attemptCount: providerResult.retryMetadata.attemptCount };
      },
    });

    const result = {
      ...directed.result,
      coverage: directed.coverage,
      callTelemetry: directed.telemetry,
      stopReason: directed.stopReason,
      issuedQueries: directed.issuedQueries.map((query) => query.query),
    };

    const completedAt = new Date().toISOString();
    await updateResearchRun(admin, input.organizationId, runRow.id, {
      status: "completed",
      validation_status: "validated",
      structured_result: result as never,
      raw_provider_response: (lastProviderCall.value?.rawProviderResponse ?? {}) as never,
      grounding_metadata: (lastProviderCall.value?.groundingMetadata ?? {}) as never,
      normalized_evidence: result.evidence as never,
      normalized_sources: result.sources as never,
      token_usage: result.tokenUsage as never,
      grounding_usage: result.groundingUsage as never,
      estimated_cost: result.estimatedCostUsd,
      cost_uncertainty: result.costUncertainty,
      latency_ms: result.latencyMs,
      request_id: result.requestId,
      retry_count: directed.telemetry.transportRetryCount,
      completed_at: completedAt,
      failure_classification: null,
      error_message: null,
    });

    const serialized = JSON.stringify(result);
    if (redactSecrets(serialized) !== serialized) {
      throw new ResearchError("Secret leak in research result.", "configuration_error");
    }

    if (isMockResearchProvider({ ...config, providerId }) && config.isProduction) {
      throw new ResearchError("Mock research provider used in production.", "configuration_error");
    }

    return { ok: true, result };
  } catch (error) {
    const classified = classifyResearchFailure(error);
    return persistResearchFailure(admin, {
      organizationId: input.organizationId,
      runId: runRow.id,
      classification: classified.classification,
      message: classified.message,
      tokenUsage: lastProviderCall.value?.tokenUsage ?? null,
      estimatedCostUsd: lastProviderCall.value?.estimatedCostUsd ?? null,
      costUncertainty: lastProviderCall.value?.costUncertainty ?? null,
      latencyMs: lastProviderCall.value?.latencyMs ?? null,
      requestId: lastProviderCall.value?.requestId ?? null,
      retryCount: lastProviderCall.value ? lastProviderCall.value.retryMetadata.attemptCount - 1 : 0,
      groundingMetadata: (lastProviderCall.value?.groundingMetadata as Record<string, unknown> | null) ?? null,
      groundingUsage: lastProviderCall.value?.groundingUsage ?? null,
      rawProviderResponse: (lastProviderCall.value?.rawProviderResponse as Record<string, unknown> | null) ?? null,
      structuredResult: lastStructured.value as Record<string, unknown> | null,
      candidateId,
    });
  }
}

export async function runGeminiGroundedResearchV1Test(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<RunGroundedResearchOutput> {
  const { GEMINI_GROUNDED_RESEARCH_TEST_OBJECTIVE } = await import("./constants");
  const researchObjective =
    process.env.RESEARCH_LIVE_TEST_OBJECTIVE?.trim() ||
    GEMINI_GROUNDED_RESEARCH_TEST_OBJECTIVE;
  const suffix = process.env.RESEARCH_TEST_IDEMPOTENCY_SUFFIX?.trim() || "v1";
  return runGroundedResearch(admin, {
    organizationId,
    researchObjective,
    providerId: "gemini",
    idempotencyKey: `gemini-grounded-research-v1-test:${organizationId}:${suffix}`,
    runPurpose: "provider_verification",
  });
}
