import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateBuildAuthorization,
  evaluateValidationArtifactAuthorization,
  executeGovernedVentureBuild,
  resetExecutableBuildRuntime,
} from "@/lib/infinity/venture-build-orchestration";
import { authorizedBuildCompileInput, validateCreCompileInput } from "@/lib/infinity/venture-build-orchestration/fixtures";
import { CANONICAL_FOOTER_COPY, CANONICAL_IMR_URL, CANONICAL_INFINITY_OS_URL } from "@/lib/infinity/venture-build-orchestration/constants";
import { ROOM_DISPLAY_NAMES } from "@/lib/infinity/operator-console/room-naming";
import { analyzeExperiment, classifyWtp, assertCriteriaLocked } from "../analyze";
import { compileCreValidationArtifactInput, compileMarketValidationExperiment, experimentIdempotencyKey } from "../compile";
import {
  CRE_CANDIDATE_ID,
  LOCKED_SUCCESS_CRITERIA,
  PRIMARY_CTA,
  WRITE_BOUNDARY,
} from "../constants";
import { evaluateExperimentPreDeployGate } from "../deploy";
import { countProductionEvidence, ingestExperimentEvents, intentStrength, makeEvent } from "../events";
import {
  compileIdempotentExperiment,
  executeMarketValidationExperiment,
  resetExperimentRuntime,
} from "../execute";
import {
  containsSensitiveField,
  qualifyProspect,
  submissionDedupeKey,
  validatePilotForm,
} from "../form";
import { forbiddenCopyPatterns } from "../offer";
import { livePreRunGate } from "../live";

