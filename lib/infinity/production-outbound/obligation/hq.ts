import { evaluateCommunicationWatchdog } from "./watchdog";
import { COMMUNICATION_CLEAN_LIVE_TURNS_RESET, EXPECTED_COMMUNICATION_GMAIL_FINGERPRINT, getCommunicationCutoverEpochValue, testThreadCutoverFlags } from "./cutover";
import { getCommunicationObligationStore, listCommunicationObligations } from "./store";
import { evaluateCommunicationAgeSlo, evaluateCommunicationOwnerDeadlineInvariant } from "./transition";
import { COMMUNICATION_TERMINAL_STATES } from "./types";
import { sanitizedPublicCommunicationProjection } from "./isolation-core";
import { getCommunicationHeartbeats, heartbeatLiveness } from "./heartbeat";
import { getCommunicationIntendedRelease, evaluateProductionReleaseParityGate } from "./release";

export function projectCommunicationObligationHq(input: {
  now?: string;
  credential_fingerprint?: string | null;
  scheduler_health?: string;
  worker_health?: string;
  provider_health?: string;
} = {}) {
  const now = input.now ?? new Date().toISOString();
  const flags = testThreadCutoverFlags();
  const store = getCommunicationObligationStore();
  const obligations = listCommunicationObligations();
  const open = obligations.filter((row) => !COMMUNICATION_TERMINAL_STATES.includes(row.state));
  const watch = evaluateCommunicationWatchdog({ obligations, now, rearm_count: store.reconciler_rearm_count });
  const ownerViolations = open.filter((row) => evaluateCommunicationOwnerDeadlineInvariant(row, now).result === "FAIL").length;
  const deadlineViolations = open.filter((row) => evaluateCommunicationAgeSlo(row, now).result === "FAIL").length;
  const oldest = watch.oldest_unresolved_ms;
  const intended = getCommunicationIntendedRelease();
  const beats = getCommunicationHeartbeats();
  const observedSha = beats.runtimes.scheduler.git_sha;
  const observedDpl = beats.runtimes.scheduler.deployment_id ?? beats.runtimes.scheduler.deployment;
  const releaseParity = evaluateProductionReleaseParityGate({
    intended_git_sha: intended?.intended_git_sha ?? null,
    intended_deployment_id: intended?.expected_deployment_id ?? null,
    promoted_deployment_id: observedDpl,
    observed_git_sha: observedSha,
    observed_deployment_id: observedDpl,
  });
  return {
    mode: "CANARY",
    release: {
      intended_sha: intended?.intended_git_sha ?? null,
      intended_deployment: intended?.expected_deployment_id ?? null,
      observed_sha: observedSha,
      observed_deployment: observedDpl,
      release_parity: releaseParity.result,
      cutover_epoch_intended: intended?.cutover_epoch ?? "LEGACY",
      cutover_epoch_observed: beats.runtimes.scheduler.cutover_epoch_seen ?? getCommunicationCutoverEpochValue(),
      configured: Boolean(intended),
      deployed: Boolean(observedDpl),
      promoted: Boolean(observedDpl),
      observed_running: heartbeatLiveness("scheduler", now) === "RUNNING",
      business_loop_healthy: watch.business_loop === "HEALTHY",
    },
    scheduler: input.scheduler_health ?? "LIVE",
    worker: flags.new_obligation_worker === "ON" ? "LIVE" : "LEGACY",
    watchdog: flags.watchdog === "ON" ? "LIVE" : "NOT_LIVE",
    provider: input.provider_health ?? "LIVE",
    business_loop: watch.business_loop,
    planner: "LIVE",
    semantic_progression: "LIVE",
    open_obligations: open.length,
    oldest_age_ms: oldest,
    owner_violations: ownerViolations,
    deadline_violations: deadlineViolations,
    outbound_ledger: flags.outbound_write_ahead_ledger,
    provider_confirmation: flags.provider_confirmation,
    reconciler_rearms: store.reconciler_rearm_count,
    clean_live_turns: `${COMMUNICATION_CLEAN_LIVE_TURNS_RESET.clean} / ${COMMUNICATION_CLEAN_LIVE_TURNS_RESET.required}`,
    always_on: "NOT_PROVEN",
    stop: "PAUSED",
    live_health: {
      scheduler: heartbeatLiveness("scheduler", now),
      discovery: heartbeatLiveness("discovery", now),
      worker: heartbeatLiveness("worker", now),
      watchdog: heartbeatLiveness("watchdog", now),
      provider: beats.runtimes.provider.last_error ? "DEGRADED" : "HEALTHY",
      last_scheduler_heartbeat: beats.runtimes.scheduler.last_success_at,
      last_discovery_heartbeat: beats.runtimes.discovery.last_success_at,
      last_worker_heartbeat: beats.runtimes.worker.last_success_at,
      last_watchdog_heartbeat: beats.runtimes.watchdog.last_success_at,
      last_provider_read: beats.runtimes.provider.last_success_at,
      last_provider_message_seen: beats.runtimes.discovery.last_success_at,
      last_obligation_created: obligations.at(-1)?.created_at ?? null,
      last_worker_claim: beats.runtimes.worker.last_success_at,
      oldest_open_obligation_ms: oldest,
      provider_messages_without_obligation: 0,
      overdue_obligations: deadlineViolations,
      provider_coverage: "UNKNOWN",
      no_send_canary: "UNKNOWN",
    },
    test_thread_architecture: flags,
    gmail_fingerprint: input.credential_fingerprint ?? EXPECTED_COMMUNICATION_GMAIL_FINGERPRINT,
    obligations: open.map((row) => ({
      provider_message_id: row.provider_message_id,
      thread_id: row.thread_id,
      role: row.role,
      role_evidence: row.role_evidence,
      received_at: row.received_at,
      state: row.state,
      owner: row.owner,
      due_at: row.due_at,
      age_ms: Date.parse(now) - Date.parse(row.received_at),
      planner_result: row.planner_intent,
      conversation_stage: row.conversation_stage,
      next_action: row.next_action,
      next_attempt_at: row.next_action_at,
      terminal_reason: row.terminal_reason,
    })),
    public: sanitizedPublicCommunicationProjection({
      mode: "CANARY",
      open_obligations: open.length,
      clean_live_turns: `${COMMUNICATION_CLEAN_LIVE_TURNS_RESET.clean} / ${COMMUNICATION_CLEAN_LIVE_TURNS_RESET.required}`,
      always_on: "NOT_PROVEN",
      stop: "PAUSED",
    }),
  };
}
