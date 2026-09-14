import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import {
  CANONICAL_WORK_EXECUTION_CONTRACT,
  classifyCanonicalWork,
  pickCurrentCanonicalWork,
  evaluateHQLiveWorkSurfaceConsistencyGate,
  evaluateSelectedVentureLatestWorkGate,
  projectCanonicalLatestVentureWork,
  projectLatestSystemActivity,
  projectLatestVentureWork,
  projectRecentVentureWorkHistory,
  resetCanonicalWorkStore,
  resolveCurrentCanonicalWork,
  upsertCanonicalWork,
  type CanonicalWorkExecutionContract,
} from "..";

function work(
  partial: Partial<CanonicalWorkExecutionContract> & Pick<CanonicalWorkExecutionContract, "work_id" | "title" | "status">,
): CanonicalWorkExecutionContract {
  const now = partial.updated_at ?? new Date().toISOString();
  return {
    contract: CANONICAL_WORK_EXECUTION_CONTRACT,
    mission_id: `mission:${partial.work_id}`,
    venture_id: CRE_VENTURE_ID,
    work_type: "DESIGN",
    description: partial.title,
    stage: "QC",
    assigned_rooms: ["quality_control"],
    assigned_workers: ["Validation Station"],
    source: "EXTERNAL_IMPLEMENTATION_AGENT",
    started_at: now,
    updated_at: now,
    completed_at: partial.status === "COMPLETED" || partial.status === "SUPERSEDED" ? now : null,
    blocked_reason: null,
    authorization_state: null,
    progress: partial.status,
    latest_output: partial.title,
    artifact_refs: [],
    evidence_refs: [],
    parent_work_id: null,
    traceability_links: [partial.work_id],
    requires_infinity_worker_execution: false,
    next_expected_transition: null,
    ...partial,
  };
}

