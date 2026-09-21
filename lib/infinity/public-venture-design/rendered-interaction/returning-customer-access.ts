export const AUTHENTICATED_PRODUCT_NAVIGATION_CONTRACT = "AuthenticatedProductNavigationContract" as const;
export const RETURNING_CUSTOMER_ACCESS_GATE = "ReturningCustomerAccessGate" as const;
export const LOGIN_REQUIRED_VIEWPORTS = [375, 390, 768, 1280] as const;

export type AuthenticatedProductNavigationContract = {
  contract: typeof AUTHENTICATED_PRODUCT_NAVIGATION_CONTRACT;
  ventureId: string;
  customerAuth: boolean;
  loginLabel: "Log In" | "Sign In" | "Customer Login" | "Open App";
  loginRoute: string;
  separateFromPricing: true;
  separateFromCheckout: true;
  mobileRequired: true;
  publicNavRequired: true;
};

export type ReturningCustomerAccessEvidence = {
  publicNavHtml?: string;
  mobileNavHtml?: string;
  loginRoute?: string;
  pricingRoute?: string;
  checkoutTriggeredByLogin?: boolean;
  authenticatedRedirectRoute?: string;
  loginTargetProductionValid?: boolean;
  viewportEvidence?: Array<{ viewportWidth: number; loginVisible: boolean }>;
};

export type ReturningCustomerAccessGateResult = {
  gate: typeof RETURNING_CUSTOMER_ACCESS_GATE;
  result: "PASS" | "FAIL" | "NOT_REQUIRED";
  reasons: string[];
  directLoginRouteExists: boolean;
  publicNavExposesLogin: boolean;
  mobileNavExposesLogin: boolean;
  loginSeparateFromPricing: boolean;
  loginDoesNotTriggerCheckout: boolean;
  authenticatedRedirectValid: boolean;
  loginTargetProductionValid: boolean;
};

const LOGIN_LABEL = /Log In|Sign In|Customer Login|Open App/i;
const LOGIN_HREF = /\/(?:[\w-]+\/)?app\/login|\/login|\/signin|\/sign-in/i;

export function buildAuthenticatedProductNavigationContract(input: {
  ventureId: string;
  customerAuth: boolean;
  loginRoute: string;
  loginLabel?: AuthenticatedProductNavigationContract["loginLabel"];
}): AuthenticatedProductNavigationContract | null {
  if (!input.customerAuth) return null;
  return {
    contract: AUTHENTICATED_PRODUCT_NAVIGATION_CONTRACT,
    ventureId: input.ventureId,
    customerAuth: true,
    loginLabel: input.loginLabel ?? "Log In",
    loginRoute: input.loginRoute,
    separateFromPricing: true,
    separateFromCheckout: true,
    mobileRequired: true,
    publicNavRequired: true,
  };
}

export function evaluateReturningCustomerAccessGate(input: {
  customerAuth: boolean;
  evidence?: ReturningCustomerAccessEvidence | null;
}): ReturningCustomerAccessGateResult {
  if (!input.customerAuth) {
    return {
      gate: RETURNING_CUSTOMER_ACCESS_GATE,
      result: "NOT_REQUIRED",
      reasons: [],
      directLoginRouteExists: false,
      publicNavExposesLogin: false,
      mobileNavExposesLogin: false,
      loginSeparateFromPricing: true,
      loginDoesNotTriggerCheckout: true,
      authenticatedRedirectValid: true,
      loginTargetProductionValid: true,
    };
  }
  const evidence = input.evidence ?? {};
  const nav = `${evidence.publicNavHtml ?? ""}\n${evidence.mobileNavHtml ?? ""}`;
  const loginRoute = evidence.loginRoute ?? "";
  const directLoginRouteExists = Boolean(loginRoute) && LOGIN_HREF.test(loginRoute) && !/pricing|checkout/i.test(loginRoute);
  const publicNavExposesLogin = LOGIN_LABEL.test(evidence.publicNavHtml ?? "") && LOGIN_HREF.test(evidence.publicNavHtml ?? "");
  const mobileNavExposesLogin = LOGIN_LABEL.test(evidence.mobileNavHtml ?? evidence.publicNavHtml ?? "")
    && LOGIN_HREF.test(evidence.mobileNavHtml ?? evidence.publicNavHtml ?? "");
  const loginOnlyViaPricing = /pricing/i.test(loginRoute) || (
    /pricing/i.test(nav) && !publicNavExposesLogin && /Log In|Sign In/i.test(nav)
  );
  const loginSeparateFromPricing = directLoginRouteExists && !/pricing/i.test(loginRoute) && !loginOnlyViaPricing;
  const loginDoesNotTriggerCheckout = evidence.checkoutTriggeredByLogin !== true && !/checkout/i.test(loginRoute);
  const authenticatedRedirectValid = !evidence.authenticatedRedirectRoute || /\/app\/?$|dashboard|workspaces/i.test(evidence.authenticatedRedirectRoute);
  const loginTargetProductionValid = evidence.loginTargetProductionValid !== false && directLoginRouteExists;
  const mobileEvidenceMissing = (evidence.viewportEvidence ?? []).some((row) => LOGIN_REQUIRED_VIEWPORTS.includes(row.viewportWidth as 375) && row.loginVisible !== true);
  const reasons: string[] = [];
  if (!directLoginRouteExists) reasons.push("DIRECT_LOGIN_ROUTE_MISSING");
  if (!publicNavExposesLogin) reasons.push("PUBLIC_NAV_LOGIN_MISSING");
  if (!mobileNavExposesLogin || mobileEvidenceMissing) reasons.push("MOBILE_NAV_LOGIN_MISSING");
  if (!loginSeparateFromPricing) reasons.push("LOGIN_VIA_PRICING_ONLY");
  if (!loginDoesNotTriggerCheckout) reasons.push("LOGIN_OPENS_CHECKOUT");
  if (!authenticatedRedirectValid) reasons.push("AUTHENTICATED_REDIRECT_INVALID");
  if (!loginTargetProductionValid) reasons.push("LOGIN_TARGET_NOT_PRODUCTION_VALID");
  return {
    gate: RETURNING_CUSTOMER_ACCESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    directLoginRouteExists,
    publicNavExposesLogin,
    mobileNavExposesLogin,
    loginSeparateFromPricing,
    loginDoesNotTriggerCheckout,
    authenticatedRedirectValid,
    loginTargetProductionValid,
  };
}

export function occupancynpvAuthenticatedProductNavigationContract(): AuthenticatedProductNavigationContract {
  return buildAuthenticatedProductNavigationContract({
    ventureId: "occupancynpv",
    customerAuth: true,
    loginRoute: "/occupancynpv/app/login",
    loginLabel: "Log In",
  })!;
}
