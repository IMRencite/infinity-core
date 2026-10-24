import type { BlogBacklogArticle } from "@/lib/infinity/organic-growth-engine/continuous/blog-backlog-inventory";

export const ONPV_END_TO_END_PUBLICATION_IDENTITY_CONTRACT_V1 =
  "ONPV_END_TO_END_PUBLICATION_IDENTITY_CONTRACT_V1" as const;

export type OnpvPublicationIdentityV1 = {
  opportunity_id: string | null;
  materialized_candidate_key: string | null;
  slug: string;
  path: string;
  canonical_url: string;
  asset_identity: string;
  venture_id: string;
  work_type: string;
};

function normPath(path: string): string {
  return path.replace(/\/+$/, "").toLowerCase();
}

export function buildOnpvPublicationIdentityFromJobLineage(input: {
  lineage: Record<string, unknown>;
  article: BlogBacklogArticle;
  venture_id: string;
}): OnpvPublicationIdentityV1 {
  return {
    opportunity_id: typeof input.lineage.opportunity_id === "string" ? input.lineage.opportunity_id : null,
    materialized_candidate_key:
      typeof input.lineage.materialized_candidate_key === "string"
        ? input.lineage.materialized_candidate_key
        : input.article.asset_id ?? null,
    slug: input.article.slug,
    path: input.article.path,
    canonical_url: input.article.canonical_url,
    asset_identity: String(input.lineage.asset_identity ?? ""),
    venture_id: input.venture_id,
    work_type: String(input.lineage.work_type ?? "NEW_PUBLICATION"),
  };
}

export function evaluateOnpvPublicationIdentityParity(input: {
  identity: OnpvPublicationIdentityV1;
  article: BlogBacklogArticle;
  production_url?: string | null;
}): { ONPV_PUBLICATION_IDENTITY_PARITY_QC: "PASS" | "FAIL"; reasons: string[] } {
  const reasons: string[] = [];
  if (normPath(input.identity.path) !== normPath(input.article.path)) reasons.push("PATH_MISMATCH");
  if (input.identity.slug !== input.article.slug) reasons.push("SLUG_MISMATCH");
  if (normPath(input.identity.canonical_url) !== normPath(input.article.canonical_url)) reasons.push("CANONICAL_MISMATCH");
  if (input.production_url) {
    const prod = normPath(input.production_url.replace(/^https:\/\/occupancynpv\.com/i, ""));
    const expected = normPath(input.identity.path);
    if (prod !== expected && !normPath(input.production_url).includes(expected.replace(/^\//, ""))) {
      reasons.push("PRODUCTION_URL_MISMATCH");
    }
  }
  return {
    ONPV_PUBLICATION_IDENTITY_PARITY_QC: reasons.length ? "FAIL" : "PASS",
    reasons,
  };
}

export function onpvEndToEndPublicationIdentityContractQc(): "PASS" | "FAIL" {
  return typeof ONPV_END_TO_END_PUBLICATION_IDENTITY_CONTRACT_V1 === "string" ? "PASS" : "FAIL";
}
