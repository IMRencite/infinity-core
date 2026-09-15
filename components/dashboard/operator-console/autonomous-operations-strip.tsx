"use client";

import { useEffect, useState } from "react";
import type { AutonomousOperationsProjection } from "@/lib/infinity/autonomous-operating-loop/types";

type Props = {
  projection?: AutonomousOperationsProjection | null;
};

export function AutonomousOperationsStrip({ projection }: Props) {
  const [live, setLive] = useState<AutonomousOperationsProjection | null>(projection ?? null);

  useEffect(() => {
    setLive(projection ?? null);
  }, [projection]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as { autonomousOperating?: AutonomousOperationsProjection };
        if (!cancelled && json.autonomousOperating) setLive(json.autonomousOperating);
      } catch {
        /* keep current projection */
      }
    };
    void pull();
    const timer = window.setInterval(pull, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const view = live ?? projection;
  const idle = !view || view.loop_state === "IDLE_NO_ACTION" || view.loop_state === "BOOTSTRAPPING";
  const mission = view?.current_mission ?? "NONE";
  return (
    <section
      className="hq-command-activity mt-2"
      data-hq-autonomous-operations="true"
      data-hq-loop-state={view?.loop_state ?? "BOOTSTRAPPING"}
      aria-label="Autonomous operations"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Autonomous Operations</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-300 sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Loop state</dt>
          <dd data-hq-loop-state-value>{view?.loop_state ?? "BOOTSTRAPPING"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Venture</dt>
          <dd data-hq-loop-venture>{view?.current_venture ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Mission</dt>
          <dd data-hq-loop-mission>{idle && view?.loop_state !== "MISSION_ACTIVE" ? "IDLE — no active canonical work" : mission}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="uppercase tracking-wider text-zinc-600">Why</dt>
          <dd data-hq-loop-reason>{view?.why_this_mission ?? "NO_ACTIVE_CANONICAL_WORK"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Priority</dt>
          <dd data-hq-loop-priority>{view?.priority ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Expected</dt>
          <dd data-hq-loop-expected>{view?.expected_outcome ?? "Idle"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Next review</dt>
          <dd data-hq-loop-next-review>{view?.next_review ?? "UNSCHEDULED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Rooms</dt>
          <dd data-hq-loop-rooms>{view?.rooms.length ? view.rooms.join(" · ") : "IDLE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Agents</dt>
          <dd data-hq-loop-agents>{view?.agents.join(" · ") ?? "PRESENT_IDLE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last completed</dt>
          <dd data-hq-loop-last-completed>{view?.last_completed_mission ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Exposure</dt>
          <dd data-hq-loop-exposure>${view?.financial_exposure ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Spend required</dt>
          <dd data-hq-loop-spend>${view?.spend_required ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Commitment</dt>
          <dd data-hq-loop-commitment>${view?.commitment_required ?? 0}</dd>
        </div>
        {view?.waiting_condition ? (
          <div className="col-span-2 sm:col-span-3">
            <dt className="uppercase tracking-wider text-zinc-600">Waiting</dt>
            <dd data-hq-loop-waiting>{view.waiting_condition}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
