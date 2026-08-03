import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootstrapAiProviders } from "../bootstrap";
import {
  clearAiProviderRegistry,
  getAiProvider,
  listAiProviders,
  registerAiProvider,
  selectAiProvider,
} from "../registry";
import {
  clearAiModelRegistry,
  listRegisteredAiModels,
  registerAiModel,
  seedExampleModelCatalog,
} from "../model-registry";
import { executeProviderRuntime, executeProviderRuntimeSync } from "../runtime";
import { createReasoningSession } from "@/lib/infinity/reasoning/sessions";
import { composePrompts, getPromptTemplate } from "@/lib/infinity/reasoning/prompts";
import {
  parseStructuredAdvisoryJson,
  validateStructuredAdvisoryPayload,
} from "../structured-output";
import { AiProviderError } from "../errors";
import { mockProviderAdapter } from "../adapters/mock-adapter";
import {
  clearProviderTelemetry,
  listProviderTelemetry,
} from "../observability";
import { withProviderRetry, defaultRetryPolicy } from "../retry";

function sessionWithPrompt() {
  const session = createReasoningSession({
    organizationId: "org-1",
    missionId: "m-1",
    opportunityId: "opp-1",
    validationRunId: "vr-1",
    executiveDecisionId: "ed-1",
    plannerPlanId: null,
    correlationId: "corr-provider-test",
  });

  const template = getPromptTemplate("advisory_boundary");
  if (!template) {
    throw new Error("Expected advisory_boundary prompt template.");
  }
  const composed = composePrompts([{ template, variables: { organization_id: "org-1" } }]);

  return {
    ...session,
    composedPrompts: composed,
    selectedProviderId: "mock",
    selectedModel: { providerId: "mock", modelId: "mock-advisory-v1" },
  };
}

