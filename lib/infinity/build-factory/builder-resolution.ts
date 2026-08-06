import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { BuildProjectType } from "./constants";
import { BUILD_SPECIFICATION_SCHEMA_VERSION } from "./constants";
import {
  getInMemoryBuilderPlugin,
  resolveBuilderKeyForProjectType,
} from "./builder-registry";
import type { BuilderPlugin } from "./builder-contract";

export type BuilderResolutionResult =
  | {
      status: "resolved";
      builderKey: string;
      builderVersion: string;
      plugin: BuilderPlugin;
      explanation: string;
    }
  | {
      status: "unsupported" | "blocked";
      builderKey: string | null;
      missingCapabilities: string[];
      policyBlockers: string[];
      explanation: string;
    };

export async function resolveBuilderForBuildRequest(
  admin: AdminSupabaseClient,
  input: {
    projectType: BuildProjectType;
    specificationVersion: string;
    approvedCapabilities: string[];
  },
): Promise<BuilderResolutionResult> {
  const builderKey = resolveBuilderKeyForProjectType(input.projectType);
  if (!builderKey) {
    return {
      status: "unsupported",
      builderKey: null,
      missingCapabilities: [],
      policyBlockers: [`project_type:${input.projectType}`],
      explanation: `No registered builder for project type ${input.projectType}.`,
    };
  }

  const { data: registryRow } = await admin
    .from("builder_registry_entries")
    .select("builder_key, builder_version, status, required_capabilities")
    .eq("builder_key", builderKey)
    .eq("builder_version", "1.0.0")
    .eq("status", "active")
    .maybeSingle();

  if (!registryRow) {
    return {
      status: "blocked",
      builderKey,
      missingCapabilities: [],
      policyBlockers: ["registry_inactive"],
      explanation: "Builder registry entry missing or inactive.",
    };
  }

  const plugin = getInMemoryBuilderPlugin(builderKey);
  if (!plugin) {
    return {
      status: "blocked",
      builderKey,
      missingCapabilities: [],
      policyBlockers: ["adapter_missing"],
      explanation: "In-memory builder adapter not loaded.",
    };
  }

  if (
    input.specificationVersion !== BUILD_SPECIFICATION_SCHEMA_VERSION &&
    !plugin.descriptor.supportedSpecificationVersions.includes(input.specificationVersion)
  ) {
    return {
      status: "unsupported",
      builderKey,
      missingCapabilities: [],
      policyBlockers: [`spec_version:${input.specificationVersion}`],
      explanation: "Unsupported build specification version.",
    };
  }

  const required = plugin.descriptor.requiredCapabilities;
  const missing = required.filter((cap) => !input.approvedCapabilities.includes(cap));
  if (missing.length > 0) {
    return {
      status: "blocked",
      builderKey,
      missingCapabilities: missing,
      policyBlockers: ["capability_gap"],
      explanation: `Missing approved capabilities: ${missing.join(", ")}`,
    };
  }

  return {
    status: "resolved",
    builderKey,
    builderVersion: String(registryRow.builder_version),
    plugin,
    explanation: `Resolved ${builderKey}@${registryRow.builder_version} for ${input.projectType}.`,
  };
}
