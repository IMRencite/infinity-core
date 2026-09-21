export const OCCUPANCYNPV_DIFFERENTIATION_BASELINE = {
  industry: "commercial_real_estate_lease_analytics",
  customer_type: "tenant_representation_brokers_and_boutique_cre_agencies",
  purchase_behavior: "annual_professional_subscription_plus_one_time_per_deal",
  revenue_model: "b2b_saas_workspace_entitlement",
  backend_model: "supabase_auth_postgres_deal_workspaces_lease_scenarios",
  fulfillment_type: "saas_entitlement_workspace_access",
  product_interaction: "authenticated_npv_calculator_and_scenario_comparison",
  data_model: "deal_workspace_with_lease_scenario_children",
  acquisition_channel: "organic_plus_bounded_professional_cre_outreach",
  operational_workflow: "create_workspace_model_scenarios_compare_npv",
} as const;

export function occupancyNpvCloneSignals(input: {
  title: string;
  market: string;
  problem: string;
  customer: string;
}): string[] {
  const blob = `${input.title} ${input.market} ${input.problem} ${input.customer}`.toLowerCase();
  const reasons: string[] = [];
  if (/lease|npv|net effective rent|occupancy cost|cam pool/.test(blob) && /broker|cre|commercial real estate/.test(blob)) {
    reasons.push("cre_lease_npv_clone");
  }
  if (/\b(calculator|estimat|quoting|roi and payback|profit and fee)\b/.test(blob) && /saas|micro_saas|tool/.test(blob)) {
    reasons.push("analysis_calculator_saas_clone");
  }
  return reasons;
}
