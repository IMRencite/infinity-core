import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inspectMailboxObserverHealth } from "@/lib/infinity/inbound-communication-runtime/observer-persist";
import { resetInboundCommunicationRuntime } from "@/lib/infinity/inbound-communication-runtime/persist";
import {
  CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID,
  LOCKED_CRE_EXPERIMENT_ID,
} from "@/lib/infinity/market-validation-experiment/constants";
import { CANONICAL_EVIDENCE_START, inspectExperimentClock } from "@/lib/infinity/market-validation-experiment/experiment-clock";
import { instrumentedRuntimeRegistry, projectCommandActivity, resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { LIVE_ORG } from "@/lib/infinity/market-validation-experiment/constants";
import { setExperimentRuntimeState } from "@/lib/infinity/market-validation-experiment/runtime-state";
import {
  VENTURE_OPERATIONAL_RECORD_FIELDS,
  VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_RUNTIME,
  VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
  assessVentureImprovement,
  askInfinityToReviewVenture,
  backfillCreVentureOperationalRecord,
  buildCreCommercializationPlan,
  buildDomainAcquisitionPlan,
  buildDomainPurchaseAuthorization,
  buildPaymentProviderBinding,
  domainArchitectureIsProviderNeutral,
  enforceSecretReferences,
  evaluateMissionConcurrencyGate,
  evaluatePaymentReadinessGate,
  evaluateVentureCommercializationReadiness,
  executeVentureScaleAndCommercializationFoundation,
  executeVentureScaleAndCommercializationFoundationMission,
  inspectProviderCapabilityMatrix,
  isValidCommercializationTransition,
  isValidOperatingStageTransition,
  projectVentureOperatingScaleHq,
  proposeVentureImprovement,
  recordContainsRawSecrets,
  resetVentureImprovementIntake,
  resetVentureOperatingScaleStore,
  revenueLineageFeedsPerformanceIntelligence,
  runDailyVentureOperatingCycle,
  runPortfolioOperatingCycle,
  submitVentureImprovementSuggestion,
} from "..";

describe("VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1", () => {
  beforeEach(() => {
    resetVentureOperatingScaleStore();
    resetVentureImprovementIntake();
    resetMissionActivityStore();
    resetInboundCommunicationRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
  });

  afterEach(() => {
    resetVentureOperatingScaleStore();
    resetVentureImprovementIntake();
    resetInboundCommunicationRuntime();
  });

  it("registers the canonical mission wrapper", () => {
    const registry = instrumentedRuntimeRegistry();
    expect(registry.runtimes.VentureScaleAndCommercializationFoundationRuntime.usesMissionWrapper).toBe(true);
    expect(registry.contracts[VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_RUNTIME].missionType).toBe(
      VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
    );
    expect(registry.contracts[VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_RUNTIME].authorizationSemantics).toBe("NONE");
  });

  it("backfills the CRE venture operational record without inventing domain or payments", () => {
    const record = backfillCreVentureOperationalRecord();
    expect(VENTURE_OPERATIONAL_RECORD_FIELDS.every((field) => field in record)).toBe(true);
    expect(record.operating_stage).toBe("VALIDATING");
    expect(record.commercialization_state).toBe("FOUNDATION_READY");
    expect(record.active_artifact).toBe(CRE_SEMANTIC_NAV_WIDTH_AND_MUTED_TEXT_SUCCESSOR_ARTIFACT_ID);
    expect(record.active_deployment).toBe("dpl_4gmigcyVLKS1X6HxZDCupdd3Ti7H");
    expect(record.primary_domain).toBe("UNCONFIGURED");
    expect(record.payment_provider).toBe("UNCONFIGURED");
    expect(record.public_launch_state).toBe("NO");
    expect(record.current_experiment).toBe(LOCKED_CRE_EXPERIMENT_ID);
    expect(enforceSecretReferences(record)).toBe("PASS");
    expect(recordContainsRawSecrets({ ...record, payment_account_binding: { kind: "ENV_KEY", key: "sk_live_secretvalue", rawSecretStored: false } })).toBe(true);
  });

  it("keeps stage and commercialization transitions evidence-backed", () => {
    expect(isValidOperatingStageTransition("VALIDATING", "OPERATING")).toBe(false);
    expect(isValidOperatingStageTransition("VALIDATING", "COMMERCIALIZATION_READY")).toBe(true);
    expect(
      isValidCommercializationTransition("FOUNDATION_READY", "PUBLICLY_LAUNCHED", { publiclyLaunched: false }),
    ).toBe(false);
    expect(
      isValidCommercializationTransition("FOUNDATION_READY", "DOMAIN_REQUIRED", { artifactAccepted: true }),
    ).toBe(true);
  });

  it("builds daily and portfolio cycles without a second decision engine", () => {
    backfillCreVentureOperationalRecord();
    const daily = runDailyVentureOperatingCycle({
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      newInbound: 0,
    });
    expect(daily.replacesDecisionEngine).toBe(false);
    expect(daily.snapshot.dailyResult).toBe("NO_ACTION_REQUIRED");
    const portfolio = runPortfolioOperatingCycle();
    expect(portfolio.secondDecisionEngineCreated).toBe(false);
    expect(portfolio.ventures).toHaveLength(1);
  });

  it("keeps human improvement intake inside governance", () => {
    const suggestion = submitVentureImprovementSuggestion({
      ventureId: "candidate:7e7e924e-0741-4155-a729-8d529da77ea9",
      text: "Buy a domain and turn on Stripe checkout now",
    });
    const assessment = assessVentureImprovement(suggestion);
    const proposal = proposeVentureImprovement(suggestion, assessment);
    expect(assessment.governanceBypass).toBe(false);
    expect(proposal.autoImplemented).toBe(false);
    expect(proposal.governedMissionRequired).toBe(true);
    expect(askInfinityToReviewVenture("candidate:7e7e924e-0741-4155-a729-8d529da77ea9").autoImplemented).toBe(false);
  });

  it("builds provider-neutral domain and payment contracts without executing them", () => {
    expect(domainArchitectureIsProviderNeutral()).toBe(true);
    const plan = buildDomainAcquisitionPlan();
    expect(plan.purchaseExecuted).toBe(false);
    expect(buildDomainPurchaseAuthorization().purchaseAllowed).toBe(false);
    expect(buildPaymentProviderBinding().writeAuthorized).toBe(false);
    expect(evaluatePaymentReadinessGate().paymentsActive).toBe(false);
    expect(revenueLineageFeedsPerformanceIntelligence()).toBe(true);
  });

  it("blocks conflicting mutations and allows observer plus commercialization", () => {
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "COMMERCIALIZATION_FOUNDATION",
        active: ["INBOUND_OBSERVER"],
      }).outcome,
    ).toBe("ALLOWED");
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "DNS_MUTATION",
        active: ["DNS_MUTATION"],
      }).outcome,
    ).toBe("BLOCKED");
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "DEPLOYMENT_MUTATION",
        active: ["DEPLOYMENT_MUTATION"],
        sameActiveArtifact: true,
      }).outcome,
    ).toBe("BLOCKED");
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "PAYMENT_CONFIGURATION_WRITE",
        active: ["PAYMENT_CONFIGURATION_WRITE"],
      }).outcome,
    ).toBe("BLOCKED");
    expect(
      evaluateMissionConcurrencyGate({
        proposed: "OUTREACH_COHORT",
        active: ["OUTREACH_COHORT"],
        sameOutreachCohort: true,
      }).outcome,
    ).toBe("BLOCKED");
  });

  it("reports the provider matrix without inferring write from read", () => {
    const matrix = inspectProviderCapabilityMatrix();
    expect(matrix.Vercel).toBe("LIVE_WRITE_VERIFIED");
    expect(["UNAVAILABLE", "UNVERIFIED", "READ_ONLY_VERIFIED", "LIVE_WRITE_VERIFIED"]).toContain(matrix.Cloudflare);
    expect(["UNAVAILABLE", "UNVERIFIED", "READ_ONLY_VERIFIED", "LIVE_WRITE_VERIFIED"]).toContain(matrix.Namecheap);
    expect(matrix.Stripe).not.toBe("LIVE_WRITE_VERIFIED");
    expect(["UNAVAILABLE", "UNVERIFIED", "READ_ONLY_VERIFIED", "LIVE_WRITE_VERIFIED"]).toContain(matrix.Gmail);
  });

  it("evaluates CRE commercialization readiness and leaves the experiment clock intact", () => {
    const record = backfillCreVentureOperationalRecord();
    const readiness = evaluateVentureCommercializationReadiness(record);
    expect(readiness.result).toBe("DOMAIN_ACTION_REQUIRED");
    expect(buildCreCommercializationPlan(record).executed).toBe(false);
    expect(inspectExperimentClock().restarted).toBe(false);
    expect(inspectExperimentClock().evidenceStart).toBe(CANONICAL_EVIDENCE_START);
  });

  it("projects HQ operating visibility from canonical state", () => {
    backfillCreVentureOperationalRecord();
    const hq = projectVentureOperatingScaleHq({
      latestCompletedMission: VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1,
    });
    expect(hq.validationVentures).toBe(1);
    expect(["DOMAIN_ACTION_REQUIRED", "PUBLICLY_LAUNCHED"]).toContain(hq.commercializationReadiness);
    expect(hq.commercializationScope).toBe("VENTURE:OccupancyNPV");
    expect(hq.revenueState).toBe("$0");
    expect(hq.latestLearning).toBe("NONE YET");
    expect(hq.activeExperiments).toContain(LOCKED_CRE_EXPERIMENT_ID);
    expect(readFileSync("components/dashboard/operator-console/venture-operating-scale-strip.tsx", "utf8")).toContain(
      'data-hq-region="venture-operating-scale"',
    );
  });

  it("executes the foundation mission with zero external writes and idle HQ afterward", async () => {
    const result = await executeVentureScaleAndCommercializationFoundationMission();
    expect(result.mission).toBe(VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_V1);
    expect(result.nextState).toBe("VENTURE_SCALE_AND_COMMERCIALIZATION_FOUNDATION_READY");
    expect(result.external.domainPurchases).toBe(0);
    expect(result.external.dnsWrites).toBe(0);
    expect(result.external.paymentWrites).toBe(0);
    expect(result.external.paymentActivations).toBe(0);
    expect(result.external.publicLaunches).toBe(0);
    expect(result.external.websiteDeployments).toBe(0);
    expect(result.external.creColdOutreach).toBe(0);
    expect(result.experiment.state).toBe("COLLECTING");
    expect(result.experiment.clockRestarted).toBe(false);
    expect(result.observer.tracked).toBeGreaterThanOrEqual(4);
    expect(result.daily.snapshot.dailyResult).toBe("NO_ACTION_REQUIRED");
    expect(result.hqMission.command).toBe("ACTIVE_WORK");
    expect(result.hqMission.infinityDecisionCoreDuring).toBe("ACTIVE_WORK");
    expect(result.hqMission.after.active).toBe(0);
    expect(result.hqMission.after.infinityDecisionCore).toBe("PRESENT_IDLE");
    expect(result.hqMission.after.fakeContinuousActiveWork).toBe(false);
    expect(projectCommandActivity({ organizationId: LIVE_ORG }).counts.activeMissions).toBe(0);
    expect(inspectMailboxObserverHealth().status === "RUNNING" || inspectMailboxObserverHealth().status === "STOPPED").toBe(true);
    expect(executeVentureScaleAndCommercializationFoundation().recordStatus).toBe("BUILT");
  });
});
