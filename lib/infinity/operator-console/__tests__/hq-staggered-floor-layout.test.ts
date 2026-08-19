import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HQ_FLOOR_CANONICAL_ROOMS,
  HQ_FLOOR_FULL_WIDTH_ROOMS,
  HQ_FLOOR_LAYOUT_SECTIONS,
  HQ_FLOOR_LEFT_ROOMS,
  HQ_FLOOR_RIGHT_ROOMS,
  assembleCanonicalFloorOrder,
  hqFloorColumn,
  hqFloorDesktopColumns,
  hqFloorSpan,
  interleaveFloorColumns,
  nextRoomInColumn,
  packIndependentFloorColumns,
} from "@/lib/infinity/operator-console/floor-layout";
import { groupArtifactsForDisplay } from "@/lib/infinity/operator-console/artifacts/grouping";
import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { LIFECYCLE_ROOM_SEQUENCE } from "@/lib/infinity/operator-console/room-naming";

const ROOT = join(process.cwd(), "components/dashboard/operator-console");

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function artifact(count: number, roomId: HqWorkArtifact["roomId"], artifactType: HqWorkArtifact["artifactType"]): HqWorkArtifact[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${roomId}-${i + 1}`,
    roomId,
    artifactType,
    title: `${artifactType} ${i + 1}`,
    subtitle: null,
    state: "READY",
    createdAt: null,
    sourceRecordType: artifactType,
    sourceRecordId: `${roomId}-${i + 1}`,
    metadata: {},
  }));
}

describe("HQ staggered operating floor layout", () => {
  it("derives desktop columns from one canonical room sequence", () => {
    expect(HQ_FLOOR_CANONICAL_ROOMS).toEqual(LIFECYCLE_ROOM_SEQUENCE);
    expect(HQ_FLOOR_LEFT_ROOMS).toEqual([
      "opportunity_lab",
      "strategy_finance",
      "growth_department",
      "product_lab",
      "launch_operations",
    ]);
    expect(HQ_FLOOR_RIGHT_ROOMS).toEqual([
      "research_department",
      "company_operations",
      "creative_studio",
      "intelligence_center",
    ]);
    expect(HQ_FLOOR_FULL_WIDTH_ROOMS).toEqual(["quality_control"]);
    expect(assembleCanonicalFloorOrder()).toEqual(HQ_FLOOR_CANONICAL_ROOMS);
    expect(new Set([...HQ_FLOOR_LEFT_ROOMS, ...HQ_FLOOR_RIGHT_ROOMS, ...HQ_FLOOR_FULL_WIDTH_ROOMS]).size).toBe(10);
    expect(hqFloorDesktopColumns().left).toEqual(HQ_FLOOR_LEFT_ROOMS);
    expect(hqFloorSpan("quality_control")).toBe("full");
    expect(interleaveFloorColumns(HQ_FLOOR_LAYOUT_SECTIONS.above.left, HQ_FLOOR_LAYOUT_SECTIONS.above.right)).toEqual([
      "opportunity_lab",
      "research_department",
      "strategy_finance",
      "company_operations",
      "growth_department",
      "creative_studio",
      "product_lab",
    ]);
  });

  it("does not let a tall right room delay the next left room", () => {
    const packed = packIndependentFloorColumns(
      {
        opportunity_lab: 400,
        research_department: 900,
        strategy_finance: 350,
        company_operations: 500,
      },
      16,
    );
    const profit = packed.left.find((room) => room.id === "strategy_finance");
    const research = packed.right.find((room) => room.id === "research_department");
    const blueprint = packed.right.find((room) => room.id === "company_operations");
    expect(nextRoomInColumn("opportunity_lab")).toBe("strategy_finance");
    expect(profit?.top).toBe(416);
    expect(profit?.top).toBeLessThan(900);
    expect(research?.height).toBe(900);
    expect(blueprint?.top).toBe(916);
    expect(blueprint?.top).not.toBe(profit?.top);
  });

  it("keeps full artifact visibility while changing only floor geometry", () => {
    expect(groupArtifactsForDisplay(artifact(10, "opportunity_lab", "opportunity_candidate")).visible).toHaveLength(10);
    expect(groupArtifactsForDisplay(artifact(17, "research_department", "research_packet")).visible).toHaveLength(17);
    expect(groupArtifactsForDisplay(artifact(10, "strategy_finance", "monetization_plan")).visible).toHaveLength(10);
    expect(groupArtifactsForDisplay(artifact(10, "company_operations", "selection_blueprint")).visible).toHaveLength(10);
  });

  it("uses two independent flex columns without duplicated rooms or JS masonry", () => {
    const floor = readSource("hq-spatial-floor.tsx");
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const columnBlock = css.slice(css.indexOf(".hq-floor-columns"), css.indexOf(".hq-floor-flow-legend"));
    expect(floor).toContain("hq-floor-columns");
    expect(floor).toContain("hq-floor-column--left");
    expect(floor).toContain("hq-floor-column--right");
    expect(floor).toContain("HQ_FLOOR_LAYOUT_SECTIONS");
    expect(floor).toContain("hq-floor-full-row");
    expect(floor).not.toContain("grid-cols-12");
    expect(floor).not.toContain("grid-cols-4");
    expect(floor).not.toContain("md:hidden");
    expect(floor).not.toContain("position: \"absolute\"");
    expect(floor.match(/data-hq-floor-room/g)?.length).toBe(1);
    expect(floor.split("Validation Station").length).toBe(1);
    expect(css).toContain("flex-direction: column");
    expect(columnBlock).toContain("align-items: flex-start");
    expect(columnBlock).not.toContain("position: absolute");
    expect(readSource("hq-flow-connectors.tsx")).not.toContain("preserveAspectRatio");
    expect(readSource("hq-flow-connectors.tsx")).toContain("hq-floor-flow-legend");
    expect(readFileSync(join(process.cwd(), "package.json"), "utf8")).not.toMatch(/masonry|masonic|react-masonry/i);
  });

  it("restores canonical workflow order on mobile via CSS order, not left-then-right concatenation", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const mobile = css.slice(css.indexOf(".hq-floor-columns"), css.indexOf(".hq-orb-moving"));
    expect(mobile).toContain("display: contents");
    expect(mobile).toContain("order: var(--hq-floor-order");
    expect(hqFloorColumn("opportunity_lab")).toBe("left");
    expect(hqFloorColumn("research_department")).toBe("right");
    expect(readSource("hq-spatial-floor.tsx")).toContain("--hq-floor-order");
    expect(readSource("department-room.tsx")).toContain("No outputs yet");
    expect(readSource("room-workflow-stage.tsx")).not.toContain("Chamber idle");
  });
});
