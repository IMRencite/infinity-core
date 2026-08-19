import type { DepartmentId } from "./types";
import { LIFECYCLE_ROOM_SEQUENCE } from "./room-naming";

export const HQ_FLOOR_CANONICAL_ROOMS: DepartmentId[] = LIFECYCLE_ROOM_SEQUENCE;

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
  above: { left: DepartmentId[]; right: DepartmentId[] };
  full: DepartmentId[];
  below: { left: DepartmentId[]; right: DepartmentId[] };
};

/** Reusable full-width operating-floor roles. Validation is the current gate. */
export const HQ_FLOOR_FULL_WIDTH_ROOMS: DepartmentId[] = ["quality_control"];

export function hqFloorSpan(id: DepartmentId): HqFloorSpan {
  if (HQ_FLOOR_FULL_WIDTH_ROOMS.includes(id)) return "full";
  const index = HQ_FLOOR_CANONICAL_ROOMS.indexOf(id);
  return index % 2 === 0 ? "left" : "right";
}

/** Even canonical indexes stay left; odd indexes stay right unless the room is full-width. */
export function hqFloorColumn(id: DepartmentId): HqFloorColumn {
  const span = hqFloorSpan(id);
  return span === "full" ? "right" : span;
}

export function hqFloorCanonicalIndex(id: DepartmentId): number {
  return HQ_FLOOR_CANONICAL_ROOMS.indexOf(id);
}

export function hqFloorWing(id: DepartmentId): HqFloorWing {
  switch (id) {
    case "opportunity_lab":
    case "research_department":
    case "strategy_finance":
    case "company_operations":
      return "discovery";
    case "growth_department":
    case "creative_studio":
    case "product_lab":
    case "quality_control":
      return "production";
    default:
      return "deployment";
  }
}

export function hqFloorLayoutSections(): HqFloorLayoutSections {
  const above = { left: [] as DepartmentId[], right: [] as DepartmentId[] };
  const full: DepartmentId[] = [];
  const below = { left: [] as DepartmentId[], right: [] as DepartmentId[] };
  let afterFull = false;

  for (const id of HQ_FLOOR_CANONICAL_ROOMS) {
    const span = hqFloorSpan(id);
    if (span === "full") {
      full.push(id);
      afterFull = true;
      continue;
    }
    const target = afterFull ? below : above;
    if (span === "left") target.left.push(id);
    else target.right.push(id);
  }

  return { above, full, below };
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

export function assembleCanonicalFloorOrder(sections: HqFloorLayoutSections = HQ_FLOOR_LAYOUT_SECTIONS): DepartmentId[] {
  return [
    ...interleaveFloorColumns(sections.above.left, sections.above.right),
    ...sections.full,
    ...interleaveFloorColumns(sections.below.left, sections.below.right),
  ];
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
