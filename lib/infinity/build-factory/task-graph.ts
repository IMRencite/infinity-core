import type { BuildProjectType } from "./constants";
import type { BuildTaskNode } from "./types";
import { BUILD_TASK_CAPABILITY_KEYS } from "./constants";
import { isWebsiteV1ProjectType } from "@/lib/infinity/website-builder/types";
import {
  buildWebsiteTaskGraph,
  websiteTaskGraphStepOrder,
} from "@/lib/infinity/website-builder/task-graph";

const TASK_DEFS: {
  id: string;
  capabilityKey: (typeof BUILD_TASK_CAPABILITY_KEYS)[number];
  dependencies: string[];
  reviewRequirement: string;
  sideEffectClass: string;
}[] = [
  {
    id: "workspace.initialize",
    capabilityKey: "build.workspace_initialize",
    dependencies: [],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_write",
  },
  {
    id: "specification.persist",
    capabilityKey: "build.persist_specification",
    dependencies: ["workspace.initialize"],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_write",
  },
  {
    id: "manifest.persist",
    capabilityKey: "build.persist_manifest",
    dependencies: ["specification.persist"],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_write",
  },
  {
    id: "scaffold.generate",
    capabilityKey: "build.generate_template_scaffold",
    dependencies: ["manifest.persist"],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_write",
  },
  {
    id: "file.validate",
    capabilityKey: "build.validate_manifest",
    dependencies: ["scaffold.generate"],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_read",
  },
  {
    id: "workspace.snapshot",
    capabilityKey: "build.snapshot_workspace",
    dependencies: ["file.validate"],
    reviewRequirement: "not_required",
    sideEffectClass: "internal_write",
  },
  {
    id: "build.review",
    capabilityKey: "qa.verify_internal_build",
    dependencies: ["workspace.snapshot"],
    reviewRequirement: "independent_qa",
    sideEffectClass: "internal_read",
  },
];

export function buildTaskGraph(
  buildId: string,
  organizationId: string,
  missionId: string,
  projectType?: BuildProjectType,
): BuildTaskNode[] {
  if (projectType && isWebsiteV1ProjectType(projectType)) {
    return buildWebsiteTaskGraph(buildId, organizationId, missionId);
  }
  return TASK_DEFS.map((def) => ({
    id: def.id,
    buildId,
    capabilityKey: def.capabilityKey,
    dependencies: def.dependencies,
    inputManifest: {
      organization_id: organizationId,
      mission_id: missionId,
      build_id: buildId,
    },
    outputContract: { build_id: buildId },
    reviewRequirement: def.reviewRequirement,
    timeoutSeconds: 120,
    maxAttempts: 3,
    sideEffectClass: def.sideEffectClass,
    status: "pending",
    idempotencyKey: `build-task:${buildId}:${def.id}`,
  }));
}

export function taskGraphStepOrder(projectType?: BuildProjectType): string[] {
  if (projectType && isWebsiteV1ProjectType(projectType)) {
    return websiteTaskGraphStepOrder();
  }
  return TASK_DEFS.map((d) => d.capabilityKey);
}
