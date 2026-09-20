import { ingestObservations } from "@/lib/infinity/performance-intelligence-engine/ingestion/observation-ingestor";
import { internalInfinityAdapter } from "@/lib/infinity/performance-intelligence-engine/sources/internal-infinity-adapter";
import type { PerformanceObservation } from "@/lib/infinity/performance-intelligence-engine/types";
import { scoreSalesConversationVoice, type SalesConversationVoiceScore } from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import { consultativeLearningDimensions, selectConsultativeQuestion, buildSalesContrast } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { inferSalesStage } from "@/lib/infinity/always-closing-sales/doctrine";
import type { ClosedLoopDurableState } from "./closed-loop-durable";
import type { ProductionOutboundState } from "./types";

export function outboundToPerformanceObservations(state: ProductionOutboundState): PerformanceObservation[] {
  return state.events
    .filter((event) => event.fabricated === false)
    .map((event) => ({
      observationId: event.id,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: event.outbox_id,
      idempotencyKey: `production-outbound:${event.id}`,
      observedAt: event.at,
      rawMetric: `outbound_${event.kind}`,
      rawValue: 1,
      rawUnit: "count",
      description: `Production outbound ${event.kind}`,
      dimensions: { engine: "production_outbound", kind: event.kind },
      provenance: { engine: "production_outbound_canary_v1" },
    }));
}

export function ingestOutboundPerformanceObservations(state: ProductionOutboundState) {
  return ingestObservations({
    observations: outboundToPerformanceObservations(state),
    adapter: internalInfinityAdapter,
  });
}

export function closedLoopToPerformanceObservations(state: ClosedLoopDurableState): PerformanceObservation[] {
  return state.events.map((event) => ({
    observationId: event.id,
    sourceId: "internal_infinity",
    ventureId: "occupancynpv",
    sourceReference: event.conversation_id,
    idempotencyKey: `closed-loop:${event.id}`,
    observedAt: event.at,
    rawMetric: event.family,
    rawValue: 1,
    rawUnit: "count",
    description: `OccupancyNPV closed-loop ${event.family}`,
    dimensions: {
      engine: "production_outbound_closed_loop",
      family: event.family,
      conversation_id: event.conversation_id,
      thread_id: event.thread_id,
      venture: event.venture,
    },
    provenance: { engine: "production_outbound_closed_loop_v1" },
  }));
}

export function ingestClosedLoopPerformanceObservations(state: ClosedLoopDurableState) {
  return ingestObservations({
    observations: closedLoopToPerformanceObservations(state),
    adapter: internalInfinityAdapter,
  });
}

export function salesVoiceToPerformanceObservations(input: {
  score: SalesConversationVoiceScore;
  conversation_id: string;
  at: string;
}): PerformanceObservation[] {
  return [
    {
      observationId: `voice:${input.conversation_id}:${input.at}`,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: input.conversation_id,
      idempotencyKey: `sales-voice:${input.conversation_id}:${input.at}`,
      observedAt: input.at,
      rawMetric: "sales_conversation_voice_total",
      rawValue: input.score.total,
      rawUnit: "score",
      description: "SalesConversationVoiceScore for composer improvement, not shown to the recipient",
      dimensions: {
        engine: "sales_conversation_voice",
        naturalness: String(input.score.naturalness),
        offer_usage: String(input.score.offer_usage),
        cta_strength: String(input.score.cta_strength),
        jargon_penalty: String(input.score.internal_jargon_penalty),
        robotic_penalty: String(input.score.robotic_phrase_penalty),
        optimize_for: "qualified_response_trial_demo_purchase",
      },
      provenance: { engine: "sales_conversation_voice_v1" },
    },
  ];
}

export function ingestSalesVoicePerformanceObservations(input: {
  inbound: string;
  generated: string;
  conversation_id: string;
  at: string;
}) {
  const score = scoreSalesConversationVoice({ inbound: input.inbound, generated: input.generated });
  const stage = inferSalesStage({ inbound: input.inbound, turn: 3 });
  const question = selectConsultativeQuestion({ stage, inbound: input.inbound, turn: 3 });
  const contrast = buildSalesContrast();
  const consultative = consultativeLearningDimensions({
    question,
    contrast,
    cta: input.generated.slice(-180),
    offer_used: /free trial|occupancynpv\.com\/pricing/i.test(input.generated),
  });
  const voice = salesVoiceToPerformanceObservations({
    score,
    conversation_id: input.conversation_id,
    at: input.at,
  });
  voice[0]!.dimensions = { ...voice[0]!.dimensions, ...consultative };
  return ingestObservations({
    observations: voice,
    adapter: internalInfinityAdapter,
  });
}

