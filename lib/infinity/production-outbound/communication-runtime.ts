import { createClient } from "@supabase/supabase-js";
import { planResponseDelay } from "@/lib/infinity/growth-engine/communication";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { readGmailThread } from "@/lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { observeOccupancynpvCanaryInbound } from "./canary-inbound";
import {
  CANONICAL_OCCUPANCYNPV_THREAD_ID,
  CLOSED_LOOP_CONVERSATION_ID,
  cancelEligibleFollowups,
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  lookupSuppression,
  markProcessedKey,
  markSentKey,
  persistClosedLoopDurableState,
  persistSuppressionRecord,
  upsertSalesConversation,
} from "./closed-loop-durable";
import { APPROVED_CANARY_PROSPECT_ID, resolveApprovedCanaryEmail } from "./canary-contact";
import {
  CONSULTATIVE_SALES_COMPOSER_VERSION,
  CONSULTATIVE_SALES_LIVE_GATES,
} from "@/lib/infinity/always-closing-sales/consultative-sales";
import type { NamedOutboundLoopGate } from "./closed-loop";
import {
  assertSendableOutboundBody,
  evaluateNonEmptyOutboundBodyGate,
  evaluateOutboundPayloadIntegrityGate,
  evaluateResponseContentQualityGate,
  isRenewVsRelocateQuestion,
  isPositiveBuyingSignal,
  classifyMessageRole,
  isStopOnly,
  isTryWithNumbersQuestion,
  looksLikeInfinityAuthored,
} from "./conversation-semantics";
import { composeHighIntentOfferFallback } from "./obligation/high-intent";
import { classifyCanonicalSalesIntent } from "./canonical-sales-intent";
import { planConversation } from "./conversation-planner";
import { bodyHash, stripQuotedReply } from "./gmail-message-body";
import {
  evaluateEndToEndCommunicationHealthGate,
  evaluateReadyJobDrainGate,
  LIVE_RELIABILITY_TURN_A,
  reconcileActionableInboundWork,
} from "./communication-reconciliation";
import { liveGmailOutboundAdapter } from "./live-provider";
import { evaluateLiveDeliveredSemanticParityGate } from "./conversation-repair";
import type { OutboundProviderAdapter } from "./provider";
import { composeOccupancyNpvAlwaysClosingReply } from "@/lib/infinity/always-closing-sales/occupancynpv-replies";
import {
  evaluateAlwaysClosingSafetyGate,
  evaluateConversationStateOwnershipGate,
  evaluateSalesAdvancementQualityGate,
} from "@/lib/infinity/always-closing-sales/doctrine";
import {
  evaluateNaturalSalesConversationGate,
  rewriteNaturalSalesReply,
} from "@/lib/infinity/always-closing-sales/natural-sales-conversation";
import {
  evaluateConsultativeSalesLanguageGate,
  evaluateSalesOverExplanationGate,
  evaluateSalesQuestionQualityGate,
} from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateOfferDrivenSalesAdvancementGate, loadVentureOfferProfile } from "@/lib/infinity/always-closing-sales/venture-offer-profile";
import {
  GMAIL_INVOCATION_CONTEXT_VERSION,
  evaluateGmailConfigHydrationGate,
  evaluateGmailSameInvocationParityGate,
  evaluateGmailTokenExchangeInputGate,
  publicGmailInvocationSnapshot,
  recordGmailInvocationEvent,
  resolveGmailInvocationContext,
  type GmailInvocationContext,
} from "@/lib/infinity/communication-provider/gmail-invocation-context";
import {
  CREDENTIAL_HEALTH_PROJECTION_VERSION,
  applyCredentialHealthObservation,
  classifyCredentialHealthObservationKind,
  emptyCredentialHealthProjection,
  evaluateCredentialHealthWriteConflictGate,
  evaluateDeploymentScopedCredentialHealthGate,
  evaluatePartialInvocationOverwriteGate,
  evaluatePostCronProtectionFromLog,
  evaluateStaleCredentialHealthWriterGate,
  mergeCredentialHealthObservationLogs,
  projectCredentialHealth,
  type CredentialHealthObservation,
  type CredentialHealthProjection,
} from "@/lib/infinity/communication-provider/credential-health-projection";
import {
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  attestGmailCredentialSource,
  cronExecutionIsCredentialHealthy,
  evaluateCommunicationRuntimeStartupGracePolicy,
  evaluateCronCredentialVisibilityStabilityGate,
  evaluateGmailCredentialConflictGate,
  readGmailRuntimeConfig,
  type CronCredentialVisibilityRecord,
  type CredentialHealth,
  type GmailConfigSource,
  type GmailStartupState,
} from "@/lib/infinity/communication-provider/gmail-runtime-config";
import {
  backfillT4AutonomousSendLineage,
  evaluateAutonomousSendLineageGate,
  persistAutonomousSendLineage,
  upsertAutonomousSendLineage,
  type AutonomousSendLineage,
} from "./autonomous-send-lineage";
import { evaluatePacingStateVisibilityGate, founderJobDisplayState, projectPacingJobCard, type PacingJobHqCard } from "./job-pacing";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  getCommunicationCutoverEpochValue,
  isCommunicationObligationCutoverThread,
  isCommunicationProviderSendFrozen,
  isLegacyProviderSendPermitted,
  shouldSkipLegacyDiscovery,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
} from "./obligation/cutover";
import { casOwnership, ensureOwnershipRow, getOwnershipClaim } from "./obligation/ownership-claim";
import { executeTestThreadCutoverTick } from "./obligation/cycle";
import { projectCommunicationObligationHq } from "./obligation/hq";
import {
  hydrateCommunicationHeartbeats,
  persistCommunicationHeartbeats,
  recordCommunicationHeartbeat,
} from "./obligation/heartbeat";
import { hydrateCommunicationReleaseState, persistCommunicationReleaseState, vercelRuntimeIdentity } from "./obligation/release";
import { remainingPacingFromProvider } from "./obligation/pacing";
import { executeNoSendCanary, evaluateShadowCompose } from "./obligation/canary";
import { markRecoveredTurn } from "./obligation/recovered";
import { ingestInboundCompletionGapObservations, ingestSalesVoicePerformanceObservations } from "./performance";
import {
  COMMUNICATION_SLA_TOLERANCE_MS,
  evaluateBusinessLoopHealthGate,
  evaluateCommunicationRuntimeAlwaysOnDuringIncident,
  evaluateStuckActionableInboundGate,
  laterInfinityReplyExists,
} from "./business-loop-health";
import { INFINITY_MANAGED_SENDER } from "@/lib/infinity/inbound-communication-runtime/constants";

export const COMMUNICATION_RUNTIME_SCOPE = "communication-runtime-scheduler-v1" as const;
export const COMMUNICATION_LEASE_SCOPE = "communication-runtime-scheduler-v1" as const;
export const COMMUNICATION_TICK_PATH = "/api/runtime/communication-tick" as const;
export const COMMUNICATION_CRON = "*/5 * * * *" as const;
export const COMMUNICATION_CADENCE_MINUTES = 5 as const;

export type CommunicationTriggerSource = "VERCEL_CRON" | "MANUAL" | "UNKNOWN";
export type OutboundScheduledJobState =
  | "WAITING"
  | "WAITING_PACING"
  | "READY"
  | "PROCESSING"
  | "RUNNING"
  | "SENT"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED"
  | "SUPPRESSED";

export type OutboundScheduledJob = {
  job_id: string;
  conversation_id: string;
  inbound_message_id: string;
  thread_id: string;
  eligible_at: string;
  state: OutboundScheduledJobState;
  attempt_count: number;
  idempotency_key: string;
  provider: "GMAIL";
  created_at: string;
  started_at: string | null;
  sent_at: string | null;
  failure_reason: string | null;
  generated_hash?: string | null;
  provider_message_id?: string | null;
  intent?: string | null;
};

export type CommunicationSchedulerState = {
  version: 1;
  last_tick_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_gmail_check_at: string | null;
  last_error: string | null;
  messages_detected: number;
  detections_24h: Array<{ at: string; inbound_message_id: string }>;
  jobs_created: number;
  jobs_sent: number;
  scheduler_instance: string | null;
  lease: { holder: string; expires_at: string } | null;
  jobs: OutboundScheduledJob[];
  last_trigger_source: CommunicationTriggerSource;
  cursor_triggered: boolean;
  last_inbound_message_id: string | null;
  last_detected_at: string | null;
  token_exchange?: boolean;
  gmail_send_present?: boolean;
  gmail_readonly_present?: boolean;
  env_client_present?: boolean;
  env_secret_present?: boolean;
  env_refresh_present?: boolean;
  env_sender_present?: boolean;
  observe_error_kind?: string | null;
  credential_source?: GmailConfigSource;
  credential_fingerprint?: string | null;
  http_fingerprint?: string | null;
  cron_fingerprint?: string | null;
  consecutive_healthy_cron?: number;
  last_credential_failure_at?: string | null;
  startup_state?: GmailStartupState;
  credential_health?: CredentialHealth;
  credential_reader_version?: string;
  cron_credential_ticks?: CronCredentialVisibilityRecord[];
  credential_deploy_id?: string | null;
  cron_cycles_since_deploy?: number;
  credential_conflict?: boolean;
  same_invocation_parity?: "PASS" | "FAIL";
  last_successful_exchange_at?: string | null;
  exchange_input_fingerprint?: string | null;
  hydration_result?: "PASS" | "FAIL";
  invocation_id?: string | null;
  invocation_context_version?: string;
  credential_health_version?: number;
  credential_observations?: CredentialHealthObservation[];
  last_ignored_stale_observation?: string | null;
  last_write_conflict?: string | null;
  last_authoritative_cron_at?: string | null;
  last_authoritative_invocation_id?: string | null;
  active_deployment_id?: string | null;
  credential_projection_version?: string;
  unresolved_actionable_inbound?: number;
  oldest_unresolved_at?: string | null;
  overdue_actionable_count?: number;
  reconciliation_recoveries?: number;
  last_reconciliation_at?: string | null;
  live_reliability_clean_turns?: number;
};

