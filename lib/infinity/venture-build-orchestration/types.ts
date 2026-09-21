import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import type { GovernedDeploymentReadiness } from "@/lib/infinity/governed-deployment-readiness/types";
import type { SystemFamily } from "@/lib/infinity/venture-systems-architecture/constants";
import type {
  BUILD_AUTHORIZATION_RESULTS,
  BUILD_EXECUTION_STATUSES,
  EXECUTABLE_PHASES,
  EXECUTABLE_PLAN_KINDS,
  TASK_STATUSES,
} from "./constants";

export type BuildAuthorizationResult = (typeof BUILD_AUTHORIZATION_RESULTS)[number];
export type ExecutablePlanKind = (typeof EXECUTABLE_PLAN_KINDS)[number];
export type ExecutablePhase = (typeof EXECUTABLE_PHASES)[number];
export type BuildExecutionStatus = (typeof BUILD_EXECUTION_STATUSES)[number];
export type ExecutableTaskStatus = (typeof TASK_STATUSES)[number];

export type BuildAuthorization = {
  result: BuildAuthorizationResult;
  buildReady: boolean;
  decision: string;
  blocker: string | null;
  nextGovernedStep: string;
  reasons: string[];
};

export type FooterAttributionRequirement = {
  required: true;
  copy: "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR";
  infinityOsLabel: "An Infinity OS Venture";
  infinityOsUrl: "https://imros.io";
  imrLabel: "By IMR";
  imrUrl: "https://infinitemediaresources.com";
  privacyLabel: "Privacy Policy";
  privacyHref: "/privacy-policy/";
  termsLabel: "Terms of Service";
  termsHref: "/terms-of-service/";
  sitemapLabel: "Sitemap";
  sitemapHref: "/sitemap.xml";
  visible: true;
  crawlable: true;
  nofollowDefault: false;
  whiteLabelOverride: false;
};

export type VentureProductRequirements = {
  targetCustomer: string;
  jtbd: string;
  problem: string;
  corePromise: string;
  mvpScope: string[];
  mustHaveFeatures: string[];
  differentiators: string[];
  tableStakes: string[];
  doNotCopy: string[];
  pricingModel: string | null;
  customerWorkflow: string;
  successCriteria: string[];
  validationRequirements: string[];
};

export type VentureSystemsRequirement = {
  family: SystemFamily | string;
  concern: string;
  required: boolean;
  reason: string;
  ventureSpecific: true;
  platformCapabilityNote: string;
};

export type VentureSystemsRequirements = {
  items: VentureSystemsRequirement[];
};

export type VentureMonetizationRequirements = {
  model: string;
  pricing: string;
  tiers: string[];
  setupFee: string | null;
  subscription: string | null;
  transactionModel: string | null;
  managedServiceOption: string | null;
  addOns: string[];
  billingCadence: string | null;
  trial: string | null;
  paymentsNeeded: boolean;
  livePaymentActivation: false;
};

export type PublicWebsiteRequirements = {
  footerAttribution: FooterAttributionRequirement;
};

export type ArtifactContract = {
  artifactType: "nextjs_web_product";
  role: "full_product" | "validation_landing";
  requiredFiles: string[];
  requiredCapabilities: string[];
  functionalRequirements: string[];
  brandRequirements: string[];
  footerRequirements: FooterAttributionRequirement;
  validationCriteria: string[];
  securityCriteria: string[];
  buildCommand: string;
  expectedRuntime: string;
};

export type TraceabilityRef = {
  candidateId: string | null;
  researchIds: string[];
  monetizationPlanId: string | null;
  selectionId: string | null;
  assemblyId: string | null;
  planId: string;
  missionId: string | null;
  taskIds: string[];
  artifactId: string | null;
  validationId: string | null;
  handoffId: string | null;
};

export type CapabilityRoute = {
  capability: string;
  requiredCapabilityKey: string;
  roomId: DepartmentId;
  providerNeutral: true;
};

export type ExecutableTask = {
  taskId: string;
  phase: ExecutablePhase;
  purpose: string;
  inputs: string[];
  requiredCapability: string;
  capabilityRoute: CapabilityRoute;
  dependencies: string[];
  expectedArtifact: string;
  validation: string;
  status: ExecutableTaskStatus;
  economicBoundary: {
    estimatedCostUsd: number | null;
    costKnown: boolean;
    unknownCostTreatedAsZero: false;
    externalSpendAuthorized: false;
  };
  externalAuthorityRequired: boolean;
  traceability: {
    planId: string;
    ventureId: string;
    candidateId: string | null;
  };
};

export type ExecutablePhaseNode = {
  phase: ExecutablePhase;
  purpose: string;
  taskIds: string[];
};

