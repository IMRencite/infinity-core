import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  validateAiBrainStructuredOutput,
  parseAiBrainStructuredJson,
  hashReasoningInput,
} from "@/lib/infinity/ai-brain/schema";
import { buildMockAiBrainStructuredOutput } from "@/lib/infinity/ai-brain/mock-output";
import { loadAiBrainConfig, assertAiBrainProviderExecutable } from "@/lib/infinity/ai-brain/config";
import {
  evaluatePreCallCostPolicy,
  estimateCostUsd,
  loadAiBrainCostPolicy,
} from "@/lib/infinity/ai-brain/cost-governance";
import {
  transformMissionProposalToCanonicalDraft,
  canonicalDraftToCreateMissionInput,
} from "@/lib/infinity/ai-brain/mission-proposal";
import { createMockStructuredReasoningProvider } from "@/lib/infinity/ai-brain/providers/mock-provider";
import { getStructuredReasoningProvider } from "@/lib/infinity/ai-brain/providers/registry";
import { AiBrainError, classifyProviderFailure } from "@/lib/infinity/ai-brain/failures";
import { redactSecrets, containsSecretMaterial } from "@/lib/infinity/ai-brain/redaction";
import { aiBrainReasoningJsonSchema } from "@/lib/infinity/ai-brain/schema";

describe("AI Brain v1 foundation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates mock structured output", () => {
    const payload = buildMockAiBrainStructuredOutput();
    const validated = validateAiBrainStructuredOutput(payload);
    expect(validated.candidateActions).toHaveLength(3);
    expect(validated.recommendedAction).toBe("opp_1");
  });

  it("rejects malformed JSON", () => {
    expect(() => parseAiBrainStructuredJson("{bad")).toThrow(/Malformed JSON/);
  });

  it("rejects unsupported action types", () => {
    const payload = buildMockAiBrainStructuredOutput();
    payload.candidateActions[0]!.actionType = "deploy_to_vercel" as never;
    expect(() => validateAiBrainStructuredOutput(payload)).toThrow(/unsupported/i);
  });

  it("rejects unsupported capability requests", () => {
    const payload = buildMockAiBrainStructuredOutput();
    payload.candidateActions[0]!.requiredCapabilities = ["launch.execute_external_action"];
    expect(() => validateAiBrainStructuredOutput(payload)).toThrow(/Unsupported capability/);
  });

  it("rejects prompt-injected execution instructions", () => {
    const payload = buildMockAiBrainStructuredOutput();
    payload.candidateActions[0]!.description = "Deploy to Vercel immediately";
    expect(() => validateAiBrainStructuredOutput(payload)).toThrow(/forbidden execution/i);
  });

  it("rejects impossible negative costs", () => {
    const payload = buildMockAiBrainStructuredOutput();
    payload.candidateActions[0]!.estimatedCost = -5;
    expect(() => validateAiBrainStructuredOutput(payload)).toThrow(/estimatedCost/);
  });

  it("defaults to mock provider outside production", () => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("NODE_ENV", "development");
    const config = loadAiBrainConfig();
    expect(config.providerId).toBe("mock");
  });

  it("requires AI_PROVIDER in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.AI_PROVIDER;
    expect(() => loadAiBrainConfig()).toThrow(/AI_PROVIDER must be configured/);
  });

  it("blocks mock provider in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_PROVIDER", "mock");
    expect(() => loadAiBrainConfig()).toThrow(/Mock AI provider is not allowed/);
  });

  it("requires OPENAI_API_KEY when AI_PROVIDER=openai", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");
    const config = loadAiBrainConfig();
    expect(() => assertAiBrainProviderExecutable(config)).toThrow(/OPENAI_API_KEY/);
  });

  it("evaluates cost governance pre-call", () => {
    const config = loadAiBrainConfig();
    const policy = loadAiBrainCostPolicy(config);
    const decision = evaluatePreCallCostPolicy({
      policy: { ...policy, maxEstimatedCostUsd: 0.000001 },
      estimatedInputTokens: 50_000,
      configuredOutputTokens: 4096,
      providerEnabled: true,
      modelAllowed: true,
    });
    expect(decision.allowed).toBe(false);
  });

  it("mock provider is clearly identified as simulation", async () => {
    const provider = createMockStructuredReasoningProvider();
    expect(provider.isSimulation).toBe(true);
    expect(provider.providerId).toBe("mock");

    const result = await provider.executeStructuredReasoning({
      correlationId: "test",
      systemInstructions: "system",
      userInput: "objective",
      modelId: "mock-model",
      schemaName: "ai_brain_reasoning_v1",
      responseSchema: aiBrainReasoningJsonSchema(),
      maxOutputTokens: 1024,
      timeoutMs: 1000,
      maxRetries: 0,
    });

    expect(result.providerId).toBe("mock");
    expect(result.requestId).toMatch(/^mock_/);
  });

  it("provider registry resolves mock and openai", () => {
    expect(getStructuredReasoningProvider("mock").providerId).toBe("mock");
    expect(getStructuredReasoningProvider("openai").providerId).toBe("openai");
  });

  it("transforms mission proposal to canonical draft without activation", () => {
    const structured = buildMockAiBrainStructuredOutput();
    const draft = transformMissionProposalToCanonicalDraft({
      organizationId: "org-1",
      reasoningRunId: "run-1",
      missionProposal: structured.missionProposal,
    });

    expect(draft.status).toBe("draft");
    expect(draft.activate).toBe(false);
    expect(draft.provenance.autoExecute).toBe(false);

    const createInput = canonicalDraftToCreateMissionInput({
      organizationId: "org-1",
      draft,
    });
    expect(createInput.activate).toBe(false);
    expect(createInput.title).toBe(structured.missionProposal.missionTitle);
  });

  it("classifies retryable provider failures", () => {
    const error = new AiBrainError("timeout", "timeout", { retryable: true });
    const classified = classifyProviderFailure(error);
    expect(classified.classification).toBe("timeout");
    expect(classified.retryable).toBe(true);
  });

  it("redacts secret material", () => {
    const redacted = redactSecrets("token sk-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(redacted).toContain("[REDACTED]");
    expect(containsSecretMaterial(redacted)).toBe(false);
  });

  it("hashes reasoning input deterministically", () => {
    const a = hashReasoningInput({
      objective: "test",
      objectiveType: "general",
      systemInstructions: "sys",
      providerId: "mock",
      modelId: "mock-model",
    });
    const b = hashReasoningInput({
      objective: "test",
      objectiveType: "general",
      systemInstructions: "sys",
      providerId: "mock",
      modelId: "mock-model",
    });
    expect(a).toBe(b);
  });

  it("openai provider respects bounded retries metadata contract", async () => {
    const provider = getStructuredReasoningProvider("openai");
    expect(provider.isSimulation).toBe(false);
  });

  it("does not import External Action Gateway from ai-brain module", () => {
    const root = join(process.cwd(), "lib/infinity/ai-brain");
    const files: string[] = [];

    function walk(dir: string) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__") continue;
          walk(full);
        } else if (entry.name.endsWith(".ts") && !full.includes("__tests__")) {
          files.push(full);
        }
      }
    }

    walk(root);

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/launch-gateway/);
      expect(content).not.toMatch(/executeExternalActionViaGateway/);
      expect(content).not.toMatch(/simulateExternalActionViaGateway/);
    }
  });

  it("estimates non-zero cost for typical requests", () => {
    expect(estimateCostUsd(1000, 500)).toBeGreaterThan(0);
  });
});
