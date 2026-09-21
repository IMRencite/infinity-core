import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import {
  GMAIL_INVOCATION_CONTEXT_VERSION,
  evaluateGmailConfigHydrationGate,
  evaluateGmailSameInvocationParityGate,
  evaluateGmailTokenExchangeInputGate,
  publicGmailInvocationSnapshot,
  resolveGmailInvocationContext,
} from "@/lib/infinity/communication-provider/gmail-invocation-context";
import {
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  attestGmailCredentialSource,
  inspectGmailRuntimeAudit,
} from "@/lib/infinity/communication-provider/gmail-runtime-config";
import {
  classifyCommunicationTickSource,
  evaluateAlwaysOnMailboxWatchGate,
  evaluateCommunicationRuntimeCronHealthGate,
  evaluateCommunicationRuntimeEnvironmentParityGate,
  evaluateCommunicationRuntimeSchedulerAuthGate,
  executeCommunicationRuntimeTick,
} from "@/lib/infinity/production-outbound/communication-runtime";
import { runtimeReleaseIdentity } from "@/lib/infinity/production-outbound/obligation/release-identity";
import { vercelRuntimeIdentity } from "@/lib/infinity/production-outbound/obligation/release";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  const authGate = evaluateCommunicationRuntimeSchedulerAuthGate(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason, authGate }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("mode") === "safe") {
    return NextResponse.json({
      mode: "safe",
      business_send: false,
      execute_jobs: false,
      auth: auth.reason,
      identity: vercelRuntimeIdentity(),
      release: runtimeReleaseIdentity(),
    });
  }
  const trigger = classifyCommunicationTickSource(request);
  const gmailContext = resolveGmailInvocationContext({
    trigger_source: trigger,
  });
  const hydration = evaluateGmailConfigHydrationGate({ context: gmailContext });
  const sourceAttestation = attestGmailCredentialSource({
    execution_type: trigger === "VERCEL_CRON" ? "VERCEL_CRON" : "HTTP",
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
  });
  const result = await executeCommunicationRuntimeTick({
    trigger_source: trigger,
    cursor_triggered: trigger !== "VERCEL_CRON",
    execute_jobs: trigger === "VERCEL_CRON",
    gmailContext,
  });
  const sameInvocation = evaluateGmailSameInvocationParityGate({
    resolved_fingerprint: gmailContext.config_fingerprint,
    exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
  });
  const exchangeInput = evaluateGmailTokenExchangeInputGate({
    context_fingerprint: gmailContext.config_fingerprint,
    exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
  });
  const envParity = evaluateCommunicationRuntimeEnvironmentParityGate({
    cron_client_present: gmailContext.client_present,
    cron_secret_present: gmailContext.secret_present,
    cron_refresh_present: gmailContext.refresh_present,
    cron_sender_present: gmailContext.sender_present,
    runtime_client_present: gmailContext.client_present,
    runtime_secret_present: gmailContext.secret_present,
    runtime_refresh_present: gmailContext.refresh_present,
    runtime_sender_present: gmailContext.sender_present,
    cron_fingerprint: gmailContext.config_fingerprint,
  });
  const cronHealth = evaluateCommunicationRuntimeCronHealthGate({
    trigger_source: trigger,
    last_error: result.hq.last_error === "LEASE_HELD" ? null : result.hq.last_error,
    last_gmail_check_at: result.hq.last_gmail_check_at,
    token_exchange: result.observation?.token_exchange ?? result.hq.token_exchange,
    gmail_send_present: result.observation?.gmail_send_present ?? result.hq.gmail_send_present,
    gmail_readonly_present: result.observation?.gmail_readonly_present ?? result.hq.gmail_readonly_present,
  });
  const mailboxWatch = evaluateAlwaysOnMailboxWatchGate({
    last_gmail_check_at: result.hq.last_gmail_check_at,
    token_exchange: result.observation?.token_exchange ?? result.hq.token_exchange,
    last_error: result.hq.last_error === "LEASE_HELD" ? null : result.hq.last_error,
    cron_bound: trigger === "VERCEL_CRON",
  });
  return NextResponse.json({
    host: "vercel-cron",
    cadence: "*/5 * * * *",
    trigger,
    deferred: result.deferred,
    inbound: result.observation
      ? {
        inbound_connection: result.observation.inbound_connection,
        detector_mode: result.observation.detector_mode,
        last_successful_check: result.observation.last_successful_check,
        reply_found: result.observation.reply_found,
        provider_message_id: result.observation.provider_message_id,
        thread_id: result.observation.thread_id,
        ingested: result.observation.ingested,
        classification: result.observation.classification,
        duplicate: result.observation.duplicate,
        send_attempted: result.observation.send_attempted,
        send_accepted: result.observation.send_accepted,
      }
      : null,
    job: result.job
      ? {
        job_id: result.job.job_id,
        inbound_message_id: result.job.inbound_message_id,
        state: result.job.state,
        eligible_at: result.job.eligible_at,
        provider_message_id: result.job.provider_message_id ?? null,
      }
      : null,
    sent: result.sent,
    scheduler: result.hq,
    authGate,
    CommunicationRuntimeEnvironmentParityGate: envParity,
    CommunicationRuntimeCronHealthGate: cronHealth,
    AlwaysOnMailboxWatchGate: mailboxWatch,
    GmailConfigHydrationGate: hydration,
    GmailTokenExchangeInputGate: exchangeInput,
    GmailSameInvocationParityGate: sameInvocation,
    gmailAttestation: {
      clientIdPresent: gmailContext.client_present,
      clientSecretPresent: gmailContext.secret_present,
      refreshTokenPresent: gmailContext.refresh_present,
      senderEmailDeclared: gmailContext.sender_present,
    },
    gmailRuntime: {
      reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
      context_version: GMAIL_INVOCATION_CONTEXT_VERSION,
      source: gmailContext.config_source,
      fingerprint: gmailContext.config_fingerprint,
      exchange_input_fingerprint: gmailContext.exchange_input_fingerprint,
      fallback_used: gmailContext.fallback_used,
      conflict: gmailContext.conflict,
      attestation: sourceAttestation,
      invocation: publicGmailInvocationSnapshot(gmailContext),
      audit: inspectGmailRuntimeAudit({
        route: "/api/runtime/communication-tick",
        runtime: "NODE",
        bundle: "WEBPACK",
        execution_type: trigger === "VERCEL_CRON" ? "VERCEL_CRON" : "HTTP",
        source: gmailContext.config_source,
        fallback_used: gmailContext.fallback_used,
      }),
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
