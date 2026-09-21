import { auditActiveVentureBlogs } from "../continuous/venture-blog-standard";
import { listActiveBlogVentures } from "./live-work";
import { ensureVentureBlogOsState, replaceVentureBlogOsState } from "./store";
import type { BlogRemediationObligation } from "./types";

export function auditActiveVentureBlogRemediation(now = new Date().toISOString()): {
  open: BlogRemediationObligation[];
  counts: {
    VenturesAudited: number;
    BlogInfrastructureRemediation: number;
    BlogUIRemediation: number;
    TaxonomyRemediation: number;
    AuthorityRemediation: number;
    GEORemediation: number;
    OpenObligations: number;
  };
} {
  const active = listActiveBlogVentures();
  const audited = auditActiveVentureBlogs();
  const open: BlogRemediationObligation[] = [];
  for (const row of audited) {
    if (row.status === "BLOG_READY") continue;
    const kind = row.status === "BLOG_MISSING" ? "INFRASTRUCTURE" : "UI";
    const obligation: BlogRemediationObligation = {
      obligation_id: `remediate:${row.venture_id}:${kind}`,
      venture_id: row.venture_id,
      kind,
      missing: [row.reason],
      state: "OPEN",
      created_at: now,
      updated_at: now,
    };
    open.push(obligation);
    const state = ensureVentureBlogOsState(row.venture_id, row.public_name, now);
    replaceVentureBlogOsState({
      ...state,
      remediations: [...state.remediations.filter((item) => item.obligation_id !== obligation.obligation_id), obligation],
      updated_at: now,
    });
  }
  return {
    open,
    counts: {
      VenturesAudited: Math.max(active.length, audited.length),
      BlogInfrastructureRemediation: open.filter((row) => row.kind === "INFRASTRUCTURE").length,
      BlogUIRemediation: open.filter((row) => row.kind === "UI").length,
      TaxonomyRemediation: open.filter((row) => row.kind === "TAXONOMY").length,
      AuthorityRemediation: open.filter((row) => row.kind === "AUTHORITY").length,
      GEORemediation: open.filter((row) => row.kind === "GEO").length,
      OpenObligations: open.length,
    },
  };
}
