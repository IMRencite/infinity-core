"use client";

import type { HqHomeOperatingSummary } from "@/lib/infinity/hq-information-architecture/contract";

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

export function HqOperatingSummaryStrip({ summary }: { summary: HqHomeOperatingSummary }) {
  return (
    <section
      data-hq-region="compact-operating-summary"
      data-hq-system-state={summary.systemState}
      data-hq-status-strip="true"
      className="hq-operating-summary-strip hq-secondary-status-panel"
      aria-label="System status"
    >
      <p className="hq-secondary-status-panel__title">System Status</p>
      <dl className="hq-secondary-status-panel__fields">
        <Field label="System State" value={summary.systemState} />
        <Field label="Interactive Mission" value={summary.interactiveMissionIdle ? "IDLE" : "ACTIVE"} />
        <Field label="Operational State" value={summary.operationallyIdle ? "IDLE" : "ACTIVE"} />
        <Field label="Operating Ventures" value={String(summary.operatingVentureCount)} />
        <Field label="Validation" value={String(summary.validatingVentureCount)} />
        <Field label="Opportunities" value={String(summary.opportunityCount)} />
        <Field label="Next Cycle" value={compactTime(summary.nextRunAt)} />
      </dl>
    </section>
  );
}
