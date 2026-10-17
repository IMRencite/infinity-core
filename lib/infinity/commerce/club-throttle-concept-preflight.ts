import {
  evaluateClubThrottleCollectionDiversityQc,
  evaluateClubThrottleCollectionSimilarityQc,
  evaluateConceptDistinctnessQc,
  evaluateCulturalRelevanceQc,
  evaluateMarketSignalLineageQc,
  evaluatePhraseOriginalityQc,
  evaluateTrademarkRiskQc,
  type NamedMerchGate,
} from "./club-throttle-collection-qc";
import {
  CT_LOT_LINE_1_TAXONOMY,
  type ClubThrottleDesignTaxonomy,
  type MerchDesignMode,
  type MerchPlacementPattern,
  type MerchVisualStyle,
  type MotorcycleArchetype,
} from "./club-throttle-merch-taxonomy";

export type ClubThrottleConceptBrief = {
  concept_id: string;
  name: string;
  target_rider: string;
  motorcycle_archetypes: MotorcycleArchetype[];
  design_mode: MerchDesignMode;
  visual_style?: MerchVisualStyle;
  placement_pattern?: MerchPlacementPattern;
  front_back_approach: string;
  market_signals: string[];
  phrase?: string | null;
  commercial_hook: string;
  differs_from_lot_line: string;
};

const OEM_TOKENS = ["honda", "yamaha", "kawasaki", "suzuki", "ducati", "bmw", "harley-davidson", "harley davidson"];

function briefToTaxonomy(brief: ClubThrottleConceptBrief): ClubThrottleDesignTaxonomy {
  const placement: MerchPlacementPattern =
    brief.placement_pattern ??
    (/front.?only|chest.?only|chest-only/i.test(brief.front_back_approach)
      ? "FRONT_ONLY"
      : /back.?only/i.test(brief.front_back_approach)
        ? "BACK_ONLY"
        : /phrase|typography|type only/i.test(brief.design_mode)
          ? "BACK_ONLY"
          : "LARGE_BACK_SMALL_FRONT");
  const visual_style: MerchVisualStyle =
    brief.visual_style ??
    (brief.design_mode === "PHRASE_FIRST" || brief.design_mode === "TYPOGRAPHY_FIRST"
      ? "MINIMAL_TYPE"
      : /technical|line|macro|roost|abstract light/i.test(brief.differs_from_lot_line)
        ? "CLEAN_TECHNICAL"
        : brief.design_mode === "MINIMAL_MARK"
          ? "MINIMAL_TYPE"
          : "CINEMATIC_PAINTERLY");
  return {
    concept_id: brief.concept_id,
    motorcycle_archetypes: brief.motorcycle_archetypes,
    design_mode: brief.design_mode,
    visual_style,
    placement,
    audience: [brief.target_rider],
    market_signals: brief.market_signals,
    originality_lineage: ["market_aggregate_only", brief.differs_from_lot_line],
  };
}

export function preflightClubThrottleConceptBrief(input: {
  brief: ClubThrottleConceptBrief;
  existing: ClubThrottleDesignTaxonomy[];
  existing_hooks: string[];
  blocked_phrase_fragments?: string[];
}): Record<string, NamedMerchGate> {
  const tax = briefToTaxonomy(input.brief);
  const gates: Record<string, NamedMerchGate> = {};
  gates.MARKET_SIGNAL_LINEAGE_QC = evaluateMarketSignalLineageQc({
    market_signal_ids: input.brief.market_signals,
    copied_phrase: null,
    copied_composition_reference: null,
  });
  gates.CLUB_THROTTLE_COLLECTION_SIMILARITY_QC = evaluateClubThrottleCollectionSimilarityQc({
    candidate: tax,
    existing: input.existing,
  });
  gates.CONCEPT_DISTINCTNESS_QC = evaluateConceptDistinctnessQc({
    brief_id: input.brief.concept_id,
    brief_hook: input.brief.commercial_hook,
    existing_hooks: input.existing_hooks,
  });
  gates.CULTURAL_RELEVANCE_QC = evaluateCulturalRelevanceQc({
    generic_biker_cliche_only: /\bskull\b|\bflames?\b|fake mc patch/i.test(input.brief.commercial_hook)
      && !/not skull|without skull|non-skull|machine detail/i.test(input.brief.commercial_hook),
    has_rider_identity: Boolean(input.brief.target_rider),
  });
  if (input.brief.phrase) {
    gates.PHRASE_ORIGINALITY_QC = evaluatePhraseOriginalityQc({
      phrase: input.brief.phrase,
      blocked_substrings: input.blocked_phrase_fragments ?? ["0 days", "ride or die", "live to ride"],
    });
    gates.TRADEMARK_RISK_QC = evaluateTrademarkRiskQc({ phrase: input.brief.phrase, brand_tokens: OEM_TOKENS });
  }
  return gates;
}

export function preflightClubThrottleConceptQueue(briefs: ClubThrottleConceptBrief[]): {
  collection_diversity: NamedMerchGate;
  concepts: { concept_id: string; gates: Record<string, NamedMerchGate>; ready: boolean }[];
} {
  const existing = [CT_LOT_LINE_1_TAXONOMY];
  const hooks: string[] = [];
  const concepts = briefs.map((brief) => {
    const gates = preflightClubThrottleConceptBrief({ brief, existing: [...existing, ...briefs.map(briefToTaxonomy)], existing_hooks: hooks });
    hooks.push(brief.commercial_hook);
    const ready = Object.values(gates).every((g) => g.result === "PASS");
    return { concept_id: brief.concept_id, gates, ready };
  });
  const collection_diversity = evaluateClubThrottleCollectionDiversityQc([
    CT_LOT_LINE_1_TAXONOMY,
    ...briefs.map(briefToTaxonomy),
  ]);
  return { collection_diversity, concepts };
}

export function projectMerchandiseFounderReportRow(input: {
  concept_id: string;
  name: string;
  taxonomy: ClubThrottleDesignTaxonomy;
  market_signals: string[];
  founder_status: string;
  sellability?: string | null;
  creative_result?: string | null;
}): Record<string, string | string[] | null> {
  return {
    concept_id: input.concept_id,
    name: input.name,
    collection_category: input.taxonomy.visual_style,
    bike_archetype: input.taxonomy.motorcycle_archetypes,
    design_mode: input.taxonomy.design_mode,
    market_signal: input.market_signals,
    novelty_vs_lot_line: input.taxonomy.originality_lineage.join("; "),
    creative_result: input.creative_result ?? "NOT_GENERATED",
    sellability: input.sellability ?? "NOT_RUN",
    founder_status: input.founder_status,
  };
}