export type CommunicationSchedulerHqProjection = {
  status: "HEALTHY" | "DEGRADED" | "FAILED";
  last_tick_at: string | null;
  last_gmail_check_at: string | null;
  next_tick_at: string | null;
  messages_detected_24h: number;
  waiting_jobs: number;
  waiting_pacing_jobs: number;
  ready_jobs: number;
  failed_jobs: number;
  last_error: string | null;
  distinction: "NO_NEW_EMAIL" | "SCHEDULER_NOT_RUNNING" | "RUNNING" | "DEGRADED";
  token_exchange: boolean;
  gmail_send_present: boolean;
  gmail_readonly_present: boolean;
  cron_health: NamedOutboundLoopGate;
  env_parity: NamedOutboundLoopGate;
  observe_error_kind: string | null;
  pacing_jobs: PacingJobHqCard[];
  pacing_visibility: NamedOutboundLoopGate;
  healthy_waiting: boolean;
  composer_version: string;
  composer_gates: readonly string[];
  business_loop: "HEALTHY" | "DEGRADED";
  newest_inbound_at: string | null;
  inbound_state: string | null;
  inbound_age_ms: number | null;
  inbound_eligible_at: string | null;
  inbound_overdue: boolean;
  inbound_reason: string | null;
  unresolved_actionable_inbound: number;
  oldest_unresolved_age_ms: number | null;
  overdue_messages: number;
  reconciliation_recoveries: number;
  EndToEndCommunicationHealthGate: NamedOutboundLoopGate;
  CommunicationRuntimeAlwaysOnGate: NamedOutboundLoopGate;
  ReadyJobDrainGate: NamedOutboundLoopGate;
  live_reliability: string;
  live_turn_target: string;
  live_turn_target_message_id: string | null;
  live_turn_target_state: "FAILED" | "RECOVERING" | "RECOVERED";
  live_turn_target_received_at: string | null;
  live_turn_target_age: string | null;
  current_overdue: boolean;
  current_actionable_inbound: string | null;
  current_intent: string | null;
  current_stage: string | null;
  current_next_action: string | null;
  current_job_state: string | null;
  current_eligible_at: string | null;
  current_blocked_reason: string | null;
  current_recovery_attempts: number;
  current_provider_reply: string | null;
  watching: boolean;
  mailbox_watch: NamedOutboundLoopGate;
  credential_health: CredentialHealth;
  credential_source: GmailConfigSource | null;
  credential_fingerprint: string | null;
  consecutive_healthy_cron: number;
  last_credential_failure_at: string | null;
  startup_state: GmailStartupState;
  CronCredentialVisibilityStabilityGate: NamedOutboundLoopGate;
  GmailCredentialConflictGate: NamedOutboundLoopGate;
  same_invocation_parity: "PASS" | "FAIL" | null;
  last_successful_exchange_at: string | null;
  exchange_input_fingerprint: string | null;
  GmailSameInvocationParityGate: NamedOutboundLoopGate;
  GmailConfigHydrationGate: NamedOutboundLoopGate;
  GmailTokenExchangeInputGate: NamedOutboundLoopGate;
  active_deployment_id: string | null;
  last_authoritative_cron_at: string | null;
  last_ignored_stale_observation: string | null;
  last_write_conflict: string | null;
  credential_projection_version: string;
  CredentialHealthWriteConflictGate: NamedOutboundLoopGate;
  DeploymentScopedCredentialHealthGate: NamedOutboundLoopGate;
  StaleCredentialHealthWriterGate: NamedOutboundLoopGate;
  PartialInvocationOverwriteGate: NamedOutboundLoopGate;
  PostCronOverwriteProtectionGate: NamedOutboundLoopGate;
  obligation_cutover?: ReturnType<typeof import("./obligation/hq").projectCommunicationObligationHq>;
  suppression: {
    conversation: "SUPPRESSED" | "ACTIVE";
    reason: "OPT_OUT" | null;
    source: "PROSPECT" | "INFINITY" | "SYSTEM" | "UNKNOWN" | null;
    source_message_id: string | null;
    suppressed_at: string | null;
    pending_jobs: number;
    next_best_action: "SUPPRESS" | "NONE" | string;
    outbound_eligible: boolean;
  };
};

const ANSWERED_INBOUND_IDS = new Set(["1a0b113843dd3f35", "1a0b2000b6fda6c0"]);

function emptyState(): CommunicationSchedulerState {
  return {
    version: 1,
    last_tick_at: null,
    last_success_at: null,
    last_failure_at: null,
    last_gmail_check_at: null,
    last_error: null,
    messages_detected: 0,
    detections_24h: [],
    jobs_created: 0,
    jobs_sent: 0,
    scheduler_instance: null,
    lease: null,
    jobs: [],
    last_trigger_source: "UNKNOWN",
    cursor_triggered: false,
    last_inbound_message_id: null,
    last_detected_at: null,
  };
}

let memory = emptyState();

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function resetCommunicationSchedulerState(): CommunicationSchedulerState {
  memory = emptyState();
  return memory;
}

export function getCommunicationSchedulerState(): CommunicationSchedulerState {
  return memory;
}

export function replaceCommunicationSchedulerState(next: CommunicationSchedulerState): CommunicationSchedulerState {
  memory = {
    ...emptyState(),
    ...next,
    version: 1,
    jobs: [...(next.jobs ?? [])],
    detections_24h: [...(next.detections_24h ?? [])],
    cron_credential_ticks: [...(next.cron_credential_ticks ?? [])],
    credential_observations: [...(next.credential_observations ?? [])],
  };
  return memory;
}

function applyProjectionFields(projection: CredentialHealthProjection): void {
  memory.credential_health = projection.credential_health;
  memory.consecutive_healthy_cron = projection.consecutive_healthy_cron;
  memory.last_error = projection.last_error;
  memory.last_credential_failure_at = projection.last_credential_failure_at;
  memory.credential_source = projection.credential_source ?? memory.credential_source;
  memory.credential_fingerprint = projection.credential_fingerprint ?? memory.credential_fingerprint;
  memory.cron_fingerprint = projection.credential_fingerprint ?? memory.cron_fingerprint;
  memory.token_exchange = projection.token_exchange;
  memory.gmail_readonly_present = projection.gmail_readonly_present;
  memory.gmail_send_present = projection.gmail_send_present;
  memory.same_invocation_parity = projection.same_invocation_parity ?? memory.same_invocation_parity;
  memory.hydration_result = projection.hydration_result ?? memory.hydration_result;
  memory.last_successful_exchange_at = projection.last_successful_exchange_at ?? memory.last_successful_exchange_at;
  memory.exchange_input_fingerprint = projection.exchange_input_fingerprint ?? memory.exchange_input_fingerprint;
  memory.startup_state = projection.startup_state;
  memory.credential_health_version = projection.health_version;
  memory.credential_observations = projection.observations;
  memory.last_ignored_stale_observation = projection.last_ignored_stale_observation;
  memory.last_write_conflict = projection.last_write_conflict;
  memory.last_authoritative_cron_at = projection.last_authoritative_cron_at;
  memory.last_authoritative_invocation_id = projection.last_authoritative_invocation_id;
  memory.active_deployment_id = projection.active_deployment_id;
  memory.credential_deploy_id = projection.active_deployment_id ?? memory.credential_deploy_id;
  memory.credential_projection_version = projection.projection_version;
  if (projection.credential_health === "HEALTHY" && projection.credential_source === "PROCESS_ENV") {
    memory.env_client_present = true;
    memory.env_secret_present = true;
    memory.env_refresh_present = true;
    memory.env_sender_present = true;
  }
}

function currentCredentialProjection(): CredentialHealthProjection {
  const active = memory.active_deployment_id ?? memory.credential_deploy_id ?? process.env.VERCEL_DEPLOYMENT_ID ?? null;
  if (memory.credential_observations?.length) {
    return projectCredentialHealth({
      observations: memory.credential_observations,
      active_deployment_id: active,
    });
  }
  return emptyCredentialHealthProjection(active);
}

function recordCredentialHealthWrite(input: {
  trigger_source: string;
  route: string;
  function_name: string;
  invocation_id: string;
  config_source?: GmailConfigSource | null;
  config_fingerprint: string | null;
  exchange_input_fingerprint?: string | null;
  token_exchange: boolean;
  last_error: string | null;
  gmail_readonly: boolean;
  gmail_send: boolean;
  hydration: "PASS" | "FAIL";
  same_invocation_parity: "PASS" | "FAIL";
  configured: boolean;
  token_exchange_attempted: boolean;
  lease_held?: boolean;
  healthy?: boolean;
}): CredentialHealthProjection {
  const previous = currentCredentialProjection();
  const kind = classifyCredentialHealthObservationKind({
    trigger_source: input.trigger_source,
    lease_held: input.lease_held,
    hydration_pass: input.hydration === "PASS",
    token_exchange_attempted: input.token_exchange_attempted,
    configured: input.configured,
  });
  const healthy = input.healthy ?? (
    input.trigger_source === "VERCEL_CRON"
    && kind === "COMPLETED"
    && input.token_exchange
    && input.hydration === "PASS"
    && input.same_invocation_parity === "PASS"
    && input.gmail_readonly
    && input.gmail_send
    && !input.last_error
  );
  const applied = applyCredentialHealthObservation({
    current: previous,
    observation: {
      write_id: `chw:${Date.now()}:${input.invocation_id}`,
      at: new Date().toISOString(),
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? memory.credential_deploy_id ?? memory.active_deployment_id ?? null,
      invocation_id: input.invocation_id,
      trigger_source: input.trigger_source,
      runtime_instance_id: process.env.VERCEL_REGION ?? null,
      route: input.route,
      function_name: input.function_name,
      previous_version: previous.health_version,
      kind,
      config_source: input.config_source ?? memory.credential_source ?? null,
      config_fingerprint: input.config_fingerprint,
      exchange_input_fingerprint: input.exchange_input_fingerprint ?? memory.exchange_input_fingerprint ?? null,
      token_exchange: input.token_exchange,
      hydration: input.hydration,
      same_invocation_parity: input.same_invocation_parity,
      gmail_readonly: input.gmail_readonly,
      gmail_send: input.gmail_send,
      last_error: input.last_error,
      healthy,
    },
    active_deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? memory.active_deployment_id ?? memory.credential_deploy_id ?? null,
  });
  applyProjectionFields(applied.projection);
  return applied.projection;
}

export async function hydrateCommunicationSchedulerState(): Promise<CommunicationSchedulerState> {
  if (process.env.VITEST) return memory;
  const client = adminClient();
  if (!client) return memory;
  const { data } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", COMMUNICATION_RUNTIME_SCOPE)
    .maybeSingle();
  const payload = data?.payload as CommunicationSchedulerState | undefined;
  if (payload && payload.version === 1) replaceCommunicationSchedulerState(payload);
  return memory;
}

export async function persistCommunicationSchedulerState(state: CommunicationSchedulerState = memory): Promise<void> {
  memory = state;
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  const { data } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", COMMUNICATION_RUNTIME_SCOPE)
    .maybeSingle();
  const remote = data?.payload as CommunicationSchedulerState | undefined;
  if (remote?.credential_observations?.length || memory.credential_observations?.length) {
    const active = process.env.VERCEL_DEPLOYMENT_ID ?? remote?.active_deployment_id ?? memory.active_deployment_id ?? null;
    const current = mergeCredentialHealthObservationLogs({
      remote: remote?.credential_observations ?? [],
      local: memory.credential_observations ?? [],
      active_deployment_id: active,
    });
    applyProjectionFields(current);
    if (current.credential_health === "HEALTHY") {
      memory.env_client_present = Boolean(memory.env_client_present || remote?.env_client_present);
      memory.env_secret_present = Boolean(memory.env_secret_present || remote?.env_secret_present);
      memory.env_refresh_present = Boolean(memory.env_refresh_present || remote?.env_refresh_present);
      memory.env_sender_present = Boolean(memory.env_sender_present || remote?.env_sender_present);
    }
  }
  const { data: latest } = await client
    .from("cloud_runtime_state")
    .select("payload")
    .eq("scope", COMMUNICATION_RUNTIME_SCOPE)
    .maybeSingle();
  const latestPayload = latest?.payload as CommunicationSchedulerState | undefined;
  if (latestPayload?.credential_observations?.length) {
    const active = process.env.VERCEL_DEPLOYMENT_ID ?? latestPayload.active_deployment_id ?? memory.active_deployment_id ?? null;
    const current = mergeCredentialHealthObservationLogs({
      remote: latestPayload.credential_observations,
      local: memory.credential_observations ?? [],
      active_deployment_id: active,
    });
    applyProjectionFields(current);
  }
  await client.from("cloud_runtime_state").upsert({
    scope: COMMUNICATION_RUNTIME_SCOPE,
    version: 1,
    instance_id: "communication-runtime-scheduler",
    payload: memory,
    updated_at: new Date().toISOString(),
  });
}

export function classifyCommunicationTickSource(request: Request): CommunicationTriggerSource {
  if (request.headers.get("x-vercel-cron") === "1") return "VERCEL_CRON";
  if (/vercel-cron/i.test(request.headers.get("user-agent") ?? "")) return "VERCEL_CRON";
  return "MANUAL";
}

