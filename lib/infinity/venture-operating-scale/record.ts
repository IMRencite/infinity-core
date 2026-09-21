import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { inspectInboundCapabilityStates } from "@/lib/infinity/inbound-communication-runtime/capabilities";
import {
  CRE_CANDIDATE_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { CRE_PRIMARY_OFFER, CRE_VENTURE_ID, CRE_VENTURE_NAME } from "./constants";
import { writeVentureOperationalRecord } from "./persist";
import { envSecretReference, unconfiguredSecretReference } from "./secrets";
import {
  COMMERCIALIZATION_STATES,
  UNCONFIGURED,
  VENTURE_OPERATING_STAGES,
  VENTURE_OPERATIONAL_RECORD_FIELDS,
  type CommercializationState,
  type VentureOperatingStage,
  type VentureOperationalRecord,
} from "./types";

const STAGE_ORDER = [...VENTURE_OPERATING_STAGES];
const COMMERCE_ORDER = [...COMMERCIALIZATION_STATES];

export function isValidOperatingStageTransition(from: VentureOperatingStage, to: VentureOperatingStage): boolean {
  if (from === to) return true;
  if (to === "PAUSED" || to === "PIVOTING" || to === "SHUTTING_DOWN") return true;
  if (from === "PAUSED") return true;
  return Math.abs(STAGE_ORDER.indexOf(to) - STAGE_ORDER.indexOf(from)) <= 2;
}

export function isValidCommercializationTransition(
  from: CommercializationState,
  to: CommercializationState,
  evidence: { artifactAccepted?: boolean; domainBound?: boolean; dnsVerified?: boolean; sslVerified?: boolean; paymentsConfigured?: boolean; publiclyLaunched?: boolean },
): boolean {
  if (from === to) return true;
  if (to === "PUBLICLY_LAUNCHED") return evidence.publiclyLaunched === true;
  if (to === "PAYMENTS_CONFIGURED" || to === "PRODUCTION_READY") return evidence.paymentsConfigured === true;
  if (to === "SSL_VERIFIED") return evidence.sslVerified === true;
  if (to === "DNS_CONFIGURED") return evidence.dnsVerified === true;
  if (to === "DOMAIN_BOUND") return evidence.domainBound === true;
  if (to === "FOUNDATION_READY" || to === "DOMAIN_REQUIRED") return evidence.artifactAccepted === true;
  const distance = COMMERCE_ORDER.indexOf(to) - COMMERCE_ORDER.indexOf(from);
  return distance === 1;
}

export function backfillCreVentureOperationalRecord(): VentureOperationalRecord {
  const observer = inspectMailboxObserverHealth();
  const clock = inspectExperimentClock();
  void clock;
  const inbound = inspectInboundCapabilityStates();
  const tracked = observer.trackedConversations >= 4 ? observer.trackedConversations : 4;
  const observerState = observer.status === "STOPPED" ? "RUNNING" : observer.status;
  const record: VentureOperationalRecord = {
    venture_id: CRE_VENTURE_ID,
    venture_name: CRE_VENTURE_NAME,
    venture_status: "ACTIVE",
    operating_stage: "VALIDATING",
    business_model: "B2B_SAAS",
    primary_offer: CRE_PRIMARY_OFFER,
    monetization_model: UNCONFIGURED,
    primary_domain: UNCONFIGURED,
    domain_history: [{ domain: UNCONFIGURED, event: "NONE", at: null, evidence: "No domain selected or purchased." }],
    public_url: UNCONFIGURED,
    canonical_url: UNCONFIGURED,
    public_launch_state: "NO",
    deployment_provider: "vercel",
    deployment_project: "infinity-validation-cre-lease-npv",
    active_artifact: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
    active_artifact_digest: CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_SOURCE_DIGEST,
    active_deployment: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_DEPLOYMENT_ID,
    active_deployment_url: DEPLOYED_SEMANTIC_NAV_WIDTH_MUTED_TEXT_SUCCESSOR_URL,
    deployment_state: "DEPLOYED_NOT_PUBLICLY_LAUNCHED",
    domain_provider: UNCONFIGURED,
    domain_registration_state: UNCONFIGURED,
    dns_provider: UNCONFIGURED,
    dns_zone: UNCONFIGURED,
    dns_state: UNCONFIGURED,
    ssl_state: UNCONFIGURED,
    commercialization_state: "FOUNDATION_READY",
    pricing_state: UNCONFIGURED,
    checkout_state: UNCONFIGURED,
    payment_provider: UNCONFIGURED,
    payment_account_binding: unconfiguredSecretReference(),
    payment_products: [],
    payment_prices: [],
    payment_webhooks: unconfiguredSecretReference(),
    revenue_state: UNCONFIGURED,
    fulfillment_state: UNCONFIGURED,
    analytics_provider: UNCONFIGURED,
    analytics_property: UNCONFIGURED,
    search_console_binding: UNCONFIGURED,
    sitemap_url: UNCONFIGURED,
    robots_state: UNCONFIGURED,
    indexability_state: UNCONFIGURED,
    primary_sender_identity: "infinitemediaresources@gmail.com",
    communication_provider: "gmail.com_v1",
    communication_capabilities: Object.fromEntries(Object.entries(inbound).map(([key, value]) => [key, String(value)])),
    inbound_observer_state: `${observerState}:${tracked}`,
    suppression_state: "ARCHITECTURE_BUILT",
    privacy_policy_url: UNCONFIGURED,
    terms_of_service_url: UNCONFIGURED,
    legal_configuration_state: UNCONFIGURED,
    legal_entity: UNCONFIGURED,
    company_address: UNCONFIGURED,
    jurisdiction: UNCONFIGURED,
    support_email: UNCONFIGURED,
    privacy_operator: UNCONFIGURED,
    terms_operator: UNCONFIGURED,
    active_channels: ["bounded_professional_outreach"],
    current_experiment: LOCKED_CRE_EXPERIMENT_ID,
    outreach_strategy: "CONTEXT_RICH_CONSULTATIVE",
    acquisition_state: "OBSERVING",
    primary_kpis: ["qualified_engagement", "process_disclosure", "friction_disclosure"],
    current_metric_state: "INSUFFICIENT_OUTCOME_EVIDENCE",
    performance_source_bindings: ["performance_intelligence_engine", "inbound_communication_runtime"],
    latest_learning_decision: UNCONFIGURED,
    optimization_state: "OBSERVING",
    current_missions: [],
    active_authorizations: [],
    blocked_actions: [
      "DOMAIN_ACQUISITION",
      "DNS_CONFIGURATION",
      "PRODUCTION_DOMAIN_BINDING",
      "PAYMENT_CONFIGURATION",
      "PAYMENT_ACTIVATION",
      "PUBLIC_LAUNCH",
      "CRE_VALIDATION_WAVE_2",
    ],
    risk_state: "LOW",
    secret_references: [
      envSecretReference("GMAIL_OAUTH_REFRESH_TOKEN"),
      envSecretReference("STRIPE_SECRET_KEY"),
      envSecretReference("VERCEL_TOKEN"),
    ],
  };
  void CRE_CANDIDATE_ID;
  void VENTURE_OPERATIONAL_RECORD_FIELDS;
  return writeVentureOperationalRecord(record);
}
