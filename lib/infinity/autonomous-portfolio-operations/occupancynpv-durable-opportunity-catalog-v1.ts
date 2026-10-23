import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";

export const ONPV_DURABLE_OPPORTUNITY_CATALOG_V1 = "ONPV_DURABLE_OPPORTUNITY_CATALOG_V1" as const;

export type OnpvDurableOpportunityLifecycle =
  | "DISCOVERED"
  | "MATERIALIZED"
  | "BUILD_PENDING"
  | "BUILT"
  | "QC"
  | "PUBLISHED"
  | "SUPERSEDED";

export type OnpvDurableOpportunityRecord = {
  venture_id: typeof CRE_VENTURE_ID;
  opportunity_id: string;
  opportunity_type: "DECISION_SUPPORT_PAGE" | "EVERGREEN_GUIDE";
  topic: string;
  normalized_topic_key: string;
  slug: string;
  path: string;
  canonical_url: string;
  asset_type: "DECISION_SUPPORT_PAGE" | "EVERGREEN_GUIDE";
  distinctness_signal: string;
  qualification_signal: string;
  source_evidence: string;
  lifecycle: OnpvDurableOpportunityLifecycle;
  materialized_at: string | null;
  idempotency_key: string;
};

/** Committed weekly-discovery output (durable catalog; not CT-specific). */
const COMMITTED_ONPV_OPPORTUNITIES: Omit<
  OnpvDurableOpportunityRecord,
  "lifecycle" | "materialized_at"
>[] = [
  {
    venture_id: CRE_VENTURE_ID,
    opportunity_id: "onpv-opp-ti-amortization-occupancy-cost-v1",
    opportunity_type: "DECISION_SUPPORT_PAGE",
    topic: "How does tenant improvement allowance amortization affect occupancy cost for tenants?",
    normalized_topic_key: "ti-amortization-occupancy-cost",
    slug: "how-ti-amortization-affects-occupancy-cost-for-tenants",
    path: "/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants/",
    canonical_url: "https://occupancynpv.com/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants/",
    asset_type: "DECISION_SUPPORT_PAGE",
    distinctness_signal: "TI amortization timing vs face rent; not covered by free-rent or gross/net cluster",
    qualification_signal: "CRE leasing authority gap; passes venture isolation and decision-support intent",
    source_evidence: "WEEKLY_OPPORTUNITY_DISCOVERY:onpv-lease-concessions-v1",
    idempotency_key: "onpv-opp-ti-amortization-occupancy-cost-v1:DECISION_SUPPORT_PAGE",
  },
];

const lifecycleById = new Map<string, OnpvDurableOpportunityLifecycle>();
const materializedAtById = new Map<string, string>();

export function resetOnpvDurableOpportunityStoreForTests(): void {
  lifecycleById.clear();
  materializedAtById.clear();
  for (const row of COMMITTED_ONPV_OPPORTUNITIES) {
    lifecycleById.set(row.opportunity_id, "DISCOVERED");
  }
}

for (const row of COMMITTED_ONPV_OPPORTUNITIES) {
  lifecycleById.set(row.opportunity_id, "DISCOVERED");
}

export function listOnpvCommittedDurableOpportunities(): OnpvDurableOpportunityRecord[] {
  return COMMITTED_ONPV_OPPORTUNITIES.map((row) => ({
    ...row,
    lifecycle: lifecycleById.get(row.opportunity_id) ?? "DISCOVERED",
    materialized_at: materializedAtById.get(row.opportunity_id) ?? null,
  }));
}

export function getOnpvDurableOpportunity(opportunity_id: string): OnpvDurableOpportunityRecord | null {
  const base = COMMITTED_ONPV_OPPORTUNITIES.find((o) => o.opportunity_id === opportunity_id);
  if (!base) return null;
  return {
    ...base,
    lifecycle: lifecycleById.get(opportunity_id) ?? "DISCOVERED",
    materialized_at: materializedAtById.get(opportunity_id) ?? null,
  };
}

export function setOnpvDurableOpportunityLifecycle(
  opportunity_id: string,
  lifecycle: OnpvDurableOpportunityLifecycle,
  materialized_at?: string | null,
): void {
  lifecycleById.set(opportunity_id, lifecycle);
  if (materialized_at !== undefined) {
    if (materialized_at) materializedAtById.set(opportunity_id, materialized_at);
    else materializedAtById.delete(opportunity_id);
  }
}

export function onpvDurableOpportunityCatalogQc(): "PASS" | "FAIL" {
  return COMMITTED_ONPV_OPPORTUNITIES.length > 0 && COMMITTED_ONPV_OPPORTUNITIES.every((o) => o.venture_id === CRE_VENTURE_ID)
    ? "PASS"
    : "FAIL";
}