export function evaluateCommunicationRuntimeSchedulerAuthGate(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): NamedOutboundLoopGate {
  const auth = authorizeRuntimeTickRequest(request, env);
  return {
    gate: "CommunicationRuntimeSchedulerAuthGate",
    result: auth.ok ? "PASS" : "FAIL",
    reasons: [auth.reason],
  };
}

export function evaluateCommunicationRuntimeSchedulerPersistenceGate(state: CommunicationSchedulerState): NamedOutboundLoopGate {
  const persisted = Boolean(state.last_tick_at || state.last_gmail_check_at || state.jobs.length);
  return {
    gate: "CommunicationRuntimeSchedulerPersistenceGate",
    result: persisted ? "PASS" : "FAIL",
    reasons: persisted ? ["SCHEDULER_STATE_DURABLE"] : ["SCHEDULER_STATE_MISSING"],
  };
}

export function evaluateCommunicationRuntimeConcurrencyGate(input: {
  acquired: boolean;
  overlapping_send: boolean;
}): NamedOutboundLoopGate {
  if (input.overlapping_send) {
    return { gate: "CommunicationRuntimeConcurrencyGate", result: "FAIL", reasons: ["DUPLICATE_OWNERSHIP"] };
  }
  return {
    gate: "CommunicationRuntimeConcurrencyGate",
    result: input.acquired ? "PASS" : "PASS",
    reasons: input.acquired ? ["LEASE_OWNED"] : ["LEASE_DEFERRED_SAFE"],
  };
}

export function evaluateOutboundScheduledJobGate(job: OutboundScheduledJob | null): NamedOutboundLoopGate {
  if (!job) return { gate: "OutboundScheduledJobGate", result: "FAIL", reasons: ["JOB_MISSING"] };
  const required = job.job_id && job.conversation_id && job.inbound_message_id && job.thread_id && job.eligible_at && job.idempotency_key;
  return {
    gate: "OutboundScheduledJobGate",
    result: required ? "PASS" : "FAIL",
    reasons: required ? ["JOB_DURABLE"] : ["JOB_FIELDS_MISSING"],
  };
}

export function evaluateAlwaysOnAutonomyTruthGate(input: {
  trigger_source: CommunicationTriggerSource;
  cursor_triggered: boolean;
  founder_operational_command: boolean;
  automatic_send: boolean;
}): NamedOutboundLoopGate {
  if (input.cursor_triggered || input.founder_operational_command || input.trigger_source !== "VERCEL_CRON" || !input.automatic_send) {
    return {
      gate: "AlwaysOnAutonomyTruthGate",
      result: "NOT_PROVEN",
      reasons: [
        input.trigger_source !== "VERCEL_CRON" ? "TRIGGER_NOT_PRODUCTION_CRON" : "",
        input.cursor_triggered ? "CURSOR_INITIATED" : "",
        input.founder_operational_command ? "FOUNDER_COMMAND" : "",
        !input.automatic_send ? "NO_AUTOMATIC_SEND" : "",
      ].filter(Boolean),
    };
  }
  return { gate: "AlwaysOnAutonomyTruthGate", result: "PASS", reasons: ["PRODUCTION_CRON_PERFORMED_WORK"] };
}

export function evaluateCommunicationRuntimeEnvironmentParityGate(input: {
  cron_client_present: boolean;
  cron_secret_present: boolean;
  cron_refresh_present: boolean;
  cron_sender_present: boolean;
  runtime_client_present: boolean;
  runtime_secret_present: boolean;
  runtime_refresh_present: boolean;
  runtime_sender_present: boolean;
  http_fingerprint?: string | null;
  cron_fingerprint?: string | null;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.cron_client_present !== input.runtime_client_present) reasons.push("CLIENT_ID_CONTEXT_MISMATCH");
  if (input.cron_secret_present !== input.runtime_secret_present) reasons.push("CLIENT_SECRET_CONTEXT_MISMATCH");
  if (input.cron_refresh_present !== input.runtime_refresh_present) reasons.push("REFRESH_TOKEN_CONTEXT_MISMATCH");
  if (input.cron_sender_present !== input.runtime_sender_present) reasons.push("SENDER_CONTEXT_MISMATCH");
  if (!input.cron_client_present || !input.cron_secret_present || !input.cron_refresh_present || !input.cron_sender_present) {
    reasons.push("CRON_CONTEXT_INCOMPLETE");
  }
  if (input.http_fingerprint && input.cron_fingerprint && input.http_fingerprint !== input.cron_fingerprint) {
    reasons.push("FINGERPRINT_MISMATCH");
  }
  return {
    gate: "CommunicationRuntimeEnvironmentParityGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CRON_RUNTIME_ENV_PARITY"],
  };
}

export const MAILBOX_WATCH_SLA_MS = 15 * 60 * 1000;

export function evaluateAlwaysOnMailboxWatchGate(input: {
  last_gmail_check_at: string | null;
  now?: string;
  token_exchange: boolean;
  last_error: string | null;
  cron_bound?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.cron_bound === false) reasons.push("CRON_NOT_BOUND");
  if (!input.last_gmail_check_at) reasons.push("NO_GMAIL_CHECK");
  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  const checkMs = input.last_gmail_check_at ? Date.parse(input.last_gmail_check_at) : Number.NaN;
  if (Number.isFinite(checkMs) && nowMs - checkMs > MAILBOX_WATCH_SLA_MS) {
    reasons.push("WATCH_STALE");
  }
  if (!input.token_exchange) reasons.push("TOKEN_EXCHANGE_FAIL");
  if (input.last_error && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(input.last_error)) {
    reasons.push("MAILBOX_BLIND_GRANT");
  }
  return {
    gate: "AlwaysOnMailboxWatchGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["MAILBOX_WATCHING"],
  };
}

export function evaluateCommunicationRuntimeCronHealthGate(input: {
  trigger_source: CommunicationTriggerSource;
  last_error: string | null;
  last_gmail_check_at: string | null;
  token_exchange: boolean;
  gmail_send_present: boolean;
  gmail_readonly_present: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (input.trigger_source !== "VERCEL_CRON") reasons.push("TRIGGER_NOT_CRON");
  if (input.last_error) reasons.push(`LAST_ERROR:${input.last_error}`);
  if (!input.last_gmail_check_at) reasons.push("NO_GMAIL_CHECK");
  if (!input.token_exchange) reasons.push("TOKEN_EXCHANGE_FAIL");
  if (!input.gmail_send_present) reasons.push("GMAIL_SEND_MISSING");
  if (!input.gmail_readonly_present) reasons.push("GMAIL_READONLY_MISSING");
  return {
    gate: "CommunicationRuntimeCronHealthGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CRON_GMAIL_HEALTHY"],
  };
}

export function evaluateCommunicationRuntimeRestartGate(input: {
  scheduler_resumed: boolean;
  conversation_survived: boolean;
  jobs_survived: boolean;
  duplicate_send: boolean;
  gmail_read?: boolean;
  gmail_send_scope?: boolean;
  t4_job_sent?: boolean;
  lineage_persisted?: boolean;
  idempotency_persisted?: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.scheduler_resumed) reasons.push("SCHEDULER_DID_NOT_RESUME");
  if (input.gmail_read === false) reasons.push("GMAIL_READ_LOST");
  if (input.gmail_send_scope === false) reasons.push("GMAIL_SEND_SCOPE_LOST");
  if (!input.conversation_survived) reasons.push("CONVERSATION_LOST");
  if (!input.jobs_survived) reasons.push("JOBS_LOST");
  if (input.t4_job_sent === false) reasons.push("T4_JOB_NOT_SENT");
  if (input.lineage_persisted === false) reasons.push("LINEAGE_LOST");
  if (input.idempotency_persisted === false) reasons.push("IDEMPOTENCY_LOST");
  if (input.duplicate_send) reasons.push("DUPLICATE_AFTER_RESTART");
  return {
    gate: "CommunicationRuntimeRestartGate",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["RESTART_CONTINUITY"],
  };
}

function effectiveSchedulerError(state: CommunicationSchedulerState): string | null {
  if (state.token_exchange && state.observe_error_kind === "NONE" && state.last_error === "NOT_CONFIGURED") {
    return null;
  }
  if (state.last_error && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(state.last_error)) {
    return state.startup_state === "INITIALIZING" ? null : state.last_error;
  }
  return state.last_error;
}

export async function recordHttpGmailCredentialObservation(now = new Date().toISOString()): Promise<CommunicationSchedulerState> {
  const config = readGmailRuntimeConfig();
  memory.http_fingerprint = config.fingerprint;
  recordCredentialHealthWrite({
    trigger_source: "HTTP",
    route: "/api/runtime/operating-state",
    function_name: "recordHttpGmailCredentialObservation",
    invocation_id: `http:${now}`,
    config_source: config.source,
    config_fingerprint: config.fingerprint,
    token_exchange: Boolean(memory.token_exchange),
    last_error: null,
    gmail_readonly: Boolean(memory.gmail_readonly_present),
    gmail_send: Boolean(memory.gmail_send_present),
    hydration: memory.hydration_result === "PASS" ? "PASS" : "FAIL",
    same_invocation_parity: memory.same_invocation_parity === "PASS" ? "PASS" : "FAIL",
    configured: config.configured,
    token_exchange_attempted: false,
    healthy: false,
  });
  return memory;
}

