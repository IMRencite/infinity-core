import { getLastOrganicEffectiveExecutionState } from "./persist";
import type { EffectiveOrganicExecutionState } from "@/lib/infinity/organic-growth-engine/blog-os/durable/effective-execution-state";

export const ORGANIC_SCHEDULER_HOLD_FIELD_CLASS = "LEGACY_PROJECTION_NON_AUTHORITATIVE_DEPRECATED" as const;

export function projectOrganicAuthorizationFromEffective(
  effective: EffectiveOrganicExecutionState | null,
): {
  authorized: boolean;
  result: EffectiveOrganicExecutionState["result"] | "BLOCKED_AUTHORIZATION";
  execute_publish: boolean;
  publishing: "LIVE" | "BLOCKED";
  legacy_field: typeof ORGANIC_SCHEDULER_HOLD_FIELD_CLASS;
} {
  const authorized = effective?.result === "AUTHORIZED";
  return {
    authorized,
    result: effective?.result ?? "BLOCKED_AUTHORIZATION",
    execute_publish: authorized,
    publishing: authorized ? "LIVE" : "BLOCKED",
    legacy_field: ORGANIC_SCHEDULER_HOLD_FIELD_CLASS,
  };
}

export function projectOrganicAuthorizationForSurfaces() {
  return projectOrganicAuthorizationFromEffective(getLastOrganicEffectiveExecutionState());
}
