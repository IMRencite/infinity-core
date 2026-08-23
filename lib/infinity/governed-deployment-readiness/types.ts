import type { ArchitectureCost } from "@/lib/infinity/venture-systems-architecture/types";
import type { PaymentArchitectureBuildContract } from "@/lib/infinity/payment-architecture/build-contract";
import type { ProductionArtifactHandoff } from "@/lib/infinity/production-artifact/handoff";
import type {
  DeploymentActionType,
  DeploymentProviderCapability,
  DeploymentReadinessFailureCode,
  DimensionStatus,
  EagReadinessStatus,
  GOVERNED_DEPLOYMENT_WRITE_BOUNDARY,
  GovernedDeploymentState,
  TreasuryReadinessStatus,
} from "./constants";

export type DeploymentReadinessBlocker = {
  code: DeploymentReadinessFailureCode;
  message: string;
  capability?: DeploymentProviderCapability | null;
  actionType?: DeploymentActionType | null;
  identifier?: string | null;
};

export type AuthorityGrant = {
  granted: boolean;
  authorizationId: string | null;
  source: string | null;
};

export type ProviderReadinessRow = {
  capability: DeploymentProviderCapability;
  providerSelected: boolean;
  verificationState: "NONE" | "READ_ONLY_VERIFIED" | "FAILED" | "UNVERIFIED";
  providerAvailable: boolean;
  providerVerified: boolean;
  credentialAvailable: boolean;
  credentialWriteCapable: boolean;
  writeAuthorityGranted: boolean;
  tenancy: string | null;
  procurementRequired: boolean;
  cost: ArchitectureCost;
  costKnown: boolean;
  blockingState: DimensionStatus;
};

export type TreasuryReadiness = {
  status: TreasuryReadinessStatus;
  costKnown: boolean;
  expectedCostUsd: number | null;
  oneTimeCostUsd: number | null;
  recurringCostUsd: number | null;
  budgetRequired: boolean;
  budgetAvailableUsd: number | null;
  reservationRequired: boolean;
  procurementRequired: boolean;
  renewalImplications: string | null;
};

export type DomainReadiness = {
  status: DimensionStatus;
  domainRequired: boolean;
  alreadyOwned: boolean;
  selected: boolean;
  registrarKnown: boolean;
  purchaseRequired: boolean;
  renewalCostKnown: boolean;
  dnsProviderKnown: boolean;
  writeAuthorityKnown: boolean;
  availabilityClaimedWithoutEvidence: false;
};

export type DnsReadiness = {
  status: DimensionStatus;
  providerKnown: boolean;
  zoneExists: boolean;
  zoneVerified: boolean;
  writeCredentialAvailable: boolean;
  writeAuthorityGranted: boolean;
  requiredRecordsKnown: boolean;
  tlsDependency: boolean;
  readOnlyOnly: boolean;
};

export type HostingReadiness = {
  status: DimensionStatus;
  capability: string | null;
  providerSelected: boolean;
  writeAuthorityGranted: boolean;
  rollbackCapable: boolean;
  cost: ArchitectureCost;
  providerNeutralCapability: "HOSTING";
};

export type DatabaseReadiness = {
  status: DimensionStatus;
  required: boolean;
  migrationsPresent: boolean;
  migrationVerification: ProductionArtifactHandoff["databaseRequirements"]["verificationStatus"];
  writeAuthorityNeeded: boolean;
  backupRollbackRequired: boolean;
  cost: ArchitectureCost;
};

export type PaymentReadiness = {
  status: DimensionStatus;
  required: boolean;
  architectureKind: string | null;
  connectRequired: boolean;
  webhookRequired: boolean;
  writeCredentialRequired: boolean;
  writeAuthorized: boolean;
  liveWriteAuthority: false;
  readOnlyVerificationGrantsWrites: false;
};

export type AuthorizationMatrixRow = {
  actionType: DeploymentActionType;
  capability: DeploymentProviderCapability;
  requiresTreasury: boolean;
  requiresEag: boolean;
  requiresWriteCredential: boolean;
  requiresProcurement: boolean;
  costKnown: boolean;
  currentlyAuthorized: boolean;
  blockingReason: DeploymentReadinessFailureCode | null;
};

export type DeploymentExecutionRequestDraft = {
  status: "DRAFT";
  executable: false;
  ventureId: string;
  readinessId: string;
  handoffId: string | null;
  requiredActions: DeploymentActionType[];
  requiredAuthorities: Array<{ kind: "TREASURY" | "EAG" | "WRITE_CREDENTIAL" | "DEPLOYMENT" | "PUBLIC_LAUNCH"; present: boolean }>;
  providerBindings: string[];
  deploymentRequirements: ProductionArtifactHandoff["deploymentRequirements"] | null;
  rollbackRequirements: { required: boolean; strategyKnown: boolean };
  healthCheckRequirements: { required: boolean; path: string | null };
};