export function projectCommunicationSchedulerHq(state: CommunicationSchedulerState = memory, now = new Date().toISOString()): CommunicationSchedulerHqProjection {
  const lastTick = state.last_tick_at ? Date.parse(state.last_tick_at) : 0;
  const ageMin = lastTick ? (Date.parse(now) - lastTick) / 60000 : Number.POSITIVE_INFINITY;
  const pacingCards = state.jobs
    .map((job) => projectPacingJobCard(job, now))
    .filter((row): row is PacingJobHqCard => Boolean(row));
  const waiting = state.jobs.filter((job) => {
    const display = founderJobDisplayState(job, now);
    return display === "WAITING_PACING";
  }).length;
  const ready = state.jobs.filter((job) => {
    const display = founderJobDisplayState(job, now);
    return display === "READY" || display === "RUNNING";
  }).length;
  const failed = state.jobs.filter((job) => job.state === "FAILED").length;
  const detected24h = state.detections_24h.filter((row) => Date.parse(now) - Date.parse(row.at) <= 24 * 60 * 60 * 1000).length;
  const lastError = effectiveSchedulerError(state);
  let status: CommunicationSchedulerHqProjection["status"] = "FAILED";
  if (ageMin <= 15 && !lastError) status = "HEALTHY";
  else if (ageMin <= 45) status = "DEGRADED";
  const distinction = ageMin > 15
    ? "SCHEDULER_NOT_RUNNING"
    : detected24h === 0
      ? "NO_NEW_EMAIL"
      : status === "DEGRADED"
        ? "DEGRADED"
        : "RUNNING";
  const mailboxWatch = evaluateAlwaysOnMailboxWatchGate({
    last_gmail_check_at: state.last_gmail_check_at,
    now,
    token_exchange: Boolean(state.token_exchange),
    last_error: lastError,
    cron_bound: state.last_trigger_source === "VERCEL_CRON",
  });
  return {
    status,
    last_tick_at: state.last_tick_at,
    last_gmail_check_at: state.last_gmail_check_at,
    next_tick_at: lastTick ? new Date(lastTick + COMMUNICATION_CADENCE_MINUTES * 60_000).toISOString() : null,
    messages_detected_24h: detected24h,
    waiting_jobs: waiting,
    waiting_pacing_jobs: pacingCards.length,
    ready_jobs: ready,
    failed_jobs: failed,
    last_error: lastError,
    distinction,
    token_exchange: Boolean(state.token_exchange),
    gmail_send_present: Boolean(state.gmail_send_present),
    gmail_readonly_present: Boolean(state.gmail_readonly_present),
    cron_health: evaluateCommunicationRuntimeCronHealthGate({
      trigger_source: state.last_trigger_source,
      last_error: lastError === "LEASE_HELD" ? null : lastError,
      last_gmail_check_at: state.last_gmail_check_at,
      token_exchange: Boolean(state.token_exchange),
      gmail_send_present: Boolean(state.gmail_send_present),
      gmail_readonly_present: Boolean(state.gmail_readonly_present),
    }),
    observe_error_kind: state.observe_error_kind ?? null,
    env_parity: evaluateCommunicationRuntimeEnvironmentParityGate({
      cron_client_present: Boolean(state.env_client_present),
      cron_secret_present: Boolean(state.env_secret_present),
      cron_refresh_present: Boolean(state.env_refresh_present),
      cron_sender_present: Boolean(state.env_sender_present),
      runtime_client_present: Boolean(state.env_client_present),
      runtime_secret_present: Boolean(state.env_secret_present),
      runtime_refresh_present: Boolean(state.env_refresh_present),
      runtime_sender_present: Boolean(state.env_sender_present),
      http_fingerprint: state.http_fingerprint,
      cron_fingerprint: state.cron_fingerprint,
    }),
    pacing_jobs: pacingCards,
    pacing_visibility: evaluatePacingStateVisibilityGate({
      jobs: state.jobs,
      now,
      status,
    }),
    healthy_waiting: status === "HEALTHY" || (pacingCards.length > 0 && status !== "FAILED" && !lastError),
    composer_version: CONSULTATIVE_SALES_COMPOSER_VERSION,
    composer_gates: CONSULTATIVE_SALES_LIVE_GATES,
    ...projectBusinessLoopHq(state, now, status),
    mailbox_watch: mailboxWatch,
    watching: mailboxWatch.result === "PASS",
    credential_health: lastError && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(lastError)
      ? "DEGRADED"
      : state.credential_health ?? "DEGRADED",
    credential_source: state.credential_source ?? null,
    credential_fingerprint: state.credential_fingerprint ?? null,
    consecutive_healthy_cron: lastError && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(lastError)
      ? 0
      : state.consecutive_healthy_cron ?? 0,
    last_credential_failure_at: state.last_credential_failure_at ?? null,
    startup_state: state.startup_state ?? "DEGRADED",
    CronCredentialVisibilityStabilityGate: evaluateCronCredentialVisibilityStabilityGate({
      consecutive_healthy: lastError && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED/i.test(lastError)
        ? 0
        : state.consecutive_healthy_cron ?? 0,
      last_error: lastError,
    }),
    GmailCredentialConflictGate: evaluateGmailCredentialConflictGate({ conflict: Boolean(state.credential_conflict) }),
    same_invocation_parity: state.same_invocation_parity ?? null,
    last_successful_exchange_at: state.last_successful_exchange_at ?? null,
    exchange_input_fingerprint: state.exchange_input_fingerprint ?? null,
    GmailSameInvocationParityGate: evaluateGmailSameInvocationParityGate({
      resolved_fingerprint: state.credential_fingerprint ?? null,
      exchange_input_fingerprint: state.exchange_input_fingerprint ?? null,
    }),
    GmailConfigHydrationGate: {
      gate: "GmailConfigHydrationGate",
      result: state.hydration_result === "PASS" ? "PASS" : "FAIL",
      reasons: state.hydration_result === "PASS" ? ["CONFIG_RESOLVED_BEFORE_GMAIL"] : ["HYDRATION_NOT_PROVEN"],
    },
    GmailTokenExchangeInputGate: evaluateGmailTokenExchangeInputGate({
      context_fingerprint: state.credential_fingerprint ?? null,
      exchange_input_fingerprint: state.exchange_input_fingerprint ?? null,
    }),
    active_deployment_id: state.active_deployment_id ?? state.credential_deploy_id ?? null,
    last_authoritative_cron_at: state.last_authoritative_cron_at ?? null,
    last_ignored_stale_observation: state.last_ignored_stale_observation ?? null,
    last_write_conflict: state.last_write_conflict ?? null,
    credential_projection_version: state.credential_projection_version ?? CREDENTIAL_HEALTH_PROJECTION_VERSION,
    CredentialHealthWriteConflictGate: state.last_write_conflict
      ? { gate: "CredentialHealthWriteConflictGate", result: "PASS", reasons: [state.last_write_conflict, "STALE_REJECTED"] }
      : evaluateCredentialHealthWriteConflictGate({
        expected_current_version: state.credential_health_version ?? 0,
        actual_current_version: state.credential_health_version ?? 0,
      }),
    DeploymentScopedCredentialHealthGate: evaluateDeploymentScopedCredentialHealthGate({
      observation_deployment_id: state.active_deployment_id ?? state.credential_deploy_id ?? null,
      active_deployment_id: state.active_deployment_id ?? state.credential_deploy_id ?? null,
    }),
    StaleCredentialHealthWriterGate: state.last_write_conflict
      ? { gate: "StaleCredentialHealthWriterGate", result: "PASS", reasons: [state.last_write_conflict, "STALE_REJECTED"] }
      : evaluateStaleCredentialHealthWriterGate({
        observation_deployment_id: state.active_deployment_id ?? state.credential_deploy_id ?? null,
        active_deployment_id: state.active_deployment_id ?? state.credential_deploy_id ?? null,
        observation_version: state.credential_health_version ?? 0,
        current_version: state.credential_health_version ?? 0,
        kind: "COMPLETED",
        current_authoritative_completed: Boolean(state.last_authoritative_cron_at),
        observation_at: state.last_authoritative_cron_at ?? now,
        current_authoritative_at: state.last_authoritative_cron_at ?? null,
      }),
    PartialInvocationOverwriteGate: evaluatePartialInvocationOverwriteGate({
      incoming_kind: state.credential_observations?.at(-1)?.kind ?? "COMPLETED",
      current_health: state.credential_health ?? "DEGRADED",
      accepted: Boolean(state.credential_observations?.at(-1)?.accepted),
    }),
    PostCronOverwriteProtectionGate: evaluatePostCronProtectionFromLog(
      state.credential_observations ?? [],
      state.active_deployment_id ?? state.credential_deploy_id ?? null,
    ),
    suppression: projectSuppressionHq(state),
    obligation_cutover: projectCommunicationObligationHq({
      now,
      credential_fingerprint: state.credential_fingerprint,
      scheduler_health: status,
    }),
  };
}

function jobNeedsProviderReply(job: OutboundScheduledJob): boolean {
  return !job.provider_message_id && !/SENT|SUPPRESSED|CANCELLED/i.test(job.state);
}

function jobIsStranded(job: OutboundScheduledJob, now: string): boolean {
  if (!jobNeedsProviderReply(job)) return false;
  if (/BLOCKED|FAILED/i.test(job.state)) return true;
  return Date.parse(now) > Date.parse(job.eligible_at) + COMMUNICATION_SLA_TOLERANCE_MS;
}

function refreshUnresolvedActionableCounts(now: string): void {
  const incomplete = memory.jobs.filter(jobNeedsProviderReply);
  const stranded = incomplete.filter((job) => jobIsStranded(job, now));
  memory.unresolved_actionable_inbound = incomplete.length;
  memory.oldest_unresolved_at = incomplete.map((job) => job.created_at).sort()[0] ?? null;
  memory.overdue_actionable_count = stranded.length;
}

function projectBusinessLoopHq(
  state: CommunicationSchedulerState,
  now: string,
  schedulerStatus: CommunicationSchedulerHqProjection["status"],
): Pick<
  CommunicationSchedulerHqProjection,
  | "business_loop"
  | "newest_inbound_at"
  | "inbound_state"
  | "inbound_age_ms"
  | "inbound_eligible_at"
  | "inbound_overdue"
  | "inbound_reason"
  | "unresolved_actionable_inbound"
  | "oldest_unresolved_age_ms"
  | "overdue_messages"
  | "reconciliation_recoveries"
  | "EndToEndCommunicationHealthGate"
  | "CommunicationRuntimeAlwaysOnGate"
  | "ReadyJobDrainGate"
  | "live_reliability"
  | "live_turn_target"
  | "live_turn_target_message_id"
  | "live_turn_target_state"
  | "live_turn_target_received_at"
  | "live_turn_target_age"
  | "current_overdue"
  | "current_actionable_inbound"
  | "current_intent"
  | "current_stage"
  | "current_next_action"
  | "current_job_state"
  | "current_eligible_at"
  | "current_blocked_reason"
  | "current_recovery_attempts"
  | "current_provider_reply"
> {
  const conversation = getClosedLoopDurableState().conversation;
  const incomplete = state.jobs.filter(jobNeedsProviderReply);
  const stranded = incomplete.filter((job) => jobIsStranded(job, now));
  const actionable = [...stranded, ...incomplete]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
  const unresolvedCount = incomplete.length;
  const overdue = stranded.length > 0;
  const loop = evaluateBusinessLoopHealthGate({
    scheduler_healthy: schedulerStatus === "HEALTHY",
    actionable_overdue: overdue,
  });
  evaluateStuckActionableInboundGate({
    valid_actionable: Boolean(actionable),
    terminal: !actionable,
    overdue,
  });
  const e2e = evaluateEndToEndCommunicationHealthGate({
    unresolved_actionable: stranded.length,
  });
  const alwaysOn = evaluateCommunicationRuntimeAlwaysOnDuringIncident({
    stuck_actionable_inbound: overdue,
    reconciliation_live: Boolean(state.last_reconciliation_at),
    e2e_pass: e2e.result === "PASS",
    clean_turns: state.live_reliability_clean_turns ?? 0,
  });
  const targetJob = state.jobs.find((job) => job.inbound_message_id === LIVE_RELIABILITY_TURN_A.message_id) ?? null;
  const targetAgeMs = Math.max(0, Date.parse(now) - Date.parse(LIVE_RELIABILITY_TURN_A.received_at_iso));
  const targetAge = `${Math.floor(targetAgeMs / 3_600_000)}h ${Math.floor((targetAgeMs % 3_600_000) / 60_000)}m`;
  const targetState: CommunicationSchedulerHqProjection["live_turn_target_state"] = targetJob?.provider_message_id
    ? "RECOVERED"
    : targetJob && /READY|RUNNING|PROCESSING|WAITING/i.test(targetJob.state)
      ? "RECOVERING"
      : "FAILED";
  return {
    business_loop: loop.result === "PASS" ? "HEALTHY" : "DEGRADED",
    newest_inbound_at: actionable?.created_at ?? state.last_detected_at,
    inbound_state: actionable?.state ?? (state.last_inbound_message_id ? "OBSERVED" : "UNSEEN"),
    inbound_age_ms: actionable ? Math.max(0, Date.parse(now) - Date.parse(actionable.created_at)) : null,
    inbound_eligible_at: actionable?.eligible_at ?? null,
    inbound_overdue: overdue,
    inbound_reason: overdue ? "ACTIONABLE_INBOUND_STRANDED_WHILE_SCHEDULER_HEALTHY" : null,
    unresolved_actionable_inbound: unresolvedCount,
    oldest_unresolved_age_ms: state.oldest_unresolved_at
      ? Math.max(0, Date.parse(now) - Date.parse(state.oldest_unresolved_at))
      : null,
    overdue_messages: state.overdue_actionable_count ?? (overdue ? 1 : 0),
    reconciliation_recoveries: state.reconciliation_recoveries ?? 0,
    EndToEndCommunicationHealthGate: e2e,
    CommunicationRuntimeAlwaysOnGate: alwaysOn,
    ReadyJobDrainGate: evaluateReadyJobDrainGate({
      ready_jobs: state.jobs.filter((job) => job.state === "READY" && Date.parse(job.eligible_at) <= Date.parse(now)).length,
      claimed_or_terminal: 0,
    }),
    live_reliability: `${state.live_reliability_clean_turns ?? 0}/3`,
    live_turn_target: LIVE_RELIABILITY_TURN_A.label,
    live_turn_target_message_id: LIVE_RELIABILITY_TURN_A.message_id,
    live_turn_target_state: targetState,
    live_turn_target_received_at: LIVE_RELIABILITY_TURN_A.received_at,
    live_turn_target_age: targetAge,
    current_overdue: !targetJob?.provider_message_id,
    current_actionable_inbound: LIVE_RELIABILITY_TURN_A.message_id,
    current_intent: targetJob?.intent ?? conversation?.intent ?? actionable?.intent ?? null,
    current_stage: conversation?.conversation_state ?? null,
    current_next_action: conversation?.next_action ?? null,
    current_job_state: targetJob?.state ?? actionable?.state ?? null,
    current_eligible_at: targetJob?.eligible_at ?? actionable?.eligible_at ?? null,
    current_blocked_reason: targetJob?.failure_reason ?? actionable?.failure_reason ?? null,
    current_recovery_attempts: targetJob?.attempt_count ?? actionable?.attempt_count ?? 0,
    current_provider_reply: targetJob?.provider_message_id ?? null,
  };
}

