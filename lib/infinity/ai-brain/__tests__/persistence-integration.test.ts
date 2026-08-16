import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAiBrainReasoning } from "@/lib/infinity/ai-brain/run";
import { randomUUID } from "node:crypto";

describe.runIf(Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))(
  "AI Brain persistence integration",
  () => {
    beforeEach(() => {
      vi.stubEnv("AI_PROVIDER", "mock");
      vi.stubEnv("AI_BRAIN_ENABLED", "true");
      vi.stubEnv("NODE_ENV", "test");
    });

    it("persists mock reasoning run and transforms mission proposal", async () => {
      const admin = createAdminClient();
      const orgId =
        process.env.AI_BRAIN_TEST_ORG_ID?.trim() ??
        "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

      const output = await runAiBrainReasoning(admin, {
        organizationId: orgId,
        objective:
          "Identify three plausible online business opportunities that a small autonomous software company could investigate with an initial operating budget below $500.",
        objectiveType: "opportunity_identification",
        providerId: "mock",
        idempotencyKey: `ai-brain-mock-integration:${randomUUID()}`,
      });

      expect(output.ok).toBe(true);
      if (!output.ok) return;

      expect(output.result.providerId).toBe("mock");
      expect(output.result.structuredOutput.candidateActions).toHaveLength(3);
      expect(output.result.canonicalMissionDraft.activate).toBe(false);
      expect(output.result.validationStatus).toBe("validated");

      const replay = await runAiBrainReasoning(admin, {
        organizationId: orgId,
        objective:
          "Identify three plausible online business opportunities that a small autonomous software company could investigate with an initial operating budget below $500.",
        objectiveType: "opportunity_identification",
        providerId: "mock",
        idempotencyKey: `ai-brain-mock-integration:${output.result.reasoningRunId}`,
      });

      expect(replay.ok).toBe(true);
    }, 30_000);
  },
);
