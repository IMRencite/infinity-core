export type PageLayoutType =
  | "COMMERCE_INDEX"
  | "COLLECTION"
  | "SEARCH"
  | "PRODUCT_DETAIL"
  | "EDITORIAL"
  | "APPROVED_ASYMMETRIC";

export type LayoutRect = { x: number; y: number; width: number; height: number };

export type PageLayoutMeasurement = {
  page_type: PageLayoutType;
  viewport: { width: number; height: number };
  container: LayoutRect;
  grid?: LayoutRect;
  cards?: LayoutRect[];
  contract?: "BALANCED_AVAILABLE_WIDTH" | "APPROVED_ASYMMETRIC";
};

export const FOUNDER_CT_SHOP_KNOWN_BAD_LAYOUT: PageLayoutMeasurement = {
  page_type: "COMMERCE_INDEX",
  viewport: { width: 1728, height: 980 },
  container: { x: 48, y: 180, width: 720, height: 640 },
  grid: { x: 48, y: 360, width: 680, height: 420 },
  cards: [
    { x: 48, y: 360, width: 210, height: 180 },
    { x: 270, y: 360, width: 210, height: 180 },
    { x: 492, y: 360, width: 210, height: 180 },
  ],
  contract: "BALANCED_AVAILABLE_WIDTH",
};

export const COMMERCE_LAYOUT_KNOWN_GOOD: PageLayoutMeasurement = {
  page_type: "COMMERCE_INDEX",
  viewport: { width: 1728, height: 980 },
  container: { x: 164, y: 160, width: 1400, height: 720 },
  grid: { x: 164, y: 320, width: 1400, height: 480 },
  cards: [
    { x: 164, y: 320, width: 330, height: 400 },
    { x: 514, y: 320, width: 330, height: 400 },
    { x: 864, y: 320, width: 330, height: 400 },
    { x: 1214, y: 320, width: 330, height: 400 },
  ],
  contract: "BALANCED_AVAILABLE_WIDTH",
};

export function evaluatePageLayoutContract(input: PageLayoutMeasurement): {
  gate: "PageLayoutContract";
  result: "PASS" | "FAIL";
  reasons: string[];
  unused_right_ratio: number;
  container_utilization: number;
} {
  if (input.contract === "APPROVED_ASYMMETRIC" || input.page_type === "APPROVED_ASYMMETRIC") {
    return { gate: "PageLayoutContract", result: "PASS", reasons: ["APPROVED_ASYMMETRIC"], unused_right_ratio: 0, container_utilization: 1 };
  }
  const reasons: string[] = [];
  const rightUnused = Math.max(0, input.viewport.width - (input.container.x + input.container.width));
  const unused_right_ratio = rightUnused / input.viewport.width;
  const container_utilization = input.grid ? input.grid.width / Math.max(1, input.container.width) : input.container.width / Math.max(1, input.viewport.width);
  const commerce = input.page_type === "COMMERCE_INDEX" || input.page_type === "COLLECTION" || input.page_type === "SEARCH";
  if (commerce && input.viewport.width >= 1440) {
    if (unused_right_ratio > 0.28 && input.container.x < input.viewport.width * 0.12) {
      reasons.push("HUGE_UNEXPLAINED_RIGHT_WHITESPACE");
    }
    if (input.container.width / input.viewport.width < 0.55) {
      reasons.push("COMMERCIAL_REGION_TOO_NARROW");
    }
    if (input.grid && input.grid.width / input.container.width < 0.7) {
      reasons.push("GRID_UNDERUTILIZES_CONTAINER");
    }
    if ((input.cards?.length ?? 0) >= 3 && input.cards!.every((card) => card.width < 240) && input.viewport.width >= 1440) {
      reasons.push("CARDS_CRUSHED_ON_WIDE_DESKTOP");
    }
  }
  return {
    gate: "PageLayoutContract",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["BALANCED_AVAILABLE_WIDTH"],
    unused_right_ratio,
    container_utilization,
  };
}
