import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { departmentStateClasses } from "@/lib/infinity/operator-console/status-derivation";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("HQ visual system unification", () => {
  it("uses InfinityRoomShell for lifecycle and command rooms", () => {
    expect(readSource("department-room.tsx")).toContain("InfinityRoomShell");
    expect(readSource("command-chamber.tsx")).toContain("InfinityRoomShell");
  });

  it("does not stack element opacity on NOT_STARTED state classes", () => {
    expect(departmentStateClasses("NOT_STARTED")).not.toMatch(/opacity-/);
  });

  it("uses canonical status chip in department rooms", () => {
    expect(readSource("department-room.tsx")).toContain("RoomStatusChip");
    expect(readSource("infinity-room/room-status-chip.tsx")).toContain("departmentStateLabel");
  });

  it("uses canonical output strip", () => {
    expect(readSource("department-room.tsx")).toContain("RoomOutputStrip");
    expect(readSource("infinity-room/room-output-strip.tsx")).toContain("hq-room-output-strip");
  });

  it("defines mission-control shell tokens in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toContain("--infinity-panel");
    expect(css).toContain(".hq-room-shell");
    expect(css).toContain(".infinity-hq");
  });

  it("uses a wrap-first desktop artifact grid instead of a clipped carousel rail", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const gridStart = css.indexOf(".hq-artifact-grid,");
    const mobileStart = css.indexOf("@media (max-width: 768px)", gridStart);
    const desktop = css.slice(gridStart, mobileStart);
    expect(desktop).toContain("repeat(auto-fill, minmax(8.5rem, 1fr))");
    expect(desktop).toContain("grid-auto-flow: row");
    expect(desktop).not.toContain("grid-auto-flow: column");
    expect(desktop).not.toMatch(/max-height:\s*10\.75rem/);
    expect(desktop).not.toContain("overflow-x: auto");
    expect(css).toContain(".hq-artifact-rail-arrow");
    expect(css).toContain(".hq-agent-presence-rail");
    expect(readSource("department-room.tsx")).toContain("expectedCount");
    expect(readSource("department-room.tsx")).toContain("RoomPresenceTrack");
    expect(readSource("infinity-room/room-presence-track.tsx")).toContain("PRESENT_IDLE");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("View all");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("openRoomInventory");
    expect(readSource("artifacts/room-artifact-surface.tsx")).toContain("RoomArtifactGrid");
    expect(readSource("artifacts/room-artifact-surface.tsx")).not.toContain("onWheel");
    expect(readSource("artifacts/artifact-inspector-modal.tsx")).toContain("RoomArtifactInventory");
    expect(readSource("hq-spatial-floor.tsx")).toContain("hq-floor-columns");
  });
});
