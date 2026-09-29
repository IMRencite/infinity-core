export const RENDERED_SCROLL_COLLISION_GATE = "RenderedScrollCollisionGate" as const;

export type LayoutRegion =
  | "hero_branding"
  | "navigation"
  | "sidebar"
  | "main_content"
  | "footer"
  | "modal"
  | "dropdown";

export type ElementBox = {
  id: string;
  region: LayoutRegion;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

export type AllowedOverlapRule = {
  a: LayoutRegion;
  b: LayoutRegion;
};

const DEFAULT_ALLOWED: AllowedOverlapRule[] = [
  { a: "modal", b: "main_content" },
  { a: "modal", b: "sidebar" },
  { a: "modal", b: "navigation" },
  { a: "dropdown", b: "navigation" },
  { a: "dropdown", b: "main_content" },
];

function overlapArea(a: ElementBox, b: ElementBox): number {
  if (!a.visible || !b.visible) return 0;
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function allowedOverlap(a: LayoutRegion, b: LayoutRegion, rules: AllowedOverlapRule[]): boolean {
  return rules.some(
    (rule) =>
      (rule.a === a && rule.b === b) ||
      (rule.a === b && rule.b === a),
  );
}

export function detectScrollRegionCollisions(input: {
  elements: ElementBox[];
  minOverlapPx?: number;
  allowed?: AllowedOverlapRule[];
}): {
  collisions: Array<{ a: string; b: string; overlapPx: number; regions: [LayoutRegion, LayoutRegion] }>;
  result: "PASS" | "FAIL";
} {
  const minOverlap = input.minOverlapPx ?? 400;
  const allowed = input.allowed ?? DEFAULT_ALLOWED;
  const collisions: Array<{ a: string; b: string; overlapPx: number; regions: [LayoutRegion, LayoutRegion] }> = [];
  for (let i = 0; i < input.elements.length; i += 1) {
    for (let j = i + 1; j < input.elements.length; j += 1) {
      const left = input.elements[i];
      const right = input.elements[j];
      if (left.region === right.region) continue;
      if (allowedOverlap(left.region, right.region, allowed)) continue;
      const overlapPx = overlapArea(left, right);
      if (overlapPx >= minOverlap) {
        collisions.push({
          a: left.id,
          b: right.id,
          overlapPx,
          regions: [left.region, right.region],
        });
      }
    }
  }
  return { collisions, result: collisions.length === 0 ? "PASS" : "FAIL" };
}

/** Source/CSS contract: decorative marks must not use viewport-fixed global branding. */
export function evaluateSectionContainedBrandingCss(markCss: string, componentSource: string): {
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (/position:\s*(fixed|sticky)/i.test(markCss)) reasons.push("DECORATIVE_BRAND_MARK_FIXED_TO_VIEWPORT");
  if (!/position:\s*(static|relative|absolute)/i.test(markCss)) reasons.push("DECORATIVE_BRAND_POSITION_UNDECLARED");
  if (!componentSource.includes("data-section-contained-brand")) {
    reasons.push("SECTION_CONTAINMENT_ATTRIBUTE_MISSING");
  }
  if (/z-index:\s*(?:[2-9]\d|\d{3,})/i.test(markCss)) reasons.push("DECORATIVE_BRAND_EXCESSIVE_Z_INDEX");
  return { result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

/** IMROS regression geometry: fixed brand mark overlapping sidebar at mid-scroll. */
export function imrosBrokenScrollCollisionFixture(): ElementBox[] {
  return [
    { id: "imr-mark", region: "hero_branding", x: 1320, y: 40, width: 56, height: 56, visible: true },
    { id: "ops-sidebar", region: "sidebar", x: 1180, y: 72, width: 220, height: 480, visible: true },
  ];
}

export function imrosFixedScrollCollisionFixture(): ElementBox[] {
  return [
    { id: "imr-mark", region: "hero_branding", x: 1320, y: 40, width: 36, height: 36, visible: false },
    { id: "ops-sidebar", region: "sidebar", x: 1180, y: 420, width: 220, height: 480, visible: true },
  ];
}

export function evaluateRenderedScrollCollisionGate(input: {
  scrollSamples: Array<{ scrollPct: number; elements: ElementBox[] }>;
}): {
  gate: typeof RENDERED_SCROLL_COLLISION_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  failingSamples: number[];
} {
  const reasons: string[] = [];
  const failingSamples: number[] = [];
  for (const sample of input.scrollSamples) {
    const check = detectScrollRegionCollisions({ elements: sample.elements });
    if (check.result === "FAIL") {
      failingSamples.push(sample.scrollPct);
      for (const row of check.collisions) {
        reasons.push(
          `SCROLL_${sample.scrollPct}:OVERLAP:${row.a}/${row.b}:${row.overlapPx}px`,
        );
      }
    }
  }
  return {
    gate: RENDERED_SCROLL_COLLISION_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    failingSamples,
  };
}
