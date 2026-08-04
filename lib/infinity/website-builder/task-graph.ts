import type { BuildTaskNode } from "@/lib/infinity/build-factory/types";

const AI_TASK_DEFS: { id: string; capabilityKey: string; dependencies: string[] }[] = [
  { id: "ai.context", capabilityKey: "ai_website.build_context", dependencies: ["manifest.persist"] },
  { id: "ai.plan", capabilityKey: "ai_website.generate_plan", dependencies: ["ai.context"] },
  { id: "ai.validate", capabilityKey: "ai_website.validate_plan", dependencies: ["ai.plan"] },
  { id: "ai.review", capabilityKey: "ai_website.request_review", dependencies: ["ai.validate"] },
  {
    id: "ai.translate",
    capabilityKey: "ai_website.translate_approved_plan",
    dependencies: ["ai.review"],
  },
];

const WEBSITE_CORE_DEFS: { id: string; capabilityKey: string; dependencies: string[] }[] = [
  { id: "website.structure", capabilityKey: "website.generate_structure", dependencies: [] },
  {
    id: "website.components",
    capabilityKey: "website.generate_components",
    dependencies: ["website.structure"],
  },
  { id: "website.pages", capabilityKey: "website.generate_pages", dependencies: ["website.components"] },
  {
    id: "website.ai.pages",
    capabilityKey: "website.generate_ai_planned_pages",
    dependencies: ["website.components"],
  },
  {
    id: "website.ai.content",
    capabilityKey: "website.generate_ai_planned_content",
    dependencies: ["website.ai.pages"],
  },
  {
    id: "website.styles",
    capabilityKey: "website.generate_styles",
    dependencies: ["website.pages"],
  },
  {
    id: "website.styles.ai",
    capabilityKey: "website.generate_styles",
    dependencies: ["website.ai.content"],
  },
  {
    id: "website.metadata",
    capabilityKey: "website.generate_metadata",
    dependencies: ["website.styles"],
  },
  {
    id: "website.metadata.ai",
    capabilityKey: "website.generate_metadata",
    dependencies: ["website.styles.ai"],
  },
  {
    id: "website.sitemap",
    capabilityKey: "website.generate_sitemap",
    dependencies: ["website.metadata"],
  },
  {
    id: "website.sitemap.ai",
    capabilityKey: "website.generate_sitemap",
    dependencies: ["website.metadata.ai"],
  },
  {
    id: "website.robots",
    capabilityKey: "website.generate_robots",
    dependencies: ["website.sitemap"],
  },
  {
    id: "website.robots.ai",
    capabilityKey: "website.generate_robots",
    dependencies: ["website.sitemap.ai"],
  },
  {
    id: "website.validate.structure",
    capabilityKey: "website.validate_structure",
    dependencies: ["website.robots"],
  },
  {
    id: "website.validate.structure.ai",
    capabilityKey: "website.validate_structure",
    dependencies: ["website.robots.ai"],
  },
  {
    id: "website.validate.a11y",
    capabilityKey: "website.validate_accessibility",
    dependencies: ["website.validate.structure"],
  },
  {
    id: "website.validate.a11y.ai",
    capabilityKey: "website.validate_accessibility",
    dependencies: ["website.validate.structure.ai"],
  },
  {
    id: "website.validate.seo",
    capabilityKey: "website.validate_seo",
    dependencies: ["website.validate.a11y"],
  },
  {
    id: "website.validate.seo.ai",
    capabilityKey: "website.validate_seo",
    dependencies: ["website.validate.a11y.ai"],
  },
  {
    id: "website.validate.security",
    capabilityKey: "website.validate_security",
    dependencies: ["website.validate.seo"],
  },
  {
    id: "website.validate.security.ai",
    capabilityKey: "website.validate_security",
    dependencies: ["website.validate.seo.ai"],
  },
  {
    id: "website.package",
    capabilityKey: "website.package_internal_source",
    dependencies: ["website.validate.security"],
  },
  {
    id: "website.package.ai",
    capabilityKey: "website.package_internal_source",
    dependencies: ["website.validate.security.ai"],
  },
  {
    id: "website.qa",
    capabilityKey: "qa.verify_internal_website",
    dependencies: ["website.package"],
  },
  {
    id: "website.qa.ai",
    capabilityKey: "qa.verify_ai_generated_website",
    dependencies: ["website.package.ai"],
  },
];

const BASE_DEFS: { id: string; capabilityKey: string; dependencies: string[] }[] = [
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
    id: "workspace.snapshot",
    capabilityKey: "build.snapshot_workspace",
    dependencies: ["website.qa"],
  },
  {
    id: "workspace.snapshot.ai",
    capabilityKey: "build.snapshot_workspace",
    dependencies: ["website.qa.ai"],
  },
];

