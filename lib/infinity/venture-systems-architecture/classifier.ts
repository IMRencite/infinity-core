import { VENTURE_OPERATING_MODELS, type VentureOperatingModel } from "./constants";
import type { VentureSystemsEvidence } from "./types";

function isOperatingModel(value: string): value is VentureOperatingModel {
  return (VENTURE_OPERATING_MODELS as readonly string[]).includes(value);
}

function textOf(evidence: VentureSystemsEvidence): string {
  return [
    evidence.operatingModel,
    evidence.productKind,
    evidence.ventureType,
    evidence.businessConcept,
    evidence.monetizationModelType,
    evidence.primaryConversion,
    ...(evidence.businessModelCandidates ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyVentureOperatingModel(evidence: VentureSystemsEvidence): VentureOperatingModel {
  if (evidence.operatingModel && isOperatingModel(evidence.operatingModel)) {
    return evidence.operatingModel;
  }

  const text = textOf(evidence);
  if (!text.trim()) return "AMBIGUOUS";

  if (/home contractor|contractor|plumber|electrician|hvac|roofing|landscap/.test(text)) {
    return "HOME_CONTRACTOR";
  }
  if (/local service|home service|request.?estimate/.test(text)) return "LOCAL_SERVICE";
  if (/marketplace|artist|collector|two[- ]sided/.test(text)) return "MARKETPLACE";
  if (/ai seo|seo platform|pages per month/.test(text)) return "SAAS";
  if (/\bsaas\b|subscription software|web application/.test(text)) return "SAAS";
  if (/e-?commerce|online store|physical product/.test(text)) return "ECOMMERCE";
  if (/lead generation|lead gen|directory|job board/.test(text)) return "LEAD_GENERATION";
  if (/digital product|downloadable|one-time download|template|course/.test(text)) return "DIGITAL_PRODUCT";
  if (/service platform|service.product hybrid/.test(text)) return "SERVICE_PLATFORM";
  if (/content site|newsletter|media business|blog network/.test(text)) return "CONTENT_BUSINESS";

  if (evidence.hasDistinctBuyers && evidence.hasDistinctSellers) return "MARKETPLACE";
  if (evidence.hasLocalServiceArea) return "LOCAL_SERVICE";

  return "AMBIGUOUS";
}
