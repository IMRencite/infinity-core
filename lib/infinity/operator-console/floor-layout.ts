import type { DepartmentId } from "./types";
import { LIFECYCLE_ROOM_SEQUENCE, OPERATIONS_ROOM_ID } from "./room-naming";

export const HQ_FLOOR_CANONICAL_ROOMS: DepartmentId[] = LIFECYCLE_ROOM_SEQUENCE;

/** One source for operating-floor DOM, legend, and first-class room sequencing. */
export const HQ_OPERATING_FLOOR_ORDER: DepartmentId[] = [OPERATIONS_ROOM_ID, ...LIFECYCLE_ROOM_SEQUENCE];

export type HqFloorColumn = "left" | "right";
export type HqFloorSpan = "left" | "right" | "full";
export type HqFloorWing = "discovery" | "production" | "deployment";

export type HqFloorPackedRoom = {
  id: DepartmentId;
  column: HqFloorColumn;
  top: number;
  height: number;
};

export type HqFloorLayoutSections = {
  leading: DepartmentId[];
  above: { left: DepartmentId[]; right: DepartmentId[] };
  full: DepartmentId[];
  below: { left: DepartmentId[]; right: DepartmentId[] };
};

/** Reusable full-width operating-floor roles. Validation is the current gate. */
export const HQ_FLOOR_FULL_WIDTH_ROOMS: DepartmentId[] = ["quality_control"];

export const HQ_OPERATING_FLOOR_PLACEMENT_CONTRACT = "HQOperatingFloorPlacementContract" as const;
export const HQ_ROOM_POSITION_INTEGRITY_GATE = "HQRoomPositionIntegrityGate" as const;
export const HQ_OPERATING_FLOOR_COLUMN_BALANCE_GATE = "HQOperatingFloorColumnBalanceGate" as const;

/** Desktop-only move: Profit Lab and Systems Architect stay under Creation Lab. */
export const HQ_FLOOR_RIGHT_AFTER_CREATION: DepartmentId[] = [
  "strategy_finance",
  "systems_architect",
];

/** Design Core sits under Venture Radar to rebalance the left column. */
export const HQ_FLOOR_LEFT_ABOVE_SEQUENCE: DepartmentId[] = ["opportunity_lab", "creative_studio"];

export const HQ_FLOOR_RIGHT_ABOVE_SEQUENCE: DepartmentId[] = [
  "research_department",
  "company_operations",
  "growth_department",
  "product_lab",
  ...HQ_FLOOR_RIGHT_AFTER_CREATION,
];

export const HQ_FLOOR_LEFT_BELOW_SEQUENCE: DepartmentId[] = ["launch_operations"];
export const HQ_FLOOR_RIGHT_BELOW_SEQUENCE: DepartmentId[] = ["intelligence_center", "prospect_intelligence"];

export type HqOperatingFloorPlacement = {
  room_id: DepartmentId;
  canonical_sequence: number;
  column: HqFloorSpan;
  position_in_column: number;
};

export function hqFloorSpan(id: DepartmentId): HqFloorSpan {
  if (id === OPERATIONS_ROOM_ID || id === "executive_office" || id === "sales_floor") return "full";
  if (HQ_FLOOR_FULL_WIDTH_ROOMS.includes(id)) return "full";
  if (HQ_FLOOR_LEFT_ABOVE_SEQUENCE.includes(id) || HQ_FLOOR_LEFT_BELOW_SEQUENCE.includes(id)) return "left";
  if (HQ_FLOOR_RIGHT_ABOVE_SEQUENCE.includes(id) || HQ_FLOOR_RIGHT_BELOW_SEQUENCE.includes(id)) return "right";
  const index = HQ_FLOOR_CANONICAL_ROOMS.indexOf(id);
  return index % 2 === 0 ? "left" : "right";
}

/** Desktop column. Full-span rooms are not packed into a side column. */
export function hqFloorColumn(id: DepartmentId): HqFloorColumn {
  const span = hqFloorSpan(id);
  return span === "full" ? "right" : span;
}

export function hqFloorCanonicalIndex(id: DepartmentId): number {
  return HQ_FLOOR_CANONICAL_ROOMS.indexOf(id);
}

/** 1-based operating-floor position. Operations is always 1. */
export function hqOperatingFloorIndex(id: DepartmentId): number {
  const index = HQ_OPERATING_FLOOR_ORDER.indexOf(id);
  return index >= 0 ? index + 1 : -1;
}

export const HQ_OPERATING_FLOOR_LEGEND = ["Operations", "Discovery", "Production", "Deployment"] as const;

export function hqFloorWing(id: DepartmentId): HqFloorWing {
  switch (id) {
    case "opportunity_lab":
    case "research_department":
    case "strategy_finance":
    case "company_operations":
    case "systems_architect":
      return "discovery";
    case "growth_department":
    case "creative_studio":
    case "product_lab":
    case "quality_control":
    case "sales_floor":
      return "production";
    default:
      return "deployment";
  }
}

