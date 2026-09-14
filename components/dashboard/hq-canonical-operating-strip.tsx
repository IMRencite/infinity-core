import type { ReactNode } from "react";
import Link from "next/link";
import type { HqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection";

export function HqCanonicalOperatingStrip({ projection }: { projection: HqCanonicalOperatingProjection }) {
  return (
    <section data-hq-canonical-operating="true" className="space-y-3 border-b border-white/[0.06] bg-[#070708] px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Canonical operating state</p>
          <h2 className="mt-1 text-[1.05rem] font-semibold text-white">What Infinity is doing</h2>
        </div>
        <p data-hq-system-state={projection.systemState} className="text-[12px] text-zinc-300">
          System: <span className="font-semibold text-white">{projection.systemState}</span>
          {projection.interactiveMissionIdle ? " · no interactive mission executing" : ""}
          {projection.operationallyIdle ? "" : " · not operationally idle"}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Current work" testId="current-work">
          {projection.currentWork.length === 0 ? <p className="text-zinc-500">No interactive mission executing.</p> : projection.currentWork.map((row) => (
            <Line key={row.id} href={row.href} label={row.label} meta={`${row.status} · ${row.nextAction}`} />
          ))}
        </Panel>
        <Panel title="Recent work" testId="recent-work">
          {projection.recentWork.slice(0, 5).map((row) => (
            <Line key={row.eventId} href={row.href} label={row.summary} meta={row.timestamp} />
          ))}
        </Panel>
        <Panel title="Blockers / next actions" testId="blockers">
          {projection.blockers.slice(0, 4).map((row) => (
            <Line key={`${row.ventureId}-${row.code}`} href={row.href} label={row.code} meta={row.requiredAuthorization ? "authorization" : "blocker"} />
          ))}
          {projection.nextActions.map((row) => (
            <Line key={row.id} href={row.href} label={`${row.label}: ${row.nextAction}`} meta={row.status} />
          ))}
        </Panel>
        <Panel title="Runtime / opportunities" testId="runtime">
          <p className="text-zinc-300">Daily cycle: {projection.runtime.lastCycleId ?? "UNKNOWN"}</p>
          <p className="text-zinc-400">Last: {projection.runtime.lastOutcome ?? "UNKNOWN"}</p>
          <p className="text-zinc-400">Next: {projection.runtime.nextRunAt ?? "UNKNOWN"}</p>
          <p className="text-zinc-300">{projection.runtime.performance}</p>
          <p className="text-zinc-300">{projection.opportunityCount} canonical opportunities · {projection.liveTop10Count} live Top 10</p>
          <p className="text-zinc-400">
            Operating ventures: {projection.operatingVentureCount}
            {projection.validatingVentureCount > 0 ? ` · ${projection.validatingVentureCount} in validation` : ""}
            {" · "}
            missions: {projection.activeMissionCount} active
          </p>
        </Panel>
      </div>
    </section>
  );
}

function Panel({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <div data-hq-panel={testId} className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3 text-[12px]">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Line({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <p>
      <Link href={href} className="text-zinc-100 underline-offset-2 hover:underline">{label}</Link>
      <span className="block text-[11px] text-zinc-600">{meta}</span>
    </p>
  );
}