describe("AI Provider Integration Foundation v1", () => {
  beforeEach(() => {
    clearProviderTelemetry();
    bootstrapAiProviders({ registerReasoning: false });
  });

  it("registers mock and vendor adapters without requiring API keys", () => {
    const ids = listAiProviders().map((p) => p.id);
    expect(ids).toContain("mock");
    expect(ids).toContain("openai");
    expect(ids).toContain("anthropic");
    expect(ids).toContain("google_gemini");
    expect(ids).toContain("openrouter");
    expect(ids).toContain("ollama");
  });

  it("supports dynamic model registration", () => {
    clearAiModelRegistry();
    registerAiModel({
      id: "custom-model",
      providerId: "mock",
      displayName: "Custom",
      version: "0.0.1",
      contextWindowTokens: 4096,
      maxOutputTokens: 1024,
      supportsTools: false,
      supportsVision: false,
      supportsJson: true,
      supportsReasoning: false,
      inputCostPer1kTokens: null,
      outputCostPer1kTokens: null,
    });

    expect(listRegisteredAiModels({ providerId: "mock" }).some((m) => m.id === "custom-model")).toBe(
      true,
    );
  });

  it("seeds example models without hardcoding vendors in adapters", () => {
    seedExampleModelCatalog();
    const names = listRegisteredAiModels().map((m) => m.id);
    expect(names).toEqual(
      expect.arrayContaining(["gpt-5", "claude", "gemini", "llama", "qwen", "deepseek"]),
    );
  });

  it("executes mock provider synchronously through runtime pipeline", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = executeProviderRuntimeSync({
      session: sessionWithPrompt(),
      preferredProviderId: "mock",
    });

    expect(result.status).toBe("completed");
    expect(result.providerId).toBe("mock");
    expect(result.execution?.structured.advisoryOnly).toBe(true);
    expect(result.executiveReview?.reviewRequired).toBe(true);
    expect(result.executiveReview?.executiveAuthoritative).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("records observability for successful mock execution", () => {
    const session = sessionWithPrompt();
    executeProviderRuntimeSync({ session, preferredProviderId: "mock" });

    const entries = listProviderTelemetry({ correlationId: session.refs.correlationId });
    expect(entries.length).toBe(1);
    expect(entries[0]?.providerId).toBe("mock");
    expect(entries[0]?.latencyMs).toBeGreaterThanOrEqual(0);
    expect(entries[0]?.tokenEstimate.totalTokens).toBeGreaterThan(0);
  });

  it("falls back to mock when live provider is disabled", async () => {
    const result = await executeProviderRuntime({
      session: { ...sessionWithPrompt(), selectedProviderId: "openai" },
      preferredProviderId: "openai",
      env: {
        OPENAI_API_KEY: "test-key",
        AI_PROVIDER_ALLOW_LIVE_EXECUTION: "false",
      },
    });

    expect(result.status).toBe("completed");
    expect(result.providerId).toBe("mock");
  });

  it("rejects malformed structured JSON", () => {
    expect(() => parseStructuredAdvisoryJson("{not-json")).toThrow(/Malformed JSON/);
    expect(() =>
      validateStructuredAdvisoryPayload({ schemaVersion: "wrong", summary: "x" }),
    ).toThrow(/schemaVersion/);
  });

  it("reports disabled live provider execution without network", async () => {
    const openai = getAiProvider("openai");
    expect(openai).toBeTruthy();

    await expect(
      openai!.execute({
        correlationId: "c1",
        modelId: "gpt-5",
        prompt: "hello",
        timeoutMs: 1000,
        requireJson: true,
      }),
    ).rejects.toMatchObject({ code: "not_configured" });

    bootstrapAiProviders({
      registerReasoning: false,
      env: {
        OPENAI_API_KEY: "test-key",
        AI_PROVIDER_ALLOW_LIVE_EXECUTION: "false",
      },
    });

    const configuredOpenAi = getAiProvider("openai");
    await expect(
      configuredOpenAi!.execute({
        correlationId: "c1",
        modelId: "gpt-5",
        prompt: "hello",
        timeoutMs: 1000,
        requireJson: true,
      }),
    ).rejects.toMatchObject({ code: "provider_disabled" });
  });

  it("selects fallback provider when preferred is missing", () => {
    clearAiProviderRegistry();
    registerAiProvider(mockProviderAdapter);

    const selected = selectAiProvider({
      preferredProviderId: "openai",
      fallbackProviderIds: ["mock"],
    });

    expect(selected?.id).toBe("mock");
  });

  it("retries retryable provider errors", async () => {
    let attempts = 0;
    const policy = defaultRetryPolicy(2);

    const result = await withProviderRetry(policy, async () => {
      attempts += 1;
      if (attempts < 2) {
        throw new AiProviderError("rate limited", "rate_limit", { retryable: true });
      }
      return "ok";
    });

    expect(result.result).toBe("ok");
    expect(result.retries).toBe(1);
    expect(attempts).toBe(2);
  });

  it("implements full provider interface on mock adapter", async () => {
    await mockProviderAdapter.initialize();
    const health = await mockProviderAdapter.health();
    expect(health.executable).toBe(true);

    const models = await mockProviderAdapter.listModels();
    expect(models.length).toBeGreaterThan(0);

    expect(mockProviderAdapter.supportsTools()).toBe(true);
    expect(mockProviderAdapter.supportsJSON()).toBe(true);
    expect(mockProviderAdapter.supportsReasoning()).toBe(true);

    const tokens = mockProviderAdapter.estimateTokens({ prompt: "test", systemPrompt: "sys" });
    expect(tokens.totalTokens).toBeGreaterThan(0);

    const cost = mockProviderAdapter.estimateCost({ modelId: "mock-advisory-v1", tokenEstimate: tokens });
    expect(cost.totalCost).toBe(0);
  });

  it("falls back to mock after live provider failure when enabled", async () => {
    const result = await executeProviderRuntime({
      session: sessionWithPrompt(),
      preferredProviderId: "openai",
      env: {
        OPENAI_API_KEY: "key",
        AI_PROVIDER_ALLOW_LIVE_EXECUTION: "true",
      },
    });

    expect(result.status).toBe("completed");
    expect(result.providerId).toBe("mock");
  });
});
