import type { SalesMotion, SalesObjectionClass, SalesRoomId } from "./contract";
import type { SalesIntelligenceObservation, SalesIntelligenceProjection, SalesLearningDecision, SalesObjection } from "./types";

export function projectSalesIntelligence(input: {
  observations: SalesIntelligenceObservation[];
  objections: SalesObjection[];
  close_rate?: number | "UNKNOWN";
  pipeline_count: number;
}): SalesIntelligenceProjection {
  return {
    top_converting_icp: bestKey(input.observations, "ICP"),
    best_performing_motion: (bestKey(input.observations, "MESSAGE") === "UNKNOWN"
      ? bestMotion(input.observations)
      : bestMotion(input.observations)) as SalesMotion | "UNKNOWN",
    top_recurring_objection: topObjection(input.objections),
    highest_converting_channel: bestKey(input.observations, "CHANNEL"),
    close_rate: input.close_rate ?? "UNKNOWN",
    pipeline_health: input.pipeline_count > 0 ? "HAS_PIPELINE" : "EMPTY_NO_FAKE_ZERO_VALUE",
  };
}

export function learnFromSalesEvidence(observations: SalesIntelligenceObservation[]): SalesLearningDecision {
  const converting = observations.filter((row) => row.converts).sort((a, b) => b.weight - a.weight)[0];
  if (!converting) {
    return {
      decision_id: "sales-learning-none",
      changes_priority: false,
      reason: "No converting evidence yet",
    };
  }
  const room = roomForObservation(converting);
  return {
    decision_id: `sales-learning-${converting.observation_id}`,
    changes_priority: true,
    preferred_room: room,
    preferred_motion: converting.kind === "CHANNEL" ? "INBOUND_CONVERSION" : undefined,
    reason: `${converting.kind} ${converting.key} converts`,
  };
}

function bestKey(observations: SalesIntelligenceObservation[], kind: SalesIntelligenceObservation["kind"]): string {
  const hit = observations.filter((row) => row.kind === kind && row.converts).sort((a, b) => b.weight - a.weight)[0];
  return hit?.key ?? "UNKNOWN";
}

function bestMotion(observations: SalesIntelligenceObservation[]): SalesMotion | "UNKNOWN" {
  const hit = observations.filter((row) => row.kind === "MESSAGE" || row.kind === "CHANNEL").sort((a, b) => b.weight - a.weight)[0];
  if (!hit) return "UNKNOWN";
  if (hit.kind === "CHANNEL" && hit.converts) return "INBOUND_CONVERSION";
  return "OUTBOUND_PROSPECTING";
}

function topObjection(objections: SalesObjection[]): SalesObjectionClass | "UNKNOWN" {
  if (objections.length === 0) return "UNKNOWN";
  const counts = new Map<SalesObjectionClass, number>();
  for (const row of objections) counts.set(row.class, (counts.get(row.class) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

function roomForObservation(observation: SalesIntelligenceObservation): SalesRoomId {
  if (observation.kind === "RETENTION") return "EXPANSION_RETENTION";
  if (observation.kind === "OFFER") return "OFFER_CLOSING";
  if (observation.kind === "CHANNEL" && observation.converts) return "INBOUND_CONVERSION";
  return "OUTBOUND_ACQUISITION";
}

export function unknownMetricDisplay(value: number | "UNKNOWN"): string {
  return value === "UNKNOWN" ? "UNKNOWN" : String(value);
}
