import type { BuildProjectType } from "./constants";
import { BUILD_SPECIFICATION_SCHEMA_VERSION, BUILD_V1_SUPPORTED_PROJECT_TYPES } from "./constants";
import type { BuilderPlugin } from "./builder-contract";
import { buildTaskGraph } from "./task-graph";

function projectTypeSupportedByV2(projectType: BuildProjectType): boolean {
  return BUILD_V1_SUPPORTED_PROJECT_TYPES.includes(projectType);
}

function baseDescriptor(
  builderKey: string,
  supportedProjectTypes: BuildProjectType[],
): BuilderPlugin["descriptor"] {
  return {
    builderKey,
    builderVersion: "1.0.0",
    name: builderKey,
    description: "Internal website builder adapter (Website Build Worker v1)",
    supportedProjectTypes,
    supportedSpecificationVersions: [BUILD_SPECIFICATION_SCHEMA_VERSION],
    requiredCapabilities: ["build.workspace_initialize", "qa.verify_internal_website"],
    optionalCapabilities: ["qa.verify_generic_internal_build"],
    prohibitedCapabilities: ["shell.execute", "network.access", "package.install"],
    sideEffectClass: "internal_write",
    lifecycleSupport: ["initialize", "validate", "generate", "test", "complete"],
    maximumRuntimeMs: 600_000,
    maximumAttempts: 3,
    maximumEstimatedCost: 0,
    concurrencyLimit: 1,
    repairPolicy: { maxAttempts: 2, cannotWidenPermissions: true },
    rollbackSupport: true,
    reviewRequirements: ["qa.verify_internal_website", "qa.verify_generic_internal_build"],
    status: "active",
  };
}

function websiteAdapter(
  builderKey: string,
  projectTypes: BuildProjectType[],
): BuilderPlugin {
  return {
    descriptor: baseDescriptor(builderKey, projectTypes),
    describeLifecycleTasks(context) {
      return buildTaskGraph(
        context.buildId,
        context.organizationId,
        context.missionId,
        context.projectType,
        context.aiGenerationEnabled,
      );
    },
  };
}

const IN_MEMORY_BUILDERS: BuilderPlugin[] = [
  websiteAdapter("website.internal_static", [
    "static_website",
    "lead_generation_site",
    "affiliate_site",
  ]),
  websiteAdapter("website.internal_nextjs", ["nextjs_website"]),
  websiteAdapter("website.internal_content", ["content_site"]),
];

export function listInMemoryBuilderPlugins(): BuilderPlugin[] {
  return IN_MEMORY_BUILDERS;
}

export function getInMemoryBuilderPlugin(builderKey: string): BuilderPlugin | null {
  return IN_MEMORY_BUILDERS.find((b) => b.descriptor.builderKey === builderKey) ?? null;
}

export function resolveBuilderKeyForProjectType(
  projectType: BuildProjectType,
): string | null {
  if (!projectTypeSupportedByV2(projectType)) {
    return null;
  }
  if (projectType === "nextjs_website") {
    return "website.internal_nextjs";
  }
  if (projectType === "content_site") {
    return "website.internal_content";
  }
  return "website.internal_static";
}
