import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { runBuildFactoryE2EValidation } from "@/lib/infinity/build-factory/validate-e2e";
import { loadWebsiteBuildMetadataSummary } from "./metadata";
import { websiteTaskGraphStepCount } from "./task-graph";

export type WebsiteBuilderE2EReport = Awaited<ReturnType<typeof runBuildFactoryE2EValidation>> & {
  websiteMetadataLoaded: boolean;
  expectedTaskCount: number;
  routeCount: number;
  componentCount: number;
  fileCount: number;
};

export function assertWebsiteBuilderE2EAllowed(): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  if (nodeEnv === "production" && process.env.ALLOW_WEBSITE_BUILDER_E2E !== "true") {
    throw new Error("Website Builder E2E is development-only.");
  }
}

export async function runWebsiteBuilderE2EValidation(
  admin: AdminSupabaseClient,
): Promise<WebsiteBuilderE2EReport> {
  assertWebsiteBuilderE2EAllowed();
  const base = await runBuildFactoryE2EValidation(admin);

  const meta = await loadWebsiteBuildMetadataSummary(
    admin,
    base.organizationId,
    base.buildId,
  );

  const routeCount = Array.isArray(meta?.routeManifest)
    ? meta!.routeManifest.length
    : 0;
  const componentCount = Array.isArray(meta?.componentManifest)
    ? meta!.componentManifest.length
    : 0;

  const errors = [...base.errors];
  if (base.taskCountBefore !== websiteTaskGraphStepCount()) {
    errors.push(
      `Expected ${websiteTaskGraphStepCount()} tasks, got ${base.taskCountBefore}`,
    );
  }
  if (!meta) {
    errors.push("website_build_metadata missing");
  }
  if (routeCount < 1) {
    errors.push("Expected route manifest entries");
  }

  return {
    ...base,
    pass: errors.length === 0 && base.pass,
    errors,
    websiteMetadataLoaded: Boolean(meta),
    expectedTaskCount: websiteTaskGraphStepCount(),
    routeCount,
    componentCount,
    fileCount: routeCount + componentCount,
  };
}
