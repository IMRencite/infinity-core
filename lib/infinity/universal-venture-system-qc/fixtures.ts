import { evaluateBrowserConsoleQCGate } from "@/lib/infinity/customer-facing-browser-qc/console-gate";
import { evaluateCustomerFacingInteractionQCGate } from "@/lib/infinity/customer-facing-browser-qc/interaction-gate";
import { evaluateCustomerFacingNetworkQCGate } from "@/lib/infinity/customer-facing-browser-qc/network-gate";
import { evaluateCommercialProductionReadinessGate } from "@/lib/infinity/payment-path/production";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { buildVentureSystemInventory, occupancyNpvCapabilityProfile } from "./inventory";
import { buildVentureProductionQcMatrix, evaluateUniversalVentureProductionQualityGate, evaluateVentureQCCoverageContract, evaluateVentureQCFreshnessGate, type SystemVerificationInput } from "./matrix";
import { buildRenderedActionInventory, evaluateExpectedRenderedCapabilityGate, evaluateCustomerFormQCGate } from "./rendered";
import { evaluateMandatoryVentureSmokeSuite, evaluateFullQcCoverageScope, planChangeImpactQc } from "./modes";
import { evaluateFounderPhysicalContradiction } from "./recurrence";
import { evaluateResponsiveQCGate } from "./capability-gates";
import type { VentureSystemId } from "./contract";

function row(system_id: VentureSystemId, status: SystemVerificationInput["status"], at = "2026-09-12T00:00:00.000Z"): SystemVerificationInput {
  return {
    system_id,
    status,
    last_verified_at: status === "UNKNOWN" ? null : at,
    verification_level: status === "UNKNOWN" ? "UNCHECKED" : "LIVE_PRODUCTION",
    environment: "LIVE_PRODUCTION",
    failure_reason: status === "PASS" || status === "NOT_APPLICABLE" ? null : status,
  };
}

export function fixtureMissingButton() {
  const inventory = buildRenderedActionInventory({
    venture_id: CRE_VENTURE_ID,
    actions: [],
  });
  const expected = evaluateExpectedRenderedCapabilityGate({
    capabilities: [{ capability_id: "improvement_intake", required: true, rendered_trigger_required: true }],
    inventory,
  });
  const matrix = buildVentureProductionQcMatrix({
    inventory: buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    verifications: [row("IMPROVEMENT_INTAKE", "FAIL")],
  });
  return {
    expected,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix }),
  };
}

export function fixtureBrokenButton() {
  return evaluateCustomerFacingInteractionQCGate([
    {
      name: "Suggest an Improvement",
      rendered: true,
      visible: true,
      enabled: true,
      clickable: true,
      action_ok: false,
      uncaught_exception: true,
      result_state_ok: false,
    },
  ]);
}

export function fixtureBrokenForm() {
  return evaluateCustomerFormQCGate([
    {
      name: "login",
      rendered: true,
      labels: true,
      required_fields: true,
      validation: true,
      submit: false,
      success: false,
      error: true,
      duplicate_submit_handled: true,
      mobile: true,
      accessibility: true,
    },
  ]);
}

export function fixtureConsoleError() {
  return evaluateBrowserConsoleQCGate(["Uncaught TypeError: Cannot read properties of undefined"]);
}

export function fixtureNetworkFailure() {
  return evaluateCustomerFacingNetworkQCGate([
    { name: "checkout-session", required: true, ok: false, status: 500, failure: "5xx" },
  ]);
}

export function fixturePaymentFailureOverall() {
  const commercial = evaluateCommercialProductionReadinessGate({
    offer: "PASS",
    backend: "PASS",
    security: "PASS",
    paymentPath: "FAIL",
    webhook: "PASS",
    fulfillment: "PASS",
    customerFailureUx: "PASS",
    legalCommercialTruth: "PASS",
  });
  const matrix = buildVentureProductionQcMatrix({
    inventory: buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    verifications: [row("PAYMENT", "FAIL"), row("CHECKOUT", "FAIL")],
  });
  return {
    commercial,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix }),
  };
}

export function fixtureFulfillmentFailureOverall() {
  const commercial = evaluateCommercialProductionReadinessGate({
    offer: "PASS",
    backend: "PASS",
    security: "PASS",
    paymentPath: "PASS",
    webhook: "PASS",
    fulfillment: "FAIL",
    customerFailureUx: "PASS",
    legalCommercialTruth: "PASS",
  });
  const matrix = buildVentureProductionQcMatrix({
    inventory: buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    verifications: [row("PAYMENT", "PASS"), row("FULFILLMENT", "FAIL")],
  });
  return {
    commercial,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix }),
  };
}

