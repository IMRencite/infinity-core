import type { BuildProjectType } from "./constants";
import type { BuildTaskNode } from "./types";
import { PROHIBITED_BUILD_ACTIONS } from "./constants";
import { BUILD_V1_SUPPORTED_PROJECT_TYPES } from "./constants";

export type BuilderSideEffectClass = "internal_read" | "internal_write" | "none";

export type BuilderPluginDescriptor = {
  builderKey: string;
  builderVersion: string;
  name: string;
  description: string;
  supportedProjectTypes: string[];
  supportedSpecificationVersions: string[];
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  prohibitedCapabilities: string[];
  sideEffectClass: BuilderSideEffectClass;
  lifecycleSupport: (
    | "initialize"
    | "validate"
    | "generate"
    | "repair"
    | "test"
    | "complete"
    | "rollback"
  )[];
  maximumRuntimeMs: number;
  maximumAttempts: number;
  maximumEstimatedCost: number;
  concurrencyLimit: number;
  repairPolicy: { maxAttempts: number; cannotWidenPermissions: true };
  rollbackSupport: boolean;
  reviewRequirements: string[];
  status: "active" | "inactive" | "deprecated";
};

export type BuilderLifecycleHook =
  | "initialize"
  | "validate"
  | "generate"
  | "repair"
  | "test"
  | "complete"
  | "rollback";

export type BuilderTaskContext = {
  buildId: string;
  buildJobId: string;
  organizationId: string;
  missionId: string;
  projectType: BuildProjectType;
  aiGenerationEnabled: boolean;
};

/** Plugin describes tasks only — execution is Scheduler → Worker Runtime. */
export type BuilderPlugin = {
  descriptor: BuilderPluginDescriptor;
  describeLifecycleTasks(context: BuilderTaskContext): BuildTaskNode[];
};

export const BUILDER_PROHIBITED_CAPABILITIES = [
  "shell.execute",
  "network.access",
  "package.install",
  "deployment.execute",
  "domain.purchase",
  "repository.create",
  "external_account.create",
  "financial.execute",
  ...PROHIBITED_BUILD_ACTIONS.map((a) => a.replace(/_/g, ".")),
] as const;

export function projectTypeSupportedByV2(projectType: BuildProjectType): boolean {
  return BUILD_V1_SUPPORTED_PROJECT_TYPES.includes(projectType);
}
