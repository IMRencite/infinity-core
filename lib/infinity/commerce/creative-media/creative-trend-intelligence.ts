import { evaluateCommercialCreativeQC } from "./commercial-creative-qc";

export type TrendSignal = {
  signal_id: string;
  pattern: string;
  why_it_works: string;
  category: string;
  source: "CATEGORY_TREND" | "COMMUNITY" | "SEARCH" | "SUGGEST_A_DESIGN" | "BRAND_TRUTH";
};

export type ApparelComposition = {
  placement: "SMALL_FRONT_CHEST" | "LARGE_FRONT" | "SMALL_FRONT_LARGE_BACK" | "LARGE_BACK";
  garment: "heavyweight_tee";
  print_method: "dtg";
  front?: string;
  back?: string;
};

export type ClubThrottleConcept = {
  concept_id: string;
  title: string;
  story: string;
  trend_ids: string[];
  composition: ApparelComposition;
  artwork_svg: string;
  ip_safe: true;
  commercial: ReturnType<typeof evaluateCommercialCreativeQC>;
};

export function clubThrottleTrendSignals(): TrendSignal[] {
  return [
    {
      signal_id: "trend:night-ride-type",
      pattern: "large back typography with a small chest mark",
      why_it_works: "Reads from a bike length away and still works off the bike.",
      category: "motorcycle streetwear",
      source: "CATEGORY_TREND",
    },
    {
      signal_id: "trend:garage-meet",
      pattern: "helmets on seats, bikes lined up, kickstands still down",
      why_it_works: "The social world before the ride, not a repair-shop uniform.",
      category: "garage-meet culture",
      source: "BRAND_TRUTH",
    },
  ];
}

export function composeKickstandsUpConcept(): ClubThrottleConcept {
  const artwork_svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2400" role="img" aria-label="Kickstands Up">
  <rect width="2000" height="2400" fill="#0b0d10"/>
  <text x="1000" y="420" text-anchor="middle" fill="#f4f1ea" font-size="96" font-family="Impact, sans-serif" letter-spacing="12">CLUB THROTTLE</text>
  <text x="1000" y="1280" text-anchor="middle" fill="#e11d2e" font-size="220" font-family="Impact, sans-serif">KICKSTANDS</text>
  <text x="1000" y="1520" text-anchor="middle" fill="#f4f1ea" font-size="220" font-family="Impact, sans-serif">UP</text>
  <text x="1000" y="1780" text-anchor="middle" fill="#9aa3ad" font-size="54" font-family="Georgia, serif">night rides · open road · after the meet</text>
</svg>`;
  const concept: Omit<ClubThrottleConcept, "commercial"> = {
    concept_id: "ct-concept-kickstands-up-v1",
    title: "Kickstands Up",
    story: "The moment the meet ends and the road starts. Small front Club Throttle mark. Large back type for the night ride.",
    trend_ids: clubThrottleTrendSignals().map((row) => row.signal_id),
    composition: {
      placement: "SMALL_FRONT_LARGE_BACK",
      garment: "heavyweight_tee",
      print_method: "dtg",
      front: "small chest Club Throttle wordmark",
      back: "KICKSTANDS UP display type",
    },
    artwork_svg,
    ip_safe: true,
  };
  return {
    ...concept,
    commercial: evaluateCommercialCreativeQC({
      svg: artwork_svg,
      title: concept.title,
      story: concept.story,
      placement: concept.composition.placement,
      brand: "Club Throttle",
      finished_merchandise: true,
    }),
  };
}
