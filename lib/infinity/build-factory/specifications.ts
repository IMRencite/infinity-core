import type { PersistedVentureBlueprint } from "@/lib/infinity/venture-factory/types/blueprint";
import {
  BUILD_SPECIFICATION_SCHEMA_VERSION,
  PROHIBITED_BUILD_ACTIONS,
  VENTURE_TYPE_TO_BUILD_PROJECT,
  type BuildProjectType,
} from "./constants";
import { hashJson } from "./paths";
import type { BuildFactoryRequestInput, BuildSpecification } from "./types";
import {
  assertProjectTypeSupportedForBuildV1,
  projectTypeToTemplateKey,
} from "./template-registry";
import { enrichSpecificationWithWebsite } from "@/lib/infinity/website-builder/specifications";
import { isWebsiteV1ProjectType } from "@/lib/infinity/website-builder/types";
import { WEBSITE_TASK_CAPABILITY_KEYS } from "@/lib/infinity/website-builder/constants";
import { websiteTaskGraphStepCount } from "@/lib/infinity/website-builder/task-graph";
import {
  loadAiWebsiteGenerationMode,
  modeEnablesAiWebsiteTasks,
} from "@/lib/infinity/ai-website-generation/modes";

export function resolveBuildProjectType(blueprint: PersistedVentureBlueprint): BuildProjectType {
  const mapped = VENTURE_TYPE_TO_BUILD_PROJECT[blueprint.ventureType];
  if (mapped) {
    return mapped;
  }
  return "internal_tool";
}

export function createBuildSpecification(input: {
  request: BuildFactoryRequestInput;
  blueprint: PersistedVentureBlueprint;
  buildId: string;
  buildVersion?: string;
}): BuildSpecification {
  const projectType = resolveBuildProjectType(input.blueprint);
  let templateKey = projectTypeToTemplateKey(projectType) ?? "static-site-basic";
  let status: BuildSpecification["status"] = "requested";

  try {
    assertProjectTypeSupportedForBuildV1(projectType);
  } catch {
    status = "unsupported_for_build_v1";
    templateKey = projectTypeToTemplateKey("static_website")!;
  }

  const b = input.blueprint.blueprint;
  const slug = b.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  const spec: BuildSpecification = {
    id: input.buildId,
    organizationId: input.request.organizationId,
    missionId: input.request.missionId,
    runtimeInstanceId: input.request.runtimeInstanceId,
    opportunityId: input.request.opportunityId,
    ventureBlueprintId: input.request.ventureBlueprintId,
    planId: input.request.planId,
    allocationProposalId: input.request.allocationProposalId,
    projectType,
    templateKey,
    templateVersion: "1",
    buildVersion: input.buildVersion ?? "1",
    name: b.name,
    slug: slug || "internal-build",
    description: b.description,
    businessModel: b.businessModel,
    targetAudience: b.targetAudience,
    valueProposition: b.valueProposition,
    functionalRequirements: b.requiredAssets,
    nonFunctionalRequirements: ["internal_only", "zero_external_side_effects"],
    requiredPages: b.requiredContent.slice(0, 10),
    requiredFeatures: b.requiredProducts,
    dataRequirements: [],
    contentRequirements: b.requiredContent,
    designRequirements: ["accessible_baseline"],
    SEORequirements: ["no_public_indexing"],
    accessibilityRequirements: ["wcag_baseline_internal"],
    securityRequirements: ["no_secrets_in_repo", "sandbox_only"],
    performanceRequirements: ["bounded_file_sizes"],
    integrationRequirements: [],
    prohibitedActions: [...PROHIBITED_BUILD_ACTIONS],
    approvedCapabilities: [
      "build.workspace_initialize",
      "build.persist_specification",
      "build.persist_manifest",
      "build.generate_template_scaffold",
      "build.validate_manifest",
      "build.snapshot_workspace",
      "qa.verify_internal_build",
    ],
    requiredReviews: ["qa.verify_internal_build"],
    estimatedTasks: 7,
    estimatedCost: 0,
    maximumCost: 0,
    maximumRuntime: 120_000,
    outputTypes: ["internal_build_package"],
    status,
    specificationHash: "",
    createdAt: new Date().toISOString(),
  };

  spec.specificationHash = hashJson({
    schema: BUILD_SPECIFICATION_SCHEMA_VERSION,
    ...spec,
    specificationHash: undefined,
    createdAt: undefined,
  });

  if (isWebsiteV1ProjectType(projectType) && status !== "unsupported_for_build_v1") {
    const aiMode = loadAiWebsiteGenerationMode();
    const aiEnabled = modeEnablesAiWebsiteTasks(aiMode);
    const enriched = enrichSpecificationWithWebsite(spec);
    enriched.aiWebsiteGeneration = { enabled: aiEnabled, mode: aiMode };
    const aiCaps = aiEnabled
      ? [
          "ai_website.build_context",
          "ai_website.generate_plan",
          "ai_website.validate_plan",
          "ai_website.request_review",
          "ai_website.translate_approved_plan",
          "website.generate_ai_planned_pages",
          "website.generate_ai_planned_content",
        ]
      : [];
    const websiteCaps = aiEnabled
      ? WEBSITE_TASK_CAPABILITY_KEYS.filter((k) => k !== "website.generate_pages")
      : [...WEBSITE_TASK_CAPABILITY_KEYS];
    enriched.approvedCapabilities = [
      "build.workspace_initialize",
      "build.persist_specification",
      "build.persist_manifest",
      ...aiCaps,
      ...websiteCaps,
      aiEnabled ? "qa.verify_ai_generated_website" : "qa.verify_internal_website",
      "qa.verify_generic_internal_build",
      "build.snapshot_workspace",
    ];
    enriched.requiredReviews = [
      aiEnabled ? "qa.verify_ai_generated_website" : "qa.verify_internal_website",
      "qa.verify_generic_internal_build",
    ];
    enriched.estimatedTasks = websiteTaskGraphStepCount({ aiGenerationEnabled: aiEnabled });
    enriched.outputTypes = ["internal_website_source_package"];
    enriched.specificationHash = hashJson({
      schema: BUILD_SPECIFICATION_SCHEMA_VERSION,
      ...enriched,
      specificationHash: undefined,
      createdAt: undefined,
    });
    return enriched;
  }

  return spec;
}

export function deriveDeterministicBuildId(input: {
  organizationId: string;
  missionId: string;
  ventureBlueprintId: string;
  planId: string;
  buildVersion: string;
}): string {
  const digest = hashJson(input);
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `a${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}

export function buildIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  ventureBlueprintId: string;
  planId: string;
  buildVersion: string;
  specificationHash: string;
}): string {
  return [
    "build-factory",
    input.organizationId,
    input.missionId,
    input.ventureBlueprintId,
    input.planId,
    input.buildVersion,
    input.specificationHash,
  ].join(":");
}
