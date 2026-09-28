import type { ApparelCandidateClass } from "./apparel-sellability-gate";
import { evaluateApparelSellability } from "./apparel-sellability-gate";
import { evaluateApparelPrepressQC } from "./apparel-prepress-qc";

export type ApparelCritique = {
  would_a_rider_wear_this: "YES" | "NO" | "UNPROVEN";
  looks_like_streetwear: "YES" | "NO" | "UNPROVEN";
  credible_next_to_premium_brands: "YES" | "NO" | "UNPROVEN";
  feels_like_club_throttle: "YES" | "NO" | "UNPROVEN";
  motorcycle_culture_authentic: "YES" | "NO" | "UNPROVEN";
  designed_for_apparel: "YES" | "NO" | "UNPROVEN";
  avoids_generic_ai: "YES" | "NO" | "UNPROVEN";
  avoids_generic_pod: "YES" | "NO" | "UNPROVEN";
  motorcycle_believable: "YES" | "NO" | "UNPROVEN";
  readable_on_fabric: "YES" | "NO" | "UNPROVEN";
  distinctive_focal_point: "YES" | "NO" | "UNPROVEN";
  worth_paying_for: "YES" | "NO" | "UNPROVEN";
  class: ApparelCandidateClass;
  sellability: ReturnType<typeof evaluateApparelSellability>;
  prepress: ReturnType<typeof evaluateApparelPrepressQC>;
};

export function critiqueApparelCandidate(input: {
  title: string;
  art: string;
  placement?: "SMALL_FRONT_LARGE_BACK" | "LARGE_BACK";
  shirt_mockup?: boolean;
  watermark?: boolean;
  bytes?: number;
  width?: number;
  height?: number;
  provider_preview?: boolean;
}): ApparelCritique {
  const sellability = evaluateApparelSellability({
    title: input.title,
    art: input.art,
    placement: input.placement ?? "SMALL_FRONT_LARGE_BACK",
    provider_preview: input.provider_preview,
  });
  const prepress = evaluateApparelPrepressQC({
    bytes: input.bytes,
    width: input.width,
    height: input.height,
    watermark: input.watermark,
    shirt_mockup: input.shirt_mockup,
  });
  const blocked = sellability.result === "FAIL" || input.shirt_mockup || input.watermark;
  const classVerdict: ApparelCandidateClass = blocked
    ? "REJECT"
    : prepress.result === "FAIL"
      ? "REFINE"
      : input.provider_preview
        ? "COMMERCIAL_FINALIST"
        : "PROMISING";
  const answer = blocked ? "NO" : "UNPROVEN";
  return {
    would_a_rider_wear_this: answer,
    looks_like_streetwear: answer,
    credible_next_to_premium_brands: answer,
    feels_like_club_throttle: blocked ? "NO" : "UNPROVEN",
    motorcycle_culture_authentic: blocked ? "NO" : "UNPROVEN",
    designed_for_apparel: blocked ? "NO" : "UNPROVEN",
    avoids_generic_ai: /wallpaper|generic/i.test(input.art) ? "NO" : "UNPROVEN",
    avoids_generic_pod: /pod|text-only/i.test(input.art) ? "NO" : "UNPROVEN",
    motorcycle_believable: blocked ? "NO" : "UNPROVEN",
    readable_on_fabric: blocked ? "NO" : "UNPROVEN",
    distinctive_focal_point: blocked ? "NO" : "UNPROVEN",
    worth_paying_for: blocked ? "NO" : "UNPROVEN",
    class: classVerdict,
    sellability,
    prepress,
  };
}

export function evaluateCandidateDiversity(hashes: string[]): { result: "PASS" | "FAIL"; unique: number } {
  const unique = new Set(hashes.filter(Boolean)).size;
  return { result: unique >= Math.min(hashes.length, 6) && unique > 1 ? "PASS" : "FAIL", unique };
}
