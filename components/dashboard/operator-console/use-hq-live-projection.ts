"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HqRuntimeEvent } from "@/lib/infinity/operator-console/hq-live-events";
import { isMaterialHqRuntimeEvent } from "@/lib/infinity/operator-console/hq-live-events";
import {
  HQ_FOREGROUND_FALLBACK_MS,
  HQ_BACKGROUND_FALLBACK_MS,
  HQ_REFRESH_TIMEOUT_MS,
  boundRecentHqEvents,
  createHqSingleFlight,
  deriveHqConnectionStatus,
  liveFreshnessIntervalMs,
  type HqConnectionStatus,
} from "@/lib/infinity/operator-console/hq-live-policy";
import { HQ_LIVE_PROOF_COOKIE } from "@/lib/infinity/operator-console/local-hq-proof";

export type HqLiveRefreshReason = "poll" | "catch-up";

type RefreshFn = (signal?: AbortSignal, reason?: HqLiveRefreshReason) => Promise<boolean>;

export type HqLiveDiagnostics = {
  connectionStatus: HqConnectionStatus;
  lastUpdatedAt: string | null;
  lastEventAt: string | null;
  lastEventType: string | null;
  lastSnapshotAt: string | null;
  canonicalVersion: string | null;
  sseState: "open" | "connecting" | "closed";
};

async function withTimeout(work: (signal: AbortSignal) => Promise<boolean>, parent?: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HQ_REFRESH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  parent?.addEventListener("abort", onParentAbort);
  try {
    return await work(controller.signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    throw error;
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onParentAbort);
  }
}

function ensureLocalProofCookie(): void {
  if (typeof document === "undefined") return;
  if (process.env.NODE_ENV === "production") return;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return;
  if (document.cookie.split(";").some((part) => part.trim().startsWith(`${HQ_LIVE_PROOF_COOKIE}=1`))) return;
  document.cookie = `${HQ_LIVE_PROOF_COOKIE}=1; Path=/; SameSite=Lax`;
}

export function useHqLiveProjection(refresh: RefreshFn): {
  connectionStatus: HqConnectionStatus;
  lastUpdatedAt: string | null;
  recentEvents: HqRuntimeEvent[];
  diagnostics: HqLiveDiagnostics;
} {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const flight = useMemo(() => createHqSingleFlight(), []);
  const [connectionStatus, setConnectionStatus] = useState<HqConnectionStatus>("RECONNECTING");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastEventType, setLastEventType] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<HqRuntimeEvent[]>([]);
  const lastSuccessMs = useRef<number | null>(null);
  const lastDisconnectMs = useRef<number | null>(null);
  const realtimeState = useRef<"open" | "connecting" | "closed">("connecting");
  const [sseState, setSseState] = useState<"open" | "connecting" | "closed">("connecting");

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let abort: AbortController | null = null;
    ensureLocalProofCookie();

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") void catchUp();
      syncFallback();
    };
    const focusHandler = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    const pageshowHandler = () => {
      void catchUp();
    };

    function syncStatus() {
      if (cancelled) return;
      setSseState(realtimeState.current);
      setConnectionStatus(
        deriveHqConnectionStatus({
          nowMs: Date.now(),
          lastSuccessMs: lastSuccessMs.current,
          realtimeState: realtimeState.current,
          lastDisconnectMs: lastDisconnectMs.current,
        }),
      );
    }

    async function runRefresh(reason: HqLiveRefreshReason) {
      const result = await flight.run(async () => {
        abort?.abort();
        abort = new AbortController();
        const ok = await withTimeout((signal) => refreshRef.current(signal, reason), abort.signal);
        if (ok) {
          lastSuccessMs.current = Date.now();
          setLastUpdatedAt(new Date(lastSuccessMs.current).toISOString());
        }
        return ok;
      }, reason === "catch-up" ? "catch-up" : "poll");
      if (result !== "skipped") syncStatus();
    }

    async function catchUp() {
      await runRefresh("catch-up");
    }

    async function poll() {
      if (flight.inFlight) return;
      await runRefresh("poll");
    }

    function syncFallback() {
      if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
      }
      const interval = liveFreshnessIntervalMs({
        visible: document.visibilityState !== "hidden",
        realtimeConnected: realtimeState.current === "open",
      });
      if (interval == null) return;
      fallbackTimer = setInterval(() => {
        void poll();
      }, interval);
    }

    function detachEventSource() {
      if (!source) return;
      source.onopen = null;
      source.onmessage = null;
      source.onerror = null;
      source.close();
      source = null;
    }

    function attachEventSource() {
      if (cancelled) return;
      detachEventSource();
      realtimeState.current = "connecting";
      syncStatus();
      source = new EventSource("/api/operator-console/hq-events");
      source.onopen = () => {
        if (cancelled) return;
        realtimeState.current = "open";
        syncFallback();
        void catchUp();
        syncStatus();
      };
      source.onmessage = (message) => {
        if (cancelled) return;
        let event: HqRuntimeEvent | null = null;
        try {
          event = JSON.parse(message.data) as HqRuntimeEvent;
        } catch {
          return;
        }
        setLastEventAt(event.at);
        setLastEventType(event.type);
        setRecentEvents((prev) => boundRecentHqEvents([...prev, event], 12));
        if (isMaterialHqRuntimeEvent(event)) void catchUp();
        else syncStatus();
      };
      source.onerror = () => {
        if (cancelled) return;
        if (realtimeState.current === "open") lastDisconnectMs.current = Date.now();
        const closed = source?.readyState === EventSource.CLOSED;
        realtimeState.current = closed ? "closed" : "connecting";
        syncFallback();
        syncStatus();
        if (closed) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (!cancelled) attachEventSource();
          }, 1000);
        }
      };
    }

    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("focus", focusHandler);
    window.addEventListener("pageshow", pageshowHandler);
    attachEventSource();
    void catchUp();
    syncFallback();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("focus", focusHandler);
      window.removeEventListener("pageshow", pageshowHandler);
      detachEventSource();
      if (fallbackTimer) clearInterval(fallbackTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      abort?.abort();
    };
  }, [flight]);

  return {
    connectionStatus,
    lastUpdatedAt,
    recentEvents,
    diagnostics: {
      connectionStatus,
      lastUpdatedAt,
      lastEventAt,
      lastEventType,
      lastSnapshotAt: lastUpdatedAt,
      canonicalVersion: recentEvents[recentEvents.length - 1]?.at ?? lastUpdatedAt,
      sseState,
    },
  };
}

export const HQ_LIVE_CLIENT_FALLBACK_MS = HQ_FOREGROUND_FALLBACK_MS;
export const HQ_LIVE_CLIENT_BACKGROUND_MS = HQ_BACKGROUND_FALLBACK_MS;
