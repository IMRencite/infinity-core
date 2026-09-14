import { hqLiveSnapshotIsolationKey, snapshotMatchesRequestedVenture } from "@/lib/infinity/hq-venture-selection/identity";
import type { OperatorVentureSnapshot } from "./types";
import {
  acceptHqPollSnapshot,
  applyHqLiveExecutionOverlay,
  hqPollFreshnessFromSnapshot,
  parseHqPollPayload,
  shouldApplyInitialHqSnapshot,
  type HqPollFreshness,
} from "./hq-poll-generation";

export type HqSnapshotCommitSource =
  | "SSR_INIT"
  | "SSR_PROP_SYNC"
  | "POLL_RESPONSE"
  | "CATCH_UP_RESPONSE"
  | "TREASURY_PATCH"
  | "IDENTITY_NAVIGATION";

export type HqSnapshotTraceRow = {
  at: string;
  source: HqSnapshotCommitSource;
  previousActiveCount: number;
  nextActiveCount: number;
  previousMission: string | null;
  nextMission: string | null;
  requestSequence: number | null;
  generatedAt: string;
  accepted: boolean;
  reason: string;
  mountId: string;
};

export type HqSnapshotCommitDecision = {
  accepted: boolean;
  reason: string;
  source: HqSnapshotCommitSource;
  previous: HqPollFreshness | null;
  next: HqPollFreshness;
  snapshot: OperatorVentureSnapshot;
  requestSequence: number | null;
};

type HqClientSnapshotSlot = {
  snapshot: OperatorVentureSnapshot;
  freshness: HqPollFreshness;
  sequence: number;
};

const slots = new Map<string, HqClientSnapshotSlot>();
const ventureToSlotKey = new Map<string, string>();
let nextRequestSequence = 0;
const traces: HqSnapshotTraceRow[] = [];

export function hqLiveSnapshotSlotKey(ventureId: string, snapshot?: OperatorVentureSnapshot | null): string {
  return hqLiveSnapshotIsolationKey(ventureId, snapshot?.venture.organizationId);
}

function emptyFreshness(ventureAssemblyId: string): HqPollFreshness {
  return {
    generatedAt: "",
    lastActivityAt: null,
    activeCount: 0,
    currentMission: null,
    currentWorkId: null,
    ventureAssemblyId,
  };
}

export function resetHqClientSnapshotStore(): void {
  slots.clear();
  ventureToSlotKey.clear();
  nextRequestSequence = 0;
  traces.length = 0;
}

export function nextHqPollRequestSequence(): number {
  nextRequestSequence += 1;
  return nextRequestSequence;
}

export function readHqClientSnapshotSlot(ventureId: string): HqClientSnapshotSlot | null {
  const mapped = ventureToSlotKey.get(ventureId);
  if (mapped && slots.has(mapped)) return slots.get(mapped) ?? null;
  return slots.get(`venture:${ventureId}`) ?? slots.get(ventureId) ?? null;
}

function writeSlot(ventureId: string, snapshot: OperatorVentureSnapshot, slot: HqClientSnapshotSlot): void {
  const key = hqLiveSnapshotSlotKey(ventureId, snapshot);
  ventureToSlotKey.set(ventureId, key);
  slots.set(key, slot);
}

function readSlot(ventureId: string, snapshot?: OperatorVentureSnapshot | null): HqClientSnapshotSlot | null {
  const key = hqLiveSnapshotSlotKey(ventureId, snapshot);
  return slots.get(key) ?? readHqClientSnapshotSlot(ventureId);
}

export function readHqSnapshotTraces(): HqSnapshotTraceRow[] {
  return [...traces];
}

export function isHqWrappedPollPayload(
  payload: unknown,
): payload is { snapshot: OperatorVentureSnapshot; followVentureAssemblyId?: string | null; meta?: unknown } {
  if (!payload || typeof payload !== "object") return false;
  if (!("snapshot" in payload)) return false;
  const inner = (payload as { snapshot: unknown }).snapshot;
  if (!inner || typeof inner !== "object") return false;
  return "venture" in inner && "currentActivity" in inner && "generatedAt" in inner;
}

export function unwrapHqPollSnapshot(payload: unknown): OperatorVentureSnapshot {
  if (isHqWrappedPollPayload(payload)) {
    return applyHqLiveExecutionOverlay(payload.snapshot);
  }
  return applyHqLiveExecutionOverlay(parseHqPollPayload(payload as OperatorVentureSnapshot));
}

export function mergeInspectionPreservingLiveExecution(
  live: OperatorVentureSnapshot,
  incoming: OperatorVentureSnapshot,
): OperatorVentureSnapshot {
  const incomingLive = applyHqLiveExecutionOverlay(incoming);
  if (acceptHqPollSnapshot(hqPollFreshnessFromSnapshot(live), hqPollFreshnessFromSnapshot(incomingLive))) {
    return incomingLive;
  }
  return applyHqLiveExecutionOverlay({
    ...incomingLive,
    commandActivity: live.commandActivity,
    currentExecution: live.currentExecution,
    latestCompletedExecution: live.latestCompletedExecution ?? incomingLive.latestCompletedExecution,
    roomPresence: live.roomPresence ?? incomingLive.roomPresence,
    activeWorkers: live.activeWorkers ?? incomingLive.activeWorkers,
    workerNodes: live.workerNodes ?? incomingLive.workerNodes,
    currentDepartments: live.currentDepartments,
    currentActivity: live.currentActivity,
  });
}

