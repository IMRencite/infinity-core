import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { analyzeFounderIdea } from "../analyze";
import { applyFounderDecision } from "../decide";
import { routeFounderBuild } from "../build-route";
import { ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";

describe("founder canonical venture identity handoff", () => {
  it("preserves candidate id, human-readable name, origin, and blueprint lineage", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, {
      organizationId: ORG_A,
      submittedByUserId: "user-a",
      title: "Simple SaaS that solves a clear business workflow.",
      description: "Simple SaaS that solves a clear business workflow.",
      idempotencyKey: "founder-identity-handoff",
    });
    analyzeFounderIdea(store, submission, { researchFixture: "saas_workflow" });
    applyFounderDecision(store, {
      submissionId: submission.id,
      action: "BUILD_THIS_BUSINESS",
      actorUserId: "user-a",
      actorOrganizationId: ORG_A,
    });
    const routed = routeFounderBuild(store, submission);
    expect(routed.canonicalVentureIdentity.opportunityCandidateId).toBe(submission.opportunityCandidateId);
    expect(routed.canonicalVentureIdentity.origin).toBe("FOUNDER_SUBMITTED");
    expect(routed.canonicalVentureIdentity.workingName.length).toBeGreaterThan(0);
    expect(routed.canonicalVentureIdentity.displayName).toBe(routed.canonicalVentureIdentity.workingName);
    expect(routed.canonicalVentureIdentity.blueprintId).toBe(routed.blueprintId);
    expect(routed.canonicalVentureIdentity.workingName).not.toMatch(/e2e|fixture|strong_in_policy/i);
  });
});
