export type ReasoningMessageRole =
  | "system"
  | "developer"
  | "user"
  | "assistant"
  | "tool"
  | "executive"
  | "planner";

export type ReasoningMessage = {
  id: string;
  role: ReasoningMessageRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ToolCallRecord = {
  id: string;
  toolId: string;
  arguments: Record<string, unknown>;
  status: "proposed" | "denied" | "resolved" | "skipped";
  resultSummary: string | null;
  createdAt: string;
};

export function createReasoningMessage(
  role: ReasoningMessageRole,
  content: string,
  metadata?: ReasoningMessage["metadata"],
): ReasoningMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    metadata,
  };
}

export function appendMessage(
  messages: ReasoningMessage[],
  message: ReasoningMessage,
): ReasoningMessage[] {
  return [...messages, message];
}
