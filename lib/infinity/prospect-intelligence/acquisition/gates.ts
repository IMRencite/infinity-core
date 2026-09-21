import {
  PROSPECT_ACQUISITION_CONTINUITY_GATE,
  PROSPECT_ACQUISITION_DEDUPE_GATE,
  PROSPECT_ACQUISITION_LINEAGE_GATE,
  PROSPECT_SOURCE_HEALTH_GATE,
  PROSPECT_SOURCE_POLICY_GATE,
} from "../contract";
import type { NamedProspectGate } from "../types";
import { policyAllowsAcquisition, policyAllowsContactUse, policyIsUnknown } from "./policy";
import type { SourcePolicy } from "./types";

function pass(gate: string, reason: string): NamedProspectGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedProspectGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateProspectSourcePolicyGate(input: {
  sourceRegistered: boolean;
  sourceEnabled: boolean;
  policy: SourcePolicy | null;
  connectorHonorsScope: boolean;
  connectorHonorsRateLimit: boolean;
  unknownPolicyPublishedToSales?: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (!input.sourceRegistered) reasons.push("SOURCE_NOT_REGISTERED");
  if (!input.sourceEnabled) reasons.push("SOURCE_DISABLED");
  if (!input.policy || policyIsUnknown(input.policy) && !policyAllowsAcquisition(input.policy)) {
    reasons.push("UNKNOWN_OR_RESTRICTED_POLICY");
  }
  if (input.policy && !policyAllowsAcquisition(input.policy)) reasons.push("ACQUISITION_NOT_ALLOWED");
  if (!input.connectorHonorsScope) reasons.push("SCOPE_NOT_HONORED");
  if (!input.connectorHonorsRateLimit) reasons.push("RATE_LIMIT_BYPASSED");
  if (input.unknownPolicyPublishedToSales) reasons.push("UNKNOWN_POLICY_REACHED_SALES");
  if (input.policy && !policyAllowsContactUse(input.policy) && input.unknownPolicyPublishedToSales) {
    reasons.push("CONTACT_POLICY_VIOLATION");
  }
  return reasons.length ? fail(PROSPECT_SOURCE_POLICY_GATE, reasons) : pass(PROSPECT_SOURCE_POLICY_GATE, "POLICY_ENFORCED");
}

export function evaluateProspectAcquisitionContinuityGate(input: {
  cycles: number;
  discoveryContinued: boolean;
  healthyInventoryStoppedDiscovery?: boolean;
  lowInventoryIncreasedPriority: boolean;
  failedSourceHaltedAll?: boolean;
  resumedAfterRestart: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (input.cycles < 2) reasons.push("NOT_MULTI_CYCLE");
  if (!input.discoveryContinued) reasons.push("DISCOVERY_STOPPED");
  if (input.healthyInventoryStoppedDiscovery) reasons.push("HEALTHY_INVENTORY_STOPPED_DISCOVERY");
  if (!input.lowInventoryIncreasedPriority) reasons.push("NO_REPLENISHMENT_PRIORITY");
  if (input.failedSourceHaltedAll) reasons.push("SINGLE_SOURCE_HALTED_SYSTEM");
  if (!input.resumedAfterRestart) reasons.push("RESTART_DID_NOT_RESUME");
  return reasons.length ? fail(PROSPECT_ACQUISITION_CONTINUITY_GATE, reasons) : pass(PROSPECT_ACQUISITION_CONTINUITY_GATE, "CONTINUOUS");
}

export function evaluateProspectAcquisitionLineageGate(input: {
  connectorResult: boolean;
  observationStored: boolean;
  normalized: boolean;
  resolved: boolean;
  canonicalEntity: boolean;
  connectorWroteCanonicalDirectly?: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (!input.connectorResult) reasons.push("NO_CONNECTOR_RESULT");
  if (!input.observationStored) reasons.push("OBSERVATION_MISSING");
  if (!input.normalized) reasons.push("NOT_NORMALIZED");
  if (!input.resolved) reasons.push("NOT_RESOLVED");
  if (!input.canonicalEntity) reasons.push("CANONICAL_MISSING");
  if (input.connectorWroteCanonicalDirectly) reasons.push("CONNECTOR_BYPASSED_LINEAGE");
  return reasons.length ? fail(PROSPECT_ACQUISITION_LINEAGE_GATE, reasons) : pass(PROSPECT_ACQUISITION_LINEAGE_GATE, "LINEAGE_INTACT");
}

export function evaluateProspectAcquisitionDedupeGate(input: {
  canonicalOrganizations: number;
  observations: number;
  sources: number;
  expectedOrganizations: number;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (input.canonicalOrganizations !== input.expectedOrganizations) reasons.push("UNCONTROLLED_DUPLICATES");
  if (input.observations < input.sources) reasons.push("SOURCE_RELATIONSHIPS_MISSING");
  return reasons.length ? fail(PROSPECT_ACQUISITION_DEDUPE_GATE, reasons) : pass(PROSPECT_ACQUISITION_DEDUPE_GATE, "DEDUPE_CONTROLLED");
}

export function evaluateProspectSourceHealthGate(input: {
  successReflected: boolean;
  failureReflected: boolean;
  rateLimitReflected: boolean;
  schemaChangeReflected?: boolean;
  recovered: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (!input.successReflected) reasons.push("SUCCESS_NOT_TRACKED");
  if (!input.failureReflected) reasons.push("FAILURE_NOT_TRACKED");
  if (!input.rateLimitReflected) reasons.push("RATE_LIMIT_NOT_TRACKED");
  if (input.schemaChangeReflected === false) reasons.push("SCHEMA_CHANGE_NOT_TRACKED");
  if (!input.recovered) reasons.push("RECOVERY_NOT_TRACKED");
  return reasons.length ? fail(PROSPECT_SOURCE_HEALTH_GATE, reasons) : pass(PROSPECT_SOURCE_HEALTH_GATE, "HEALTH_TRACKED");
}
