import { CRE_CANDIDATE_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { UNCONFIGURED } from "@/lib/infinity/venture-operating-scale/types";

export const SECOND_VENTURE_FACTORY_PROOF_V1 = "SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1" as const;
export const SECOND_VENTURE_DIFFERENTIATION_GATE = "SecondVentureDifferentiationGate" as const;
export const MULTI_VENTURE_FACTORY_GENERALIZATION_GATE = "MultiVentureFactoryGeneralizationGate" as const;
export const SEARCH_PROVIDER_CONFIGURATION_REQUIRED = "SEARCH_PROVIDER_CONFIGURATION_REQUIRED" as const;

export const OCCUPANCYNPV_CANDIDATE_ID = CRE_CANDIDATE_ID;
export const OCCUPANCYNPV_VENTURE_ID = CRE_VENTURE_ID;

export const ASKREVIEW_CANDIDATE_ID = "f1336945-3350-4d08-921e-4dcb5bc77b8e" as const;
export const ASKREVIEW_VENTURE_ID = `candidate:${ASKREVIEW_CANDIDATE_ID}` as const;
export const ASKREVIEW_WORKING_NAME = "AskReview" as const;
export const ASKREVIEW_INTERNAL_NAME = "Affordable Google Review Automation & QR Utility" as const;
export const ASKREVIEW_PUBLIC_PATH = "/askreview" as const;
export const ASKREVIEW_APP_PATH = "/askreview/app" as const;
export const ASKREVIEW_LOGIN_PATH = "/askreview/app/login" as const;

export const ASKREVIEW_HYPOTHESIZED_MONTHLY_USD = 29 as const;
export const ASKREVIEW_PRICE_STATUS = "UNRESOLVED" as const;

export const ASKREVIEW_DOMAIN_CANDIDATES = [
  "askreview.com",
  "getaskreview.com",
  "askreview.app",
] as const;

export const DIFFERENTIATION_DIMENSIONS = [
  "industry",
  "customer_type",
  "purchase_behavior",
  "revenue_model",
  "backend_model",
  "fulfillment_type",
  "product_interaction",
  "data_model",
  "acquisition_channel",
  "operational_workflow",
] as const;

export type DifferentiationDimension = (typeof DIFFERENTIATION_DIMENSIONS)[number];

export const MIN_MATERIAL_DIFFERENCE_DIMENSIONS = 6 as const;

export const CALCULATOR_CLONE_PATTERN =
  /\b(npv|lease\s+comp|occupanc(y|ies)|calculator|estimat(e|ing)|takeoff|quoting generator|roi and payback|profit and fee calculator|scope creep estimator)\b/i;

export const CRE_ADJACENT_PATTERN =
  /\b(commercial real estate|tenant[- ]rep|lease comparison|independent landlord|proptech tenant|certificate of insurance|coi tracking|property manager)\b/i;

export const UNKNOWN = "UNKNOWN" as const;
export const UNCONFIGURED_VALUE = UNCONFIGURED;