describe("HQ latest venture work projection v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("A. brand repair stays Latest Venture Work when a later diagnostic completes", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:brand-repair",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "COMPLETED",
      work_type: "DESIGN",
      updated_at: "2026-09-13T10:00:00.000Z",
      completed_at: "2026-09-13T10:00:00.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:hq:current-resolver-freshness:test",
      title: "OccupancyNPV — Current Work Resolver Freshness Proof",
      status: "COMPLETED",
      work_type: "QC",
      updated_at: "2026-09-13T10:05:00.000Z",
      completed_at: "2026-09-13T10:05:00.000Z",
    }), false);
    expect(classifyCanonicalWork(work({
      work_id: "work:occupancynpv:brand-repair",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "COMPLETED",
      work_type: "DESIGN",
    })).is_substantive_venture_work).toBe(true);
    expect(classifyCanonicalWork(work({
      work_id: "work:hq:current-resolver-freshness:test",
      title: "OccupancyNPV — Current Work Resolver Freshness Proof",
      status: "COMPLETED",
      work_type: "QC",
    })).is_diagnostic).toBe(true);
    expect(projectLatestVentureWork(undefined, CRE_VENTURE_ID)?.mission_title).toMatch(/Brand Identity/);
    expect(projectLatestSystemActivity()?.title).toMatch(/Freshness Proof/);
    const view = projectCommandActivity({ organizationId: "org_history", selectedVentureId: CRE_VENTURE_ID });
    expect(view.nowInspecting.currentMission).toBeNull();
    expect(view.latestVentureWork?.title).toMatch(/Brand Identity/);
    expect(view.latestSystemActivity?.title).toMatch(/Freshness Proof/);
  });

  it("B. later venture deployment becomes both latest venture and latest system activity", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:brand-repair",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "COMPLETED",
      work_type: "DESIGN",
      updated_at: "2026-09-13T10:00:00.000Z",
      completed_at: "2026-09-13T10:00:00.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:deploy",
      title: "OccupancyNPV Brand Deploy + HQ Default Metadata Repair",
      status: "COMPLETED",
      work_type: "DEPLOYMENT",
      updated_at: "2026-09-13T10:10:00.000Z",
      completed_at: "2026-09-13T10:10:00.000Z",
    }), false);
    expect(projectLatestVentureWork(undefined, CRE_VENTURE_ID)?.mission_title).toMatch(/Brand Deploy/);
    expect(projectLatestSystemActivity()?.title).toMatch(/Brand Deploy/);
  });

  it("C. later diagnostic does not replace Latest Venture Work", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:deploy",
      title: "OccupancyNPV Brand Deploy + HQ Default Metadata Repair",
      status: "COMPLETED",
      work_type: "DEPLOYMENT",
      updated_at: "2026-09-13T10:10:00.000Z",
      completed_at: "2026-09-13T10:10:00.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:hq:live-floor-wiring-proof:later",
      title: "HQ live-floor wiring proof",
      status: "COMPLETED",
      work_type: "QC",
      updated_at: "2026-09-13T10:20:00.000Z",
      completed_at: "2026-09-13T10:20:00.000Z",
    }), false);
    expect(projectLatestVentureWork(undefined, CRE_VENTURE_ID)?.mission_title).toMatch(/Brand Deploy/);
    expect(projectLatestSystemActivity()?.title).toMatch(/live-floor wiring proof/);
  });

  it("D. new ACTIVE mission is current work; latest venture work stays previous completed", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:deploy",
      title: "OccupancyNPV Brand Deploy + HQ Default Metadata Repair",
      status: "COMPLETED",
      work_type: "DEPLOYMENT",
      updated_at: "2026-09-13T10:10:00.000Z",
      completed_at: "2026-09-13T10:10:00.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:next",
      title: "OccupancyNPV — Next Product Mission",
      status: "ACTIVE",
      work_type: "BUILD",
      updated_at: "2026-09-13T10:30:00.000Z",
    }), false);
    const current = resolveCurrentCanonicalWork();
    expect(current.status).toBe("ACTIVE");
    expect(current.mission_title).toBe("OccupancyNPV — Next Product Mission");
    expect(projectLatestVentureWork(undefined, CRE_VENTURE_ID)?.mission_title).toMatch(/Brand Deploy/);
    const view = projectCommandActivity({ organizationId: "org_history", selectedVentureId: CRE_VENTURE_ID });
    expect(view.nowInspecting.currentMission).toBe("OccupancyNPV — Next Product Mission");
    expect(view.latestVentureWork?.title).toMatch(/Brand Deploy/);
    expect(pickCurrentCanonicalWork([
      work({ work_id: "work:occupancynpv:deploy", title: "done", status: "COMPLETED", completed_at: "2026-09-13T10:10:00.000Z" }),
      work({ work_id: "work:occupancynpv:next", title: "OccupancyNPV — Next Product Mission", status: "ACTIVE", updated_at: "2026-09-13T10:30:00.000Z" }),
    ])?.title).toBe("OccupancyNPV — Next Product Mission");
  });

  it("does not show None on Command when FAVC1 is the snapshot id and OccupancyNPV history exists", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:live-venture-history",
      title: "OccupancyNPV — Live Venture History Proof",
      status: "COMPLETED",
      work_type: "DESIGN",
      updated_at: "2026-09-13T03:10:00.000Z",
      completed_at: "2026-09-13T03:10:00.000Z",
    }), false);
    const cycle = projectCommandActivity({
      organizationId: "org_history",
      selectedVentureId: "favc1-cycle:cycle-1786949554348",
    });
    const occupancy = projectCommandActivity({
      organizationId: "org_history",
      selectedVentureId: CRE_VENTURE_ID,
    });
    const canonical = projectCanonicalLatestVentureWork("favc1-cycle:cycle-1786949554348");
    expect(cycle.latestVentureWork?.title).toBe("OccupancyNPV — Live Venture History Proof");
    expect(cycle.latestVentureWorkLabel).toBe("LATEST PORTFOLIO VENTURE WORK");
    expect(occupancy.latestVentureWork?.workId).toBe(cycle.latestVentureWork?.workId);
    expect(canonical?.work_id).toBe(cycle.latestVentureWork?.workId);
    expect(evaluateSelectedVentureLatestWorkGate({
      command_work_id: cycle.latestVentureWork?.workId,
      floor_work_id: cycle.latestVentureWork?.workId,
      detail_work_id: occupancy.latestVentureWork?.workId,
      command_title: cycle.latestVentureWork?.title,
      floor_title: cycle.latestVentureWork?.title,
    }).result).toBe("PASS");
    expect(evaluateSelectedVentureLatestWorkGate({
      command_work_id: null,
      floor_work_id: cycle.latestVentureWork?.workId,
      command_title: null,
      floor_title: cycle.latestVentureWork?.title,
    }).result).toBe("FAIL");
    expect(evaluateHQLiveWorkSurfaceConsistencyGate({
      command: { latest_venture_work_id: cycle.latestVentureWork?.workId },
      floor: { latest_venture_work_id: cycle.latestVentureWork?.workId },
      venture: { latest_venture_work_id: occupancy.latestVentureWork?.workId },
    }).result).toBe("PASS");
  });

  it("does not show OccupancyNPV latest work when AskReview is selected", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:brand-repair",
      title: "OccupancyNPV — Brand Identity + Favicon Repair",
      status: "COMPLETED",
      work_type: "DESIGN",
      venture_id: CRE_VENTURE_ID,
      updated_at: "2026-09-13T10:00:00.000Z",
      completed_at: "2026-09-13T10:00:00.000Z",
    }), false);
    const ask = projectCommandActivity({ organizationId: "org_history", selectedVentureId: ASKREVIEW_VENTURE_ID });
    expect(ask.latestVentureWork).toBeNull();
    expect(ask.latestPortfolioVentureWork?.title).toMatch(/Brand Identity/);
    expect(ask.selectedVentureId).toBe(ASKREVIEW_VENTURE_ID);
  });

  it("recent history excludes diagnostics", () => {
    upsertCanonicalWork(work({
      work_id: "work:occupancynpv:favicon-production-repair-v1",
      title: "OccupancyNPV — Favicon Production Repair",
      status: "COMPLETED",
      work_type: "QC",
      updated_at: "2026-09-13T00:37:16.000Z",
      completed_at: "2026-09-13T00:37:16.000Z",
    }), false);
    upsertCanonicalWork(work({
      work_id: "work:hq:current-resolver-freshness:hidden",
      title: "OccupancyNPV — Current Work Resolver Freshness Proof",
      status: "COMPLETED",
      work_type: "QC",
      updated_at: "2026-09-13T10:05:00.000Z",
      completed_at: "2026-09-13T10:05:00.000Z",
    }), false);
    const history = projectRecentVentureWorkHistory(undefined, CRE_VENTURE_ID);
    expect(history.every((row) => row.substantiveVentureWork)).toBe(true);
    expect(history.some((row) => /Freshness Proof/.test(row.title))).toBe(false);
  });
});
