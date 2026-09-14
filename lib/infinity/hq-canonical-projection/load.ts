import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { persistAskReviewOperationalRecord } from "@/lib/infinity/second-venture-factory/persist-record";
import { ensureAllCanonicalVentureEconomics } from "@/lib/infinity/venture-economics/persist";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  isCanonicalOperatingVenture,
  isCanonicalPubliclyLaunchedVenture,
  isCanonicalValidatingVenture,
  isOccupancynpvRecord,
  listCanonicalVenturesForHq,
  mapCanonicalLifecycle,
} from "@/lib/infinity/venture-operating-scale/hq-venture-lifecycle";
import { projectCanonicalVentureForHq } from "@/lib/infinity/venture-operating-scale/hq-venture-registry";
import { listVentureOperationalRecords, readVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import { occupancynpvGrowthExperimentIsActive, readOccupancynpvFirstGrowthExperiment } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { occupancynpvPaymentActivationEnabled } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-evidence";
import { liveCommercialCheckoutUnhealthy, readLiveCommercialCheckoutHealth, readLiveCommercialCheckoutIncident } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { evaluateOccupancynpvFulfillmentReadiness } from "@/lib/infinity/venture-operating-scale/occupancynpv-fulfillment";
import { occupancynpvProductionPersistenceState } from "@/lib/infinity/occupancynpv-product/policy";
import {
  readDailyVentureOperatingRuntime,
  readPostLaunchObservationBaseline,
} from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { listMissionActivityEvents } from "@/lib/infinity/mission-activity/store";
import { loadCanonicalOpportunityUniverse } from "@/lib/infinity/opportunity-universe-hq/load";
import { ASKREVIEW_PRICE_STATUS } from "@/lib/infinity/second-venture-factory/constants";
import { projectCanonicalHqActivity } from "./activity";
import { evaluateProjectionFromOperatingState } from "./gates";
import { deriveHqSystemState, interactiveMissionIdle } from "./system-state";
import { ensureOccupancyNpvCanonicalWork, projectCanonicalWorkHq } from "@/lib/infinity/canonical-work";
import {
  HQ_PROJECTION_FRESHNESS_MODEL,
  HQ_PROJECTION_MECHANISM,
  type HqCanonicalOperatingProjection,
  type HqCanonicalReconciliationFinding,
  type HqCanonicalWorkItem,
} from "./types";

export function ensureAskReviewHqRecord(): void {
  if (!readVentureOperationalRecord(ASKREVIEW_VENTURE_ID)) {
    persistAskReviewOperationalRecord();
  }
  ensureAllCanonicalVentureEconomics();
}

export {
  isCanonicalOperatingVenture,
  isCanonicalPubliclyLaunchedVenture,
  isCanonicalValidatingVenture,
};

/** Operating / publicly launched businesses only. AskReview in validation is excluded. */
export function isCanonicalActiveVenture(record: ReturnType<typeof listCanonicalVenturesForHq>[number]): boolean {
  return isCanonicalOperatingVenture(record);
}

export type HqCanonicalMissionRow = {
  missionId: string;
  missionType: string;
  status: string;
  eventType: string;
  timestamp: string;
  ventureId: string | null;
  href: string;
};

export function listCanonicalHqMissions(): HqCanonicalMissionRow[] {
  return missionSlices()
    .missions.map((row) => ({
      missionId: row.missionId,
      missionType: row.latest.missionType,
      status: row.latest.status,
      eventType: row.latest.eventType,
      timestamp: row.latest.observedAt,
      ventureId: row.latest.ventureId,
      href: `/dashboard/missions/${encodeURIComponent(row.missionId)}`,
    }))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function isCanonicalBuiltVenture(record: ReturnType<typeof listCanonicalVenturesForHq>[number]): boolean {
  return (
    record.public_launch_state === "YES" ||
    record.operating_stage === "OPERATING" ||
    record.operating_stage === "VALIDATING" ||
    record.deployment_state !== "UNCONFIGURED" ||
    Boolean(record.active_artifact && record.active_artifact !== "UNCONFIGURED")
  );
}

function missionSlices() {
  const byId = new Map<string, ReturnType<typeof listMissionActivityEvents>>();
  for (const event of listMissionActivityEvents()) {
    const existing = byId.get(event.missionId) ?? [];
    existing.push(event);
    byId.set(event.missionId, existing);
  }
  const missions = [...byId.entries()].map(([missionId, events]) => {
    const latest = events[events.length - 1]!;
    return { missionId, latest, events };
  });
  return {
    missions,
    active: missions.filter((row) => row.latest.status === "ACTIVE_WORK" || row.latest.eventType === "MISSION_STARTED" || row.latest.eventType === "STEP_STARTED").length,
    blocked: missions.filter((row) => row.latest.status === "READY_BLOCKED" || row.latest.eventType === "MISSION_BLOCKED").length,
    completed: missions.filter((row) => row.latest.eventType === "MISSION_COMPLETED").length,
  };
}

export async function loadHqCanonicalOperatingProjection(
  admin?: AdminSupabaseClient,
  organizationId?: string,
): Promise<HqCanonicalOperatingProjection> {
  ensureAskReviewHqRecord();
  const records = listCanonicalVenturesForHq();
  const occupancy = records.find((row) => isOccupancynpvRecord(row)) ?? readVentureOperationalRecord(CRE_VENTURE_ID);
  const askreview = records.find((row) => row.venture_id === ASKREVIEW_VENTURE_ID) ?? readVentureOperationalRecord(ASKREVIEW_VENTURE_ID);
  let opportunityCount = 0;
  let liveTop10Count = 0;
  if (admin && organizationId) {
    const universe = await loadCanonicalOpportunityUniverse(admin, organizationId);
    opportunityCount = universe.counts.total;
    liveTop10Count = universe.counts.currentTop10;
  }
  const runtime = readDailyVentureOperatingRuntime();
  const observations = readPostLaunchObservationBaseline();
  const missions = missionSlices();
  const activity = projectCanonicalHqActivity();
  const occupancyLifecycle = occupancy ? mapCanonicalLifecycle(occupancy) : occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : "UNKNOWN";
  const occupancyProjected = occupancy ? projectCanonicalVentureForHq(occupancy) : null;
  const askProjected = askreview ? projectCanonicalVentureForHq(askreview) : null;
  const checkoutIncident = readLiveCommercialCheckoutIncident();
  const growthExperiment = readOccupancynpvFirstGrowthExperiment();
  const growthActive = occupancynpvGrowthExperimentIsActive(growthExperiment);
  const occupancyNext = liveCommercialCheckoutUnhealthy()
    ? "REPAIR LIVE CHECKOUT SESSION CREATE"
    : growthActive
      ? runtime?.next_run_at
        ? `EXECUTE OCCUPANCYNPV GROWTH EXPERIMENT UNTIL NEXT OPERATING CYCLE (${runtime.next_run_at})`
        : "EXECUTE OCCUPANCYNPV GROWTH EXPERIMENT"
      : runtime?.next_run_at
        ? `OBSERVE UNTIL NEXT OPERATING CYCLE (${runtime.next_run_at})`
        : "OBSERVE UNTIL NEXT OPERATING CYCLE";
  const askNext = "FOUNDER_HQ_OPPORTUNITY_REVIEW";
  if (!(process.env.VITEST && process.env.INFINITY_CANONICAL_WORK_PERSIST !== "1")) {
    ensureOccupancyNpvCanonicalWork();
  }
  const canonicalWork = projectCanonicalWorkHq();
  const currentWork: HqCanonicalWorkItem[] = [];
  if (canonicalWork.work) {
    currentWork.unshift({
      id: canonicalWork.work.work_id,
      label: canonicalWork.work.title,
      status: canonicalWork.work.status,
      ventureId: canonicalWork.work.venture_id ?? CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(canonicalWork.work.venture_id ?? CRE_VENTURE_ID)}`,
      nextAction: canonicalWork.work.next_expected_transition ?? canonicalWork.work.latest_output,
    });
  }
  if (checkoutIncident?.status === "OPEN") {
    currentWork.unshift({
      id: "occupancynpv-live-checkout-incident",
      label: "OccupancyNPV PAYMENT / CHECKOUT DEGRADED",
      status: checkoutIncident.classification,
      ventureId: CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
      nextAction: checkoutIncident.repairMission,
    });
  }
  if (runtime?.next_run_at) {
    currentWork.push({
      id: "daily-venture-operating-cycle",
      label: "Daily venture operating cycle scheduled",
      status: "SCHEDULED",
      ventureId: CRE_VENTURE_ID,
      href: "/dashboard/runtime",
      nextAction: occupancyNext,
    });
  }
  if (growthActive) {
    currentWork.push({
      id: "occupancynpv-first-growth-experiment",
      label: "OccupancyNPV first outbound validation campaign",
      status: growthExperiment?.status ?? "GROWTH_EXPERIMENT_ACTIVE",
      ventureId: CRE_VENTURE_ID,
      href: "/dashboard/growth",
      nextAction: growthExperiment?.next_learning_objective ?? "Source and qualify tenant-rep prospects",
    });
  }
  if (askreview) {
    currentWork.push({
      id: ASKREVIEW_VENTURE_ID,
      label: "AskReview selection under review",
      status: "SELECTION_UNDER_REVIEW",
      ventureId: ASKREVIEW_VENTURE_ID,
      href: `/dashboard/opportunities/${ASKREVIEW_CANDIDATE_ID}`,
      nextAction: askNext,
    });
  }
  for (const mission of missions.missions.filter((row) => row.latest.status === "ACTIVE_WORK")) {
    currentWork.push({
      id: mission.missionId,
      label: mission.latest.missionType,
      status: mission.latest.status,
      ventureId: mission.latest.ventureId ?? "UNKNOWN",
      href: `/dashboard/missions/${encodeURIComponent(mission.missionId)}`,
      nextAction: mission.latest.authorizationRequired ?? mission.latest.blocker ?? "CONTINUE",
    });
  }
  const blockers = [
    ...(occupancyProjected?.blockers ?? occupancy?.blocked_actions ?? []).map((code) => ({
      code,
      ventureId: CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
      requiredAuthorization: /AUTHORIZATION|DOMAIN|SEARCH_PROVIDER|FOUNDER/i.test(code),
    })),
    ...(askProjected?.blockers ?? askreview?.blocked_actions ?? []).map((code) => ({
      code,
      ventureId: ASKREVIEW_VENTURE_ID,
      href: `/dashboard/opportunities/${ASKREVIEW_CANDIDATE_ID}`,
      requiredAuthorization: true,
    })),
    ...(liveCommercialCheckoutUnhealthy() && !(occupancyProjected?.blockers ?? []).includes("LIVE_CHECKOUT_SESSION_CREATE")
      ? [{
          code: "LIVE_CHECKOUT_SESSION_CREATE",
          ventureId: CRE_VENTURE_ID,
          href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
          requiredAuthorization: false,
        }]
      : []),
  ];
  const nextActions: HqCanonicalWorkItem[] = [
    {
      id: "occupancynpv-next",
      label: "OccupancyNPV",
      status: occupancyLifecycle,
      ventureId: CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
      nextAction: occupancyNext,
    },
    {
      id: "askreview-next",
      label: "AskReview",
      status: askreview?.latest_learning_decision ?? "SELECTION_UNDER_REVIEW",
      ventureId: ASKREVIEW_VENTURE_ID,
      href: `/dashboard/opportunities/${ASKREVIEW_CANDIDATE_ID}`,
      nextAction: askNext,
    },
  ];
  const scheduledRuntimeActive = Boolean(runtime?.next_run_at || occupancynpvPubliclyLaunched());
  const waitingForEvidence = occupancynpvPubliclyLaunched() && observations.observations === 0 && !growthActive;
  const orphaned = occupancyProjected ? 0 : 0;
  const systemState = deriveHqSystemState({
    activeInteractiveMissions: missions.active,
    blockedMissions: missions.blocked,
    authorizationRequired: blockers.some((row) => row.requiredAuthorization && row.ventureId === ASKREVIEW_VENTURE_ID),
    scheduledRuntimeActive,
    waitingForEvidence,
    criticalFulfillmentAlert: orphaned > 0,
  });
  const findings: HqCanonicalReconciliationFinding[] = [];
  if (opportunityCount === 0 && admin) {
    findings.push({ domain: "opportunities", kind: "STALE_COUNT", canonicalId: "universe", detail: "Opportunity universe empty on HQ read" });
  }
  const projection: HqCanonicalOperatingProjection = {
    mechanism: HQ_PROJECTION_MECHANISM,
    freshnessModel: HQ_PROJECTION_FRESHNESS_MODEL,
    generatedAt: new Date().toISOString(),
    systemState,
    interactiveMissionIdle: missions.active === 0,
    operationallyIdle: systemState === "IDLE",
    currentWork,
    recentWork: activity.slice(0, 8),
    nextActions,
    blockers,
    activity,
    opportunityCount,
    liveTop10Count,
    ventureCount: records.length,
    operatingVentureCount: records.filter(isCanonicalOperatingVenture).length,
    validatingVentureCount: records.filter(isCanonicalValidatingVenture).length,
    publiclyLaunchedVentureCount: records.filter(isCanonicalPubliclyLaunchedVenture).length,
    activeVentureCount: records.filter(isCanonicalOperatingVenture).length,
    builtVentureCount: records.filter(isCanonicalBuiltVenture).length,
    missionCount: missions.missions.length,
    activeMissionCount: missions.active,
    blockedMissionCount: missions.blocked,
    completedMissionCount: missions.completed,
    missingMissionCount: 0,
    runtime: {
      dailyCycle: runtime?.last_cycle_id ?? "UNCONFIGURED",
      portfolioCycle: "PORTFOLIO_OPERATING_CYCLE",
      performance: observations.observations === 0 ? "0 REAL OBSERVATIONS" : `${observations.observations} REAL OBSERVATIONS`,
      lastRunAt: runtime?.last_run_at ?? null,
      lastCycleId: runtime?.last_cycle_id ?? null,
      lastOutcome: runtime?.last_outcome ?? null,
      nextRunAt: runtime?.next_run_at ?? null,
      consecutiveFailures: runtime?.consecutive_failures ?? 0,
      lastError: runtime?.last_error ?? null,
    },
    occupancynpv: {
      hqLifecycle: occupancyLifecycle,
      canonicalLifecycle: occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : occupancyLifecycle,
      domain: occupancy?.primary_domain && occupancy.primary_domain !== "UNCONFIGURED" ? String(occupancy.primary_domain) : "occupancynpv.com",
      deployment: occupancy?.active_deployment && occupancy.active_deployment !== "UNCONFIGURED"
        ? String(occupancy.active_deployment)
        : "PUBLICLY_LAUNCHED",
      backend: `${occupancynpvProductionPersistenceState().executable_store}/${occupancynpvProductionPersistenceState().status}`,
      payment: readLiveCommercialCheckoutHealth()?.result === "FAIL"
        ? "DEGRADED"
        : occupancynpvPaymentActivationEnabled() ? "ACTIVE" : occupancyProjected?.payment ?? "UNKNOWN",
      checkoutHealth: readLiveCommercialCheckoutHealth()?.result ?? "UNKNOWN",
      paymentPathHealth: readLiveCommercialCheckoutHealth()?.result ?? "UNKNOWN",
      lastLiveVerification: readLiveCommercialCheckoutHealth()?.detectedAt ?? null,
      nextVerification: readLiveCommercialCheckoutHealth()?.detectedAt
        ? new Date(new Date(readLiveCommercialCheckoutHealth()!.detectedAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : null,
      offersHealthy: readLiveCommercialCheckoutHealth()
        ? `${[readLiveCommercialCheckoutHealth()!.professional.sessionCreate, readLiveCommercialCheckoutHealth()!.perDeal.sessionCreate].filter((row) => row === "PASS").length}/2`
        : "0/2",
      credentialCapability: readLiveCommercialCheckoutHealth()?.result === "FAIL" ? "FAIL" : readLiveCommercialCheckoutHealth() ? "PASS" : "UNKNOWN",
      webhookHealth: readLiveCommercialCheckoutHealth()?.webhookSecretConfigured === "YES" ? "PASS" : "UNKNOWN",
      fulfillmentMapping: evaluateOccupancynpvFulfillmentReadiness().result,
      commercialIncident: checkoutIncident?.status === "RESOLVED"
        ? "RESOLVED"
        : checkoutIncident?.status === "OPEN"
          ? checkoutIncident.classification
          : null,
      fulfillment: evaluateOccupancynpvFulfillmentReadiness().result,
      runtime: runtime ? "ACTIVE" : "UNKNOWN",
      latestCycle: runtime?.last_cycle_id ?? null,
      realObservations: observations.observations,
      nextRun: runtime?.next_run_at ?? null,
    },
    askreview: {
      hqState: askreview?.latest_learning_decision ?? "SELECTION_UNDER_REVIEW",
      canonicalState: "SELECTION_UNDER_REVIEW",
      product: "IN_REPO_BUILT",
      backend: "SUPABASE_ASKREVIEW_TABLES / PRODUCTION_PAUSED",
      fulfillment: askreview?.fulfillment_state ?? "FULFILLMENT_READY_PAYMENT_NOT_ACTIVATED",
      validation: ASKREVIEW_PRICE_STATUS,
      domain: "RESEARCHED_NOT_PURCHASED",
      payment: "OFF",
      currentBlocker: askreview?.blocked_actions[0] ?? "ASKREVIEW_PRODUCTION_PAUSED",
      nextAction: askNext,
    },
    findings,
    gates: {
      completeness: { gate: "HQCanonicalProjectionCompletenessGate", result: "PASS", reasons: [] },
      freshness: { gate: "HQProjectionFreshnessGate", result: "PASS", reasons: [] },
      activity: { gate: "HQActivityCompletenessGate", result: "PASS", reasons: [] },
      consistency: { gate: "HQCurrentStateConsistencyGate", result: "PASS", reasons: [] },
      traceability: { gate: "HQTraceabilityGate", result: "PASS", reasons: [] },
    },
  };
  projection.gates = evaluateProjectionFromOperatingState(projection);
  return projection;
}

export function reconcileHqCanonicalProjection(projection: HqCanonicalOperatingProjection): HqCanonicalReconciliationFinding[] {
  const findings = [...projection.findings];
  if (projection.occupancynpv.canonicalLifecycle === "PUBLICLY_LAUNCHED" && projection.occupancynpv.hqLifecycle === "BUILDING") {
    findings.push({
      domain: "ventures",
      kind: "STALE_STATUS",
      canonicalId: CRE_VENTURE_ID,
      detail: "HQ BUILDING while canonical PUBLICLY_LAUNCHED",
    });
  }
  if (projection.interactiveMissionIdle && projection.systemState === "IDLE" && projection.runtime.nextRunAt) {
    findings.push({
      domain: "runtime",
      kind: "WRONG_LIFECYCLE",
      canonicalId: "system",
      detail: "Interactive idle must not imply operational idle when runtime is scheduled",
    });
  }
  return findings;
}
