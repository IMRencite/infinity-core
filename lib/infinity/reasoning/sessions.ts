import { DEFAULT_REASONING_RUNTIME_VERSION } from "./constants";
import { defaultReasoningConstraints } from "./constraints";
import type { ReasoningSession, ReasoningSessionRefs } from "./types";

export function createReasoningSession(
  refs: ReasoningSessionRefs,
  partial?: { id?: string },
): ReasoningSession {
  const now = new Date().toISOString();

  return {
    id: partial?.id ?? crypto.randomUUID(),
    refs,
    status: "draft",
    context: null,
    memoryRefIds: [],
    messages: [],
    toolCalls: [],
    constraints: defaultReasoningConstraints(),
    composedPrompts: null,
    selectedProviderId: null,
    selectedModel: null,
    advisoryOutputs: [],
    pipelineStageResults: {},
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function transitionSessionStatus(
  session: ReasoningSession,
  status: ReasoningSession["status"],
): ReasoningSession {
  const now = new Date().toISOString();
  return {
    ...session,
    status,
    updatedAt: now,
    completedAt:
      status === "completed" || status === "failed" || status === "cancelled"
        ? now
        : session.completedAt,
  };
}

export function withSessionContext(
  session: ReasoningSession,
  context: NonNullable<ReasoningSession["context"]>,
): ReasoningSession {
  return {
    ...session,
    context,
    status: session.status === "draft" ? "context_ready" : session.status,
    updatedAt: new Date().toISOString(),
  };
}

export function toPersistableSession(session: ReasoningSession) {
  return {
    ...session,
    persistVersion: DEFAULT_REASONING_RUNTIME_VERSION,
  };
}

export function freezeSessionSnapshot(session: ReasoningSession): ReasoningSession {
  return structuredClone(session);
}
