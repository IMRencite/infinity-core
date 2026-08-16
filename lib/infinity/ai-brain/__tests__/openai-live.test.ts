/**
 * RUN_AI_BRAIN_LIVE_TEST=true node scripts/run-ai-brain-v1-intelligence-test.mjs
 */
import { describe, it, expect } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFirstIntelligenceTest } from "@/lib/infinity/ai-brain/run";
import { canonicalDraftToCreateMissionInput } from "@/lib/infinity/ai-brain/mission-proposal";

describe.runIf(process.env.RUN_AI_BRAIN_LIVE_TEST === "true")(
  "AI Brain v1 live OpenAI intelligence test",
  () => {
    it(
      "runs first real intelligence test and persists reasoning result",
      async () => {
        const admin = createAdminClient();
        const orgId = process.env.AI_BRAIN_TEST_ORG_ID?.trim();
        if (!orgId) {
          throw new Error("AI_BRAIN_TEST_ORG_ID is required for live test.");
        }

        const output = await runFirstIntelligenceTest(admin, orgId);
        console.log(JSON.stringify(output, null, 2));

        expect(output.ok).toBe(true);
        if (!output.ok) return;

        expect(output.result.structuredOutput.candidateActions.length).toBeGreaterThanOrEqual(3);
        expect(output.result.validationStatus).toBe("validated");
        expect(output.result.canonicalMissionDraft.activate).toBe(false);
        expect(output.result.canonicalMissionDraft.status).toBe("draft");

        const createInput = canonicalDraftToCreateMissionInput({
          organizationId: orgId,
          draft: output.result.canonicalMissionDraft,
        });
        expect(createInput.activate).toBe(false);

        expect(output.result.providerId).toBe("openai");
      },
      180_000,
    );
  },
);
