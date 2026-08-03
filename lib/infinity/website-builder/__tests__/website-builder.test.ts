import { describe, it, expect } from "vitest";
import { createBuildSpecification } from "@/lib/infinity/build-factory/specifications";
import { buildTaskGraph, taskGraphStepOrder } from "@/lib/infinity/build-factory/task-graph";
import { isGovernedWorkerCapabilityKey } from "@/lib/infinity/workers/capability";
import { defaultPagesForProjectType } from "@/lib/infinity/website-builder/page-models";
import { CONTENT_MARKERS, WEBSITE_V1_PROJECT_TYPES } from "@/lib/infinity/website-builder/constants";
import { scanContentHonesty, validateWebsiteSecurity } from "@/lib/infinity/website-builder/validation";
import { createLocalSandboxAdapter } from "@/lib/infinity/build-factory/sandbox";
import type { PersistedVentureBlueprint } from "@/lib/infinity/venture-factory/types/blueprint";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function blueprint(ventureType: string): PersistedVentureBlueprint {
  return {
    id: "bp-1",
    organizationId: "org",
    opportunityId: "opp",
    ventureType,
    templateKey: "content_website",
    status: "validated",
    blueprint: {
      id: "bp-1",
      ventureType,
      businessModel: "content",
      industry: "tech",
      name: "Internal Site",
      description: "Spec description",
      targetAudience: "audience",
      customerPersona: "persona",
      valueProposition: "value",
      revenueModel: "ads",
      marketingChannels: [],
      requiredAssets: [],
      requiredWorkers: [],
      requiredContent: ["Topic A"],
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
}

describe("Website Build Worker Foundation v1", () => {
  it("registers website capabilities as governed", () => {
    expect(isGovernedWorkerCapabilityKey("website.generate_pages")).toBe(true);
    expect(isGovernedWorkerCapabilityKey("qa.verify_internal_website")).toBe(true);
  });

  it("uses website task graph for supported project types", () => {
    for (const t of WEBSITE_V1_PROJECT_TYPES) {
      const order = taskGraphStepOrder(t);
      expect(order[0]).toBe("build.workspace_initialize");
      expect(order).toContain("website.package_internal_source");
      expect(order.at(-1)).toBe("build.snapshot_workspace");
    }
    const tasks = buildTaskGraph("b", "org", "m", "static_website");
    expect(tasks.length).toBe(17);
  });

  it("blocks unsupported project types", () => {
    const spec = createBuildSpecification({
      request: {
        organizationId: "org",
        missionId: "m",
        runtimeInstanceId: null,
        opportunityId: "opp",
        ventureBlueprintId: "bp",
        planId: "plan",
        allocationProposalId: null,
        correlationId: crypto.randomUUID(),
      },
      blueprint: blueprint("saas"),
      buildId: crypto.randomUUID(),
    });
    expect(spec.status).toBe("unsupported_for_build_v1");
  });

  it("enriches website specification with honest markers", () => {
    const spec = createBuildSpecification({
      request: {
        organizationId: "org",
        missionId: "m",
        runtimeInstanceId: null,
        opportunityId: "opp",
        ventureBlueprintId: "bp",
        planId: "plan",
        allocationProposalId: null,
        correlationId: crypto.randomUUID(),
      },
      blueprint: blueprint("content_website"),
      buildId: crypto.randomUUID(),
    });
    expect(spec.website?.pageDefinitions.length).toBeGreaterThan(0);
    expect(JSON.stringify(spec)).toContain(CONTENT_MARKERS.contentRequired);
  });

  it("limits content site sample articles", () => {
    const pages = defaultPagesForProjectType("content_site", "Site", [
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    const articles = pages.filter((p) => p.pageType === "article");
    expect(articles.length).toBeLessThanOrEqual(3);
  });

  it("detects security issues and fake claims", async () => {
    const root = await mkdtemp(join(tmpdir(), "infinity-web-"));
    try {
      const adapter = createLocalSandboxAdapter({
        organizationId: "org",
        missionId: "m",
        buildId: "b",
        repoRoot: root,
      });
      await adapter.writeTextFile("bad.html", '<script src="https://evil.example/x.js"></script>');
      const outcome = await validateWebsiteSecurity(adapter);
      expect(outcome.valid).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
    expect(scanContentHonesty("We guarantee 200% growth for Fortune 500 clients").length).toBeGreaterThan(
      0,
    );
  });

  it("route order is deterministic", () => {
    const a = taskGraphStepOrder("static_website");
    const b = taskGraphStepOrder("static_website");
    expect(a).toEqual(b);
  });
});
