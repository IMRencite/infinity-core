import { describe, it, expect } from "vitest";
import { executeOpenAiGovernedReasoning } from "@/lib/infinity/ai-providers/openai/execute-governed";
import { loadOpenAiReasoningConfig } from "@/lib/infinity/ai-providers/openai/config";

const enabled = process.env.RUN_LIVE_OPENAI_TESTS === "true" && Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!enabled)("OpenAI live smoke (gated)", () => {
  it("returns bounded structured output in shadow configuration", async () => {
    const config = loadOpenAiReasoningConfig();
    config.maxOutputTokens = 512;

    const result = await executeOpenAiGovernedReasoning({
      config,
      systemPrompt: "Return governed JSON only.",
      userPrompt: JSON.stringify({
        instruction: "Tiny smoke test.",
        context: { evidenceReferenceIds: [] },
      }),
    });

    expect(result.rawText).toContain("governed_reasoning_v1");
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });
});

describe("OpenAI live smoke gate", () => {
  it("skips safely when RUN_LIVE_OPENAI_TESTS is not enabled", () => {
    expect(process.env.RUN_LIVE_OPENAI_TESTS === "true").toBe(false);
  });
});