function mergeWebsitePipeline(aiGenerationEnabled: boolean): { id: string; capabilityKey: string; dependencies: string[] }[] {
  if (!aiGenerationEnabled) {
    return [
      { id: "website.structure", capabilityKey: "website.generate_structure", dependencies: ["manifest.persist"] },
      { id: "website.components", capabilityKey: "website.generate_components", dependencies: ["website.structure"] },
      { id: "website.pages", capabilityKey: "website.generate_pages", dependencies: ["website.components"] },
      { id: "website.styles", capabilityKey: "website.generate_styles", dependencies: ["website.pages"] },
      { id: "website.metadata", capabilityKey: "website.generate_metadata", dependencies: ["website.styles"] },
      { id: "website.sitemap", capabilityKey: "website.generate_sitemap", dependencies: ["website.metadata"] },
      { id: "website.robots", capabilityKey: "website.generate_robots", dependencies: ["website.sitemap"] },
      { id: "website.validate.structure", capabilityKey: "website.validate_structure", dependencies: ["website.robots"] },
      { id: "website.validate.a11y", capabilityKey: "website.validate_accessibility", dependencies: ["website.validate.structure"] },
      { id: "website.validate.seo", capabilityKey: "website.validate_seo", dependencies: ["website.validate.a11y"] },
      { id: "website.validate.security", capabilityKey: "website.validate_security", dependencies: ["website.validate.seo"] },
      { id: "website.package", capabilityKey: "website.package_internal_source", dependencies: ["website.validate.security"] },
      { id: "website.qa", capabilityKey: "qa.verify_internal_website", dependencies: ["website.package"] },
    ];
  }

  const structureDep = "ai.translate";
  return [
    ...AI_TASK_DEFS,
    { id: "website.structure", capabilityKey: "website.generate_structure", dependencies: [structureDep] },
    { id: "website.components", capabilityKey: "website.generate_components", dependencies: ["website.structure"] },
    { id: "website.ai.pages", capabilityKey: "website.generate_ai_planned_pages", dependencies: ["website.components"] },
    { id: "website.ai.content", capabilityKey: "website.generate_ai_planned_content", dependencies: ["website.ai.pages"] },
    { id: "website.styles.ai", capabilityKey: "website.generate_styles", dependencies: ["website.ai.content"] },
    { id: "website.metadata.ai", capabilityKey: "website.generate_metadata", dependencies: ["website.styles.ai"] },
    { id: "website.sitemap.ai", capabilityKey: "website.generate_sitemap", dependencies: ["website.metadata.ai"] },
    { id: "website.robots.ai", capabilityKey: "website.generate_robots", dependencies: ["website.sitemap.ai"] },
    { id: "website.validate.structure.ai", capabilityKey: "website.validate_structure", dependencies: ["website.robots.ai"] },
    { id: "website.validate.a11y.ai", capabilityKey: "website.validate_accessibility", dependencies: ["website.validate.structure.ai"] },
    { id: "website.validate.seo.ai", capabilityKey: "website.validate_seo", dependencies: ["website.validate.a11y.ai"] },
    { id: "website.validate.security.ai", capabilityKey: "website.validate_security", dependencies: ["website.validate.seo.ai"] },
    { id: "website.package.ai", capabilityKey: "website.package_internal_source", dependencies: ["website.validate.security.ai"] },
    { id: "website.qa.ai", capabilityKey: "qa.verify_ai_generated_website", dependencies: ["website.package.ai"] },
  ];
}

export function buildWebsiteTaskGraph(
  buildId: string,
  organizationId: string,
  missionId: string,
  options?: { aiGenerationEnabled?: boolean },
): BuildTaskNode[] {
  const aiGenerationEnabled = options?.aiGenerationEnabled ?? false;
  const pipeline = mergeWebsitePipeline(aiGenerationEnabled);
  const snapshotDef = aiGenerationEnabled
    ? { id: "workspace.snapshot.ai", capabilityKey: "build.snapshot_workspace", dependencies: ["website.qa.ai"] }
    : { id: "workspace.snapshot", capabilityKey: "build.snapshot_workspace", dependencies: ["website.qa"] };

  const head = BASE_DEFS.filter((d) => d.id !== "workspace.snapshot" && d.id !== "workspace.snapshot.ai");
  const defs = [...head, ...pipeline, snapshotDef];

  return defs.map((def) => ({
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
      def.capabilityKey === "qa.verify_internal_website" ||
      def.capabilityKey === "qa.verify_ai_generated_website"
        ? "independent_qa"
        : "not_required",
    timeoutSeconds: 120,
    maxAttempts: 3,
    sideEffectClass:
      def.capabilityKey.startsWith("website.validate") ||
      def.capabilityKey.startsWith("ai_website.") ||
      def.capabilityKey.startsWith("qa.verify")
        ? "internal_read"
        : "internal_write",
    status: "pending",
    idempotencyKey: `build-task:${buildId}:${def.id}`,
  }));
}

export function websiteTaskGraphStepOrder(options?: { aiGenerationEnabled?: boolean }): string[] {
  return buildWebsiteTaskGraph("x", "o", "m", options).map((t) => t.capabilityKey);
}

export function websiteTaskGraphStepCount(options?: { aiGenerationEnabled?: boolean }): number {
  return websiteTaskGraphStepOrder(options).length;
}
