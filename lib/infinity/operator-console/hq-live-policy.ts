import { TREASURY_STALE_AFTER_MS } from "@/lib/infinity/treasury/config";

export const HQ_LIVE_TRANSPORT = "SSE" as const;
export const HQ_FOREGROUND_FALLBACK_MS = 20_000;
export const HQ_CONNECTED_FRESHNESS_MS = 20_000;
export const HQ_BACKGROUND_FALLBACK_MS = 180_000;
export const HQ_SSE_HEARTBEAT_MS = 25_000;
export const HQ_REFRESH_TIMEOUT_MS = 8_000;
export const HQ_STALE_AFTER_MS = 45_000;
export const HQ_DISCONNECT_AFTER_MS = 120_000;
export const HQ_RECONNECTING_GRACE_MS = 8_000;
export const HQ_MAX_RECENT_EVENTS = 12;
export const HQ_HIGH_FREQUENCY_POLL_MS = 5_000;
export const HQ_MERCURY_SYNC_INTERVAL_MS = 10 * 60 * 1000;
export const HQ_STRIPE_DASHBOARD_POLL = "NONE" as const;
export const HQ_STRIPE_EVENT_DRIVEN = true;
export const HQ_FINANCIAL_FRESHNESS_MS = TREASURY_STALE_AFTER_MS;

export const HQ_LIVE_EFFICIENCY_GATE = "HQLiveEfficiencyGate" as const;
export const HQ_LONG_SESSION_STABILITY_GATE = "HQLongSessionStabilityGate" as const;
export const HQ_LIVE_REFRESH_GATE = "HQLiveRefreshGate" as const;
export const HQ_RECONNECT_CATCHUP_GATE = "HQReconnectCatchupGate" as const;

export type HqConnectionStatus = "LIVE" | "RECONNECTING" | "STALE" | "DISCONNECTED";
export type HqVisibilityState = "visible" | "hidden";

export type HqLiveSessionMetrics = {
  timerCount: number;
  listenerCount: number;
  subscriptionCount: number;
  inFlightRequests: number;
  retainedEvents: number;
  retainedResponseObjects: number;
  overlappingPolls: number;
  highFrequencyIdlePolling: boolean;
  backgroundForegroundRatePolling: boolean;
  heapUsedBytes?: number;
  renderCount?: number;
};

export type NamedHqLiveGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export function fallbackPollIntervalMs(input: {
  visible: boolean;
  realtimeConnected: boolean;
}): number | null {
  if (input.visible && !input.realtimeConnected) return HQ_FOREGROUND_FALLBACK_MS;
  if (!input.visible && !input.realtimeConnected) return HQ_BACKGROUND_FALLBACK_MS;
  return null;
}

export function liveFreshnessIntervalMs(input: {
  visible: boolean;
  realtimeConnected: boolean;
}): number | null {
  if (input.visible && input.realtimeConnected) return HQ_CONNECTED_FRESHNESS_MS;
  return fallbackPollIntervalMs(input);
}

export function deriveHqConnectionStatus(input: {
  nowMs: number;
  lastSuccessMs: number | null;
  realtimeState: "open" | "connecting" | "closed";
  lastDisconnectMs?: number | null;
}): HqConnectionStatus {
  const lastSuccess = input.lastSuccessMs;
  if (lastSuccess == null) {
    return input.realtimeState === "connecting" ? "RECONNECTING" : "DISCONNECTED";
  }
  const age = input.nowMs - lastSuccess;
  if (age >= HQ_DISCONNECT_AFTER_MS && input.realtimeState !== "open") return "DISCONNECTED";
  if (age >= HQ_STALE_AFTER_MS) return "STALE";
  if (input.realtimeState === "connecting") {
    const disconnectAge = input.lastDisconnectMs == null ? 0 : input.nowMs - input.lastDisconnectMs;
    return disconnectAge < HQ_RECONNECTING_GRACE_MS ? "RECONNECTING" : "RECONNECTING";
  }
  if (input.realtimeState === "closed") {
    const disconnectAge = input.lastDisconnectMs == null ? age : input.nowMs - input.lastDisconnectMs;
    if (disconnectAge < HQ_RECONNECTING_GRACE_MS) return "RECONNECTING";
    return age >= HQ_STALE_AFTER_MS ? "STALE" : "RECONNECTING";
  }
  return "LIVE";
}

