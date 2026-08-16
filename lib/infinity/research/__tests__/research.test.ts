import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  validateProviderResearchStructuredOutput,
  parseProviderResearchJson,
  hashResearchInput,
  providerResearchJsonSchema,
} from "@/lib/infinity/research/schema";
import {
  buildMockGroundingMetadata,
  buildMockProviderResearchOutput,
} from "@/lib/infinity/research/mock-output";
import { loadResearchConfig, assertResearchProviderExecutable } from "@/lib/infinity/research/config";
import {
  evaluatePreCallResearchPolicy,
  loadResearchCostPolicy,
} from "@/lib/infinity/research/cost-governance";
import { estimateResearchCostUsd } from "@/lib/infinity/research/cost-pricing";
import {
  canonicalizeSourceUrl,
  dedupeSources,
  sourceDedupeKey,
} from "@/lib/infinity/research/normalization/dedupe";
import { normalizeGroundedResearch } from "@/lib/infinity/research/normalization/evidence";
import { createMockGroundedResearchProvider } from "@/lib/infinity/research/providers/mock-provider";
import { getGroundedResearchProvider } from "@/lib/infinity/research/providers/registry";
import { ResearchError, classifyResearchFailure } from "@/lib/infinity/research/failures";
import { redactSecrets, containsSecretMaterial } from "@/lib/infinity/research/redaction";

