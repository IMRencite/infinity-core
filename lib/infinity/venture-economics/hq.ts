import type { HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentUiState, OperatorDepartmentSnapshot } from "@/lib/infinity/operator-console/types";
import {
  CANONICAL_ECONOMICS_UNAVAILABLE,
  PROJECTION_ERROR,
} from "@/lib/infinity/hq-inspection-identity/types";
import { hqVentureIdentitiesMatch, isCanonicalInspectTarget } from "@/lib/infinity/hq-inspection-identity/aliases";
import { buildProfitLabVentureCard, freshnessLabel, humanizeCompetitorType, humanizeClassification, humanizeRoomState } from "./display";
import {
  evaluateHQVentureEconomicsVisibilityGate,
  evaluateProfitLabCompletenessGate,
  evaluateVentureCommercialIntelligenceGate,
  evaluateVentureCompetitorResearchGate,
  evaluateVentureEconomicsFreshnessGate,
  evaluateVentureEconomicsReadinessGate,
} from "./gates";
import { countEconomicsHistory, ensureAllCanonicalVentureEconomics, listVentureEconomics } from "./persist";
import type {
  ProfitLabHqRow,
  ProfitLabHqView,
  ProfitLabRoomState,
  VentureEconomicsIntelligenceRecord,
} from "./types";
import {
  projectPortfolioCapitalView,
  projectVentureFinancialView,
} from "@/lib/infinity/venture-financial-governance/projection";
import { projectVentureOfferArchitectureHq } from "@/lib/infinity/offer-architecture/hq";

function nextRefresh(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "UNKNOWN — RESEARCH REQUIRED";
  return new Date(t + 90 * 24 * 60 * 60 * 1000).toISOString();
}

function roomStateFor(record: VentureEconomicsIntelligenceRecord): ProfitLabRoomState {
  if (!record.research_ran) return "RESEARCH_REQUIRED";
  if (record.economic_unknowns.length > 0) return "WAITING";
  return "IDLE";
}

function rowFrom(record: VentureEconomicsIntelligenceRecord): ProfitLabHqRow {
  const competitorPrices = record.pricing_benchmarks
    .filter((row) => !row.name.includes("OccupancyNPV") && !row.name.includes("AskReview"))
    .map((row) => row.amount_display);
  const state = roomStateFor(record);
  return {
    venture_id: record.venture_id,
    venture_name: record.venture_name,
    monetization_model: record.recommended_monetization_model || "UNKNOWN — RESEARCH REQUIRED",
    current_price: record.unit_economics.price.display,
    competitor_price_range: competitorPrices.join(" · ") || "UNKNOWN — RESEARCH REQUIRED",
    gross_margin: record.unit_economics.gross_margin.display,
    contribution_margin: record.unit_economics.contribution_margin.display,
    cac: record.customer_acquisition_model.display,
    ltv: record.lifetime_value_model.display,
    ltv_cac: record.ltv_cac_ratio.display,
    payback: record.payback_period.display,
    break_even: record.break_even_model.display,
    confidence: record.confidence.overall,
    last_research: record.last_verified_at,
    next_refresh: nextRefresh(record.last_verified_at),
    freshness: freshnessLabel(record.last_verified_at),
    room_state: state,
    room_state_label: humanizeRoomState(state),
    research_ran: record.research_ran,
    unknowns: record.economic_unknowns,
  };
}

