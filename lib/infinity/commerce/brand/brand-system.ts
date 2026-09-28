export type VentureBrandTruth = {
  venture_id: string;
  brand_name: string;
  venture_purpose: string;
  problem_solved: string;
  customer_truth: string;
  audience: string;
  use_context: string;
  business_model: string;
  offer_truth: string;
  functional_value: string;
  emotional_value: string;
  cultural_context: string;
  environment: string;
  venture_origin: string;
  brand_relationship_to_IMR: string;
  claims_allowed: string[];
  claims_disallowed: string[];
  proof_requirements: string[];
  brand_truth_version: string;
  source_evidence: string[];
};

export type BrandVision = {
  brand_vision: string;
  desired_customer_feeling: string;
  worldview: string;
  cultural_territory: string;
  visual_world: string;
  emotional_tone: string;
  lifestyle_context: string;
  aspirational_identity: string;
  brand_energy: string;
  experience_principles: string[];
  future_position: string;
};

export type BrandEnvironment = {
  type: string;
  places: string[];
  activities: string[];
  objects: string[];
  materials: string[];
  lighting: string[];
  colors: string[];
  textures: string[];
  cultural_signals: string[];
  customer_context: string[];
  product_context: string[];
};

export type BrandConceptTerritory = {
  id: string;
  venture_id: string;
  name: string;
  description: string;
  why_it_fits_brand_truth: string;
  visual_motifs: string[];
  copy_motifs: string[];
  product_fit: string[];
  content_fit: string[];
  audience_fit: string;
  risk_notes: string[];
  performance_state: "UNPROVEN";
  status: "ACTIVE" | "CANDIDATE";
};

export type BrandVoice = {
  voice: string;
  tone: string;
  energy: string;
  sentence_style: string;
  humor_policy: string;
  sales_style: string;
  customer_service_style: string;
  editorial_style: string;
  visual_personality: string;
};

export type BrandBoundaries = {
  visual_avoid: string[];
  tone_avoid: string[];
  content_avoid: string[];
  product_avoid: string[];
  cultural_misfit: string[];
  prohibited_claims: string[];
  brand_dilution_risk: string[];
};

export type BrandProfile<TVenture extends string = string> = {
  venture_id: TVenture;
  status: "EXISTING_APPROVED_BRAND" | "GENERATED";
  generate_replacement_logo: boolean;
  public_name: string;
  wordmark: string;
  primary_logo_path: string;
  favicon_path: string;
  og_image_path: string;
  relationship: string;
  relationship_imros: string;
  relationship_imr: string;
  visual_direction: string;
  colors: {
    ink: string;
    paper: string;
    canvas: string;
    mist: string;
    charcoal: string;
    accent: string;
    night: string;
    muted: string;
  };
  truth: VentureBrandTruth;
  vision: BrandVision;
  environment: BrandEnvironment;
  territories: BrandConceptTerritory[];
  voice: BrandVoice;
  boundaries: BrandBoundaries;
};
