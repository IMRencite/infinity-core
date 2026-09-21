import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness/types";
import type {
  ArtifactValidationResult,
  ExecutionResult,
  VentureBuildArtifact,
} from "@/lib/infinity/venture-build-orchestration/types";
import type {
  EXPERIMENT_OUTCOMES,
  EXPERIMENT_STATES,
  EXPERIMENT_TYPES,
  INTENT_EVENTS,
  INTENT_STRENGTH,
  LOCKED_SUCCESS_CRITERIA,
  WTP_LEVELS,
} from "./constants";

export type ExperimentType = (typeof EXPERIMENT_TYPES)[number];
export type ExperimentState = (typeof EXPERIMENT_STATES)[number];
export type ExperimentOutcome = (typeof EXPERIMENT_OUTCOMES)[number];
export type IntentEvent = (typeof INTENT_EVENTS)[number];
export type IntentStrength = (typeof INTENT_STRENGTH)[number];
export type WtpLevel = (typeof WTP_LEVELS)[number];

export type PricingHypothesis = {
  id: string;
  structure: "PROFESSIONAL_ANNUAL" | "PER_DEAL_REPORT";
  label: string;
  displayPrice: string;
  anchorOnly: true;
  proven: false;
};

export type ExperimentOffer = {
  targetCustomer: string;
  problem: string;
  valueProposition: string;
  does: string[];
  doesNot: string[];
  disclosure: string;
  legalDisclosure: string;
  cta: "Request Pilot Access";
};

export type SuccessCriteria = {
  minQualifiedSample: number;
  minStrongIntentEvents: number;
  minPricingSelections: number;
  maxDurationDays: number;
  negativeStrongIntentRate: number;
  lockedBeforeLaunch: true;
};

export type IntentModel = {
  weak: IntentEvent[];
  moderate: IntentEvent[];
  strong: IntentEvent[];
  paidCommitmentPossible: false;
};

export type ExperimentFormSchema = {
  fields: string[];
  sensitiveForbidden: string[];
  duplicateKey: "workEmail";
};

export type ExperimentEventRecord = {
  eventId: string;
  type: IntentEvent;
  candidateId: string;
  experimentId: string;
  artifactId: string | null;
  variant: "single_offer";
  occurredAt: string;
  synthetic: boolean;
  prospectKey: string | null;
  qualified: boolean;
  pricingOptionId: string | null;
};

export type ExternalActionCounts = {
  validationDeployments: number;
  fullProductBuilds: 0;
  domainPurchases: 0;
  dnsWrites: 0;
  stripeWrites: 0;
  treasuryMovement: 0;
  adSpend: 0;
  outboundMarketingSends: 0;
};

export type MarketValidationExperiment = {
  schemaVersion: "market_validation_experiment_v1";
  experimentId: string;
  candidateId: string;
  ventureId: string;
  validationRunId: string | null;
  organizationId: string;
  hypothesis: string;
  targetCustomer: string;
  validationDimension: "WILLINGNESS_TO_PAY";
  experimentType: ExperimentType;
  offer: ExperimentOffer;
  priceHypotheses: PricingHypothesis[];
  pricingRationale: string;
  artifactRequirements: string[];
  trafficStrategy: string[];
  successMetrics: string[];
  guardrailMetrics: string[];
  minimumEvidence: SuccessCriteria;
  budget: {
    researchOnly: false;
    hostingDeployAllowed: true;
    adSpend: 0;
    domainSpend: 0;
    stripeWrites: 0;
  };
  economicAuthorization: {
    eagRequired: true;
    treasuryMovementForbidden: true;
  };
  externalActions: ExternalActionCounts;
  eventSchema: IntentEvent[];
  intentModel: IntentModel;
  form: ExperimentFormSchema;
  startState: "DRAFT";
  runtimeState: ExperimentState;
  completionState: ExperimentState | null;
  result: ExperimentOutcome | null;
  confidence: "NONE" | "WEAK" | "MODERATE" | "STRONG";
  wtpEvidence: WtpLevel;
  observedPayment: false;
  thresholdsLockedBeforeLaunch: true;
  variantPolicy: "SINGLE_OFFER";
  variantRationale: string;
  specialistReviewResolved: false;
  traceability: {
    candidateId: string;
    experimentId: string;
    artifactId: string | null;
    planId: string | null;
    validationRunId: string | null;
  };
};

export type ExperimentCounts = {
  qualifiedVisitors: number;
  strongIntent: number;
  qualifiedSubmissions: number;
  pricingSelections: number;
  pageViews: number;
};

export type DeploymentPurpose =
  | "MARKET_VALIDATION_EXPERIMENT"
  | "PREMIUM_AUTHORITY_VALIDATION_SITE_SUCCESSOR"
  | "FULL_PRODUCT_PRODUCTION"
  | "PUBLIC_COMMERCIAL_LAUNCH"
  | "INTERNAL_PREVIEW"
  | "PROVIDER_VERIFICATION";