describe("Gemini Grounded Research Provider v1 foundation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("validates mock structured research output", () => {
    const payload = buildMockProviderResearchOutput();
    const validated = validateProviderResearchStructuredOutput(payload);
    expect(validated.findings).toHaveLength(3);
  });

  it("allows grounded findings with empty sourceUrls for server-side grounding attachment", () => {
    const payload = buildMockProviderResearchOutput();
    payload.findings[0]!.grounded = true;
    payload.findings[0]!.inference = false;
    payload.findings[0]!.sourceUrls = [];
    const validated = validateProviderResearchStructuredOutput(payload);
    expect(validated.findings[0]!.sourceUrls).toEqual([]);
  });

  it("normalization fails grounded findings when grounding metadata has no attachable sources", () => {
    const structured = buildMockProviderResearchOutput();
    structured.findings[0]!.grounded = true;
    structured.findings[0]!.inference = false;
    structured.findings[0]!.sourceUrls = [];

    expect(() =>
      normalizeGroundedResearch({
        researchRunId: "run-1",
        organizationId: "org-1",
        missionId: null,
        providerId: "mock",
        modelId: "mock-model",
        researchObjective: "test",
        inputHash: "hash",
        structured,
        groundingMetadata: { groundingChunks: [], webSearchQueries: ["mock query"] },
        tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        groundingUsage: {
          webSearchQueries: ["mock query"],
          searchQueryCount: 1,
          groundingChunkCount: 0,
          groundingSupportCount: 0,
          groundingInvoked: true,
          searchCostKnown: false,
        },
        estimatedCostUsd: 0.01,
        costUncertainty: "mock",
        latencyMs: 10,
        requestId: "mock_req",
        retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
        rawProviderResponseStored: true,
      }),
    ).toThrow(/validated source URLs/);
  });

  it("rejects invented invalid URLs", () => {
    const payload = buildMockProviderResearchOutput();
    payload.findings[0]!.sourceUrls = ["not-a-url"];
    expect(() => validateProviderResearchStructuredOutput(payload)).toThrow(/invalid source URL/);
  });

  it("dedupes tracking-parameter URLs conservatively", () => {
    const a = "https://example.com/path?utm_source=x&id=1";
    const b = "https://example.com/path?id=1&utm_medium=y";
    expect(sourceDedupeKey(a)).toBe(sourceDedupeKey(b));
    expect(canonicalizeSourceUrl(a)).toBe("https://example.com/path?id=1");
  });

  it("does not merge different paths", () => {
    const a = "https://example.com/a";
    const b = "https://example.com/b";
    expect(sourceDedupeKey(a)).not.toBe(sourceDedupeKey(b));
  });

  it("normalizes grounded evidence and rejects ungrounded URLs", () => {
    const structured = buildMockProviderResearchOutput();
    const grounding = buildMockGroundingMetadata();
    const result = normalizeGroundedResearch({
      researchRunId: "run-1",
      organizationId: "org-1",
      missionId: null,
      providerId: "mock",
      modelId: "mock-model",
      researchObjective: "test",
      inputHash: "hash",
      structured,
      groundingMetadata: grounding,
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      groundingUsage: {
        webSearchQueries: ["mock query"],
        searchQueryCount: 1,
        groundingChunkCount: 3,
        groundingSupportCount: 1,
        groundingInvoked: true,
        searchCostKnown: false,
      },
      estimatedCostUsd: 0.01,
      costUncertainty: "mock",
      latencyMs: 10,
      requestId: "mock_req",
      retryMetadata: { attemptCount: 1, maxAttempts: 1, retried: false },
      rawProviderResponseStored: true,
    });

    expect(result.groundedStatus).toBe(true);
    expect(result.evidence).toHaveLength(3);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.evidence[0]?.grounded).toBe(true);
  });

  it("requires GEMINI_API_KEY for gemini provider in production config", () => {
    vi.stubEnv("RESEARCH_PROVIDER", "gemini");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    const config = loadResearchConfig();
    expect(() => assertResearchProviderExecutable(config)).toThrow(/GEMINI_API_KEY/);
  });

  it("mock provider is clearly simulation", async () => {
    const provider = createMockGroundedResearchProvider();
    expect(provider.isSimulation).toBe(true);
    const result = await provider.executeGroundedResearch({
      correlationId: "c1",
      systemInstructions: "sys",
      researchObjective: "objective",
      modelId: "mock",
      responseSchema: providerResearchJsonSchema(),
      maxOutputTokens: 1024,
      timeoutMs: 1000,
      maxRetries: 0,
    });
    expect(result.requestId).toMatch(/^mock_/);
    expect(result.groundingUsage.groundingInvoked).toBe(true);
  });

  it("evaluates research budget policy", () => {
    const config = loadResearchConfig();
    const policy = loadResearchCostPolicy(config);
    const decision = evaluatePreCallResearchPolicy({
      policy: { ...policy, maxEstimatedCostUsd: 0.000001 },
      estimatedInputTokens: 50_000,
      configuredOutputTokens: 4096,
      providerEnabled: true,
      modelAllowed: true,
      estimatedCostUsd: 1,
    });
    expect(decision.allowed).toBe(false);
  });

  it("records cost uncertainty when search pricing unknown", () => {
    const estimate = estimateResearchCostUsd({
      modelId: "gemini-2.5-flash",
      inputTokens: 1000,
      outputTokens: 500,
      searchQueryCount: 2,
    });
    expect(estimate.costUncertainty).toBeTruthy();
  });

  it("classifies retryable failures", () => {
    const err = new ResearchError("timeout", "timeout", { retryable: true });
    expect(classifyResearchFailure(err).retryable).toBe(true);
  });

  it("redacts gemini api key patterns", () => {
    const redacted = redactSecrets("key AIzaSyDUMMYKEY123456789012345678901234");
    expect(redacted).toContain("[REDACTED]");
    expect(containsSecretMaterial(redacted)).toBe(false);
  });

  it("hashes research input deterministically", () => {
    const a = hashResearchInput({
      researchObjective: "obj",
      systemInstructions: "sys",
      providerId: "gemini",
      modelId: "gemini-2.5-flash",
    });
    const b = hashResearchInput({
      researchObjective: "obj",
      systemInstructions: "sys",
      providerId: "gemini",
      modelId: "gemini-2.5-flash",
    });
    expect(a).toBe(b);
  });

  it("does not import launch gateway from research module", () => {
    const root = join(process.cwd(), "lib/infinity/research");
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
    }
  });

  it("registry resolves mock and gemini providers", () => {
    const config = loadResearchConfig();
    expect(getGroundedResearchProvider("mock", config).providerId).toBe("mock");
    expect(getGroundedResearchProvider("gemini", config).providerId).toBe("gemini");
  });

  it("provider JSON schema avoids Gemini-incompatible const and union types", () => {
    const schema = JSON.stringify(providerResearchJsonSchema());
    expect(schema).not.toContain('"const"');
    expect(schema).not.toMatch(/"type":\s*\[/);
  });
});
