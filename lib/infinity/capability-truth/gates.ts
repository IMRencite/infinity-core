import { isHarnessArchitectureLabel } from "@/lib/infinity/venture-systems-architecture/hq/identity-guards";
import { CAPABILITY_IDS, type CanonicalCapabilityProjection, type CapabilityRecord } from "./types";
import type { CanonicalSelectedVenture } from "./types";

function cap(projection: CanonicalCapabilityProjection, id: CapabilityRecord["capability_id"]) {
  return projection.capabilities.find((row) => row.capability_id === id);
}

export function evaluateCanonicalCapabilityProjectionGate(projection: CanonicalCapabilityProjection): {
  gate: "CanonicalCapabilityProjectionGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const id of CAPABILITY_IDS) {
    const row = cap(projection, id);
    if (!row) reasons.push(`MISSING:${id}`);
    else if (!row.verification_source || !row.scope) reasons.push(`INCOMPLETE:${id}`);
  }
  return { gate: "CanonicalCapabilityProjectionGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["ALL_CAPABILITIES_PROJECTED"] };
}

export function evaluateCapabilityTruthGate(projection: CanonicalCapabilityProjection): {
  gate: "CapabilityTruthGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of projection.capabilities) {
    if (row.value === "NOT_CONFIGURED" && row.configured === null) reasons.push(`UNKNOWN_SHOWN_NOT_CONFIGURED:${row.capability_id}`);
    if (row.value === "NOT_CONFIGURED" && row.available && row.verification_status === "VERIFIED") {
      reasons.push(`VERIFIED_AVAILABLE_MARKED_NOT_CONFIGURED:${row.capability_id}`);
    }
  }
  return { gate: "CapabilityTruthGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["VALUES_MATCH_EVIDENCE"] };
}

export function evaluateCapabilityScopeGate(projection: CanonicalCapabilityProjection): {
  gate: "CapabilityScopeGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of projection.capabilities) {
    if (!row.scope) reasons.push(`MISSING_SCOPE:${row.capability_id}`);
  }
  return { gate: "CapabilityScopeGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["SCOPES_PRESENT"] };
}

export function evaluateCapabilityFreshnessGate(projection: CanonicalCapabilityProjection, now = Date.now()): {
  gate: "CapabilityFreshnessGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of projection.capabilities) {
    if (!row.last_verified_at && row.freshness === "CURRENT") reasons.push(`CURRENT_WITHOUT_TIMESTAMP:${row.capability_id}`);
    if (row.freshness === "STALE" && row.value !== "STALE" && row.verification_status !== "STALE") {
      reasons.push(`STALE_NOT_RENDERED:${row.capability_id}`);
    }
    void now;
  }
  return { gate: "CapabilityFreshnessGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["FRESHNESS_CONSISTENT"] };
}

export function evaluateCapabilityContradictionGate(input: {
  projection: CanonicalCapabilityProjection;
  paymentActivation?: string | null;
  selectedVentureIsHarness?: boolean;
}): { gate: "CapabilityContradictionGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const payments = cap(input.projection, "PAYMENTS");
  if (payments?.value === "NOT_CONFIGURED" && (payments.available || input.paymentActivation === "YES")) {
    reasons.push("PAYMENTS_NOT_CONFIGURED_WHILE_ACTIVATED_OR_AVAILABLE");
  }
  const hosting = cap(input.projection, "HOSTING");
  if (hosting?.value === "NOT_CONFIGURED" && hosting.available) {
    reasons.push("HOSTING_NOT_CONFIGURED_WHILE_AVAILABLE");
  }
  const coding = cap(input.projection, "CODING");
  if (coding?.value === "NOT_CONFIGURED" && coding.available) {
    reasons.push("CODING_NOT_CONFIGURED_WHILE_AGENT_AVAILABLE");
  }
  if (input.selectedVentureIsHarness) reasons.push("HARNESS_USED_AS_SELECTED_VENTURE");
  return { gate: "CapabilityContradictionGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["NO_CONTRADICTIONS"] };
}

export function evaluateCrossSurfaceCanonicalConsistencyGate(input: {
  paymentsDisplay: string;
  hostingDisplay: string;
  codingCursorDisplay: string;
  revenueDisplay: string;
  selectedVenture: string;
  paymentActivation?: string | null;
  projection: CanonicalCapabilityProjection;
}): { gate: "CrossSurfaceCanonicalConsistencyGate"; result: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  const payments = cap(input.projection, "PAYMENTS");
  const hosting = cap(input.projection, "HOSTING");
  const coding = cap(input.projection, "CODING");
  if (/not.?configured/i.test(input.paymentsDisplay) && (payments?.value === "LIVE" || input.paymentActivation === "YES")) {
    reasons.push("PAYMENTS_DISPLAY_CONTRADICTS_LIVE");
  }
  if (/not.?configured/i.test(input.hostingDisplay) && hosting?.available) {
    reasons.push("HOSTING_DISPLAY_CONTRADICTS_LIVE");
  }
  if (/not.?configured/i.test(input.codingCursorDisplay) && coding?.available) {
    reasons.push("CURSOR_DISPLAY_CONTRADICTS_AGENT");
  }
  if (/unconfigured/i.test(input.revenueDisplay) && cap(input.projection, "PERFORMANCE_LEARNING")?.available) {
    reasons.push("REVENUE_UNCONFIGURED_WHILE_ECONOMICS_EXIST");
  }
  if (isHarnessArchitectureLabel(input.selectedVenture)) reasons.push("SELECTED_VENTURE_IS_HARNESS");
  return { gate: "CrossSurfaceCanonicalConsistencyGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["SURFACES_CONSISTENT"] };
}

export function evaluateInfrastructureStateNoHardcodingGate(source: string): {
  gate: "InfrastructureStateNoHardcodingGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (/provider:\s*"Vercel"\s*,\s*value:\s*"CONNECTED"/.test(source) && !source.includes("hostname")) {
    reasons.push("HARDCODED_VERCEL_CONNECTED");
  }
  return { gate: "InfrastructureStateNoHardcodingGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["NO_HARDCODED_PROVIDER_STATES"] };
}

export function evaluateMutationAuthoritySeparationGate(projection: CanonicalCapabilityProjection): {
  gate: "MutationAuthoritySeparationGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const row of projection.capabilities) {
    if ((row.mutation_authority === "LOCKED" || row.mutation_authority === "GOVERNED") && row.value === "NOT_CONFIGURED" && row.available) {
      reasons.push(`MUTATION_LOCK_USED_AS_ABSENCE:${row.capability_id}`);
    }
  }
  return { gate: "MutationAuthoritySeparationGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["MUTATION_SEPARATED"] };
}

export function evaluateCanonicalSelectedVentureGateFromLabel(selected: CanonicalSelectedVenture | { venture_name: string }): {
  gate: "CanonicalSelectedVentureGate";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (isHarnessArchitectureLabel(selected.venture_name)) reasons.push("HARNESS_LABEL_USED_AS_VENTURE");
  return { gate: "CanonicalSelectedVentureGate", result: reasons.length ? "FAIL" : "PASS", reasons: reasons.length ? reasons : ["CANONICAL_OR_NONE"] };
}
