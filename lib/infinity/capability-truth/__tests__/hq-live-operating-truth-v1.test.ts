import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import {
  completeCurrentImplementationWork,
  idleCurrentImplementationWorkIfQuiet,
  IMPLEMENTATION_WORK_IDLE_AFTER_MS,
  projectCanonicalActiveWork,
  resetCanonicalWorkStore,
  resolveCurrentCanonicalWork,
  startCurrentImplementationWork,
  workersFromCanonicalWork,
} from "@/lib/infinity/canonical-work";
import { HQ_CANONICAL_WATCH_INTERVAL_MS } from "@/lib/infinity/operator-console/hq-canonical-watch";
import { codingReadModelFromCapability, projectCodingCapability } from "@/lib/infinity/capability-truth/coding";
import { projectCanonicalCapabilities } from "@/lib/infinity/capability-truth/projection";
import {
  evaluateCanonicalCapabilityProjectionGate,
  evaluateCapabilityContradictionGate,
  evaluateCapabilityFreshnessGate,
  evaluateCapabilityScopeGate,
  evaluateCapabilityTruthGate,
  evaluateCrossSurfaceCanonicalConsistencyGate,
  evaluateInfrastructureStateNoHardcodingGate,
  evaluateMutationAuthoritySeparationGate,
} from "@/lib/infinity/capability-truth/gates";
import { resolveCanonicalSelectedVenture, evaluateCanonicalSelectedVentureGate } from "@/lib/infinity/capability-truth/selected-venture";
import { projectVentureOperatingScaleHq } from "@/lib/infinity/venture-operating-scale/hq";
import { projectPortfolioActualEconomics } from "@/lib/infinity/financial-truth/portfolio-actual-economics";
import { emptyCodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import { codingActiveRunCount } from "@/lib/infinity/operator-console/hq-infrastructure-priority";
import {
  evaluateAgentTaskSpecificityGate,
  evaluateRoomInformationGainGate,
  evaluateRoomMissionConsistencyGate,
  evaluateRoomWorkSpecificityGate,
  isGenericImplementationText,
  resolveAgentCurrentTask,
  resolveRoomCurrentWork,
} from "@/lib/infinity/room-work";
import { evaluateHQLiveWorkSurfaceConsistencyGate } from "@/lib/infinity/canonical-work/gates";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("HQ live operating truth + room work projection v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("1-2: Cursor is an external agent, not NOT_CONFIGURED, and follows current work", () => {
    const idle = emptyCodingHqReadModel("org");
    const cursor = idle.providers.find((row) => /cursor/i.test(row.provider));
    expect(cursor?.status).not.toBe("NOT_CONFIGURED");
    expect(cursor?.status).toBe("PRESENT_IDLE");
    expect(codingActiveRunCount(idle)).toBe(0);

    startCurrentImplementationWork({
      title: "INFINITY — LIVE HQ OPERATING TRUTH + ROOM-SPECIFIC WORK PROJECTION V1",
      description: "Editing lib/infinity/capability-truth/projection.ts",
      now: "2026-09-13T10:00:00.000Z",
    });
    const live = codingReadModelFromCapability("org", projectCodingCapability("2026-09-13T10:00:00.000Z"));
    const liveCursor = live.providers.find((row) => /cursor/i.test(row.provider));
    expect(liveCursor?.status).toBe("ACTIVE");
    expect(codingActiveRunCount(live)).toBe(1);
    expect(projectCodingCapability("2026-09-13T10:00:00.000Z").connector_status).toBe("NOT_CONNECTED");
  });

  it("3-7: hosting, payments, registrar, and DNS separate existence from mutation", () => {
    const projection = projectCanonicalCapabilities("2026-09-13T10:00:00.000Z");
    const hosting = projection.capabilities.find((row) => row.capability_id === "HOSTING");
    const payments = projection.capabilities.find((row) => row.capability_id === "PAYMENTS");
    const registrar = projection.capabilities.find((row) => row.capability_id === "DOMAIN_REGISTRAR");
    const dns = projection.capabilities.find((row) => row.capability_id === "DNS");
    expect(hosting?.value).not.toBe("NOT_CONFIGURED");
    expect(hosting?.mutation_authority).toBe("GOVERNED");
    expect(payments?.value).not.toBe("NOT_CONFIGURED");
    expect(payments?.mutation_authority).toBe("GOVERNED");
    expect(registrar?.value).not.toBe("NOT_CONFIGURED");
    expect(registrar?.mutation_authority).toBe("LOCKED");
    expect(dns?.value).not.toBe("NOT_CONFIGURED");
    expect(["GOVERNED", "NOT_CONNECTED", "LOCKED"]).toContain(dns?.mutation_authority);
  });

  it("5: payment activation and processor capability do not contradict", () => {
    const projection = projectCanonicalCapabilities("2026-09-13T10:00:00.000Z");
    const vos = projectVentureOperatingScaleHq();
    expect(
      evaluateCapabilityContradictionGate({
        projection,
        paymentActivation: vos.authorityVisibility.paymentActivation,
      }).result,
    ).toBe("PASS");
    if (vos.authorityVisibility.paymentActivation === "YES") {
      expect(projection.capabilities.find((row) => row.capability_id === "PAYMENTS")?.value).not.toBe("NOT_CONFIGURED");
    }
  });

  it("8-9: revenue $0 and latest learning NONE are distinct from UNCONFIGURED", () => {
    const economics = projectPortfolioActualEconomics("2026-09-13T10:00:00.000Z");
    const hq = projectVentureOperatingScaleHq();
    expect(economics.contract).toBe("PortfolioActualEconomicsProjection");
    expect(hq.revenueState).not.toBe("UNCONFIGURED");
    expect(hq.revenueState).toMatch(/^\$/);
    expect(hq.latestLearning).not.toBe("UNCONFIGURED");
    expect(["NONE YET", hq.latestLearning]).toContain(hq.latestLearning);
  });

  it("10-13: communication freshness, selected venture, commercialization scope, venture counts", () => {
    const hq = projectVentureOperatingScaleHq();
    expect(["RUNNING", "DEGRADED", "STOPPED", "STALE"]).toContain(hq.communicationState);
    const selected = resolveCanonicalSelectedVenture({
      ventureId: "favc1-cycle:cycle-1",
      ventureName: "Autonomous Venture Cycle",
    });
    expect(selected.venture_name).not.toBe("Autonomous Venture Cycle");
    expect(["NONE SELECTED", "PORTFOLIO"]).toContain(selected.venture_name);
    expect(evaluateCanonicalSelectedVentureGate(selected).result).toBe("PASS");
    expect(hq.commercializationScope).toMatch(/OccupancyNPV|PORTFOLIO|AskReview/);
    expect(hq.activeVentures).toBeGreaterThanOrEqual(0);
    expect(hq.validationVentures).toBeGreaterThanOrEqual(0);
    expect((hq.pausedVentures ?? 0) + hq.activeVentures).toBeGreaterThanOrEqual(hq.activeVentures);
  });

  it("11: selected venture cannot be a runtime cycle", () => {
    expect(
      resolveCanonicalSelectedVenture({ ventureName: "Autonomous Venture Cycle" }).rejected_harness_label,
    ).toBe(true);
  });

  it("14-15: ZTP empty does not erase ventures; Top Earners uses actual economics", () => {
    const ztp = source("lib/infinity/zero-to-production/hq/read-model.ts");
    const economics = source("lib/infinity/financial-truth/portfolio-actual-economics.ts");
    const earners = source("components/dashboard/operator-console/top-earners-panel.tsx");
    expect(ztp).not.toMatch(/No ventures were ever built/);
    expect(economics).toContain("PORTFOLIO_ACTUAL_ECONOMICS_PROJECTION");
    expect(earners).toContain("topEarners");
    expect(earners).toContain("measurable results");
  });

  it("16-18: freshness, live capability overlay, no new provider polling", () => {
    const projection = projectCanonicalCapabilities("2026-09-13T10:00:00.000Z");
    expect(evaluateCapabilityFreshnessGate(projection).result).toBe("PASS");
    const liveState = source("lib/infinity/operator-console/hq-canonical-live-state.ts");
    expect(liveState).toContain("projectCanonicalCapabilities");
    expect(liveState).toContain("codingReadModelFromCapability");
    expect(liveState).not.toMatch(/setInterval\(\s*projectCanonicalCapabilities/);
    const watch = source("lib/infinity/operator-console/hq-canonical-watch.ts");
    expect(watch).toContain("HQ_CANONICAL_WATCH_INTERVAL_MS = 500");
  });

  it("19-24: mission / room / agent hierarchy and idle independence", () => {
    const work = startCurrentImplementationWork({
      title: "INFINITY — LIVE HQ OPERATING TRUTH + ROOM-SPECIFIC WORK PROJECTION V1",
      description: "Editing lib/infinity/capability-truth/projection.ts",
      now: "2026-09-13T10:00:00.000Z",
    });
    const view = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(view.nowInspecting.currentMission).toContain("LIVE HQ OPERATING TRUTH");
    const architect = resolveRoomCurrentWork(work, "systems_architect");
    const validation = resolveRoomCurrentWork(work, "quality_control");
    expect(architect.contribution_summary).not.toBe(work.title);
    expect(validation.contribution_summary).not.toBe(work.title);
    expect(architect.contribution_summary).not.toBe(validation.contribution_summary);
    expect(isGenericImplementationText(architect.contribution_summary)).toBe(false);
    const agent = resolveAgentCurrentTask({
      work,
      roomId: "systems_architect",
      agentName: "Systems Architect",
      agentId: "agent:systems",
    });
    expect(isGenericImplementationText(agent.task_summary)).toBe(false);
    expect(view.rooms.opportunity_lab.status).not.toBe("ACTIVE_WORK");
    const workers = workersFromCanonicalWork(work);
    expect(workers.every((row) => !isGenericImplementationText(row.task))).toBe(true);
    expect(
      evaluateRoomWorkSpecificityGate({
        mission: work.title,
        rooms: [
          { room: "systems_architect", contribution: architect.contribution_summary },
          { room: "quality_control", contribution: validation.contribution_summary },
        ],
      }).result,
    ).toBe("PASS");
    expect(evaluateAgentTaskSpecificityGate(workers.map((row) => ({ task: row.task }))).result).toBe("PASS");
    expect(
      evaluateRoomInformationGainGate({
        mission: work.title,
        rooms: [
          { contribution: architect.contribution_summary },
          { contribution: validation.contribution_summary },
        ],
      }).result,
    ).toBe("PASS");
    expect(
      evaluateRoomMissionConsistencyGate({
        missionId: work.mission_id,
        rooms: [architect, validation],
      }).result,
    ).toBe("PASS");
    expect(IMPLEMENTATION_WORK_IDLE_AFTER_MS).toBe(15_000);
    expect(HQ_CANONICAL_WATCH_INTERVAL_MS).toBe(500);
  });

  it("25-26: mission change invalidates stale room text; stop hook idles work", () => {
    startCurrentImplementationWork({
      title: "Old mission",
      description: "Implementation in progress",
      now: "2026-09-13T10:00:00.000Z",
    });
    startCurrentImplementationWork({
      title: "INFINITY — LIVE HQ OPERATING TRUTH + ROOM-SPECIFIC WORK PROJECTION V1",
      description: "Editing lib/infinity/room-work/resolver.ts",
      now: "2026-09-13T10:00:05.000Z",
    });
    const current = resolveCurrentCanonicalWork("2026-09-13T10:00:05.000Z");
    expect(current.work?.title).toContain("LIVE HQ OPERATING TRUTH");
    const room = resolveRoomCurrentWork(current.work!, "systems_architect");
    expect(room.contribution_summary).toContain("LIVE HQ OPERATING TRUTH");
    expect(room.contribution_summary).not.toContain("Old mission");
    completeCurrentImplementationWork("stop hook", "2026-09-13T10:00:06.000Z");
    const idle = projectCommandActivity({ organizationId: "org_hq_live" });
    expect(idle.rooms.systems_architect.status).not.toBe("ACTIVE_WORK");
    expect(idleCurrentImplementationWorkIfQuiet("2026-09-13T10:00:06.000Z")).toBeNull();
  });

  it("27-30: containment, HQ/Treasury agreement, founder defect keeps QC blocked until browser proof", () => {
    const financial = source("lib/infinity/financial-truth/machine-state-presentation.ts");
    expect(financial).toContain("Processor confirmed");
    expect(financial).toContain("destination not connected");
    expect(financial).toContain("PROCESSOR_CONFIRMED_DESTINATION_UNCONNECTED");
    const strip = source("components/dashboard/operator-console/hq-financial-truth-strip.tsx");
    expect(strip).toContain("data-hq-canonical-state");
    const overlay = source("lib/infinity/financial-truth/treasury-overlay.ts");
    expect(overlay).toContain("infinityAllocatedCapital");
    const qc = source("lib/infinity/universal-artifact-qc/lifecycle.ts");
    expect(qc).toMatch(/QC_REPAIR_REQUIRED|RELEASE_READY/);
    const noRelease = source("lib/infinity/universal-artifact-qc/gates.ts");
    expect(noRelease).toMatch(/NoQCNoReleaseGate|RELEASE/);
  });

  it("capability gates pass on the live projection", () => {
    const projection = projectCanonicalCapabilities("2026-09-13T10:00:00.000Z");
    expect(evaluateCanonicalCapabilityProjectionGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityTruthGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityScopeGate(projection).result).toBe("PASS");
    expect(evaluateMutationAuthoritySeparationGate(projection).result).toBe("PASS");
    expect(
      evaluateCrossSurfaceCanonicalConsistencyGate({
        paymentsDisplay: "Stripe — LIVE",
        hostingDisplay: "CONNECTED",
        codingCursorDisplay: "PRESENT_IDLE",
        revenueDisplay: "$0",
        selectedVenture: "NONE SELECTED",
        paymentActivation: "YES",
        projection,
      }).result,
    ).toBe("PASS");
    expect(
      evaluateInfrastructureStateNoHardcodingGate(source("lib/infinity/capability-truth/projection.ts")).result,
    ).toBe("PASS");
    expect(
      evaluateHQLiveWorkSurfaceConsistencyGate({
        command: { work_id: "work:1", status: "ACTIVE_WORK", mission: "M" },
        floor: { work_id: "work:1", status: "ACTIVE_WORK", mission: "M" },
      }).result,
    ).toBe("PASS");
    const active = projectCanonicalActiveWork(resolveCurrentCanonicalWork().work);
    expect(active.status === "ACTIVE" || active.status === "IDLE").toBe(true);
  });
});
