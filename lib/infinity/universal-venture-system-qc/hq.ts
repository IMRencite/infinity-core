import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { buildOccupancyNpvCurrentOffer } from "@/lib/infinity/offer-architecture/occupancynpv";
import { buildOccupancyNpvLiveActivatedOffer } from "@/lib/infinity/offer-architecture/occupancynpv-live-activation";
import { readOccupancynpvLiveOfferSurface } from "@/lib/infinity/venture-operating-scale/occupancynpv-live-offer-surface";
import { buildVentureSystemInventory, capabilityProfileForVenture } from "./inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate, evaluateVentureQCCoverageContract } from "./matrix";
import { buildOccupancynpvCurrentEvidence } from "./current-evidence";
import { evaluateOccupancynpvFullSystemQc, occupancynpvCommercialOfferVerification } from "./occupancynpv";
import { classifyHqSafeErrorClass, logHqProductionError } from "@/lib/infinity/hq-production-deployment/error-correlation";
import type { QcStatus } from "./contract";

export type VentureSystemQcHqSummary = {
  overall: "PASS" | "FAIL" | "PARTIAL";
  overall_quality: "PASS" | "FAIL" | "PARTIAL";
  coverage_percent: number;
  route_coverage: number;
  visual_coverage: number;
  interaction_coverage: number;
  workflow_coverage: number;
  subsystem_coverage: number;
  mobile_coverage: number;
  accessibility_coverage: number;
  freshness: "FRESH" | "STALE" | "UNKNOWN";
  failed_systems: string[];
  unknown_systems: string[];
  stale_systems: string[];
  last_full_qc: string | null;
  last_smoke_qc: string | null;
  current_incidents: string[];
  failure_detail: string[];
  evidence_refs: string[];
  systems: Array<{ id: string; status: QcStatus }>;
  commercial_offer: "PASS" | "FAIL" | "NOT_APPLICABLE";
  active_offer: string;
  rendered_offer: string;
  offer_parity: "PASS" | "FAIL" | "NOT_APPLICABLE";
  offer_disclosure: "PASS" | "FAIL" | "NOT_APPLICABLE";
  offer_journey: "PASS" | "FAIL" | "NOT_APPLICABLE";
  offer_measurement: "PASS" | "FAIL" | "NOT_APPLICABLE";
  purchase_friction: string;
  time_to_value: string;
};

const lastRun = new Map<string, { full?: string; smoke?: string }>();
const summaryCache = new Map<string, { at: number; value: VentureSystemQcHqSummary }>();
const SUMMARY_CACHE_MS = 15_000;

export function recordVentureQcRun(ventureId: string, mode: "FULL" | "SMOKE", at = new Date().toISOString()): void {
  const row = lastRun.get(ventureId) ?? {};
  if (mode === "FULL") row.full = at;
  else row.smoke = at;
  lastRun.set(ventureId, row);
}

export function resetVentureQcHqProjection(): void {
  lastRun.clear();
  summaryCache.clear();
}

function unavailableVentureSystemQcHqSummary(ventureId: string, errorClass: string): VentureSystemQcHqSummary {
  return {
    overall: "FAIL",
    overall_quality: "FAIL",
    coverage_percent: 0,
    route_coverage: 0,
    visual_coverage: 0,
    interaction_coverage: 0,
    workflow_coverage: 0,
    subsystem_coverage: 0,
    mobile_coverage: 0,
    accessibility_coverage: 0,
    freshness: "UNKNOWN",
    failed_systems: [],
    unknown_systems: ["OCCUPANCYNPV_COMPOSE"],
    stale_systems: [],
    last_full_qc: lastRun.get(ventureId)?.full ?? null,
    last_smoke_qc: lastRun.get(ventureId)?.smoke ?? null,
    current_incidents: ["COMPOSE_UNAVAILABLE"],
    failure_detail: [errorClass],
    evidence_refs: [],
    systems: [],
    commercial_offer: "NOT_APPLICABLE",
    active_offer: "UNKNOWN",
    rendered_offer: "UNKNOWN",
    offer_parity: "NOT_APPLICABLE",
    offer_disclosure: "NOT_APPLICABLE",
    offer_journey: "NOT_APPLICABLE",
    offer_measurement: "NOT_APPLICABLE",
    purchase_friction: "UNKNOWN",
    time_to_value: "UNKNOWN",
  };
}

