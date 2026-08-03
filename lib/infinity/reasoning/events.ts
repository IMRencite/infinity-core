import { REASONING_ENGINE_NAME } from "./constants";
import type { ReasoningEventRecord, ReasoningEventType } from "./types";

export type ReasoningEventEmitter = {
  emit(event: ReasoningEventRecord): ReasoningEventRecord;
  list(sessionId?: string): ReasoningEventRecord[];
  clear(): void;
};

export function createInMemoryReasoningEventEmitter(): ReasoningEventEmitter {
  const events: ReasoningEventRecord[] = [];

  return {
    emit(event) {
      events.push(event);
      return event;
    },
    list(sessionId) {
      if (!sessionId) return [...events];
      return events.filter((event) => event.sessionId === sessionId);
    },
    clear() {
      events.length = 0;
    },
  };
}

export function buildReasoningEvent(input: {
  organizationId: string;
  sessionId: string;
  eventType: ReasoningEventType;
  message: string;
  correlationId: string;
  payload?: Record<string, unknown>;
}): ReasoningEventRecord {
  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    sessionId: input.sessionId,
    eventType: input.eventType,
    message: input.message,
    payload: {
      engine: REASONING_ENGINE_NAME,
      ...(input.payload ?? {}),
    },
    correlationId: input.correlationId,
    occurredAt: new Date().toISOString(),
  };
}
