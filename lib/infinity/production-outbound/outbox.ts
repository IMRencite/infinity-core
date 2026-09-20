import type { OutboundOutboxRecord, OutboxStatus } from "./types";

export function createOutboxRecord(input: {
  id: string;
  idempotency_key: string;
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  channel: OutboundOutboxRecord["channel"];
  now: string;
}): OutboundOutboxRecord {
  return {
    id: input.id,
    idempotency_key: input.idempotency_key,
    prospect_id: input.prospect_id,
    venture_id: input.venture_id,
    campaign_id: input.campaign_id,
    channel: input.channel,
    status: "AUTHORIZED",
    provider_message_id: null,
    created_at: input.now,
    updated_at: input.now,
    claimed_at: null,
    sent_at: null,
    completed: false,
  };
}

export function findOutboxByKey(records: OutboundOutboxRecord[], key: string): OutboundOutboxRecord | undefined {
  return records.find((row) => row.idempotency_key === key);
}

export function claimOutbox(record: OutboundOutboxRecord, now: string): OutboundOutboxRecord | null {
  if (record.status === "SENT" || record.status === "DELIVERED" || record.status === "BOUNCED") return null;
  if (record.completed && record.status !== "FAILED" && record.status !== "REJECTED") return null;
  if ((record.status === "FAILED" || record.status === "REJECTED") && record.provider_message_id) return null;
  if (record.status === "CLAIMED" || record.status === "SENDING") return record;
  return { ...record, status: "CLAIMED", claimed_at: now, updated_at: now, completed: false };
}

export function transitionOutbox(record: OutboundOutboxRecord, status: OutboxStatus, now: string, providerMessageId?: string | null): OutboundOutboxRecord {
  const completed = ["SENT", "DELIVERED", "BOUNCED", "FAILED", "REJECTED", "SUPPRESSED", "CANCELLED"].includes(status);
  return {
    ...record,
    status,
    updated_at: now,
    sent_at: status === "SENT" || status === "DELIVERED" ? now : record.sent_at,
    provider_message_id: providerMessageId ?? record.provider_message_id,
    completed,
  };
}

export function replaceOutbox(records: OutboundOutboxRecord[], next: OutboundOutboxRecord): OutboundOutboxRecord[] {
  const index = records.findIndex((row) => row.id === next.id);
  if (index < 0) return [...records, next];
  const copy = records.slice();
  copy[index] = next;
  return copy;
}
