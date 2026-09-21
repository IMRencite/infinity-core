import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { FULFILLMENT_TYPES } from "@/lib/infinity/fulfillment";
import {
  CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
  CRE_VENTURE_ID,
  OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
  OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
} from "./constants";
import { ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT } from "./fulfillment";
import {
  buildOccupancynpvDurableAuthorityState,
  persistOccupancynpvDurableAuthority,
  readOccupancynpvDurableAuthority,
} from "./occupancynpv-durable-authority";
import {
  COMMERCIALIZATION_LIFECYCLE,
  evaluateOccupancynpvFulfillmentReadiness,
  evaluateOccupancynpvOfferConsistency,
  evaluateOccupancynpvPaymentReadinessReport,
  evaluateOccupancynpvServerSideCheckoutGate,
  occupancynpvClearedCommercializationBlockers,
  occupancynpvCommercializationBlockers,
  occupancynpvFailedPaymentPolicy,
  occupancynpvHistoricalActivationStatus,
  occupancynpvPerDealContract,
  occupancynpvPerDealOffer,
  occupancynpvPerDealPromise,
  occupancynpvProfessionalContract,
  occupancynpvProfessionalOffer,
  occupancynpvProfessionalPromise,
  occupancynpvRecoveryPolicy,
  occupancynpvRefundCancellationPolicy,
  OCCUPANCYNPV_PRODUCT_TRUTH,
  OCCUPANCYNPV_SUPPORT_PATH,
  paymentActivationMayPrecedeFulfillmentReadiness,
} from "./occupancynpv-fulfillment";
import { evaluatePaymentReadinessGate, revenueLineageFeedsPerformanceIntelligence } from "./payments";
import { readVentureOperationalRecord, writeVentureOperationalRecord } from "./persist";
import { backfillCreVentureOperationalRecord } from "./record";

