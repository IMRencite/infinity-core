import { loadProductionOutboundControl, emptyOutboundUsage } from "./control";
import type { OutboundMetrics, ProductionOutboundState } from "./types";

export function emptyOutboundMetrics(): OutboundMetrics {
  return {
    authorized: 0,
    blocked: 0,
    provider_accepts: 0,
    sent: 0,
    delivered: 0,
    bounced: 0,
    replies: 0,
    positive_replies: 0,
    negative_replies: 0,
    opt_outs: 0,
    complaints: 0,
    meetings: 0,
    duplicates_prevented: 0,
    kill_switch_events: 0,
    last_failure_category: null,
  };
}

export function emptyProductionOutboundState(
  now = new Date().toISOString(),
  control = loadProductionOutboundControl({ OUTBOUND_MODE: "disabled", GLOBAL_OUTBOUND_KILL_SWITCH: "true" }),
): ProductionOutboundState {
  return {
    control,
    usage: emptyOutboundUsage(now),
    outbox: [],
    decisions: [],
    events: [],
    metrics: emptyOutboundMetrics(),
    last_tick_at: null,
  };
}

let defaultState: ProductionOutboundState | null = null;

export function getDefaultProductionOutboundState(): ProductionOutboundState {
  if (!defaultState) {
    defaultState = emptyProductionOutboundState();
    defaultState.control = loadProductionOutboundControl();
  }
  return defaultState;
}

export function resetProductionOutboundState(state?: ProductionOutboundState): ProductionOutboundState {
  defaultState = state ?? emptyProductionOutboundState();
  return defaultState;
}

export function replaceProductionOutboundState(target: ProductionOutboundState, source: ProductionOutboundState): ProductionOutboundState {
  target.control = source.control;
  target.usage = source.usage;
  target.outbox = source.outbox;
  target.decisions = source.decisions;
  target.events = source.events;
  target.metrics = source.metrics;
  target.last_tick_at = source.last_tick_at;
  return target;
}
