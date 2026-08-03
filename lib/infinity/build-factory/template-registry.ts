import type { BuildProjectType, BuildTemplateKey } from "./constants";
import { BUILD_V1_SUPPORTED_PROJECT_TYPES } from "./constants";
import {
  BUILD_PROJECT_TEMPLATES,
  type BuildProjectTemplate,
} from "./templates/definitions";

export class BuildTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildTemplateError";
  }
}

export function projectTypeToTemplateKey(projectType: BuildProjectType): BuildTemplateKey | null {
  switch (projectType) {
    case "static_website":
      return "static-site-basic";
    case "nextjs_website":
      return "nextjs-site-basic";
    case "content_site":
      return "content-site-basic";
    case "lead_generation_site":
      return "lead-site-basic";
    case "affiliate_site":
      return "affiliate-site-basic";
    default:
      return null;
  }
}

export function getBuildTemplate(
  templateKey: string,
  templateVersion: string,
): BuildProjectTemplate {
  const template = BUILD_PROJECT_TEMPLATES[templateKey as BuildTemplateKey];
  if (!template) {
    throw new BuildTemplateError(`Template not registered: ${templateKey}`);
  }
  if (template.version !== templateVersion) {
    throw new BuildTemplateError(
      `Template version mismatch: expected ${template.version}, got ${templateVersion}`,
    );
  }
  return template;
}

export function assertProjectTypeSupportedForBuildV1(projectType: BuildProjectType): void {
  if (!BUILD_V1_SUPPORTED_PROJECT_TYPES.includes(projectType)) {
    throw new BuildTemplateError(`Project type ${projectType} is unsupported_for_build_v1`);
  }
}

export function listRegisteredTemplates(): BuildProjectTemplate[] {
  return Object.values(BUILD_PROJECT_TEMPLATES);
}