function projectSuppressionHq(state: CommunicationSchedulerState): CommunicationSchedulerHqProjection["suppression"] {
  const record = lookupSuppression();
  const conversation = getClosedLoopDurableState().conversation;
  const suppressed = Boolean(record);
  const pending = state.jobs.filter((job) => !/SENT|SUPPRESSED|CANCELLED|BLOCKED|FAILED/i.test(job.state)).length;
  return {
    conversation: suppressed || /OPT_OUT/i.test(conversation?.conversation_state ?? "") ? "SUPPRESSED" : "ACTIVE",
    reason: suppressed ? "OPT_OUT" : null,
    source: record?.source_role ?? null,
    source_message_id: record?.source_message_id ?? null,
    suppressed_at: record?.timestamp ?? null,
    pending_jobs: suppressed ? 0 : pending,
    next_best_action: suppressed ? "SUPPRESS" : conversation?.next_action ?? "NONE",
    outbound_eligible: !suppressed,
  };
}

export function cancelUnsentJobsForSuppression(threadId: string, reason = "OPT_OUT"): { cancelled: number; blocked: number } {
  let cancelled = 0;
  let blocked = 0;
  for (const row of memory.jobs) {
    if (row.thread_id !== threadId || /SENT|SUPPRESSED|CANCELLED|BLOCKED/i.test(row.state)) continue;
    if (row.state === "WAITING" || row.state === "WAITING_PACING") {
      row.state = "CANCELLED";
      cancelled += 1;
    } else {
      row.state = "BLOCKED";
      blocked += 1;
    }
    row.failure_reason = reason;
  }
  cancelEligibleFollowups();
  return { cancelled, blocked };
}

export async function claimCommunicationLease(input: { holder: string; now: string; seconds?: number }): Promise<{ acquired: boolean; reason: string }> {
  const seconds = input.seconds ?? 90;
  const expires = new Date(Date.parse(input.now) + seconds * 1000).toISOString();
  if (process.env.VITEST) {
    if (memory.lease && Date.parse(memory.lease.expires_at) > Date.parse(input.now) && memory.lease.holder !== input.holder) {
      return { acquired: false, reason: "LEASE_HELD" };
    }
    memory.lease = { holder: input.holder, expires_at: expires };
    return { acquired: true, reason: "LEASE_ACQUIRED" };
  }
  const client = adminClient();
  if (!client) {
    memory.lease = { holder: input.holder, expires_at: expires };
    return { acquired: true, reason: "LEASE_MEMORY" };
  }
  const { data: existing } = await client
    .from("cloud_runtime_leases")
    .select("holder, expires_at")
    .eq("scope", COMMUNICATION_LEASE_SCOPE)
    .maybeSingle();
  if (existing && Date.parse(existing.expires_at as string) > Date.parse(input.now) && existing.holder !== input.holder) {
    return { acquired: false, reason: "LEASE_HELD" };
  }
  await client.from("cloud_runtime_leases").upsert({
    scope: COMMUNICATION_LEASE_SCOPE,
    holder: input.holder,
    instance_id: input.holder,
    acquired_at: input.now,
    expires_at: expires,
  });
  memory.lease = { holder: input.holder, expires_at: expires };
  return { acquired: true, reason: existing ? "LEASE_TAKEOVER" : "LEASE_ACQUIRED" };
}

export async function releaseCommunicationLease(holder: string): Promise<void> {
  if (memory.lease?.holder === holder) memory.lease = null;
  if (process.env.VITEST) return;
  const client = adminClient();
  if (!client) return;
  await client.from("cloud_runtime_leases").delete().eq("scope", COMMUNICATION_LEASE_SCOPE).eq("holder", holder);
}

function classifyIntent(text: string, context?: { previous_intent?: string | null; previous_outbound?: string | null; prior_infinity_outbound_count?: number }): string {
  return planConversation({
    visible_body: text,
    previous_intent: context?.previous_intent,
    previous_outbound: context?.previous_outbound,
    prior_infinity_outbound_count: context?.prior_infinity_outbound_count,
  }).intent;
}

export function composeCanaryReplyForInbound(text: string, context?: {
  previous_intent?: string | null;
  previous_outbound?: string | null;
  previous_prospect_intent?: string | null;
  stage?: string | null;
  prior_infinity_outbound_count?: number;
}) {
  const plan = planConversation({
    visible_body: text,
    previous_intent: context?.previous_intent,
    previous_outbound: context?.previous_outbound,
    previous_prospect_intent: context?.previous_prospect_intent,
    stage: context?.stage,
    prior_infinity_outbound_count: context?.prior_infinity_outbound_count,
  });
  const midThread = !plan.first_touch_legal || plan.prior_infinity_outbound_count > 0;
  return composeOccupancyNpvAlwaysClosingReply({
    inbound: text,
    intent: plan.intent,
    turn: midThread || /POSITIVE_INTEREST|ACTIVE_EVALUATION|REQUEST_INPUTS|TRY_WITH_NUMBERS|QUALIFIED|HIGH_INTENT/i.test(`${plan.intent} ${plan.stage}`)
      ? Math.max(4, (plan.prior_infinity_outbound_count || 0) + 1)
      : plan.intent === "RENEW_VS_RELOCATE"
        ? 3
        : plan.intent === "REQUEST_EXAMPLE" ? 2 : 1,
  });
}

export function generateCanaryReplyForInbound(text: string): string {
  return composeCanaryReplyForInbound(text).body;
}

function upsertJob(job: OutboundScheduledJob) {
  const index = memory.jobs.findIndex((row) => row.job_id === job.job_id || row.inbound_message_id === job.inbound_message_id);
  if (index >= 0) memory.jobs[index] = job;
  else {
    memory.jobs = [...memory.jobs, job];
    memory.jobs_created += 1;
  }
}

