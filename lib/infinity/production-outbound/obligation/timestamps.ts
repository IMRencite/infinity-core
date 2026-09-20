import type { NamedOutboundLoopGate } from "../closed-loop";

export const COMMUNICATION_DISPLAY_TIMEZONE = "America/New_York" as const;
export const COMMUNICATION_TIMESTAMP_SOURCE = {
  PROVIDER: "PROVIDER",
  RUNTIME: "RUNTIME",
  DATABASE: "DATABASE",
  LOCAL: "LOCAL",
} as const;

export type NormalizedCommunicationTimestamp = {
  raw: string;
  source_timezone: string;
  source: keyof typeof COMMUNICATION_TIMESTAMP_SOURCE | string;
  utc: string;
  display_venture_local: string;
};

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export function normalizeCommunicationTimestamp(input: {
  raw: string;
  source_timezone?: string;
  source?: string;
}): NormalizedCommunicationTimestamp {
  const parsed = Date.parse(input.raw);
  const utc = Number.isFinite(parsed) ? new Date(parsed).toISOString() : input.raw;
  const source_timezone = input.source_timezone ?? "UTC";
  let display = utc;
  try {
    display = new Intl.DateTimeFormat("en-US", {
      timeZone: COMMUNICATION_DISPLAY_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(Number.isFinite(parsed) ? parsed : Date.now());
  } catch {
    display = utc;
  }
  return {
    raw: input.raw,
    source_timezone,
    source: input.source ?? COMMUNICATION_TIMESTAMP_SOURCE.RUNTIME,
    utc,
    display_venture_local: `${display} ${COMMUNICATION_DISPLAY_TIMEZONE}`,
  };
}

export function durationMs(from: string, to: string): number {
  return Date.parse(to) - Date.parse(from);
}

export function evaluateCommunicationTimestampNormalizationGate(row: NormalizedCommunicationTimestamp): NamedOutboundLoopGate {
  const ok = Boolean(row.raw) && row.utc.endsWith("Z") && Boolean(row.display_venture_local);
  return named("CommunicationTimestampNormalizationGate", ok ? "PASS" : "FAIL", [row.utc, row.source_timezone]);
}
