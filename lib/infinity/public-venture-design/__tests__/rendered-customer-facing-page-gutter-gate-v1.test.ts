import { describe, expect, it } from "vitest";
import {
  CUSTOMER_FACING_MIN_GUTTER_PX,
  CUSTOMER_FACING_VIEWPORTS,
  RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE,
  applyCustomerFacingPageGutterCss,
  classifyCustomerFacingRoute,
  evaluateCustomerFacingGutterSample,
  evaluateRenderedCustomerFacingPageGutterGate,
  type CustomerFacingGutterSample,
  type CustomerFacingRequiredSurface,
} from "../rendered-layout/customer-facing-gutter";
import { occupancynpvCustomerFacingSourceContract, OCCUPANCYNPV_CUSTOMER_FACING_SURFACES } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

function sample(input: {
  route: string;
  state?: string;
  viewportWidth: number;
  left: number;
  right: number;
  overflowPx?: number;
  clippedInteractive?: boolean;
}): CustomerFacingGutterSample {
  return {
    route: input.route,
    state: input.state ?? "default",
    routeClass: classifyCustomerFacingRoute(input.route),
    viewportWidth: input.viewportWidth,
    leftGutterPx: input.left,
    rightGutterPx: input.right,
    overflowPx: input.overflowPx ?? 0,
    clippedInteractive: input.clippedInteractive ?? false,
    contentTouchesViewport: input.left <= 0 || input.right <= 0,
  };
}

function cover(surfaces: CustomerFacingRequiredSurface[], gutters: { left: number; right: number }): CustomerFacingGutterSample[] {
  return surfaces.flatMap((surface) =>
    surface.viewports.map((viewportWidth) =>
      sample({
        route: surface.route,
        state: surface.state,
        viewportWidth,
        left: gutters.left,
        right: gutters.right,
      }),
    ),
  );
}

const PILOT = "/early-access";
const LOGIN = "/occupancynpv/app/login";

