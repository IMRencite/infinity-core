import { AGENT_EVENT_TYPES } from "./agent-types";
import type { AgentEventType } from "./agent-types";

export type AgentEventRecord = {
  id: string;
  organizationId: string;
  runId: string;
  eventType: AgentEventType;
  message: string;
  payload: Record<string, unknown>;
  correlationId: string;
  occurredAt: string;
};

export type AgentEventEmitter = {
  emit(event: AgentEventRecord): AgentEventRecord;
  list(runId?: string): AgentEventRecord[];
  clear(): void;
};

export function createInMemoryAgentEventEmitter(): AgentEventEmitter {
  const events: AgentEventRecord[] = [];

  return {
    emit(event) {
      events.push(event);
      return event;
    },
    list(runId) {
      if (!runId) return [...events];
      return events.filter((event) => event.runId === runId);
    },
    clear() {
      events.length = 0;
    },
  };
}

export function buildAgentEvent(input: {
  organizationId: string;
  runId: string;
  eventType: AgentEventType;
  message: string;
  correlationId: string;
  payload?: Record<string, unknown>;
}): AgentEventRecord {
  if (!(AGENT_EVENT_TYPES as readonly string[]).includes(input.eventType)) {
    throw new Error(`Unknown agent event type: ${input.eventType}`);
  }

  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    runId: input.runId,
    eventType: input.eventType,
    message: input.message,
    payload: input.payload ?? {},
    correlationId: input.correlationId,
    occurredAt: new Date().toISOString(),
  };
}
