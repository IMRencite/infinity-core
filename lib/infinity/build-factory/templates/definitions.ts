import type { BuildProjectType, BuildTemplateKey } from "../constants";
import { BUILD_TEMPLATE_VERSION } from "../constants";

export type BuildProjectTemplate = {
  key: BuildTemplateKey;
  version: string;
  supportedProjectType: BuildProjectType;
  requiredFiles: string[];
  optionalFiles: string[];
  directories: string[];
  allowedDependencies: string[];
  requiredValidation: string[];
  supportedCapabilities: string[];
  reviewRequirements: string[];
  files: Record<string, string>;
};

export const BUILD_PROJECT_TEMPLATES: Record<BuildTemplateKey, BuildProjectTemplate> = {
  "static-site-basic": {
    key: "static-site-basic",
    version: BUILD_TEMPLATE_VERSION,
    supportedProjectType: "static_website",
    requiredFiles: ["index.html", "site-structure.json", "sitemap.xml", "robots.txt"],
    optionalFiles: [],
    directories: ["src", "components"],
    allowedDependencies: [],
    requiredValidation: ["website.validate_structure"],
    supportedCapabilities: [
      "build.workspace_initialize",
      "website.generate_structure",
      "qa.verify_internal_website",
    ],
    reviewRequirements: ["qa.verify_internal_website"],
    files: {},
  },
  "nextjs-site-basic": {
    key: "nextjs-site-basic",
    version: BUILD_TEMPLATE_VERSION,
    supportedProjectType: "nextjs_website",
    requiredFiles: ["app/layout.tsx", "app/page.tsx", "site-structure.json"],
    optionalFiles: [],
    directories: ["app", "components"],
    allowedDependencies: [],
    requiredValidation: ["website.validate_structure"],
    supportedCapabilities: [
      "build.workspace_initialize",
      "website.generate_pages",
      "qa.verify_internal_website",
    ],
    reviewRequirements: ["qa.verify_internal_website"],
    files: {},
  },
  "content-site-basic": {
    key: "content-site-basic",
    version: BUILD_TEMPLATE_VERSION,
    supportedProjectType: "content_site",
    requiredFiles: ["site-structure.json", "metadata-manifest.json", "sitemap.xml", "robots.txt"],
    optionalFiles: [],
    directories: ["src", "components", "content"],
    allowedDependencies: [],
    requiredValidation: ["website.validate_structure"],
    supportedCapabilities: [
      "build.workspace_initialize",
      "website.generate_structure",
      "website.package_internal_source",
      "qa.verify_internal_website",
    ],
    reviewRequirements: ["qa.verify_internal_website"],
    files: {},
  },
  "lead-site-basic": {
    key: "lead-site-basic",
    version: BUILD_TEMPLATE_VERSION,
    supportedProjectType: "lead_generation_site",
    requiredFiles: ["site-structure.json", "metadata-manifest.json", "internal-website-package.json"],
    optionalFiles: [],
    directories: ["src", "components"],
    allowedDependencies: [],
    requiredValidation: ["website.validate_structure"],
    supportedCapabilities: [
      "build.workspace_initialize",
      "website.generate_pages",
      "qa.verify_internal_website",
    ],
    reviewRequirements: ["qa.verify_internal_website"],
    files: {},
  },
  "affiliate-site-basic": {
    key: "affiliate-site-basic",
    version: BUILD_TEMPLATE_VERSION,
    supportedProjectType: "affiliate_site",
    requiredFiles: ["site-structure.json", "metadata-manifest.json", "internal-website-package.json"],
    optionalFiles: [],
    directories: ["src", "components"],
    allowedDependencies: [],
    requiredValidation: ["website.validate_structure"],
    supportedCapabilities: [
      "build.workspace_initialize",
      "website.generate_pages",
      "qa.verify_internal_website",
    ],
    reviewRequirements: ["qa.verify_internal_website"],
    files: {},
  },
};
