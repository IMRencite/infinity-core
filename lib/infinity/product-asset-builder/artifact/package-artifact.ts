import { randomUUID } from "node:crypto";
import type { VentureBlueprintDraft } from "@/lib/infinity/company-builder/types";
import type { ProductionArtifactDraft, ValidationRunRecord } from "../types";
import type { VentureSandbox } from "../workspace/sandbox";
import { computeBuildHash } from "../validate/run-validators";

export async function packageProductionArtifact(input: {
  sandbox: VentureSandbox;
  blueprint: VentureBlueprintDraft;
  buildPackageId: string | null;
  buildRunId: string;
  workspaceId: string;
  validationRuns: ValidationRunRecord[];
  validationPassed: boolean;
}): Promise<ProductionArtifactDraft> {
  const buildHash = await computeBuildHash(input.sandbox);
  const files = await input.sandbox.listFiles();
  const stats = input.sandbox.getStats();

  const status = input.validationPassed ? "ready" : "failed";

  return {
    artifactId: randomUUID(),
    ventureId: input.blueprint.sourceLineage.opportunityCandidateId ?? input.buildRunId,
    buildPackageId: input.buildPackageId,
    workspaceId: input.workspaceId,
    buildRunId: input.buildRunId,
    status,
    artifactManifest: {
      engineVersion: "product_asset_builder_v1",
      fileCount: files.length,
      workspaceReference: input.sandbox.workspaceReference,
      simulationOnly: input.blueprint.simulationOnly,
    },
    sourceManifest: { files: files.filter((f) => !f.startsWith("node_modules") && !f.startsWith(".next")) },
    technologyManifest: {
      stack: input.blueprint.technicalArchitecture.recommendedStack,
      applicationType: input.blueprint.technicalArchitecture.applicationType,
    },
    databaseManifest: {
      entities: input.blueprint.dataModel.entities.map((e) => e.name),
      schemaFile: "db/schema.sql",
    },
    routeManifest: {
      routes: ["/", "/dashboard"],
      middleware: "middleware.ts",
    },
    monetizationManifest: {
      model: input.blueprint.revenueArchitecture.monetizationModelType,
      adapter: "lib/monetization/index.ts",
      sandbox: true,
    },
    validationManifest: {
      passed: input.validationPassed,
      runs: input.validationRuns,
    },
    dependencyManifest: {
      packageManager: "npm",
      dependencies: ["next", "react", "react-dom"],
    },
    buildHash,
    fileCount: stats.fileCount || files.length,
    totalBytes: stats.totalBytes,
    createdAt: new Date().toISOString(),
  };
}
