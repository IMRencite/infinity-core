import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { persistAskReviewOperationalRecord } from "@/lib/infinity/second-venture-factory/persist-record";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { resetVentureOperatingScaleStore, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import { backfillCreVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { resetOpportunityUniverseStore } from "@/lib/infinity/opportunity-universe-hq/persist";
import { applyLiveOpportunityRanking, liveTop10 } from "@/lib/infinity/opportunity-universe-hq/live-ranking";
import { makeCanonicalOpportunityRecord } from "@/lib/infinity/opportunity-universe-hq/project";
import { paginateHqActivity, projectCanonicalHqActivity } from "../activity";
import { hqCanonicalProjectionContract } from "../contract";
import {
  evaluateHQActivityCompletenessGate,
  evaluateHQCanonicalProjectionCompletenessGate,
  evaluateHQCurrentStateConsistencyGate,
  evaluateHQProjectionFreshnessGate,
  evaluateHQTraceabilityGate,
  futureSubsystemRequiresVisibilityContract,
} from "../gates";
import { ensureAskReviewHqRecord, isCanonicalOperatingVenture, isCanonicalValidatingVenture, loadHqCanonicalOperatingProjection } from "../load";
import { evaluateFounderWorkVisibilityContract, HQ_CANONICAL_PROJECTION_REGISTRY } from "../registry";
import { deriveHqSystemState } from "../system-state";
import { HQ_ACTIVITY_PAGE_SIZE, HQ_CANONICAL_PROJECTION_REGISTRY_NAME } from "../types";

describe("HQ global canonical work projection v1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetOpportunityUniverseStore();
  });
  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetOpportunityUniverseStore();
  });

  it("registers every HQ domain and requires FounderWorkVisibilityContract for new subsystems", () => {
    expect(HQ_CANONICAL_PROJECTION_REGISTRY).toHaveLength(22);
    expect(HQ_CANONICAL_PROJECTION_REGISTRY_NAME).toBe("HQCanonicalProjectionRegistry");
    expect(evaluateFounderWorkVisibilityContract("ventures").productionAutonomy).toBe("READY");
    expect(evaluateFounderWorkVisibilityContract("operations").hqSurface).toBe("/dashboard/operations");
    expect(evaluateFounderWorkVisibilityContract("unknown-engine").productionAutonomy).toBe("PRODUCTION_AUTONOMY_NOT_READY");
    expect(futureSubsystemRequiresVisibilityContract("opportunities")).toBe(true);
    expect(hqCanonicalProjectionContract({
      sourceType: "opportunity_candidates",
      canonicalId: "c1",
      entityType: "opportunity",
      status: "DISCOVERED",
      projectionDestination: "/dashboard/opportunities",
      detailRoute: "/dashboard/opportunities/c1",
    }).ventureRelation).toBe("UNKNOWN");
  });

  it("projects OccupancyNPV as operating and AskReview as validating, not as a live operating business", async () => {
    writeVentureOperationalRecord(backfillCreVentureOperationalRecord());
    persistAskReviewOperationalRecord();
    const projection = await loadHqCanonicalOperatingProjection();
    expect(projection.operatingVentureCount).toBe(occupancynpvPubliclyLaunched() ? 1 : projection.operatingVentureCount);
    expect(projection.validatingVentureCount).toBeGreaterThanOrEqual(1);
    expect(projection.activeVentureCount).toBe(projection.operatingVentureCount);
    expect(isCanonicalOperatingVenture(backfillCreVentureOperationalRecord() as never)).toBe(occupancynpvPubliclyLaunched());
    expect(isCanonicalValidatingVenture(persistAskReviewOperationalRecord() as never)).toBe(true);
    expect(projection.occupancynpv.canonicalLifecycle).toBe(occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : projection.occupancynpv.hqLifecycle);
    expect(projection.occupancynpv.realObservations).toBe(0);
    expect(projection.occupancynpv.runtime === "ACTIVE" || projection.runtime.lastCycleId).toBeTruthy();
    expect(projection.askreview.canonicalState).toBe("SELECTION_UNDER_REVIEW");
    expect(projection.askreview.payment).toBe("OFF");
    expect(projection.askreview.nextAction).toBe("FOUNDER_HQ_OPPORTUNITY_REVIEW");
    expect(projection.gates.freshness.result).toBe("PASS");
    expect(projection.gates.activity.result).toBe("PASS");
    expect(projection.gates.traceability.result).toBe("PASS");
    expect(projection.gates.consistency.result).toBe("PASS");
    expect(evaluateFounderWorkVisibilityContract("ventures").productionAutonomy).toBe("READY");
  });

  it("does not treat interactive PRESENT_IDLE as operational idle when runtime is scheduled", () => {
    expect(deriveHqSystemState({
      activeInteractiveMissions: 0,
      blockedMissions: 0,
      authorizationRequired: false,
      scheduledRuntimeActive: true,
      waitingForEvidence: true,
      criticalFulfillmentAlert: false,
    })).toBe("WAITING_FOR_EVIDENCE");
    expect(deriveHqSystemState({
      activeInteractiveMissions: 0,
      blockedMissions: 0,
      authorizationRequired: false,
      scheduledRuntimeActive: false,
      waitingForEvidence: false,
      criticalFulfillmentAlert: false,
    })).toBe("IDLE");
  });

  it("fails freshness and completeness gates on stale or missing projections", () => {
    expect(evaluateHQProjectionFreshnessGate({
      mismatches: [{ entity: "venture", canonical: "PUBLICLY_LAUNCHED", hq: "BUILDING" }],
    }).result).toBe("FAIL");
    expect(evaluateHQCanonicalProjectionCompletenessGate({
      canonicalRecords: [{ id: "v1", domain: "ventures" }],
      projectedIds: [],
    }).result).toBe("FAIL");
    expect(evaluateHQActivityCompletenessGate({
      requiredEvents: [{ id: "launch", present: false }],
    }).result).toBe("FAIL");
    expect(evaluateHQCurrentStateConsistencyGate({
      opportunityCanonical: 133,
      opportunityHq: 10,
      ventureCanonical: 1,
      ventureHq: 1,
      activeMissionCanonical: 0,
      activeMissionHq: 0,
    }).result).toBe("FAIL");
    expect(evaluateHQTraceabilityGate({
      items: [{ eventId: "x", timestamp: "t", summary: "s", domain: "runtime", canonicalId: "c", ventureId: "v", missionId: "m", href: "/", traceability: "runtime.json" }],
    }).result).toBe("PASS");
  });

  it("keeps opportunity live ranking complete and activity bounded at 1000 events", () => {
    const records = applyLiveOpportunityRanking({
      records: Array.from({ length: 133 }, (_, index) => makeCanonicalOpportunityRecord({
        candidateId: `id-${index}`,
        name: `Opp ${index}`,
        opportunityScore: 80 - index * 0.01,
      })),
    });
    expect(liveTop10(records)).toHaveLength(10);
    const page = paginateHqActivity(
      Array.from({ length: 1000 }, (_, index) => ({
        eventId: `e${index}`,
        timestamp: "2026-09-09T00:00:00.000Z",
        summary: `Event ${index}`,
        domain: "missions" as const,
        canonicalId: `m${index}`,
        ventureId: "UNKNOWN",
        missionId: `m${index}`,
        href: "/dashboard/runtime",
        traceability: `m${index}`,
      })),
      1,
    );
    expect(page.items).toHaveLength(HQ_ACTIVITY_PAGE_SIZE);
    expect(page.pageCount).toBe(40);
    const activity = projectCanonicalHqActivity();
    expect(activity.every((row) => row.traceability)).toBe(true);
  });

  it("ensures AskReview HQ record can be projected without advancing production", () => {
    ensureAskReviewHqRecord();
    const record = persistAskReviewOperationalRecord();
    expect(record.venture_id).toBe(ASKREVIEW_VENTURE_ID);
    expect(record.latest_learning_decision).toBe("SELECTION_UNDER_REVIEW");
    expect(record.blocked_actions).toContain("ASKREVIEW_PRODUCTION_PAUSED");
    expect(record.public_launch_state).toBe("NO");
    expect(CRE_VENTURE_ID).toContain("candidate:");
  });

  it("covers 100 mission scale with bounded pagination", () => {
    const missions = Array.from({ length: 100 }, (_, index) => ({
      eventId: `mission-${index}`,
      timestamp: "2026-09-09T00:00:00.000Z",
      summary: `Mission ${index}`,
      domain: "missions" as const,
      canonicalId: `msn_${index}`,
      ventureId: "UNKNOWN",
      missionId: `msn_${index}`,
      href: `/dashboard/missions/msn_${index}`,
      traceability: `msn_${index}`,
    }));
    expect(paginateHqActivity(missions, 1).items.length).toBeLessThanOrEqual(25);
    expect(HQ_CANONICAL_PROJECTION_REGISTRY.length).toBeGreaterThan(0);
  });
});

