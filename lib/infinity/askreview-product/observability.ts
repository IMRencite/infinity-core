import { randomBytes } from "node:crypto";
import { getAskReviewStore, saveAskReviewStore } from "./store";
import type { AskReviewEvent } from "./types";

export function emitAskReviewEvent(input: {
  type: string;
  accountId?: string | null;
  locationId?: string | null;
  outcome: string;
}): AskReviewEvent {
  const event: AskReviewEvent = {
    eventId: `evt_${randomBytes(8).toString("hex")}`,
    type: input.type,
    accountId: input.accountId ?? null,
    locationId: input.locationId ?? null,
    outcome: input.outcome,
    createdAt: new Date().toISOString(),
  };
  const store = getAskReviewStore();
  store.events.push(event);
  if (store.events.length > 500) store.events.splice(0, store.events.length - 500);
  saveAskReviewStore(store);
  return event;
}

export function listAskReviewEvents(accountId?: string): AskReviewEvent[] {
  const events = getAskReviewStore().events;
  if (!accountId) return events;
  return events.filter((row) => row.accountId === accountId);
}
