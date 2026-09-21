import { CloudflareRegistrarAdapter } from "@/lib/infinity/commercialization/providers/cloudflare/registrar-adapter";
import { ASKREVIEW_DOMAIN_CANDIDATES } from "@/lib/infinity/second-venture-factory/constants";

export const ASKREVIEW_DOMAIN_RESEARCH_CANDIDATES = [
  ...ASKREVIEW_DOMAIN_CANDIDATES,
] as const;

export type AskReviewDomainRow = {
  domain: string;
  tld: string;
  available: "YES" | "NO" | "UNKNOWN";
  premium: "YES" | "NO" | "UNKNOWN";
  registration: number | "UNKNOWN";
  renewal: number | "UNKNOWN";
  brandQuality: string;
  concern: string;
};

function scoreDomain(domain: string): { brandQuality: string; concern: string } {
  if (domain === "askreview.com") {
    return { brandQuality: "Highest — exact product name, .com trust.", concern: "Generic two-word mark; trademark clearance not performed." };
  }
  if (domain === "getaskreview.com") {
    return { brandQuality: "Clear call-to-action, weaker than exact .com.", concern: "Longer to say; trademark clearance not performed." };
  }
  if (domain === "askreview.app") {
    return { brandQuality: "Product-fit TLD, less formal for local businesses.", concern: ".app can imply a consumer app; trademark clearance not performed." };
  }
  return { brandQuality: "Unscored", concern: "Trademark clearance not performed." };
}

export async function researchAskReviewDomains(fetchImpl?: typeof fetch): Promise<{
  provider: string;
  verification: "VERIFIED" | "DOMAIN_PROVIDER_READ_VERIFICATION_REQUIRED";
  rows: AskReviewDomainRow[];
  recommendedDomain: string | "NONE";
  expectedFirstYearCost: number | "UNKNOWN";
  purchasePerformed: false;
  safeError: string | null;
}> {
  const adapter = new CloudflareRegistrarAdapter({ fetchImpl });
  const check = await adapter.checkDomains([...ASKREVIEW_DOMAIN_RESEARCH_CANDIDATES]);
  const rows: AskReviewDomainRow[] = check.rows.map((row) => {
    const scored = scoreDomain(row.domain);
    return {
      domain: row.domain,
      tld: row.domain.split(".").slice(-1)[0] ?? "UNKNOWN",
      available: row.available,
      premium: row.premium,
      registration: row.firstYear,
      renewal: row.renewal,
      brandQuality: scored.brandQuality,
      concern: scored.concern,
    };
  });
  const availablePriced = rows.filter((row) => row.available === "YES" && typeof row.registration === "number");
  const preferred = ["askreview.com", "getaskreview.com", "askreview.app"]
    .map((name) => availablePriced.find((row) => row.domain === name))
    .find(Boolean);
  const recommended = preferred ?? availablePriced[0] ?? null;
  const verified = check.ok && rows.some((row) => row.available !== "UNKNOWN" || typeof row.registration === "number");
  return {
    provider: "cloudflare.registrar_v1",
    verification: verified ? "VERIFIED" : "DOMAIN_PROVIDER_READ_VERIFICATION_REQUIRED",
    rows,
    recommendedDomain: recommended?.domain ?? "NONE",
    expectedFirstYearCost: recommended && typeof recommended.registration === "number" ? recommended.registration : "UNKNOWN",
    purchasePerformed: false,
    safeError: check.safeError,
  };
}
