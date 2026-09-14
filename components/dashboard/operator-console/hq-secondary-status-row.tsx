"use client";

import type { HqHomeOperatingSummary } from "@/lib/infinity/hq-information-architecture/contract";
import type { OperatorVentureSnapshot } from "@/lib/infinity/operator-console/types";
import { HqOperatingSummaryStrip } from "@/components/dashboard/hq-operating-summary-strip";
import { HqMailboxObserverPanel } from "./hq-mailbox-observer-panel";

type MailboxObserver = NonNullable<
  NonNullable<OperatorVentureSnapshot["communicationIntelligence"]>["mailboxObserver"]
>;

export function HqSecondaryStatusRow({
  summary,
  mailbox,
}: {
  summary?: HqHomeOperatingSummary | null;
  mailbox?: MailboxObserver | null;
}) {
  if (!summary && !mailbox) return null;
  return (
    <div
      className="hq-secondary-status-row"
      data-hq-region="secondary-status"
      data-hq-secondary-status-row="true"
    >
      {summary ? <HqOperatingSummaryStrip summary={summary} /> : (
        <section className="hq-secondary-status-panel" data-hq-region="compact-operating-summary" aria-label="System status">
          <p className="hq-secondary-status-panel__title">System Status</p>
          <p className="hq-secondary-status-panel__empty">UNAVAILABLE</p>
        </section>
      )}
      <HqMailboxObserverPanel observer={mailbox} />
    </div>
  );
}