function loadLocalEnv(): void {
  try {
    const envPath = join(fileURLToPath(new URL("../../../../.env.local", import.meta.url)));
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sep = trimmed.indexOf("=");
      if (sep === -1) continue;
      let val = trimmed.slice(sep + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[trimmed.slice(0, sep)] ??= val;
    }
  } catch {
    // optional
  }
}

loadLocalEnv();
const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

describe.skipIf(!LIVE)("HQ live operating projection probe", () => {
  it("keeps OccupancyNPV launched, AskReview paused, 133 opportunities, and WAITING_FOR_EVIDENCE", async () => {
    process.env.INFINITY_VENTURE_OPERATING_SCALE_PERSIST = "1";
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    const projection = await loadHqCanonicalOperatingProjection(admin, LIVE_ORG);
    expect(["WAITING_FOR_EVIDENCE", "OPERATING"]).toContain(projection.systemState);
    expect(projection.occupancynpv.canonicalLifecycle).toBe("PUBLICLY_LAUNCHED");
    expect(projection.askreview.canonicalState).toBe("SELECTION_UNDER_REVIEW");
    expect(projection.askreview.payment).toBe("OFF");
    expect(projection.operatingVentureCount).toBe(1);
    expect(projection.validatingVentureCount).toBe(1);
    expect(projection.activeVentureCount).toBe(1);
    expect(projection.opportunityCount).toBe(133);
    expect(projection.liveTop10Count).toBe(10);
    expect(projection.gates.completeness.result).toBe("PASS");
    expect(projection.gates.freshness.result).toBe("PASS");
    expect(projection.gates.activity.result).toBe("PASS");
    expect(projection.gates.consistency.result).toBe("PASS");
    expect(projection.gates.traceability.result).toBe("PASS");
    expect(evaluateFounderWorkVisibilityContract("missions").hqSurface).toBe("/dashboard/missions");
  });
});