export function fixtureMobileFailure() {
  const responsive = evaluateResponsiveQCGate({
    desktop_ok: true,
    tablet_ok: "N/A",
    mobile_ok: false,
    overflow: false,
    clipping: false,
    navigation_ok: true,
    dialogs_ok: true,
    forms_ok: true,
    ctas_ok: false,
    primary_mobile_cta_accessible: false,
  });
  const matrix = buildVentureProductionQcMatrix({
    inventory: buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    verifications: [row("MOBILE", "FAIL"), row("RESPONSIVE", "FAIL")],
  });
  return {
    responsive,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix }),
  };
}

export function fixturePartialCoverage() {
  const inventory = {
    ...buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    entries: buildVentureSystemInventory(occupancyNpvCapabilityProfile()).entries
      .filter((entry) => entry.applicability === "APPLICABLE")
      .slice(0, 10)
      .map((entry) => ({ ...entry, applicability: "APPLICABLE" as const })),
  };
  const passingIds = inventory.entries.slice(0, 7).map((entry) => entry.system_id);
  const verifications = inventory.entries.map((entry) =>
    row(entry.system_id, passingIds.includes(entry.system_id) ? "PASS" : "UNKNOWN"),
  );
  const matrix = buildVentureProductionQcMatrix({ inventory, verifications });
  const coverage = evaluateVentureQCCoverageContract(matrix);
  return {
    coverage,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix, coverage, inventory }),
  };
}

export function fixtureStalePaymentEvidence() {
  const freshness = evaluateVentureQCFreshnessGate({
    system_id: "PAYMENT",
    last_verified_at: "2026-01-01T00:00:00.000Z",
    status: "PASS",
    now: "2026-09-12T00:00:00.000Z",
  });
  const matrix = buildVentureProductionQcMatrix({
    inventory: buildVentureSystemInventory(occupancyNpvCapabilityProfile()),
    verifications: [{
      system_id: "PAYMENT",
      status: "PASS",
      last_verified_at: "2026-01-01T00:00:00.000Z",
      verification_level: "LIVE_PRODUCTION",
      environment: "LIVE_PRODUCTION",
    }],
    now: "2026-09-12T00:00:00.000Z",
  });
  return {
    freshness,
    overall: evaluateUniversalVentureProductionQualityGate({ matrix }),
  };
}

export function fixtureFeatureChangeSmoke() {
  const plan = planChangeImpactQc({ changed_paths: ["components/improvement-form.tsx"] });
  const smoke = evaluateMandatoryVentureSmokeSuite([
    { surface: "home_public_entry", applicable: true, result: "PASS" },
    { surface: "navigation", applicable: true, result: "FAIL", reason: "GLOBAL_NAV_BROKEN" },
    { surface: "primary_product_workflow", applicable: true, result: "PASS" },
    { surface: "primary_cta", applicable: true, result: "PASS" },
    { surface: "auth_if_applicable", applicable: true, result: "PASS" },
    { surface: "payment_entry_if_paid", applicable: true, result: "PASS" },
    { surface: "primary_offer_surface", applicable: true, result: "PASS" },
    { surface: "primary_offer_cta", applicable: true, result: "PASS" },
    { surface: "offer_state", applicable: true, result: "PASS" },
    { surface: "offer_price_consistency", applicable: true, result: "PASS" },
    { surface: "offer_journey_entry", applicable: true, result: "PASS" },
    { surface: "feedback_improvement_entry", applicable: true, result: "PASS" },
    { surface: "legal_footer", applicable: true, result: "PASS" },
    { surface: "console", applicable: true, result: "PASS" },
    { surface: "network", applicable: true, result: "PASS" },
    { surface: "mobile", applicable: true, result: "PASS" },
  ]);
  return { plan, smoke, deployment_quality: smoke.result };
}

export function fixtureFullQcFeatureLimited() {
  return evaluateFullQcCoverageScope({
    mode: "FULL",
    applicable_system_count: 20,
    systems_tested: 1,
    only_changed_feature_tested: true,
  });
}

export function fixtureFounderContradiction() {
  return evaluateFounderPhysicalContradiction({
    automation_result: "PASS",
    founder_observes_failure: true,
  });
}