export function shouldSkipScheduledPoll(inFlight: boolean): boolean {
  return inFlight;
}

export function shouldCatchUpImmediately(trigger: "visibility" | "focus" | "reconnect" | "event" | "interval"): boolean {
  return trigger === "visibility" || trigger === "focus" || trigger === "reconnect" || trigger === "event";
}

export function boundRecentHqEvents<T>(events: T[], max = HQ_MAX_RECENT_EVENTS): T[] {
  if (events.length <= max) return events;
  return events.slice(events.length - max);
}

export function financialProviderSafeCadence(input: {
  stripeDashboardPoll: string;
  stripeEventDriven: boolean;
  mercurySyncIntervalMs: number;
}): NamedHqLiveGate {
  const reasons: string[] = [];
  if (input.stripeDashboardPoll !== "NONE") reasons.push("STRIPE_DASHBOARD_POLLING");
  if (!input.stripeEventDriven) reasons.push("STRIPE_NOT_EVENT_DRIVEN");
  if (input.mercurySyncIntervalMs < 5 * 60 * 1000 || input.mercurySyncIntervalMs > 15 * 60 * 1000) {
    reasons.push("MERCURY_CADENCE_UNSAFE");
  }
  return {
    gate: "FinancialProviderSafeCadence",
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQLiveEfficiencyGate(input: {
  idlePollIntervalMs: number | null;
  backgroundPollIntervalMs: number | null;
  duplicateSubscriptions: number;
  overlappingPolls: number;
  retainedEvents: number;
  hqRequiredForRuntime: boolean;
  hqRequiredForFavc1Cycle: boolean;
  financial: ReturnType<typeof financialProviderSafeCadence>;
}): NamedHqLiveGate {
  const reasons: string[] = [];
  if (input.idlePollIntervalMs != null && input.idlePollIntervalMs < HQ_HIGH_FREQUENCY_POLL_MS) {
    reasons.push("HIGH_FREQUENCY_IDLE_POLLING");
  }
  if (
    input.backgroundPollIntervalMs != null &&
    input.idlePollIntervalMs != null &&
    input.backgroundPollIntervalMs <= input.idlePollIntervalMs
  ) {
    reasons.push("BACKGROUND_FOREGROUND_RATE_POLLING");
  }
  if (input.duplicateSubscriptions > 0) reasons.push("DUPLICATE_SUBSCRIPTIONS");
  if (input.overlappingPolls > 0) reasons.push("OVERLAPPING_POLLS");
  if (input.retainedEvents > HQ_MAX_RECENT_EVENTS) reasons.push("UNBOUNDED_CLIENT_EVENT_HISTORY");
  if (input.hqRequiredForRuntime) reasons.push("HQ_IS_RUNTIME_DEPENDENCY");
  if (input.hqRequiredForFavc1Cycle) reasons.push("HQ_REQUIRED_FOR_FAVC1_CYCLE");
  if (input.financial.result !== "PASS") reasons.push(...input.financial.reasons);
  return {
    gate: HQ_LIVE_EFFICIENCY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQLongSessionStabilityGate(input: {
  before: HqLiveSessionMetrics;
  after: HqLiveSessionMetrics;
}): NamedHqLiveGate {
  const reasons: string[] = [];
  if (input.after.timerCount > input.before.timerCount + 1) reasons.push("TIMER_GROWTH");
  if (input.after.listenerCount > input.before.listenerCount + 2) reasons.push("LISTENER_GROWTH");
  if (input.after.subscriptionCount > 1) reasons.push("DUPLICATE_REALTIME_SUBSCRIPTIONS");
  if (input.after.subscriptionCount > input.before.subscriptionCount && input.after.subscriptionCount > 1) {
    reasons.push("SUBSCRIPTION_GROWTH");
  }
  if (input.after.inFlightRequests > 1) reasons.push("OVERLAPPING_REQUESTS");
  if (input.after.retainedEvents > HQ_MAX_RECENT_EVENTS) reasons.push("UNBOUNDED_EVENT_HISTORY");
  if (input.after.retainedResponseObjects > 2) reasons.push("UNBOUNDED_RESPONSE_RETENTION");
  if (input.after.overlappingPolls > 0) reasons.push("OVERLAPPING_POLLS");
  if (input.after.highFrequencyIdlePolling) reasons.push("HIGH_FREQUENCY_IDLE_POLLING");
  if (input.after.backgroundForegroundRatePolling) reasons.push("BACKGROUND_FOREGROUND_RATE_POLLING");
  if (
    input.after.heapUsedBytes != null &&
    input.before.heapUsedBytes != null &&
    input.after.heapUsedBytes > input.before.heapUsedBytes + 8 * 1024 * 1024
  ) {
    reasons.push("HEAP_GROWTH");
  }
  return {
    gate: HQ_LONG_SESSION_STABILITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQLiveRefreshGate(input: {
  sseRouteExists: boolean;
  snapshotReloadsDisk: boolean;
  processLocalEventsOnly: boolean;
  focusCatchUp: boolean;
  connectedFreshnessPoll: boolean;
  catchUpAppliesSnapshot: boolean;
}): NamedHqLiveGate {
  const reasons: string[] = [];
  if (!input.sseRouteExists) reasons.push("SSE_ROUTE_MISSING");
  if (!input.snapshotReloadsDisk) reasons.push("SNAPSHOT_DOES_NOT_RELOAD_DISK");
  if (input.processLocalEventsOnly) reasons.push("PROCESS_LOCAL_EVENTS_ONLY");
  if (!input.focusCatchUp) reasons.push("FOCUS_CATCHUP_MISSING");
  if (!input.connectedFreshnessPoll) reasons.push("CONNECTED_FRESHNESS_POLL_MISSING");
  if (!input.catchUpAppliesSnapshot) reasons.push("CATCHUP_DOES_NOT_APPLY_SNAPSHOT");
  return {
    gate: HQ_LIVE_REFRESH_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQReconnectCatchupGate(input: {
  reconnectCatchUp: boolean;
  visibilityCatchUp: boolean;
  diskReloadOnRead: boolean;
  pageshowCatchUp: boolean;
}): NamedHqLiveGate {
  const reasons: string[] = [];
  if (!input.reconnectCatchUp) reasons.push("RECONNECT_CATCHUP_MISSING");
  if (!input.visibilityCatchUp) reasons.push("VISIBILITY_CATCHUP_MISSING");
  if (!input.diskReloadOnRead) reasons.push("DISK_RELOAD_ON_READ_MISSING");
  if (!input.pageshowCatchUp) reasons.push("PAGESHOW_CATCHUP_MISSING");
  return {
    gate: HQ_RECONNECT_CATCHUP_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function createHqSingleFlight() {
  let inFlight = false;
  let pendingCatchUp: (() => Promise<unknown>) | null = null;
  async function run<T>(work: () => Promise<T>, mode: "poll" | "catch-up"): Promise<T | "skipped"> {
    if (inFlight) {
      if (mode === "catch-up") pendingCatchUp = work;
      return "skipped";
    }
    inFlight = true;
    try {
      const result = await work();
      if (pendingCatchUp) {
        const followWork = pendingCatchUp as () => Promise<T>;
        pendingCatchUp = null;
        inFlight = false;
        const follow = await run(followWork, "catch-up");
        return follow === "skipped" ? result : follow;
      }
      return result;
    } finally {
      inFlight = false;
    }
  }
  return {
    get inFlight() {
      return inFlight;
    },
    run,
  };
}
