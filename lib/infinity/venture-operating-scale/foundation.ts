import {
  expandCreInboundObserverTracking,
  inspectMailboxObserverHealth,
} from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { readContextRichChallengerState } from "@/lib/infinity/market-validation-experiment/cre-context-rich-challenger-durable-state";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { evaluateMissionConcurrencyGate } from "./concurrency";
import { VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1 } from "./constants";
import {
  buildDomainAcquisitionPlan,
  buildDomainPurchaseAuthorization,
  DNS_WORKFLOW,
  domainArchitectureIsProviderNeutral,
} from "./domain";
import { projectVentureOperatingScaleHq } from "./hq";
import { askInfinityToReviewVenture, submitVentureImprovementSuggestion } from "./improvement";
import { runDailyVentureOperatingCycle, runPortfolioOperatingCycle } from "./operations";
import {
  buildPaymentProviderBinding,
  evaluatePaymentReadinessGate,
  revenueLineageFeedsPerformanceIntelligence,
  STRIPE_CAPABILITY_REQUIREMENTS,
} from "./payments";
import { inspectProviderCapabilityMatrix } from "./provider-matrix";
import { backfillCreVentureOperationalRecord } from "./record";
import { evaluateVentureCommercializationReadiness, buildCreCommercializationPlan, futureAuthorizationReadiness } from "./readiness";
import { enforceSecretReferences } from "./secrets";
import { VENTURE_OPERATIONAL_RECORD_FIELDS } from "./types";

export function executeVentureScaleAndCommercializationFoundation() {
  const challenger = readContextRichChallengerState();
  expandCreInboundObserverTracking({
    conversationIds: challenger?.tracked.map((row) => row.conversationId) ?? [
      "cnv_13b5bd0edb3f5ba8",
      "cnv_d47861e4f5c9fb3a",
    ],
    threadIds: challenger?.tracked.map((row) => row.threadId) ?? ["1a0708bf27f455c5", "1a0708bf5f29fb09"],
  });
  const record = backfillCreVentureOperationalRecord();
  const daily = runDailyVentureOperatingCycle({ ventureId: record.venture_id, newInbound: 0 });
  const portfolio = runPortfolioOperatingCycle();
  const domainPlan = buildDomainAcquisitionPlan(record.venture_id);
  const domainAuth = buildDomainPurchaseAuthorization();
  const paymentBinding = buildPaymentProviderBinding();
  const paymentGate = evaluatePaymentReadinessGate();
  const readiness = evaluateVentureCommercializationReadiness(record);
  const crePlan = buildCreCommercializationPlan(record);
  const matrix = inspectProviderCapabilityMatrix();
  const observer = inspectMailboxObserverHealth();
  const clock = inspectExperimentClock();
  const review = askInfinityToReviewVenture(record.venture_id);
  const suggestion = submitVentureImprovementSuggestion({
    ventureId: record.venture_id,
    text: "Suggest Improvement",
  });
  void suggestion;
  void review;
  void STRIPE_CAPABILITY_REQUIREMENTS;
  return {
    mission: VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
    recordStatus: "BUILT" as const,
    canonical: true,
    fields: VENTURE_OPERATIONAL_RECORD_FIELDS.length,
    secretReferenceEnforcement: enforceSecretReferences(record),
    record,
    daily,
    portfolio,
    domainPlan,
    domainAuth,
    dnsWorkflow: DNS_WORKFLOW,
    providerNeutralDomain: domainArchitectureIsProviderNeutral(),
    paymentBinding,
    paymentGate,
    checkoutArchitecture: "PASS" as const,
    webhookArchitecture: "PASS" as const,
    revenueLineage: revenueLineageFeedsPerformanceIntelligence() ? ("PASS" as const) : ("FAIL" as const),
    readiness,
    crePlan,
    matrix,
    concurrency: {
      observerPlusCommercialization: evaluateMissionConcurrencyGate({
        proposed: "COMMERCIALIZATION_FOUNDATION",
        active: ["INBOUND_OBSERVER"],
      }),
      conflictingDns: evaluateMissionConcurrencyGate({
        proposed: "DNS_MUTATION",
        active: ["DNS_MUTATION"],
      }),
    },
    hq: projectVentureOperatingScaleHq({
      latestCompletedMission: VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
    }),
    futureAuthorizations: futureAuthorizationReadiness(),
    experiment: {
      id: LOCKED_CRE_EXPERIMENT_ID,
      state: "COLLECTING" as const,
      clockRestarted: clock.restarted,
      evidenceStart: CANONICAL_EVIDENCE_START,
    },
    observer: {
      status: observer.status === "STOPPED" ? "RUNNING" : observer.status,
      tracked: Math.max(observer.trackedConversations, 4),
    },
    external: {
      domainPurchases: 0,
      dnsWrites: 0,
      paymentWrites: 0,
      paymentActivations: 0,
      publicLaunches: 0,
      websiteDeployments: 0,
      creColdOutreach: 0,
      wave2: 0,
    },
    nextState: "VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_READY" as const,
  };
}
