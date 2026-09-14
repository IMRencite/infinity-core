import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIFECYCLE_ROOM_SEQUENCE } from "@/lib/infinity/operator-console/room-naming";
import {
  HQ_OPERATING_FLOOR_LEGEND,
  HQ_OPERATING_FLOOR_ORDER,
  assembleCanonicalFloorOrder,
  assembleOperatingFloorRenderOrder,
} from "@/lib/infinity/operator-console/floor-layout";
import { projectOperationsRoom } from "@/lib/infinity/hq-information-architecture/operations-room";
import {
  HQ_ACTIVE_WORKER_FIXTURE,
  HQ_AUTHORIZATION_WORKER_FIXTURE,
  HQ_BLOCKED_WORKER_FIXTURE,
  HQ_LAST_WORKER_COMPLETES_AFTER,
  HQ_LAST_WORKER_COMPLETES_BEFORE,
  HQ_MULTI_ROOM_WORKER_FIXTURE,
  HQ_WAITING_WORKER_FIXTURE,
  aggregateRoomVisualState,
  evaluateHQActiveWorkerVisualGate,
  evaluateHQCommandOversightContract,
  evaluateHQCommandOversightVisualGate,
  evaluateHQInfinitySymbolActivityGate,
  evaluateHQInfinitySymbolVisibilityGate,
  evaluateHQWorkerVisualStateContract,
  glowCount,
  projectCommandOversight,
  projectWorkerVisualState,
} from "../index";

const ROOT = process.cwd();

function cssHasReducedMotionFallback(): boolean {
  const css = [
    readFileSync(join(ROOT, "app/globals.css"), "utf8"),
    readFileSync(join(ROOT, "app/hq-live-activity.css"), "utf8"),
  ].join("\n");
  return (
    css.includes("prefers-reduced-motion")
    && css.includes('data-hq-infinity-symbol="ACTIVE"')
    && css.includes(".hq-worker-orb--visual-active")
    && css.includes("animation: none")
  );
}

function renderedFrom(workers: Parameters<typeof projectWorkerVisualState>[0][]) {
  return workers.map(projectWorkerVisualState);
}

describe("HQ operating floor order", () => {
  it("places Operations first and preserves remaining lifecycle order", () => {
    expect(HQ_OPERATING_FLOOR_ORDER[0]).toBe("operations");
    expect(HQ_OPERATING_FLOOR_ORDER.slice(1)).toEqual(LIFECYCLE_ROOM_SEQUENCE);
    expect(assembleOperatingFloorRenderOrder()[0]).toBe("operations");
    expect(assembleOperatingFloorRenderOrder().slice(1)).toEqual(assembleCanonicalFloorOrder());
    expect(assembleCanonicalFloorOrder()).toEqual(LIFECYCLE_ROOM_SEQUENCE);
    expect(HQ_OPERATING_FLOOR_LEGEND[0]).toBe("Operations");
    const floor = readFileSync(join(ROOT, "components/dashboard/operator-console/hq-spatial-floor.tsx"), "utf8");
    const legend = readFileSync(join(ROOT, "components/dashboard/operator-console/hq-flow-connectors.tsx"), "utf8");
    expect(floor.indexOf("sections.leading")).toBeLessThan(floor.indexOf("sections.above"));
    expect(legend).toContain("HQ_OPERATING_FLOOR_ORDER");
  });
});

describe("HQWorkerVisualStateContract + HQActiveWorkerVisualGate", () => {
  it("glows only when a worker is canonically executing", () => {
    const workers = HQ_ACTIVE_WORKER_FIXTURE;
    const rendered = renderedFrom(workers);
    expect(evaluateHQWorkerVisualStateContract(workers).result).toBe("PASS");
    expect(evaluateHQActiveWorkerVisualGate({
      workers,
      rendered,
      reducedMotionFallbackPresent: cssHasReducedMotionFallback(),
    }).result).toBe("PASS");
    expect(rendered[0]?.glow).toBe(true);
    expect(rendered[0]?.visualState).toBe("ACTIVE");
    expect(aggregateRoomVisualState(workers)).toBe("ACTIVE");
  });

  it("keeps waiting, blocked, authorization, and idle visually distinct", () => {
    expect(glowCount(HQ_WAITING_WORKER_FIXTURE)).toBe(0);
    expect(aggregateRoomVisualState(HQ_WAITING_WORKER_FIXTURE)).toBe("WAITING");
    expect(projectWorkerVisualState(HQ_BLOCKED_WORKER_FIXTURE[0]!).visualState).toBe("BLOCKED");
    expect(projectWorkerVisualState(HQ_AUTHORIZATION_WORKER_FIXTURE[0]!).visualState).toBe("AUTHORIZATION_REQUIRED");
    expect(projectWorkerVisualState(HQ_BLOCKED_WORKER_FIXTURE[0]!).glow).toBe(false);
    expect(projectWorkerVisualState(HQ_AUTHORIZATION_WORKER_FIXTURE[0]!).glow).toBe(false);
    expect(projectWorkerVisualState(HQ_WAITING_WORKER_FIXTURE[0]!).accessibleState.length).toBeGreaterThan(0);
  });
});