export function hqFloorLayoutSections(): HqFloorLayoutSections {
  return {
    leading: [OPERATIONS_ROOM_ID],
    above: {
      left: [...HQ_FLOOR_LEFT_ABOVE_SEQUENCE],
      right: [...HQ_FLOOR_RIGHT_ABOVE_SEQUENCE],
    },
    full: [...HQ_FLOOR_FULL_WIDTH_ROOMS],
    below: {
      left: [...HQ_FLOOR_LEFT_BELOW_SEQUENCE],
      right: [...HQ_FLOOR_RIGHT_BELOW_SEQUENCE],
    },
  };
}

export function hqFloorPositionInColumn(id: DepartmentId): number {
  const sections = hqFloorLayoutSections();
  if (sections.leading.includes(id) || sections.full.includes(id)) return 1;
  const lists = [sections.above.left, sections.above.right, sections.below.left, sections.below.right];
  for (const list of lists) {
    const index = list.indexOf(id);
    if (index >= 0) return index + 1;
  }
  return -1;
}

export function projectHqOperatingFloorPlacement(id: DepartmentId): HqOperatingFloorPlacement {
  return {
    room_id: id,
    canonical_sequence: hqOperatingFloorIndex(id),
    column: hqFloorSpan(id),
    position_in_column: hqFloorPositionInColumn(id),
  };
}

export function listHqOperatingFloorPlacements(): HqOperatingFloorPlacement[] {
  return HQ_OPERATING_FLOOR_ORDER.map(projectHqOperatingFloorPlacement);
}

export function hqFloorDesktopColumns(): { left: DepartmentId[]; right: DepartmentId[] } {
  const sections = hqFloorLayoutSections();
  return {
    left: [...sections.above.left, ...sections.below.left],
    right: [...sections.above.right, ...sections.below.right],
  };
}

export const HQ_FLOOR_LAYOUT_SECTIONS = hqFloorLayoutSections();
export const HQ_FLOOR_LEFT_ROOMS = hqFloorDesktopColumns().left;
export const HQ_FLOOR_RIGHT_ROOMS = hqFloorDesktopColumns().right;

export function interleaveFloorColumns(left: DepartmentId[], right: DepartmentId[]): DepartmentId[] {
  const out: DepartmentId[] = [];
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const leftId = left[i];
    const rightId = right[i];
    if (leftId) out.push(leftId);
    if (rightId) out.push(rightId);
  }
  return out;
}

export function assembleCanonicalFloorOrder(_sections: HqFloorLayoutSections = HQ_FLOOR_LAYOUT_SECTIONS): DepartmentId[] {
  return [...HQ_FLOOR_CANONICAL_ROOMS];
}

export function assembleOperatingFloorRenderOrder(
  sections: HqFloorLayoutSections = HQ_FLOOR_LAYOUT_SECTIONS,
): DepartmentId[] {
  return [...sections.leading, ...assembleCanonicalFloorOrder(sections)];
}

/** Independent column packing: a tall right room must not delay the next left room. */
export function packIndependentFloorColumns(
  heights: Partial<Record<DepartmentId, number>>,
  gapPx: number,
  leftIds: DepartmentId[] = HQ_FLOOR_LEFT_ROOMS,
  rightIds: DepartmentId[] = HQ_FLOOR_RIGHT_ROOMS,
): { left: HqFloorPackedRoom[]; right: HqFloorPackedRoom[] } {
  const pack = (ids: DepartmentId[], column: HqFloorColumn): HqFloorPackedRoom[] => {
    let top = 0;
    return ids.map((id) => {
      const height = heights[id] ?? 0;
      const item: HqFloorPackedRoom = { id, column, top, height };
      top += height + gapPx;
      return item;
    });
  };
  return { left: pack(leftIds, "left"), right: pack(rightIds, "right") };
}

export function packFloorSections(
  heights: Partial<Record<DepartmentId, number>>,
  gapPx: number,
): {
  above: { left: HqFloorPackedRoom[]; right: HqFloorPackedRoom[] };
  below: { left: HqFloorPackedRoom[]; right: HqFloorPackedRoom[] };
} {
  const sections = hqFloorLayoutSections();
  return {
    above: packIndependentFloorColumns(heights, gapPx, sections.above.left, sections.above.right),
    below: packIndependentFloorColumns(heights, gapPx, sections.below.left, sections.below.right),
  };
}

export function nextRoomInColumn(id: DepartmentId): DepartmentId | null {
  if (hqFloorSpan(id) === "full") return null;
  const column = hqFloorColumn(id);
  const rooms = column === "left" ? HQ_FLOOR_LEFT_ROOMS : HQ_FLOOR_RIGHT_ROOMS;
  const index = rooms.indexOf(id);
  return index >= 0 ? (rooms[index + 1] ?? null) : null;
}
