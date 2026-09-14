import type { VentureEconomicsIntelligenceRecord } from "@/lib/infinity/venture-economics/types";

export type HqInspectionIdentityRef = {
  entityType: "OPPORTUNITY_CANDIDATE" | "VENTURE";
  entityId: string;
};

export const HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT = "HQVentureInspectionContextContract" as const;
export const HQ_VENTURE_INSPECTION_CONTEXT_GATE = "HQVentureInspectionContextGate" as const;
export const HQ_CANONICAL_VENTURE_IDENTITY_GATE = "HQCanonicalVentureIdentityGate" as const;
export const HQ_VENTURE_LIFECYCLE_PROJECTION_GATE = "HQVentureLifecycleProjectionGate" as const;
export const PARTIAL_ECONOMICS_PRESENTATION_CONTRACT = "PartialEconomicsPresentationContract" as const;
export const RENDERED_PROFIT_LAB_COMPLETENESS_GATE = "RenderedProfitLabCompletenessGate" as const;
export const CANONICAL_PROJECTION_FALLBACK_MASKING_GATE = "CanonicalProjectionFallbackMaskingGate" as const;

export const OCCUPANCYNPV_INSPECTION_TITLE =
  "Commercial Real Estate (CRE) Lease Comparison & NPV Calculator" as const;
export const ASKREVIEW_INSPECTION_LIFECYCLE = "SELECTION_UNDER_REVIEW" as const;
export const ASKREVIEW_PRODUCTION_STATE = "PRODUCTION PAUSED" as const;

export const PROJECTION_ERROR = "PROJECTION ERROR" as const;
export const CANONICAL_ECONOMICS_UNAVAILABLE = "CANONICAL ECONOMICS UNAVAILABLE" as const;
export const GENERIC_AUTONOMOUS_VENTURE_CYCLE = "Autonomous Venture Cycle" as const;
export const GENERIC_NO_RELIABLE_ESTIMATE = "No reliable estimate yet" as const;

export type HqInspectionIdentity = {
  contract: typeof HQ_VENTURE_INSPECTION_CONTEXT_CONTRACT;
  inspect: HqInspectionIdentityRef | null;
  routeEntityType: HqInspectionIdentityRef["entityType"] | null;
  routeEntityId: string | null;
  candidateId: string | null;
  canonicalVentureId: string | null;
  ventureName: string | null;
  productTitle: string | null;
  lifecycle: string | null;
  economicsVentureId: string | null;
  mappedFromCandidate: boolean;
  source: "canonical_venture" | "unmapped_candidate" | "none";
};

export type HqInspectionSurfaceIds = {
  route: string | null;
  header: string | null;
  selector: string | null;
  intelligence: string | null;
  economics: string | null;
  evidence: string | null;
  systemView: string | null;
};

export type RenderedHqInspectionProjection = {
  routeVentureId: string | null;
  headerVentureId: string | null;
  headerName: string | null;
  selectorVentureId: string | null;
  selectorName: string | null;
  intelligenceVentureId: string | null;
  economicsVentureId: string | null;
  evidenceVentureId: string | null;
  systemViewVentureId: string | null;
  lifecycle: string | null;
  customer: string | null;
  problem: string | null;
  solution: string | null;
  businessModel: string | null;
  monetization: string | null;
  currentPrice: string | null;
  cac: string | null;
  ltv: string | null;
  contribution: string | null;
  payback: string | null;
  breakEven: string | null;
  competitors: string[];
  substitutes: string[];
  pricingBenchmarks: string[];
  scenarios: string[];
  unknowns: string[];
  evidence: string[];
  confidence: string | null;
  genericFallback: boolean;
  projectionError: string | null;
  canonicalEconomicsExisted: boolean;
};

export type PartialEconomicsPresentation = {
  contract: typeof PARTIAL_ECONOMICS_PRESENTATION_CONTRACT;
  knownPricingVisible: boolean;
  knownMonetizationVisible: boolean;
  unknownCacPreserved: boolean;
  unknownLtvPreserved: boolean;
  collapsedToGenericUnknown: boolean;
};

export type NamedIdentityGateResult = {
  gate: string;
  result: "PASS" | "FAIL";
  reasons: string[];
};

export type CanonicalEconomicsOverlayInput = {
  economics: VentureEconomicsIntelligenceRecord | null;
  lifecycle: string | null;
  productTitle?: string | null;
  productionPaused?: boolean;
  expectedCanonical?: boolean;
};

export type ProjectedInspectionLifecycle = "PUBLICLY_LAUNCHED" | typeof ASKREVIEW_INSPECTION_LIFECYCLE | string;
