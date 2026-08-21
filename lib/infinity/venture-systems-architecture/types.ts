import type { PaymentArchitectureBuildContract } from "@/lib/infinity/payment-architecture/build-contract";
import type { PaymentArchitectureEvidence } from "@/lib/infinity/payment-architecture/types";
import type {
  AnalyticsEvent,
  CommunicationCapability,
  ComplianceRequirement,
  ContentCapability,
  CrmCapability,
  IdentityModel,
  LifecycleEvent,
  ProcurementStatus,
  ProviderCategory,
  ReputationCapability,
  SchedulingCapability,
  SecurityRequirement,
  SeoCapability,
  SupportCapability,
  SystemCapability,
  SystemFamily,
  SystemPriority,
  TenancyStrategy,
  UnresolvedSystemPolicyCode,
  VentureOperatingModel,
  VentureStage,
} from "./constants";

export type CostActuality = "ACTUAL" | "ESTIMATE" | "UNKNOWN";

export type ArchitectureCost = {
  value: number | null;
  actuality: CostActuality;
  currency: "USD";
};

export type DataSensitivity = "LOW" | "STANDARD" | "HIGH" | "REGULATED";

export type SeoStrategyInput = {
  primaryAcquisitionChannel?: boolean | null;
  locationArchitecture?: boolean | null;
  serviceArchitecture?: boolean | null;
  programmaticSeo?: boolean | null;
  organizationPlanId?: string | null;
};

export type TreasuryBudgetInput = {
  monthlySoftwareBudgetUsd: number | null;
  actuality: CostActuality;
  currency: "USD";
};

export type ProviderCandidateQuote = {
  providerId: string;
  providerName: string;
  category: ProviderCategory;
  requiredCapabilities: SystemCapability[];
  estimatedMonthlyCostUsd: number | null;
  costActuality: CostActuality;
  freeTierAdequate: boolean;
  apiCapable: boolean;
  preferred: boolean;
};

export type VentureSystemsEvidence = {
  ventureId?: string | null;
  operatingModel?: VentureOperatingModel | null;
  productKind?: string | null;
  ventureType?: string | null;
  businessConcept?: string | null;
  businessModelCandidates?: string[];
  monetizationModelType?: string | null;
  primaryConversion?: string | null;
  hasPhysicalGoods?: boolean | null;
  hasLocalServiceArea?: boolean | null;
  hasDistinctBuyers?: boolean | null;
  hasDistinctSellers?: boolean | null;
  seoIsPrimaryAcquisition?: boolean | null;
  seoStrategy?: SeoStrategyInput | null;
  needsLocalization?: boolean | null;
  smsRequired?: boolean | null;
  depositPayment?: boolean | null;
  finalPayment?: boolean | null;
  entitlementUnit?: string | null;
  paymentEvidence?: PaymentArchitectureEvidence | null;
  paymentContract?: PaymentArchitectureBuildContract | null;
  ventureStage?: VentureStage | null;
  dataSensitivity?: DataSensitivity | null;
  regulatedIndustry?: boolean | null;
  spinoutLikelihood?: "LOW" | "MEDIUM" | "HIGH" | null;
  expectedScale?: "SMALL" | "MEDIUM" | "LARGE" | null;
  treasuryBudget?: TreasuryBudgetInput | null;
  providerQuotes?: ProviderCandidateQuote[] | null;
  dedicatedIsolationValuable?: boolean | null;
};

export type UnresolvedSystemPolicy = {
  code: UnresolvedSystemPolicyCode;
  question: string;
  requiredForLiveProvisioning: true;
};

export type VentureSystemRequirement = {
  family: SystemFamily;
  required: boolean;
  priority: SystemPriority;
  reason: string;
  requiredCapabilities: SystemCapability[];
  optionalCapabilities: SystemCapability[];
  dependencies: SystemFamily[];
  providerNeeded: boolean;
  tenancyRequirement: TenancyStrategy;
  liveExecutionRequired: false;
  unresolvedPolicies: UnresolvedSystemPolicyCode[];
};

export type VentureProviderRequirement = {
  ventureId: string | null;
  providerCategory: ProviderCategory;
  requiredCapabilities: SystemCapability[];
  tenancyStrategy: TenancyStrategy;
  dedicatedRequired: boolean;
  reason: string;
  estimatedMonthlyCost: ArchitectureCost;
  billingOwner: "VENTURE" | "PLATFORM" | "UNASSIGNED";
  liveProvisioningAuthorityRequired: false;
};