export function filterProfitLabViewForVenture(
  view: ProfitLabHqView,
  inspectedVentureId: string | null | undefined,
): ProfitLabHqView {
  if (!inspectedVentureId) return { ...view, inspected_venture_id: null, projection_error: view.projection_error ?? null };
  if (!isCanonicalInspectTarget(inspectedVentureId)) {
    return { ...view, inspected_venture_id: inspectedVentureId, projection_error: view.projection_error ?? null };
  }
  const rows = view.rows.filter((row) => hqVentureIdentitiesMatch(row.venture_id, inspectedVentureId));
  const ventures = view.ventures.filter((card) => hqVentureIdentitiesMatch(card.venture_id, inspectedVentureId));
  const names = new Set([...rows.map((row) => row.venture_name), ...ventures.map((card) => card.venture_name)]);
  const expected = isCanonicalInspectTarget(inspectedVentureId);
  const projection_error =
    expected && rows.length === 0
      ? `${PROJECTION_ERROR} — ${CANONICAL_ECONOMICS_UNAVAILABLE}`
      : view.projection_error ?? null;
  return {
    ...view,
    inspected_venture_id: inspectedVentureId,
    projection_error,
    rows,
    ventures,
    competitors: view.competitors.filter((item) => names.has(item.venture_name)),
    evidence: view.evidence.filter((item) => names.has(item.venture_name)),
    pricing_benchmarks: view.pricing_benchmarks.filter((item) => names.has(item.venture_name)),
    financials: (view.financials ?? []).filter((row) => hqVentureIdentitiesMatch(row.venture_id, inspectedVentureId)),
    offer_architecture: (view.offer_architecture ?? []).filter((row) => hqVentureIdentitiesMatch(row.venture_id, inspectedVentureId)),
    portfolio_capital: view.portfolio_capital,
    empty_canonical_rooms: rows.filter((row) => !row.research_ran || !row.current_price).length,
  };
}

export function projectProfitLabHq(records = listVentureEconomics()): ProfitLabHqView {
  const rows = records.map(rowFrom);
  const financials = financialsFromRecords(records);
  const empty = rows.filter((row) => !row.research_ran || !row.current_price || row.current_price === "").length;
  const room_state: ProfitLabRoomState = rows.some((row) => row.room_state === "RESEARCH_REQUIRED")
    ? "RESEARCH_REQUIRED"
    : rows.some((row) => row.room_state === "WAITING")
      ? "WAITING"
      : rows.length === 0
        ? "RESEARCH_REQUIRED"
        : "IDLE";
  return {
    inspected_venture_id: null,
    projection_error: null,
    room_state,
    room_state_label: humanizeRoomState(room_state),
    empty_canonical_rooms: empty,
    rows,
    ventures: records.map((record) => buildProfitLabVentureCard(record, countEconomicsHistory(record.venture_id))),
    competitors: records.flatMap((record) =>
      [...record.competitors, ...record.substitutes].map((item) => ({
        venture_name: record.venture_name,
        name: item.name,
        type_label: humanizeCompetitorType(item.type),
        observed_pricing: item.observed_pricing.display,
        positioning: item.positioning,
        differentiation: item.differentiation_opportunity,
        source: item.evidence_source,
        last_checked: item.retrieved_at,
        confidence: item.confidence,
      })),
    ),
    evidence: records.flatMap((record) =>
      record.evidence.map((item) => ({
        ...item,
        venture_name: record.venture_name,
        claim: item.label,
      })),
    ),
    pricing_benchmarks: records.flatMap((record) =>
      record.pricing_benchmarks.map((row) => ({
        venture_name: record.venture_name,
        name: row.name,
        amount: row.amount_display,
        classification: humanizeClassification(row.classification),
        source: row.source,
      })),
    ),
    financials,
    offer_architecture: records.map((record) => {
      const offer = projectVentureOfferArchitectureHq(record.venture_id);
      return {
        venture_id: record.venture_id,
        pricing_architecture: offer.pricing_architecture,
        purchase_model: offer.purchase_model,
        promotional_offer: offer.promotional_offer,
        offer_optimization: offer.offer_optimization,
        conversion_ux: offer.conversion_ux,
        above_fold_cta: offer.above_fold_cta,
        panel_spacing: offer.panel_spacing,
        card_required: offer.card_required,
        auto_convert: offer.auto_convert,
        pricing_content_depth: offer.pricing_content_depth,
        page: offer.page,
        information_depth: offer.information_depth,
        question_coverage: offer.question_coverage,
        product_understanding: offer.product_understanding,
        buyer_decision_support: offer.buyer_decision_support,
        information_gain: offer.information_gain,
        thinness: offer.thinness,
        missing_material_questions: offer.missing_material_questions,
        page_depth_summary: offer.page_depth_summary,
        page_depth_thin_pages: offer.page_depth_thin_pages,
        page_depth_missing_questions: offer.page_depth_missing_questions,
        whitespace: offer.whitespace,
        current_offer: offer.current_offer,
        offer_type: String(offer.offer_type),
        trial_pilot: offer.trial_pilot,
        purchase_friction: String(offer.purchase_friction),
        time_to_value: String(offer.time_to_value),
        customer_suggestion_signals: offer.customer_suggestion_signals,
        current_experiment: offer.current_experiment,
      };
    }),
    portfolio_capital: projectPortfolioCapitalView({
      venture_ids: records.map((row) => row.venture_id),
      active_ventures: records.filter((row) => row.production_advancement !== "PAUSED").length,
      pre_revenue_ventures: financials.filter((row) => row.transaction_count === 0).length,
      profitable_ventures: 0,
      active_build_count: 0,
      unvalidated_at_risk: 0,
    }),
  };
}

