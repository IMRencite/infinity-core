import { FALSE_INFINITY_STOP_MESSAGE_ID, isValidProspectSuppression, lookupSuppression, type ClosedLoopSuppressionRecord } from "../closed-loop-durable";

export type SuppressionLookupKeys = {
  message: ClosedLoopSuppressionRecord | null;
  thread: ClosedLoopSuppressionRecord | null;
  prospect: ClosedLoopSuppressionRecord | null;
  mailbox: ClosedLoopSuppressionRecord | null;
  venture: ClosedLoopSuppressionRecord | null;
  global: ClosedLoopSuppressionRecord | null;
};

export function lookupSendTimeSuppression(input?: {
  message_id?: string;
  thread_id?: string;
  recipient?: string | null;
}): { record: ClosedLoopSuppressionRecord | null; keys: SuppressionLookupKeys; verdict: "CLEAR" | "BLOCKED" } {
  const current = lookupSuppression(input?.recipient);
  const valid = isValidProspectSuppression(current) ? current : null;
  const keys: SuppressionLookupKeys = {
    message: input?.message_id && valid?.source_message_id === input.message_id ? valid : input?.message_id === FALSE_INFINITY_STOP_MESSAGE_ID ? null : null,
    thread: input?.thread_id && valid?.thread_id === input.thread_id ? valid : null,
    prospect: valid,
    mailbox: valid,
    venture: valid?.venture === "OccupancyNPV" ? valid : null,
    global: valid,
  };
  return { record: valid, keys, verdict: valid ? "BLOCKED" : "CLEAR" };
}