function decideHqSnapshotWrite(
  source: HqSnapshotCommitSource,
  applied: HqPollFreshness | null,
  incoming: HqPollFreshness,
  incomingSequence: number | null,
  appliedSequence: number,
): { accepted: boolean; reason: string } {
  if (source === "IDENTITY_NAVIGATION") {
    return { accepted: true, reason: "inspection identity changed" };
  }
  if (source === "CATCH_UP_RESPONSE") {
    return { accepted: true, reason: "forced catch-up" };
  }
  if (
    source === "POLL_RESPONSE" &&
    incomingSequence != null &&
    incomingSequence < appliedSequence
  ) {
    return { accepted: false, reason: "stale request sequence" };
  }
  if (source === "SSR_INIT" || source === "SSR_PROP_SYNC") {
    if (applied && !shouldApplyInitialHqSnapshot(applied, incoming)) {
      return { accepted: false, reason: "older SSR snapshot" };
    }
    return { accepted: true, reason: "ssr snapshot newer or first paint" };
  }
  if (source === "TREASURY_PATCH") {
    return { accepted: true, reason: "local treasury patch" };
  }
  if (!acceptHqPollSnapshot(applied, incoming)) {
    return { accepted: false, reason: "poll freshness rejected" };
  }
  return { accepted: true, reason: "poll freshness accepted" };
}

function recordTrace(row: HqSnapshotTraceRow): void {
  if (process.env.NODE_ENV === "production") return;
  traces.push(row);
  if (traces.length > 80) traces.splice(0, traces.length - 80);
  if (typeof window === "undefined") return;
  const existing = (window as Window & { __INFINITY_HQ_SNAPSHOT_TRACE__?: HqSnapshotTraceRow[] })
    .__INFINITY_HQ_SNAPSHOT_TRACE__;
  const next = [...(existing ?? []), row].slice(-80);
  (window as unknown as { __INFINITY_HQ_SNAPSHOT_TRACE__: HqSnapshotTraceRow[] }).__INFINITY_HQ_SNAPSHOT_TRACE__ = next;
}

export function restoreHqClientSnapshot(
  ventureId: string,
  initialSnapshot: OperatorVentureSnapshot,
  mountId = "restore",
): OperatorVentureSnapshot {
  const incoming = applyHqLiveExecutionOverlay(initialSnapshot);
  const incomingFresh = hqPollFreshnessFromSnapshot(incoming);
  if (!snapshotMatchesRequestedVenture(incoming, ventureId)) {
    recordTrace({
      at: new Date().toISOString(),
      source: "SSR_INIT",
      previousActiveCount: 0,
      nextActiveCount: incomingFresh.activeCount,
      previousMission: null,
      nextMission: incomingFresh.currentMission,
      requestSequence: null,
      generatedAt: incoming.generatedAt,
      accepted: false,
      reason: "SNAPSHOT_CROSS_VENTURE_CONTAMINATION",
      mountId,
    });
    return incoming;
  }
  const cached = readSlot(ventureId, incoming);
  if (cached && !snapshotMatchesRequestedVenture(cached.snapshot, ventureId)) {
    writeSlot(ventureId, incoming, { snapshot: incoming, freshness: incomingFresh, sequence: 0 });
    return incoming;
  }
  if (cached && !shouldApplyInitialHqSnapshot(cached.freshness, incomingFresh)) {
    const merged = mergeInspectionPreservingLiveExecution(cached.snapshot, incoming);
    recordTrace({
      at: new Date().toISOString(),
      source: "SSR_INIT",
      previousActiveCount: cached.freshness.activeCount,
      nextActiveCount: hqPollFreshnessFromSnapshot(merged).activeCount,
      previousMission: cached.freshness.currentMission,
      nextMission: hqPollFreshnessFromSnapshot(merged).currentMission,
      requestSequence: cached.sequence,
      generatedAt: merged.generatedAt,
      accepted: true,
      reason: "restore live cache over idle SSR",
      mountId,
    });
    writeSlot(ventureId, merged, {
      snapshot: merged,
      freshness: hqPollFreshnessFromSnapshot(merged),
      sequence: cached.sequence,
    });
    return merged;
  }
  writeSlot(ventureId, incoming, { snapshot: incoming, freshness: incomingFresh, sequence: cached?.sequence ?? 0 });
  recordTrace({
    at: new Date().toISOString(),
    source: "SSR_INIT",
    previousActiveCount: cached?.freshness.activeCount ?? 0,
    nextActiveCount: incomingFresh.activeCount,
    previousMission: cached?.freshness.currentMission ?? null,
    nextMission: incomingFresh.currentMission,
    requestSequence: null,
    generatedAt: incoming.generatedAt,
    accepted: true,
    reason: "ssr init",
    mountId,
  });
  return incoming;
}

