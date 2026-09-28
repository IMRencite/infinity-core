import { composeKickstandsUpConcept, type ApparelComposition } from "./creative-trend-intelligence";
import { evaluateCommercialCreativeQC, CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD } from "./commercial-creative-qc";

export type ApparelDesignDecision = {
  concept_id: string;
  composition: ApparelComposition;
  garment_type: string;
  fit: string;
  fabric_weight: string;
  color: string;
  print_method: string;
  print_area: { front: string; back: string };
  commercial: ReturnType<typeof evaluateCommercialCreativeQC>;
  live_storefront_path: string;
  geometric_known_bad: "FAIL";
};

export function composeClubThrottleApparelDesign(): ApparelDesignDecision {
  const concept = composeKickstandsUpConcept();
  return {
    concept_id: concept.concept_id,
    composition: concept.composition,
    garment_type: "unisex short-sleeve heavyweight tee",
    fit: "classic unisex",
    fabric_weight: "5.4 oz/yd²",
    color: "black",
    print_method: "dtg",
    print_area: {
      front: "small chest mark inside 4x4 in",
      back: "large display type inside 12x16 in",
    },
    commercial: concept.commercial,
    live_storefront_path: "/products/kickstands-up-tee",
    geometric_known_bad: "FAIL",
  };
}

export function evaluateGeometricKnownBadCreative() {
  return evaluateCommercialCreativeQC({
    ...CLUB_THROTTLE_GEOMETRIC_KNOWN_BAD,
    finished_merchandise: true,
  });
}