function financialsFromRecords(records: VentureEconomicsIntelligenceRecord[]) {
  return records.map((record) =>
    projectVentureFinancialView(record.venture_id, {
      revenue_assumptions: record.unit_economics.price.display,
      cac: record.customer_acquisition_model.display,
      ltv: record.lifetime_value_model.display,
      contribution: record.unit_economics.contribution_profit.display,
      payback: record.payback_period.display,
      break_even: record.break_even_model.display,
      confidence: record.confidence.overall,
    }),
  );
}

export function buildProfitLabArtifacts(view: ProfitLabHqView): HqWorkArtifact[] {
  const artifacts: HqWorkArtifact[] = view.rows.map((row) => ({
    id: `profit_lab_current_${row.venture_id}`,
    roomId: "strategy_finance",
    artifactType: "venture_economics",
    title: `${row.venture_name} current economics`,
    subtitle: `${row.monetization_model} · ${row.current_price} · confidence ${row.confidence}`,
    state: "READY",
    createdAt: row.last_research,
    sourceRecordType: "VentureEconomicsIntelligenceContract",
    sourceRecordId: row.venture_id,
    metadata: {
      monetization_model: row.monetization_model,
      current_price: row.current_price,
      competitor_price_range: row.competitor_price_range,
      gross_margin: row.gross_margin,
      contribution_margin: row.contribution_margin,
      cac: row.cac,
      ltv: row.ltv,
      ltv_cac: row.ltv_cac,
      payback: row.payback,
      break_even: row.break_even,
      confidence: row.confidence,
      last_research: row.last_research,
      next_refresh: row.next_refresh,
      unknowns: row.unknowns.join("; ") || "NONE",
    },
    lineageId: row.venture_id,
    lineageType: "venture",
    lineageLabel: row.venture_name,
  }));
  for (const competitor of view.competitors) {
    artifacts.push({
      id: `profit_lab_competitor_${competitor.venture_name}_${competitor.name}`.replace(/[^a-zA-Z0-9_]+/g, "_"),
      roomId: "strategy_finance",
      artifactType: "competitor_intelligence",
      title: `${competitor.venture_name}: ${competitor.name}`,
      subtitle: `${competitor.type_label} · ${competitor.observed_pricing}`,
      state: "READY",
      createdAt: competitor.last_checked,
      sourceRecordType: "VentureCompetitorIntelligenceContract",
      sourceRecordId: competitor.name,
      metadata: {
        type: competitor.type_label,
        observed_pricing: competitor.observed_pricing,
        positioning: competitor.positioning,
        differentiation: competitor.differentiation,
        source: competitor.source,
        last_checked: competitor.last_checked,
      },
      lineageLabel: competitor.venture_name,
    });
  }
  if (view.portfolio_capital) {
    artifacts.push({
      id: "profit_lab_portfolio_capital",
      roomId: "strategy_finance",
      artifactType: "venture_capital_allocation",
      title: "Portfolio capital",
      subtitle: `${view.portfolio_capital.authorized_capital} authorized · creation ${view.portfolio_capital.new_venture_creation_state}`,
      state: "READY",
      createdAt: new Date().toISOString(),
      sourceRecordType: "PortfolioCapitalBudgetContract",
      sourceRecordId: "portfolio",
      metadata: { ...view.portfolio_capital },
      lineageType: null,
      lineageLabel: "Portfolio",
    });
  }
  for (const financial of view.financials ?? []) {
    const actualRevenue = financial.actual.find((row) => row.label === "Revenue")?.value ?? "UNKNOWN";
    artifacts.push({
      id: `profit_lab_actual_${financial.venture_id}`,
      roomId: "strategy_finance",
      artifactType: "commercial_revenue",
      title: "Actual economics",
      subtitle: `${actualRevenue} · ${financial.transaction_count} transactions`,
      state: "READY",
      createdAt: financial.freshness.last_ledger_calc ?? new Date().toISOString(),
      sourceRecordType: "VentureFinancialLedgerContract",
      sourceRecordId: financial.venture_id,
      metadata: {
        revenue: actualRevenue,
        transaction_count: financial.transaction_count,
        budget: financial.budget.find((row) => row.label === "Budget")?.value ?? "NOT_SET",
      },
      lineageId: financial.venture_id,
      lineageType: "venture",
    });
  }
  return artifacts;
}

