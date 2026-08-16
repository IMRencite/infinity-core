export const PRODUCTION_ARTIFACT_SCHEMA_VERSION = "production_artifact_v1";

export const PRODUCTION_ARTIFACT_EXCLUDED_PATH_PREFIXES = [
  ".env",
  ".env.",
  ".git/",
  "node_modules/",
  ".next/",
  "dist/",
  "build/",
  ".infinity/",
  "coverage/",
  ".turbo/",
  ".vercel/",
] as const;

export const PRODUCTION_ARTIFACT_EXCLUDED_EXACT = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
] as const;

export const LAUNCH_STAGES = [
  "assembly_requested",
  "assembling",
  "needs_review",
  "internally_ready",
  "launch_approved",
  "launching",
  "repository_created",
  "artifact_pushed",
  "hosting_project_created",
  "deployment_building",
  "deployment_ready",
  "live_verification",
  "externally_live",
  "launch_failed",
  "deployment_timed_out",
] as const;

export type LaunchStage = (typeof LAUNCH_STAGES)[number];

export const PROVIDER_DEPLOYMENT_STATES = [
  "requested",
  "submitted",
  "building",
  "ready",
  "failed",
  "cancelled",
  "timed_out",
] as const;

export type ProviderDeploymentState = (typeof PROVIDER_DEPLOYMENT_STATES)[number];

/**
 * V1 canonical Next.js deploy: Git-integrated after repository.push (commit SHA ↔ artifact hash).
 * Vercel builds from the linked GitHub repo; avoids fragile full-tree files API uploads.
 */
export const VERCEL_V1_DEPLOYMENT_MODE = "git_integrated" as const;
