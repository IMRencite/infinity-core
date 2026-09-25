export const CAROUSEL_GEOMETRY_CONTRACT = "v2" as const;

export type CarouselGeometryRects = {
  slide: { width: number };
  card: { width: number };
  image: { width: number };
  body: { width: number };
};

/** Conceptual wide-image / crushed-body escape. */
export const OCCUPANCY_CRUSHED_CAROUSEL_KNOWN_BAD: CarouselGeometryRects = {
  slide: { width: 960 },
  card: { width: 960 },
  image: { width: 960 },
  body: { width: 220 },
};

/** Exact live occupancynpv.com/blog/ Featured Blogs measurement, 2026-09-25, 1440 desktop. */
export const OCCUPANCY_LIVE_FOUNDER_CAROUSEL_V2: CarouselGeometryRects & {
  title_lines: number;
  title_words: number;
} = {
  slide: { width: 166.875 },
  card: { width: 166.875 },
  image: { width: 420 },
  body: { width: 131.28125 },
  title_lines: 6,
  title_words: 11,
};

export const OCCUPANCY_CAROUSEL_KNOWN_GOOD: CarouselGeometryRects = {
  slide: { width: 420 },
  card: { width: 420 },
  image: { width: 420 },
  body: { width: 420 },
};

function near(left: number, right: number, tolerance = 0.08): boolean {
  return Math.abs(left - right) / Math.max(left, right, 1) <= tolerance;
}

function fills(inner: number, outer: number, minimum = 0.95): boolean {
  return inner / Math.max(outer, 1) >= minimum;
}

export function evaluateCarouselCardGeometry(rects: CarouselGeometryRects): {
  gate: "CarouselCardGeometry";
  result: "PASS" | "FAIL";
  reasons: string[];
  ratios: { image_body: number; body_card: number; card_slide: number };
} {
  const reasons: string[] = [];
  const image_body = rects.body.width / Math.max(rects.image.width, 1);
  const body_card = rects.body.width / Math.max(rects.card.width, 1);
  const card_slide = rects.card.width / Math.max(rects.slide.width, 1);
  if (!near(rects.image.width, rects.body.width)) reasons.push("IMAGE_BODY_WIDTH_MISMATCH");
  if (!fills(rects.body.width, rects.card.width)) reasons.push("BODY_CARD_WIDTH_MISMATCH");
  if (!fills(rects.card.width, rects.slide.width)) reasons.push("CARD_SLIDE_WIDTH_MISMATCH");
  return {
    gate: "CarouselCardGeometry",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["CARD_GEOMETRY_ALIGNED"],
    ratios: { image_body, body_card, card_slide },
  };
}

export function evaluateCarouselTextCollapse(input: {
  image_width: number;
  body_width: number;
  card_width: number;
  title_lines: number;
  title_words: number;
}): {
  gate: "CarouselTextCollapse";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const bodyOverImage = input.body_width / Math.max(input.image_width, 1);
  const wordsPerLine = input.title_words / Math.max(input.title_lines, 1);
  const collapsed = bodyOverImage < 0.5 && input.title_lines >= 4 && wordsPerLine <= 3;
  return {
    gate: "CarouselTextCollapse",
    result: collapsed ? "FAIL" : "PASS",
    reasons: collapsed ? ["TITLE_WRAPS_BECAUSE_BODY_WIDTH_COLLAPSED"] : ["TEXT_WRAP_NORMAL"],
  };
}

export function evaluateCarouselCssContract(css: string): {
  gate: "CarouselCssContract";
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const compact = css.replace(/\s+/g, "");
  const reasons: string[] = [];
  if (!compact.includes('[data-carousel-density="single"].onpv-blog-featured-rail.onpv-blog-carousel__scroller')
    && !css.includes('[data-carousel-density="single"] .onpv-blog-featured-rail .onpv-blog-carousel__scroller')) {
    reasons.push("SINGLE_DENSITY_LOSES_TO_THREE_COLUMN_RAIL");
  }
  if (!compact.includes(".onpv-blog-featured-rail-card{") || !compact.includes("display:flex") || !compact.includes("flex-direction:column")) {
    reasons.push("CARD_NOT_COLUMN_FLEX");
  }
  if (!compact.includes(".onpv-blog-featured-body{") || !compact.includes("width:100%")) {
    reasons.push("BODY_WIDTH_CONTRACT_MISSING");
  }
  if (!compact.includes(".onpv-blog-featured-mediaimg") && !compact.includes(".onpv-blog-featured-media img") && !compact.includes(".onpv-blog-featured-mediaimg{")) {
    if (!css.includes(".onpv-blog-featured-media img")) reasons.push("IMAGE_WIDTH_CONTRACT_MISSING");
  }
  return {
    gate: "CarouselCssContract",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["SHARED_CARD_CONTRACT"],
  };
}
