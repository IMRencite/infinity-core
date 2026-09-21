import { SOURCE_BUNDLE_CAPABILITY } from "./source-bundle-capability";

export const VERCEL_ADAPTER_SUPPORTED_ACTIONS = [
  "hosting.create_project",
  "hosting.deploy",
  "hosting.verify_deployment",
  SOURCE_BUNDLE_CAPABILITY,
  "hosting.deployment_protection.configure",
] as const;
