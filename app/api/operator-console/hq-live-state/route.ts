import { NextResponse } from "next/server";
import { getOperatorOrgContext } from "@/lib/infinity/operator-console/auth";
import { loadHqCanonicalLiveState, withFinancialTruthLiveState, type HqCanonicalLiveState } from "@/lib/infinity/operator-console/hq-canonical-live-state";
import {
  isLocalHqObservabilityProofRequest,
  localHqProofOrganizationId,
} from "@/lib/infinity/operator-console/local-hq-proof";
import {
  financialTruthNeedsCatchUpRefresh,
  loadCachedFinancialTruthView,
  loadFinancialTruthView,
} from "@/lib/infinity/financial-truth/live";
import { fetchCanonicalProductionOperatingState } from "@/lib/infinity/growth-engine/hq-runtime-binding";
import type { CloudRuntimeHqProjection } from "@/lib/infinity/cloud-runtime/types";
import { publishCanonicalPublicOccupancy } from "@/lib/infinity/public-operations-projection/publish-occupancy";
import { hydrateSalesLearningState } from "@/lib/infinity/sales-learning/persist";
import { getDefaultSalesLearningState } from "@/lib/infinity/sales-learning/store";
import { hydrateProductionOutboundState } from "@/lib/infinity/production-outbound/persist";
import { getDefaultProductionOutboundState } from "@/lib/infinity/production-outbound/store";
import { hydrateOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/persist";
import { getOrganicContinuousState } from "@/lib/infinity/organic-growth-engine/continuous/store";
import { projectPublicOrganicActivity } from "@/lib/infinity/organic-growth-engine/continuous/public";
import { projectOrganicGrowthHq } from "@/lib/infinity/organic-growth-engine/continuous/hq";
import { projectOrganicRuntimeHq } from "@/lib/infinity/organic-growth-engine/obligation/hq";
import { getLastOrganicEffectiveExecutionState, hydrateOrganicGrowthSchedulerState } from "@/lib/infinity/organic-growth-engine/obligation/persist";
import { hydrateRemoteCurrentImplementationWork } from "@/lib/infinity/canonical-work/remote-persist";
import {
  getCommunicationSchedulerState,
  hydrateCommunicationSchedulerState,
  projectCommunicationSchedulerHq,
} from "@/lib/infinity/production-outbound/communication-runtime";
import { hydrateClosedLoopDurableState } from "@/lib/infinity/production-outbound/closed-loop-durable";
import { backfillT4AutonomousSendLineage, hydrateAutonomousSendLineage } from "@/lib/infinity/production-outbound/autonomous-send-lineage";
import { overlayLiveCommercialWork, projectSalesCommandCenterView } from "@/lib/infinity/always-closing-sales/hq";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const result = await getOperatorOrgContext();
  if (result.status === "error") {
    return NextResponse.json({ error: "Workspace unavailable" }, { status: 503 });
  }
  const organizationId =
    result.status === "ok"
      ? result.context.organizationId
      : isLocalHqObservabilityProofRequest(request)
        ? localHqProofOrganizationId()
        : null;
  if (!organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ventureId = new URL(request.url).searchParams.get("ventureId");
  const catchUp = request.headers.get("x-hq-catch-up") === "1";
  await hydrateSalesLearningState(getDefaultSalesLearningState()).catch(() => undefined);
  await hydrateProductionOutboundState(getDefaultProductionOutboundState()).catch(() => undefined);
  await hydrateOrganicContinuousState(getOrganicContinuousState("occupancynpv")).catch(() => undefined);
  await hydrateOrganicGrowthSchedulerState().catch(() => undefined);
  await hydrateRemoteCurrentImplementationWork().catch(() => undefined);
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
  const live = loadHqCanonicalLiveState(organizationId, ventureId);
  live.commandActivity = overlayLiveCommercialWork(live.commandActivity);
  if (live.commandActivity.nowInspecting.lastActivityAt) {
    live.lastActivityAt = live.commandActivity.nowInspecting.lastActivityAt;
    live.lastEventType = "COMMERCIAL_PROGRESS";
  }
  const financialTruth =
    catchUp && financialTruthNeedsCatchUpRefresh()
      ? await loadFinancialTruthView("catch-up")
      : loadCachedFinancialTruthView();
  const production = catchUp
    ? await fetchCanonicalProductionOperatingState({ timeoutMs: 4000 })
    : { ok: false as const, cloudRuntime: undefined };
  const body = {
    ...withFinancialTruthLiveState(live, financialTruth),
    cloudRuntime: production.ok && production.cloudRuntime
      ? production.cloudRuntime as CloudRuntimeHqProjection
      : live.cloudRuntime,
    organicGrowth: {
      ...projectOrganicGrowthHq(getOrganicContinuousState("occupancynpv")),
      runtime: projectOrganicRuntimeHq(),
    },
    communicationScheduler: projectCommunicationSchedulerHq(),
    salesCommandCenter: projectSalesCommandCenterView(),
  };
  void publishPublicOccupancyFromHq(body).catch(() => undefined);
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function publishPublicOccupancyFromHq(live: HqCanonicalLiveState) {
  const hqRooms = Object.fromEntries(
    Object.entries(live.commandActivity.rooms).map(([id, slice]) => [id, slice.status]),
  );
  return publishCanonicalPublicOccupancy({
    now: live.generatedAt,
    hqRooms,
    organic: { occupancy: projectPublicOrganicActivity(getOrganicContinuousState("occupancynpv"), { effective_result: getLastOrganicEffectiveExecutionState()?.result ?? null }).occupancy },
    loop: {
      portfolio_state: live.autonomousOperating?.loop_state ?? "IDLE_NO_ACTION",
      last_outcome: live.autonomousOperating?.priority === "EXISTING_GROWTH_CONTINUATION" ? "CONTINUE_EXISTING_ACTION" : null,
      last_reason: live.autonomousOperating?.why_this_mission ?? null,
      last_completed_mission_id: live.autonomousOperating?.last_completed_mission ?? null,
      updated_at: live.generatedAt,
      autonomous_enabled_at: null,
    },
  });
}