export function ingestOptOutConsentObservation(input: {
  conversation_id: string;
  at: string;
  prospect_authored: boolean;
  provider_called: boolean;
}) {
  return ingestObservations({
    observations: [{
      observationId: `opt-out-consent:${input.conversation_id}:${input.at}`,
      sourceId: "internal_infinity",
      ventureId: "occupancynpv",
      sourceReference: input.conversation_id,
      idempotencyKey: `opt-out-consent:${input.conversation_id}:${input.at}`,
      observedAt: input.at,
      rawMetric: "opt_out_consent_override",
      rawValue: input.prospect_authored && !input.provider_called ? 1 : 0,
      rawUnit: "count",
      description: "Consent correctly overrode sales",
      dimensions: {
        engine: "opt_out_closed_loop",
        consent_overrode_sales: "true",
        role_direction_correct: input.prospect_authored ? "true" : "false",
        opt_out_echo: "false",
        future_send_possible: input.provider_called ? "true" : "false",
        optimize_for: "consent_over_sales",
      },
      provenance: { engine: "opt_out_closed_loop_v1" },
    }],
    adapter: internalInfinityAdapter,
  });
}

export function credentialHealthOverwriteToPerformanceObservations(input: {
  at: string;
  reject_reason: string | null;
  consecutive_healthy_cron: number;
}): PerformanceObservation[] {
  return [{
    observationId: `credential-health-overwrite:${input.at}`,
    sourceId: "internal_infinity",
    ventureId: "occupancynpv",
    sourceReference: "communication-runtime-scheduler-v1",
    idempotencyKey: `second-isolate-overwrite:${input.at}`,
    observedAt: input.at,
    rawMetric: "SECOND_ISOLATE_HEALTH_STATE_OVERWRITE",
    rawValue: input.reject_reason ? 1 : 0,
    rawUnit: "count",
    description: "Stale or partial isolate attempted to overwrite credential health",
    dimensions: {
      engine: "credential_health_projection",
      reject_reason: input.reject_reason ?? "NONE",
      consecutive_healthy_cron: String(input.consecutive_healthy_cron),
      defect_class: "SECOND_ISOLATE_HEALTH_STATE_OVERWRITE",
    },
    provenance: { engine: "credential-health-projection-v1" },
  }];
}

export function inboundCompletionGapToPerformanceObservations(input: {
  at: string;
  inbound_id: string;
  unresolved: number;
  provider_reply: boolean;
}): PerformanceObservation[] {
  return [{
    observationId: `inbound-completion-gap:${input.inbound_id}:${input.at}`,
    sourceId: "internal_infinity",
    ventureId: "occupancynpv",
    sourceReference: input.inbound_id,
    idempotencyKey: `repeated-actionable-inbound:${input.inbound_id}:${input.at}`,
    observedAt: input.at,
    rawMetric: "REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED",
    rawValue: input.provider_reply ? 0 : input.unresolved,
    rawUnit: "count",
    description: "Actionable prospect inbound compared to actual provider replies, not processed keys",
    dimensions: {
      engine: "communication_reconciliation",
      inbound_id: input.inbound_id,
      unresolved: String(input.unresolved),
      provider_reply: input.provider_reply ? "true" : "false",
      defect_class: "REPEATED_ACTIONABLE_INBOUND_NOT_COMPLETED",
    },
    provenance: { engine: "communication-reconciliation-v1" },
  }];
}

export function ingestInboundCompletionGapObservations(input: {
  at: string;
  inbound_id: string;
  unresolved: number;
  provider_reply: boolean;
}) {
  return ingestObservations({
    observations: inboundCompletionGapToPerformanceObservations(input),
    adapter: internalInfinityAdapter,
  });
}
