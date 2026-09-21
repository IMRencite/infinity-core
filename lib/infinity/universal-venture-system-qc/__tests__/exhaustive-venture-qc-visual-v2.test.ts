import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateCustomerFacingInteractionQCGate } from "@/lib/infinity/customer-facing-browser-qc/interaction-gate";
import { evaluateBrowserConsoleQCGate } from "@/lib/infinity/customer-facing-browser-qc/console-gate";
import { evaluateCustomerFacingNetworkQCGate } from "@/lib/infinity/customer-facing-browser-qc/network-gate";
import { evaluateCommercialProductionReadinessGate } from "@/lib/infinity/payment-path/production";
import { occupancynpvPublicImprovementFormSource, occupancynpvPublicImprovementPageSource } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { assignedWorkerRolesForRoom } from "@/lib/infinity/hq-room-workers/assigned-roles";
import { evaluateDevServerProcessHealthGate } from "../dev-server";
import { buildOccupancynpvCurrentEvidence, staleHungDevServerObservation } from "../current-evidence";
import { evaluateOccupancynpvFullSystemQc } from "../occupancynpv";
import { evaluateFounderPhysicalContradiction } from "../recurrence";
import { evaluateUniversalVentureProductionQualityGate, buildVentureProductionQcMatrix } from "../matrix";
import { buildVentureSystemInventory, occupancyNpvCapabilityProfile } from "../inventory";
import {
  evaluateDefaultBrowserStyleDetectionGate,
  evaluateRenderedStyleApplicationGate,
  evaluateVentureDesignSystemConformanceGate,
  evaluateRenderedVisualQualityGate,
  evaluateVentureVisualRegressionGate,
} from "../visual";
import {
  evaluateVentureMaterialCoverageGate,
  evaluateVentureQCManifestDiffGate,
  invalidateAffectedQcOnNewCapability,
  OCCUPANCYNPV_MATERIAL_ROUTES,
  fullQcRequiresCompleteAccounting,
} from "../exhaustive";
import { evaluateCanonicalRoomWorkerInventory, ventureQcMonitorRegistered, canonicalAssignedWorkers } from "../workers";
import { evaluateResponsiveQCGate } from "../capability-gates";

const RAW_BUTTON: Parameters<typeof evaluateDefaultBrowserStyleDetectionGate>[0][number] = {
  name: "Send suggestion",
  tag: "button",
  class_name: "",
  required: true,
  computed: { appearance: "auto", borderRadius: "0px", padding: "1px 6px", minHeight: "auto", background: "buttonface" },
};

