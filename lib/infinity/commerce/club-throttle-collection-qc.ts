import type { ClubThrottleDesignTaxonomy, MotorcycleArchetype, MerchDesignMode } from "./club-throttle-merch-taxonomy";

export type NamedMerchGate = {
  gate: string;
  result: "PASS" | "FAIL" | "WARN" | "PARTIAL";
  reasons: string[];
};

const DIVERSITY_BUCKETS: { key: string; archetypes: MotorcycleArchetype[]; modes: MerchDesignMode[] }[] = [
  { key: "CRUISER_BAGGER", archetypes: ["CRUISER", "BAGGER"], modes: [] },
  { key: "SPORT_BIKE", archetypes: ["SPORT_BIKE", "SUPERSPORT", "TRACK_PERFORMANCE"], modes: [] },
  { key: "NAKED_STREET", archetypes: ["NAKED_STREETFIGHTER"], modes: [] },
  { key: "CAFE_RETRO", archetypes: ["CAFE_RETRO"], modes: [] },
  { key: "ADVENTURE_TOURING", archetypes: ["ADVENTURE", "TOURING", "DUAL_SPORT"], modes: [] },
  { key: "GARAGE_BUILD", archetypes: ["CUSTOM_BUILD"], modes: ["ILLUSTRATION_FIRST"] },
  { key: "SOCIAL_BIKE_NIGHT", archetypes: ["GENERAL_RIDER"], modes: [] },
  { key: "PHRASE_TYPOGRAPHY", archetypes: [], modes: ["PHRASE_FIRST", "TYPOGRAPHY_FIRST", "MINIMAL_MARK"] },
];

function overlapsArchetype(tax: ClubThrottleDesignTaxonomy, archetypes: MotorcycleArchetype[]): boolean {
  return tax.motorcycle_archetypes.some((a) => archetypes.includes(a));
}

function overlapsMode(tax: ClubThrottleDesignTaxonomy, modes: MerchDesignMode[]): boolean {
  return modes.length === 0 ? false : modes.includes(tax.design_mode);
}

export function evaluateClubThrottleCollectionDiversityQc(
  collection: ClubThrottleDesignTaxonomy[],
): NamedMerchGate {
  const covered = new Set<string>();
  for (const tax of collection) {
    for (const bucket of DIVERSITY_BUCKETS) {
      if (overlapsArchetype(tax, bucket.archetypes) || overlapsMode(tax, bucket.modes)) {
        covered.add(bucket.key);
      }
    }
  }
  const reasons: string[] = [];
  if (collection.length >= 2 && covered.size < 2) reasons.push("COLLECTION_TOO_NARROW");
  if (collection.length >= 4 && covered.size < 3) reasons.push("INSUFFICIENT_ARCHETYPE_SPREAD");
  if (collection.length >= 3) {
    const archetypeCounts = new Map<string, number>();
    for (const tax of collection) {
      for (const a of tax.motorcycle_archetypes) {
        archetypeCounts.set(a, (archetypeCounts.get(a) ?? 0) + 1);
      }
    }
    const maxShare = Math.max(...archetypeCounts.values(), 0) / collection.length;
    if (maxShare >= 0.75) reasons.push("SINGLE_ARCHETYPE_DOMINANCE");
  }
  return {
    gate: "CLUB_THROTTLE_COLLECTION_DIVERSITY_QC",
    result: reasons.length ? "FAIL" : collection.length ? "PASS" : "WARN",
    reasons,
  };
}

function paletteSignature(tax: ClubThrottleDesignTaxonomy): string {
  return `${tax.visual_style}:${tax.placement}:${tax.motorcycle_archetypes.slice().sort().join("+")}`;
}

