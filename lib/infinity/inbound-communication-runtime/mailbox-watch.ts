export type MailboxWatchImplementation = {
  capability: "communication.email.mailbox_watch";
  abstraction: "BUILT";
  push: "NOT_IMPLEMENTED";
  fallback: "BOUNDED_INCREMENTAL_HISTORY_POLL";
  fakePush: false;
};

export function inspectMailboxWatch(): MailboxWatchImplementation {
  return {
    capability: "communication.email.mailbox_watch",
    abstraction: "BUILT",
    push: "NOT_IMPLEMENTED",
    fallback: "BOUNDED_INCREMENTAL_HISTORY_POLL",
    fakePush: false,
  };
}

export function boundedHistoryPollPlan(input: { historyId?: string | null; trackedThreadIds: string[] }): {
  mode: "INCREMENTAL_HISTORY_WHEN_SCOPE_AVAILABLE";
  trackedThreadIds: string[];
  startHistoryId: string | null;
  livePollExecuted: false;
} {
  return {
    mode: "INCREMENTAL_HISTORY_WHEN_SCOPE_AVAILABLE",
    trackedThreadIds: input.trackedThreadIds,
    startHistoryId: input.historyId ?? null,
    livePollExecuted: false,
  };
}
