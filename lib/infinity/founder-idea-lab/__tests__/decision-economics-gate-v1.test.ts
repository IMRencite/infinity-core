import { describe, expect, it } from "vitest";
import { FounderIdeaStore } from "../store";
import { submitFounderIdea } from "../submit";
import { analyzeFounderIdea } from "../analyze";
import { convertFounderIdeaToCandidate } from "../convert";
import { applyFounderDecision, founderActionsFor, validationPlanFor } from "../decide";
import { routeFounderBuild } from "../build-route";
import { assertFounderSpendStillTreasuryGated } from "../treasury-gate";
import { evaluateEvidenceReadiness, evaluateBuildReadiness } from "../readiness";
import { coverageFromPacket, layersFromPacket } from "../research-packet";
import { monetizeFromResearchPacket } from "../monetization-from-research";
import { archiveHistoricalGrade } from "../grade-history";
import { listFounderIdeas } from "../hq/artifacts";
import { buildLoadedCandidate, gradeLoadedCandidate } from "../grade";
import {
  RESEARCH_ADAPTER_PLACEHOLDER_SUPPORTED,
  isResearchAdapterPlaceholderEconomics,
  unitEconomicsNumericallyKnown,
} from "../economics-known";
import {
  artMarketplaceIntegrityPacket,
  categorySupportedIdeaUnprovenPacket,
  infinityCmsLiveV5ReplayPacket,
  rejectUnknownEconomicsPacket,
  validateUnknownEconomicsPacket,
  workflowSaasIntegrityPacket,
} from "../integrity-fixtures";
import { saasWorkflowMonetizationFixture, weakMonetizationFixture } from "../fixtures";
import { calculateDeterministicScores } from "@/lib/infinity/opportunity-scanner/scoring/calculate";
import { conservativeScoringInputs } from "../convert";
import {
  DEFAULT_BUILD_GATE_THRESHOLDS,
  DEFAULT_DECISION_THRESHOLDS,
} from "@/lib/infinity/venture-selection/constants";
import {
  UNKNOWN_UNIT_ECONOMICS_REASON,
  classifyDecision,
  passesBuildGate,
} from "@/lib/infinity/venture-selection/decisions/classify";
import { createGovernedStore, ORG_A } from "@/lib/infinity/treasury/__tests__/fixtures";
import type { FounderIdeaSubmission, FounderIdeaSubmissionInput } from "../types";
import type { LoadedMonetizationBundle, LoadedMonetizationPlan } from "@/lib/infinity/venture-selection/types";

const USER_A = "user-a";

function input(overrides: Partial<FounderIdeaSubmissionInput> = {}): FounderIdeaSubmissionInput {
  return {
    organizationId: ORG_A,
    submittedByUserId: USER_A,
    title: "Operator workflow SaaS",
    description: "Software that automates a specific operator workflow with a monthly seat.",
    idempotencyKey: "gate",
    ...overrides,
  };
}

function analyzePacket(
  packetFactory: (submissionId: string, candidateId: string) => ReturnType<typeof workflowSaasIntegrityPacket>,
  options?: { monetization?: LoadedMonetizationBundle | null; idempotencyKey?: string },
) {
  const store = new FounderIdeaStore();
  const submission = submitFounderIdea(store, input({ idempotencyKey: options?.idempotencyKey ?? `k-${Math.random()}` }));
  convertFounderIdeaToCandidate(store, submission);
  const result = analyzeFounderIdea(store, submission, {
    researchPacket: packetFactory(submission.id, submission.opportunityCandidateId!),
    monetization: options?.monetization,
  });
  return { store, ...result };
}

function withPlan(
  bundle: LoadedMonetizationBundle,
  overlay: Partial<LoadedMonetizationPlan>,
): LoadedMonetizationBundle {
  return {
    ...bundle,
    primaryPlan: { ...bundle.primaryPlan!, ...overlay },
  };
}

function unknownEconomicsValidateMonetization(): LoadedMonetizationBundle {
  return withPlan(saasWorkflowMonetizationFixture(), {
    estimatedCAC: null,
    estimatedLTV: null,
    ltvCacRatio: null,
  });
}

