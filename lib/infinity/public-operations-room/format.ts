import type { PublicActivityLevel, PublicCount, PublicSystemStatus } from "@/lib/infinity/public-operations-projection/types";
import { PUBLIC_COUNT_UNKNOWN } from "@/lib/infinity/public-operations-projection/types";

export function formatPublicCount(value: PublicCount): string {
  if (value === PUBLIC_COUNT_UNKNOWN) return PUBLIC_COUNT_UNKNOWN;
  return String(value);
}

export function isUnknownCount(value: PublicCount): boolean {
  return value === PUBLIC_COUNT_UNKNOWN;
}

export function formatPublicTimestamp(iso: string | null): string {
  if (!iso) return PUBLIC_COUNT_UNKNOWN;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/.exec(iso);
  if (!match) return PUBLIC_COUNT_UNKNOWN;
  return `${match[1]} ${match[2]} UTC`;
}

export function systemStatusLabel(status: PublicSystemStatus): string {
  if (status === "OPERATIONAL") return "Operational";
  if (status === "DEGRADED") return "Live status temporarily unavailable";
  return "Temporarily unavailable";
}

export function departmentMotion(status: PublicActivityLevel): "working" | "scanning" | "reviewing" | "building" | "waiting" | "idle" | "degraded" {
  if (status === "ACTIVE") return "working";
  if (status === "MONITORING") return "scanning";
  if (status === "REVIEWING" || status === "VALIDATING") return "reviewing";
  if (status === "BUILDING" || status === "RESEARCHING") return "building";
  if (status === "WAITING" || status === "UPDATING") return "waiting";
  if (status === "DEGRADED") return "degraded";
  return "idle";
}

export function agentMotion(status: "ACTIVE" | "IDLE"): "working" | "idle" {
  return status === "ACTIVE" ? "working" : "idle";
}