describe("GOVERNED EXTERNAL MARKET VALIDATION EXPERIMENT V1", () => {
  beforeEach(() => {
    resetExperimentRuntime();
    resetExecutableBuildRuntime();
  });

  it("compiles a typed CRE pricing+intent experiment with locked thresholds", () => {
    const experiment = compileMarketValidationExperiment({});
    expect(experiment.schemaVersion).toBe("market_validation_experiment_v1");
    expect(experiment.candidateId).toBe(CRE_CANDIDATE_ID);
    expect(experiment.experimentType).toBe("PRICING_PURCHASE_INTENT");
    expect(experiment.validationDimension).toBe("WILLINGNESS_TO_PAY");
    expect(experiment.priceHypotheses.length).toBe(2);
    expect(experiment.priceHypotheses.every((item) => item.proven === false && item.anchorOnly === true)).toBe(true);
    expect(experiment.offer.cta).toBe(PRIMARY_CTA);
    expect(experiment.thresholdsLockedBeforeLaunch).toBe(true);
    expect(assertCriteriaLocked(experiment.minimumEvidence)).toBe(true);
    expect(experiment.minimumEvidence).toEqual(LOCKED_SUCCESS_CRITERIA);
    expect(experiment.variantPolicy).toBe("SINGLE_OFFER");
    expect(experiment.observedPayment).toBe(false);
    expect(experiment.specialistReviewResolved).toBe(false);
  });

  it("lets VALIDATE authorize a validation artifact and still blocks full product BUILD", () => {
    const compile = compileCreValidationArtifactInput();
    expect(evaluateBuildAuthorization(compile).result).toBe("VALIDATION_REQUIRED");
    expect(evaluateBuildAuthorization(compile).buildReady).toBe(false);
    expect(evaluateValidationArtifactAuthorization(compile).result).toBe("AUTHORIZED_VALIDATION_ARTIFACT");
    expect(evaluateValidationArtifactAuthorization(compile).buildReady).toBe(false);
    expect(evaluateValidationArtifactAuthorization(authorizedBuildCompileInput()).result).not.toBe(
      "AUTHORIZED_VALIDATION_ARTIFACT",
    );
    const full = executeGovernedVentureBuild({ compile: validateCreCompileInput() });
    return full.then((result) => {
      expect(result.artifact).toBeNull();
      expect(result.plan.kind).toBe("VALIDATION_WORK");
    });
  });

  it("defines offer, pricing hypotheses, and intent hierarchy without fake claims", () => {
    const experiment = compileMarketValidationExperiment({});
    expect(forbiddenCopyPatterns().test(JSON.stringify(experiment.offer))).toBe(false);
    expect(experiment.offer.does.join(" ")).toMatch(/NPV|cash-flow|summary/i);
    expect(experiment.offer.doesNot.join(" ")).toMatch(/CRM|administration|property-management/i);
    expect(intentStrength("PAGE_VIEW")).toBe("WEAK");
    expect(intentStrength("CTA_CLICK")).toBe("MODERATE");
    expect(intentStrength("STRONG_PURCHASE_INTENT")).toBe("STRONG");
    expect(intentStrength("PAID_COMMITMENT")).toBe("STRONG");
    expect(experiment.intentModel.paidCommitmentPossible).toBe(false);
  });

  it("validates the intent form, rejects sensitive data, and dedupes by email", () => {
    const valid = {
      name: "Alex Broker",
      workEmail: "alex@boutique.example",
      role: "CRE broker",
      company: "Boutique CRE",
      teamSize: "4",
      dealFrequency: "Monthly",
      preferredPricing: "professional_annual",
      leaseWorkflow: true,
      pilotInterest: true,
    };
    expect(validatePilotForm(valid).ok).toBe(true);
    expect(
      validatePilotForm({
        name: "",
        workEmail: "bad",
        role: "",
        company: "",
        teamSize: "",
        dealFrequency: "",
        preferredPricing: "",
        leaseWorkflow: false,
        pilotInterest: false,
      }).ok,
    ).toBe(false);
    expect(containsSensitiveField({ ssn: "000" })).toBe(true);
    expect(qualifyProspect({ role: "CRE broker", dealFrequency: "Monthly", leaseWorkflow: true }).qualified).toBe(true);
    expect(qualifyProspect({ role: "Student", dealFrequency: "rarely", leaseWorkflow: false }).qualified).toBe(false);
    expect(submissionDedupeKey("Alex@Boutique.example")).toBe("alex@boutique.example");
  });

  it("isolates synthetic events and does not count duplicates as extra prospects", () => {
    const lineage = { candidateId: CRE_CANDIDATE_ID, experimentId: "exp_test", artifactId: "art_test" };
    const first = ingestExperimentEvents({
      events: [
        makeEvent({ ...lineage, type: "QUALIFIED_PILOT_APPLICATION", occurredAt: "2026-08-28T00:00:00.000Z", synthetic: false, prospectKey: "a@b.co", qualified: true, pricingOptionId: "professional_annual" }),
        makeEvent({ ...lineage, type: "QUALIFIED_PILOT_APPLICATION", occurredAt: "2026-08-28T00:01:00.000Z", synthetic: false, prospectKey: "a@b.co", qualified: true, pricingOptionId: "professional_annual" }),
        makeEvent({ ...lineage, type: "STRONG_PURCHASE_INTENT", occurredAt: "2026-08-28T00:02:00.000Z", synthetic: true, prospectKey: "bot", qualified: true, pricingOptionId: null }),
      ],
    });
    expect(first.duplicates).toBeGreaterThan(0);
    expect(first.productionEvents.every((event) => event.dimensions?.synthetic !== true)).toBe(true);
    const counts = countProductionEvidence(first.events);
    expect(counts.qualifiedSubmissions).toBe(1);
    expect(first.productionEvents.every((event) => event.dimensions?.synthetic !== true)).toBe(true);
  });

  it("does not treat tiny samples or page views as validation, and keeps observed payment impossible", () => {
    const tinyCounts = { qualifiedVisitors: 4, strongIntent: 2, qualifiedSubmissions: 2, pricingSelections: 2, pageViews: 4 };
    const tiny = analyzeExperiment({
      counts: tinyCounts,
      criteria: LOCKED_SUCCESS_CRITERIA,
      startedAt: "2026-08-01T00:00:00.000Z",
      now: "2026-08-02T00:00:00.000Z",
      deployed: true,
    });
    expect(tiny.outcome).toBe("PROMISING_BUT_INSUFFICIENT");
    expect(tiny.wtp).not.toBe("OBSERVED_PAYMENT");
    expect(classifyWtp({ counts: tinyCounts, observedPayment: true, criteria: LOCKED_SUCCESS_CRITERIA })).toBe("NONE");
    const timeout = analyzeExperiment({
      counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0, pricingSelections: 0, pageViews: 1 },
      criteria: LOCKED_SUCCESS_CRITERIA,
      startedAt: "2026-08-01T00:00:00.000Z",
      now: "2026-08-20T00:00:00.000Z",
      deployed: true,
    });
    expect(timeout.outcome).toBe("INCONCLUSIVE");
    expect(timeout.timedOut).toBe(true);
    expect(analyzeExperiment({
      counts: { qualifiedVisitors: 0, strongIntent: 0, qualifiedSubmissions: 0, pricingSelections: 0, pageViews: 0 },
      criteria: LOCKED_SUCCESS_CRITERIA,
      startedAt: "2026-08-01T00:00:00.000Z",
      now: "2026-08-02T00:00:00.000Z",
      deployed: true,
      invalid: true,
    }).outcome).toBe("INVALID_EXPERIMENT");
    const negative = analyzeExperiment({
      counts: { qualifiedVisitors: 20, strongIntent: 0, qualifiedSubmissions: 20, pricingSelections: 20, pageViews: 80 },
      criteria: LOCKED_SUCCESS_CRITERIA,
      startedAt: "2026-08-01T00:00:00.000Z",
      now: "2026-08-10T00:00:00.000Z",
      deployed: true,
    });
    expect(negative.outcome).toBe("NEGATIVE_SIGNAL");
  });

  it("builds the validation landing through existing orchestration with footer and no checkout", async () => {
    const result = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    expect(result.validationArtifactAuthorization).toBe("AUTHORIZED_VALIDATION_ARTIFACT");
    expect(result.fullProductAuthorization).toBe("VALIDATION_REQUIRED");
    expect(result.buildReady).toBe(false);
    expect(result.fullProductBuildExecuted).toBe(false);
    expect(result.artifact).not.toBeNull();
    expect(result.artifactValidation?.passed).toBe(true);
    expect(result.artifactValidation?.footer).toBe("PASS");
    const blob = result.artifact!.files.map((file) => file.content).join("\n");
    expect(blob).toContain(CANONICAL_FOOTER_COPY);
    expect(blob).toContain(CANONICAL_INFINITY_OS_URL);
    expect(blob).toContain(CANONICAL_IMR_URL);
    expect(blob).toContain("Request Pilot Access");
    expect(blob).toContain("in validation");
    expect(blob).not.toMatch(/fake checkout|payment received|nofollow/i);
    expect(result.artifact!.files.some((file) => file.path === "app/early-access/page.tsx")).toBe(true);
    expect(result.artifact!.files.some((file) => file.path === "app/api/public/market-validation/[experimentId]/ingest/route.ts")).toBe(true);
    expect(blob).toContain("fetch(VALIDATION_INGEST_PATH");
    expect(blob).not.toContain("VALIDATION_INGEST_ORIGIN");
    expect(blob).not.toMatch(/https?:\/\/(localhost|127\.0\.0\.1)/i);
    expect(result.authorization.formBackendReady).toBe(true);
    expect(result.authorization.analyticsBackendReady).toBe(true);
    expect(result.authorization.hardcodedDenied).toBe(false);
    expect(result.authorization.vercelPackageSupport).toBe("SUPPORTED");
    expect(result.experiment.offer.cta).toBe(PRIMARY_CTA);
    expect(result.fakeRevenue).toBe(false);
    expect(result.fakeCustomer).toBe(false);
    expect(result.fakePayment).toBe(false);
    expect(result.observedPayment).toBe(false);
    expect(result.wtpEvidence).toBe("NONE");
    expect(result.decision).toBe("VALIDATE");
    expect(result.readyForFirstRealAutonomousBuild).toBe(false);
    expect(result.writeBoundary).toEqual(WRITE_BOUNDARY);
    expect(result.deployed).toBe(false);
    expect(result.customDomain).toBe(false);
    expect(result.state).toBe("EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED");
    expect(result.preDeployGate.ok).toBe(false);
    expect(result.preDeployGate.domainRequired).toBe(false);
    expect(result.preDeployGate.dnsRequired).toBe(false);
    expect(result.preDeployGate.paymentsRequired).toBe(false);
    expect(result.trafficPlanExecuted).toBe(false);
  });

  it("is idempotent, concurrency-safe, and maps HQ rooms without fake ACTIVE_WORK after completion", async () => {
    expect(compileIdempotentExperiment().experimentId).toBe(compileIdempotentExperiment().experimentId);
    expect(experimentIdempotencyKey(CRE_CANDIDATE_ID, 1)).toContain(CRE_CANDIDATE_ID);
    const running = executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const concurrent = await executeMarketValidationExperiment({ candidateId: CRE_CANDIDATE_ID });
    const first = await running;
    expect(["BLOCKED", "EXPERIMENT_READY_BUT_EXTERNAL_ACTION_BLOCKED", "FAILED"]).toContain(concurrent.state);
    expect(first.rooms.every((room) => room.state !== "ACTIVE_WORK")).toBe(true);
    expect(ROOM_DISPLAY_NAMES.product_lab.displayName).toBe("Creation Lab");
    expect(ROOM_DISPLAY_NAMES.quality_control.displayName).toBe("Validation Station");
    expect(ROOM_DISPLAY_NAMES.launch_operations.displayName).toBe("Deployment Depot");
    expect(ROOM_DISPLAY_NAMES.intelligence_center.displayName).toBe("Signal Intelligence");
  });

  it("gates deployment through EAG and does not invent a live URL", () => {
    const gate = evaluateExperimentPreDeployGate({
      candidateDecision: "VALIDATE",
      validationArtifactAuthorized: true,
      fullProductAuthorized: false,
      artifactValid: true,
      artifactId: "art_local_validation",
    });
    expect(gate.ok).toBe(false);
    expect(gate.failed.length).toBeGreaterThan(0);
    expect(livePreRunGate({ artifact: true, form: true, analytics: true }).ok).toBe(true);
    expect(livePreRunGate({ artifact: false }).ok).toBe(false);
  });
});