describe("EXHAUSTIVE_VENTURE_QC_VISUAL_V2", () => {
  it("fails raw/default controls and class-without-applied-style", () => {
    const interaction = evaluateCustomerFacingInteractionQCGate([{
      name: "Send suggestion",
      rendered: true,
      visible: true,
      enabled: true,
      clickable: true,
      action_ok: true,
      uncaught_exception: false,
      result_state_ok: true,
    }]);
    expect(interaction.result).toBe("PASS");
    const visual = evaluateDefaultBrowserStyleDetectionGate([RAW_BUTTON]);
    expect(visual.result).toBe("FAIL");
    const overall = evaluateRenderedVisualQualityGate({
      unstyled_controls: visual.unstyled.length,
      layout_breaks: false,
      clipping: false,
      overflow: false,
      overlapping: false,
      hierarchy_ok: true,
      readable: true,
      buttons_malformed: true,
    });
    expect(overall.result).toBe("FAIL");
    expect(evaluateDefaultBrowserStyleDetectionGate([{
      name: "message",
      tag: "textarea",
      class_name: "vg-textarea",
      required: true,
      computed: { appearance: "auto", borderRadius: "0px", padding: "2px", fontFamily: "monospace", minHeight: "auto", background: "rgb(255, 255, 255)" },
    }]).result).toBe("FAIL");
    expect(evaluateRenderedStyleApplicationGate({
      expected_class: "vg-cta",
      class_in_dom: true,
      computed_matches_venture: false,
    }).result).toBe("FAIL");
    expect(evaluateRenderedVisualQualityGate({
      unstyled_controls: 1,
      layout_breaks: false,
      clipping: false,
      overflow: false,
      overlapping: false,
      hierarchy_ok: true,
      readable: true,
      buttons_malformed: false,
    }).gate).toBe("RenderedVisualQualityGate");
  });

  it("fails missing route coverage, new-feature invalidation, and incomplete accounting", () => {
    const routes = [...OCCUPANCYNPV_MATERIAL_ROUTES];
    expect(evaluateVentureMaterialCoverageGate({
      material: 12,
      accounted: 11,
      unknown: 1,
    }).result).toBe("FAIL");
    const diff = evaluateVentureQCManifestDiffGate({
      previous_ids: ["homepage", "pricing"],
      current_ids: ["homepage", "pricing", "suggest-improvement"],
      previous_pass_ids: ["homepage", "pricing"],
    });
    expect(diff.unverified).toContain("suggest-improvement");
    expect(invalidateAffectedQcOnNewCapability({
      new_capability: "suggest-improvement",
      affected: ["IMPROVEMENT_INTAKE", "NAVIGATION", "/suggest-improvement"],
    }).IMPROVEMENT_INTAKE).toBe("UNVERIFIED");
    expect(fullQcRequiresCompleteAccounting({
      material: routes.length,
      pass: routes.length - 1,
      fail: 0,
      na: 0,
      unknown: 1,
    })).toBe(false);
    expect(routes.length).toBeGreaterThan(8);
  });

  it("fails missing button, mobile-only, payment, fulfillment, console, network, unknown subsystem", () => {
    const inventory = buildVentureSystemInventory(occupancyNpvCapabilityProfile());
    const missing = evaluateUniversalVentureProductionQualityGate({
      matrix: buildVentureProductionQcMatrix({
        inventory,
        verifications: [{ system_id: "IMPROVEMENT_INTAKE", status: "FAIL", failure_reason: "TRIGGER_ABSENT" }],
      }),
    });
    expect(missing.result).toBe("FAIL");
    expect(evaluateResponsiveQCGate({
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
    }).result).toBe("FAIL");
    expect(evaluateCommercialProductionReadinessGate({
      offer: "PASS", backend: "PASS", security: "PASS", paymentPath: "FAIL", webhook: "PASS",
      fulfillment: "PASS", customerFailureUx: "PASS", legalCommercialTruth: "PASS",
    }).result).toBe("FAIL");
    expect(evaluateCommercialProductionReadinessGate({
      offer: "PASS", backend: "PASS", security: "PASS", paymentPath: "PASS", webhook: "PASS",
      fulfillment: "FAIL", customerFailureUx: "PASS", legalCommercialTruth: "PASS",
    }).result).toBe("FAIL");
    expect(evaluateBrowserConsoleQCGate(["Uncaught TypeError: x"]).result).toBe("FAIL");
    expect(evaluateCustomerFacingNetworkQCGate([{ name: "api", required: true, ok: false, status: 500 }]).result).toBe("FAIL");
    const unknown = evaluateUniversalVentureProductionQualityGate({
      matrix: buildVentureProductionQcMatrix({ inventory, verifications: [] }),
    });
    expect(unknown.result).toBe("FAIL");
    expect(unknown.reasons).toContain("UNKNOWN_IS_NOT_PASS");
  });

  it("derives workers from canonical registration and detects missing registered workers", () => {
    expect(ventureQcMonitorRegistered()).toBe(true);
    expect(canonicalAssignedWorkers()).toEqual(assignedWorkerRolesForRoom("operations"));
    expect(evaluateCanonicalRoomWorkerInventory({
      projected: assignedWorkerRolesForRoom("operations"),
    }).result).toBe("PASS");
    expect(evaluateCanonicalRoomWorkerInventory({
      projected: assignedWorkerRolesForRoom("operations").filter((role) => role !== "Venture QC Monitor"),
    }).result).toBe("FAIL");
    const hierarchy = readFileSync("lib/infinity/hq-information-architecture/__tests__/hq-information-hierarchy-v1.test.ts", "utf8");
    expect(hierarchy).toContain("assignedWorkerRolesForRoom");
    expect(hierarchy).not.toContain('"Recovery Operator"');
  });

  it("keeps stale-dev and founder visual contradiction failing current state", () => {
    expect(evaluateDevServerProcessHealthGate(staleHungDevServerObservation()).result).toBe("FAIL");
    const contradiction = evaluateFounderPhysicalContradiction({
      automation_result: "PASS",
      founder_observes_failure: true,
    });
    expect(contradiction.current).toBe("FAIL");
    expect(contradiction.automation_is_current_truth).toBe(false);
    expect(evaluateRenderedVisualQualityGate({
      unstyled_controls: 0,
      layout_breaks: false,
      clipping: false,
      overflow: false,
      overlapping: false,
      hierarchy_ok: true,
      readable: true,
      buttons_malformed: false,
      founder_physical_fail: true,
    }).result).toBe("FAIL");
    expect(evaluateVentureVisualRegressionGate({
      prior_accepted: true,
      intentional_redesign: false,
      missing_ui: false,
      unstyled_component: true,
      lost_cta: false,
      missing_footer: false,
      broken_layout: false,
    }).result).toBe("FAIL");
  });

  it("does not treat raw textarea/button presence as production-quality form PASS", () => {
    const rawLive = buildOccupancynpvCurrentEvidence({
      live: {
        captured_at: new Date().toISOString(),
        homepage_status: 200,
        homepage_html: `<a href="/suggest-improvement">Suggest an Improvement</a><footer>An Infinity OS Venture By IMR</footer><p>$290 $149</p>`,
        suggest_status: 200,
        suggest_html: `<h1>Suggest an Improvement</h1><form><textarea required></textarea><input type="email"><button type="submit">Send suggestion</button></form>`,
        pricing_html: "$290 $149",
        login_status: 200,
        privacy_status: 200,
        terms_status: 200,
        sitemap_status: 200,
        https_ok: true,
        domain_host: "occupancynpv.com",
      },
    });
    expect(rawLive.improvement.form).toBe("FAIL");
    expect(rawLive.design_quality.status).toBe("FAIL");
    expect(evaluateOccupancynpvFullSystemQc(rawLive).systems.design_quality).toBe("FAIL");
  });

  it("repairs OccupancyNPV compose form to venture CTA/field classes", () => {
    const form = occupancynpvPublicImprovementFormSource();
    expect(form).toContain("vg-cta vg-cta--primary");
    expect(form).toContain("vg-textarea");
    expect(form).toContain("vg-input");
    expect(form).toContain("vg-form-field");
    expect(evaluateVentureDesignSystemConformanceGate({ html: form }).result).toBe("PASS");
    expect(evaluateVentureDesignSystemConformanceGate({
      html: `<form><textarea></textarea><button type="submit">Send</button></form>`,
    }).result).toBe("FAIL");
    expect(occupancynpvPublicImprovementPageSource()).toContain("VentureFooter");
  });
});
