import type { ProviderExecutionTelemetry } from "./types";

const telemetry: ProviderExecutionTelemetry[] = [];

export function recordProviderTelemetry(entry: ProviderExecutionTelemetry): void {
  telemetry.push(entry);
}

export function listProviderTelemetry(filter?: {
  correlationId?: string;
  providerId?: string;
}): ProviderExecutionTelemetry[] {
  return telemetry.filter((entry) => {
    if (filter?.correlationId && entry.correlationId !== filter.correlationId) {
      return false;
    }
    if (filter?.providerId && entry.providerId !== filter.providerId) {
      return false;
    }
    return true;
  });
}

export function clearProviderTelemetry(): void {
  telemetry.length = 0;
}
