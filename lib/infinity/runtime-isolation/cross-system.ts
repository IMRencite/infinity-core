import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";

export const COMMUNICATION_LEASE_NAMESPACE = "communication-runtime-scheduler-v1" as const;
export const COMMUNICATION_HEALTH_SCOPE = "communication-runtime-scheduler-v1" as const;
export const COMMUNICATION_OBLIGATION_SCOPE = "communication-obligations-v1" as const;

export const ORGANIC_LEASE_NAMESPACE = "organic-growth-scheduler-v1" as const;
export const ORGANIC_HEALTH_SCOPE = "organic-growth-scheduler-v1" as const;
export const ORGANIC_OBLIGATION_SCOPE = "organic-work-obligations-v1" as const;
export const ORGANIC_CONTINUOUS_SCOPE = "organic-growth-continuous-v2" as const;

export const MAX_NEW_ORGANIC_ASSETS_PER_DAY = 2 as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function evaluateCrossSystemRuntimeIsolationGate(input: {
  communication_lease_scope: string;
  organic_lease_scope: string;
  communication_health_scope: string;
  organic_health_scope: string;
  communication_worker_can_claim_organic: boolean;
  organic_worker_can_claim_communication: boolean;
  shared_mutable_lifecycle: boolean;
  organic_deploy_resets_communication: boolean;
  organic_can_starve_communication: boolean;
  communication_failure_stops_organic: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.communication_lease_scope === input.organic_lease_scope) reasons.push("SHARED_LEASE_NAMESPACE");
  if (input.communication_health_scope === input.organic_health_scope) reasons.push("SHARED_HEALTH_SCOPE");
  if (input.communication_worker_can_claim_organic) reasons.push("COMMUNICATION_CAN_CLAIM_ORGANIC");
  if (input.organic_worker_can_claim_communication) reasons.push("ORGANIC_CAN_CLAIM_COMMUNICATION");
  if (input.shared_mutable_lifecycle) reasons.push("SHARED_MUTABLE_LIFECYCLE");
  if (input.organic_deploy_resets_communication) reasons.push("ORGANIC_RESETS_COMMUNICATION");
  if (input.organic_can_starve_communication) reasons.push("ORGANIC_STARVES_COMMUNICATION");
  if (input.communication_failure_stops_organic) reasons.push("COMMUNICATION_STOPS_ORGANIC");
  return named("CrossSystemRuntimeIsolationGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["RUNTIME_ISOLATED"]);
}

export function organicWorkerMayClaim(scope: string): boolean {
  return scope === ORGANIC_LEASE_NAMESPACE || scope === ORGANIC_OBLIGATION_SCOPE;
}

export function communicationWorkerMayClaim(scope: string): boolean {
  return scope === COMMUNICATION_LEASE_NAMESPACE || scope === COMMUNICATION_OBLIGATION_SCOPE;
}
