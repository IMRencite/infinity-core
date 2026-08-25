export const MONETIZATION_EVIDENCE_LEVELS = [
  "SUPPORTED",
  "UNPROVEN",
  "UNSUPPORTED",
  "UNKNOWN",
] as const;

export type MonetizationEvidenceLevel = (typeof MONETIZATION_EVIDENCE_LEVELS)[number];

export type MonetizationEvidenceLayers = {
  category: MonetizationEvidenceLevel;
  ideaSpecific: MonetizationEvidenceLevel;
  unitEconomics: MonetizationEvidenceLevel;
};

export function emptyMonetizationLayers(): MonetizationEvidenceLayers {
  return {
    category: "UNKNOWN",
    ideaSpecific: "UNKNOWN",
    unitEconomics: "UNKNOWN",
  };
}

/**
 * Category support must not collapse to monetization = 0 when idea-specific
 * and unit-economics evidence are still unknown.
 */
export function monetizationPotentialFromLayers(
  layers: MonetizationEvidenceLayers,
): { raw: number | null; state: "positive" | "negative" | "mixed" | "unknown" } {
  if (layers.category === "UNSUPPORTED" && layers.ideaSpecific === "UNSUPPORTED") {
    return { raw: 0.12, state: "negative" };
  }
  if (layers.category === "UNSUPPORTED" && layers.ideaSpecific === "UNKNOWN") {
    return { raw: 0.18, state: "negative" };
  }
  if (layers.ideaSpecific === "SUPPORTED" && layers.unitEconomics === "SUPPORTED") {
    return { raw: 0.82, state: "positive" };
  }
  if (layers.category === "SUPPORTED" && layers.ideaSpecific === "SUPPORTED") {
    return { raw: layers.unitEconomics === "UNKNOWN" ? 0.68 : 0.74, state: "positive" };
  }
  if (layers.category === "SUPPORTED" && (layers.ideaSpecific === "UNPROVEN" || layers.ideaSpecific === "UNKNOWN")) {
    return { raw: 0.52, state: "mixed" };
  }
  if (layers.ideaSpecific === "UNSUPPORTED") {
    return { raw: 0.22, state: "negative" };
  }
  if (layers.category === "UNKNOWN" && layers.ideaSpecific === "UNKNOWN" && layers.unitEconomics === "UNKNOWN") {
    return { raw: null, state: "unknown" };
  }
  return { raw: 0.4, state: "mixed" };
}

export function unitEconomicsKnown(layers: MonetizationEvidenceLayers): boolean {
  return layers.unitEconomics === "SUPPORTED" || layers.unitEconomics === "UNSUPPORTED";
}
