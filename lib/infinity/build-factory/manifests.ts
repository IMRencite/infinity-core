import { BUILD_MANIFEST_SCHEMA_VERSION, DEFAULT_MAX_FILE_BYTES, DEFAULT_MAX_FILES, DEFAULT_MAX_WORKSPACE_BYTES } from "./constants";
import { hashJson } from "./paths";
import type { BuildManifest, BuildSpecification, BuildTaskNode } from "./types";
import { getBuildTemplate } from "./template-registry";
import { buildTaskGraph } from "./task-graph";

export function createBuildManifest(input: {
  specification: BuildSpecification;
  buildId: string;
  workspaceReference: string;
  tasks: BuildTaskNode[];
}): BuildManifest {
  const template = getBuildTemplate(
    input.specification.templateKey,
    input.specification.templateVersion,
  );

  const manifest: BuildManifest = {
    specificationId: input.specification.id,
    specificationVersion: input.specification.buildVersion,
    workspaceId: input.workspaceReference,
    projectType: input.specification.projectType,
    templateKey: template.key,
    templateVersion: template.version,
    fileManifest: template.requiredFiles.map((path) => ({
      path,
      hash: "",
      bytes: 0,
    })),
    directoryManifest: template.directories,
    dependencyManifest: {},
    environmentManifest: {
      NODE_ENV: "development",
      PUBLIC_DEPLOYMENT: "disabled",
    },
    taskGraph: input.tasks,
    requiredWorkerCapabilities: template.supportedCapabilities,
    requiredReviewCapabilities: template.reviewRequirements,
    outputContracts: {
      internal_build_package: {
        label: "Internal build package — not deployed or published.",
      },
    },
    validationCommands: [],
    prohibitedCommands: ["npm install", "shell", "curl", "wget", "git push"],
    allowedPaths: ["src", "app", "content", "tests", "README.md"],
    deniedPaths: [".env", ".env.local", ".git", "node_modules"],
    maximumFileCount: DEFAULT_MAX_FILES,
    maximumTotalOutputSize: DEFAULT_MAX_WORKSPACE_BYTES,
    maximumIndividualFileSize: DEFAULT_MAX_FILE_BYTES,
    snapshotPolicy: "immutable_on_snapshot_worker",
    rollbackPolicy: "restore_snapshot_no_deploy",
    manifestHash: "",
    createdAt: new Date().toISOString(),
  };

  manifest.manifestHash = hashJson({
    schema: BUILD_MANIFEST_SCHEMA_VERSION,
    ...manifest,
    manifestHash: undefined,
    createdAt: undefined,
  });

  return manifest;
}

export function buildManifestForSpecification(
  specification: BuildSpecification,
  buildId: string,
  workspaceReference: string,
): BuildManifest {
  const aiEnabled = specification.aiWebsiteGeneration?.enabled ?? false;
  const tasks = buildTaskGraph(
    buildId,
    specification.organizationId,
    specification.missionId,
    specification.projectType,
    aiEnabled,
  );
  return createBuildManifest({
    specification,
    buildId,
    workspaceReference,
    tasks,
  });
}
