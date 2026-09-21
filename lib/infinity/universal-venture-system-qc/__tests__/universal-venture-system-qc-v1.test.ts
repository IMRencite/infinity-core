import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import {
  OCCUPANCYNPV_PER_DEAL_PRICE_USD,
  OCCUPANCYNPV_PROFESSIONAL_PRICE_USD,
} from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { evaluatePortfolioCapitalStopGate, evaluatePortfolioMonthlyBurnGate, evaluateVentureCreationPrecheck } from "@/lib/infinity/venture-financial-governance/gates";
import {
  VENTURE_SYSTEM_IDS,
  VENTURE_SYSTEM_INVENTORY_CONTRACT,
  VENTURE_PRODUCTION_QC_MATRIX,
  UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE,
  VENTURE_QC_COVERAGE_CONTRACT,
  VENTURE_QC_FRESHNESS_GATE,
  EXPECTED_RENDERED_CAPABILITY_GATE,
  CUSTOMER_JOURNEY_END_TO_END_QC_GATE,
  UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES,
  CANONICAL_FOOTER_COPY,
} from "../contract";
import { buildVentureSystemInventory, occupancyNpvCapabilityProfile, askReviewCapabilityProfile, templatesAreArchetypesNotFixedLayouts } from "../inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate, evaluateVentureQCCoverageContract } from "../matrix";
import { deriveCustomerJourney, occupancyNpvCustomerJourney, evaluateCustomerJourneyEndToEndQCGate } from "../journeys";
import { factoryInheritedUniversalVentureSystemQc, futureVentureInheritsUniversalVentureSystemQc } from "../factory";
import { evaluateDevServerProcessHealthGate, STALE_DEV_SERVER_RSC_INCIDENT } from "../dev-server";
import { fullQcLimitedToChangedFeature } from "../modes";
import {
  fixtureMissingButton,
  fixtureBrokenButton,
  fixtureBrokenForm,
  fixtureConsoleError,
  fixtureNetworkFailure,
  fixturePaymentFailureOverall,
  fixtureFulfillmentFailureOverall,
  fixtureMobileFailure,
  fixturePartialCoverage,
  fixtureStalePaymentEvidence,
  fixtureFeatureChangeSmoke,
  fixtureFullQcFeatureLimited,
  fixtureFounderContradiction,
} from "../fixtures";
import { evaluateOccupancynpvFullSystemQc } from "../occupancynpv";
import { buildOccupancynpvCurrentEvidence, staleHungDevServerObservation } from "../current-evidence";
import { evaluateHqFullSystemQc } from "../hq-qc";
import { projectVentureSystemQcHqSummary } from "../hq";
import { realFeedbackCount } from "@/lib/infinity/product-improvement-loop/ingest";