export function commitHqClientSnapshot(input: {
  ventureId: string;
  source: HqSnapshotCommitSource;
  incoming: OperatorVentureSnapshot;
  requestSequence?: number | null;
  mountId?: string;
}): HqSnapshotCommitDecision {
  const snapshot = applyHqLiveExecutionOverlay(input.incoming);
  const next = hqPollFreshnessFromSnapshot(snapshot);
  if (input.source !== "TREASURY_PATCH" && !snapshotMatchesRequestedVenture(snapshot, input.ventureId)) {
    const previousSlot = readHqClientSnapshotSlot(input.ventureId);
    const previousFresh = previousSlot?.freshness ?? null;
    recordTrace({
      at: new Date().toISOString(),
      source: input.source,
      previousActiveCount: previousFresh?.activeCount ?? 0,
      nextActiveCount: next.activeCount,
      previousMission: previousFresh?.currentMission ?? null,
      nextMission: next.currentMission,
      requestSequence: input.requestSequence ?? null,
      generatedAt: snapshot.generatedAt,
      accepted: false,
      reason: "SNAPSHOT_CROSS_VENTURE_CONTAMINATION",
      mountId: input.mountId ?? "default",
    });
    return {
      accepted: false,
      reason: "SNAPSHOT_CROSS_VENTURE_CONTAMINATION",
      source: input.source,
      previous: previousFresh,
      next,
      snapshot: previousSlot && snapshotMatchesRequestedVenture(previousSlot.snapshot, input.ventureId)
        ? previousSlot.snapshot
        : snapshot,
      requestSequence: input.requestSequence ?? null,
    };
  }
  const slot = readSlot(input.ventureId, snapshot);
  const previous = slot?.freshness ?? null;
  const decision = decideHqSnapshotWrite(
    input.source,
    previous,
    next,
    input.requestSequence ?? null,
    slot?.sequence ?? 0,
  );
  if (!decision.accepted && input.source === "SSR_PROP_SYNC" && slot) {
    const merged = mergeInspectionPreservingLiveExecution(slot.snapshot, snapshot);
    const mergedFresh = hqPollFreshnessFromSnapshot(merged);
    writeSlot(input.ventureId, merged, {
      snapshot: merged,
      freshness: mergedFresh,
      sequence: slot.sequence,
    });
    recordTrace({
      at: new Date().toISOString(),
      source: input.source,
      previousActiveCount: previous?.activeCount ?? 0,
      nextActiveCount: mergedFresh.activeCount,
      previousMission: previous?.currentMission ?? null,
      nextMission: mergedFresh.currentMission,
      requestSequence: input.requestSequence ?? null,
      generatedAt: merged.generatedAt,
      accepted: true,
      reason: "inspection merge preserved live execution",
      mountId: input.mountId ?? "default",
    });
    return {
      accepted: true,
      reason: "inspection merge preserved live execution",
      source: input.source,
      previous,
      next: mergedFresh,
      snapshot: merged,
      requestSequence: input.requestSequence ?? null,
    };
  }
  const committed = decision.accepted ? snapshot : slot?.snapshot ?? snapshot;
  const committedFresh = hqPollFreshnessFromSnapshot(committed);
  if (decision.accepted) {
    writeSlot(input.ventureId, committed, {
      snapshot: committed,
      freshness: committedFresh,
      sequence: input.requestSequence ?? slot?.sequence ?? 0,
    });
  }
  recordTrace({
    at: new Date().toISOString(),
    source: input.source,
    previousActiveCount: previous?.activeCount ?? 0,
    nextActiveCount: committedFresh.activeCount,
    previousMission: previous?.currentMission ?? null,
    nextMission: committedFresh.currentMission,
    requestSequence: input.requestSequence ?? null,
    generatedAt: committed.generatedAt,
    accepted: decision.accepted,
    reason: decision.reason,
    mountId: input.mountId ?? "default",
  });
  return {
    ...decision,
    source: input.source,
    previous,
    next: committedFresh,
    snapshot: committed,
    requestSequence: input.requestSequence ?? null,
  };
}

export function commitHqClientPollPayload(input: {
  ventureId: string;
  payload: unknown;
  requestSequence: number;
  mountId?: string;
  source?: Extract<HqSnapshotCommitSource, "POLL_RESPONSE" | "CATCH_UP_RESPONSE">;
}): HqSnapshotCommitDecision {
  return commitHqClientSnapshot({
    ventureId: input.ventureId,
    source: input.source ?? "POLL_RESPONSE",
    incoming: unwrapHqPollSnapshot(input.payload),
    requestSequence: input.requestSequence,
    mountId: input.mountId,
  });
}

export { hqPollFreshnessFromSnapshot, parseHqPollPayload, shouldFollowFavc1AssemblyNavigation } from "./hq-poll-generation";
