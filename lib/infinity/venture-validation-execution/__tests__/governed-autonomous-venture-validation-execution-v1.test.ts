import { describe, expect, it, beforeEach } from "vitest";
import { ROOM_DISPLAY_NAMES } from "@/lib/infinity/operator-console/room-naming";
import { hasProductAdvantageEvidence } from "@/lib/infinity/venture-intelligence/engines";
import { extractBuildBlockers } from "../blockers";
import { compileExecutableValidationPlan, validationPlanIdempotencyKey } from "../compile";
import { LIVE_QUERY_BUDGET, WRITE_BOUNDARY } from "../constants";
import {
  compileIdempotentValidationPlan,
  executeGovernedValidation,
  resetValidationRuntime,
} from "../execute";
import {
  authorizedBuildCompileInput,
  blockedCompileInput,
  creCandidateFixture,
  CRE_CANDIDATE_ID,
  validateCreCompileInput,
} from "../fixtures";
import { livePreRunGate } from "../live";
import { challengeBusinessModel, decideValidationOutcome, reviseEconomics } from "../reassess";
import { roomPresenceFromValidationTasks } from "../rooms";

describe("GOVERNED AUTONOMOUS VENTURE VALIDATION EXECUTION V1", () => {
  beforeEach(() => {
    resetValidationRuntime();
  });

  it("compiles a validation plan for VALIDATE and skips unnecessary validation for BUILD", () => {
    const validate = compileExecutableValidationPlan({
      compile: validateCreCompileInput(),
      preRun: { candidateId: CRE_CANDIDATE_ID, name: "CRE", decision: "VALIDATE", buildReady: false, selectionScore: 75, opportunityScore: 84, validationState: "VALIDATE", researchState: "persisted", model: "saas", pricing: "$79", cac: "$150", ltv: "$1470", ltvCac: "9.8", payback: "8 months", margin: "99%", openGaps: [], counterfactual: "WTP", candidate: creCandidateFixture() },
    });
    expect(validate.status).toBe("READY");
    expect(validate.blockers.length).toBeGreaterThan(2);
    expect(validate.tasks.some((task) => task.phase === "VALIDATION_DEFINITION")).toBe(true);
    expect(validate.queryBudget).toEqual(LIVE_QUERY_BUDGET);

    const build = compileExecutableValidationPlan({ compile: authorizedBuildCompileInput() });
    expect(build.status).toBe("SKIPPED");
    expect(build.tasks).toEqual([]);
  });

  it("extracts ordered blockers with research vs experiment distinction", () => {
    const blockers = extractBuildBlockers({
      compile: validateCreCompileInput(),
      preRun: {
        candidateId: CRE_CANDIDATE_ID,
        name: "CRE",
        decision: "VALIDATE",
        buildReady: false,
        selectionScore: 75,
        opportunityScore: 84,
        validationState: "VALIDATE",
        researchState: "persisted",
        model: "saas_subscription",
        pricing: "$79",
        cac: "$150",
        ltv: "$1470",
        ltvCac: "9.8",
        payback: "8 months",
        margin: "99.7%",
        openGaps: [],
        counterfactual: "Prove WTP",
        candidate: creCandidateFixture(),
      },
    });
    expect(blockers[0]?.order).toBe(1);
    expect(blockers.some((item) => item.dimension === "WILLINGNESS_TO_PAY" && item.mode === "MARKET_EXPERIMENT")).toBe(true);
    expect(blockers.some((item) => item.dimension === "COMPETITION" || item.dimension === "RETENTION")).toBe(true);
    expect(blockers.find((item) => item.dimension === "WILLINGNESS_TO_PAY")?.gap).toMatch(/does not prove/i);
    expect(blockers.find((item) => item.dimension === "CAC")?.successCriterion).toMatch(/UNKNOWN/);
  });

  it("preserves title-only product advantage rejection and complaint-shaped evidence", () => {
    const titleOnly = creCandidateFixture();
    titleOnly.problem = "";
    titleOnly.demandEvidence = [];
    titleOnly.competitionEvidence = [];
    titleOnly.summary = "A title is not evidence";
    expect(hasProductAdvantageEvidence(titleOnly)).toBe(false);
    expect(hasProductAdvantageEvidence(creCandidateFixture())).toBe(true);
  });

  it("challenges monthly SaaS and revises economics without claiming actual CAC", () => {
    const revised = reviseEconomics(creCandidateFixture());
    expect(revised.after.actualCac).toBe("UNKNOWN");
    expect(revised.challenge.monthlySubscriptionSupported).toBe("PARTIAL");
    expect(revised.challenge.recommendedModel).toMatch(/annual|team|per_deal|seat/i);
    expect(revised.marginMethod.length).toBeGreaterThan(3);
    const challenge = challengeBusinessModel({
      candidate: creCandidateFixture(),
      revenueModel: "saas_subscription",
    });
    expect(challenge.perDealModel).toMatch(/per-deal|deal-triggered/i);
  });

  it("does not close WTP from research-only evidence", () => {
    expect(
      decideValidationOutcome({
        compileDecision: "VALIDATE",
        buildReady: false,
        wtpClosed: false,
        advantageOk: true,
      }),
    ).toBe("EXTERNAL_VALIDATION_REQUIRED");
  });

  it("executes deterministic VALIDATE work, updates engines, and does not execute BUILD", async () => {
    const result = await executeGovernedValidation({
      compile: validateCreCompileInput(),
      candidate: creCandidateFixture(),
      researchAdditions: {
        competitionEvidence: ["Excel templates remain the default and are error-prone for CAM and step-ups."],
        monetizationEvidence: ["Comparable workflow tools publish monthly and annual seat prices as anchors only."],
      },
    });
    expect(result.outcome).toBe("EXTERNAL_VALIDATION_REQUIRED");
    expect(result.buildReady).toBe(false);
    expect(result.currentPosition).toBe("VALIDATE");
    expect(result.readyForBuildHandoff).toBe(false);
    expect(result.realBuildExecuted).toBe(false);
    expect(result.executableBuildPlan).toBeNull();
    expect(result.evidence.customer).toMatch(/broker/i);
    expect(result.evidence.problem).toMatch(/spreadsheet/i);
    expect(result.legal.specialistReviewNeeded).toBe(true);
    expect(result.buildability.mvp.join(" ")).toMatch(/lease|NPV/i);
    expect(result.writeBoundary).toEqual(WRITE_BOUNDARY);
    expect(result.live.ran).toBe(false);
  });

  it("compiles BUILD handoff without executing when already authorized", async () => {
    const result = await executeGovernedValidation({ compile: authorizedBuildCompileInput() });
    expect(result.outcome).toBe("BUILD_READY");
    expect(result.readyForBuildHandoff).toBe(true);
    expect(result.executableBuildPlan?.kind).toBe("BUILD_WORK");
    expect(result.buildPackage?.publicWebsite.footerAttribution.copy).toBe(
      "Privacy Policy | Terms of Service | Sitemap | An Infinity OS Venture | By IMR",
    );
    expect(result.realBuildExecuted).toBe(false);
  });

  it("is idempotent and concurrency-safe", async () => {
    const first = compileIdempotentValidationPlan({ compile: validateCreCompileInput() });
    const second = compileIdempotentValidationPlan({ compile: validateCreCompileInput() });
    expect(first.planId).toBe(second.planId);
    expect(validationPlanIdempotencyKey({
      organizationId: first.organizationId,
      candidateId: first.candidateId,
      planVersion: 1,
      decision: "VALIDATE",
    })).toContain(CRE_CANDIDATE_ID);

    const running = executeGovernedValidation({ compile: validateCreCompileInput(), candidate: creCandidateFixture() });
    const concurrent = await executeGovernedValidation({ compile: validateCreCompileInput(), candidate: creCandidateFixture() });
    await running;
    expect(["MORE_VALIDATION_REQUIRED", "EXTERNAL_VALIDATION_REQUIRED"]).toContain(concurrent.outcome);
  });

  it("routes validation tasks to existing HQ rooms without fake providers", () => {
    const plan = compileExecutableValidationPlan({
      compile: validateCreCompileInput(),
      preRun: {
        candidateId: CRE_CANDIDATE_ID,
        name: "CRE",
        decision: "VALIDATE",
        buildReady: false,
        selectionScore: null,
        opportunityScore: null,
        validationState: "VALIDATE",
        researchState: "persisted",
        model: "saas",
        pricing: "$79",
        cac: "$150",
        ltv: "$1,470",
        ltvCac: "9.8",
        payback: "8",
        margin: "99",
        openGaps: [],
        counterfactual: null,
        candidate: creCandidateFixture(),
      },
    });
    const running = plan.tasks.map((task) =>
      task.capabilityRoute.roomId === "research_department" || task.capabilityRoute.roomId === "strategy_finance"
        ? { ...task, status: "RUNNING" as const }
        : task,
    );
    const rooms = roomPresenceFromValidationTasks(running);
    expect(ROOM_DISPLAY_NAMES.research_department.displayName).toBe("Research Grid");
    expect(ROOM_DISPLAY_NAMES.strategy_finance.displayName).toBe("Profit Lab");
    expect(ROOM_DISPLAY_NAMES.quality_control.displayName).toBe("Validation Station");
    expect(rooms.some((item) => (item.roomId === "research_department" || item.roomId === "strategy_finance") && item.state === "ACTIVE_WORK")).toBe(true);
    expect(plan.capabilityRoutes.every((route) => route.providerNeutral)).toBe(true);
    expect(plan.capabilityRoutes.some((route) => /gemini|openai/i.test(route.capability))).toBe(false);
  });

  it("bounds the live query budget and requires a complete pre-run gate", () => {
    expect(LIVE_QUERY_BUDGET.maxProviderPhases).toBe(3);
    expect(LIVE_QUERY_BUDGET.maxQueriesPerPhase).toBe(5);
    expect(LIVE_QUERY_BUDGET.hardQueryCap).toBe(15);
    const gate = livePreRunGate({
      lineage: true,
      research: true,
      coverage: true,
      revenue: true,
      benchmarks: true,
      quality: true,
      estimates: true,
      advantage: true,
      persistence: true,
      reassessment: true,
      handoff: true,
      budget: true,
      idempotency: true,
    });
    expect(gate.ok).toBe(true);
    expect(livePreRunGate({ lineage: false, budget: true }).ok).toBe(false);
  });

  it("does not treat blocked evidence as a build path", async () => {
    const result = await executeGovernedValidation({ compile: blockedCompileInput() });
    expect(result.realBuildExecuted).toBe(false);
    expect(result.readyForBuildHandoff).toBe(false);
    expect(result.plan.blockers.length).toBeGreaterThan(0);
  });
});
