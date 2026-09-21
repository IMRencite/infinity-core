import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { walkRuntimeGraph } from "@/lib/infinity/server-client-boundary/graph";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { realFeedbackCount } from "@/lib/infinity/product-improvement-loop";
import {
  CUSTOMER_FACING_QC_PRINCIPLES,
  classifyHqRscFailedFetch,
  classifySourceOnlyClaim,
  evaluateBrowserConsoleQCGate,
  evaluateFounderFacingProductionQualityGate,
  evaluateRenderedImprovementIntakeVerificationGate,
  evaluateRuntimeRegressionRecurrenceGate,
  fixtureApiExistsNoTrigger,
  fixtureBuildPassButtonMissing,
  fixtureCompleteRenderedFlow,
  fixtureComponentExistsNotRendered,
  fixtureFailedFetchRegression,
  fixtureVisibleButtonBrokenFetch,
  htmlContainsVisibleImprovementCta,
} from "..";

const ROOT = process.cwd();

describe("CUSTOMER_FACING_BROWSER_QC_V1", () => {
  it("locks that source and build cannot substitute for rendered browser QC", () => {
    expect(CUSTOMER_FACING_QC_PRINCIPLES.build_is_not_browser).toContain("BUILD PASS != BROWSER RUNTIME PASS");
    expect(fixtureBuildPassButtonMissing().result).toBe("FAIL");
    expect(fixtureComponentExistsNotRendered().result).toBe("FAIL");
    expect(fixtureApiExistsNoTrigger().result).toBe("FAIL");
    const broken = fixtureVisibleButtonBrokenFetch();
    expect(broken.interaction.result).toBe("FAIL");
    expect(broken.console.result).toBe("FAIL");
    expect(broken.network.result).toBe("FAIL");
    expect(fixtureCompleteRenderedFlow().result).toBe("PASS");
  });

  it("classifies the OccupancyNPV source-only false positive", () => {
    const chrome = readFileSync(join(ROOT, "app/occupancynpv/app/occupancynpv-improvement-chrome.tsx"), "utf8");
    const layout = readFileSync(join(ROOT, "app/occupancynpv/app/layout.tsx"), "utf8");
    expect(classifySourceOnlyClaim({
      component_exists: chrome.includes("Suggest an Improvement"),
      imported: layout.includes("OccupancynpvImprovementChrome"),
      rendered_html_contains_cta: htmlContainsVisibleImprovementCta("<footer>Privacy Policy</footer>"),
    })).toBe("SOURCE_ONLY_FALSE_POSITIVE");
    expect(evaluateRenderedImprovementIntakeVerificationGate().result).toBe("FAIL");
    expect(evaluateRenderedImprovementIntakeVerificationGate().evidence_level).toBe("FOUNDER_PHYSICAL");
  });

  it("fails material Failed to fetch / RSC navigation errors and ignores extension noise", () => {
    expect(fixtureFailedFetchRegression("Uncaught TypeError: Failed to fetch\nfetchServerResponse\nfetchMissingDynamicData").result).toBe("FAIL");
    expect(evaluateBrowserConsoleQCGate(["chrome-extension://abc/noise.js: Failed to fetch"]).result).toBe("PASS");
  });

  it("keeps HQ idle-shell off Playwright and server-only QC after the Failed to fetch repair", () => {
    const idle = walkRuntimeGraph([join(ROOT, "components/dashboard/operator-console/hq-idle-shell.tsx")]);
    const reached = idle.files.map((file) => file.replace(/\\/g, "/"));
    expect(reached.some((file) => file.endsWith("hq-inspection-identity/resolve.ts"))).toBe(false);
    expect(reached.some((file) => file.endsWith("served-production-browser.ts"))).toBe(false);
    expect(reached.some((file) => file.includes("playwright"))).toBe(false);
    expect(idle.prohibited).toEqual([]);
  });

  it("reopens a previously resolved HQ Failed to fetch when founder evidence fails again", () => {
    const hung = classifyHqRscFailedFetch({
      request_url: "http://localhost:3000/dashboard",
      method: "GET",
      rsc_header: true,
      initiating_route: "/dashboard",
      request_completed: false,
      http_status: null,
      timed_out: true,
      server_process_alive: true,
      playwright_in_client_graph: false,
      compile_error: null,
    });
    expect(hung.founder_failed_fetch).toBe(true);
    expect(hung.same_as_playwright_tls_boundary).toBe(false);
    expect(hung.classes).toEqual(expect.arrayContaining(["RSC_FETCH_FAILURE", "TURBOPACK_DEV_FAILURE", "STALE_NEXT_BUILD"]));
    const reopened = evaluateRuntimeRegressionRecurrenceGate({
      defect_id: "HQ_RSC_FAILED_FETCH",
      prior_state: "RESOLVED",
      current_founder_or_served_fail: true,
      current_verification_pass: false,
    });
    expect(reopened.state).toBe("REGRESSION_REOPENED");
    expect(reopened.result).toBe("FAIL");
    const restored = evaluateRuntimeRegressionRecurrenceGate({
      defect_id: "HQ_RSC_FAILED_FETCH",
      prior_state: "REGRESSION_REOPENED",
      current_founder_or_served_fail: false,
      current_verification_pass: true,
    });
    expect(restored.result).toBe("PASS");
    expect(evaluateFounderFacingProductionQualityGate({
      dashboard_loads: true,
      hq_shell_renders: true,
      command_renders: true,
      operating_floor_renders: true,
      venture_navigation_renders: true,
      material_console_errors: 0,
      failed_required_requests: 0,
      broken_navigation_transitions: 0,
      rsc_fetch_ok: true,
    }).result).toBe("PASS");
    expect(evaluateFounderFacingProductionQualityGate({
      dashboard_loads: false,
      hq_shell_renders: false,
      command_renders: false,
      operating_floor_renders: false,
      venture_navigation_renders: false,
      material_console_errors: 1,
      failed_required_requests: 1,
      broken_navigation_transitions: 1,
      rsc_fetch_ok: false,
    }).result).toBe("FAIL");
  });

  it("composes a public OccupancyNPV Suggest an Improvement surface without counting synthetic feedback", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const chrome = composed.files.find((file) => file.path.replace(/\\/g, "/") === "components/site-chrome.tsx")?.content ?? "";
    const footer = composed.files.find((file) => file.path.replace(/\\/g, "/") === "components/venture-footer.tsx")?.content ?? "";
    const page = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/suggest-improvement/page.tsx")?.content ?? "";
    expect(chrome.includes("Suggest an Improvement") || footer.includes("Suggest an Improvement")).toBe(true);
    expect(page).toContain("Suggest an Improvement");
    expect(page).toContain("OccupancynpvPublicImprovementForm");
    expect(realFeedbackCount(CRE_VENTURE_ID)).toBe(0);
  });
});
