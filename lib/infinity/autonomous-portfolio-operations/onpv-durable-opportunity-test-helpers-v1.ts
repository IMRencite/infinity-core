import type { OnpvOpportunityLifecycle } from "./onpv-durable-opportunity-state-v1";
import { upsertDurableOnpvOpportunityState } from "./onpv-durable-opportunity-state-v1";
import { getOnpvDurableOpportunity } from "./occupancynpv-durable-opportunity-catalog-v1";

export async function setOnpvOpportunityLifecycleForTests(
  opportunity_id: string,
  lifecycle: OnpvOpportunityLifecycle,
): Promise<void> {
  const base = getOnpvDurableOpportunity(opportunity_id);
  if (!base) return;
  await upsertDurableOnpvOpportunityState({
    payload: {
      schema_version: 1,
      opportunity_lifecycle: lifecycle,
      opportunity_id: base.opportunity_id,
      normalized_topic_key: base.normalized_topic_key,
      asset_type: base.asset_type,
      source_evidence: base.source_evidence,
      suggested_slug: base.slug,
      materialized_slug: lifecycle === "PUBLISHED" ? base.slug : null,
      materialized_candidate_key: null,
      materialized_at: null,
      published_at: lifecycle === "PUBLISHED" ? new Date().toISOString() : null,
      distinctness_qc: "PASS",
      materialized_article: null,
      last_cycle_id: null,
      last_release_sha: null,
    },
    terminal_state: lifecycle === "PUBLISHED" ? "PUBLISHED" : "ACTIVE",
  });
}
