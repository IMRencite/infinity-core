export const BUILD_FACTORY_ENGINE_NAME = "build_factory";

export const BUILD_SPECIFICATION_SCHEMA_VERSION = "build_specification_v1";
export const BUILD_MANIFEST_SCHEMA_VERSION = "build_manifest_v1";

export const BUILD_STATUSES = [
  "requested",
  "specified",
  "manifest_ready",
  "workspace_ready",
  "scaffolding",
  "validating",
  "review_pending",
  "internally_complete",
  "blocked",
  "failed",
  "cancelled",
] as const;

export type BuildStatus = (typeof BUILD_STATUSES)[number];

export const BUILD_PROJECT_TYPES = [
  "static_website",
  "nextjs_website",
  "content_site",
  "lead_generation_site",
  "affiliate_site",
  "saas_application",
  "internal_tool",
  "digital_product",
  "media_brand",
  "marketplace",
] as const;

export type BuildProjectType = (typeof BUILD_PROJECT_TYPES)[number];

export const BUILD_V1_SUPPORTED_PROJECT_TYPES: BuildProjectType[] = [
  "static_website",
  "nextjs_website",
  "content_site",
  "lead_generation_site",
  "affiliate_site",
];

export const BUILD_TEMPLATE_KEYS = [
  "static-site-basic",
  "nextjs-site-basic",
  "content-site-basic",
  "lead-site-basic",
  "affiliate-site-basic",
] as const;

export type BuildTemplateKey = (typeof BUILD_TEMPLATE_KEYS)[number];

export const BUILD_TEMPLATE_VERSION = "1";

export const BUILD_TASK_CAPABILITY_KEYS = [
  "build.workspace_initialize",
  "build.persist_specification",
  "build.persist_manifest",
  "build.generate_template_scaffold",
  "build.validate_manifest",
  "build.snapshot_workspace",
  "qa.verify_internal_build",
] as const;

export type BuildTaskCapabilityKey = (typeof BUILD_TASK_CAPABILITY_KEYS)[number];

export const BUILD_INTERNAL_LABEL =
  "Internal build only — not deployed or published.";

export const BUILD_PACKAGE_LABEL =
  "Internal build package — not deployed or published.";

export const DEFAULT_MAX_FILES = 200;
export const DEFAULT_MAX_FILE_BYTES = 512_000;
export const DEFAULT_MAX_WORKSPACE_BYTES = 5_000_000;

export const PROHIBITED_WORKSPACE_SEGMENTS = [
  ".env",
  ".env.local",
  ".git",
  "node_modules",
  ".ssh",
  "id_rsa",
  "credentials",
] as const;

export const PROHIBITED_BUILD_ACTIONS = [
  "deploy",
  "publish",
  "purchase",
  "register_domain",
  "create_repository",
  "create_external_account",
  "npm_install",
  "shell_execute",
  "network_request",
] as const;

export const VENTURE_TYPE_TO_BUILD_PROJECT: Record<string, BuildProjectType> = {
  content_website: "content_site",
  affiliate_site: "affiliate_site",
  saas: "saas_application",
  digital_product: "digital_product",
  media_brand: "media_brand",
  marketplace: "marketplace",
  lead_generation_website: "lead_generation_site",
  local_service_business: "internal_tool",
  ecommerce: "saas_application",
  agency: "internal_tool",
};

export const BUILD_E2E_LABEL = "build_factory_e2e_dev_v1";