describe("RenderedCustomerFacingPageGutterGate", () => {
  it("classifies customer-facing routes without a manual opt-in", () => {
    expect(RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE).toBe("RenderedCustomerFacingPageGutterGate");
    expect(classifyCustomerFacingRoute("/")).toBe("PUBLIC_MARKETING");
    expect(classifyCustomerFacingRoute("/pricing")).toBe("PRICING");
    expect(classifyCustomerFacingRoute("/early-access")).toBe("EARLY_ACCESS_OR_PILOT");
    expect(classifyCustomerFacingRoute("/early-access?checkout=success")).toBe("EARLY_ACCESS_OR_PILOT");
    expect(classifyCustomerFacingRoute("/occupancynpv/app/login")).toBe("AUTH");
    expect(classifyCustomerFacingRoute("/occupancynpv/app")).toBe("PRODUCT_DASHBOARD");
    expect(classifyCustomerFacingRoute("/occupancynpv/app/workspaces/ws_1")).toBe("PRODUCT_WORKSPACE");
    expect(classifyCustomerFacingRoute("/occupancynpv/app/checkout/complete")).toBe("CHECKOUT_COMPLETION");
    expect(classifyCustomerFacingRoute("/privacy-policy")).toBe("LEGAL");
    expect(classifyCustomerFacingRoute("/future-venture/app/login")).toBe("AUTH");
  });

  it("fails a zero-gutter fixture", () => {
    const reasons = evaluateCustomerFacingGutterSample(sample({
      route: LOGIN,
      state: "signin",
      viewportWidth: 375,
      left: 0,
      right: 0,
    }));
    expect(reasons).toEqual(expect.arrayContaining(["LEFT_GUTTER_BELOW_MINIMUM", "CONTENT_TOUCHES_VIEWPORT"]));
  });

  it("fails a 12px mobile gutter below policy", () => {
    const reasons = evaluateCustomerFacingGutterSample(sample({
      route: PILOT,
      state: "default",
      viewportWidth: 375,
      left: 12,
      right: 12,
    }));
    expect(reasons).toEqual(expect.arrayContaining(["LEFT_GUTTER_BELOW_MINIMUM", "RIGHT_GUTTER_BELOW_MINIMUM"]));
    expect(CUSTOMER_FACING_MIN_GUTTER_PX.mobile).toBe(20);
  });

  it("passes a 20px mobile gutter", () => {
    expect(evaluateCustomerFacingGutterSample(sample({
      route: LOGIN,
      state: "signin",
      viewportWidth: 375,
      left: 20,
      right: 20,
    }))).toEqual([]);
  });

  it("fails horizontal overflow", () => {
    const reasons = evaluateCustomerFacingGutterSample(sample({
      route: LOGIN,
      state: "signin",
      viewportWidth: 375,
      left: 20,
      right: 20,
      overflowPx: 24,
    }));
    expect(reasons).toContain("HORIZONTAL_OVERFLOW");
  });

  it("fails when required rendered evidence is missing", () => {
    const gate = evaluateRenderedCustomerFacingPageGutterGate({
      required: [{ route: PILOT, state: "default", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 768, 1280] }],
      samples: [sample({ route: PILOT, state: "default", viewportWidth: 1280, left: 40, right: 40 })],
    });
    expect(gate.result).toBe("FAIL");
    expect(gate.missingEvidence).toBe("FAIL");
    expect(gate.failReasons).toContain("MISSING_RENDERED_EVIDENCE");
    expect(gate.mobile).toBe("FAIL");
    expect(gate.tablet).toBe("FAIL");
  });

  it("requires Pilot Access, login, signup, success, checkout, dashboard, and workspace evidence", () => {
    const required: CustomerFacingRequiredSurface[] = [
      { route: PILOT, state: "default", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 768, 1280] },
      { route: PILOT, state: "success", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375] },
      { route: LOGIN, state: "signin", routeClass: "AUTH", viewports: [375, 768, 1280] },
      { route: LOGIN, state: "signup", routeClass: "AUTH", viewports: [375] },
      { route: "/occupancynpv/app", state: "default", routeClass: "DASHBOARD", viewports: [375, 1280] },
      { route: "/occupancynpv/app/checkout/complete", state: "unauthenticated", routeClass: "CHECKOUT_COMPLETION", viewports: [375, 1280] },
      { route: "/occupancynpv/app/workspaces/:id", state: "valid_workspace", routeClass: "PRODUCT_WORKSPACE", viewports: [375, 1280] },
    ];
    const passing = evaluateRenderedCustomerFacingPageGutterGate({
      required,
      samples: cover(required, { left: 32, right: 32 }),
      validatedAt: "2026-09-08T00:00:00.000Z",
    });
    expect(passing.result).toBe("PASS");
    expect(passing.pilotEarlyAccess).toBe("PASS");
    expect(passing.auth).toBe("PASS");
    expect(passing.dashboard).toBe("PASS");
    expect(passing.workspace).toBe("PASS");
    expect(passing.checkoutCompletion).toBe("PASS");
    expect(passing.dynamicStates).toBe("PASS");
    expect(passing.mobile).toBe("PASS");
    expect(passing.tablet).toBe("PASS");
    expect(passing.desktop).toBe("PASS");
    expect(passing.missingEvidence).toBe("PASS");
    expect(CUSTOMER_FACING_VIEWPORTS.mobileNarrow).toBe(375);
  });

  it("patches OccupancyNPV shared shells in compose and keeps the overlay idempotent", () => {
    const source = occupancynpvCustomerFacingSourceContract();
    expect(source.marketingShellPatched).toBe(true);
    expect(source.answerFirstGutter).toBe(true);
    expect(source.appShellPresent).toBe(true);
    expect(source.loginUsesShell).toBe(true);
    expect(source.overlayIdempotent).toBe(true);
    const css = applyCustomerFacingPageGutterCss("body{margin:0}");
    expect(css).toContain("--pv-gutter-mobile: 1.25rem");
    expect(css).toContain("padding-inline: var(--pv-gutter-page)");
    expect(OCCUPANCYNPV_CUSTOMER_FACING_SURFACES.length).toBeGreaterThanOrEqual(11);
  });
});
