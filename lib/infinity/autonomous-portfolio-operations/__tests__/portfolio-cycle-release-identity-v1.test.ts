import { describe, expect, it } from "vitest";
import { vercelRuntimeIdentity } from "@/lib/infinity/production-outbound/obligation/release";

describe("portfolio cycle release identity", () => {
  it("reads deployment id and release sha from runtime env when present", () => {
    const prior = {
      VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID,
      COMMUNICATION_RELEASE_SHA: process.env.COMMUNICATION_RELEASE_SHA,
    };
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_test_cycle_identity";
    process.env.COMMUNICATION_RELEASE_SHA = "abc123def456";
    const identity = vercelRuntimeIdentity();
    expect(identity.deployment_id).toBe("dpl_test_cycle_identity");
    expect(identity.release_sha).toBe("abc123def456");
    process.env.VERCEL_DEPLOYMENT_ID = prior.VERCEL_DEPLOYMENT_ID;
    process.env.COMMUNICATION_RELEASE_SHA = prior.COMMUNICATION_RELEASE_SHA;
  });
});
