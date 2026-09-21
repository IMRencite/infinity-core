import { CANONICAL_IMR_LABEL, CANONICAL_IMR_URL } from "@/lib/infinity/venture-build-orchestration/constants";
import { CRE_VENTURE_NAME } from "./constants";
import type { VentureOperationalRecord } from "./types";

export const REQUIRED_LEGAL_FACTS = [
  "legal_entity",
  "company_address",
  "jurisdiction",
  "support_email",
  "privacy_operator",
  "terms_operator",
] as const;
export type RequiredLegalFact = (typeof REQUIRED_LEGAL_FACTS)[number];

export const FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS = {
  legal_entity: "Infinite Media Resources LLC",
  company_address: "1896 Coventry Dr, Brunswick, OH 44212, United States",
  jurisdiction: "Ohio, United States",
  support_email: "infinitemediaresources@gmail.com",
  privacy_operator: "Infinite Media Resources LLC",
  terms_operator: "Infinite Media Resources LLC",
  product_brand: "OccupancyNPV",
  production_url: "https://occupancynpv.com",
  founder_confirmed: true,
} as const;

export type CanonicalLegalFactSearch = {
  legalEntity: string | "UNKNOWN";
  companyAddress: string | "UNKNOWN";
  jurisdiction: string | "UNKNOWN";
  supportEmail: string | "UNKNOWN";
  privacyOperator: string | "UNKNOWN";
  termsOperator: string | "UNKNOWN";
  configuration: "COMPLETE" | "FOUNDER_CONFIGURATION_REQUIRED";
  missingFields: RequiredLegalFact[];
  founderConfigurationRequired: "FOUNDER_LEGAL_CONFIGURATION_REQUIRED" | "NONE";
  invented: false;
  sourcesInspected: string[];
};

export type LegalConfigurationGateResult = {
  gate: "LegalConfigurationGate";
  result: "PASS" | "FAIL";
  fields: Record<RequiredLegalFact, "PASS" | "FAIL">;
  missingFields: RequiredLegalFact[];
};

const BRAND_OR_VENTURE = /venture|validation|occupancynpv|infinity os|\bimr\b|^imr$|^by imr$/i;
const PROVEN_ENTITY = /^(?!UNCONFIGURED|UNKNOWN|By IMR|IMR$)[A-Za-z0-9].{2,}$/;
const PROVEN_ADDRESS =
  /\b\d{1,5}\s+\w+.+\b(street|st|avenue|ave|boulevard|blvd|suite|ste|road|rd|drive|dr)\b/i;
const PROVEN_US_STATE =
  "alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|district of columbia|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming";
