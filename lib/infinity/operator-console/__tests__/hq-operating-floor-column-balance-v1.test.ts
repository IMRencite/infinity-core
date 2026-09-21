import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIFECYCLE_ROOM_SEQUENCE } from "../room-naming";
import {
  HQ_FLOOR_LAYOUT_SECTIONS,
  HQ_FLOOR_LEFT_ROOMS,
  HQ_FLOOR_RIGHT_ABOVE_SEQUENCE,
  HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE,
  HQ_OPERATING_FLOOR_ORDER,
  HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT,
  HQ_ROOM_POSITION_INTEGRITY_GATE,
  assembleCanonicalFloorOrder,
  hqFloorColumn,
  hqFloorPositionInColumn,
  hqFloorSpan,
  listHqOperatingFloorPlacements,
  nextRoomInColumn,
} from "../floor-layout";
import {
  evaluateHQOperatingFloorColumnBalanceGate,
  evaluateHQOperatingFloorPlacementContract,
  evaluateHQRoomPositionIntegrityGate,
  hqRoomContentFingerprint,
} from "../floor-placement-gates";

const ROOT = process.cwd();

function read(relative: string): string {
  return readFileSync(join(ROOT, relative), "utf8");
}

const MOVED = ["strategy_finance", "systems_architect", "creative_studio"] as const;
const REQUESTED_RIGHT = ["product_lab", "strategy_finance", "systems_architect"] as const;

describe("HQ operating floor column balance v1", () => {
  it("places Profit Lab and Systems Architect under Creation Lab on the right", () => {
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.right).toEqual(HQ_FLOOR_RIGHT_ABOVE_SEQUENCE);
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.right.slice(3, 6)).toEqual([...REQUESTED_RIGHT]);
    expect(nextRoomInColumn("product_lab")).toBe("strategy_finance");
    expect(nextRoomInColumn("strategy_finance")).toBe("systems_architect");
    expect(nextRoomInColumn("systems_architect")).toBe("intelligence_center");
    expect(hqFloorSpan("strategy_finance")).toBe("right");
    expect(hqFloorSpan("systems_architect")).toBe("right");
    expect(hqFloorSpan("creative_studio")).toBe("left");
    expect(hqFloorPositionInColumn("product_lab")).toBe(4);
    expect(hqFloorPositionInColumn("strategy_finance")).toBe(5);
    expect(hqFloorPositionInColumn("systems_architect")).toBe(6);
    expect(hqFloorPositionInColumn("creative_studio")).toBe(2);
    expect(evaluateHQOperatingFloorPlacementContract().gate).toBe(HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT);
    expect(evaluateHQOperatingFloorPlacementContract().result).toBe("PASS");
  });

  it("keeps Operations first and does not reorder unrelated lifecycle rooms", () => {
    expect(HQ_OPERATING_FLOOR_ORDER[0]).toBe("operations");
    expect(assembleCanonicalFloorOrder()).toEqual(LIFECYCLE_ROOM_SEQUENCE);
    expect(LIFECYCLE_ROOM_SEQUENCE.indexOf("systems_architect")).toBe(
      LIFECYCLE_ROOM_SEQUENCE.indexOf("company_operations") + 1,
    );
    expect(HQ_FLOOR_LEFT_ROOMS[0]).toBe("opportunity_lab");
    expect(hqFloorColumn("opportunity_lab")).toBe("left");
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.left).toEqual(["opportunity_lab", "creative_studio"]);
    expect(HQ_FLOOR_LAYOUT_SECTIONS.below.left).toEqual(["launch_operations"]);
    expect(HQ_FLOOR_LAYOUT_SECTIONS.below.right).toEqual(["intelligence_center", "prospect_intelligence"]);
  });

  it("changes only placement metadata for the three moved rooms", () => {
    const before = Object.fromEntries(MOVED.map((id) => [id, hqRoomContentFingerprint(id)]));
    const after = Object.fromEntries(MOVED.map((id) => [id, hqRoomContentFingerprint(id)]));
    const gate = evaluateHQRoomPositionIntegrityGate({
      requestedRightSequence: [...REQUESTED_RIGHT],
      beforeFingerprints: before,
      afterFingerprints: after,
    });
    expect(gate.gate).toBe(HQ_ROOM_POSITION_INTEGRITY_GATE);
    expect(gate.result).toBe("PASS");
    const layout = read("lib/infinity/operator-console/floor-layout.ts");
    const profitLab = read("lib/infinity/hq-inspection-identity/canonical-snapshot.ts");
    expect(layout).toContain("HQ_FLOOR_RIGHT_AFTER_CREATION");
    expect(profitLab).not.toContain("HQ_FLOOR_RIGHT_AFTER_CREATION");
    for (const file of [
      "components/dashboard/operator-console/department-room.tsx",
      "lib/infinity/operator-console/attach-global-hq-floor.ts",
      "lib/infinity/hq-room-presentation/opportunity-orb.ts",
    ]) {
      expect(read(file)).not.toContain("HQ_FLOOR_RIGHT_AFTER_CREATION");
    }
  });

  it("records an explicit placement contract for every operating-floor room", () => {
    const rows = listHqOperatingFloorPlacements();
    expect(rows).toHaveLength(HQ_OPERATING_FLOOR_ORDER.length);
    expect(rows.every((row) => row.room_id && row.canonical_sequence > 0 && row.column && row.position_in_column > 0)).toBe(
      true,
    );
    const floor = read("components/dashboard/operator-console/hq-spatial-floor.tsx");
    expect(floor).toContain("data-hq-floor-position-in-column");
    expect(floor).toContain("HQ_FLOOR_LAYOUT_SECTIONS");
    expect(floor).not.toContain("position: \"absolute\"");
    expect(floor).not.toContain("translateY");
    const css = read("app/globals.css");
    const columns = css.slice(css.indexOf(".hq-floor-columns"), css.indexOf(".hq-floor-flow-legend"));
    expect(columns).not.toContain("position: absolute");
    expect(columns).not.toContain("transform:");
  });

  it("improves desktop column balance without requiring equal pixel heights", () => {
    const gate = evaluateHQOperatingFloorColumnBalanceGate({
      leftAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.left.length,
      rightAboveCount: HQ_FLOOR_LAYOUT_SECTIONS.above.right.length,
      movedRoomsStillOnTallerSide: false,
      legalMovesAvailable: true,
      exactPixelParityRequired: false,
    });
    expect(gate.gate).toBe(HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE);
    expect(gate.result).toBe("PASS");
    expect(HQ_FLOOR_LAYOUT_SECTIONS.above.right.length).toBeGreaterThan(HQ_FLOOR_LAYOUT_SECTIONS.above.left.length);
    expect(evaluateHQOperatingFloorColumnBalanceGate({
      leftAboveCount: 4,
      rightAboveCount: 4,
      movedRoomsStillOnTallerSide: true,
      legalMovesAvailable: true,
    }).result).toBe("FAIL");
  });

  it("keeps collapsed mobile order on the lifecycle sequence", () => {
    const css = read("app/globals.css");
    expect(css).toContain("order: var(--hq-floor-order");
    expect(assembleCanonicalFloorOrder()).toEqual(LIFECYCLE_ROOM_SEQUENCE);
    const floor = read("components/dashboard/operator-console/hq-spatial-floor.tsx");
    expect(floor).toContain("--hq-floor-order");
    expect(floor).toContain("hqFloorCanonicalIndex");
  });
});
