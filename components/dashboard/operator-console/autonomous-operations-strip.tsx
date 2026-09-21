"use client";

import { useEffect, useState } from "react";
import type { AutonomousOperationsProjection } from "@/lib/infinity/autonomous-operating-loop/types";
import type { CloudRuntimeHqProjection } from "@/lib/infinity/cloud-runtime/types";
import type { CommunicationSchedulerHqProjection } from "@/lib/infinity/production-outbound/communication-runtime";

type Props = {
  projection?: AutonomousOperationsProjection | null;
  cloudRuntime?: CloudRuntimeHqProjection | null;
  communicationScheduler?: CommunicationSchedulerHqProjection | null;
};

export function AutonomousOperationsStrip({ projection, cloudRuntime, communicationScheduler }: Props) {
  const [live, setLive] = useState<AutonomousOperationsProjection | null>(projection ?? null);
  const [cloud, setCloud] = useState<CloudRuntimeHqProjection | null>(cloudRuntime ?? null);
  const [scheduler, setScheduler] = useState<CommunicationSchedulerHqProjection | null>(communicationScheduler ?? null);

  useEffect(() => {
    setLive(projection ?? null);
    setCloud(cloudRuntime ?? null);
    setScheduler(communicationScheduler ?? null);
  }, [projection, cloudRuntime, communicationScheduler]);

  useEffect(() => {
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/operator-console/hq-live-state", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          autonomousOperating?: AutonomousOperationsProjection;
          cloudRuntime?: CloudRuntimeHqProjection;
          communicationScheduler?: CommunicationSchedulerHqProjection;
        };
        if (!cancelled && json.autonomousOperating) setLive(json.autonomousOperating);
        if (!cancelled && json.cloudRuntime) setCloud(json.cloudRuntime);
        if (!cancelled && json.communicationScheduler) setScheduler(json.communicationScheduler);
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
          <dd data-hq-loop-mission>{mission && mission !== "NONE" ? mission : idle ? "Existing production work" : mission}</dd>
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
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Runtime</dt>
          <dd data-hq-cloud-runtime-surface>{cloud?.distinction ?? "CLOUD"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Cloud state</dt>
          <dd data-hq-cloud-runtime-state>{cloud?.runtime_state ?? "OFFLINE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last wake</dt>
          <dd data-hq-cloud-runtime-last-wake>{cloud?.last_wake_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Cloud next review</dt>
          <dd data-hq-cloud-runtime-next-review>{cloud?.next_review_at ?? "UNSCHEDULED"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Credential Health</div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Credential Health</dt>
          <dd data-hq-gmail-credential-health>{scheduler?.credential_health ?? "DEGRADED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Credential Source</dt>
          <dd data-hq-gmail-config-source>{scheduler?.credential_source ?? "UNAVAILABLE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Fingerprint</dt>
          <dd data-hq-gmail-fingerprint>{scheduler?.credential_fingerprint ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Consecutive Stable Cron Checks</dt>
          <dd data-hq-gmail-consecutive-cron>{scheduler?.consecutive_healthy_cron ?? 0}/5</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Same-Invocation Parity</dt>
          <dd data-hq-gmail-same-invocation-parity>{scheduler?.same_invocation_parity ?? "FAIL"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Credential Failure</dt>
          <dd data-hq-gmail-last-credential-failure>{scheduler?.last_credential_failure_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Successful Exchange</dt>
          <dd data-hq-gmail-last-successful-exchange>{scheduler?.last_successful_exchange_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Startup State</dt>
          <dd data-hq-gmail-startup-state>{scheduler?.startup_state ?? "DEGRADED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Active Deployment</dt>
          <dd data-hq-gmail-active-deployment>{scheduler?.active_deployment_id ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Authoritative Cron</dt>
          <dd data-hq-gmail-last-authoritative-cron>{scheduler?.last_authoritative_cron_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Ignored Stale Observation</dt>
          <dd data-hq-gmail-last-ignored-stale>{scheduler?.last_ignored_stale_observation ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Write Conflict</dt>
          <dd data-hq-gmail-last-write-conflict>{scheduler?.last_write_conflict ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Projection Version</dt>
          <dd data-hq-gmail-projection-version>{scheduler?.credential_projection_version ?? "NONE"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Scheduler Health</div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Communication Scheduler</dt>
          <dd data-hq-communication-scheduler-status>{scheduler?.status ?? "FAILED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Tick</dt>
          <dd data-hq-communication-last-tick>{scheduler?.last_tick_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Gmail Check</dt>
          <dd data-hq-communication-last-gmail>{scheduler?.last_gmail_check_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Mailbox Watch</dt>
          <dd data-hq-communication-watching>{scheduler?.watching ? "WATCHING" : "BLIND"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Business Loop Health</div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Business Loop</dt>
          <dd data-hq-communication-business-loop>{scheduler?.business_loop ?? "DEGRADED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Unresolved Actionable Inbound</dt>
          <dd data-hq-unresolved-actionable-inbound>{scheduler?.unresolved_actionable_inbound ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Oldest Unresolved</dt>
          <dd data-hq-oldest-unresolved>
            {scheduler?.oldest_unresolved_age_ms == null
              ? "NONE"
              : scheduler.oldest_unresolved_age_ms >= 3_600_000
                ? `${Math.floor(scheduler.oldest_unresolved_age_ms / 3_600_000)}h ${Math.floor((scheduler.oldest_unresolved_age_ms % 3_600_000) / 60_000)}m`
                : `${Math.floor(scheduler.oldest_unresolved_age_ms / 60_000)}m`}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Overdue Messages</dt>
          <dd data-hq-overdue-messages>{scheduler?.overdue_messages ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Reconciliation Recoveries</dt>
          <dd data-hq-reconciliation-recoveries>{scheduler?.reconciliation_recoveries ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">End-to-End Communication</dt>
          <dd data-hq-e2e-communication-health>{scheduler?.EndToEndCommunicationHealthGate?.result ?? "FAIL"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Always-On Runtime</dt>
          <dd data-hq-always-on-runtime>{scheduler?.CommunicationRuntimeAlwaysOnGate?.result ?? "FAIL"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Live Reliability</dt>
          <dd data-hq-live-reliability>{scheduler?.live_reliability ?? "0/3"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current Target</dt>
          <dd data-hq-live-turn-target>{scheduler?.live_turn_target ?? "TURN A"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Target Message ID</dt>
          <dd data-hq-live-turn-target-message-id>{scheduler?.live_turn_target_message_id ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current State</dt>
          <dd data-hq-live-turn-target-state>{scheduler?.live_turn_target_state ?? "FAILED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Received</dt>
          <dd data-hq-live-turn-target-received>{scheduler?.live_turn_target_received_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Age</dt>
          <dd data-hq-live-turn-target-age>{scheduler?.live_turn_target_age ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Overdue</dt>
          <dd data-hq-current-overdue>{scheduler?.current_overdue ? "YES" : "NO"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current Actionable Inbound</dt>
          <dd data-hq-current-actionable-inbound>{scheduler?.current_actionable_inbound ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current Intent</dt>
          <dd data-hq-current-intent>{scheduler?.current_intent ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current Stage</dt>
          <dd data-hq-current-stage>{scheduler?.current_stage ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Current Next Action</dt>
          <dd data-hq-current-next-action>{scheduler?.current_next_action ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Job State</dt>
          <dd data-hq-current-job-state>{scheduler?.current_job_state ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Eligible At</dt>
          <dd data-hq-current-eligible-at>{scheduler?.current_eligible_at ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Blocked Reason</dt>
          <dd data-hq-current-blocked-reason>{scheduler?.current_blocked_reason ?? "NONE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Recovery Attempts</dt>
          <dd data-hq-current-recovery-attempts>{scheduler?.current_recovery_attempts ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Provider Reply</dt>
          <dd data-hq-current-provider-reply>{scheduler?.current_provider_reply ?? "NONE"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Communication Obligation</div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Mode</dt>
          <dd data-hq-obligation-mode>{scheduler?.obligation_cutover?.mode ?? "CANARY"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Obligation Worker</dt>
          <dd data-hq-obligation-worker>{scheduler?.obligation_cutover?.worker ?? "LEGACY"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Watchdog</dt>
          <dd data-hq-obligation-watchdog>{scheduler?.obligation_cutover?.watchdog ?? "NOT_LIVE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Planner</dt>
          <dd data-hq-obligation-planner>{scheduler?.obligation_cutover?.planner ?? "LIVE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Semantic Progression</dt>
          <dd data-hq-obligation-semantic>{scheduler?.obligation_cutover?.semantic_progression ?? "LIVE"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Open Obligations</dt>
          <dd data-hq-obligation-open>{scheduler?.obligation_cutover?.open_obligations ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Oldest Age</dt>
          <dd data-hq-obligation-oldest-age>
            {scheduler?.obligation_cutover?.oldest_age_ms == null
              ? "NONE"
              : `${Math.round((scheduler.obligation_cutover.oldest_age_ms ?? 0) / 60000)}m`}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Owner Violations</dt>
          <dd data-hq-obligation-owner-violations>{scheduler?.obligation_cutover?.owner_violations ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Deadline Violations</dt>
          <dd data-hq-obligation-deadline-violations>{scheduler?.obligation_cutover?.deadline_violations ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Outbound Ledger</dt>
          <dd data-hq-obligation-ledger>{scheduler?.obligation_cutover?.outbound_ledger ?? "OFF"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Provider Confirmation</dt>
          <dd data-hq-obligation-confirmation>{scheduler?.obligation_cutover?.provider_confirmation ?? "OFF"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Reconciler Rearms</dt>
          <dd data-hq-obligation-rearms>{scheduler?.obligation_cutover?.reconciler_rearms ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Clean Live Turns</dt>
          <dd data-hq-obligation-clean-turns>{scheduler?.obligation_cutover?.clean_live_turns ?? "0 / 3"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Intended SHA</dt>
          <dd data-hq-intended-sha>{scheduler?.obligation_cutover?.release?.intended_sha ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Intended Deployment</dt>
          <dd data-hq-intended-deployment>{scheduler?.obligation_cutover?.release?.intended_deployment ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Observed SHA</dt>
          <dd data-hq-observed-sha>{scheduler?.obligation_cutover?.release?.observed_sha ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Observed Deployment</dt>
          <dd data-hq-observed-deployment>{scheduler?.obligation_cutover?.release?.observed_deployment ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Release Parity</dt>
          <dd data-hq-release-parity>{scheduler?.obligation_cutover?.release?.release_parity ?? "FAIL"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Cutover Epoch Intended</dt>
          <dd data-hq-epoch-intended>{scheduler?.obligation_cutover?.release?.cutover_epoch_intended ?? "LEGACY"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Cutover Epoch Observed</dt>
          <dd data-hq-epoch-observed>{scheduler?.obligation_cutover?.release?.cutover_epoch_observed ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Configured / Deployed / Promoted / Observed / Loop</dt>
          <dd data-hq-release-phases>
            {`CONFIGURED ${scheduler?.obligation_cutover?.release?.configured ? "YES" : "NO"} · DEPLOYED ${scheduler?.obligation_cutover?.release?.deployed ? "YES" : "NO"} · PROMOTED ${scheduler?.obligation_cutover?.release?.promoted ? "YES" : "NO"} · OBSERVED_RUNNING ${scheduler?.obligation_cutover?.release?.observed_running ? "YES" : "NO"} · BUSINESS_LOOP_HEALTHY ${scheduler?.obligation_cutover?.release?.business_loop_healthy ? "YES" : "NO"}`}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Always-On</dt>
          <dd data-hq-obligation-always-on>{scheduler?.obligation_cutover?.always_on ?? "NOT_PROVEN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">STOP</dt>
          <dd data-hq-obligation-stop>{scheduler?.obligation_cutover?.stop ?? "PAUSED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Scheduler Live</dt>
          <dd data-hq-obligation-scheduler-live>{scheduler?.obligation_cutover?.live_health?.scheduler ?? "DOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Discovery</dt>
          <dd data-hq-obligation-discovery-live>{scheduler?.obligation_cutover?.live_health?.discovery ?? "DOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Worker Live</dt>
          <dd data-hq-obligation-worker-live>{scheduler?.obligation_cutover?.live_health?.worker ?? "DOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Watchdog Live</dt>
          <dd data-hq-obligation-watchdog-live>{scheduler?.obligation_cutover?.live_health?.watchdog ?? "DOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Provider Health</dt>
          <dd data-hq-obligation-provider-live>{scheduler?.obligation_cutover?.live_health?.provider ?? "DEGRADED"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Test Thread Architecture</dt>
          <dd data-hq-obligation-architecture>
            {scheduler?.obligation_cutover?.test_thread_architecture
              ? `Obligation ${scheduler.obligation_cutover.test_thread_architecture.communication_obligation} · Legacy worker ${scheduler.obligation_cutover.test_thread_architecture.legacy_worker} · BLOCKED ${scheduler.obligation_cutover.test_thread_architecture.legacy_blocked} · Reconciler send ${scheduler.obligation_cutover.test_thread_architecture.legacy_reconciler_send}`
              : "SHADOW"}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Next Tick</dt>
          <dd data-hq-communication-next-tick>{scheduler?.next_tick_at ?? "UNKNOWN"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Messages Detected 24h</dt>
          <dd data-hq-communication-detected-24h>{scheduler?.messages_detected_24h ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Waiting Reply Jobs</dt>
          <dd data-hq-communication-waiting-jobs>{scheduler?.waiting_pacing_jobs ?? scheduler?.waiting_jobs ?? 0}</dd>
        </div>
        {scheduler?.pacing_jobs?.length ? scheduler.pacing_jobs.map((job) => (
          <div key={job.job_id} className="col-span-2 sm:col-span-3 rounded border border-zinc-800/80 px-2 py-1.5" data-hq-waiting-pacing="true">
            <dt className="uppercase tracking-wider text-zinc-600">Job state</dt>
            <dd data-hq-waiting-pacing-state>{job.display_state}</dd>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              <div>
                <dt className="uppercase tracking-wider text-zinc-600">Created At</dt>
                <dd data-hq-waiting-pacing-created>{job.created_at}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-zinc-600">Eligible At</dt>
                <dd data-hq-waiting-pacing-eligible>Eligible to send: {job.eligible_at_founder}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-zinc-600">Time Remaining</dt>
                <dd data-hq-waiting-pacing-remaining>{job.time_remaining_label}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-zinc-600">Next Expected Cron</dt>
                <dd data-hq-waiting-pacing-next-cron>Expected scheduler pickup: ~{job.next_expected_cron_founder}</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-wider text-zinc-600">Reason</dt>
                <dd data-hq-waiting-pacing-reason>{job.reason}</dd>
              </div>
            </dl>
          </div>
        )) : null}
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Ready Jobs</dt>
          <dd data-hq-communication-ready-jobs>{scheduler?.ready_jobs ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Failed Jobs</dt>
          <dd data-hq-communication-failed-jobs>{scheduler?.failed_jobs ?? 0}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wider text-zinc-600">Last Error</dt>
          <dd data-hq-communication-last-error>{scheduler?.last_error ?? "NONE"}</dd>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <dt className="uppercase tracking-wider text-zinc-600">Scheduler distinction</dt>
          <dd data-hq-communication-distinction>{scheduler?.distinction ?? "SCHEDULER_NOT_RUNNING"}</dd>
        </div>
      </dl>
    </section>
  );
}
