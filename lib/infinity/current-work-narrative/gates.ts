import {
  HQ_CURRENT_WORK_CANONICAL_SOURCE_GATE,
  HQ_CURRENT_WORK_FRESHNESS_GATE,
  HQ_CURRENT_WORK_SPECIFICITY_GATE,
  HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE,
  HQ_GENERIC_WORK_DESCRIPTION_GATE,
  HQ_ROOM_CONTRIBUTION_SPECIFICITY_GATE,
} from "./contract";
import { isGenericWorkerOnlyNow, isSpecificCurrentWork } from "./generic";
import { narrativeIsCanonical } from "./project";
import type { CurrentWorkNarrative, NamedWorkGate } from "./types";

function pass(gate: string, reason: string): NamedWorkGate {
  return { gate, result: "PASS", reasons: [reason] };
}
function fail(gate: string, reasons: string[]): NamedWorkGate {
  return { gate, result: "FAIL", reasons };
}

export function evaluateHQCurrentWorkSpecificityGate(narrative: CurrentWorkNarrative): NamedWorkGate {
  if (!isSpecificCurrentWork(narrative.displayText)) {
    return fail(HQ_CURRENT_WORK_SPECIFICITY_GATE, ["GENERIC_OR_THIN_NOW"]);
  }
  if (isGenericWorkerOnlyNow(narrative.displayText)) {
    return fail(HQ_CURRENT_WORK_SPECIFICITY_GATE, ["WORKER_LABEL_PRIMARY"]);
  }
  if (!narrative.action || !narrative.object || !narrative.purpose) {
    return fail(HQ_CURRENT_WORK_SPECIFICITY_GATE, ["MISSING_ACTION_OBJECT_PURPOSE"]);
  }
  return pass(HQ_CURRENT_WORK_SPECIFICITY_GATE, "SPECIFIC_ACTION_OBJECT_PURPOSE");
}

export function evaluateHQGenericWorkDescriptionGate(narrative: CurrentWorkNarrative): NamedWorkGate {
  if (isGenericWorkerOnlyNow(narrative.displayText)) {
    return fail(HQ_GENERIC_WORK_DESCRIPTION_GATE, ["GENERIC_PRIMARY_NOW"]);
  }
  if (narrative.workerLabel && narrative.displayText.trim() === narrative.workerLabel.trim()) {
    return fail(HQ_GENERIC_WORK_DESCRIPTION_GATE, ["WORKER_IDENTITY_IS_PRIMARY"]);
  }
  return pass(HQ_GENERIC_WORK_DESCRIPTION_GATE, "WORKER_METADATA_SECONDARY");
}

export function evaluateHQCurrentWorkCanonicalSourceGate(narrative: CurrentWorkNarrative): NamedWorkGate {
  return narrativeIsCanonical(narrative)
    ? pass(HQ_CURRENT_WORK_CANONICAL_SOURCE_GATE, "CANONICAL_SOURCE")
    : fail(HQ_CURRENT_WORK_CANONICAL_SOURCE_GATE, ["MISSING_CANONICAL_SOURCE"]);
}

export function evaluateHQCurrentWorkFreshnessGate(input: {
  narrative: CurrentWorkNarrative;
  completedWorkStillShown?: boolean;
  historicalRelit?: boolean;
}): NamedWorkGate {
  if (input.completedWorkStillShown) return fail(HQ_CURRENT_WORK_FRESHNESS_GATE, ["COMPLETED_WORK_STILL_NOW"]);
  if (input.historicalRelit) return fail(HQ_CURRENT_WORK_FRESHNESS_GATE, ["HISTORICAL_RELIT"]);
  if (!input.narrative.lastVerifiedAt) return fail(HQ_CURRENT_WORK_FRESHNESS_GATE, ["UNVERIFIED"]);
  return pass(HQ_CURRENT_WORK_FRESHNESS_GATE, "FRESH_CANONICAL_NOW");
}

export function evaluateHQCurrentWorkStateConsistencyGate(input: {
  narrative: CurrentWorkNarrative;
  canonicalState: string;
  orbState: string;
  agentState: string;
}): NamedWorkGate {
  if (input.narrative.state !== input.canonicalState) {
    return fail(HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE, ["NARRATIVE_STATE_MISMATCH"]);
  }
  if (input.canonicalState !== input.orbState) {
    return fail(HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE, ["ORB_STATE_MISMATCH"]);
  }
  if (input.canonicalState === "ACTIVE" && input.agentState !== "ACTIVE") {
    return fail(HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE, ["ACTIVE_WITHOUT_AGENT"]);
  }
  if (input.canonicalState !== "ACTIVE" && input.agentState === "ACTIVE") {
    return fail(HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE, ["FAKE_ACTIVE_AGENT"]);
  }
  return pass(HQ_CURRENT_WORK_STATE_CONSISTENCY_GATE, "ONE_CANONICAL_STATE");
}

export function evaluateHQRoomContributionSpecificityGate(rooms: CurrentWorkNarrative[]): NamedWorkGate {
  const texts = rooms.map((room) => room.displayText.trim());
  if (texts.some((text) => !isSpecificCurrentWork(text))) {
    return fail(HQ_ROOM_CONTRIBUTION_SPECIFICITY_GATE, ["GENERIC_ROOM_CONTRIBUTION"]);
  }
  const unique = new Set(texts);
  if (unique.size < rooms.length) {
    return fail(HQ_ROOM_CONTRIBUTION_SPECIFICITY_GATE, ["IDENTICAL_ROOM_CONTRIBUTIONS"]);
  }
  return pass(HQ_ROOM_CONTRIBUTION_SPECIFICITY_GATE, "ROOMS_DIFFER_MEANINGFULLY");
}