export function evaluateClubThrottleCollectionSimilarityQc(input: {
  candidate: ClubThrottleDesignTaxonomy;
  existing: ClubThrottleDesignTaxonomy[];
}): NamedMerchGate {
  const reasons: string[] = [];
  const sig = paletteSignature(input.candidate);
  for (const row of input.existing) {
    if (row.concept_id === input.candidate.concept_id) continue;
    const other = paletteSignature(row);
    if (sig === other) reasons.push(`DUPLICATE_SIGNATURE:${row.concept_id}`);
    const sharedArchetypes = row.motorcycle_archetypes.filter((a) => input.candidate.motorcycle_archetypes.includes(a));
    const sameStyle = row.visual_style === input.candidate.visual_style;
    const samePlacement = row.placement === input.candidate.placement;
    const lotLineDuplicate =
      row.concept_id === "ct-lot-line-1"
      && sharedArchetypes.length > 0
      && sameStyle
      && samePlacement
      && row.visual_style === "CINEMATIC_PAINTERLY";
    const peerDuplicate =
      row.concept_id !== "ct-lot-line-1"
      && row.concept_id !== input.candidate.concept_id
      && sharedArchetypes.length > 0
      && sameStyle
      && samePlacement
      && row.visual_style === input.candidate.visual_style;
    if (lotLineDuplicate || peerDuplicate) {
      reasons.push(`REPEATED_ARCHETYPE_STYLE_PLACEMENT:${row.concept_id}`);
    }
  }
  return {
    gate: "CLUB_THROTTLE_COLLECTION_SIMILARITY_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateConceptDistinctnessQc(input: {
  brief_id: string;
  brief_hook: string;
  existing_hooks: string[];
}): NamedMerchGate {
  const norm = input.brief_hook.toLowerCase().replace(/\s+/g, " ").trim();
  const reasons: string[] = [];
  for (const hook of input.existing_hooks) {
    const other = hook.toLowerCase().replace(/\s+/g, " ").trim();
    if (norm === other) reasons.push("DUPLICATE_HOOK");
    if (norm.length > 24 && other.includes(norm.slice(0, 32))) reasons.push("NEAR_DUPLICATE_HOOK");
  }
  return {
    gate: "CONCEPT_DISTINCTNESS_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluateMarketSignalLineageQc(input: {
  market_signal_ids: string[];
  copied_phrase: string | null;
  copied_composition_reference: string | null;
}): NamedMerchGate {
  const reasons: string[] = [];
  if (input.copied_phrase) reasons.push("COPIED_PHRASE");
  if (input.copied_composition_reference) reasons.push("COPIED_COMPOSITION_REFERENCE");
  if (!input.market_signal_ids.length) reasons.push("NO_MARKET_SIGNAL_LINEAGE");
  return {
    gate: "MARKET_SIGNAL_LINEAGE_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function evaluatePhraseOriginalityQc(input: {
  phrase: string;
  blocked_substrings: string[];
}): NamedMerchGate {
  const lower = input.phrase.toLowerCase();
  const reasons = input.blocked_substrings.filter((s) => lower.includes(s.toLowerCase()));
  return {
    gate: "PHRASE_ORIGINALITY_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.map((r) => `BLOCKED_FRAGMENT:${r}`),
  };
}

export function evaluateTrademarkRiskQc(input: { phrase: string; brand_tokens: string[] }): NamedMerchGate {
  const lower = input.phrase.toLowerCase();
  const hits = input.brand_tokens.filter((t) => lower.includes(t.toLowerCase()));
  return {
    gate: "TRADEMARK_RISK_QC",
    result: hits.length ? "FAIL" : "PASS",
    reasons: hits.map((h) => `BRAND_TOKEN:${h}`),
  };
}

export function evaluateCulturalRelevanceQc(input: {
  generic_biker_cliche_only: boolean;
  has_rider_identity: boolean;
}): NamedMerchGate {
  const reasons: string[] = [];
  if (input.generic_biker_cliche_only) reasons.push("GENERIC_BIKER_CLICHE_ONLY");
  if (!input.has_rider_identity) reasons.push("NO_RIDER_IDENTITY");
  return {
    gate: "CULTURAL_RELEVANCE_QC",
    result: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}
