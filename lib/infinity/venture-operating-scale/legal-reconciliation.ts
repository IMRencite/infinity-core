import {
  CANONICAL_IMR_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITY_OS_LABEL,
  CANONICAL_INFINITY_OS_URL,
  CANONICAL_PRIVACY_HREF,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_HREF,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_HREF,
  CANONICAL_TERMS_LABEL,
} from "@/lib/infinity/venture-build-orchestration/constants";
import { DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL } from "@/lib/infinity/market-validation-experiment/constants";

export type LegalSurfaceStatus = {
  path: string;
  url: string;
  http: number | "UNKNOWN";
  ok: boolean;
};

export type LegalReconciliationResult = {
  mission: "CRE_LEGAL_COMMERCIALIZATION_RECONCILIATION_V1";
  privacy: LegalSurfaceStatus;
  terms: LegalSurfaceStatus;
  sitemap: LegalSurfaceStatus;
  footerContract: "PASS" | "FAIL";
  nofollowDefault: "PASS" | "FAIL";
  surfacesPresent: boolean;
  configurationComplete: boolean;
  legalConfigurationState: "LEGAL_SURFACES_PRESENT" | "LEGAL_CONFIGURATION_REQUIRED" | "LEGAL_CONFIGURATION_COMPLETE";
  blockers: string[];
  artifactMutated: false;
  unknownFacts: string[];
};

const FACT_PATTERNS = [
  /registered agent/i,
  /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|boulevard|blvd|suite|ste)\b/i,
  /\b(delaware|wyoming|cayman)\s+(corporation|llc|ltd)\b/i,
  /we are a licensed/i,
  /pci[_ -]?dss certified/i,
];

function absolute(path: string): string {
  return new URL(path, `${DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL}/`).toString();
}

async function probe(fetchImpl: typeof fetch, path: string): Promise<LegalSurfaceStatus> {
  const url = absolute(path);
  try {
    const res = await fetchImpl(url, { method: "GET", redirect: "follow" });
    return { path, url, http: res.status, ok: res.ok };
  } catch {
    return { path, url, http: "UNKNOWN", ok: false };
  }
}

export function inspectLegalFactSafety(html: string): string[] {
  const unknown: string[] = ["legal_entity", "company_address", "jurisdiction"];
  if (FACT_PATTERNS.some((pattern) => pattern.test(html))) {
    return [...unknown, "unproven_specific_legal_claim_present"];
  }
  return unknown;
}

export function inspectFooterContract(html: string): { footer: "PASS" | "FAIL"; nofollow: "PASS" | "FAIL" } {
  const required = [
    CANONICAL_PRIVACY_LABEL,
    CANONICAL_TERMS_LABEL,
    CANONICAL_SITEMAP_LABEL,
    CANONICAL_INFINITY_OS_LABEL,
    CANONICAL_IMR_LABEL,
    CANONICAL_PRIVACY_HREF,
    CANONICAL_TERMS_HREF,
    CANONICAL_SITEMAP_HREF,
    CANONICAL_INFINITY_OS_URL,
    CANONICAL_IMR_URL,
  ];
  const footer = required.every((row) => html.includes(row)) ? "PASS" : "FAIL";
  const legalLinks = html.match(/<a[^>]+href="[^"]*(privacy-policy|terms-of-service|sitemap\.xml)[^"]*"[^>]*>/gi) ?? [];
  const nofollowDefault = legalLinks.some((row) => /rel=["'][^"']*nofollow/i.test(row)) ? "FAIL" : "PASS";
  return { footer, nofollow: nofollowDefault };
}

export async function executeCreLegalCommercializationReconciliation(input: {
  fetchImpl?: typeof fetch;
} = {}): Promise<LegalReconciliationResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const [privacy, terms, sitemap, home] = await Promise.all([
    probe(fetchImpl, CANONICAL_PRIVACY_HREF),
    probe(fetchImpl, CANONICAL_TERMS_HREF),
    probe(fetchImpl, CANONICAL_SITEMAP_HREF),
    fetchImpl(absolute("/"), { method: "GET", redirect: "follow" })
      .then(async (res) => ({ ok: res.ok, html: await res.text() }))
      .catch(() => ({ ok: false, html: "" })),
  ]);
  const privacyHtml = privacy.ok
    ? await fetchImpl(privacy.url).then((res) => res.text()).catch(() => "")
    : "";
  const termsHtml = terms.ok
    ? await fetchImpl(terms.url).then((res) => res.text()).catch(() => "")
    : "";
  const footer = inspectFooterContract(home.html);
  const unknownFacts = [
    ...new Set([...inspectLegalFactSafety(privacyHtml), ...inspectLegalFactSafety(termsHtml)]),
  ];
  const surfacesPresent = privacy.ok && terms.ok && sitemap.ok && footer.footer === "PASS";
  const configurationComplete = false;
  const blockers = [
    ...(privacy.ok ? [] : ["privacy_http_not_200"]),
    ...(terms.ok ? [] : ["terms_http_not_200"]),
    ...(sitemap.ok ? [] : ["sitemap_http_not_200"]),
    ...(footer.footer === "PASS" ? [] : ["footer_contract_incomplete"]),
    ...unknownFacts.map((row) => `unknown_fact:${row}`),
  ];
  return {
    mission: "CRE_LEGAL_COMMERCIALIZATION_RECONCILIATION_V1",
    privacy,
    terms,
    sitemap,
    footerContract: footer.footer,
    nofollowDefault: footer.nofollow,
    surfacesPresent,
    configurationComplete,
    legalConfigurationState: surfacesPresent ? "LEGAL_SURFACES_PRESENT" : "LEGAL_CONFIGURATION_REQUIRED",
    blockers,
    artifactMutated: false,
    unknownFacts,
  };
}
