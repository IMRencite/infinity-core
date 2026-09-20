import { CRE_INBOUND_OBSERVER_CADENCE_MS } from "./constants";
import { runCreInboundObservationCycle } from "./cre-inbound-observer";
import { readCreInboundObserverState } from "./observer-persist";

const GLOBAL_KEY = "__infinityCreInboundObserverTimer" as const;

type GlobalTimer = typeof globalThis & { [GLOBAL_KEY]?: ReturnType<typeof setInterval> };

export function creInboundObserverLoopRunning(): boolean {
  return Boolean((globalThis as GlobalTimer)[GLOBAL_KEY]);
}

export function stopCreInboundObserverLoop(): void {
  const timer = (globalThis as GlobalTimer)[GLOBAL_KEY];
  if (timer) clearInterval(timer);
  (globalThis as GlobalTimer)[GLOBAL_KEY] = undefined;
}

export function startCreInboundObserverLoop(input: { fetchImpl?: typeof fetch } = {}): {
  started: boolean;
  alreadyRunning: boolean;
} {
  if (process.env.VITEST && process.env.INFINITY_OBSERVER_LOOP !== "1") {
    return { started: false, alreadyRunning: false };
  }
  if (creInboundObserverLoopRunning()) {
    return { started: false, alreadyRunning: true };
  }
  const timer = setInterval(() => {
    void tickCreInboundObserver(input.fetchImpl);
  }, CRE_INBOUND_OBSERVER_CADENCE_MS);
  if (typeof timer.unref === "function") timer.unref();
  (globalThis as GlobalTimer)[GLOBAL_KEY] = timer;
  return { started: true, alreadyRunning: false };
}

export function startCreInboundObserverIfActivated(input: { fetchImpl?: typeof fetch } = {}): {
  started: boolean;
} {
  const state = readCreInboundObserverState();
  if (state?.status !== "RUNNING") return { started: false };
  return { started: startCreInboundObserverLoop(input).started };
}

async function tickCreInboundObserver(fetchImpl?: typeof fetch): Promise<void> {
  try {
    const cycle = await runCreInboundObservationCycle({ fetchImpl });
    if (cycle.processing.newInboundProcessed > 0) {
      const { executeInboundCommunicationProcessingMission } = await import("./inbound-processing-mission");
      await executeInboundCommunicationProcessingMission({ fetchImpl, observation: cycle });
    }
  } catch {
    // Observer remains durable; next tick retries. Do not throw across the interval.
  }
}