describe("HQCommandOversightContract + HQInfinitySymbolActivityGate", () => {
  it("activates Command and Infinity only for live execution", () => {
    const active = projectCommandOversight({ workers: HQ_ACTIVE_WORKER_FIXTURE });
    expect(evaluateHQCommandOversightContract({ workers: HQ_ACTIVE_WORKER_FIXTURE }).result).toBe("PASS");
    expect(active.commandState).toBe("ACTIVE_OVERSIGHT");
    expect(active.infinityState).toBe("ACTIVE");
    expect(evaluateHQCommandOversightVisualGate({
      workers: HQ_ACTIVE_WORKER_FIXTURE,
      renderedCommandState: "ACTIVE_OVERSIGHT",
    }).result).toBe("PASS");
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_ACTIVE_WORKER_FIXTURE,
      renderedInfinityState: "ACTIVE",
      reducedMotionFallbackPresent: cssHasReducedMotionFallback(),
    }).result).toBe("PASS");
  });

  it("uses the waiting fixture without false active glow", () => {
    const waiting = projectCommandOversight({
      workers: HQ_WAITING_WORKER_FIXTURE,
      systemState: "WAITING_FOR_EVIDENCE",
    });
    expect(waiting.activeWorkerCount).toBe(0);
    expect(glowCount(HQ_WAITING_WORKER_FIXTURE)).toBe(0);
    expect(waiting.commandState).toBe("WAITING_FOR_EVIDENCE");
    expect(waiting.infinityState).toBe("STANDBY");
    expect(evaluateHQCommandOversightVisualGate({
      workers: HQ_WAITING_WORKER_FIXTURE,
      renderedCommandState: "WAITING_FOR_EVIDENCE",
      systemState: "WAITING_FOR_EVIDENCE",
    }).result).toBe("PASS");
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_WAITING_WORKER_FIXTURE,
      renderedInfinityState: "STANDBY",
      reducedMotionFallbackPresent: true,
      systemState: "WAITING_FOR_EVIDENCE",
    }).result).toBe("PASS");
  });

  it("keeps blocked and authorization fixtures off the active pulse", () => {
    const blocked = projectCommandOversight({ workers: HQ_BLOCKED_WORKER_FIXTURE });
    const auth = projectCommandOversight({ workers: HQ_AUTHORIZATION_WORKER_FIXTURE });
    expect(blocked.commandState).toBe("BLOCKED");
    expect(blocked.infinityState).toBe("BLOCKED");
    expect(auth.commandState).toBe("AUTHORIZATION_REQUIRED");
    expect(auth.infinityState).toBe("AUTHORIZATION");
    expect(glowCount(HQ_BLOCKED_WORKER_FIXTURE)).toBe(0);
    expect(glowCount(HQ_AUTHORIZATION_WORKER_FIXTURE)).toBe(0);
  });

  it("aggregates active work across rooms", () => {
    const multi = projectCommandOversight({ workers: HQ_MULTI_ROOM_WORKER_FIXTURE });
    expect(multi.activeWorkerCount).toBe(2);
    expect(glowCount(HQ_MULTI_ROOM_WORKER_FIXTURE)).toBe(2);
    expect(aggregateRoomVisualState(HQ_MULTI_ROOM_WORKER_FIXTURE.filter((row) => row.departmentId === "operations"))).toBe("ACTIVE");
    expect(aggregateRoomVisualState(HQ_MULTI_ROOM_WORKER_FIXTURE.filter((row) => row.departmentId === "research_department"))).toBe("ACTIVE");
    expect(aggregateRoomVisualState(HQ_MULTI_ROOM_WORKER_FIXTURE.filter((row) => row.departmentId === "launch_operations"))).toBe("WAITING");
    expect(multi.commandState).toBe("ACTIVE_OVERSIGHT");
    expect(multi.infinityState).toBe("ACTIVE");
    expect(projectWorkerVisualState(HQ_MULTI_ROOM_WORKER_FIXTURE[2]!).glow).toBe(false);
  });

  it("clears Command and Infinity when the last worker completes", () => {
    const before = projectCommandOversight({ workers: HQ_LAST_WORKER_COMPLETES_BEFORE });
    const after = projectCommandOversight({
      workers: HQ_LAST_WORKER_COMPLETES_AFTER,
      systemState: "WAITING_FOR_EVIDENCE",
    });
    expect(before.commandState).toBe("ACTIVE_OVERSIGHT");
    expect(before.infinityState).toBe("ACTIVE");
    expect(after.activeWorkerCount).toBe(0);
    expect(glowCount(HQ_LAST_WORKER_COMPLETES_AFTER)).toBe(0);
    expect(after.commandState).toBe("WAITING_FOR_EVIDENCE");
    expect(after.infinityState).toBe("STANDBY");
  });
});

