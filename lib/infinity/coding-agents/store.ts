import { randomUUID } from "node:crypto";
import type { CanonicalCodingTask, CodingAgentRun, CodingTelemetryRecord } from "./types";

export class CodingAgentStore {
  tasks = new Map<string, CanonicalCodingTask>();
  runs = new Map<string, CodingAgentRun>();
  telemetry: CodingTelemetryRecord[] = [];
  idempotency = new Map<string, string>();

  scoped(organizationId: string): CodingAgentRun[] {
    return [...this.runs.values()].filter((run) => run.organizationId === organizationId);
  }

  tasksForOrg(organizationId: string): CanonicalCodingTask[] {
    return [...this.tasks.values()].filter((task) => task.organizationId === organizationId);
  }
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