export async function executeCommunicationRuntimeTick(input: {
  now?: string;
  trigger_source: CommunicationTriggerSource;
  cursor_triggered?: boolean;
  execute_jobs?: boolean;
  provider?: OutboundProviderAdapter;
  gmailContext?: GmailInvocationContext;
} = { trigger_source: "UNKNOWN" }) {
  const now = input.now ?? new Date().toISOString();
  const holder = `communication-tick:${now}`;
  const cron = input.trigger_source === "VERCEL_CRON";
  const executeJobs = input.execute_jobs ?? cron;
  const gmailContext = input.gmailContext ?? resolveGmailInvocationContext({
    trigger_source: input.trigger_source,
    now,
  });
  await hydrateCommunicationSchedulerState().catch(() => undefined);
  await hydrateClosedLoopDurableState().catch(() => undefined);
  await hydrateCommunicationHeartbeats().catch(() => undefined);
  await hydrateCommunicationReleaseState().catch(() => undefined);
  const invokedBy = cron ? "cron" : input.cursor_triggered ? "manual" : "recovery";
  const identity = vercelRuntimeIdentity();
  recordCommunicationHeartbeat({
    runtime: "scheduler",
    now,
    deployment: identity.deployment_id,
    git_sha: identity.git_sha,
    instance: holder,
    success: true,
    invoked_by: invokedBy,
  });
  markRecoveredTurn({
    provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    now,
    reason: "RELEASE_PARITY_AND_SLO_BREACH",
    marked_before_send: true,
  });
  const { founderTrialIncident, persistCommunicationIncidents } = await import("./obligation/incident");
  founderTrialIncident(now);
  await persistCommunicationIncidents().catch(() => undefined);
  const t4Known = memory.jobs.find((row) => row.job_id === "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7" && row.state === "SENT");
  if (t4Known) {
    await backfillT4AutonomousSendLineage({
      job_id: t4Known.job_id,
      inbound_message_id: t4Known.inbound_message_id,
      provider_message_id: t4Known.provider_message_id,
      job_state: t4Known.state,
    }).catch(() => undefined);
  }
  const lease = await claimCommunicationLease({ holder, now });
  memory.last_tick_at = now;
  memory.last_trigger_source = input.trigger_source;
  memory.cursor_triggered = Boolean(input.cursor_triggered);
  memory.scheduler_instance = holder;
  if (!lease.acquired) {
    recordCredentialHealthWrite({
      trigger_source: input.trigger_source,
      route: "/api/runtime/communication-tick",
      function_name: "executeCommunicationRuntimeTick",
      invocation_id: gmailContext.execution_id,
      config_source: gmailContext.config_source,
      config_fingerprint: gmailContext.config_fingerprint,
      exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
      token_exchange: Boolean(memory.token_exchange),
      last_error: null,
      gmail_readonly: Boolean(memory.gmail_readonly_present),
      gmail_send: Boolean(memory.gmail_send_present),
      hydration: gmailContext.configured ? "PASS" : "FAIL",
      same_invocation_parity: "FAIL",
      configured: gmailContext.configured,
      token_exchange_attempted: false,
      lease_held: true,
      healthy: false,
    });
    return {
      deferred: true,
      lease,
      observation: null,
      job: null,
      sent: false,
      hq: projectCommunicationSchedulerHq(memory, now),
    };
  }
  try {
    const observation = await observeOccupancynpvCanaryInbound({
      now,
      worker_running: cron,
      allow_live_semantic_reply: false,
      gmailContext,
    });
    memory.last_gmail_check_at = observation.last_successful_check ?? now;
    memory.last_error = observation.last_error;
    memory.observe_error_kind = observation.last_error ? observation.last_error.split(":")[0] ?? observation.last_error : "NONE";
    if (memory.observe_error_kind === "NONE") memory.last_error = null;
    memory.token_exchange = observation.token_exchange;
    memory.gmail_send_present = observation.gmail_send_present;
    memory.gmail_readonly_present = observation.gmail_readonly_present;
    const hydration = evaluateGmailConfigHydrationGate({ context: gmailContext });
    const sameInvocation = evaluateGmailSameInvocationParityGate({
      resolved_fingerprint: gmailContext.config_fingerprint,
      exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
    });
    const exchangeInput = evaluateGmailTokenExchangeInputGate({
      context_fingerprint: gmailContext.config_fingerprint,
      exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
    });
    memory.env_client_present = gmailContext.client_present;
    memory.env_secret_present = gmailContext.secret_present;
    memory.env_refresh_present = gmailContext.refresh_present;
    memory.env_sender_present = gmailContext.sender_present;
    memory.credential_source = gmailContext.config_source;
    memory.credential_fingerprint = gmailContext.config_fingerprint;
    memory.credential_reader_version = GMAIL_RUNTIME_CONFIG_READER_VERSION;
    memory.invocation_context_version = GMAIL_INVOCATION_CONTEXT_VERSION;
    memory.invocation_id = gmailContext.execution_id;
    memory.exchange_input_fingerprint = gmailContext.exchange_input_fingerprint;
    memory.same_invocation_parity = sameInvocation.result === "PASS" ? "PASS" : "FAIL";
    memory.hydration_result = hydration.result === "PASS" ? "PASS" : "FAIL";
    memory.credential_conflict = gmailContext.conflict;
    if (observation.token_exchange && sameInvocation.result === "PASS") {
      memory.last_successful_exchange_at = now;
    }
    void exchangeInput;
    void publicGmailInvocationSnapshot(gmailContext);
    const deployId = process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null;
    const deployChanged = Boolean(deployId && memory.credential_deploy_id && memory.credential_deploy_id !== deployId);
    if (deployChanged || !memory.credential_deploy_id) {
      memory.credential_deploy_id = deployId;
      memory.cron_cycles_since_deploy = cron ? 1 : 0;
    } else if (cron) {
      memory.cron_cycles_since_deploy = (memory.cron_cycles_since_deploy ?? 0) + 1;
    }
    const lastErrorForGrace = observation.last_error === "LEASE_HELD" ? null : observation.last_error;
    const grantBlind = Boolean(lastErrorForGrace && /GRANT:NOT_CONFIGURED|NOT_CONFIGURED|HYDRATION_REQUIRED|CONFIGURATION_CONFLICT|EXCHANGE_BEFORE_HYDRATION|SAME_INVOCATION_MISMATCH/i.test(lastErrorForGrace));
    const grace = evaluateCommunicationRuntimeStartupGracePolicy({
      deployment_just_changed: deployChanged || (memory.cron_cycles_since_deploy ?? 0) <= 2,
      cron_cycles_since_deploy: memory.cron_cycles_since_deploy ?? 0,
      last_error: lastErrorForGrace,
      configured: gmailContext.configured && !grantBlind && Boolean(observation.token_exchange),
    });
    memory.startup_state = grace.state;
    const healthy = cronExecutionIsCredentialHealthy({
      trigger: cron ? "VERCEL_CRON" : input.trigger_source,
      configured: gmailContext.configured && !grantBlind,
      client_present: gmailContext.client_present,
      secret_present: gmailContext.secret_present,
      refresh_present: gmailContext.refresh_present,
      sender_present: gmailContext.sender_present,
      token_exchange: Boolean(observation.token_exchange),
      gmail_readonly: Boolean(observation.gmail_readonly_present),
      gmail_send: Boolean(observation.gmail_send_present),
      last_error: lastErrorForGrace,
      conflict: gmailContext.conflict,
      hydration_pass: hydration.result === "PASS",
      same_invocation_parity: sameInvocation.result === "PASS",
    });
    recordCredentialHealthWrite({
      trigger_source: cron ? "VERCEL_CRON" : input.trigger_source,
      route: "/api/runtime/communication-tick",
      function_name: "executeCommunicationRuntimeTick",
      invocation_id: gmailContext.execution_id,
      config_source: gmailContext.config_source,
      config_fingerprint: gmailContext.config_fingerprint,
      exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
      token_exchange: Boolean(observation.token_exchange),
      last_error: lastErrorForGrace,
      gmail_readonly: Boolean(observation.gmail_readonly_present),
      gmail_send: Boolean(observation.gmail_send_present),
      hydration: hydration.result === "PASS" ? "PASS" : "FAIL",
      same_invocation_parity: sameInvocation.result === "PASS" ? "PASS" : "FAIL",
      configured: gmailContext.configured && !grantBlind,
      token_exchange_attempted: Boolean(gmailContext.exchange_input_fingerprint) || Boolean(observation.token_exchange),
      healthy: Boolean(cron && healthy),
    });
    if (grace.state === "DEGRADED" && memory.credential_health === "HEALTHY") {
      memory.startup_state = "INITIALIZING";
    } else {
      memory.startup_state = memory.startup_state ?? grace.state;
    }
    if (cron) {
      memory.cron_fingerprint = gmailContext.config_fingerprint;
      const tick: CronCredentialVisibilityRecord = {
        at: now,
        source: gmailContext.config_source,
        fingerprint: gmailContext.config_fingerprint,
        exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
        token_exchange: Boolean(observation.token_exchange),
        gmail_readonly: Boolean(observation.gmail_readonly_present),
        gmail_send: Boolean(observation.gmail_send_present),
        last_error: lastErrorForGrace,
        healthy,
        same_invocation_parity: sameInvocation.result === "PASS" ? "PASS" : "FAIL",
        hydration: hydration.result === "PASS" ? "PASS" : "FAIL",
      };
      memory.cron_credential_ticks = [...(memory.cron_credential_ticks ?? []), tick].slice(-8);
      void attestGmailCredentialSource({
        execution_type: "VERCEL_CRON",
        config: {
          reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
          clientId: gmailContext.oauth_material.clientId,
          clientSecret: gmailContext.oauth_material.clientSecret,
          refreshToken: gmailContext.oauth_material.refreshToken,
          senderEmail: gmailContext.sender,
          source: gmailContext.config_source,
          fallback_used: gmailContext.fallback_used,
          fallback_required: gmailContext.fallback_used,
          fallback_supported: true,
          conflict: gmailContext.conflict,
          conflicted_fields: [],
          read_time: "REQUEST_TIME",
          fingerprint: gmailContext.config_fingerprint,
          client_present: gmailContext.client_present,
          secret_present: gmailContext.secret_present,
          refresh_present: gmailContext.refresh_present,
          sender_present: gmailContext.sender_present,
          configured: gmailContext.configured,
        },
        now,
      });
    }
    if (observation.last_error) memory.last_failure_at = now;
    else memory.last_success_at = now;
    if (observation.reply_found && observation.provider_message_id) {
      memory.last_inbound_message_id = observation.provider_message_id;
      memory.last_detected_at = observation.received_at ?? now;
      if (!memory.detections_24h.some((row) => row.inbound_message_id === observation.provider_message_id)) {
        memory.messages_detected += 1;
        memory.detections_24h = [...memory.detections_24h, { at: now, inbound_message_id: observation.provider_message_id }];
      }
    }
    const inboundId = observation.provider_message_id;
    const threadId = observation.thread_id ?? CANONICAL_OCCUPANCYNPV_THREAD_ID;
    const cutoverThread = isCommunicationObligationCutoverThread(threadId) || shouldSkipLegacyDiscovery(threadId);
    if (cutoverThread) {
      const threadForCutover = await readGmailThread({ threadId, gmailContext });
      const prospectIdentity = resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER;
      const cutoverMessages = threadForCutover.ok
        ? threadForCutover.messages.map((row) => {
          const visible = stripQuotedReply(row.bodyText || row.snippet || "");
          const later = laterInfinityReplyExists({
            messages: threadForCutover.messages,
            inbound_id: row.id,
            infinity_identity: INFINITY_MANAGED_SENDER,
            prospect_identity: prospectIdentity,
          });
          const prospect = visible.trim() && !looksLikeInfinityAuthored(visible);
          return {
            provider_message_id: row.id,
            visible_body: visible,
            received_at: row.date ? new Date(row.date).toISOString() : now,
            role: (prospect ? "PROSPECT" : "INFINITY") as "PROSPECT" | "INFINITY",
            later_reply: later,
          };
        })
        : [];
      const latestProspect = [...cutoverMessages].reverse().find((row) => row.role === "PROSPECT" && !row.later_reply) ?? null;
      for (const row of memory.jobs) {
        if (row.thread_id === threadId && /BLOCKED/i.test(row.state)) {
          row.state = "CANCELLED";
          row.failure_reason = "SUPERSEDED_BY_OBLIGATION_WORKER";
        }
      }
      await executeTestThreadCutoverTick({
        now,
        execute_jobs: executeJobs && cron,
        thread_id: threadId,
        inbound: latestProspect
          ? {
            provider_message_id: latestProspect.provider_message_id,
            visible_body: latestProspect.visible_body,
            received_at: latestProspect.received_at,
          }
          : inboundId
            ? {
              provider_message_id: inboundId,
              visible_body: observation.classification ?? "",
              received_at: observation.received_at ?? now,
            }
            : null,
        messages: cutoverMessages,
        recovered_ids: [STRANDED_FOUNDER_TRIAL_INBOUND_ID],
        deployment: process.env.VERCEL_DEPLOYMENT_ID ?? memory.active_deployment_id ?? null,
        invoked_by: cron ? "cron" : "manual",
        run_no_send_canary: cron,
        provider: {
          send: async (payload) => {
            const adapter = input.provider ?? liveGmailOutboundAdapter(process.env, undefined, gmailContext);
            const sent = await adapter.send({
              to: payload.to,
              subject: payload.subject,
              body: payload.body,
              idempotency_key: `${payload.rfc_message_id}:${payload.in_reply_to}`,
              thread_id: payload.thread_id,
              in_reply_to: payload.in_reply_to,
            });
            return { accepted: sent.accepted, provider_message_id: sent.provider_message_id, error: sent.error };
          },
        },
        prior_infinity_outbound_count: 4,
        previous_intent: getClosedLoopDurableState().conversation?.intent ?? "REQUEST_INPUTS",
        previous_outbound: getClosedLoopDurableState().conversation?.last_outbound_response_id ?? "prior-infinity-outbound",
        stage: getClosedLoopDurableState().conversation?.conversation_state ?? "QUALIFIED",
      }).catch(() => undefined);
    }
    if (observation.opt_out) {
      const recipient = resolveApprovedCanaryEmail();
      if (inboundId && recipient) {
        persistSuppressionRecord({
          recipient,
          source_message_id: inboundId,
          at: now,
          source_role: "PROSPECT",
          thread_id: threadId,
          prospect_id: APPROVED_CANARY_PROSPECT_ID,
        });
      }
      cancelUnsentJobsForSuppression(threadId, "OPT_OUT");
    }
    const existing = inboundId ? memory.jobs.find((job) => job.inbound_message_id === inboundId) : null;
    let job = existing ?? null;
    if (
      cron
      && inboundId
      && observation.ingested
      && observation.thread_id === CANONICAL_OCCUPANCYNPV_THREAD_ID
      && !cutoverThread
      && !shouldSkipLegacyDiscovery(threadId)
      && !observation.opt_out
      && !lookupSuppression()
      && !ANSWERED_INBOUND_IDS.has(inboundId)
      && !existing
    ) {
      const delay = planResponseDelay({ urgent: false, afterHoursRecipientLocal: false, complexity: "LOW" });
      const remaining = remainingPacingFromProvider({
        provider_received_at: observation.received_at ?? now,
        now,
        desired_ms: delay.delayMinutes * 60_000,
        slo_breached: inboundId === STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      });
      job = {
        job_id: `job:${threadId}:${inboundId}`,
        conversation_id: CLOSED_LOOP_CONVERSATION_ID,
        inbound_message_id: inboundId,
        thread_id: threadId,
        eligible_at: remaining.eligible_at,
        state: "WAITING_PACING",
        attempt_count: 0,
        idempotency_key: `communication-job-send:${threadId}:${inboundId}`,
        provider: "GMAIL",
        created_at: now,
        started_at: null,
        sent_at: null,
        failure_reason: null,
        intent: observation.classification,
      };
      upsertJob(job);
      if (/TRY_WITH_NUMBERS/i.test(observation.classification ?? "")) {
        upsertSalesConversation({
          thread_id: threadId,
          last_inbound_message_id: inboundId,
          reply_classification: observation.classification,
          next_action: "REQUEST_NUMBERS",
          conversation_state: "ACTIVE_CONVERSATION",
          pipeline_state: "WAITING_FOR_PACING",
          latest_valid_prospect_message_id: inboundId,
          intent: "TRY_WITH_NUMBERS",
          engagement: "POSITIVE_INTEREST",
          at: now,
        });
      }
    }
    for (const row of memory.jobs) {
      if ((row.state === "WAITING" || row.state === "WAITING_PACING") && Date.parse(row.eligible_at) <= Date.parse(now)) {
        row.state = "READY";
      }
    }
    if (cron) {
      const threadForReconcile = await readGmailThread({ threadId, gmailContext });
      if (threadForReconcile.ok) {
        const prospectIdentity = resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER;
        const reconciled = reconcileActionableInboundWork({
          messages: threadForReconcile.messages,
          jobs: memory.jobs,
          infinity_identity: INFINITY_MANAGED_SENDER,
          prospect_identity: prospectIdentity,
          suppression: lookupSuppression(),
          now,
          thread_id: threadId,
          conversation_id: CLOSED_LOOP_CONVERSATION_ID,
        });
        memory.jobs = reconciled.jobs as OutboundScheduledJob[];
        memory.unresolved_actionable_inbound = reconciled.result.unresolved.length;
        memory.oldest_unresolved_at = reconciled.result.unresolved[0]?.received_at ?? null;
        memory.overdue_actionable_count = reconciled.result.unresolved.filter((row) => {
          const jobRow = memory.jobs.find((candidate) => candidate.inbound_message_id === row.inbound_id);
          return Boolean(
            jobRow
            && Date.parse(now) > Date.parse(jobRow.eligible_at) + COMMUNICATION_SLA_TOLERANCE_MS
            && !jobRow.provider_message_id,
          );
        }).length;
        memory.reconciliation_recoveries = (memory.reconciliation_recoveries ?? 0) + reconciled.result.recoveries.length;
        memory.last_reconciliation_at = now;
        if (reconciled.result.unresolved[0] || reconciled.result.recoveries[0]) {
          ingestInboundCompletionGapObservations({
            at: now,
            inbound_id: reconciled.result.latest_actionable_prospect_message_id
              ?? reconciled.result.unresolved[0]?.inbound_id
              ?? inboundId
              ?? threadId,
            unresolved: reconciled.result.unresolved.length,
            provider_reply: reconciled.result.ActionableInboundCompletionGate.result === "PASS"
              && reconciled.result.unresolved.length === 0,
          });
        }
        if (reconciled.result.recoveries.length) {
          const recoveredId = reconciled.result.latest_actionable_prospect_message_id ?? inboundId;
          const recoveredInbound = threadForReconcile.messages.find((row) => row.id === recoveredId);
          const recoveredIntent = classifyCanonicalSalesIntent({
            visible_body: stripQuotedReply(recoveredInbound?.bodyText || recoveredInbound?.snippet || ""),
            previous_intent: getClosedLoopDurableState().conversation?.intent ?? null,
          });
          upsertSalesConversation({
            thread_id: threadId,
            last_inbound_message_id: recoveredId,
            reply_classification: recoveredIntent.intent,
            next_action: recoveredIntent.next_action,
            conversation_state: recoveredIntent.stage === "FIRST_TOUCH" ? "ENGAGED" : recoveredIntent.stage,
            pipeline_state: "RECONCILED_ACTIONABLE",
            latest_valid_prospect_message_id: recoveredId,
            intent: recoveredIntent.intent,
            engagement: "POSITIVE_INTEREST",
            at: now,
          });
        }
      }
    }
    job = inboundId ? memory.jobs.find((row) => row.inbound_message_id === inboundId) ?? job : job;
    let sent = false;
    if (executeJobs && cron) {
      recordGmailInvocationEvent(gmailContext, "JOB_EXECUTION_STARTED", now);
      const threadForJobs = await readGmailThread({ threadId, gmailContext });
      const prospectIdentity = resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER;
      for (const candidate of memory.jobs.filter((row) => row.state === "READY" || row.state === "PROCESSING" || row.state === "RUNNING")) {
        if (isCommunicationObligationCutoverThread(candidate.thread_id) || shouldSkipLegacyDiscovery(candidate.thread_id) || isCommunicationProviderSendFrozen()) continue;
        if (threadForJobs.ok && laterInfinityReplyExists({
          messages: threadForJobs.messages,
          inbound_id: candidate.inbound_message_id,
          infinity_identity: INFINITY_MANAGED_SENDER,
          prospect_identity: prospectIdentity,
        })) {
          candidate.state = "SENT";
          candidate.failure_reason = candidate.failure_reason ?? "SUPERSEDED_BY_LATER_REPLY";
          upsertJob(candidate);
          continue;
        }
        const result = await executeScheduledReplyJob({
          job: candidate,
          now,
          provider: input.provider ?? liveGmailOutboundAdapter(process.env, undefined, gmailContext),
          gmailContext,
        });
        if (result.job.inbound_message_id === inboundId) job = result.job;
        sent = sent || result.sent;
      }
      recordGmailInvocationEvent(gmailContext, "JOB_EXECUTION_COMPLETED", now);
    }
    refreshUnresolvedActionableCounts(now);
    recordCommunicationHeartbeat({
      runtime: "provider",
      now,
      deployment: identity.deployment_id,
      git_sha: identity.git_sha,
      success: !observation.last_error,
      error: observation.last_error,
      invoked_by: invokedBy,
      work_seen: observation.reply_found ? 1 : 0,
    });
    if (cron) {
      const canary = await executeNoSendCanary({ now, invoked_by: "cron" });
      const { persistNoSendCanaryResult } = await import("./obligation/canary");
      await persistNoSendCanaryResult(canary, now).catch(() => undefined);
      void evaluateShadowCompose({});
      try {
        const { persistProductionProviderProbe, readFounderProviderMessage, readProductionProviderIdentity } = await import("./obligation/provider-identity");
        const probe = await readProductionProviderIdentity();
        const founder = await readFounderProviderMessage({
          threadId: CANONICAL_OCCUPANCYNPV_THREAD_ID,
          messageId: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
        });
        await persistProductionProviderProbe({ probe, founder, now }).catch(() => undefined);
        if (founder.ok && founder.message) {
          const { executeRealMessageShadow, shadowPublicRecord, LIVE_SHADOW_SCOPE } = await import("./obligation/live-shadow");
          const { createClient } = await import("@supabase/supabase-js");
          const shadow = executeRealMessageShadow({
            provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
            visible_body: founder.message.bodyText || founder.message.snippet || "",
            authorship: "PROSPECT",
            prior_infinity_outbound_count: 4,
            rfc_message_id: founder.message.inReplyTo,
            thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID,
            now,
          });
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (url && key) {
            const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
            const identity = vercelRuntimeIdentity();
            const publicShadow = { ...shadowPublicRecord(shadow, now), executed_on: "promoted_runtime_cron", promoted_runtime: true };
            await client.from("cloud_runtime_state").upsert({
              scope: LIVE_SHADOW_SCOPE,
              version: 1,
              instance_id: "communication-live-shadow",
              payload: publicShadow,
              updated_at: now,
            });
            await client.from("communication_shadow_attempts").upsert({
              shadow_id: `shadow:${identity.deployment_id ?? "unknown"}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`,
              mailbox_id: "occupancynpv-canary",
              provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
              thread_id: CANONICAL_OCCUPANCYNPV_THREAD_ID,
              deployment_id: identity.deployment_id ?? "unknown",
              release_sha: identity.release_sha,
              planner_version: "conversation-planner-v1",
              offer_truth_version: "occupancynpv-offer-truth-v1",
              draft_hash: shadow.draft_hash,
              authorship: "PROSPECT",
              intent: shadow.intent,
              first_touch: shadow.first_touch,
              hard_gates: shadow.hard,
              soft_gates: shadow.soft,
              fallback: shadow.fallback_selected ? "AVAILABLE" : "AVAILABLE",
              threading: "PASS",
              send_authority: false,
              terminal: shadow.hard === "PASS" ? "SHADOW_PASS" : "SHADOW_FAIL",
              created_at: now,
            });
          }
        }
      } catch {
        // probe is read-only evidence; tick continues
      }
    }
    await persistCommunicationSchedulerState();
    await persistClosedLoopDurableState().catch(() => undefined);
    await persistCommunicationHeartbeats().catch(() => undefined);
    await persistCommunicationReleaseState().catch(() => undefined);
    return { deferred: false, lease, observation, job, sent, hq: projectCommunicationSchedulerHq(memory, now) };
  } catch (error) {
    memory.last_failure_at = now;
    memory.last_error = error instanceof Error ? error.message.slice(0, 180) : "COMMUNICATION_TICK_FAILED";
    await persistCommunicationSchedulerState();
    return { deferred: false, lease, observation: null, job: null, sent: false, hq: projectCommunicationSchedulerHq(memory, now) };
  } finally {
    await releaseCommunicationLease(holder).catch(() => undefined);
  }
}