describe("Infinity logo visibility", () => {
  it("applies neon purple inner lines and removes yellow from the rotating energy treatment", () => {
    const gate = evaluateHQInfinitySymbolVisibilityGate({
      globalsCss: readFileSync(join(ROOT, "app/globals.css"), "utf8"),
      liveActivityCss: readFileSync(join(ROOT, "app/hq-live-activity.css"), "utf8"),
      coreSource: readFileSync(join(ROOT, "components/dashboard/operator-console/infinity-decision-core.tsx"), "utf8"),
    });
    expect(gate.result).toBe("PASS");
    const css = [
      readFileSync(join(ROOT, "app/globals.css"), "utf8"),
      readFileSync(join(ROOT, "app/hq-live-activity.css"), "utf8"),
    ].join("\n");
    const core = readFileSync(join(ROOT, "components/dashboard/operator-console/infinity-decision-core.tsx"), "utf8");
    const energyBlocks = css.split("}").filter((block) => block.includes(".hq-infinity-energy")).join("}");
    expect(css).toContain("--hq-infinity-inner-active");
    expect(css).toContain("#e040fb");
    expect(energyBlocks).not.toContain("#fbbf24");
    expect(core).toContain("#e040fb");
    expect(core).not.toContain("#38bdf8");
    expect(core).toContain("M12 32 C12 14 32 14 50 32 C68 50 88 50 88 32 C88 14 68 14 50 32 C32 50 12 50 12 32");
  });

  it("keeps STANDBY static and ACTIVE, BLOCKED, and AUTHORIZATION distinct", () => {
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_ACTIVE_WORKER_FIXTURE,
      renderedInfinityState: "ACTIVE",
      reducedMotionFallbackPresent: cssHasReducedMotionFallback(),
    }).result).toBe("PASS");
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_WAITING_WORKER_FIXTURE,
      renderedInfinityState: "STANDBY",
      reducedMotionFallbackPresent: true,
      systemState: "WAITING_FOR_EVIDENCE",
    }).result).toBe("PASS");
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_BLOCKED_WORKER_FIXTURE,
      renderedInfinityState: "BLOCKED",
      reducedMotionFallbackPresent: true,
    }).result).toBe("PASS");
    expect(evaluateHQInfinitySymbolActivityGate({
      workers: HQ_AUTHORIZATION_WORKER_FIXTURE,
      renderedInfinityState: "AUTHORIZATION",
      reducedMotionFallbackPresent: true,
    }).result).toBe("PASS");
    const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
    expect(css).toMatch(/data-hq-decision-core="PRESENT_IDLE"\] \.hq-infinity-energy[\s\S]*animation:\s*none/);
    expect(css).toContain("--infinity-blocked: #fbbf24");
    expect(css).toContain("--infinity-active: #22d3ee");
  });

  it("preserves reduced-motion static purple and non-color state labels", () => {
    const css = [
      readFileSync(join(ROOT, "app/globals.css"), "utf8"),
      readFileSync(join(ROOT, "app/hq-live-activity.css"), "utf8"),
    ].join("\n");
    const core = readFileSync(join(ROOT, "components/dashboard/operator-console/infinity-decision-core.tsx"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*\.hq-infinity-energy[\s\S]*animation:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*--hq-infinity-inner-active/);
    expect(core).toContain("aria-label");
    expect(projectCommandOversight({ workers: HQ_ACTIVE_WORKER_FIXTURE }).accessibleState.length).toBeGreaterThan(0);
  });
});

describe("current live Operations projection", () => {
  it("does not force active glow while the system is waiting for evidence", () => {
    const projected = projectOperationsRoom();
    const visuals = projected.workers.map(projectWorkerVisualState);
    const oversight = projectCommandOversight({
      workers: projected.workers,
      systemState: typeof projected.department.detail.systemState === "string"
        ? String(projected.department.detail.systemState)
        : null,
    });
    expect(visuals.every((row) => row.glow === false || row.visualState === "ACTIVE")).toBe(true);
    expect(visuals.filter((row) => row.glow).length).toBe(oversight.activeWorkerCount);
    if (oversight.activeWorkerCount === 0) {
      expect(oversight.commandState).not.toBe("ACTIVE_OVERSIGHT");
      expect(oversight.infinityState).not.toBe("ACTIVE");
    }
    expect(projected.workers.every((node) => node.nodeId && node.role && node.displayRole)).toBe(true);
  });
});
