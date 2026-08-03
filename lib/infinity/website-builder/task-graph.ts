import type { BuildTaskNode } from "@/lib/infinity/build-factory/types";

const WEBSITE_TASK_DEFS: {
  id: string;
  capabilityKey: string;
  dependencies: string[];
}[] = [
  { id: "workspace.initialize", capabilityKey: "build.workspace_initialize", dependencies: [] },
  {
    id: "specification.persist",
    capabilityKey: "build.persist_specification",
    dependencies: ["workspace.initialize"],
  },
  {
    id: "manifest.persist",
    capabilityKey: "build.persist_manifest",
    dependencies: ["specification.persist"],
  },
  {
    id: "website.structure",
    capabilityKey: "website.generate_structure",
    dependencies: ["manifest.persist"],
  },
  {
    id: "website.components",
    capabilityKey: "website.generate_components",
    dependencies: ["website.structure"],
  },
  {
    id: "website.pages",
    capabilityKey: "website.generate_pages",
    dependencies: ["website.components"],
  },
  {
    id: "website.styles",
    capabilityKey: "website.generate_styles",
    dependencies: ["website.pages"],
  },
  {
    id: "website.metadata",
    capabilityKey: "website.generate_metadata",
    dependencies: ["website.styles"],
  },
  {
    id: "website.sitemap",
    capabilityKey: "website.generate_sitemap",
    dependencies: ["website.metadata"],
  },
  {
    id: "website.robots",
    capabilityKey: "website.generate_robots",
    dependencies: ["website.sitemap"],
  },
  {
    id: "website.validate.structure",
    capabilityKey: "website.validate_structure",
    dependencies: ["website.robots"],
  },
  {
    id: "website.validate.a11y",
    capabilityKey: "website.validate_accessibility",
    dependencies: ["website.validate.structure"],
  },
  {
    id: "website.validate.seo",
    capabilityKey: "website.validate_seo",
    dependencies: ["website.validate.a11y"],
  },
  {
    id: "website.validate.security",
    capabilityKey: "website.validate_security",
    dependencies: ["website.validate.seo"],
  },
  {
    id: "website.package",
    capabilityKey: "website.package_internal_source",
    dependencies: ["website.validate.security"],
  },
  {
    id: "website.qa",
    capabilityKey: "qa.verify_internal_website",
    dependencies: ["website.package"],
  },
  {
    id: "workspace.snapshot",
    capabilityKey: "build.snapshot_workspace",
    dependencies: ["website.qa"],
  },
];

export function buildWebsiteTaskGraph(
  buildId: string,
  organizationId: string,
  missionId: string,
): BuildTaskNode[] {
  return WEBSITE_TASK_DEFS.map((def) => ({
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
    reviewRequirement:
      def.capabilityKey === "qa.verify_internal_website" ? "independent_qa" : "not_required",
    timeoutSeconds: 120,
    maxAttempts: 3,
    sideEffectClass:
      def.capabilityKey.startsWith("website.validate") ||
      def.capabilityKey === "qa.verify_internal_website"
        ? "internal_read"
        : "internal_write",
    status: "pending",
    idempotencyKey: `build-task:${buildId}:${def.id}`,
  }));
}

export function websiteTaskGraphStepOrder(): string[] {
  return WEBSITE_TASK_DEFS.map((d) => d.capabilityKey);
}

export function websiteTaskGraphStepCount(): number {
  return WEBSITE_TASK_DEFS.length;
}