function mapRoomState(state: ProfitLabRoomState): DepartmentUiState {
  if (state === "ACTIVE") return "RUNNING";
  if (state === "WAITING" || state === "RESEARCH_REQUIRED") return "WAITING";
  if (state === "BLOCKED" || state === "AUTHORIZATION_REQUIRED") return "BLOCKED";
  return "COMPLETE";
}

export function attachProfitLabToDepartment(
  dept: OperatorDepartmentSnapshot,
  inspectedVentureId?: string | null,
): OperatorDepartmentSnapshot {
  if (dept.id !== "strategy_finance") return dept;
  const records = ensureAllCanonicalVentureEconomics();
  const view = filterProfitLabViewForVenture(projectProfitLabHq(records), inspectedVentureId);
  const attached = buildProfitLabArtifacts(view);
  const workArtifacts = [...(dept.workArtifacts ?? []), ...attached];
  const keepActive = dept.state === "RUNNING" || dept.state === "FAILED";
  return {
    ...dept,
    state: keepActive ? dept.state : mapRoomState(view.room_state),
    summary: `${view.rows.length} ventures · ${view.competitors.length} competitor/substitute records · ${view.room_state_label}`,
    currentTask: view.room_state === "RESEARCH_REQUIRED" ? "Competitor and economics research required" : dept.currentTask,
    recordCount: Math.max(dept.recordCount, workArtifacts.length),
    workArtifacts,
    artifacts: workArtifacts.length > 0 ? [] : dept.artifacts,
    detail: {
      ...dept.detail,
      profitLabView: view,
      economicsGates: {
        readiness: records.map((row) => evaluateVentureEconomicsReadinessGate(row)),
        competitor: records.map((row) => evaluateVentureCompetitorResearchGate(row)),
        commercial: records.map((row) => evaluateVentureCommercialIntelligenceGate(row)),
        freshness: records.map((row) => evaluateVentureEconomicsFreshnessGate(row)),
        completeness: evaluateProfitLabCompletenessGate(view),
        visibility: evaluateHQVentureEconomicsVisibilityGate({ view, artifactsVisible: attached.length > 0 }),
      },
    },
  };
}

export function evaluateProfitLabHqGates() {
  const records = ensureAllCanonicalVentureEconomics();
  const view = projectProfitLabHq(records);
  return {
    view,
    completeness: evaluateProfitLabCompletenessGate(view),
    visibility: evaluateHQVentureEconomicsVisibilityGate({ view, artifactsVisible: view.rows.length > 0 }),
    readiness: records.map((row) => ({ venture_id: row.venture_id, ...evaluateVentureEconomicsReadinessGate(row) })),
  };
}
