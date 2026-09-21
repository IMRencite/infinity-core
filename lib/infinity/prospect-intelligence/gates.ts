import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALWAYS_ON_SALES_CONTINUITY_GATE,
  AUTHORIZED_CONSUMERS,
  PROSPECT_DATA_LINEAGE_GATE,
  PROSPECT_INTELLIGENCE_PUBLIC_PRIVACY_GATE,
  PROSPECT_INTELLIGENCE_ROOM_PARITY_GATE,
  PROSPECT_INVENTORY_HEALTH_GATE,
  SHARED_PROSPECT_INTELLIGENCE_ACCESS_GATE,
} from "./contract";
import type { NamedProspectGate, VentureInventory } from "./types";
import type { ProspectIntelligenceService } from "./service";

function pass(gate: string, reason: string): NamedProspectGate {
  return { gate, result: "PASS", reasons: [reason] };
}

function fail(gate: string, reasons: string[]): NamedProspectGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateSharedProspectIntelligenceAccessGate(input: {
  service: ProspectIntelligenceService;
  consumer: string;
  entityHasVentureId?: boolean;
  siloCreated?: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (typeof input.service.searchProspects !== "function") reasons.push("CANONICAL_SERVICE_MISSING");
  if (!AUTHORIZED_CONSUMERS.includes(input.consumer as (typeof AUTHORIZED_CONSUMERS)[number])) {
    reasons.push("UNAUTHORIZED_CONSUMER");
  }
  if (input.entityHasVentureId) reasons.push("VENTURE_OWNED_CANONICAL_ENTITY");
  if (input.siloCreated) reasons.push("VENTURE_SILO_CREATED");
  return reasons.length ? fail(SHARED_PROSPECT_INTELLIGENCE_ACCESS_GATE, reasons) : pass(SHARED_PROSPECT_INTELLIGENCE_ACCESS_GATE, "SHARED_SERVICE");
}

export function evaluateProspectDataLineageGate(input: {
  observationsPreserved: boolean;
  derivedHasEvidence: boolean;
  inferenceStoredAsFact?: boolean;
  sourceLost?: boolean;
  freshnessMissing?: boolean;
  mergeUnexplained?: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (!input.observationsPreserved) reasons.push("RAW_OBSERVATION_OVERWRITTEN");
  if (!input.derivedHasEvidence) reasons.push("DERIVED_WITHOUT_EVIDENCE");
  if (input.inferenceStoredAsFact) reasons.push("INFERENCE_STORED_AS_FACT");
  if (input.sourceLost) reasons.push("SOURCE_PROVENANCE_LOST");
  if (input.freshnessMissing) reasons.push("FRESHNESS_MISSING");
  if (input.mergeUnexplained) reasons.push("MERGE_UNEXPLAINED");
  return reasons.length ? fail(PROSPECT_DATA_LINEAGE_GATE, reasons) : pass(PROSPECT_DATA_LINEAGE_GATE, "LINEAGE_INTACT");
}

export function evaluateProspectInventoryHealthGate(inventory: VentureInventory): NamedProspectGate {
  const reasons: string[] = [];
  if (inventory.target_ready_inventory <= 0) reasons.push("TARGET_MISSING");
  if (inventory.minimum_ready_inventory <= 0) reasons.push("MINIMUM_MISSING");
  if (inventory.current_ready_inventory < 0) reasons.push("CURRENT_INVALID");
  if (inventory.average_daily_consumption < 0) reasons.push("CONSUMPTION_INVALID");
  if (inventory.coverage_days < 0) reasons.push("COVERAGE_INVALID");
  if (inventory.current_ready_inventory < inventory.minimum_ready_inventory) reasons.push("INVENTORY_BELOW_MINIMUM");
  return reasons.length ? fail(PROSPECT_INVENTORY_HEALTH_GATE, reasons) : pass(PROSPECT_INVENTORY_HEALTH_GATE, "INVENTORY_HEALTHY");
}

export function evaluateAlwaysOnSalesContinuityGate(input: {
  activeVenture: boolean;
  eligibleInventory: boolean;
  outboundCapacity: boolean;
  workProduced: boolean;
  campaignRequiredToStart?: boolean;
  suppressedContacted?: boolean;
  duplicateSend?: boolean;
  outcomeRecorded?: boolean;
  followUpScheduled?: boolean;
  replenishTriggeredOnExhaustion?: boolean;
}): NamedProspectGate {
  const reasons: string[] = [];
  if (input.activeVenture && input.eligibleInventory && input.outboundCapacity && !input.workProduced) {
    reasons.push("SALES_STOPPED_WITHOUT_CAPACITY_REASON");
  }
  if (input.campaignRequiredToStart) reasons.push("MANUAL_CAMPAIGN_REQUIRED");
  if (input.suppressedContacted) reasons.push("SUPPRESSED_CONTACTED");
  if (input.duplicateSend) reasons.push("DUPLICATE_SEND");
  if (input.workProduced && input.outcomeRecorded === false) reasons.push("OUTCOME_NOT_RECORDED");
  if (input.workProduced && input.followUpScheduled === false) reasons.push("FOLLOW_UP_MISSING");
  if (input.replenishTriggeredOnExhaustion === false) reasons.push("NO_REPLENISH_ON_EXHAUSTION");
  return reasons.length ? fail(ALWAYS_ON_SALES_CONTINUITY_GATE, reasons) : pass(ALWAYS_ON_SALES_CONTINUITY_GATE, "SALES_CONTINUOUS");
}

export function evaluateProspectIntelligenceRoomParityGate(cwd = process.cwd()): NamedProspectGate {
  const naming = readFileSync(join(cwd, "lib/infinity/operator-console/room-naming.ts"), "utf8");
  const registry = readFileSync(join(cwd, "lib/infinity/hq-first-class-room/registry.ts"), "utf8");
  const publicTypes = readFileSync(join(cwd, "lib/infinity/public-operations-projection/types.ts"), "utf8");
  const floor = readFileSync(join(cwd, "components/public/operations-room/operations-floor.tsx"), "utf8");
  const reasons: string[] = [];
  if (!naming.includes("prospect_intelligence")) reasons.push("HQ_ROOM_UNREGISTERED");
  if (!registry.includes("prospect_intelligence")) reasons.push("HQ_REGISTRY_MISSING");
  if (!publicTypes.includes("PROSPECT_INTELLIGENCE")) reasons.push("PUBLIC_DEPARTMENT_MISSING");
  if (!floor.includes("PROSPECT_INTELLIGENCE")) reasons.push("PUBLIC_FLOOR_MISSING");
  if (!naming.includes("InfinityRoomShell") && !readFileSync(join(cwd, "components/dashboard/operator-console/department-room.tsx"), "utf8").includes("InfinityRoomShell")) {
    reasons.push("SHARED_SHELL_MISSING");
  }
  return reasons.length ? fail(PROSPECT_INTELLIGENCE_ROOM_PARITY_GATE, reasons) : pass(PROSPECT_INTELLIGENCE_ROOM_PARITY_GATE, "ROOM_PARITY");
}

export function evaluateProspectIntelligencePublicPrivacyGate(serialized: string): NamedProspectGate {
  const reasons: string[] = [];
  const forbidden = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\+1[\s-]?\(?\d{3}\)?/,
    /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/,
    /suppressed/i,
    /do_not_contact/i,
    /fit_score/i,
    /private note/i,
    /AskReview/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(serialized)) reasons.push(`PUBLIC_LEAK:${pattern}`);
  }
  if (/Jane Doe|John Smith|prospect_entity/i.test(serialized)) reasons.push("PUBLIC_PROSPECT_IDENTITY");
  return reasons.length ? fail(PROSPECT_INTELLIGENCE_PUBLIC_PRIVACY_GATE, reasons) : pass(PROSPECT_INTELLIGENCE_PUBLIC_PRIVACY_GATE, "PUBLIC_SANITIZED");
}
