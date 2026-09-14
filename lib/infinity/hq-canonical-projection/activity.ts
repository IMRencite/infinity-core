import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { occupancynpvPubliclyLaunched, readOccupancynpvPublicLaunchEvidence } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { readLiveCommercialCheckoutIncident } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-checkout-health";
import { readDailyVentureOperatingRuntime, readPostLaunchObservationBaseline } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { ensureMissionActivityHydrated, listMissionActivityEvents } from "@/lib/infinity/mission-activity/store";
import { loadOpportunityUniverseState } from "@/lib/infinity/opportunity-universe-hq/persist";
import { HQ_ACTIVITY_PAGE_SIZE, type HqCanonicalActivityItem } from "./types";

export function paginateHqActivity(items: HqCanonicalActivityItem[], page = 1, pageSize = HQ_ACTIVITY_PAGE_SIZE) {
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page: Math.max(1, page),
    pageSize,
    pageCount: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

function item(input: Omit<HqCanonicalActivityItem, "ventureId" | "missionId"> & { ventureId?: string; missionId?: string }): HqCanonicalActivityItem {
  return {
    ...input,
    ventureId: input.ventureId ?? "UNKNOWN",
    missionId: input.missionId ?? "UNKNOWN",
  };
}

export function projectCanonicalHqActivity(): HqCanonicalActivityItem[] {
  const items: HqCanonicalActivityItem[] = [];
  const incident = readLiveCommercialCheckoutIncident();
  if (incident) {
    items.push(item({
      eventId: "occ_live_checkout_incident",
      timestamp: incident.detectedAt,
      summary: `OccupancyNPV PAYMENT / CHECKOUT DEGRADED — ${incident.classification}`,
      domain: "incidents",
      canonicalId: CRE_VENTURE_ID,
      ventureId: CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
      traceability: "occupancynpv-live-checkout-incident.json",
    }));
    if (incident.status === "RESOLVED" && incident.resolvedAt) {
      items.push(item({
        eventId: "occ_live_checkout_incident_resolved",
        timestamp: incident.resolvedAt,
        summary: `OccupancyNPV checkout incident RESOLVED — ${incident.repairMission} COMPLETED`,
        domain: "incidents",
        canonicalId: CRE_VENTURE_ID,
        ventureId: CRE_VENTURE_ID,
        href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
        traceability: "occupancynpv-live-checkout-incident.json",
      }));
    }
  }
  const launch = readOccupancynpvPublicLaunchEvidence();
  if (occupancynpvPubliclyLaunched() && launch?.launched_at) {
    items.push(item({
      eventId: "occ_public_launch",
      timestamp: launch.launched_at,
      summary: "OccupancyNPV publicly launched",
      domain: "ventures",
      canonicalId: CRE_VENTURE_ID,
      ventureId: CRE_VENTURE_ID,
      href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
      traceability: "occupancynpv-public-launch.json",
    }));
  }
  const runtime = readDailyVentureOperatingRuntime();
  if (runtime?.last_run_at && runtime.last_cycle_id) {
    items.push(item({
      eventId: `occ_cycle_${runtime.last_cycle_id}`,
      timestamp: runtime.last_run_at,
      summary: `OccupancyNPV daily operating cycle completed — ${runtime.last_outcome ?? "UNKNOWN"}`,
      domain: "runtime",
      canonicalId: runtime.last_cycle_id,
      ventureId: CRE_VENTURE_ID,
      href: "/dashboard/runtime",
      traceability: "daily-venture-operating-runtime.json",
    }));
  }
  const observations = readPostLaunchObservationBaseline();
  items.push(item({
    eventId: "occ_observations",
    timestamp: observations.launch_timestamp,
    summary: `OccupancyNPV real observations: ${observations.observations}`,
    domain: "performance",
    canonicalId: CRE_VENTURE_ID,
    ventureId: CRE_VENTURE_ID,
    href: `/dashboard/ventures/${encodeURIComponent(CRE_VENTURE_ID)}`,
    traceability: "occupancynpv-launch-performance-baseline.json",
  }));
  items.push(item({
    eventId: "askreview_selected",
    timestamp: "2026-09-09T06:00:00.000Z",
    summary: "AskReview selected as Venture 2",
    domain: "ventures",
    canonicalId: ASKREVIEW_CANDIDATE_ID,
    ventureId: ASKREVIEW_VENTURE_ID,
    href: `/dashboard/opportunities/${ASKREVIEW_CANDIDATE_ID}`,
    traceability: "osl_second_venture_eval_v2 + second-venture-factory selection",
  }));
  const universe = loadOpportunityUniverseState();
  const latestSnapshot = universe.rankingSnapshots.at(-1);
  if (latestSnapshot) {
    items.push(item({
      eventId: latestSnapshot.snapshotId,
      timestamp: latestSnapshot.timestamp,
      summary: "HQ live opportunity ranking reconciled from current canonical evidence",
      domain: "opportunities",
      canonicalId: latestSnapshot.snapshotId,
      href: "/dashboard/opportunities",
      traceability: "opportunity ranking snapshot",
    }));
  }
  if (universe.attention.kind !== "NONE" && universe.attention.message) {
    items.push(item({
      eventId: `opp_attention_${universe.attention.kind}`,
      timestamp: latestSnapshot?.timestamp ?? new Date().toISOString(),
      summary: universe.attention.message,
      domain: "opportunities",
      canonicalId: universe.attention.kind,
      href: "/dashboard/opportunities",
      traceability: "opportunity-universe/attention.json",
    }));
  }
  ensureMissionActivityHydrated();
  for (const event of listMissionActivityEvents()) {
    items.push(item({
      eventId: event.eventId,
      timestamp: event.observedAt,
      summary: event.summary ?? event.eventType,
      domain: "missions",
      canonicalId: event.missionId,
      ventureId: event.ventureId ?? "UNKNOWN",
      missionId: event.missionId,
      href: `/dashboard/missions/${encodeURIComponent(event.missionId)}`,
      traceability: event.eventId,
    }));
  }
  return items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
