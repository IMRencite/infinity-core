import type { PaymentArchitectureBuildContract } from "@/lib/infinity/payment-architecture/build-contract";
import type {
  SystemCapability,
  SystemFamily,
  TenancyStrategy,
} from "@/lib/infinity/venture-systems-architecture/constants";
import type {
  ArchitectureCost,
  VentureSystemsBuildContract,
} from "@/lib/infinity/venture-systems-architecture/types";

export const VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY = {
  providerAccountCreation: 0,
  providerWrites: 0,
  treasuryMovements: 0,
  purchases: 0,
  eagActions: 0,
  deployments: 0,
  domainPurchases: 0,
  dnsWrites: 0,
  paymentWrites: 0,
  publicLaunches: 0,
  validationWrites: 0,
  selectionWrites: 0,
  missionCreation: 0,
} as const;

export const VENTURE_SYSTEMS_BUILD_COVERAGE_DISPOSITIONS = [
  "INTERNAL_BUILD",
  "EXTERNAL_PROVIDER_DEPENDENCY",
  "DEFERRED",
  "BLOCKED",
  "OPTIONAL_EXCLUDED",
] as const;

export type VentureSystemsBuildCoverageDisposition =
  (typeof VENTURE_SYSTEMS_BUILD_COVERAGE_DISPOSITIONS)[number];

export const VENTURE_SYSTEMS_BUILD_FAILURE_CODES = [
  "VENTURE_SYSTEMS_CONTRACT_MISSING",
  "VENTURE_SYSTEM_REQUIRED_OMITTED",
  "VENTURE_SYSTEM_LINEAGE_MISMATCH",
  "VENTURE_SYSTEM_DEFERRED_NOT_AUTHORIZED",
  "VENTURE_SYSTEM_PROVIDER_DEPENDENCY_UNRESOLVED",
  "VENTURE_SYSTEM_COMPLIANCE_BLOCKED",
  "VENTURE_SYSTEM_PAYMENT_ARCHITECTURE_MISSING",
  "VENTURE_SYSTEM_UNKNOWN_COST",
  "VENTURE_SYSTEM_TASK_ORPHANED",
  "VENTURE_SYSTEM_UNKNOWN_FAMILY",
  "VENTURE_SYSTEM_OPTIONAL_PROMOTED",
] as const;

export type VentureSystemsBuildFailureCode = (typeof VENTURE_SYSTEMS_BUILD_FAILURE_CODES)[number];

export type BoundVentureSystemsBuildInput = {
  ventureId: string;
  companyId: string | null;
  missionId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string;
  contract: VentureSystemsBuildContract;
};

export type VentureSystemsExternalDependency = {
  systemFamily: SystemFamily;
  requiredCapabilities: SystemCapability[];
  providerStatus: "REQUIRED" | "CANDIDATE" | "UNRESOLVED" | "NOT_SELECTED";
  tenancyRequirement: TenancyStrategy;
  procurementRequired: boolean;
  credentialRequired: boolean;
  writeAuthorityRequired: false;
  estimatedCost: ArchitectureCost;
  costKnown: boolean;
  blockingStatus: "NONE" | "UNKNOWN_COST" | "PROCUREMENT_REQUIRED" | "POLICY";
};

export type VentureSystemsCoverageRow = {
  family: SystemFamily;
  required: boolean;
  disposition: VentureSystemsBuildCoverageDisposition;
  requiredCapabilities: SystemCapability[];
  tenancyRequirement: TenancyStrategy;
  providerNeeded: boolean;
  externalDependency: VentureSystemsExternalDependency | null;
  authorizedForImplementation: boolean;
  failureCodes: VentureSystemsBuildFailureCode[];
  reason: string;
};

export type VentureSystemsBuildCoveragePlan = {
  input: BoundVentureSystemsBuildInput;
  rows: VentureSystemsCoverageRow[];
  paymentArchitecture: PaymentArchitectureBuildContract | null;
  writeBoundary: typeof VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY;
};

export type ArchitectureCodingTaskContext = {
  ventureId: string;
  companyId: string | null;
  missionId: string | null;
  buildContractId: string | null;
  ventureSystemsBuildContractId: string;
  systemFamily: SystemFamily;
  requiredCapabilities: SystemCapability[];
  architectureConstraints: string[];
  tenancyRequirement: TenancyStrategy;
  paymentArchitectureKind: string | null;
  acceptanceCriteria: string[];
};

export type VentureSystemsBuildCoverageHqView = {
  requiredSystems: number;
  plannedInternally: number;
  externalDependencies: number;
  deferred: number;
  blocked: number;
  optionalExcluded: number;
};

export type VentureSystemsBuildFailure = {
  code: VentureSystemsBuildFailureCode;
  family: SystemFamily | null;
  message: string;
};

export type VentureSystemsBuildCoverageValidation = {
  ok: boolean;
  failures: VentureSystemsBuildFailure[];
  coverage: VentureSystemsBuildCoverageHqView;
};

export const EXTERNAL_CHANNEL_FAMILIES: readonly SystemFamily[] = [
  "TRANSACTIONAL_EMAIL",
  "MARKETING_EMAIL",
  "SMS",
] as const;
