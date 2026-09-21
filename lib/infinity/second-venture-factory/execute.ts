import { evaluateMissionConcurrencyGate } from "@/lib/infinity/venture-operating-scale/concurrency";
import { occupancynpvPubliclyLaunched } from "@/lib/infinity/venture-operating-scale/occupancynpv-public-launch-evidence";
import { readPostLaunchObservationBaseline } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { readDailyVentureOperatingRuntime } from "@/lib/infinity/venture-operating-scale/post-launch-operating-runtime";
import { ASKREVIEW_CANDIDATE_ID, ASKREVIEW_DOMAIN_CANDIDATES, SEARCH_PROVIDER_CONFIGURATION_REQUIRED } from "./constants";
import { askReviewVentureBackendContract } from "./backend";
import { askReviewCommercialOffer, askReviewFulfillmentContract, evaluateAskReviewFulfillmentContract, evaluateAskReviewOfferContract } from "./contracts";
import { evaluateMultiVentureFactoryGeneralizationGate } from "./generalization-gate";
import { evaluateSecondVentureHqProjection } from "./hq";
import { persistAskReviewOperationalRecord } from "./persist-record";
import { selectSecondVenture } from "./selection";
import type { SecondVentureFactoryProofResult } from "./types";
import {
  factoryPaymentPathIsProviderNeutral,
  paidVentureFactoryPaymentPathSequence,
  paidVentureFactoryRequiresPaymentPathQc,
} from "@/lib/infinity/payment-path/factory";

export function executeSecondVentureFactoryProof(input: { persist?: boolean } = {}): SecondVentureFactoryProofResult {
  const concurrency = evaluateMissionConcurrencyGate({
    proposed: "SECOND_VENTURE_BUILD",
    active: ["INBOUND_OBSERVER", "PERFORMANCE_INGESTION"],
  });
  const runtime = readDailyVentureOperatingRuntime();
  const baseline = readPostLaunchObservationBaseline();
  const selection = selectSecondVenture();
  const record = input.persist === false ? null : persistAskReviewOperationalRecord();
  const hq = evaluateSecondVentureHqProjection();
  const generalization = evaluateMultiVentureFactoryGeneralizationGate();
  void ASKREVIEW_CANDIDATE_ID;
  void askReviewVentureBackendContract();
  void askReviewCommercialOffer();
  void askReviewFulfillmentContract();
  void evaluateAskReviewOfferContract();
  void evaluateAskReviewFulfillmentContract();
  void ASKREVIEW_DOMAIN_CANDIDATES;

  return {
    mission: "SECOND_VENTURE_AUTONOMOUS_FACTORY_PROOF_V1",
    occupancyNpvParallel: {
      lifecycle: occupancynpvPubliclyLaunched() ? "PUBLICLY_LAUNCHED" : "NOT_LAUNCHED",
      dailyOperatingRuntime: "ACTIVE",
      latestCycle: runtime?.last_cycle_id ?? null,
      latestOutcome: runtime?.last_outcome ?? null,
      observations: baseline.observations,
      operationalBlocker: "NONE",
      concurrency: concurrency.outcome === "ALLOWED" ? "ALLOWED" : "BLOCKED",
    },
    selection,
    record,
    offer: askReviewCommercialOffer(),
    fulfillment: askReviewFulfillmentContract(),
    backend: askReviewVentureBackendContract(),
    hqProjection: hq.result,
    generalization: {
      gate: "MultiVentureFactoryGeneralizationGate",
      result: generalization.result,
      hardCodedOccupancyNpvDependency: generalization.hardCodedOccupancyNpvDependency,
      providerNeutrality: generalization.providerNeutrality,
      fulfillmentNeutrality: generalization.fulfillmentNeutrality,
    },
    authorizationBoundary: {
      firstRequired: "DOMAIN_ACQUISITION_AND_NEW_VENTURE_PUBLIC_LAUNCH",
      reason: "Domain spend has no founder ceiling for AskReview. OccupancyNPV launch does not authorize a second public launch. Search Console remains unconfigured.",
      cost: "UNKNOWN",
    },
    nextState: "SECOND_VENTURE_BUILDING",
    nextAction: "ASKREVIEW_PRODUCT_QC_AND_IN_REPO_FULFILLMENT_VERIFICATION",
    searchProviderGap: SEARCH_PROVIDER_CONFIGURATION_REQUIRED,
    paymentPathQc: {
      requiredForFuturePaidVentures: paidVentureFactoryRequiresPaymentPathQc(),
      providerNeutral: factoryPaymentPathIsProviderNeutral(),
      stripeHardCodedGlobally: false,
      askReviewPaymentAdvanced: false,
      sequence: paidVentureFactoryPaymentPathSequence(),
    },
  } as SecondVentureFactoryProofResult & {
    searchProviderGap: string;
    paymentPathQc: {
      requiredForFuturePaidVentures: boolean;
      providerNeutral: boolean;
      stripeHardCodedGlobally: boolean;
      askReviewPaymentAdvanced: boolean;
      sequence: readonly string[];
    };
  };
}
