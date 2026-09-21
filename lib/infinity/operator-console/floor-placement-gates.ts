import { DEPARTMENTS } from "./department-registry";
import {
  HQ_FLOOR_RIGHT_ABOVE_SEQUENCE,
  HQ_FLOOR_RIGHT_AFTER_CREATION,
  HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE,
  HQ_OPERATING_FLOOR_ORDER,
  HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT,
  HQ_ROOM_POSITION_INTEGRITY_GATE,
  hqFloorLayoutSections,
  hqFloorSpan,
  listHqOperatingFloorPlacements,
  nextRoomInColumn,
  type HqOperatingFloorPlacement,
} from "./floor-layout";
import { ROOM_DISPLAY_NAMES } from "./room-naming";
import type { DepartmentId } from "./types";

export type NamedFloorGate = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

const MOVED_ROOMS: DepartmentId[] = [...HQ_FLOOR_RIGHT_AFTER_CREATION];

export function hqRoomContentFingerprint(roomId: DepartmentId): string {
  const names = ROOM_DISPLAY_NAMES[roomId];
  const dept = DEPARTMENTS.find((item) => item.id === roomId);
  return JSON.stringify({
    roomId,
    displayName: names.displayName,
    shortDescription: names.shortDescription,
    expandedDescription: names.expandedDescription,
    label: dept?.label ?? null,
    shortLabel: dept?.shortLabel ?? null,
    engines: dept?.engines ?? [],
    description: dept?.description ?? null,
    lifecycleOrder: dept?.lifecycleOrder ?? null,
  });
}

export function evaluateHQOperatingFloorPlacementContract(
  placements: HqOperatingFloorPlacement[] = listHqOperatingFloorPlacements(),
): NamedFloorGate {
  const reasons: string[] = [];
  const byId = new Map(placements.map((item) => [item.room_id, item]));
  for (const id of HQ_OPERATING_FLOOR_ORDER) {
    const row = byId.get(id);
    if (!row) {
      reasons.push(`MISSING_PLACEMENT:${id}`);
      continue;
    }
    if (!row.canonical_sequence || row.canonical_sequence < 1) reasons.push(`MISSING_SEQUENCE:${id}`);
    if (!row.column) reasons.push(`MISSING_COLUMN:${id}`);
    if (!row.position_in_column || row.position_in_column < 1) reasons.push(`MISSING_POSITION:${id}`);
  }
  const right = hqFloorLayoutSections().above.right;
  const left = hqFloorLayoutSections().above.left;
  const creation = right.indexOf("product_lab");
  const profit = right.indexOf("strategy_finance");
  const systems = right.indexOf("systems_architect");
  if (!(creation >= 0 && profit === creation + 1 && systems === profit + 1)) {
    reasons.push("CREATION_PROFIT_SYSTEMS_SEQUENCE");
  }
  if (hqFloorSpan("strategy_finance") !== "right" || hqFloorSpan("systems_architect") !== "right") {
    reasons.push("PROFIT_SYSTEMS_NOT_RIGHT_COLUMN");
  }
  if (hqFloorSpan("creative_studio") !== "left" || !left.includes("creative_studio")) {
    reasons.push("DESIGN_CORE_NOT_LEFT_COLUMN");
  }
  return {
    gate: HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQRoomPositionIntegrityGate(input: {
  requestedRightSequence: DepartmentId[];
  beforeFingerprints: Partial<Record<DepartmentId, string>>;
  afterFingerprints: Partial<Record<DepartmentId, string>>;
}): NamedFloorGate {
  const reasons: string[] = [];
  const right = hqFloorLayoutSections().above.right;
  const start = right.indexOf("product_lab");
  const actual = start >= 0 ? right.slice(start, start + input.requestedRightSequence.length) : [];
  if (actual.join(",") !== input.requestedRightSequence.join(",")) {
    reasons.push("REQUESTED_POSITION_INCORRECT");
  }
  const fingerprintRooms = [...new Set([...MOVED_ROOMS, "creative_studio" as DepartmentId])];
  for (const id of fingerprintRooms) {
    if (input.beforeFingerprints[id] && input.beforeFingerprints[id] !== input.afterFingerprints[id]) {
      reasons.push(`CONTENT_CHANGED:${id}`);
    }
  }
  return {
    gate: HQ_ROOM_POSITION_INTEGRITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateHQOperatingFloorColumnBalanceGate(input: {
  leftAboveCount: number;
  rightAboveCount: number;
  movedRoomsStillOnTallerSide: boolean;
  legalMovesAvailable: boolean;
  exactPixelParityRequired?: boolean;
}): NamedFloorGate {
  const reasons: string[] = [];
  if (input.exactPixelParityRequired) reasons.push("PIXEL_PARITY_NOT_REQUIRED");
  if (hqFloorSpan("operations") === "left") reasons.push("OPERATIONS_MOVED");
  const leftHasMoved = HQ_FLOOR_RIGHT_AFTER_CREATION.some((id) => hqFloorSpan(id) === "left");
  if (leftHasMoved && input.legalMovesAvailable) reasons.push("AVOIDABLE_LEFT_STACK");
  if (input.movedRoomsStillOnTallerSide) reasons.push("MOVED_ROOMS_STILL_ON_TALLER_SIDE");
  if (nextRoomInColumn("product_lab") !== "strategy_finance") reasons.push("PROFIT_NOT_UNDER_CREATION");
  if (nextRoomInColumn("strategy_finance") !== "systems_architect") reasons.push("SYSTEMS_NOT_UNDER_PROFIT");
  if (hqFloorSpan("creative_studio") !== "left") reasons.push("DESIGN_CORE_STILL_RIGHT");
  if (input.rightAboveCount < HQ_FLOOR_RIGHT_ABOVE_SEQUENCE.length) reasons.push("RIGHT_COLUMN_INCOMPLETE");
  if (input.leftAboveCount < 1) reasons.push("LEFT_COLUMN_EMPTY");
  return {
    gate: HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
  };
}
