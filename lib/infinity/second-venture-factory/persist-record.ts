import { FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS } from "@/lib/infinity/venture-operating-scale/legal-facts";
import { listVentureOperationalRecords, writeVentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/persist";
import { unconfiguredSecretReference } from "@/lib/infinity/venture-operating-scale/secrets";
import { UNCONFIGURED, type VentureOperationalRecord } from "@/lib/infinity/venture-operating-scale/types";
import { enqueueEconomicsOnPromotion } from "@/lib/infinity/venture-economics/persist";
import {
  ASKREVIEW_INTERNAL_NAME,
  ASKREVIEW_VENTURE_ID,
  ASKREVIEW_WORKING_NAME,
} from "./constants";

export function buildAskReviewOperationalRecord(): VentureOperationalRecord {
  const legal = FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS;
  return {
    venture_id: ASKREVIEW_VENTURE_ID,
    venture_name: ASKREVIEW_WORKING_NAME,
    venture_status: "ACTIVE",
    operating_stage: "VALIDATING",
    business_model: "MICRO_SAAS_GENERATED_KIT",
    primary_offer: ASKREVIEW_INTERNAL_NAME,
    monetization_model: "HYPOTHESIZED_MONTHLY_SUBSCRIPTION_UNRESOLVED",
    primary_domain: UNCONFIGURED,
    domain_history: [{ domain: UNCONFIGURED, event: "NONE", at: null, evidence: "No domain purchased. Authorization required." }],
    public_url: UNCONFIGURED,
    canonical_url: UNCONFIGURED,
    public_launch_state: "NO",
    deployment_provider: UNCONFIGURED,
    deployment_project: UNCONFIGURED,
    active_artifact: UNCONFIGURED,
    active_artifact_digest: UNCONFIGURED,
    active_deployment: UNCONFIGURED,
    active_deployment_url: UNCONFIGURED,
    deployment_state: "IN_REPO_BUILD",
    domain_provider: UNCONFIGURED,
    domain_registration_state: UNCONFIGURED,
    dns_provider: UNCONFIGURED,
    dns_zone: UNCONFIGURED,
    dns_state: UNCONFIGURED,
    ssl_state: UNCONFIGURED,
    commercialization_state: "FOUNDATION_READY",
    pricing_state: "HYPOTHESIS_UNRESOLVED",
    checkout_state: UNCONFIGURED,
    payment_provider: UNCONFIGURED,
    payment_account_binding: unconfiguredSecretReference(),
    payment_products: [],
    payment_prices: [],
    payment_webhooks: unconfiguredSecretReference(),
    revenue_state: UNCONFIGURED,
    fulfillment_state: "FULFILLMENT_READY_PAYMENT_NOT_ACTIVATED",
    analytics_provider: UNCONFIGURED,
    analytics_property: UNCONFIGURED,
    search_console_binding: "SEARCH_PROVIDER_CONFIGURATION_REQUIRED",
    sitemap_url: "/askreview/sitemap.xml",
    robots_state: UNCONFIGURED,
    indexability_state: UNCONFIGURED,
    primary_sender_identity: legal.support_email,
    communication_provider: UNCONFIGURED,
    communication_capabilities: {},
    inbound_observer_state: UNCONFIGURED,
    suppression_state: UNCONFIGURED,
    privacy_policy_url: "/askreview/privacy-policy/",
    terms_of_service_url: "/askreview/terms-of-service/",
    legal_configuration_state: "SAME_OPERATOR_IMR_FACTS",
    legal_entity: legal.legal_entity,
    company_address: legal.company_address,
    jurisdiction: legal.jurisdiction,
    support_email: legal.support_email,
    privacy_operator: legal.privacy_operator,
    terms_operator: legal.terms_operator,
    active_channels: ["organic_unconfigured_search"],
    current_experiment: "askreview_price_model_validation_v1",
    outreach_strategy: UNCONFIGURED,
    acquisition_state: "NOT_STARTED",
    primary_kpis: ["kit_generation", "returning_sign_in", "location_saves"],
    current_metric_state: "INSUFFICIENT_POST_LAUNCH_EVIDENCE",
    performance_source_bindings: ["performance_intelligence_engine"],
    latest_learning_decision: "SELECTION_UNDER_REVIEW",
    optimization_state: "OBSERVING",
    current_missions: ["SECOND_VENTURE_SELECTION_PROVENANCE_REVIEW"],
    active_authorizations: [],
    blocked_actions: [
      "ASKREVIEW_PRODUCTION_PAUSED",
      "PRICE_VALIDATION_REQUIRED",
      "DOMAIN_ACQUISITION",
      "PAYMENT_CONFIGURATION",
      "PAYMENT_ACTIVATION",
      "PUBLIC_LAUNCH",
      "SEARCH_PROVIDER_CONFIGURATION_REQUIRED",
    ],
    risk_state: "LOW",
    secret_references: [],
  };
}

export function persistAskReviewOperationalRecord(): VentureOperationalRecord {
  listVentureOperationalRecords();
  const record = writeVentureOperationalRecord(buildAskReviewOperationalRecord());
  enqueueEconomicsOnPromotion({ venture_id: record.venture_id, opportunity_id: record.venture_id.replace(/^candidate:/, "") });
  return record;
}
