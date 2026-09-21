import { NextResponse } from "next/server";
import { authorizeRuntimeTickRequest } from "@/lib/infinity/growth-engine/runtime-tick-auth";
import { buildLiveOperatingStateReadModel } from "@/lib/infinity/growth-engine/hq-runtime-projection";
import {
  createProductionCloudRuntimeStore,
  projectCloudRuntimeHq,
} from "@/lib/infinity/cloud-runtime";
import {
  getCommunicationSchedulerState,
  hydrateCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
} from "@/lib/infinity/production-outbound/communication-runtime";
import { backfillT4AutonomousSendLineage, hydrateAutonomousSendLineage } from "@/lib/infinity/production-outbound/autonomous-send-lineage";
import { inspectCommunicationCredentialAttestation } from "@/lib/infinity/communication-provider/credential-boundary";
import {
  GMAIL_RUNTIME_CONFIG_READER_VERSION,
  attestGmailCredentialSource,
  inspectGmailRuntimeAudit,
  readGmailRuntimeConfig,
} from "@/lib/infinity/communication-provider/gmail-runtime-config";
import { recordHttpGmailCredentialObservation } from "@/lib/infinity/production-outbound/communication-runtime";
import { CONSULTATIVE_SALES_COMPOSER_VERSION, CONSULTATIVE_SALES_LIVE_GATES } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { evaluateLiveConsultativeSalesComposerParityGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { getClosedLoopDurableState, hydrateClosedLoopDurableState } from "@/lib/infinity/production-outbound/closed-loop-durable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const auth = authorizeRuntimeTickRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized", reason: auth.reason }, { status: 401 });
  }
  const live = buildLiveOperatingStateReadModel({});
  const store = createProductionCloudRuntimeStore();
  const state = await store.load(new Date().toISOString());
  await hydrateCommunicationSchedulerState().catch(() => undefined);
  await hydrateClosedLoopDurableState().catch(() => undefined);
  await hydrateAutonomousSendLineage().catch(() => undefined);
  const t4 = getCommunicationSchedulerState().jobs.find((row) => row.job_id === "job:1a0af74557b0eb36:1a0b3b2bd5ab75a7" && row.state === "SENT");
  if (t4) {
    await backfillT4AutonomousSendLineage({
      job_id: t4.job_id,
      inbound_message_id: t4.inbound_message_id,
      provider_message_id: t4.provider_message_id,
      job_state: t4.state,
    }).catch(() => undefined);
  }
  await recordHttpGmailCredentialObservation();
  const gmail = inspectCommunicationCredentialAttestation();
  const config = readGmailRuntimeConfig();
  const sourceAttestation = attestGmailCredentialSource({ execution_type: "HTTP", config });
  return NextResponse.json({
    status: live.ok ? "BOUND" : "RUNTIME_UNREACHABLE",
    freshness: live.freshness,
    state: live.state,
    cloudRuntime: projectCloudRuntimeHq(state),
    communicationScheduler: projectCommunicationSchedulerHq(),
    consultativeComposer: {
      version: CONSULTATIVE_SALES_COMPOSER_VERSION,
      gates: CONSULTATIVE_SALES_LIVE_GATES,
      parity: evaluateLiveConsultativeSalesComposerParityGate({
        live_version: CONSULTATIVE_SALES_COMPOSER_VERSION,
        gates_present: [...CONSULTATIVE_SALES_LIVE_GATES],
      }),
    },
    closedLoop: {
      conversation_state: getClosedLoopDurableState().conversation?.conversation_state ?? null,
      next_action: getClosedLoopDurableState().conversation?.next_action ?? null,
      suppression: getClosedLoopDurableState().suppression,
    },
    gmailAttestation: {
      clientIdPresent: gmail.clientIdPresent,
      clientSecretPresent: gmail.clientSecretPresent,
      refreshTokenPresent: gmail.refreshTokenPresent,
      senderEmailDeclared: gmail.senderEmailDeclared,
    },
    gmailRuntime: {
      reader_version: GMAIL_RUNTIME_CONFIG_READER_VERSION,
      source: config.source,
      fingerprint: config.fingerprint,
      fallback_used: config.fallback_used,
      conflict: config.conflict,
      attestation: sourceAttestation,
      audit: inspectGmailRuntimeAudit({
        route: "/api/runtime/operating-state",
        runtime: "NODE",
        bundle: "WEBPACK",
        execution_type: "HTTP",
        source: config.source,
        fallback_used: config.fallback_used,
      }),
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  return GET(request);
}
