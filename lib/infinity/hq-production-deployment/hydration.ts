import { FOUNDER_HQ_TIMEZONE } from "@/lib/infinity/founder-daily-reports/types";
import {
  HQ_HYDRATION_PARITY_GATE,
  HQ_INITIAL_SNAPSHOT_CONSISTENCY_GATE,
  HQ_RENDERED_RUNTIME_INTEGRITY_GATE,
  type HqNamedGate,
} from "./contract";

export const STABLE_DATETIME_LOCALE = "en-US" as const;
export const STABLE_DATETIME_TIMEZONE = FOUNDER_HQ_TIMEZONE;

export function formatHydrationSafeTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { timeStyle: "medium" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(STABLE_DATETIME_LOCALE, {
    ...options,
    timeZone: STABLE_DATETIME_TIMEZONE,
  }).format(date);
}

export function formatHydrationSafeDateTime(value: string | number | Date): string {
  return formatHydrationSafeTime(value, { dateStyle: "medium", timeStyle: "medium" });
}

export function hydrationSafeTimestamp(input: {
  source: string | null | undefined;
  fallback?: string;
}): { iso: string | null; display: string; stable: boolean } {
  if (!input.source) {
    return { iso: input.fallback ?? null, display: input.fallback ? formatHydrationSafeTime(input.fallback) : "", stable: Boolean(input.fallback) };
  }
  return { iso: input.source, display: formatHydrationSafeTime(input.source), stable: true };
}

export function evaluateHQHydrationParityGate(input: {
  ssrText: string;
  clientInitialText: string;
  usesRenderClock: boolean;
  usesRandomInitial: boolean;
  machineLocale: boolean;
  machineTimezone: boolean;
  windowBranchChangesMarkup: boolean;
  hydrationWarning: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.ssrText !== input.clientInitialText) reasons.push("SSR_CLIENT_PARITY_FAIL");
  if (input.usesRenderClock) reasons.push("UNSTABLE_INITIAL_SNAPSHOT");
  if (input.usesRandomInitial) reasons.push("RANDOM_INITIAL_VALUE");
  if (input.machineLocale) reasons.push("MACHINE_LOCALE");
  if (input.machineTimezone) reasons.push("MACHINE_TIMEZONE");
  if (input.windowBranchChangesMarkup) reasons.push("WINDOW_BRANCH_MARKUP");
  if (input.hydrationWarning) reasons.push("HYDRATION_MISMATCH");
  return {
    gate: HQ_HYDRATION_PARITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["SSR_CLIENT_MATCH"],
  };
}

export function evaluateHQInitialSnapshotConsistencyGate(input: {
  serverSnapshot: string;
  clientInitialSnapshot: string;
  pollingAfterHydration: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.serverSnapshot !== input.clientInitialSnapshot) reasons.push("SNAPSHOT_MISMATCH");
  if (!input.pollingAfterHydration) reasons.push("NO_POST_HYDRATION_POLL");
  return {
    gate: HQ_INITIAL_SNAPSHOT_CONSISTENCY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["SNAPSHOT_A_THEN_POLL_B"],
  };
}

export function evaluateHQRenderedRuntimeIntegrityGate(input: {
  serverRenderErrors: number;
  hydrationErrors: number;
  recoverableReactErrors: number;
  uncaughtRuntimeErrors: number;
  infinityConsoleErrors: number;
}): HqNamedGate {
  const reasons: string[] = [];
  if (input.serverRenderErrors > 0) reasons.push("SERVER_RENDER_ERROR");
  if (input.hydrationErrors > 0) reasons.push("HYDRATION_ERROR");
  if (input.recoverableReactErrors > 0) reasons.push("RECOVERABLE_REACT_ERROR");
  if (input.uncaughtRuntimeErrors > 0) reasons.push("UNCAUGHT_RUNTIME_ERROR");
  if (input.infinityConsoleErrors > 0) reasons.push("INFINITY_CONSOLE_ERROR");
  return {
    gate: HQ_RENDERED_RUNTIME_INTEGRITY_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["RUNTIME_INTEGRITY_CLEAN"],
  };
}
