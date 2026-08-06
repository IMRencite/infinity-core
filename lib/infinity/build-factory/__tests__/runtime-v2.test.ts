import { describe, it, expect } from "vitest";
import { BUILD_JOB_STATUSES } from "@/lib/infinity/build-factory/build-job";
import { assertBuildJobLifecycleTransition, canSkipLifecycleStage } from "@/lib/infinity/build-factory/lifecycle-transitions";
import { resolveBuilderKeyForProjectType, getInMemoryBuilderPlugin } from "@/lib/infinity/build-factory/builder-registry";
import { buildJobIdempotencyKey } from "@/lib/infinity/build-factory/build-job-types";
import { BUILDER_PROHIBITED_CAPABILITIES } from "@/lib/infinity/build-factory/builder-contract";

describe("Build Factory Runtime v2", () => {
  it("extends v1 without duplicate factory entrypoints", async () => {
    const mod = await import("@/lib/infinity/build-factory/orchestrator");
    const legacy = await import("@/lib/infinity/build-factory/factory");
    expect(mod.requestBuildFactoryRuntimeV2).toBeTypeOf("function");
    expect(legacy.requestBuildFactory).toBeTypeOf("function");
  });

  it("BuildJob statuses include v2 lifecycle without website fields in idempotency key", () => {
    expect(BUILD_JOB_STATUSES).toContain("builder_resolved");
    const key = buildJobIdempotencyKey({
      organizationId: "org",
      missionId: "m",
      executiveDecisionId: "exec",
      planId: "p",
      ventureBlueprintId: "bp",
      specificationHash: "hash",
      builderKey: "website.internal_static",
      builderVersion: "1.0.0",
    });
    expect(key).not.toMatch(/html|website\.generate/);
    expect(key).toContain("website.internal_static");
  });

  it("resolves registered website builders deterministically", () => {
    expect(resolveBuilderKeyForProjectType("content_site")).toBe("website.internal_content");
    expect(resolveBuilderKeyForProjectType("nextjs_website")).toBe("website.internal_nextjs");
    expect(resolveBuilderKeyForProjectType("saas_application")).toBeNull();
    const plugin = getInMemoryBuilderPlugin("website.internal_static");
    expect(plugin?.descriptor.builderKey).toBe("website.internal_static");
  });

  it("enforces lifecycle transitions fail closed on skip", () => {
    expect(canSkipLifecycleStage()).toBe(false);
    expect(() => assertBuildJobLifecycleTransition("requested", "internally_complete")).toThrow();
    expect(() => assertBuildJobLifecycleTransition("review_pending", "internally_complete")).not.toThrow();
  });

  it("blocks prohibited builder capabilities", () => {
    expect(BUILDER_PROHIBITED_CAPABILITIES).toContain("shell.execute");
    expect(BUILDER_PROHIBITED_CAPABILITIES).toContain("network.access");
    expect(BUILDER_PROHIBITED_CAPABILITIES).toContain("package.install");
  });
});
