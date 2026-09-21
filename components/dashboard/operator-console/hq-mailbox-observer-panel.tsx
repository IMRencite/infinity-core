"use client";

import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";

type MailboxObserver = NonNullable<
  NonNullable<OperatorVentureSnapshot["communicationIntelligence"]>["mailboxObserver"]
>;

function mailboxDisplayStatus(status: MailboxObserver["status"] | null): string {
  if (status === "RUNNING") return "HEALTHY";
  if (status === "DEGRADED") return "DEGRADED";
  if (status === "STOPPED") return "FAILED";
  return "UNAVAILABLE";
}

function compactTime(value: string | null): string {
  if (!value) return "NONE";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="hq-secondary-status-panel__field">
      <dt>{label}</dt>
      <dd title={value}>{value}</dd>
    </div>
  );
}

export function HqMailboxObserverPanel({
  observer,
}: {
  observer: MailboxObserver | null | undefined;
}) {
  const status = observer?.status ?? null;
  return (
    <section
      className="hq-secondary-status-panel hq-mailbox-observer-panel"
      data-hq-region="mailbox-observer"
      data-mailbox-observer-status={status ?? "UNAVAILABLE"}
      aria-label="Mailbox observer"
    >
      <p className="hq-secondary-status-panel__title">Mailbox Observer</p>
      <dl className="hq-secondary-status-panel__fields">
        <Field label="Status" value={mailboxDisplayStatus(status)} />
        <Field label="Provider" value={observer?.provider ?? "NONE"} />
        <Field label="Tracked" value={observer ? String(observer.trackedConversations) : "0"} />
        <Field label="Last Observation" value={compactTime(observer?.lastSuccessfulObservation ?? null)} />
        <Field label="Last Inbound" value={compactTime(observer?.lastInboundProcessed ?? null)} />
        {observer?.lastProviderError ? (
          <Field label="Last Error" value={observer.lastProviderError} />
        ) : (
          <Field label="Last Error" value="NONE" />
        )}
      </dl>
    </section>
  );
}