export function projectVentureSystemQcHqSummary(ventureId: string): VentureSystemQcHqSummary {
  const cached = summaryCache.get(ventureId);
  if (cached && Date.now() - cached.at < SUMMARY_CACHE_MS) return cached.value;
  try {
    const value = computeVentureSystemQcHqSummary(ventureId);
    summaryCache.set(ventureId, { at: Date.now(), value });
    return value;
  } catch (error) {
    const errorClass = classifyHqSafeErrorClass(error);
    logHqProductionError({
      route: "/dashboard",
      error_class: errorClass,
      stage: "occupancynpv_compose",
    });
    const value = unavailableVentureSystemQcHqSummary(ventureId, errorClass);
    summaryCache.set(ventureId, { at: Date.now(), value });
    return value;
  }
}

function computeVentureSystemQcHqSummary(ventureId: string): VentureSystemQcHqSummary {
  if (ventureId === ASKREVIEW_VENTURE_ID) {
    const inventory = buildVentureSystemInventory(capabilityProfileForVenture(ventureId));
    const matrix = buildVentureProductionQcMatrix({ inventory, verifications: [] });
    const coverage = evaluateVentureQCCoverageContract(matrix);
    return {
      overall: "FAIL",
      overall_quality: "FAIL",
      coverage_percent: coverage.coverage_percent,
      route_coverage: 0,
      visual_coverage: 0,
      interaction_coverage: 0,
      workflow_coverage: 0,
      subsystem_coverage: coverage.coverage_percent,
      mobile_coverage: 0,
      accessibility_coverage: 0,
      freshness: "UNKNOWN",
      failed_systems: [],
      unknown_systems: [],
      stale_systems: [],
      last_full_qc: lastRun.get(ventureId)?.full ?? null,
      last_smoke_qc: lastRun.get(ventureId)?.smoke ?? null,
      current_incidents: ["ASKREVIEW_PRODUCTION_PAUSED"],
      failure_detail: ["ASKREVIEW_PRODUCTION_PAUSED"],
      evidence_refs: [],
      systems: inventory.entries
        .filter((row) => row.applicability === "APPLICABLE")
        .map((row) => ({ id: row.system_id, status: "NOT_APPLICABLE" as const })),
      commercial_offer: "NOT_APPLICABLE",
      active_offer: "NONE",
      rendered_offer: "NONE",
      offer_parity: "NOT_APPLICABLE",
      offer_disclosure: "NOT_APPLICABLE",
      offer_journey: "NOT_APPLICABLE",
      offer_measurement: "NOT_APPLICABLE",
      purchase_friction: "NOT_APPLICABLE",
      time_to_value: "NOT_APPLICABLE",
    };
  }
  const evidence = buildOccupancynpvCurrentEvidence();
  const report = evaluateOccupancynpvFullSystemQc(evidence);
  const matrix = buildVentureProductionQcMatrix({
    inventory: report.inventory,
    verifications: [
      evidence.public_site,
      evidence.navigation,
      evidence.calculator,
      evidence.results,
      evidence.pricing,
      evidence.login_account,
      evidence.checkout,
      evidence.payment,
      evidence.fulfillment,
      evidence.growth,
      evidence.gmail,
      evidence.gemini,
      evidence.durable_queue,
      evidence.reply_handling,
      evidence.improvement_intake,
      evidence.legal,
      evidence.mobile,
      evidence.accessibility,
      evidence.console,
      evidence.network,
      evidence.domain_ssl,
      evidence.analytics,
      evidence.design_quality,
      evidence.commercial_offer,
    ],
    mode: "FULL",
    now: evidence.now,
  });
  recordVentureQcRun(CRE_VENTURE_ID, "FULL");
  const applicable = matrix.entries.filter((row) => row.applicability === "APPLICABLE");
  const incidents: string[] = [];
  if (report.systems.payment === "FAIL" || report.systems.checkout === "FAIL") incidents.push("payment_broken");
  if (report.systems.calculator === "FAIL" || report.systems.results === "FAIL") incidents.push("customer_workflow_broken");
  if (report.improvement.global_trigger === "FAIL") incidents.push("feedback_intake_missing");
  if (report.systems.domain_ssl === "FAIL") incidents.push("ssl_issue");
  if (report.systems.login_account === "FAIL") incidents.push("login_broken");
  if (report.systems.console === "FAIL") incidents.push("console_runtime_failure");
  if (report.systems.fulfillment === "FAIL") incidents.push("fulfillment_broken");
  if (evidence.design_quality.status === "FAIL" || evidence.design_quality.status === "UNKNOWN") {
    incidents.push("visual_quality_unverified_or_failing");
  }
  if (evidence.commercial_offer.status === "FAIL") incidents.push("commercial_offer_incomplete");
  const failure_detail = [
    ...report.quality.reasons,
    evidence.design_quality.status === "FAIL"
      ? (evidence.design_quality.failure_reason ?? "VISUAL QUALITY FAIL /suggest-improvement")
      : "",
    report.improvement.form === "FAIL"
      ? "VISUAL QUALITY FAIL /suggest-improvement Submit control missing venture button styling"
      : "",
    report.improvement.trigger_clickable === "FAIL" ? "IMPROVEMENT_TRIGGER_NOT_CLICK_VERIFIED" : "",
    report.improvement.canonical_pipeline === "FAIL" ? "CANONICAL_FEEDBACK_PIPELINE_UNPROVEN" : "",
    evidence.commercial_offer.status === "FAIL"
      ? (evidence.commercial_offer.failure_reason ?? "COMMERCIAL_OFFER_INCOMPLETE")
      : "",
  ].filter(Boolean);
  const liveOfferSurface = readOccupancynpvLiveOfferSurface();
  const offer = occupancynpvCommercialOfferVerification({
    html: liveOfferSurface?.html,
    at: evidence.now,
  }).completeness;
  const currentOffer = liveOfferSurface?.offer_block
    ? buildOccupancyNpvLiveActivatedOffer()
    : buildOccupancyNpvCurrentOffer();
  return {
    overall: report.overall,
    overall_quality: report.overall,
    coverage_percent: report.coverage.coverage_percent,
    route_coverage: report.coverage.coverage_percent,
    visual_coverage: evidence.design_quality.status === "PASS" ? 100 : report.improvement.form === "PASS" ? 50 : 0,
    interaction_coverage: report.improvement.submission === "PASS" ? 50 : 0,
    workflow_coverage: 40,
    subsystem_coverage: report.coverage.coverage_percent,
    mobile_coverage: report.systems.responsive_mobile === "PASS" ? 100 : 0,
    accessibility_coverage: report.systems.accessibility === "PASS" ? 100 : 0,
    freshness: report.coverage.stale_systems > 0 ? "STALE" : report.coverage.unknown_systems > 0 ? "UNKNOWN" : "FRESH",
    failed_systems: applicable.filter((row) => row.status === "FAIL").map((row) => row.system_id),
    unknown_systems: applicable.filter((row) => row.status === "UNKNOWN").map((row) => row.system_id),
    stale_systems: applicable.filter((row) => row.status === "STALE").map((row) => row.system_id),
    last_full_qc: lastRun.get(CRE_VENTURE_ID)?.full ?? null,
    last_smoke_qc: lastRun.get(CRE_VENTURE_ID)?.smoke ?? null,
    current_incidents: incidents,
    failure_detail,
    evidence_refs: applicable.map((row) => row.evidence_reference).filter((row): row is string => Boolean(row)),
    systems: applicable.map((row) => ({ id: row.system_id, status: row.status })),
    commercial_offer: offer.result,
    active_offer: `${offer.lifecycle} · ${currentOffer.offer_type} · ${currentOffer.offer_name}`,
    rendered_offer: offer.price_only.result === "FAIL" ? "PRICE_ONLY" : offer.surfaces.primary_surface ?? "MISSING",
    offer_parity: offer.parity.result,
    offer_disclosure: offer.disclosure.result,
    offer_journey: offer.journey.result,
    offer_measurement: offer.measurement.result,
    purchase_friction: currentOffer.purchase_friction,
    time_to_value: String(currentOffer.time_to_value),
  };
}

export function materialQcIncidentsForOperations(summary: VentureSystemQcHqSummary): Array<{ id: string; label: string; tone: "warning" | "pending" }> {
  return summary.current_incidents.map((incident) => ({
    id: `ops-qc-${incident}`,
    label: `Venture QC · ${incident.replaceAll("_", " ")}`,
    tone: "warning" as const,
  }));
}

export function evaluateUniversalVentureProductionQualityFromHq(ventureId: string) {
  const summary = projectVentureSystemQcHqSummary(ventureId);
  return evaluateUniversalVentureProductionQualityGate({
    matrix: buildVentureProductionQcMatrix({
      inventory: buildVentureSystemInventory(capabilityProfileForVenture(ventureId)),
      verifications: [],
    }),
  }).result === "PASS" && summary.overall === "PASS" ? "PASS" : "FAIL";
}
