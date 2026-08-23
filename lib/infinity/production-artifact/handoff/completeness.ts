import type { VentureSystemsBuildCoveragePlan } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type { CompletenessAccounting, ProductionHandoffArtifact, RuntimeRequirement, EnvironmentRequirement } from "./types";

export type CompletenessItem = {
  id: string;
  disposition: "SATISFIED" | "EXTERNAL_DEPENDENCY" | "DEFERRED" | "BLOCKED_UNRESOLVED";
};

export function architectureCompletenessItems(plan: VentureSystemsBuildCoveragePlan | null | undefined): CompletenessItem[] {
  if (!plan) return [];
  return plan.rows
    .filter((row) => row.required)
    .map((row) => {
      if (row.disposition === "INTERNAL_BUILD") return { id: `system:${row.family}`, disposition: "SATISFIED" as const };
      if (row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY") {
        return { id: `system:${row.family}`, disposition: "EXTERNAL_DEPENDENCY" as const };
      }
      if (row.disposition === "DEFERRED") return { id: `system:${row.family}`, disposition: "DEFERRED" as const };
      return { id: `system:${row.family}`, disposition: "BLOCKED_UNRESOLVED" as const };
    });
}

export function artifactCompletenessItems(artifacts: ProductionHandoffArtifact[]): CompletenessItem[] {
  return artifacts
    .filter((item) => item.kind !== "PROVIDER_DEPENDENCY")
    .map((item) => {
      if (item.status === "PRESENT") return { id: `artifact:${item.artifactId}`, disposition: "SATISFIED" as const };
      if (item.status === "MISSING" || item.status === "BLOCKED") {
        return { id: `artifact:${item.artifactId}`, disposition: "BLOCKED_UNRESOLVED" as const };
      }
      return { id: `artifact:${item.artifactId}`, disposition: "DEFERRED" as const };
    });
}

export function requirementCompletenessItems(input: {
  runtime: RuntimeRequirement[];
  environment: EnvironmentRequirement[];
}): CompletenessItem[] {
  const items: CompletenessItem[] = [];
  for (const req of input.runtime.filter((item) => item.required)) {
    if (req.status === "DECLARED") items.push({ id: `runtime:${req.key}`, disposition: "SATISFIED" });
    else if (req.status === "DEFERRED") items.push({ id: `runtime:${req.key}`, disposition: "DEFERRED" });
    else if (req.status === "NOT_REQUIRED") continue;
    else items.push({ id: `runtime:${req.key}`, disposition: "BLOCKED_UNRESOLVED" });
  }
  for (const req of input.environment.filter((item) => item.required)) {
    if (req.status === "AVAILABLE" || req.status === "REQUIRES_EXTERNAL_AUTHORIZATION") {
      items.push({
        id: `env:${req.key}`,
        disposition: req.status === "AVAILABLE" ? "SATISFIED" : "EXTERNAL_DEPENDENCY",
      });
    } else if (req.status === "DEFERRED") items.push({ id: `env:${req.key}`, disposition: "DEFERRED" });
    else if (req.status === "NOT_REQUIRED") continue;
    else items.push({ id: `env:${req.key}`, disposition: "BLOCKED_UNRESOLVED" });
  }
  return items;
}

export function accountCompleteness(items: CompletenessItem[]): CompletenessAccounting {
  const required = items.length;
  const satisfied = items.filter((item) => item.disposition === "SATISFIED").length;
  const externalDependency = items.filter((item) => item.disposition === "EXTERNAL_DEPENDENCY").length;
  const deferred = items.filter((item) => item.disposition === "DEFERRED").length;
  const blockedUnresolved = items.filter((item) => item.disposition === "BLOCKED_UNRESOLVED").length;
  return {
    required,
    satisfied,
    externalDependency,
    deferred,
    blockedUnresolved,
    accounted: satisfied + externalDependency + deferred + blockedUnresolved,
  };
}