export type ExecutableVenturePlan = {
  schemaVersion: "executable_venture_plan_v1";
  planId: string;
  planVersion: number;
  kind: ExecutablePlanKind;
  ventureId: string;
  candidateId: string | null;
  selectionId: string | null;
  organizationId: string;
  buildAuthorization: BuildAuthorization;
  ventureRequirements: {
    name: string;
    customer: string;
    problem: string;
    promise: string;
  };
  productRequirements: VentureProductRequirements;
  systemsRequirements: VentureSystemsRequirements;
  monetizationRequirements: VentureMonetizationRequirements;
  growthRequirements: {
    organicRequired: boolean;
    creativeMediaRequired: boolean;
    qualityOverUrlCount: true;
  };
  footerRequirements: FooterAttributionRequirement;
  phases: ExecutablePhaseNode[];
  tasks: ExecutableTask[];
  dependencies: Array<{ from: string; to: string }>;
  capabilityRoutes: CapabilityRoute[];
  validationGates: string[];
  artifactRequirements: ArtifactContract;
  deploymentPrerequisites: string[];
  traceability: TraceabilityRef;
  status: BuildExecutionStatus;
  publicLaunch: false;
};

export type VentureBuildPackage = {
  schemaVersion: "venture_build_package_v1";
  packageId: string;
  packageVersion: number;
  identity: {
    ventureId: string;
    candidateId: string | null;
    name: string;
  };
  requirements: VentureProductRequirements;
  mvpScope: string[];
  systemsArchitecture: VentureSystemsRequirements;
  monetization: VentureMonetizationRequirements;
  designRequirements: string[];
  contentGrowthRequirements: string[];
  publicWebsite: PublicWebsiteRequirements;
  taskGraph: Array<{ taskId: string; phase: ExecutablePhase; dependencies: string[] }>;
  validationRules: string[];
  artifactContract: ArtifactContract;
  traceability: TraceabilityRef;
};

export type GeneratedArtifactFile = {
  path: string;
  content: string;
};

export type ArtifactLineage = {
  predecessorArtifactId: string | null;
  predecessorDigest: string | null;
  repairReason: string | null;
  failedDeploymentId: string | null;
  failedProject: string | null;
  generationContract: string;
};

export type VentureBuildArtifact = {
  artifactId: string;
  artifactVersion: number;
  artifactType: "nextjs_web_product";
  ventureId: string;
  planId: string;
  packageId: string;
  workspaceReference: string;
  files: GeneratedArtifactFile[];
  realProductArtifact: true;
  lineage?: ArtifactLineage;
};

export type ArtifactValidationResult = {
  validationId: string;
  typecheck: "PASS" | "FAIL" | "NOT_APPLICABLE";
  tests: "PASS" | "FAIL";
  build: "PASS" | "FAIL";
  artifactContract: "PASS" | "FAIL";
  footer: "PASS" | "FAIL" | "NOT_APPLICABLE";
  secretSafety: "PASS" | "FAIL";
  buildCompleteDependencySet: "PASS" | "FAIL";
  passed: boolean;
  failures: string[];
};

export type RepairAttempt = {
  repairVersion: number;
  failureReason: string;
  repairCostUsd: number | null;
  costKnown: boolean;
  changes: string[];
  validationPassed: boolean;
};

export type ExternalActionCounts = {
  deployments: 0;
  domains: 0;
  dns: 0;
  payments: 0;
  treasuryMovement: 0;
  adSpend: 0;
};

export type CompileInput = {
  organizationId: string;
  ventureId: string;
  candidateId: string | null;
  selectionId: string | null;
  name: string;
  purpose?: "FULL_PRODUCT" | "VALIDATION_ARTIFACT";
  decision: string;
  buildReady: boolean;
  buildReadyReason: string;
  evidence: {
    customerPain: boolean;
    competition: boolean;
    monetization: boolean;
    research: boolean;
    missing: string[];
  };
  economics: {
    known: boolean;
    placeholder: boolean;
  };
  policyBlocked: boolean;
  policyReasons: string[];
  alreadyBuilding: boolean;
  alreadyBuilt: boolean;
  product: VentureProductRequirements;
  systems: VentureSystemsRequirements;
  monetization: VentureMonetizationRequirements;
  organicRequired: boolean;
  creativeMediaRequired: boolean;
  researchIds: string[];
  monetizationPlanId: string | null;
};

export type ExecutionResult = {
  authorization: BuildAuthorization;
  plan: ExecutableVenturePlan;
  buildPackage: VentureBuildPackage | null;
  missions: Array<{ missionId: string; purpose: string; phase: ExecutablePhase }>;
  tasks: ExecutableTask[];
  artifact: VentureBuildArtifact | null;
  validation: ArtifactValidationResult | null;
  repairs: RepairAttempt[];
  handoff: ProductionArtifactHandoff | null;
  deploymentReadiness: GovernedDeploymentReadiness | null;
  publiclyDeployed: false;
  externalActions: ExternalActionCounts;
  roomPresence: Array<{ roomId: DepartmentId; state: string; drivenByTaskId: string }>;
  writeBoundary: {
    missionWrites: number;
    ventureStateWrites: 0;
    deployments: 0;
    domainPurchases: 0;
    dnsWrites: 0;
    paymentWrites: 0;
    treasuryMovements: 0;
    adSpend: 0;
    publicLaunches: 0;
  };
};