export type VendorProcurementRequirement = {
  providerId: string | null;
  providerName: string | null;
  providerCategory: ProviderCategory;
  plan: string | null;
  monthlyCost: ArchitectureCost;
  annualCost: ArchitectureCost;
  setupFee: ArchitectureCost;
  trialAvailable: boolean | null;
  trialEnd: string | null;
  renewalInterval: "MONTHLY" | "ANNUAL" | "UNKNOWN";
  autoRenewAllowed: false;
  ventureBudget: ArchitectureCost;
  budgetOwner: "VENTURE" | "PLATFORM" | "UNASSIGNED";
  spendCeiling: ArchitectureCost;
  cancellationPolicyKnown: boolean;
  requiredCapabilities: SystemCapability[];
  alternatives: string[];
  expectedValue: string;
  procurementStatus: ProcurementStatus;
  livePurchaseAuthority: false;
};

export type BuildDependencyNode = {
  family: SystemFamily;
  dependsOn: SystemFamily[];
};

export type IdentityArchitecture = {
  models: IdentityModel[];
  roleBasedAccess: boolean;
  multiTenant: boolean;
};

export type CrmArchitecture = {
  required: boolean;
  capabilities: CrmCapability[];
  pipelineModeled: boolean;
  leadLifecycleModeled: boolean;
};

export type CommunicationsArchitecture = {
  transactionalEmail: boolean;
  marketingEmail: boolean;
  sms: boolean;
  smsOptional: boolean;
  nurture: boolean;
  reviewRequests: boolean;
  capabilities: CommunicationCapability[];
};

export type AnalyticsArchitecture = {
  events: AnalyticsEvent[];
  attribution: boolean;
  leads: boolean;
  revenue: boolean;
  retention: boolean;
  performanceIntelligenceIsCanonical: true;
};

export type SupportArchitecture = {
  capabilities: SupportCapability[];
  complexStackRequired: boolean;
};

export type SchedulingArchitecture = {
  required: boolean;
  capabilities: SchedulingCapability[];
};

export type ContentArchitecture = {
  capabilities: ContentCapability[];
  organicGrowthIsCanonical: true;
};

export type SeoArchitecture = {
  required: boolean;
  capabilities: SeoCapability[];
  organizationPlanId: string | null;
};

export type ReputationArchitecture = {
  capabilities: ReputationCapability[];
};

export type OperationsArchitecture = {
  families: SystemFamily[];
};

export type VentureSystemsBuildContract = {
  ventureType: VentureOperatingModel;
  businessModel: VentureOperatingModel;
  paymentArchitecture: PaymentArchitectureBuildContract;
  systemRequirements: VentureSystemRequirement[];
  identityArchitecture: IdentityArchitecture;
  crmArchitecture: CrmArchitecture;
  communicationsArchitecture: CommunicationsArchitecture;
  analyticsArchitecture: AnalyticsArchitecture;
  supportArchitecture: SupportArchitecture;
  schedulingArchitecture: SchedulingArchitecture;
  contentArchitecture: ContentArchitecture;
  seoArchitecture: SeoArchitecture;
  reputationArchitecture: ReputationArchitecture;
  operationsArchitecture: OperationsArchitecture;
  complianceRequirements: ComplianceRequirement[];
  securityRequirements: SecurityRequirement[];
  lifecycleAutomations: LifecycleEvent[];
  providerRequirements: VentureProviderRequirement[];
  providerTenancy: TenancyStrategy;
  vendorProcurementRequirements: VendorProcurementRequirement[];
  unresolvedPolicies: UnresolvedSystemPolicy[];
  buildDependencies: BuildDependencyNode[];
  liveAuthorityRequirements: {
    liveProvisioningAuthority: false;
    livePurchaseAuthority: false;
    cursorChoosesSystemsIndependently: false;
    infinitySuppliesSystemsArchitecture: true;
  };
};

export type VentureSystemsHqReadModel = {
  businessSystemBlueprint: string;
  requiredSystems: SystemFamily[];
  missingSystems: SystemFamily[];
  providerCandidates: ProviderCandidateQuote[];
  tenancyStrategy: TenancyStrategy;
  paidProviderRequirements: VendorProcurementRequirement[];
  estimatedRecurringSoftwareCost: ArchitectureCost;
  unresolvedPolicyGaps: UnresolvedSystemPolicyCode[];
  liveProvisioningAuthority: false;
};
