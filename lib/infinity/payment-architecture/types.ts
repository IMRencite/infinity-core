import type { MonetizationArchetypeType } from "@/lib/infinity/monetization-engine/constants";
import type { ProviderCapabilityStatus } from "@/lib/infinity/commercialization/probes/status";
import type {
  ConnectAccountType,
  ConnectWriteReadiness,
  MarketplacePaymentCapabilityId,
  MarketplacePaymentReadiness,
  PaymentArchitectureKind,
  PaymentBusinessModel,
  PaymentRequirement,
  PayoutStatus,
  SelectedPaymentArchitecture,
  UnresolvedPolicyCode,
  ValidationGapCode,
} from "./constants";

export type PaymentPartyRole = "BUYER" | "SELLER" | "PLATFORM";

export type CommissionModel = {
  kind: "PLATFORM_COMMISSION" | "TRANSACTION_FEE" | "NONE";
  takeRatePercent: number | null;
};

export type PaymentArchitectureEvidence = {
  businessModel?: PaymentBusinessModel | null;
  monetizationModelType?: MonetizationArchetypeType | string | null;
  businessModelCandidates?: string[];
  revenueMechanism?: string | null;
  pricingModel?: string | null;
  billingFrequency?: string | null;
  payer?: string | null;
  beneficiary?: string | null;
  buyerRole?: string | null;
  sellerRole?: string | null;
  listingType?: string | null;
  hasDistinctBuyers?: boolean | null;
  hasDistinctSellers?: boolean | null;
  sellersReceivePlatformPayouts?: boolean | null;
  takeRatePercent?: number | null;
  currency?: string | null;
  sellerCountryConstraints?: string[] | null;
  resolvedPolicy?: Partial<ResolvedPaymentPolicy> | null;
};

export type ResolvedPaymentPolicy = {
  connectAccountType: ConnectAccountType;
  merchantOfRecord: "PLATFORM" | "SELLER";
  sellerKycResponsibility: "PROVIDER" | "PLATFORM";
  refundLiability: "PLATFORM" | "SELLER" | "SPLIT";
  disputeLiability: "PLATFORM" | "SELLER" | "SPLIT";
  negativeSellerBalances: "ALLOWED" | "FORBIDDEN";
  payoutSchedule: string;
  crossBorderSellers: "SUPPORTED" | "UNSUPPORTED";
  taxResponsibility: "PLATFORM" | "SELLER" | "PROVIDER";
};

export type UnresolvedPolicyRequirement = {
  code: UnresolvedPolicyCode;
  question: string;
  requiredForLiveWrite: true;
};

export type PaymentProviderCandidate = {
  providerId: string;
  providerName: string;
  capability: MarketplacePaymentCapabilityId | "DIRECT_PAYMENTS" | "RECURRING_BILLING" | "USAGE_BILLING";
  implementation: SelectedPaymentArchitecture;
  preferred: boolean;
};

export type PaymentArchitectureSelection = {
  businessModel: PaymentBusinessModel;
  architectureKind: PaymentArchitectureKind;
  selectedArchitecture: SelectedPaymentArchitecture;
  requiredCapabilities: PaymentRequirement[];
  providerCandidates: PaymentProviderCandidate[];
  connectAccountType: ConnectAccountType | "REQUIRES_PLATFORM_POLICY_CHOICE";
  unresolvedPolicy: UnresolvedPolicyRequirement[];
  liveWriteAuthorityRequired: false;
  testModeRequired: true;
};

export type MarketplaceMoneyFlow = {
  gmvUsd: number;
  platformRevenueUsd: number;
  sellerEarningsUsd: number;
  processorFeeUsd: number;
  refundAmountUsd: number;
  disputeAmountUsd: number;
  payoutStatus: PayoutStatus;
};

export type PaymentValidationGap = {
  code: ValidationGapCode;
  message: string;
};

export type ConnectWriteReadinessReport = {
  stripeVerification: ProviderCapabilityStatus | "UNKNOWN";
  connectWriteReadiness: ConnectWriteReadiness;
  marketplacePaymentReadiness: MarketplacePaymentReadiness;
  liveWriteAuthority: false;
  readOnlyVerificationGrantsConnectWrites: false;
};

export type PaymentArchitectureHqReadModel = {
  businessModel: PaymentBusinessModel;
  architecture: SelectedPaymentArchitecture;
  marketplacePaymentReadiness: MarketplacePaymentReadiness;
  requiredCapabilities: PaymentRequirement[];
  unresolvedPolicyDecisions: UnresolvedPolicyCode[];
  liveWriteAuthority: false;
};

export type PaymentPartyModel = {
  role: PaymentPartyRole;
  label: string;
};
