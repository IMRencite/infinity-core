import { describe, expect, it } from "vitest";
import {
  AUTHENTICATED_PRODUCT_NAVIGATION_CONTRACT,
  RETURNING_CUSTOMER_ACCESS_GATE,
  buildAuthenticatedProductNavigationContract,
  evaluateReturningCustomerAccessGate,
} from "../rendered-interaction/returning-customer-access";
import { composeOccupancynpvPaymentReactivationFiles } from "@/lib/infinity/venture-operating-scale/occupancynpv-payment-reactivation-surface";
import { evaluateOccupancynpvReturningCustomerAccessQc } from "@/lib/infinity/venture-operating-scale/occupancynpv-customer-facing-ui-qc";

describe("RETURNING_CUSTOMER_ACCESS_GATE_V1", () => {
  it("does not apply to ventures without customer authentication", () => {
    expect(buildAuthenticatedProductNavigationContract({
      ventureId: "lead",
      customerAuth: false,
      loginRoute: "/login",
    })).toBeNull();
    expect(evaluateReturningCustomerAccessGate({ customerAuth: false }).result).toBe("NOT_REQUIRED");
  });

  it("fails an auth venture with no Login nav", () => {
    const result = evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: `<nav><a href="/pricing">Pricing</a></nav>`,
        loginRoute: "/app/login",
      },
    });
    expect(result.gate).toBe(RETURNING_CUSTOMER_ACCESS_GATE);
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toContain("PUBLIC_NAV_LOGIN_MISSING");
  });

  it("fails Login that only exists through Pricing", () => {
    const result = evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: `<nav><a href="/pricing">Pricing</a></nav>`,
        loginRoute: "/pricing",
        checkoutTriggeredByLogin: false,
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toEqual(expect.arrayContaining(["DIRECT_LOGIN_ROUTE_MISSING", "LOGIN_VIA_PRICING_ONLY"]));
  });

  it("fails missing mobile Login and Login that opens checkout", () => {
    const mobile = evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: `<nav><a href="/app/login">Log In</a></nav>`,
        mobileNavHtml: `<nav><a href="/pricing">Pricing</a></nav>`,
        loginRoute: "/app/login",
        viewportEvidence: [{ viewportWidth: 375, loginVisible: false }],
      },
    });
    expect(mobile.reasons).toContain("MOBILE_NAV_LOGIN_MISSING");
    const checkout = evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: `<nav><a href="/checkout">Log In</a></nav>`,
        loginRoute: "/checkout",
        checkoutTriggeredByLogin: true,
      },
    });
    expect(checkout.reasons).toContain("LOGIN_OPENS_CHECKOUT");
  });

  it("passes direct public Login that opens auth", () => {
    const result = evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: `<nav><a href="/occupancynpv/app/login">Log In</a><a href="/pricing">Pricing</a></nav>`,
        mobileNavHtml: `<nav><a href="/occupancynpv/app/login">Log In</a></nav>`,
        loginRoute: "/occupancynpv/app/login",
        authenticatedRedirectRoute: "/occupancynpv/app",
        loginTargetProductionValid: true,
        viewportEvidence: [375, 390, 768, 1280].map((viewportWidth) => ({ viewportWidth, loginVisible: true })),
      },
    });
    expect(result.result).toBe("PASS");
    expect(result.loginSeparateFromPricing).toBe(true);
    expect(result.loginDoesNotTriggerCheckout).toBe(true);
  });

  it("passes OccupancyNPV composed public Login to the auth route", () => {
    const composed = composeOccupancynpvPaymentReactivationFiles();
    const nav = composed.files.find((file) => file.path.replace(/\\/g, "/") === "components/site-chrome.tsx")?.content ?? "";
    expect(nav).toContain('{ href: "/occupancynpv/app/login", label: "Log In" }');
    expect(nav).not.toMatch(/href: "\/pricing", label: "Log In"/);
    const qc = evaluateOccupancynpvReturningCustomerAccessQc();
    expect(qc.contract.contract).toBe(AUTHENTICATED_PRODUCT_NAVIGATION_CONTRACT);
    expect(qc.contract.loginRoute).toBe("/occupancynpv/app/login");
    expect(qc.gate.result).toBe("PASS");
  });
});