function seedHistorical(store: FounderIdeaStore, submission: FounderIdeaSubmission) {
  store.grades.set(submission.id, {
    opportunityScores: calculateDeterministicScores(conservativeScoringInputs(false)),
    selectionScore: 48.94,
    validationScore: 50,
    monetizationScore: 0,
    fatalAssumptionRisk: 0.5,
    expectedRoi: 0,
    estimatedCapitalRequired: null,
    buildReadiness: "HOLD",
    opportunityQuality: 43.61,
    evaluation: null,
    scoreIntegrity: "FALLBACK_HISTORICAL",
    readyForDecision: false,
    buildReady: false,
    researchRunId: null,
    monetizationRunId: null,
    provenance: [],
    coverage: null,
    monetizationLayers: null,
  });
  submission.infinityDecision = "HOLD";
  submission.status = "HELD";
  archiveHistoricalGrade(store, submission);
}

describe("DECISION_ECONOMICS_GATE_V1", () => {
  it("decision readiness does not require known unit economics", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "ready" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = validateUnknownEconomicsPacket(submission.id, submission.opportunityCandidateId!);
    const coverage = coverageFromPacket(packet);
    const layers = layersFromPacket(packet);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet,
    });
    expect(coverage.materialCoverageSufficient).toBe(true);
    expect(layers.unitEconomics).toBe("UNKNOWN");
    expect(evaluateEvidenceReadiness({ packet, coverage, monetization, layers }).readyForDecision).toBe(true);
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(monetization?.primaryPlan?.ltvCacRatio).toBeNull();
  });

  it("VALIDATE is allowed when material evidence is sufficient and unit economics are unknown", () => {
    const { submission, grade } = analyzePacket(validateUnknownEconomicsPacket, {
      idempotencyKey: "validate-unknown",
      monetization: unknownEconomicsValidateMonetization(),
    });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).toBe("VALIDATE");
    expect(submission.status).toBe("VALIDATING");
    expect(grade?.buildReady).toBe(false);
    expect(grade?.buildReadiness).not.toBe("BUILD");
    expect(submission.status).not.toBe("BUILD_APPROVED");
  });

  it("HOLD is allowed with unknown unit economics when evidence supports HOLD", () => {
    const { submission, grade } = analyzePacket(artMarketplaceIntegrityPacket, { idempotencyKey: "hold-unknown" });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).toBe("HOLD");
    expect(submission.status).toBe("HELD");
    expect(grade?.buildReady).toBe(false);
  });

  it("REJECT is allowed with unknown unit economics and is not INSUFFICIENT_EVIDENCE", () => {
    const { submission, grade } = analyzePacket(rejectUnknownEconomicsPacket, { idempotencyKey: "reject-unknown" });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).toBe("REJECT");
    expect(submission.status).toBe("REJECTED");
    expect(submission.failureCode).not.toBe("INSUFFICIENT_EVIDENCE");
    expect(grade?.buildReady).toBe(false);
  });

  it("BUILD is forbidden when unit economics are unknown", () => {
    const { store, submission, grade } = analyzePacket(validateUnknownEconomicsPacket, { idempotencyKey: "no-build" });
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(grade?.buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });

  it("BUILD is forbidden with known bad LTV/CAC; classifier is not forced to VALIDATE", () => {
    const { submission, grade } = analyzePacket(validateUnknownEconomicsPacket, {
      idempotencyKey: "bad-econ",
      monetization: weakMonetizationFixture(),
    });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(grade?.buildReady).toBe(false);
    expect(["VALIDATE", "HOLD", "REJECT"]).toContain(submission.infinityDecision);
  });

  it("BUILD is allowed only with known good economics and all existing gates", () => {
    const { submission, grade } = analyzePacket(workflowSaasIntegrityPacket, {
      idempotencyKey: "good-econ",
      monetization: saasWorkflowMonetizationFixture(),
    });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).toBe("BUILD");
    expect(grade?.buildReady).toBe(true);
    expect(submission.status).toBe("READY_FOR_DECISION");
    expect(submission.status).not.toBe("BUILD_APPROVED");
  });

  it("unknown / null LTV CAC is not treated as zero; numeric zero remains distinct", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "ratio" }));
    convertFounderIdeaToCandidate(store, submission, { scores: undefined, researchGrounded: true });
    const candidate = store.candidates.get(submission.opportunityCandidateId!)!;

    const unknownEval = gradeLoadedCandidate(
      buildLoadedCandidate(
        candidate,
        withPlan(saasWorkflowMonetizationFixture(), {
          estimatedCAC: null,
          estimatedLTV: null,
          ltvCacRatio: null,
        }),
      ),
    );
    const unknownGate = passesBuildGate({ evaluation: unknownEval, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
    expect(unknownGate.passes).toBe(false);
    expect(unknownGate.reasons).toContain(UNKNOWN_UNIT_ECONOMICS_REASON);
    expect(unknownGate.reasons.some((reason) => reason.includes("LTV/CAC below minimum"))).toBe(false);

    const missingCac = gradeLoadedCandidate(
      buildLoadedCandidate(
        candidate,
        withPlan(saasWorkflowMonetizationFixture(), { estimatedCAC: null, estimatedLTV: 900, ltvCacRatio: 7.5 }),
      ),
    );
    expect(
      passesBuildGate({ evaluation: missingCac, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS }).reasons,
    ).toContain(UNKNOWN_UNIT_ECONOMICS_REASON);

    const missingLtv = gradeLoadedCandidate(
      buildLoadedCandidate(
        candidate,
        withPlan(saasWorkflowMonetizationFixture(), { estimatedCAC: 120, estimatedLTV: null, ltvCacRatio: 7.5 }),
      ),
    );
    expect(
      passesBuildGate({ evaluation: missingLtv, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS }).reasons,
    ).toContain(UNKNOWN_UNIT_ECONOMICS_REASON);

    const nullRatio = gradeLoadedCandidate(
      buildLoadedCandidate(
        candidate,
        withPlan(saasWorkflowMonetizationFixture(), { estimatedCAC: 120, estimatedLTV: 900, ltvCacRatio: null }),
      ),
    );
    expect(
      passesBuildGate({ evaluation: nullRatio, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS }).reasons,
    ).toContain(UNKNOWN_UNIT_ECONOMICS_REASON);

    const zeroEval = gradeLoadedCandidate(
      buildLoadedCandidate(
        candidate,
        withPlan(saasWorkflowMonetizationFixture(), { estimatedCAC: 100, estimatedLTV: 0, ltvCacRatio: 0 }),
      ),
    );
    const zeroGate = passesBuildGate({ evaluation: zeroEval, thresholds: DEFAULT_BUILD_GATE_THRESHOLDS });
    expect(zeroGate.reasons).toContain("LTV/CAC below minimum.");
    expect(zeroGate.reasons).not.toContain(UNKNOWN_UNIT_ECONOMICS_REASON);

    const unknownClassified = classifyDecision({
      evaluation: { ...unknownEval, selectionScore: 70 },
      buildGatePassed: false,
      buildGateReasons: unknownGate.reasons,
      hasResourceCapacity: true,
      decisionThresholds: DEFAULT_DECISION_THRESHOLDS,
    });
    expect(unknownClassified.decision).not.toBe("BUILD");
  });

  it("placeholder CAC/LTV do not satisfy validated BUILD economics", () => {
    const placeholder = withPlan(saasWorkflowMonetizationFixture(), RESEARCH_ADAPTER_PLACEHOLDER_SUPPORTED);
    expect(isResearchAdapterPlaceholderEconomics(placeholder.primaryPlan)).toBe(true);
    expect(unitEconomicsNumericallyKnown(placeholder.primaryPlan)).toBe(false);

    const { store, submission, grade } = analyzePacket(workflowSaasIntegrityPacket, {
      idempotencyKey: "placeholder",
      monetization: placeholder,
    });
    expect(grade?.readyForDecision).toBe(true);
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(grade?.buildReady).toBe(false);
    const build = evaluateBuildReadiness({ decisionReady: true, evaluation: grade?.evaluation ?? null });
    expect(build.reason).toBe("PLACEHOLDER_ECONOMICS");
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });

  it("production research adapter never emits placeholder CAC/LTV", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "adapter" }));
    convertFounderIdeaToCandidate(store, submission);
    const packet = workflowSaasIntegrityPacket(submission.id, submission.opportunityCandidateId!);
    const monetization = monetizeFromResearchPacket({
      candidate: store.candidates.get(submission.opportunityCandidateId!)!,
      packet,
    });
    expect(packet.monetizationLayers.unitEconomics).toBe("SUPPORTED");
    expect(monetization?.primaryPlan?.estimatedCAC).toBeNull();
    expect(monetization?.primaryPlan?.estimatedLTV).toBeNull();
    expect(monetization?.primaryPlan?.ltvCacRatio).toBeNull();
    expect(isResearchAdapterPlaceholderEconomics(monetization?.primaryPlan)).toBe(false);
  });

  it("Founder VALIDATE can enter existing bounded validation without BUILD", () => {
    const { store, submission, grade } = analyzePacket(validateUnknownEconomicsPacket, {
      idempotencyKey: "handoff",
      monetization: unknownEconomicsValidateMonetization(),
    });
    expect(submission.infinityDecision).toBe("VALIDATE");
    expect(grade?.evaluation?.decision).toBe("VALIDATE");
    expect(founderActionsFor("VALIDATE")).toContain("VALIDATE_MORE");
    const plan = validationPlanFor(store, submission.id);
    expect(plan.treasuryRequired).toBe(true);
    expect(plan.plannedValidation.length).toBeGreaterThan(0);
    expect(grade?.buildReady).toBe(false);
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
  });

  it("negative material evidence classifies without being blocked by unknown economics", () => {
    const { submission } = analyzePacket(rejectUnknownEconomicsPacket, { idempotencyKey: "neg" });
    expect(["HOLD", "REJECT"]).toContain(submission.infinityDecision);
    expect(submission.status).not.toBe("INSUFFICIENT_EVIDENCE");
  });

  it("strong positive evidence with unknown economics is non-BUILD and validation-eligible", () => {
    const { submission, grade } = analyzePacket(validateUnknownEconomicsPacket, { idempotencyKey: "pos" });
    expect(["VALIDATE", "HOLD", "REJECT"]).toContain(submission.infinityDecision);
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(grade?.buildReady).toBe(false);
    if (submission.infinityDecision === "VALIDATE") {
      expect(grade?.evaluation?.decision).toBe("VALIDATE");
      expect(founderActionsFor("VALIDATE")).toContain("VALIDATE_MORE");
    }
  });

  it("historical 43.61 fallback remains historical and is not used as the current decision", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(store, input({ idempotencyKey: "hist" }));
    convertFounderIdeaToCandidate(store, submission);
    seedHistorical(store, submission);
    expect(store.evaluationHistory.get(submission.id)?.[0]?.opportunityScore).toBe(43.61);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: validateUnknownEconomicsPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.opportunityQuality).not.toBe(43.61);
    expect(grade?.scoreIntegrity).not.toBe("FALLBACK_HISTORICAL");
    expect(submission.infinityDecision).not.toBeNull();
    const rows = listFounderIdeas(store, ORG_A);
    expect(rows[0]?.historicalScore).toBe("43.61");
    expect(rows[0]?.score).not.toBe("43.61");
  });

  it("HQ shows diagnostic scores when incomplete and does not infer BUILD from score", () => {
    const incomplete = analyzePacket(categorySupportedIdeaUnprovenPacket, { idempotencyKey: "hq-incomplete" });
    const incompleteRow = listFounderIdeas(incomplete.store, ORG_A)[0];
    expect(incomplete.grade?.readyForDecision).toBe(false);
    expect(incompleteRow?.scoreKind).toBe("DIAGNOSTIC");
    expect(incompleteRow?.score).toMatch(/^DIAGNOSTIC /);
    expect(incompleteRow?.buildReady).toBe("NO");
    expect(incompleteRow?.infinityDecision).toBe("UNKNOWN");

    const ready = analyzePacket(validateUnknownEconomicsPacket, { idempotencyKey: "hq-ready" });
    const readyRow = listFounderIdeas(ready.store, ORG_A)[0];
    expect(readyRow?.scoreKind).toBe("DECISION_GRADE");
    expect(readyRow?.score).not.toMatch(/^DIAGNOSTIC /);
    expect(readyRow?.buildReady).toBe("NO");
    expect(readyRow?.infinityDecision).not.toBe("BUILD");
  });

  it("material coverage insufficiency still blocks decision readiness", () => {
    const { submission, grade } = analyzePacket(categorySupportedIdeaUnprovenPacket, {
      idempotencyKey: "coverage",
    });
    expect(grade?.coverage?.materialCoverageSufficient).toBe(false);
    expect(grade?.readyForDecision).toBe(false);
    expect(submission.infinityDecision).toBeNull();
    expect(submission.status).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("unknown economics cannot grant Treasury spend or commercialization / public launch", () => {
    const { store, submission } = analyzePacket(validateUnknownEconomicsPacket, { idempotencyKey: "auth" });
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(() => routeFounderBuild(store, submission)).toThrow("BUILD_NOT_APPROVED");
    const { store: treasury } = createGovernedStore();
    const gate = assertFounderSpendStillTreasuryGated(treasury, submission);
    expect(gate.bypassed).toBe(false);
    expect(gate.authorized).toBe(false);
    expect(gate.reasonCodes).toContain("FINANCIAL_AUTONOMY_DISABLED");
  });

  it("Infinity CMS live V5 evidence shape classifies without live writes", () => {
    const store = new FounderIdeaStore();
    const submission = submitFounderIdea(
      store,
      input({
        idempotencyKey: "cms-replay",
        title: "Infinity CMS",
        description:
          "Build a cms for businesses that they would fill out a knowledge base when they sign up",
      }),
    );
    convertFounderIdeaToCandidate(store, submission);
    seedHistorical(store, submission);
    const { grade } = analyzeFounderIdea(store, submission, {
      researchPacket: infinityCmsLiveV5ReplayPacket(submission.id, submission.opportunityCandidateId!),
    });
    expect(grade?.coverage?.materialCoverageSufficient).toBe(true);
    expect(grade?.monetizationLayers?.category).toBe("SUPPORTED");
    expect(grade?.monetizationLayers?.unitEconomics).toBe("UNKNOWN");
    expect(grade?.opportunityQuality).toBe(68.7);
    expect(grade?.readyForDecision).toBe(true);
    expect(grade?.buildReady).toBe(false);
    expect(grade?.selectionScore).toBe(51.68);
    expect(grade?.evaluation?.portfolioAdjustedScore).toBe(51.68);
    expect(grade?.validationScore).toBe(58.79);
    expect(grade?.monetizationScore).toBe(54);
    expect(submission.infinityDecision).not.toBe("BUILD");
    expect(submission.infinityDecision).toBe("HOLD");
    expect(submission.status).toBe("HELD");
    expect(grade?.evaluation?.recommendedNextAction).toMatch(/Monitor and rescan/i);
    expect(submission.status).not.toBe("INSUFFICIENT_EVIDENCE");
    const rows = listFounderIdeas(store, ORG_A);
    expect(rows[0]?.historicalScore).toBe("43.61");
    expect(rows[0]?.scoreKind).toBe("DECISION_GRADE");
    expect(rows[0]?.score).toBe("68.7");
    expect(rows[0]?.buildReady).toBe("NO");
  });

  it("founder VALIDATE action remains available and does not approve BUILD", () => {
    const { store, submission } = analyzePacket(validateUnknownEconomicsPacket, {
      idempotencyKey: "action",
      monetization: unknownEconomicsValidateMonetization(),
    });
    applyFounderDecision(store, {
      submissionId: submission.id,
      action: "VALIDATE_MORE",
      actorUserId: USER_A,
      actorOrganizationId: ORG_A,
    });
    expect(submission.founderDecision).toBe("VALIDATE");
    expect(submission.status).toBe("VALIDATING");
    expect(submission.infinityDecision).not.toBe("BUILD");
  });
});
