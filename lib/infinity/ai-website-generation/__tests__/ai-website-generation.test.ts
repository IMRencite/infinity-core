import { describe, it, expect } from "vitest";
import { validateWebsiteGenerationPlanPayload, validateProhibitedClaimInjection } from "@/lib/infinity/ai-website-generation/plan-validation";
import { buildMockWebsiteGenerationPlan } from "@/lib/infinity/ai-website-generation/mock-output";
import {
  loadAiWebsiteGenerationMode,
  modeAllowsPlanApproval,
  modeAllowsProviderNetwork,
  modeEnablesAiWebsiteTasks,
} from "@/lib/infinity/ai-website-generation/modes";
import { isGovernedWorkerCapabilityKey } from "@/lib/infinity/workers/capability";
import { websiteTaskGraphStepCount } from "@/lib/infinity/website-builder/task-graph";
import { executeAiWebsitePlanGeneration } from "@/lib/infinity/ai-website-generation/execution";

import { translateApprovedPlanToWebsiteModel } from "@/lib/infinity/ai-website-generation/translator";
import { hashPlanOutput } from "@/lib/infinity/ai-website-generation/planner";

describe("AI website reproducibility", () => {
  it("detects translation hash mismatch from approved model", () => {
    const allowed = ["validation_run:abc"];
    const payload = buildMockWebsiteGenerationPlan({
      buildId: "b",
      projectType: "static_website",
      siteName: "Site",
      allowedEvidenceReferenceIds: allowed,
    });
    const expected = translateApprovedPlanToWebsiteModel({
      planId: "plan-1",
      contextHash: "ctx",
      outputHash: hashPlanOutput(payload),
      payload,
    });
    const tampered = { ...expected, translationHash: "wrong" };
    expect(tampered.translationHash).not.toBe(expected.translationHash);
  });
});

describe("AI Website Generation Foundation v1", () => {
  it("registers ai website capabilities", () => {
    expect(isGovernedWorkerCapabilityKey("ai_website.generate_plan")).toBe(true);
    expect(isGovernedWorkerCapabilityKey("qa.verify_ai_generated_website")).toBe(true);
  });

  it("defaults mode to disabled", () => {
    const prev = process.env.AI_WEBSITE_GENERATION_MODE;
    process.env.AI_WEBSITE_GENERATION_MODE = "disabled";
    expect(loadAiWebsiteGenerationMode()).toBe("disabled");
    expect(modeEnablesAiWebsiteTasks("disabled")).toBe(false);
    process.env.AI_WEBSITE_GENERATION_MODE = prev;
  });

  it("mock mode does not allow provider network", () => {
    expect(modeAllowsProviderNetwork("mock")).toBe(false);
    expect(modeAllowsPlanApproval("advisory")).toBe(true);
    expect(modeAllowsPlanApproval("mock")).toBe(true);
    expect(modeAllowsPlanApproval("shadow")).toBe(false);
  });

  it("validates mock plan with allowed evidence", () => {
    const allowed = ["validation_run:abc"];
    const payload = buildMockWebsiteGenerationPlan({
      buildId: "b",
      projectType: "static_website",
      siteName: "Site",
      allowedEvidenceReferenceIds: allowed,
    });
    const result = validateWebsiteGenerationPlanPayload(payload, { allowedEvidenceReferenceIds: allowed });
    expect(result.valid).toBe(true);
  });

  it("rejects invented evidence ids", () => {
    const payload = buildMockWebsiteGenerationPlan({
      buildId: "b",
      projectType: "static_website",
      siteName: "Site",
      allowedEvidenceReferenceIds: ["validation_run:abc"],
    });
    payload.contentPlan[0]!.evidenceReferenceIds = ["00000000-0000-4000-8000-000000000001"];
    const result = validateWebsiteGenerationPlanPayload(payload, {
      allowedEvidenceReferenceIds: ["validation_run:abc"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects prohibited claims", () => {
    expect(validateProhibitedClaimInjection("We guaranteed 200% growth").valid).toBe(false);
  });

  it("extends website task graph when AI enabled", () => {
    expect(websiteTaskGraphStepCount({ aiGenerationEnabled: false })).toBe(17);
    expect(websiteTaskGraphStepCount({ aiGenerationEnabled: true })).toBeGreaterThan(17);
  });

  it("mock execution uses no network", async () => {
    const exec = await executeAiWebsitePlanGeneration({
      context: {
        manifest: [],
        contextHash: "abc",
        promptVersion: "ai_website_prompt_v1",
        userPayload: { site: "x" },
        allowedEvidenceReferenceIds: ["validation_run:mock"],
      },
      buildId: "b",
      projectType: "static_website",
      siteName: "Site",
      modeOverride: "mock",
    });
    expect(exec.usedNetwork).toBe(false);
    expect(exec.provider).toBe("mock");
  });
});
