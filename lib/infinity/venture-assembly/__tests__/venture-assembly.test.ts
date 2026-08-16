import { describe, it, expect } from "vitest";
import { evaluateLaunchReadiness } from "@/lib/infinity/venture-assembly/readiness";
import { ventureAssemblyIdempotencyKey } from "@/lib/infinity/venture-assembly/idempotency";
import { VENTURE_ASSEMBLY_POLICY_VERSION } from "@/lib/infinity/venture-assembly/constants";
import { buildAssemblyPackages } from "@/lib/infinity/venture-assembly/packages";

describe("Venture Assembly Foundation v1", () => {
  it("builds idempotency key from plan execution and snapshot", () => {
    const key = ventureAssemblyIdempotencyKey({
      organizationId: "org-1",
      planExecutionId: "pe-1",
      planVersion: 2,
      buildSnapshotId: "snap-1",
      assemblyPolicyVersion: VENTURE_ASSEMBLY_POLICY_VERSION,
    });
    expect(key).toContain("pe-1");
    expect(key).toContain("snap-1");
  });

  it("evaluates internally_ready when internal dimensions complete", () => {
    const result = evaluateLaunchReadiness({
      hasStrategyTraceability: true,
      identityComplete: true,
      businessModelComplete: true,
      buildComplete: true,
      qaComplete: true,
      reproducibilityComplete: true,
      monetizationDefined: true,
      marketingDefined: true,
      operationsDefined: true,
      legalIdentified: true,
      analyticsDefined: true,
      externalDependenciesIdentified: true,
      internalBlockers: [],
    });
    expect(result.readinessStatus).toBe("internally_ready");
  });

  it("marks blocked when internal blockers present", () => {
    const result = evaluateLaunchReadiness({
      hasStrategyTraceability: false,
      identityComplete: false,
      businessModelComplete: false,
      buildComplete: false,
      qaComplete: false,
      reproducibilityComplete: false,
      monetizationDefined: false,
      marketingDefined: false,
      operationsDefined: false,
      legalIdentified: false,
      analyticsDefined: false,
      externalDependenciesIdentified: false,
      internalBlockers: ["missing_build"],
    });
    expect(result.readinessStatus).toBe("blocked");
  });

  it("assembles packages without claiming logo artifact", () => {
    const packages = buildAssemblyPackages({
      organizationId: "org",
      missionId: "mission",
      opportunityId: "opp",
      executiveDecisionId: "exec",
      planId: "plan",
      planVersion: 1,
      planExecutionId: "pe",
      ventureBlueprintId: null,
      buildId: "build",
      buildJobId: "job",
      buildSnapshotId: "snap",
      workspaceReference: ".infinity/workspaces/x",
      projectType: "content_site",
      builderKey: "website.internal_content",
      blueprint: null,
      opportunityName: "Test Venture",
      opportunitySummary: "Summary",
    });
    expect(packages.brandPackage.logoArtifactPresent).toBe(false);
    expect(packages.externalDependencies.length).toBeGreaterThan(0);
    expect(packages.digitalPropertyPackage.properties[0].regeneratePolicy).toBe(
      "consume_existing_artifact",
    );
  });
});