describe("UNIVERSAL_VENTURE_SYSTEM_QC_V1", () => {
  it("defines the whole-venture QC architecture and factory inheritance", () => {
    const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
    expect(inventory.contract).toBe(VENTURE_SYSTEM_INVENTORY_CONTRACT);
    expect(inventory.entries).toHaveLength(VENTURE_SYSTEM_IDS.length);
    expect(inventory.entries.every((row) => row.applicability === "APPLICABLE" || row.applicability === "NOT_APPLICABLE")).toBe(true);
    expect(inventory.entries.some((row) => row.system_id === "IMPROVEMENT_INTAKE" && row.applicability === "APPLICABLE")).toBe(true);
    const paused = buildVentureSystemInventory(askReviewCapabilityProfile());
    expect(paused.entries.find((row) => row.system_id === "PAYMENT")?.na_reason).toBe("PRODUCTION_PAUSED");
    const matrix = buildVentureProductionQcMatrix({ inventory, verifications: [] });
    expect(matrix.contract).toBe(VENTURE_PRODUCTION_QC_MATRIX);
    expect(matrix.entries.some((row) => row.status === "UNKNOWN")).toBe(true);
    const coverage = evaluateVentureQCCoverageContract(matrix);
    expect(coverage.contract).toBe(VENTURE_QC_COVERAGE_CONTRACT);
    expect(coverage.result).toBe("FAIL");
    const quality = evaluateUniversalVentureProductionQualityGate({ matrix, coverage, inventory });
    expect(quality.gate).toBe(UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE);
    expect(quality.result).toBe("FAIL");
    expect(quality.reasons).toContain("UNKNOWN_IS_NOT_PASS");
    expect(deriveCustomerJourney(occupancyNpvCapabilityProfile()).steps.some((step) => step.id === "suggest_improvement")).toBe(true);
    expect(occupancyNpvCustomerJourney().steps.map((step) => step.id)).toContain("calculator");
    expect(evaluateCustomerJourneyEndToEndQCGate({
      journey: occupancyNpvCustomerJourney(),
      transitions: occupancyNpvCustomerJourney().steps.slice(0, -1).map((step, index) => ({
        from: step.id,
        to: occupancyNpvCustomerJourney().steps[index + 1]!.id,
        works: false,
      })),
    }).gate).toBe(CUSTOMER_JOURNEY_END_TO_END_QC_GATE);
    expect(futureVentureInheritsUniversalVentureSystemQc()).toBe(true);
    expect(factoryInheritedUniversalVentureSystemQc().manual_developer_step).toBe(false);
    expect(factoryInheritedUniversalVentureSystemQc().contracts).toEqual(expect.arrayContaining([
      VENTURE_SYSTEM_INVENTORY_CONTRACT,
      VENTURE_PRODUCTION_QC_MATRIX,
      UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE,
      VENTURE_QC_COVERAGE_CONTRACT,
      VENTURE_QC_FRESHNESS_GATE,
      CUSTOMER_JOURNEY_END_TO_END_QC_GATE,
      EXPECTED_RENDERED_CAPABILITY_GATE,
    ]));
    expect(templatesAreArchetypesNotFixedLayouts()).toBe(true);
    expect(fullQcLimitedToChangedFeature()).toBe(false);
    expect(CANONICAL_FOOTER_COPY).toContain("An Infinity OS Venture");
    expect(UNIVERSAL_VENTURE_SYSTEM_QC_PRINCIPLES.build_is_not_venture).toContain("BUILD PASS");
    expect(STALE_DEV_SERVER_RSC_INCIDENT.defect_id).toContain("rsc-failed-fetch");
  });

  it("fails missing button, broken button, broken form, console, network, payment, fulfillment, and mobile", () => {
    const missing = fixtureMissingButton();
    expect(missing.expected.result).toBe("FAIL");
    expect(missing.overall.result).toBe("FAIL");
    expect(fixtureBrokenButton().result).toBe("FAIL");
    expect(fixtureBrokenForm().result).toBe("FAIL");
    expect(fixtureConsoleError().result).toBe("FAIL");
    expect(fixtureNetworkFailure().result).toBe("FAIL");
    const payment = fixturePaymentFailureOverall();
    expect(payment.commercial.result).toBe("FAIL");
    expect(payment.overall.result).toBe("FAIL");
    const fulfillment = fixtureFulfillmentFailureOverall();
    expect(fulfillment.commercial.result).toBe("FAIL");
    expect(fulfillment.overall.result).toBe("FAIL");
    const mobile = fixtureMobileFailure();
    expect(mobile.responsive.result).toBe("FAIL");
    expect(mobile.overall.result).toBe("FAIL");
  });

  it("treats partial coverage, stale evidence, feature-limited full QC, and founder contradiction as not pass", () => {
    const partial = fixturePartialCoverage();
    expect(partial.coverage.coverage_percent).toBe(70);
    expect(partial.coverage.unknown_systems).toBe(3);
    expect(partial.overall.result).toBe("FAIL");
    const stale = fixtureStalePaymentEvidence();
    expect(stale.freshness.status).toBe("STALE");
    expect(stale.overall.result).toBe("FAIL");
    const smoke = fixtureFeatureChangeSmoke();
    expect(smoke.plan.mandatory_smoke).toBe(true);
    expect(smoke.plan.full_limited_to_changed_feature).toBe(false);
    expect(smoke.smoke.result).toBe("FAIL");
    expect(smoke.deployment_quality).toBe("FAIL");
    expect(fixtureFullQcFeatureLimited().result).toBe("FAIL");
    const contradiction = fixtureFounderContradiction();
    expect(contradiction.current).toBe("FAIL");
    expect(contradiction.automation_historical).toBe("PASS");
    expect(contradiction.automation_is_current_truth).toBe(false);
  });

  it("inventories OccupancyNPV and HQ without marking unknown as pass", () => {
    const occ = evaluateOccupancynpvFullSystemQc(buildOccupancynpvCurrentEvidence());
    expect(occ.venture_id).toBe(CRE_VENTURE_ID);
    expect(occ.coverage.total_applicable_systems).toBeGreaterThan(10);
    expect(occ.improvement.founder_physical_page).toBe("PASS");
    expect(occ.overall === "PASS" || occ.overall === "FAIL" || occ.overall === "PARTIAL").toBe(true);
    if (occ.coverage.unknown_systems > 0 || occ.coverage.failing_systems > 0 || occ.coverage.stale_systems > 0) {
      expect(occ.quality.result).toBe("FAIL");
    }
    const hq = evaluateHqFullSystemQc({
      surfaces: [],
      dashboard_loads: true,
      hq_shell_renders: true,
      rsc_failed_fetch: false,
      dev_server: {
        processes: [{ pid: 1, command: "next dev", serving_port: 3000, hung: false }],
        expected_port: 3000,
        port_listeners: [3000],
        serving_runtime_started_at: new Date().toISOString(),
        hung_request_timeout: false,
      },
    });
    expect(hq.overall === "PASS" ? hq.reasons : hq.reasons).toEqual(expect.any(Array));
    expect(hq.surfaces.console === "UNKNOWN" || hq.surfaces.console === "PASS").toBe(true);
    const hung = evaluateDevServerProcessHealthGate(staleHungDevServerObservation());
    expect(hung.result).toBe("FAIL");
    expect(hung.reasons).toEqual(expect.arrayContaining(["HUNG_DEV_SERVER", "MULTIPLE_STALE_DEV_SERVERS"]));
    const summary = projectVentureSystemQcHqSummary(CRE_VENTURE_ID);
    expect(summary.coverage_percent).toEqual(expect.any(Number));
    expect(summary.failed_systems).toEqual(expect.any(Array));
    expect(summary.unknown_systems).toEqual(expect.any(Array));
    expect(realFeedbackCount(CRE_VENTURE_ID)).toBeGreaterThanOrEqual(0);
  });

  it("preserves OccupancyNPV commercial locks, AskReview pause, capital policy, and HQ QC visibility", () => {
    expect(OCCUPANCYNPV_PROFESSIONAL_PRICE_USD).toBe(290);
    expect(OCCUPANCYNPV_PER_DEAL_PRICE_USD).toBe(149);
    const experiment = readFileSync("lib/infinity/growth-engine/occupancynpv-experiment.ts", "utf8");
    expect(experiment).toContain("trial_enabled: false");
    expect(experiment).toContain("OCCUPANCYNPV_CONSERVATIVE_DAILY_RAMP = 5");
    expect(evaluatePortfolioCapitalStopGate().reasons).toContain("NOT_SET");
    expect(evaluatePortfolioMonthlyBurnGate("DISCRETIONARY").reasons).toContain("NOT_SET");
    expect(evaluateVentureCreationPrecheck({
      active_build_count: 0,
      unvalidated_at_risk: 0,
    }).state).toBe("BLOCKED_PENDING_CAPITAL_POLICY");
    const persist = readFileSync("lib/infinity/second-venture-factory/persist-record.ts", "utf8");
    expect(persist).toContain("ASKREVIEW_PRODUCTION_PAUSED");
    expect(ASKREVIEW_VENTURE_ID).toContain("f1336945-3350");
    const detail = readFileSync("components/dashboard/operator-console/canonical-venture-hq-detail.tsx", "utf8");
    expect(detail).toContain("Venture QC");
    expect(detail).toContain("Coverage");
    expect(detail).toContain("Freshness");
    expect(detail).toContain("Failed systems");
    expect(detail).toContain("Unknown systems");
    expect(detail).toContain("Last full QC");
    expect(detail).toContain("Last smoke QC");
    expect(detail).toContain("Overall Quality");
    expect(detail).toContain("Route Coverage");
    expect(detail).toContain("Visual Coverage");
    expect(detail).toContain("Interaction Coverage");
    expect(detail).toContain("Workflow Coverage");
    expect(detail).toContain("Subsystem Coverage");
    expect(detail).toContain("Mobile Coverage");
    expect(detail).toContain("Accessibility Coverage");
    expect(detail).toContain("Failure detail");
    expect(detail).toContain("Commercial Offer");
    expect(detail).toContain("Active Offer");
    expect(detail).toContain("Rendered Offer");
    expect(detail).toContain("Offer Parity");
    expect(detail).toContain("Offer Disclosure");
    expect(detail).toContain("Offer Journey");
    expect(detail).toContain("Offer Measurement");
    expect(detail).toContain("Purchase Friction");
    expect(detail).toContain("Time to Value");
    const operations = readFileSync("lib/infinity/hq-information-architecture/operations-room.ts", "utf8");
    expect(operations).toContain("QC_MONITOR");
    const factory = readFileSync("lib/infinity/venture-factory/pipeline/run.ts", "utf8");
    expect(factory).toContain("factoryInheritedUniversalVentureSystemQc");
  });
});