export type GovernedDeploymentHqView = {
  deploymentReadiness: "BLOCKED" | "READY";
  technical: "PASS" | "FAIL";
  artifacts: "PASS" | "FAIL";
  providerWrites: "MISSING" | "GRANTED" | "NOT_REQUIRED";
  budget: "READY" | "MISSING" | "UNKNOWN" | "NOT_REQUIRED";
  domain: "REQUIRED" | "OWNED" | "NOT_REQUIRED" | "MISSING";
  dns: "READ_ONLY_ONLY" | "WRITE_READY" | "NOT_REQUIRED" | "MISSING";
  deploymentAuthority: "NONE" | "GRANTED";
  publicLaunchAuthority: "NONE" | "GRANTED";
};

export type GovernedDeploymentReadiness = {
  schemaVersion: "governed_deployment_readiness_v1";
  readinessId: string;
  ventureId: string;
  companyId: string | null;
  productionArtifactHandoffId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string | null;
  state: GovernedDeploymentState;
  technicalReadiness: DimensionStatus;
  artifactReadiness: DimensionStatus;
  runtimeReadiness: DimensionStatus;
  providerReadiness: DimensionStatus;
  credentialReadiness: DimensionStatus;
  economicReadiness: DimensionStatus;
  treasuryReadiness: TreasuryReadiness;
  externalActionReadiness: EagReadinessStatus;
  domainReadiness: DomainReadiness;
  dnsReadiness: DnsReadiness;
  hostingReadiness: HostingReadiness;
  databaseReadiness: DatabaseReadiness;
  paymentReadiness: PaymentReadiness;
  securityComplianceReadiness: DimensionStatus;
  rollbackReadiness: DimensionStatus;
  healthCheckReadiness: DimensionStatus;
  providerRows: ProviderReadinessRow[];
  blockers: DeploymentReadinessBlocker[];
  warnings: DeploymentReadinessBlocker[];
  requiredAuthorizations: AuthorizationMatrixRow[];
  readyForDeploymentExecution: boolean;
  deploymentAuthorityGranted: false | true;
  publicLaunchAuthorityGranted: false | true;
  createdAt: string;
  traceability: {
    ventureId: string;
    companyId: string | null;
    handoffId: string | null;
    buildContractId: string | null;
    ventureSystemsBuildContractId: string | null;
  };
  executionDraft: DeploymentExecutionRequestDraft;
  writeBoundary: typeof GOVERNED_DEPLOYMENT_WRITE_BOUNDARY;
};

export type ProviderEvidence = {
  capability: DeploymentProviderCapability;
  providerSelected?: boolean;
  verificationState?: ProviderReadinessRow["verificationState"];
  credentialAvailable?: boolean;
  credentialWriteCapable?: boolean;
  writeAuthorityGranted?: boolean;
  tenancy?: string | null;
  procurementRequired?: boolean;
  cost?: ArchitectureCost;
};

export type GovernedDeploymentReadinessInput = {
  handoff: ProductionArtifactHandoff | null;
  expectedVentureId?: string | null;
  expectedHandoffId?: string | null;
  expectedBuildContractId?: string | null;
  companyId?: string | null;
  createdAt?: string;
  treasury?: {
    budgetAvailableUsd?: number | null;
    budgetKnown?: boolean;
    reservationPresent?: boolean;
    authorizedForPaidResources?: boolean;
  };
  eag?: {
    authorizedActionTypes?: DeploymentActionType[];
    authorizationPresent?: boolean;
  };
  providers?: ProviderEvidence[];
  domain?: {
    owned?: boolean;
    selected?: boolean;
    registrarKnown?: boolean;
    purchaseRequired?: boolean;
    renewalCostKnown?: boolean;
    evidenceOfAvailability?: boolean;
  };
  dns?: {
    providerKnown?: boolean;
    zoneExists?: boolean;
    zoneVerified?: boolean;
    writeCredentialAvailable?: boolean;
    writeAuthorityGranted?: boolean;
    requiredRecordsKnown?: boolean;
  };
  hosting?: {
    providerSelected?: boolean;
    writeAuthorityGranted?: boolean;
    rollbackCapable?: boolean;
    cost?: ArchitectureCost;
  };
  paymentArchitecture?: PaymentArchitectureBuildContract | null;
  paymentWriteAuthorized?: boolean;
  healthCheckPath?: string | null;
  deploymentAuthority?: AuthorityGrant;
  publicLaunchAuthority?: AuthorityGrant;
};
