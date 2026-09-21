import type { ReactNode } from "react";
import Link from "next/link";
import type { HqCanonicalOperatingProjection } from "@/lib/infinity/hq-canonical-projection";
import type { HQWorkerVisualStateRecord } from "@/lib/infinity/hq-live-activity";
import { HQ_ROUTES } from "@/lib/infinity/hq/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";

export type OperationsRoomDetailDto = {
  workers: HQWorkerVisualStateRecord[];
  currentWork: string | null;
  recentOutputs: string[];
};

export function HqOperationsRoom({
  projection,
  operationsDetail = null,
}: {
  projection: HqCanonicalOperatingProjection;
  operationsDetail?: OperationsRoomDetailDto | null;
}) {
  return (
    <article data-hq-operations-room="true" className="space-y-6 text-zinc-200">
      <header>
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">HQ Operating Floor → Operations Room</p>
        <h1 className="mt-2 text-[1.75rem] font-semibold text-white">What Infinity is doing</h1>
        <p data-hq-system-state={projection.systemState} className="mt-2 text-[14px] text-zinc-400">
          Founder-facing operational observability. Read-only canonical projection.
          {" · "}System: <span className="font-semibold text-white">{projection.systemState}</span>
          {projection.interactiveMissionIdle ? " · no interactive mission executing" : ""}
          {projection.operationallyIdle ? "" : " · not operationally idle"}
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Current work" testId="current-work">
          {projection.currentWork.length === 0 ? (
            <p className="text-zinc-500">No interactive mission executing.</p>
          ) : (
            projection.currentWork.map((row) => (
              <Line key={row.id} href={row.href} label={row.label} meta={`${row.status} · ${row.nextAction}`} />
            ))
          )}
        </Panel>
        <Panel title="Recent work" testId="recent-work">
          {projection.recentWork.slice(0, 8).map((row) => (
            <Line key={row.eventId} href={row.href} label={row.summary} meta={`${row.timestamp} · ${row.traceability}`} />
          ))}
        </Panel>
        <Panel title="Blockers" testId="blockers">
          {projection.blockers.length === 0 ? <p className="text-zinc-500">No current blockers.</p> : null}
          {projection.blockers.map((row) => (
            <Line key={`${row.ventureId}-${row.code}`} href={row.href} label={row.code} meta={row.requiredAuthorization ? "authorization" : "blocker"} />
          ))}
        </Panel>
        <Panel title="Next actions" testId="next-actions">
          {projection.nextActions.map((row) => (
            <Line key={row.id} href={row.href} label={`${row.label}: ${row.nextAction}`} meta={row.status} />
          ))}
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Runtime summary" testId="runtime">
          <p className="text-zinc-300">Daily cycle: {projection.runtime.lastCycleId ?? "UNKNOWN"}</p>
          <p className="text-zinc-400">Last: {projection.runtime.lastOutcome ?? "UNKNOWN"}</p>
          <p className="text-zinc-400">Next: {projection.runtime.nextRunAt ?? "UNKNOWN"}</p>
          <p className="text-zinc-300">{projection.runtime.performance}</p>
          <p className="text-zinc-400">Failures: {projection.runtime.consecutiveFailures} · {projection.runtime.lastError ?? "none"}</p>
          <p className="text-zinc-500">Portfolio cycle: {projection.runtime.portfolioCycle}</p>
          <Link href={HQ_ROUTES.runtime} className="mt-2 inline-block text-zinc-200 underline-offset-2 hover:underline">
            Open Runtime mechanics
          </Link>
        </Panel>
        <Panel title="Venture operating state" testId="ventures">
          <Line
            href={HQ_ROUTES.ventureDetail(CRE_VENTURE_ID)}
            label={`OccupancyNPV · ${projection.occupancynpv.hqLifecycle}`}
            meta={`${projection.occupancynpv.domain} · payment ${projection.occupancynpv.payment} · path ${projection.occupancynpv.paymentPathHealth} · last ${projection.occupancynpv.lastLiveVerification ?? "NEVER"} · next ${projection.occupancynpv.nextVerification ?? "UNSCHEDULED"} · checkout ${projection.occupancynpv.checkoutHealth}${projection.occupancynpv.commercialIncident ? ` · ${projection.occupancynpv.commercialIncident}` : ""} · ${projection.occupancynpv.realObservations} observations`}
          />
          <Line
            href={`/dashboard/opportunities/${ASKREVIEW_CANDIDATE_ID}`}
            label={`AskReview · ${projection.askreview.canonicalState}`}
            meta={`${projection.askreview.currentBlocker} · payment ${projection.askreview.payment}`}
          />
          <p className="text-zinc-400">
            Operating ventures: {projection.operatingVentureCount}
            {projection.validatingVentureCount > 0 ? ` · ${projection.validatingVentureCount} in validation` : ""}
          </p>
        </Panel>
      </div>

      {operationsDetail ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Operations workers" testId="workers">
            {operationsDetail.workers.map((worker) => (
              <p
                key={worker.workerId}
                data-hq-worker-visual-state={worker.visualState}
                data-hq-worker-glow={worker.glow ? "true" : "false"}
              >
                <span className="text-zinc-100">{worker.workerId}</span>
                <span className="block text-[11px] text-zinc-600">
                  {worker.visualState} · {worker.accessibleState}
                  {worker.currentTask ? ` · ${worker.currentTask}` : ""}
                </span>
              </p>
            ))}
          </Panel>
          <Panel title="Recent operating outputs" testId="operating-outputs">
            {operationsDetail.recentOutputs.length === 0 ? (
              <p className="text-zinc-500">No recent operating outputs.</p>
            ) : (
              operationsDetail.recentOutputs.map((output) => (
                <p key={output} className="text-zinc-300">{output}</p>
              ))
            )}
            {operationsDetail.currentWork ? (
              <p className="text-zinc-500">Current: {operationsDetail.currentWork}</p>
            ) : null}
          </Panel>
        </div>
      ) : null}

      <Panel title="Opportunity changes" testId="opportunities">
        <p className="text-zinc-300">
          {projection.opportunityCount} canonical opportunities · {projection.liveTop10Count} live Top 10
        </p>
        <Link href={HQ_ROUTES.opportunities} className="text-zinc-200 underline-offset-2 hover:underline">
          Open full opportunity universe
        </Link>
      </Panel>
    </article>
  );
}

function Panel({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <div data-hq-panel={testId} className="rounded-lg border border-white/[0.06] bg-[#0b0b0b] px-3 py-3 text-[12px]">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">{title}</p>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Line({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <p>
      <Link href={href} className="text-zinc-100 underline-offset-2 hover:underline">
        {label}
      </Link>
      <span className="block text-[11px] text-zinc-600">{meta}</span>
    </p>
  );
}
