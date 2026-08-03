import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateGovernedReasoningOutput,
  parseGovernedReasoningJson,
  GOVERNED_REASONING_SCHEMA_VERSION,
} from "@/lib/infinity/governed-reasoning/schema";
import { buildMockGovernedReasoningOutput } from "@/lib/infinity/governed-reasoning/mock-output";
import {
  loadGovernedReasoningMode,
  modeAffectsMissionDecisions,
  modeAllowsProviderNetwork,
} from "@/lib/infinity/governed-reasoning/modes";
import { evaluateCostPolicy, loadReasoningCostPolicy } from "@/lib/infinity/governed-reasoning/cost-policy";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";
import { hashContextManifest } from "@/lib/infinity/governed-reasoning/context";

describe("Governed Reasoning Cycle v1", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when OPENAI_API_KEY is absent for live config", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const config = loadOpenAiReasoningConfig();
    expect(config.apiKey).toBeNull();
  });

  it("defaults AI_REASONING_MODE to disabled", () => {
    delete process.env.AI_REASONING_MODE;
    expect(loadGovernedReasoningMode()).toBe("disabled");
  });

  it("accepts valid structured output", () => {
    const allowed = new Set(["validation_run:1"]);
    const payload = buildMockGovernedReasoningOutput({ evidenceReferenceIds: ["validation_run:1"] });
    const validated = validateGovernedReasoningOutput(payload, allowed);
    expect(validated.recommendation).toBe("proceed_to_executive_review");
  });

  it("rejects malformed JSON", () => {
    expect(() => parseGovernedReasoningJson("{bad", new Set())).toThrow(/Malformed JSON/);
  });

  it("rejects unsupported evidence IDs", () => {
    const payload = buildMockGovernedReasoningOutput({ evidenceReferenceIds: ["validation_run:1"] });
    payload.findings[0]!.evidenceReferenceIds = ["invented:99"];
    expect(() => validateGovernedReasoningOutput(payload, new Set(["validation_run:1"]))).toThrow(
      /Unsupported evidence reference/,
    );
  });

  it("shadow mode does not affect mission decisions", () => {
    expect(modeAffectsMissionDecisions("shadow")).toBe(false);
    expect(modeAffectsMissionDecisions("advisory")).toBe(true);
  });

  it("mock/disabled modes produce no provider network allowance", () => {
    expect(modeAllowsProviderNetwork("mock")).toBe(false);
    expect(modeAllowsProviderNetwork("disabled")).toBe(false);
  });

  it("policy blocks over-budget requests", () => {
    const decision = evaluateCostPolicy({
      policy: { ...loadReasoningCostPolicy(), maxEstimatedCostUsd: 0.000001 },
      estimatedInputTokens: 50_000,
      configuredOutputTokens: 4096,
      mode: "advisory",
    });
    expect(decision.allowed).toBe(false);
  });

  it("does not embed secrets in context hash material", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-secret");
    const hash = hashContextManifest({
      organizationId: "org",
      missionId: "m",
      opportunityId: "o",
      validationRunId: null,
      executiveDecisionId: null,
      includedRecordIds: ["mission:m"],
      evidenceReferenceIds: [],
      prohibitedActions: [],
      unknowns: [],
    });
    expect(hash).not.toContain("sk-secret");
  });

  it("schema version is stable", () => {
    expect(GOVERNED_REASONING_SCHEMA_VERSION).toBe("governed_reasoning_v1");
  });
});
