import { PUBLIC_VENTURE_SECTION_REGISTRY, SECTION_TYPES } from "./constants";
import type { SectionType } from "./types";

export type SectionRegistryEntry = {
  sectionType: SectionType;
  variants: string[];
  reusable: true;
  purpose: string;
};

const REGISTRY: Record<SectionType, SectionRegistryEntry> = {
  HERO: { sectionType: "HERO", variants: ["PRODUCT_SPLIT_HERO", "VISUAL_PRODUCT_HERO", "DATA_HERO", "EDITORIAL_HERO", "CONVERSION_HERO", "INTERACTIVE_DEMO_HERO"], reusable: true, purpose: "Communicate offer, audience, and product visually above the fold." },
  PRODUCT_PREVIEW: { sectionType: "PRODUCT_PREVIEW", variants: ["PRODUCT_UI_PREVIEW", "PRODUCT_DETAIL_SPLIT"], reusable: true, purpose: "Show the proposed workflow without claiming a finished product." },
  FEATURES: { sectionType: "FEATURES", variants: ["FEATURE_GRID", "PRODUCT_DETAIL_SPLIT", "USE_CASE_MATRIX"], reusable: true, purpose: "Name capabilities with visual variety, not only cards." },
  WORKFLOW: { sectionType: "WORKFLOW", variants: ["WORKFLOW_TRANSFORMATION", "BEFORE_AFTER_WORKFLOW", "PROCESS_TIMELINE"], reusable: true, purpose: "Show the before/after work pattern." },
  COMPARISON: { sectionType: "COMPARISON", variants: ["COMPARISON_TABLE", "DATA_VISUALIZATION"], reusable: true, purpose: "Compare options with data, not slogans." },
  PRICING: { sectionType: "PRICING", variants: ["PRICING_CARDS", "PRICING_HYPOTHESIS", "PRICING_COMPARISON", "PER_SEAT_VS_USAGE", "EARLY_ACCESS_PRICING"], reusable: true, purpose: "Test pricing hypotheses without fabricated discounts." },
  TRUST: { sectionType: "TRUST", variants: ["AUTHORITY_REFERENCES", "SECURITY_INFORMATION", "VALIDATION_DISCLOSURE", "METHOD_TRANSPARENCY", "PRODUCT_SCOPE", "WHAT_THIS_IS_NOT"], reusable: true, purpose: "Truthful trust only." },
  DISCLOSURE: { sectionType: "DISCLOSURE", variants: ["VALIDATION_DISCLOSURE", "METHOD_TRANSPARENCY"], reusable: true, purpose: "Early-access and legal honesty." },
  CTA: { sectionType: "CTA", variants: ["PRIMARY_CTA", "DUAL_CTA", "INLINE_CTA", "CTA_BAND"], reusable: true, purpose: "Repeat the conversion action near decisions." },
  FORM: { sectionType: "FORM", variants: ["PILOT_FORM", "WAITLIST_FORM", "DEMO_REQUEST", "EARLY_ACCESS_REQUEST"], reusable: true, purpose: "Collect qualified interest." },
  FAQ: { sectionType: "FAQ", variants: ["PROGRESSIVE_DISCLOSURE"], reusable: true, purpose: "Answer remaining objections." },
  EDUCATION: { sectionType: "EDUCATION", variants: ["METHOD_TRANSPARENCY"], reusable: true, purpose: "Explain method without a content library." },
  AUTHORITY_REFERENCES: { sectionType: "AUTHORITY_REFERENCES", variants: ["AUTHORITY_REFERENCES"], reusable: true, purpose: "Reader-facing non-competing sources where facts need grounding." },
  RELATED_CONTENT: { sectionType: "RELATED_CONTENT", variants: ["GRAPH_RELATED"], reusable: true, purpose: "Contextual next pages from the site knowledge graph." },
  FOOTER: { sectionType: "FOOTER", variants: ["CANONICAL_FOOTER"], reusable: true, purpose: "Canonical legal and Infinite OS attribution." },
};

export function publicVentureSectionRegistry(): typeof REGISTRY {
  void PUBLIC_VENTURE_SECTION_REGISTRY;
  void SECTION_TYPES;
  return REGISTRY;
}

export function sectionRegistryEntry(sectionType: SectionType): SectionRegistryEntry {
  return REGISTRY[sectionType];
}
