export const VENTURE_OPERATING_STAGES = [
  "DISCOVERY",
  "VALIDATING",
  "BUILDING",
  "COMMERCIALIZATION_READY",
  "COMMERCIALIZING",
  "OPERATING",
  "SCALING",
  "PAUSED",
  "PIVOTING",
  "SHUTTING_DOWN",
] as const;
export type VentureOperatingStage = (typeof VENTURE_OPERATING_STAGES)[number];

export const COMMERCIALIZATION_STATES = [
  "NOT_CONFIGURED",
  "FOUNDATION_READY",
  "DOMAIN_REQUIRED",
  "DOMAIN_BOUND",
  "DNS_REQUIRED",
  "DNS_CONFIGURED",
  "SSL_VERIFIED",
  "PAYMENTS_REQUIRED",
  "PAYMENTS_CONFIGURED",
  "PRODUCTION_READY",
  "PUBLICLY_LAUNCHED",
] as const;
export type CommercializationState = (typeof COMMERCIALIZATION_STATES)[number];

export const PROVIDER_MATRIX_STATUSES = [
  "UNAVAILABLE",
  "UNVERIFIED",
  "READ_ONLY_VERIFIED",
  "LIVE_WRITE_VERIFIED",
] as const;
export type ProviderMatrixStatus = (typeof PROVIDER_MATRIX_STATUSES)[number];

export const UNKNOWN = "UNKNOWN" as const;
export const UNCONFIGURED = "UNCONFIGURED" as const;

export type SecretReference = {
  kind: "ENV_KEY" | "PROVIDER_BINDING" | "UNCONFIGURED";
  key: string | null;
  rawSecretStored: false;
};

export type DomainHistoryEntry = {
  domain: string | typeof UNCONFIGURED;
  event: "NONE" | "SELECTED" | "PURCHASED" | "BOUND" | "RELEASED";
  at: string | null;
  evidence: string;
};

export type PaymentProductRecord = {
  id: string | typeof UNCONFIGURED;
  name: string | typeof UNCONFIGURED;
  providerProductRef: SecretReference;
};

export type PaymentPriceRecord = {
  id: string | typeof UNCONFIGURED;
  productId: string | typeof UNCONFIGURED;
  amountUsd: number | typeof UNCONFIGURED;
  providerPriceRef: SecretReference;
};

export type VentureOperationalRecord = {
  venture_id: string;
  venture_name: string;
  venture_status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  operating_stage: VentureOperatingStage;
  business_model: string;
  primary_offer: string;
  monetization_model: string;
  primary_domain: string | typeof UNCONFIGURED;
  domain_history: DomainHistoryEntry[];
  public_url: string | typeof UNCONFIGURED;
  canonical_url: string | typeof UNCONFIGURED;
  public_launch_state: "NO" | "YES";
  deployment_provider: string | typeof UNCONFIGURED;
  deployment_project: string | typeof UNCONFIGURED;
  active_artifact: string | typeof UNCONFIGURED;
  active_artifact_digest: string | typeof UNCONFIGURED;
  active_deployment: string | typeof UNCONFIGURED;
  active_deployment_url: string | typeof UNCONFIGURED;
  deployment_state: string;
  domain_provider: string | typeof UNCONFIGURED;
  domain_registration_state: string;
  dns_provider: string | typeof UNCONFIGURED;
  dns_zone: string | typeof UNCONFIGURED;
  dns_state: string;
  ssl_state: string;
  commercialization_state: CommercializationState;
  pricing_state: string;
  checkout_state: string;
  payment_provider: string | typeof UNCONFIGURED;
  payment_account_binding: SecretReference;
  payment_products: PaymentProductRecord[];
  payment_prices: PaymentPriceRecord[];
  payment_webhooks: SecretReference;
  revenue_state: string;
  fulfillment_state: string;
  analytics_provider: string | typeof UNCONFIGURED;
  analytics_property: string | typeof UNCONFIGURED;
  search_console_binding: string | typeof UNCONFIGURED;
  sitemap_url: string | typeof UNCONFIGURED;
  robots_state: string;
  indexability_state: string;
  primary_sender_identity: string | typeof UNCONFIGURED;
  communication_provider: string | typeof UNCONFIGURED;
  communication_capabilities: Record<string, string>;
  inbound_observer_state: string;
  suppression_state: string;
  privacy_policy_url: string | typeof UNCONFIGURED;
  terms_of_service_url: string | typeof UNCONFIGURED;
  legal_configuration_state: string;
  legal_entity: string | typeof UNCONFIGURED;
  company_address: string | typeof UNCONFIGURED;
  jurisdiction: string | typeof UNCONFIGURED;
  support_email: string | typeof UNCONFIGURED;
  privacy_operator: string | typeof UNCONFIGURED;
  terms_operator: string | typeof UNCONFIGURED;
  active_channels: string[];
  current_experiment: string | typeof UNCONFIGURED;
  outreach_strategy: string | typeof UNCONFIGURED;
  acquisition_state: string;
  primary_kpis: string[];
  current_metric_state: string;
  performance_source_bindings: string[];
  latest_learning_decision: string | typeof UNCONFIGURED;
  optimization_state: string;
  current_missions: string[];
  active_authorizations: string[];
  blocked_actions: string[];
  risk_state: string;
  secret_references: SecretReference[];
};

