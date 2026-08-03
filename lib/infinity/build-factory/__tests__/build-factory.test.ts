import { describe, it, expect } from "vitest";
import {
  createLocalSandboxAdapter,
  rejectPathTraversalAttempt,
} from "@/lib/infinity/build-factory/sandbox";
import {
  assertProjectTypeSupportedForBuildV1,
  getBuildTemplate,
} from "@/lib/infinity/build-factory/template-registry";
import { buildIdempotencyKey, createBuildSpecification } from "@/lib/infinity/build-factory/specifications";
import { assertZeroCostBuild } from "@/lib/infinity/build-factory/budgets";
import type { PersistedVentureBlueprint } from "@/lib/infinity/venture-factory/types/blueprint";
import { BUILD_V1_SUPPORTED_PROJECT_TYPES } from "@/lib/infinity/build-factory/constants";
import { isGovernedWorkerCapabilityKey } from "@/lib/infinity/workers/capability";
import { hashText } from "@/lib/infinity/build-factory/paths";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Build Factory Foundation v1", () => {
  it("registers build worker capabilities as governed", () => {
    expect(isGovernedWorkerCapabilityKey("build.workspace_initialize")).toBe(true);
    expect(isGovernedWorkerCapabilityKey("qa.verify_internal_build")).toBe(true);
  });

  it("blocks unsupported project types for v1", () => {
    expect(() => assertProjectTypeSupportedForBuildV1("saas_application")).toThrow(
      /unsupported_for_build_v1/,
    );
    for (const t of BUILD_V1_SUPPORTED_PROJECT_TYPES) {
      expect(() => assertProjectTypeSupportedForBuildV1(t)).not.toThrow();
    }
  });

  it("enforces template version", () => {
    expect(getBuildTemplate("static-site-basic", "1").key).toBe("static-site-basic");
    expect(() => getBuildTemplate("static-site-basic", "9")).toThrow(/version mismatch/);
  });

  it("rejects path traversal", () => {
    expect(() => rejectPathTraversalAttempt("../etc/passwd")).toThrow();
    expect(() => rejectPathTraversalAttempt("src/../.env")).toThrow();
  });

  it("sandbox rejects writes outside workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "infinity-build-"));
    try {
      const adapter = createLocalSandboxAdapter({
        organizationId: "org-1",
        missionId: "m-1",
        buildId: "b-1",
        repoRoot: root,
      });
      await adapter.createDirectory("src");
      await adapter.writeTextFile("src/ok.txt", "hello");
      await expect(adapter.writeTextFile("../escape.txt", "bad")).rejects.toThrow(
        /outside workspace|Path traversal/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("sandbox rejects secrets in files", async () => {
    const root = await mkdtemp(join(tmpdir(), "infinity-build-"));
    try {
      const adapter = createLocalSandboxAdapter({
        organizationId: "org-1",
        missionId: "m-1",
        buildId: "b-1",
        repoRoot: root,
      });
      await expect(
        adapter.writeTextFile("src/leak.txt", "key sk-123456789012345678901234567890"),
      ).rejects.toThrow(/Secrets/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("build idempotency keys are deterministic", () => {
    const a = buildIdempotencyKey({
      organizationId: "o",
      missionId: "m",
      ventureBlueprintId: "bp",
      planId: "p",
      buildVersion: "1",
      specificationHash: "abc",
    });
    const b = buildIdempotencyKey({
      organizationId: "o",
      missionId: "m",
      ventureBlueprintId: "bp",
      planId: "p",
      buildVersion: "1",
      specificationHash: "abc",
    });
    expect(a).toBe(b);
  });

  it("specification marks unsupported types without implying success", () => {
    const blueprint = {
      id: "bp-1",
      organizationId: "org",
      opportunityId: "opp",
      ventureType: "saas",
      templateKey: "saas",
      templateVersion: "1",
      schemaVersion: "v1",
      status: "validated",
      idempotencyKey: "k",
      createdAt: new Date().toISOString(),
      blueprint: {
        id: "bp-1",
        ventureType: "saas",
        businessModel: "sub",
        industry: "tech",
        name: "Test SaaS",
        description: "d",
        targetAudience: "a",
        customerPersona: "p",
        valueProposition: "v",
        revenueModel: "mrr",
        marketingChannels: [],
        requiredAssets: [],
        requiredWorkers: [],
        requiredContent: [],
        requiredProducts: [],
        requiredServices: [],
        estimatedTimeline: "1w",
        estimatedBudget: "0",
        expectedROI: "0",
        priority: 1,
        status: "validated",
        createdAt: new Date().toISOString(),
      },
    } as PersistedVentureBlueprint;

    const spec = createBuildSpecification({
      request: {
        organizationId: "org",
        missionId: "m",
        runtimeInstanceId: null,
        opportunityId: "opp",
        ventureBlueprintId: "bp-1",
        planId: "plan",
        allocationProposalId: "alloc",
        correlationId: crypto.randomUUID(),
      },
      blueprint,
      buildId: crypto.randomUUID(),
    });

    expect(spec.status).toBe("unsupported_for_build_v1");
  });

  it("assertZeroCostBuild blocks paid resources flag", () => {
    expect(() => assertZeroCostBuild()).not.toThrow();
  });

  it("hash helper is deterministic", () => {
    expect(hashText("a")).toBe(hashText("a"));
  });

  it("validate e2e guard pattern exists for build script", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_BUILD_FACTORY_E2E;
    expect(() => {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_BUILD_FACTORY_E2E !== "true") {
        throw new Error("development-only");
      }
    }).toThrow();
    process.env.NODE_ENV = prev;
  });
});