export type EagDecision =
  | "APPROVED"
  | "DENIED"
  | "BLOCKED_BY_UNKNOWN_COST"
  | "BLOCKED_BY_PROVIDER_SCOPE"
  | "BLOCKED_BY_PROVIDER_CAPABILITY_REFRESH"
  | "BLOCKED_BY_ARTIFACT"
  | "BLOCKED_BY_POLICY"
  | "BLOCKED_BY_FORM_BACKEND"
  | "BLOCKED_BY_ANALYTICS_BACKEND";

export type CostClassification = "NO_INCREMENTAL_COST" | "BOUNDED" | "METERED" | "UNKNOWN";

export type ValidationArtifactDeploymentAuthorization = {
  approved: boolean;
  eag: EagDecision;
  eagReason: string;
  eagBypassed: false;
  purpose: DeploymentPurpose;
  provider: "vercel";
  requiredCapability: string;
  providerVerificationSeparated: true;
  artifactScoped: true;
  experimentPurposeModeled: true;
  generalUnlimitedDeployAuthority: false;
  artifactEligible: boolean;
  artifactValidation: "PASS" | "FAIL";
  formBackendReady: boolean;
  analyticsBackendReady: boolean;
  secretSafety: "PASS" | "FAIL";
  customDomainAllowed: false;
  temporaryProviderUrlAllowed: boolean;
  deploymentCost: string;
  costClassification: CostClassification;
  costConfidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  estimatedCost: number | null;
  economicState: string;
  authorizedCeiling: number | null;
  withinCeiling: boolean;
  unknownCost: boolean;
  unknownCostTreatedAsZero: false;
  founderAuthorizationRecognized: boolean;
  economicAuthorizationKind: "NONE" | "BOUNDED_BY_FOUNDER_AUTHORIZATION" | "TREASURY_KNOWN_COST";
  withinAuthorization: boolean;
  reusableCapabilityVerification: boolean;
  unverifiedCapabilitiesGranted: false;
  providerVerificationStatus: string;
  verifiedCapabilities: string[];
  deployInputCompatible: boolean;
  newCapabilityRequired: boolean;
  newCapabilityVerified: boolean;
  vercelPackageSupport: "SUPPORTED" | "UNSUPPORTED_CAPABILITY";
  hardcodedDenied: false;
  blocker: string | null;
  blockers: string[];
  executionScope: {
    candidateId: string;
    experimentId: string;
    artifactId: string;
    purpose: DeploymentPurpose;
    provider: "vercel";
    capability: string;
    nonce: string | null;
  };
};

export type PreDeployGate = {
  ok: boolean;
  candidateDecision: string;
  validationArtifactAuthority: boolean;
  fullProductBuildAuthority: false;
  experimentArtifactValid: boolean;
  providerCapability: string;
  deploymentReadiness: string;
  eag: string;
  deploymentCost: string;
  withinAuthorization: boolean;
  domainRequired: false;
  dnsRequired: false;
  paymentsRequired: false;
  treasuryRequired: false;
  adSpendRequired: false;
  failed: string[];
  purpose: DeploymentPurpose;
  costClassification: CostClassification;
  unknownCostTreatedAsZero: false;
  formBackendReady: boolean;
  analyticsBackendReady: boolean;
  secretSafety: "PASS" | "FAIL";
  artifactEligible: boolean;
  reusableProviderCapability: boolean;
  generalUnlimitedDeployAuthority: false;
  blocker: string | null;
};

export type ExperimentExecutionResult = {
  experiment: MarketValidationExperiment;
  fullProductAuthorization: string;
  validationArtifactAuthorization: string;
  buildReady: false;
  decision: "VALIDATE";
  artifactResult: ExecutionResult | null;
  artifact: VentureBuildArtifact | null;
  artifactValidation: ArtifactValidationResult | null;
  handoff: ProductionArtifactHandoff | null;
  deploymentReadiness: GovernedDeploymentReadiness | null;
  preDeployGate: PreDeployGate;
  deployed: boolean;
  provider: string | null;
  project: string | null;
  deploymentId: string | null;
  url: string | null;
  customDomain: false;
  state: ExperimentState;
  evidenceCollection: "STARTED" | "NOT_STARTED";
  counts: ExperimentCounts;
  outcome: ExperimentOutcome | null;
  wtpEvidence: WtpLevel;
  observedPayment: false;
  fakeRevenue: false;
  fakeCustomer: false;
  fakePayment: false;
  readyForFirstRealAutonomousBuild: false;
  fullProductBuildExecuted: false;
  rooms: Array<{ roomId: string; state: string; drivenByTaskId: string }>;
  trafficPlanCompiled: true;
  trafficPlanExecuted: false;
  writeBoundary: typeof import("./constants").WRITE_BOUNDARY;
  authorization: ValidationArtifactDeploymentAuthorization;
  deploymentCount: number;
  blocker: string | null;
};

export type LockedCriteria = typeof LOCKED_SUCCESS_CRITERIA;
