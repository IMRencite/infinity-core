import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { ASKREVIEW_HYPOTHESIZED_MONTHLY_USD, ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { persistAskReviewOperationalRecord } from "@/lib/infinity/second-venture-factory/persist-record";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { resetVentureOperatingScaleStore } from "@/lib/infinity/venture-operating-scale/persist";
import { evaluateBuildAuthorization } from "@/lib/infinity/venture-build-orchestration/authorization";
import { buildAskReviewEconomics } from "../askreview";
import { evaluateAdvancementEconomicsGate } from "../advancement";
import {
  evaluateHQVentureEconomicsVisibilityGate,
  evaluateProfitLabCompletenessGate,
  evaluateVentureCommercialIntelligenceGate,
  evaluateVentureCompetitorResearchGate,
  evaluateVentureEconomicsReadinessGate,
  missingEconomicsBlocksAdvancement,
} from "../gates";
import { attachProfitLabToDepartment, buildProfitLabArtifacts, projectProfitLabHq } from "../hq";
import { buildOccupancynpvEconomics } from "../occupancynpv";
import {
  enqueueEconomicsOnPromotion,
  ensureAllCanonicalVentureEconomics,
  readVentureEconomics,
  resetVentureEconomicsStore,
} from "../persist";
import { buildResearchRequiredEconomics } from "../research-required";
import type { OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";

function emptyProfitLab(): OperatorDepartmentSnapshot {
  return {
    id: "strategy_finance",
    label: "Profit Lab",
    state: "NOT_STARTED",
    engines: ["monetization_engine"],
    summary: null,
    currentTask: null,
    provider: null,
    model: null,
    costUsd: null,
    costKnown: false,
    startedAt: null,
    lastActivityAt: null,
    recordCount: 0,
    detail: {},
    isActive: false,
    isNextMissionTarget: false,
  };
}

describe("GLOBAL_VENTURE_ECONOMICS_ASSURANCE_V1", () => {
  beforeEach(() => {
    resetVentureEconomicsStore();
    resetVentureOperatingScaleStore();
  });

  it("blocks empty economics and research-never-ran", () => {
    expect(evaluateVentureEconomicsReadinessGate(null).result).toBe("FAIL");
    expect(evaluateVentureEconomicsReadinessGate(null).reasons).toContain("RESEARCH_NEVER_RAN");
    const stub = buildResearchRequiredEconomics({
      venture_id: "candidate:future",
      venture_name: "Future",
      opportunity_id: "future",
    });
    expect(stub.research_ran).toBe(false);
    expect(evaluateVentureCompetitorResearchGate(stub).result).toBe("FAIL");
    expect(missingEconomicsBlocksAdvancement(stub)).toBe(true);
    expect(evaluateAdvancementEconomicsGate({ ventureId: "candidate:future", stage: "BUILD" }).blocked).toBe(true);
  });

  it("does not treat UNKNOWN as zero and refuses fabricated competitors", () => {
    const occ = buildOccupancynpvEconomics();
    expect(occ.fabricated_competitors).toBe(0);
    expect(occ.customer_acquisition_model.classification).toBe("UNKNOWN");
    expect(occ.customer_acquisition_model.numeric).toBeNull();
    expect(occ.customer_acquisition_model.display).toContain("UNKNOWN");
    expect(occ.unit_economics.contribution_margin.classification).toBe("UNKNOWN");
    expect(occ.unit_economics.payment_processing_cost.classification).toBe("DERIVED");
    expect(occ.unit_economics.price.display).toContain("$290");
    expect(occ.unit_economics.price.display).toContain("$149");
    expect(occ.competitors.length + occ.substitutes.length).toBeGreaterThanOrEqual(3);
    expect(occ.pricing_benchmarks.length).toBeGreaterThanOrEqual(3);
    expect(occ.evidence.length).toBeGreaterThanOrEqual(6);
    expect(evaluateVentureCompetitorResearchGate(occ).result).toBe("PASS");
    expect(evaluateVentureEconomicsReadinessGate(occ).result).toBe("PASS");
    expect(evaluateVentureCommercialIntelligenceGate(occ).result).toBe("PASS");
  });

  it("keeps AskReview prices as hypotheses and production paused", () => {
    const ask = buildAskReviewEconomics();
    expect(ask.unit_economics.price.classification).toBe("HYPOTHESIS");
    expect(ask.unit_economics.price.display).toContain(`$${ASKREVIEW_HYPOTHESIZED_MONTHLY_USD}/month`);
    expect(ask.pricing_benchmarks.some((row) => row.amount_display.includes("$49") && row.classification === "HYPOTHESIS")).toBe(true);
    expect(ask.production_advancement).toBe("PAUSED");
    expect(ask.stage).toBe("ECONOMICS_PRELIMINARY");
    expect(evaluateVentureEconomicsReadinessGate(ask).result).toBe("PASS");
  });

  it("auto-enqueues economics on AskReview promotion without a founder prompt", () => {
    persistAskReviewOperationalRecord();
    const record = readVentureEconomics(ASKREVIEW_VENTURE_ID);
    expect(record?.research_ran).toBe(true);
    expect(record?.venture_name).toBe("AskReview");
    const promoted = enqueueEconomicsOnPromotion({ venture_id: CRE_VENTURE_ID, opportunity_id: "7e7e924e-0741-4155-a729-8d529da77ea9" });
    expect(promoted.venture_id).toBe(CRE_VENTURE_ID);
    expect(promoted.research_ran).toBe(true);
  });

  it("projects Profit Lab rows, competitors, evidence, and unknowns for every canonical venture", () => {
    const records = ensureAllCanonicalVentureEconomics();
    expect(records).toHaveLength(2);
    const view = projectProfitLabHq(records);
    expect(view.rows).toHaveLength(2);
    expect(view.empty_canonical_rooms).toBe(0);
    expect(view.competitors.length).toBeGreaterThanOrEqual(6);
    expect(view.evidence.length).toBeGreaterThanOrEqual(10);
    expect(view.pricing_benchmarks.length).toBeGreaterThanOrEqual(7);
    expect(view.room_state).not.toBe("IDLE");
    expect(view.room_state_label).toBe("Waiting on evidence");
    expect(evaluateProfitLabCompletenessGate(view).result).toBe("PASS");
    expect(evaluateHQVentureEconomicsVisibilityGate({ view, artifactsVisible: true }).result).toBe("PASS");
    const artifacts = buildProfitLabArtifacts(view);
    expect(artifacts.some((item) => item.artifactType === "venture_economics")).toBe(true);
    expect(artifacts.some((item) => item.artifactType === "competitor_intelligence")).toBe(true);
    const attached = attachProfitLabToDepartment(emptyProfitLab());
    expect(attached.state === "WAITING" || attached.state === "BLOCKED").toBe(true);
    expect((attached.detail.profitLabView as { rows: unknown[] }).rows).toHaveLength(2);
    expect(attached.workArtifacts?.length).toBeGreaterThan(0);
  });

  it("makes OccupancyNPV and AskReview founder-readable without raw JSON or fabricated actuals", () => {
    const view = projectProfitLabHq(ensureAllCanonicalVentureEconomics());
    const occ = view.ventures.find((row) => row.venture_name === "OccupancyNPV");
    const ask = view.ventures.find((row) => row.venture_name === "AskReview");
    expect(occ?.current_price).toContain("$290");
    expect(occ?.current_price).toContain("$149");
    expect(occ?.scenarios).toHaveLength(3);
    expect(occ?.unit_economics.length).toBeGreaterThanOrEqual(8);
    expect(occ?.expected_vs_actual.some((row) => row.actual.includes("UNKNOWN") || row.actual.includes("Observed live"))).toBe(true);
    expect(occ?.cac).toContain("UNKNOWN");
    expect(occ?.ltv).toContain("UNKNOWN");
    expect(occ?.unknowns.length).toBeGreaterThan(0);
    expect(ask?.current_price).toContain("HYPOTHESIS");
    expect(ask?.production_note).toBe("Production paused");
    expect(view.evidence.every((item) => item.claim && item.venture_name)).toBe(true);
    expect(view.competitors.every((item) => item.type_label && !item.type_label.includes("_"))).toBe(true);
    const missing = projectProfitLabHq([buildResearchRequiredEconomics({
      venture_id: "candidate:future",
      venture_name: "Future",
      opportunity_id: "future",
    })]);
    expect(evaluateProfitLabCompletenessGate(missing).result).toBe("FAIL");
    expect(evaluateHQVentureEconomicsVisibilityGate({ view: missing, artifactsVisible: false }).result).toBe("FAIL");
    expect(missing.room_state).toBe("RESEARCH_REQUIRED");
    expect(missing.ventures[0]?.research_required).toBe(true);
    const panel = readFileSync(join(process.cwd(), "components/dashboard/operator-console/department-detail-panel.tsx"), "utf8");
    expect(panel).toContain("Low / base / high scenarios");
    expect(panel).toContain("Expected vs actual");
    expect(panel).toContain("Competitor landscape");
    expect(panel).toContain("Pricing benchmarks");
    expect(panel).toContain("Confidence by dimension");
    expect(panel).toContain("data-hq-profit-lab");
    expect(panel).not.toContain("JSON.stringify(department.detail, null, 2)");
  });

  it("blocks BUILD when required economics intelligence is missing", () => {
    const denied = evaluateBuildAuthorization({
      ventureId: CRE_VENTURE_ID,
      decision: "BUILD",
      buildReady: true,
      buildReadyReason: "",
      evidence: { customerPain: true, competition: true, monetization: true, research: true, missing: [] },
      economics: { known: true, placeholder: false },
      policyBlocked: false,
      policyReasons: [],
      alreadyBuilding: false,
      alreadyBuilt: false,
    });
    expect(denied.result).toBe("ECONOMICS_BLOCKED");
    expect(denied.reasons).toContain("RESEARCH_NEVER_RAN");
  });
});