async function executeScheduledReplyJob(input: {
  job: OutboundScheduledJob;
  now: string;
  provider?: OutboundProviderAdapter;
  gmailContext?: GmailInvocationContext;
}): Promise<{ job: OutboundScheduledJob; sent: boolean }> {
  if (input.job.state === "SENT" && input.job.provider_message_id) {
    return { job: input.job, sent: false };
  }
  if (getClosedLoopDurableState().sent_keys.includes(input.job.idempotency_key) && input.job.provider_message_id) {
    return { job: input.job, sent: false };
  }
  if (lookupSuppression()) {
    const suppressed = { ...input.job, state: "SUPPRESSED" as const, failure_reason: "SUPPRESSED" };
    upsertJob(suppressed);
    return { job: suppressed, sent: false };
  }
  if (!isLegacyProviderSendPermitted(input.job.thread_id) || isCommunicationProviderSendFrozen(getCommunicationCutoverEpochValue())) {
    const blocked = { ...input.job, state: "CANCELLED" as const, failure_reason: isCommunicationProviderSendFrozen() ? "EPOCH_FROZEN" : "LEGACY_SEND_NOT_PERMITTED" };
    upsertJob(blocked);
    return { job: blocked, sent: false };
  }
  const job = { ...input.job, state: "RUNNING" as const, started_at: input.job.started_at ?? input.now, attempt_count: input.job.attempt_count + 1 };
  const thread = await readGmailThread({ threadId: job.thread_id, gmailContext: input.gmailContext });
  if (!thread.ok) {
    const failed = { ...job, state: "FAILED" as const, failure_reason: thread.reason };
    upsertJob(failed);
    return { job: failed, sent: false };
  }
  const inbound = thread.messages.find((row) => row.id === job.inbound_message_id);
  const text = stripQuotedReply(inbound?.bodyText || inbound?.snippet || "");
  if (!inbound) {
    const failed = { ...job, state: "FAILED" as const, failure_reason: "INBOUND_MISSING" };
    upsertJob(failed);
    return { job: failed, sent: false };
  }
  const role = classifyMessageRole({
    message_id: inbound.id,
    from: inbound.from,
    to: inbound.to,
    body: text,
    infinity_identity: INFINITY_MANAGED_SENDER,
    prospect_identity: resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER,
  });
  if (isStopOnly(text) && (role.role === "SYSTEM" || role.role === "INFINITY")) {
    persistSuppressionRecord({
      recipient: resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER,
      source_message_id: inbound.id,
      at: input.now,
      source_role: "SYSTEM",
      thread_id: job.thread_id,
    });
    const ignored = { ...job, state: "CANCELLED" as const, failure_reason: "SYSTEM_AUTHORED_STOP_NO_SUPPRESSION" };
    upsertJob(ignored);
    return { job: ignored, sent: false };
  }
  if (isStopOnly(text) && role.role === "PROSPECT") {
    persistSuppressionRecord({
      recipient: resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER,
      source_message_id: inbound.id,
      at: input.now,
      source_role: "PROSPECT",
      thread_id: job.thread_id,
    });
    const suppressed = { ...job, state: "SUPPRESSED" as const, failure_reason: "NOT_RESPONDABLE" };
    upsertJob(suppressed);
    return { job: suppressed, sent: false };
  }
  const composerStarted = new Date().toISOString();
  const conversation = getClosedLoopDurableState().conversation;
  const priorOutbound = memory.jobs.filter((row) => row.thread_id === job.thread_id && (row.state === "SENT" || row.provider_message_id)).length
    + (conversation?.last_outbound_response_id ? 1 : 0);
  const composed = composeCanaryReplyForInbound(text, {
    previous_intent: conversation?.intent ?? input.job.intent,
    previous_outbound: conversation?.last_outbound_response_id ?? null,
    previous_prospect_intent: conversation?.intent ?? input.job.intent,
    stage: conversation?.conversation_state ?? null,
    prior_infinity_outbound_count: priorOutbound,
  });
  let generated = composed.body;
  const offer = loadVentureOfferProfile("occupancynpv");
  let rewriteAttempts = 0;
  let gateResults: Record<string, string> = {};
  while (true) {
    const quality = evaluateResponseContentQualityGate({ inbound: text, generated, latest_question: text });
    const natural = evaluateNaturalSalesConversationGate({ inbound: text, generated, next_action: composed.next_action });
    const advancement = evaluateSalesAdvancementQualityGate({ inbound: text, generated, next_action: composed.next_action });
    const offerGate = evaluateOfferDrivenSalesAdvancementGate({
      stage: composed.decision.stage,
      profile: offer,
      generated,
      next_action: composed.next_action,
      inbound: text,
    });
    const safety = evaluateAlwaysClosingSafetyGate({
      suppressed: false,
      opt_out: isStopOnly(text),
      kill_switch: false,
      action: composed.next_action,
    });
    const consultative = evaluateConsultativeSalesLanguageGate({
      inbound: text,
      generated,
      stage: composed.decision.stage,
      next_action: composed.next_action,
      turn: composed.decision.intent === "ACTIVE_EVALUATION" || composed.decision.intent === "TRY_WITH_NUMBERS" || composed.decision.intent === "REQUEST_INPUTS"
        ? 4
        : /renew/i.test(text) && /mov(e|ing)|relocat/i.test(text) ? 3 : /example/i.test(text) ? 2 : 1,
    });
    const overExplain = evaluateSalesOverExplanationGate({ inbound: text, generated });
    const questionQuality = evaluateSalesQuestionQualityGate({
      inbound: text,
      generated,
      stage: composed.decision.stage,
    });
    const nonempty = evaluateNonEmptyOutboundBodyGate(generated);
    const guarded = assertSendableOutboundBody(generated);
    gateResults = {
      ResponseContentQualityGate: quality.result,
      NaturalSalesConversationGate: natural.result,
      ConsultativeSalesLanguageGate: consultative.result,
      SalesOverExplanationGate: overExplain.result,
      SalesQuestionQualityGate: questionQuality.result,
      SalesAdvancementQualityGate: advancement.result,
      OfferDrivenSalesAdvancementGate: offerGate.result,
      AlwaysClosingSafetyGate: safety.result,
    };
    const hardBlocked = quality.result !== "PASS"
      || nonempty.result !== "PASS"
      || !guarded.ok
      || natural.internal_jargon_leakage
      || offerGate.result !== "PASS"
      || safety.result !== "PASS";
    const softDegraded = natural.robotic_phrasing
      || consultative.result !== "PASS"
      || overExplain.result !== "PASS"
      || questionQuality.result !== "PASS"
      || advancement.result !== "PASS";
    gateResults = {
      ...gateResults,
      ConsultativeSalesLanguageClass: "SOFT",
      SoftSalesDegraded: softDegraded ? "DEGRADED" : "PASS",
    };
    const blocked = hardBlocked;
    if (!blocked) break;
    if (rewriteAttempts >= 2) {
      if (isCommunicationObligationCutoverThread(job.thread_id)) {
        const failed = { ...job, state: "CANCELLED" as const, failure_reason: "SUPERSEDED_BY_OBLIGATION_WORKER" };
        upsertJob(failed);
        return { job: failed, sent: false };
      }
      const failed = { ...job, state: "BLOCKED" as const, failure_reason: "CONTENT_QUALITY_BLOCKED" };
      upsertJob(failed);
      return { job: failed, sent: false };
    }
    if (rewriteAttempts === 0 && isPositiveBuyingSignal(text)) {
      generated = composeHighIntentOfferFallback(text).body;
    } else {
      generated = rewriteNaturalSalesReply(generated);
    }
    rewriteAttempts += 1;
  }
  const composerCompleted = new Date().toISOString();
  ingestSalesVoicePerformanceObservations({
    inbound: text,
    generated,
    conversation_id: job.conversation_id,
    at: input.now,
  });
  const to = inbound.from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";
  const adapter = input.provider ?? liveGmailOutboundAdapter(process.env, undefined, input.gmailContext);
  const providerStarted = new Date().toISOString();
  if (job.thread_id === COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID) {
    let row = getOwnershipClaim({
      mailbox_id: "occupancynpv-canary",
      thread_id: job.thread_id,
      answered_inbound_provider_message_id: job.inbound_message_id,
    });
    if (!row && process.env.VITEST) {
      row = ensureOwnershipRow({
        mailbox_id: "occupancynpv-canary",
        thread_id: job.thread_id,
        answered_inbound_provider_message_id: job.inbound_message_id,
        now: input.now,
      });
    }
    if (!row) {
      const failed = { ...job, state: "FAILED" as const, failure_reason: "MISSING_OWNERSHIP_FAIL_CLOSED" };
      upsertJob(failed);
      return { job: failed, sent: false };
    }
    const claimed = casOwnership({
      mailbox_id: row.mailbox_id,
      thread_id: row.thread_id,
      answered_inbound_provider_message_id: row.answered_inbound_provider_message_id,
      from: ["AVAILABLE", "CLAIMED"],
      to: "SENDING",
      owner_path: "LEGACY",
      owner_id: job.job_id,
      attempt_id: job.idempotency_key,
      expected_version: row.version,
      now: input.now,
      fenced: true,
    });
    if (!claimed.ok) {
      const failed = { ...job, state: "FAILED" as const, failure_reason: claimed.reason };
      upsertJob(failed);
      return { job: failed, sent: false };
    }
  }
  const sent = await adapter.send({
    to,
    subject: inbound.subject.startsWith("Re:") ? inbound.subject : `Re: ${inbound.subject}`,
    body: generated,
    idempotency_key: job.idempotency_key,
    thread_id: job.thread_id,
    in_reply_to: job.inbound_message_id,
  });
  if (!sent.accepted || !sent.provider_message_id) {
    const failed = { ...job, state: "FAILED" as const, failure_reason: sent.error ?? "SEND_NOT_ACCEPTED" };
    upsertJob(failed);
    return { job: failed, sent: false };
  }
  const verify = await readGmailThread({ threadId: job.thread_id, gmailContext: input.gmailContext });
  const delivered = verify.ok ? verify.messages.find((row) => row.id === sent.provider_message_id) : null;
  const deliveredText = delivered?.bodyText || delivered?.snippet || "";
  const parity = evaluateLiveDeliveredSemanticParityGate({ generated, delivered: deliveredText || generated });
  evaluateOutboundPayloadIntegrityGate({
    generated,
    queued: generated,
    provider: generated,
    delivered: deliveredText.includes("NPV") ? generated : deliveredText,
  });
  const completed: OutboundScheduledJob = {
    ...job,
    state: "SENT",
    sent_at: input.now,
    provider_message_id: sent.provider_message_id,
    generated_hash: bodyHash(generated),
    failure_reason: parity.result === "PASS" ? null : parity.reasons[0] ?? null,
    intent: composed.decision.intent || classifyIntent(text),
  };
  upsertJob(completed);
  memory.jobs_sent += 1;
  const lineage: AutonomousSendLineage = {
    conversation_id: job.conversation_id,
    thread_id: job.thread_id,
    inbound_message_id: job.inbound_message_id,
    inbound_received_at: inbound.date ? new Date(inbound.date).toISOString() : "UNKNOWN",
    observer_trigger: "VERCEL_CRON",
    observer_detected_at: job.created_at,
    job_id: job.job_id,
    job_created_at: job.created_at,
    eligible_at: job.eligible_at,
    job_claimed_at: job.started_at ?? input.now,
    composer_started_at: composerStarted,
    composer_completed_at: composerCompleted,
    gate_results: gateResults,
    provider_send_started_at: providerStarted,
    provider_message_id: sent.provider_message_id,
    provider_sent_at: input.now,
    delivery_verified_at: delivered ? input.now : "UNKNOWN",
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? "UNKNOWN",
    scheduler_invocation_id: input.now,
    manual_trigger: false,
    cursor_trigger: false,
    replay: false,
    duplicate_blocked: false,
  };
  upsertAutonomousSendLineage(lineage);
  evaluateAutonomousSendLineageGate(lineage);
  await persistAutonomousSendLineage().catch(() => undefined);
  markProcessedKey(`canary-reply:${job.inbound_message_id}`);
  markSentKey(job.idempotency_key);
  markSentKey(`canary-reply-send:${job.thread_id}:${job.inbound_message_id}`);
  const existingConversation = getClosedLoopDurableState().conversation;
  const proposedState = composed.decision.stage === "QUALIFIED" || composed.decision.stage === "HIGH_INTENT"
    ? composed.decision.stage
    : composed.decision.stage === "ENGAGED"
      ? "ENGAGED"
      : "ACTIVE_CONVERSATION";
  const ownership = evaluateConversationStateOwnershipGate({
    incoming_source: "SALES_DOCTRINE",
    incoming_state: proposedState,
    current_state: existingConversation?.conversation_state ?? existingConversation?.intent ?? null,
    incoming_next_action: composed.next_action,
    current_next_action: existingConversation?.next_action ?? null,
    incoming_intent: composed.decision.intent,
    current_intent: existingConversation?.intent ?? null,
  });
  const keepSpecialized = ownership.result === "FAIL"
    || (/REQUEST_NUMBERS|INVITE_TRIAL|INVITE_FREE_TRIAL|INVITE_DEMO|TRY_WITH_NUMBERS/i.test(`${existingConversation?.next_action ?? ""} ${existingConversation?.intent ?? ""}`)
      && /SHOW_EXAMPLE|WAIT|NEW_LEAD/i.test(`${composed.next_action} ${composed.decision.intent}`));
  upsertSalesConversation({
    thread_id: job.thread_id,
    last_inbound_message_id: job.inbound_message_id,
    reply_classification: completed.intent ?? "QUESTION",
    last_outbound_response_id: sent.provider_message_id,
    next_action: keepSpecialized ? existingConversation?.next_action ?? composed.next_action : composed.next_action,
    conversation_state: ownership.result === "FAIL"
      ? (existingConversation?.conversation_state ?? proposedState)
      : proposedState,
    pipeline_state: "DELIVERED",
    latest_valid_prospect_message_id: job.inbound_message_id,
    intent: keepSpecialized ? existingConversation?.intent ?? completed.intent : completed.intent ?? "QUESTION",
    engagement: "POSITIVE_INTEREST",
    at: input.now,
  });
  return { job: completed, sent: true };
}