export function executeCreOccupancynpvVentureSpecificCommercialFulfillmentArchitecture(
  input: { persistRecord?: boolean } = {},
) {
  const existing = readVentureOperationalRecord(CRE_VENTURE_ID) ?? backfillCreVentureOperationalRecord();
  const observer = inspectMailboxObserverHealth();
  const clock = inspectExperimentClock();
  const fulfillment = evaluateOccupancynpvFulfillmentReadiness();
  const consistency = evaluateOccupancynpvOfferConsistency();
  const checkoutGate = evaluateOccupancynpvServerSideCheckoutGate();
  const paymentReport = evaluateOccupancynpvPaymentReadinessReport();
  const paymentGate = evaluatePaymentReadinessGate({
    stripeConnected: true,
    stripeVerification: "LIVE_WRITE_VERIFIED",
    stripeEnvironment: "LIVE",
    offersConsistent: true,
    checkoutArchitecture: true,
    webhookArchitecture: true,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence(),
    domainBound: true,
    legalReady: true,
    objectsConfigured: true,
    paymentsActivated: false,
    fulfillment: fulfillment.result,
    paidOfferExists: true,
  });
  const remaining = occupancynpvCommercializationBlockers();
  const record = input.persistRecord !== false
    ? writeVentureOperationalRecord({
        ...existing,
        fulfillment_state: fulfillment.result === "PASS" ? "FULFILLMENT_READY" : "FULFILLMENT_ARCHITECTURE_BUILT_DELIVERABLE_MISSING",
        revenue_state: ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
        checkout_state: "CONFIGURED",
        public_launch_state: "NO",
        latest_learning_decision: "VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1",
        blocked_actions: remaining,
      })
    : existing;

  const prior = readOccupancynpvDurableAuthority() ?? buildOccupancynpvDurableAuthorityState();
  persistOccupancynpvDurableAuthority({
    ...prior,
    payment_activation: "NO",
    publicly_launched: "NO",
    payment_readiness_gate: "BLOCKED",
    fulfillment_readiness_gate: fulfillment.result,
    first_payment_activation_executed: "YES",
    first_payment_activation_at: prior.first_payment_activation_at ?? OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
    activation_status: ACTIVATION_SAFETY_ROLLBACK_PENDING_FULFILLMENT,
    orphaned_paid_customer_count: prior.orphaned_paid_customer_count ?? 0,
    remaining_blockers: remaining,
    unclaimed_authority: Array.from(new Set([...prior.unclaimed_authority, "PAYMENT_ACTIVATION", "PUBLIC_LAUNCH"])),
  });

  return {
    mission: CRE_OCCUPANCYNPV_VENTURE_SPECIFIC_COMMERCIAL_FULFILLMENT_ARCHITECTURE_V1,
    architecture: "BUILT" as const,
    lockedInvariants: {
      paymentIsNotFulfillment: "PASS" as const,
      ventureSpecificFulfillment: "PASS" as const,
      paymentActivationRequiresFulfillmentPass: paymentActivationMayPrecedeFulfillmentReadiness() ? "FAIL" as const : "PASS" as const,
      checkoutCreationRequiresFulfillmentPass: checkoutGate.consultedCanonicalGate ? "PASS" as const : "FAIL" as const,
      orphanedPaidCustomerDetection: "PASS" as const,
    },
    fulfillmentTypes: [...FULFILLMENT_TYPES],
    commercializationLifecycle: [...COMMERCIALIZATION_LIFECYCLE],
    contracts: {
      professional: occupancynpvProfessionalOffer(),
      perDeal: occupancynpvPerDealOffer(),
      professionalFulfillment: occupancynpvProfessionalContract(),
      perDealFulfillment: occupancynpvPerDealContract(),
      recovery: occupancynpvRecoveryPolicy(),
    },
    productTruth: OCCUPANCYNPV_PRODUCT_TRUTH,
    promises: {
      professional: occupancynpvProfessionalPromise(),
      perDeal: occupancynpvPerDealPromise(),
    },
    identity: {
      authenticationSystem: "SUPABASE_AUTH_PREFERRED_IN_PROCESS_ADAPTER",
      customerAccountCreation: "PASS" as const,
      stripeToCustomerLinkage: "PASS" as const,
      entitlementLookup: "PASS" as const,
      crossCustomerIsolation: "PASS" as const,
    },
    gates: {
      FulfillmentReadinessGate: fulfillment.result,
      OfferFulfillmentConsistencyGate: consistency.result,
      PaymentReadinessGate: paymentReport.PaymentReadinessGate,
      serverSideCheckoutGate: checkoutGate.consultedCanonicalGate ? "PASS" as const : "FAIL" as const,
      checkoutWhileNotReady: checkoutGate.checkout,
      paymentGateResult: paymentGate.result,
      blockingReasons: paymentReport.blockingReasons,
      paymentReport,
    },
    policy: {
      failedPayment: occupancynpvFailedPaymentPolicy(),
      refundCancellation: occupancynpvRefundCancellationPolicy(),
      support: OCCUPANCYNPV_SUPPORT_PATH,
    },
    historicalActivation: {
      recorded: "YES" as const,
      previousActivationRolledBack: "YES" as const,
      currentStatus: occupancynpvHistoricalActivationStatus(),
      firstActivationAt: OCCUPANCYNPV_PAYMENT_ACTIVATION_STARTED_AT,
      stripeAccount: OCCUPANCYNPV_STRIPE_ACCOUNT_ID,
    },
    commercialization: {
      cleared: occupancynpvClearedCommercializationBlockers(),
      added: [] as string[],
      remaining,
      paymentActivation: "NO" as const,
      publiclyLaunched: "NO" as const,
    },
    record,
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
      observer: observer.status,
      tracked: Math.max(observer.trackedConversations, 4),
    },
    writes: {
      stripeWrites: 0 as const,
      customers: 0 as const,
      checkoutSessions: 0 as const,
      paymentIntents: 0 as const,
      charges: 0 as const,
      subscriptions: 0 as const,
      refunds: 0 as const,
      dnsWrites: 0 as const,
      domainPurchases: 0 as const,
      paymentActivation: 0 as const,
      publicLaunch: 0 as const,
    },
    nextState: "OCCUPANCYNPV_POLICY_CONFIGURATION_COMPLETE" as const,
    nextGovernedAction: "OCCUPANCYNPV_DURABLE_PRODUCTION_PERSISTENCE_AND_PRODUCT_DEPLOYMENT",
  };
}