export const VENTURE_OPERATIONAL_RECORD_FIELDS = [
  "venture_id",
  "venture_name",
  "venture_status",
  "operating_stage",
  "business_model",
  "primary_offer",
  "monetization_model",
  "primary_domain",
  "domain_history",
  "public_url",
  "canonical_url",
  "public_launch_state",
  "deployment_provider",
  "deployment_project",
  "active_artifact",
  "active_artifact_digest",
  "active_deployment",
  "active_deployment_url",
  "deployment_state",
  "domain_provider",
  "domain_registration_state",
  "dns_provider",
  "dns_zone",
  "dns_state",
  "ssl_state",
  "commercialization_state",
  "pricing_state",
  "checkout_state",
  "payment_provider",
  "payment_account_binding",
  "payment_products",
  "payment_prices",
  "payment_webhooks",
  "revenue_state",
  "fulfillment_state",
  "analytics_provider",
  "analytics_property",
  "search_console_binding",
  "sitemap_url",
  "robots_state",
  "indexability_state",
  "primary_sender_identity",
  "communication_provider",
  "communication_capabilities",
  "inbound_observer_state",
  "suppression_state",
  "privacy_policy_url",
  "terms_of_service_url",
  "legal_configuration_state",
  "legal_entity",
  "company_address",
  "jurisdiction",
  "support_email",
  "privacy_operator",
  "terms_operator",
  "active_channels",
  "current_experiment",
  "outreach_strategy",
  "acquisition_state",
  "primary_kpis",
  "current_metric_state",
  "performance_source_bindings",
  "latest_learning_decision",
  "optimization_state",
  "current_missions",
  "active_authorizations",
  "blocked_actions",
  "risk_state",
  "secret_references",
] as const;

export type DomainCapabilityId =
  | "domain.search"
  | "domain.availability.verify"
  | "domain.registration.readback"
  | "domain.ownership.verify"
  | "dns.zone.discover"
  | "dns.record.plan"
  | "dns.record.mutate"
  | "dns.verify"
  | "ssl.verify"
  | "canonical_domain.verify";

export type DomainAcquisitionPlan = {
  gate: "DomainAcquisitionPlan";
  ventureId: string;
  selectedDomain: typeof UNCONFIGURED | string;
  requiredCapabilities: DomainCapabilityId[];
  treasuryRequired: true;
  economicActionGovernanceRequired: true;
  costVerificationRequired: true;
  ventureIdentityVerificationRequired: true;
  domainSelectionEvidenceRequired: true;
  duplicateDomainProtectionRequired: true;
  purchaseAuthorized: false;
  purchaseExecuted: false;
};

export type DomainPurchaseAuthorization = {
  gate: "DomainPurchaseAuthorization";
  authorization: "DOMAIN_ACQUISITION";
  status: "NOT_GRANTED";
  rawFinancialCredentialsExposed: false;
  purchaseAllowed: false;
};

export type DnsWorkflowStep =
  | "SELECTED_DOMAIN"
  | "OWNERSHIP_VERIFICATION"
  | "PROVIDER_BINDING"
  | "DNS_PLAN"
  | "DNS_EXECUTION_AUTHORIZATION"
  | "DNS_MUTATION"
  | "PROPAGATION_VERIFICATION"
  | "SSL_VERIFICATION"
  | "DEPLOYMENT_CANONICAL_DOMAIN_BINDING"
  | "CANONICAL_URL_VALIDATION"
  | "SEO_GEO_VALIDATION"
  | "VENTURE_RECORD_RECONCILIATION";

export type PaymentProviderBinding = {
  provider: "stripe" | "UNCONFIGURED";
  capabilityRouted: true;
  accountBinding: SecretReference;
  writeAuthorized: false;
};

export type PaymentReadinessGateResult = {
  gate: "PaymentReadinessGate";
  result: "NOT_READY" | "CONFIGURATION_REQUIRED" | "CONFIGURATION_COMPLETE" | "ACTIVATION_REQUIRED" | "READY_NOT_ACTIVE" | "PAYMENTS_ACTIVE" | "BLOCKED";
  paymentsActive: boolean;
  reasons: string[];
};

export type RevenueLineageStep =
  | "payment_provider"
  | "transaction_observation"
  | "normalized_financial_event"
  | "venture_revenue_metric"
  | "kpi_aggregation"
  | "expected_vs_actual"
  | "learning_system";

