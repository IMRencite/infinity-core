import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import {
  readOnpvOpportunityLifecycle,
  resetOnpvDurableOpportunityAuthoritativeStoreForTests,
  type OnpvOpportunityLifecycle,
} from "./onpv-durable-opportunity-state-v1";

export type OnpvDurableOpportunityLifecycle = OnpvOpportunityLifecycle;

export const ONPV_DURABLE_OPPORTUNITY_CATALOG_V1 = "ONPV_DURABLE_OPPORTUNITY_CATALOG_V1" as const;

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

/** Seed opportunity inventory (committed source); runtime lifecycle is durable, not module memory. */
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
    /** Committed seed provenance (not live weekly discovery cron output). */
    source_evidence: "WEEKLY_OPPORTUNITY_DISCOVERY:onpv-lease-concessions-v1",
    idempotency_key: "onpv-opp-ti-amortization-occupancy-cost-v1:DECISION_SUPPORT_PAGE",
  },
];

/** Maps catalog source_evidence strings to runtime semantics (reporting only). */
export function classifyOnpvCommittedSeedSourceEvidence(source_evidence: string): string {
  if (source_evidence.startsWith("WEEKLY_OPPORTUNITY_DISCOVERY:")) {
    return "COMMITTED_SEED_FROM_DISCOVERY_EVIDENCE";
  }
  return source_evidence;
}

export function resetOnpvDurableOpportunityStoreForTests(): void {
  resetOnpvDurableOpportunityAuthoritativeStoreForTests();
}

export function listOnpvCommittedDurableOpportunities(): OnpvDurableOpportunityRecord[] {
  return COMMITTED_ONPV_OPPORTUNITIES.map((row) => ({
    ...row,
    lifecycle: readOnpvOpportunityLifecycle(row.opportunity_id),
    materialized_at: null,
  }));
}

export function getOnpvDurableOpportunity(opportunity_id: string): OnpvDurableOpportunityRecord | null {
  const base = COMMITTED_ONPV_OPPORTUNITIES.find((o) => o.opportunity_id === opportunity_id);
  if (!base) return null;
  return {
    ...base,
    lifecycle: readOnpvOpportunityLifecycle(opportunity_id),
    materialized_at: null,
  };
}

export function setOnpvDurableOpportunityLifecycle(
  opportunity_id: string,
  lifecycle: OnpvDurableOpportunityLifecycle,
  _materialized_at?: string | null,
): void {
  void opportunity_id;
  void lifecycle;
  throw new Error("setOnpvDurableOpportunityLifecycle_DEPRECATED_USE_DURABLE_UPSERT");
}

export function onpvDurableOpportunityCatalogQc(): "PASS" | "FAIL" {
  return COMMITTED_ONPV_OPPORTUNITIES.length > 0 && COMMITTED_ONPV_OPPORTUNITIES.every((o) => o.venture_id === CRE_VENTURE_ID)
    ? "PASS"
    : "FAIL";
}

export function onpvCommittedCatalogActualRole(): "SEED_INVENTORY" {
  return "SEED_INVENTORY";
}
