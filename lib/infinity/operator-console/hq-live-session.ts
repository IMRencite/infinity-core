import {
  boundRecentHqEvents,
  createHqSingleFlight,
  deriveHqConnectionStatus,
  fallbackPollIntervalMs,
  HQ_MAX_RECENT_EVENTS,
  type HqConnectionStatus,
  type HqLiveSessionMetrics,
} from "./hq-live-policy";
import { isMaterialHqRuntimeEvent, type HqRuntimeEvent } from "./hq-live-events";

export type HqLiveSessionOptions = {
  refresh: (signal?: AbortSignal) => Promise<boolean>;
  subscribe?: (onEvent: (event: HqRuntimeEvent) => void) => () => void;
  now?: () => number;
  visibility?: () => DocumentVisibilityState;
};

export type HqLiveSession = {
  start: () => Promise<void>;
  stop: () => void;
  handleVisibility: (state: DocumentVisibilityState) => Promise<void>;
  handleFocus: () => Promise<void>;
  handleRealtimeState: (state: "open" | "connecting" | "closed") => Promise<void>;
  handleEvent: (event: HqRuntimeEvent) => Promise<void>;
  tickFallback: () => Promise<void>;
  connectionStatus: () => HqConnectionStatus;
  lastUpdatedAt: () => string | null;
  recentEvents: () => HqRuntimeEvent[];
  metrics: () => HqLiveSessionMetrics;
  fallbackIntervalMs: () => number | null;
  realtimeConnected: () => boolean;
};

export function createHqLiveSession(options: HqLiveSessionOptions): HqLiveSession {
  const flight = createHqSingleFlight();
  const now = options.now ?? Date.now;
  let visible = (options.visibility?.() ?? "visible") !== "hidden";
  let realtimeState: "open" | "connecting" | "closed" = "connecting";
  let lastSuccessMs: number | null = null;
  let lastDisconnectMs: number | null = null;
  let lastUpdatedAt: string | null = null;
  let recent: HqRuntimeEvent[] = [];
  let unsubscribe: (() => void) | null = null;
  let timerCount = 0;
  let listenerCount = 0;
  let overlappingPolls = 0;
  let refreshCount = 0;
  let retainedResponses = 0;
  let started = false;
  let abort: AbortController | null = null;

  async function request(mode: "poll" | "catch-up"): Promise<void> {
    if (mode === "poll" && flight.inFlight) {
      overlappingPolls += 1;
      return;
    }
    const result = await flight.run(async () => {
      abort?.abort();
      abort = new AbortController();
      retainedResponses = 1;
      const ok = await options.refresh(abort.signal);
      refreshCount += 1;
      if (ok) {
        lastSuccessMs = now();
        lastUpdatedAt = new Date(lastSuccessMs).toISOString();
      }
      retainedResponses = 0;
      return ok;
    }, mode);
    if (result === "skipped" && mode === "poll") overlappingPolls += 1;
  }

  function syncFallbackTimer(): void {
    const interval = fallbackPollIntervalMs({
      visible,
      realtimeConnected: realtimeState === "open",
    });
    timerCount = interval == null ? 0 : 1;
  }

  const session: HqLiveSession = {
    async start() {
      if (started) return;
      started = true;
      realtimeState = options.subscribe ? "connecting" : "closed";
      listenerCount = 2;
      if (options.subscribe) {
        unsubscribe = options.subscribe((event) => {
          void session.handleEvent(event);
        });
      }
      await request("catch-up");
      syncFallbackTimer();
    },
    stop() {
      started = false;
      unsubscribe?.();
      unsubscribe = null;
      abort?.abort();
      abort = null;
      timerCount = 0;
      listenerCount = 0;
      realtimeState = "closed";
    },
    async handleVisibility(state) {
      const nextVisible = state !== "hidden";
      visible = nextVisible;
      syncFallbackTimer();
      if (nextVisible) await request("catch-up");
    },
    async handleFocus() {
      if (!visible) return;
      await request("catch-up");
    },
    async handleRealtimeState(state) {
      if (state === "closed" && realtimeState === "open") lastDisconnectMs = now();
      realtimeState = state;
      syncFallbackTimer();
      if (state === "open") await request("catch-up");
    },
    async handleEvent(event) {
      recent = boundRecentHqEvents([...recent, event], HQ_MAX_RECENT_EVENTS);
      if (!isMaterialHqRuntimeEvent(event)) return;
      await request("catch-up");
    },
    async tickFallback() {
      const interval = fallbackPollIntervalMs({
        visible,
        realtimeConnected: realtimeState === "open",
      });
      if (interval == null) return;
      await request("poll");
    },
    connectionStatus() {
      return deriveHqConnectionStatus({
        nowMs: now(),
        lastSuccessMs,
        realtimeState,
        lastDisconnectMs,
      });
    },
    lastUpdatedAt() {
      return lastUpdatedAt;
    },
    recentEvents() {
      return [...recent];
    },
    metrics() {
      return {
        timerCount,
        listenerCount: started ? listenerCount : 0,
        subscriptionCount: unsubscribe ? 1 : 0,
        inFlightRequests: flight.inFlight ? 1 : 0,
        retainedEvents: recent.length,
        retainedResponseObjects: retainedResponses,
        overlappingPolls,
        highFrequencyIdlePolling: false,
        backgroundForegroundRatePolling: false,
        renderCount: refreshCount,
      };
    },
    fallbackIntervalMs() {
      return fallbackPollIntervalMs({
        visible,
        realtimeConnected: realtimeState === "open",
      });
    },
    realtimeConnected() {
      return realtimeState === "open";
    },
  };
  return session;
}