export type VentureOperatingSnapshot = {
  ventureId: string;
  currentStage: VentureOperatingStage;
  publicStatus: "NO" | "YES";
  revenueStatus: string;
  trafficPerformanceState: string;
  activeExperiments: string[];
  activeMissions: string[];
  newInbound: number;
  blockedActions: string[];
  importantChangesSincePriorCycle: string[];
  learningSignals: string[];
  nextGovernedWork: string[];
  riskAlerts: string[];
  dailyResult: "NO_ACTION_REQUIRED" | "ORCHESTRATE_EXISTING_ENGINES" | "INSUFFICIENT_POST_LAUNCH_EVIDENCE" | "HIGH_PRIORITY_COMMERCIAL_INCIDENT" | "GROWTH_EXPERIMENT_ACTIVE";
};

export type DailyVentureOperatingCycleResult = {
  orchestrator: "DailyVentureOperatingCycle";
  replacesDecisionEngine: false;
  snapshot: VentureOperatingSnapshot;
  enginesConsulted: string[];
  commercializationWorkRecognized: boolean;
  externalWaitingRecognized: boolean;
  providerAccessBlockerRecognized: boolean;
};

export type PortfolioOperatingCycleResult = {
  orchestrator: "PortfolioOperatingCycle";
  secondDecisionEngineCreated: false;
  ventures: Array<{
    ventureId: string;
    health: string;
    commercializationState: CommercializationState;
    revenue: string;
    growth: string;
    experiments: string[];
    blockedActions: string[];
    missionActivity: string;
    economicOpportunities: string[];
    risk: string;
  }>;
};

export type VentureImprovementSuggestion = {
  id: string;
  ventureId: string;
  source: "HUMAN";
  text: string;
  createdAt: string;
};

export type VentureImprovementAssessment = {
  suggestionId: string;
  classification: "PRODUCT" | "COMMERCIALIZATION" | "GROWTH" | "GOVERNANCE" | "UNKNOWN";
  evidenceInspected: string[];
  governanceBypass: false;
};

export type VentureImprovementProposal = {
  suggestionId: string;
  proposal: string;
  qualityRiskEconomicEvaluationRequired: true;
  governedMissionRequired: true;
  autoImplemented: false;
};

export type CommercializationReadinessResult = {
  gate: "VentureCommercializationReadinessGate";
  result:
    | "NOT_READY"
    | "DOMAIN_ACTION_REQUIRED"
    | "DNS_ACTION_REQUIRED"
    | "PAYMENT_ACTION_REQUIRED"
    | "PAYMENT_CONFIGURATION_REQUIRED"
    | "MULTIPLE_ACTIONS_REQUIRED"
    | "PRODUCTION_READY";
  reasons: string[];
  orderedBlockers: string[];
};

export type CommercializationPlanNode = {
  id: string;
  requirement: string;
  dependsOn: string[];
  authorized: false;
  executed: false;
};

export type CreCommercializationPlan = {
  plan: "CRECommercializationPlan";
  executed: false;
  currentReadiness: CommercializationReadinessResult["result"];
  nextDomainRequirement: string;
  nextPaymentRequirement: string;
  dependencyGraph: CommercializationPlanNode[];
};

export type MissionConcurrencyDecision = {
  gate: "MissionConcurrencyGate";
  outcome: "ALLOWED" | "BLOCKED";
  reason: string;
};

export type FutureAuthorizationReadiness = {
  authorization: string;
  status: "NOT_GRANTED" | "PLAN_READY" | "BLOCKED";
  blocker: string;
};

export type VentureOperatingScaleHqAuthorityVisibility = {
  mutationClass: string | null;
  decision: string | null;
  authoritySource: string | null;
  riskState: string | null;
  financialExposure: string | null;
  founderActionRequired: boolean;
  mutationPolicy: string;
  paymentActivationPolicy: string;
  paymentActivation: "NO" | "YES";
  paymentInfrastructure: "READY" | "LIVE" | "UNCONFIGURED";
  paymentActivationState: "BLOCKED" | "YES" | "NO";
  fulfillment: "REQUIRED" | "PASS" | "UNCONFIGURED";
  publicLaunchState: "BLOCKED" | "YES" | "NO";
  orphanedPaidCustomerCount: number;
  highPriorityIssue: string | null;
  publicLaunch: "NO" | "YES";
  launchedAt?: string | null;
  founderLaunchAuthorization?: string | null;
  remainingBlockers: string[];
  hqDecides: false;
  fulfillmentReadiness?: "PASS" | "FAIL" | "UNCONFIGURED";
  offerContracts?: string[];
  activeEntitlements?: number;
  fulfillmentFailures?: number;
  recoveryQueue?: number;
};

export type VentureOperatingScaleHqProjection = {
  portfolioStatus: string;
  activeVentures: number;
  operatingVentures: number;
  validationVentures: number;
  pausedVentures?: number;
  commercializationReadiness: string;
  commercializationScope?: string;
  revenueState: string;
  activeExperiments: string[];
  communicationState: string;
  providerHealth: Record<string, ProviderMatrixStatus>;
  blockedActions: string[];
  latestLearning: string;
  latestCompletedMission: string | null;
  selectedVentureLabel?: string;
  authorityVisibility: VentureOperatingScaleHqAuthorityVisibility;
};
