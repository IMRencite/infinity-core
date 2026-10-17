/** Canonical product-detail content model for SEO/GEO-ready PDPs. */
export const VENTURE_PRODUCT_CONTENT_PROFILE_V1 = "VENTURE_PRODUCT_CONTENT_PROFILE_V1" as const;
export const PREMIUM_PRODUCT_DETAIL_PAGE_STANDARD_V1 = "PREMIUM_PRODUCT_DETAIL_PAGE_STANDARD_V1" as const;
export const PRODUCT_DETAIL_PAGE_PRELAUNCH_QC = "PRODUCT_DETAIL_PAGE_PRELAUNCH_QC" as const;
export const PRODUCT_CONTENT_READY_POLICY = "PRODUCT_CONTENT_READY_POLICY" as const;
export const PRODUCT_CONTENT_LEARNING_LOOP_V1 = "PRODUCT_CONTENT_LEARNING_LOOP_V1" as const;

/** Search/GEO foundation states — not ranking proof (see Phase 25). */
export const PRODUCT_SEARCH_FOUNDATION_QC = "PRODUCT_SEARCH_FOUNDATION_QC" as const;
export const PRODUCT_GEO_FOUNDATION_QC = "PRODUCT_GEO_FOUNDATION_QC" as const;

export type ProductFaqItem = { question: string; answer: string };

export type VentureProductContentProfile = {
  venture_id: string;
  product_id: string;
  sku: string;
  slug: string;
  canonical_product_name: string;
  product_type: string;
  design_name: string;
  /** Above-fold summary — conversion + entity clarity */
  product_summary: string;
  design_story: string;
  design_visual_elements: string[];
  design_theme: string;
  target_customer: string;
  primary_use_cases: string[];
  garment_profile_id: string;
  benefits: string[];
  differentiators: string[];
  /** Exposed colorways only — populated at QC/runtime from storefront truth */
  colorway_notes: string;
  where_to_wear: string[];
  care: string;
  structured_facts: Record<string, string>;
  faq: ProductFaqItem[];
  related_product_slugs: string[];
  related_editorial_paths: string[];
  related_collection_slug: string;
  seo_primary_topic: string;
  seo_secondary_topics: string[];
  entity_terms: string[];
  evidence_sources: string[];
};