const PROVEN_JURISDICTION = new RegExp(
  `\\b(${PROVEN_US_STATE}),\\s+united states\\b|\\bstate of (${PROVEN_US_STATE})(?:,\\s+united states)?\\b|\\b(delaware|wyoming|nevada|california|new york|united states|usa)\\b.+\\b(llc|inc|corporation|ltd|limited)\\b|\\b(delaware|wyoming)\\s+(llc|corporation)\\b`,
  "i",
);
const PROVEN_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function searchCanonicalLegalFacts(input: {
  record?: VentureOperationalRecord | null;
  extraRecords?: Array<Record<string, unknown>>;
} = {}): CanonicalLegalFactSearch {
  const sourcesInspected = [
    "VentureOperationalRecord",
    "CANONICAL_IMR_LABEL",
    "CANONICAL_IMR_URL",
    "CRE_VENTURE_NAME",
    "canonical IMR/venture constants",
  ];
  const candidates: Array<Record<string, unknown>> = [
    ...(input.record ? [input.record as unknown as Record<string, unknown>] : []),
    ...(input.extraRecords ?? []),
    {
      brand_label: CANONICAL_IMR_LABEL,
      brand_url: CANONICAL_IMR_URL,
      venture_name: CRE_VENTURE_NAME,
    },
  ];
  let legalEntity: string | "UNKNOWN" = "UNKNOWN";
  let companyAddress: string | "UNKNOWN" = "UNKNOWN";
  let jurisdiction: string | "UNKNOWN" = "UNKNOWN";
  let supportEmail: string | "UNKNOWN" = "UNKNOWN";
  let privacyOperator: string | "UNKNOWN" = "UNKNOWN";
  let termsOperator: string | "UNKNOWN" = "UNKNOWN";
  for (const row of candidates) {
    const entity = stringField(row, ["legal_entity", "legalEntity", "registered_entity", "company_legal_name"]);
    const address = stringField(row, ["company_address", "companyAddress", "registered_address", "principal_address"]);
    const place = stringField(row, ["jurisdiction", "governing_law", "formation_jurisdiction"]);
    const email = stringField(row, ["support_email", "supportEmail", "contact_email"]);
    const privacy = stringField(row, ["privacy_operator", "privacyOperator"]);
    const terms = stringField(row, ["terms_operator", "termsOperator"]);
    if (legalEntity === "UNKNOWN" && isProvenLegalName(entity)) legalEntity = entity!;
    if (companyAddress === "UNKNOWN" && address && PROVEN_ADDRESS.test(address)) companyAddress = address;
    if (jurisdiction === "UNKNOWN" && place && PROVEN_JURISDICTION.test(place)) jurisdiction = place;
    if (supportEmail === "UNKNOWN" && isProvenSupportEmail(email)) supportEmail = email!;
    if (privacyOperator === "UNKNOWN" && isProvenLegalName(privacy)) privacyOperator = privacy!;
    if (termsOperator === "UNKNOWN" && isProvenLegalName(terms)) termsOperator = terms!;
  }
  const values: Record<RequiredLegalFact, string | "UNKNOWN"> = {
    legal_entity: legalEntity,
    company_address: companyAddress,
    jurisdiction,
    support_email: supportEmail,
    privacy_operator: privacyOperator,
    terms_operator: termsOperator,
  };
  const missingFields = REQUIRED_LEGAL_FACTS.filter((field) => values[field] === "UNKNOWN");
  return {
    legalEntity,
    companyAddress,
    jurisdiction,
    supportEmail,
    privacyOperator,
    termsOperator,
    configuration: missingFields.length === 0 ? "COMPLETE" : "FOUNDER_CONFIGURATION_REQUIRED",
    missingFields,
    founderConfigurationRequired: missingFields.length === 0 ? "NONE" : "FOUNDER_LEGAL_CONFIGURATION_REQUIRED",
    invented: false,
    sourcesInspected,
  };
}

export function evaluateLegalConfigurationGate(input: {
  record?: VentureOperationalRecord | null;
  extraRecords?: Array<Record<string, unknown>>;
} = {}): LegalConfigurationGateResult {
  const facts = searchCanonicalLegalFacts(input);
  const fields = {
    legal_entity: facts.legalEntity === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
    company_address: facts.companyAddress === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
    jurisdiction: facts.jurisdiction === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
    support_email: facts.supportEmail === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
    privacy_operator: facts.privacyOperator === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
    terms_operator: facts.termsOperator === "UNKNOWN" ? ("FAIL" as const) : ("PASS" as const),
  };
  return {
    gate: "LegalConfigurationGate",
    result: facts.configuration === "COMPLETE" ? "PASS" : "FAIL",
    fields,
    missingFields: facts.missingFields,
  };
}

function isProvenLegalName(value: string | null): value is string {
  return Boolean(value && PROVEN_ENTITY.test(value) && !BRAND_OR_VENTURE.test(value));
}

function isProvenSupportEmail(value: string | null): value is string {
  return Boolean(value && PROVEN_EMAIL.test(value) && !/example\.com$/i.test(value));
}

function stringField(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim() && value !== "UNCONFIGURED") return value.trim();
  }
  return null;
}
