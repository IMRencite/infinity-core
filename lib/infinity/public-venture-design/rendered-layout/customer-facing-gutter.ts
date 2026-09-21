export const RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE = "RenderedCustomerFacingPageGutterGate" as const;

export const CUSTOMER_FACING_ROUTE_CLASSES = [
  "PUBLIC_MARKETING",
  "PRICING",
  "EARLY_ACCESS_OR_PILOT",
  "AUTH",
  "DASHBOARD",
  "PRODUCT_DASHBOARD",
  "PRODUCT_WORKSPACE",
  "CHECKOUT_COMPLETION",
  "LEGAL",
  "OTHER_CUSTOMER_FACING",
] as const;
export type CustomerFacingRouteClass = (typeof CUSTOMER_FACING_ROUTE_CLASSES)[number];

export const CUSTOMER_FACING_VIEWPORTS = {
  mobileNarrow: 375,
  mobile: 390,
  tablet: 768,
  desktop: 1280,
} as const;

export const CUSTOMER_FACING_MIN_GUTTER_PX = {
  mobile: 20,
  tablet: 24,
  desktop: 32,
} as const;

export const CUSTOMER_FACING_GUTTER_CSS_MARK = "--cf-page-gutter-applied" as const;

export type CustomerFacingViewportBand = "mobile" | "tablet" | "desktop";
export type CustomerFacingGateResult = "PASS" | "FAIL";

export type CustomerFacingGutterSample = {
  route: string;
  state: string;
  routeClass: CustomerFacingRouteClass;
  viewportWidth: number;
  leftGutterPx: number;
  rightGutterPx: number;
  overflowPx: number;
  clippedInteractive: boolean;
  contentTouchesViewport: boolean;
};

export type CustomerFacingRequiredSurface = {
  route: string;
  state: string;
  routeClass: CustomerFacingRouteClass;
  viewports: number[];
};

export type RenderedCustomerFacingPageGutterGateResult = {
  gate: typeof RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE;
  global: true;
  optInRequired: false;
  result: CustomerFacingGateResult;
  publicMarketing: CustomerFacingGateResult;
  pilotEarlyAccess: CustomerFacingGateResult;
  auth: CustomerFacingGateResult;
  dashboard: CustomerFacingGateResult;
  workspace: CustomerFacingGateResult;
  checkoutCompletion: CustomerFacingGateResult;
  legal: CustomerFacingGateResult;
  dynamicStates: CustomerFacingGateResult;
  mobile: CustomerFacingGateResult;
  tablet: CustomerFacingGateResult;
  desktop: CustomerFacingGateResult;
  missingEvidence: CustomerFacingGateResult;
  failReasons: string[];
  failingRoutes: string[];
  samples: CustomerFacingGutterSample[];
  validatedAt: string | null;
};

export function classifyCustomerFacingRoute(route: string): CustomerFacingRouteClass {
  const path = (route.split("?")[0] || "/").replace(/\/$/, "") || "/";
  if (/\/(login|signin|signup|sign-up|auth)(\/|$)/i.test(path)) return "AUTH";
  if (/checkout\/(complete|success)|\/checkout\/return/i.test(path)) return "CHECKOUT_COMPLETION";
  if (/\/(workspaces?|deals?|projects?)\/[^/]+/i.test(path)) return "PRODUCT_WORKSPACE";
  if (/\/(app|dashboard|account|portal)\/?$/i.test(path)) return "PRODUCT_DASHBOARD";
  if (/(early-access|pilot-access|waitlist|\/pilot)(\/|$|\?)/i.test(route) || /(early-access|pilot-access|waitlist|\/pilot)$/i.test(path)) {
    return "EARLY_ACCESS_OR_PILOT";
  }
  if (/\/pricing(\/|$)/i.test(path)) return "PRICING";
  if (/(privacy|terms|legal|cookie)/i.test(path)) return "LEGAL";
  if (path === "/" || /^\/(how-it-works|compare|resources|faq|for\/|commercial-|tenant-|discount-)/i.test(path)) {
    return "PUBLIC_MARKETING";
  }
  if (/\/app\//i.test(path)) return "OTHER_CUSTOMER_FACING";
  return "OTHER_CUSTOMER_FACING";
}

export function customerFacingViewportBand(width: number): CustomerFacingViewportBand {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function customerFacingMinGutterPx(width: number): number {
  return CUSTOMER_FACING_MIN_GUTTER_PX[customerFacingViewportBand(width)];
}

export function applyCustomerFacingPageGutterCss(css: string): string {
  if (css.includes(`${CUSTOMER_FACING_GUTTER_CSS_MARK}:`)) return css;
  return `${css}

/* ${RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE} */
:root {
  ${CUSTOMER_FACING_GUTTER_CSS_MARK}: 1;
  --pv-gutter-page: 2rem;
  --pv-gutter-tablet: 1.5rem;
  --pv-gutter-mobile: 1.25rem;
}
@media (max-width: 960px) {
  :root { --pv-gutter-page: var(--pv-gutter-tablet); }
}
@media (max-width: 640px) {
  :root { --pv-gutter-page: var(--pv-gutter-mobile); }
}
.pv-answer,
[data-answer-first="true"] {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--pv-measure, var(--pv-content, 42rem));
  margin-left: auto;
  margin-right: auto;
  padding-inline: var(--pv-gutter-page);
}
.pv-nav-inner,
.pv-breadcrumb {
  width: min(100% - (2 * var(--pv-gutter-page)), var(--pv-max, 72rem));
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
}
`;
}

export function evaluateCustomerFacingGutterSample(sample: CustomerFacingGutterSample): string[] {
  const reasons: string[] = [];
  const min = customerFacingMinGutterPx(sample.viewportWidth);
  if (sample.leftGutterPx < min) reasons.push("LEFT_GUTTER_BELOW_MINIMUM");
  if (sample.rightGutterPx < min) reasons.push("RIGHT_GUTTER_BELOW_MINIMUM");
  if (sample.contentTouchesViewport || sample.leftGutterPx <= 0 || sample.rightGutterPx <= 0) {
    reasons.push("CONTENT_TOUCHES_VIEWPORT");
  }
  if (sample.overflowPx > 0) reasons.push("HORIZONTAL_OVERFLOW");
  if (sample.clippedInteractive) reasons.push("CLIPPED_INTERACTIVE_CONTROL");
  return reasons;
}

function surfaceKey(route: string, state: string, viewportWidth: number): string {
  return `${route}::${state}::${viewportWidth}`;
}

export function evaluateRenderedCustomerFacingPageGutterGate(input: {
  required: CustomerFacingRequiredSurface[];
  samples?: CustomerFacingGutterSample[];
  validatedAt?: string | null;
}): RenderedCustomerFacingPageGutterGateResult {
  const samples = input.samples ?? [];
  const failReasons: string[] = [];
  const failingRoutes = new Set<string>();
  const seen = new Set(samples.map((sample) => surfaceKey(sample.route, sample.state, sample.viewportWidth)));

  for (const surface of input.required) {
    for (const viewport of surface.viewports) {
      if (!seen.has(surfaceKey(surface.route, surface.state, viewport))) {
        failReasons.push("MISSING_RENDERED_EVIDENCE");
        failingRoutes.add(`${surface.route} [${surface.state} @${viewport}]`);
      }
    }
  }

  for (const sample of samples) {
    const reasons = evaluateCustomerFacingGutterSample(sample);
    if (reasons.length > 0) {
      failReasons.push(...reasons);
      failingRoutes.add(`${sample.route} [${sample.state} @${sample.viewportWidth}]`);
    }
  }

  const classResult = (routeClass: CustomerFacingRouteClass): CustomerFacingGateResult => {
    const required = input.required.filter((surface) => surface.routeClass === routeClass);
    if (required.length === 0) return "PASS";
    const failed = [...failingRoutes].some((item) => required.some((surface) => item.startsWith(surface.route)));
    return failed ? "FAIL" : "PASS";
  };

  const bandCovered = (band: CustomerFacingViewportBand): CustomerFacingGateResult => {
    const widths = Object.values(CUSTOMER_FACING_VIEWPORTS).filter((width) => customerFacingViewportBand(width) === band);
    const needed = input.required.flatMap((surface) => surface.viewports.filter((width) => widths.includes(width as 375 | 390 | 768 | 1280)));
    if (needed.length === 0) return "FAIL";
    const missing = input.required.some((surface) =>
      surface.viewports.some((width) => customerFacingViewportBand(width) === band && !seen.has(surfaceKey(surface.route, surface.state, width))),
    );
    return missing ? "FAIL" : "PASS";
  };

  const uniqueReasons = [...new Set(failReasons)];
  return {
    gate: RENDERED_CUSTOMER_FACING_PAGE_GUTTER_GATE,
    global: true,
    optInRequired: false,
    result: uniqueReasons.length === 0 ? "PASS" : "FAIL",
    publicMarketing: classResult("PUBLIC_MARKETING"),
    pilotEarlyAccess: classResult("EARLY_ACCESS_OR_PILOT"),
    auth: classResult("AUTH"),
    dashboard: classResult("DASHBOARD") === "FAIL" || classResult("PRODUCT_DASHBOARD") === "FAIL" ? "FAIL" : "PASS",
    workspace: classResult("PRODUCT_WORKSPACE"),
    checkoutCompletion: classResult("CHECKOUT_COMPLETION"),
    legal: classResult("LEGAL"),
    dynamicStates: input.required.some((surface) => /signin|signup|success|error|authenticated|unauthenticated/i.test(surface.state))
      ? (input.required
          .filter((surface) => /signin|signup|success|error|authenticated|unauthenticated/i.test(surface.state))
          .every((surface) => surface.viewports.every((width) => seen.has(surfaceKey(surface.route, surface.state, width))))
        && ![...failingRoutes].some((item) => /signin|signup|success|error/.test(item))
          ? "PASS"
          : "FAIL")
      : "PASS",
    mobile: bandCovered("mobile"),
    tablet: bandCovered("tablet"),
    desktop: bandCovered("desktop"),
    missingEvidence: uniqueReasons.includes("MISSING_RENDERED_EVIDENCE") ? "FAIL" : "PASS",
    failReasons: uniqueReasons,
    failingRoutes: [...failingRoutes],
    samples,
    validatedAt: input.validatedAt ?? null,
  };
}

export const FACTORY_CUSTOMER_FACING_ROUTE_INVENTORY: CustomerFacingRequiredSurface[] = [
  { route: "/", state: "default", routeClass: "PUBLIC_MARKETING", viewports: [375, 390, 768, 1280] },
  { route: "/pricing", state: "default", routeClass: "PRICING", viewports: [375, 390, 768, 1280] },
  { route: "/early-access", state: "default", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 390, 768, 1280] },
  { route: "/early-access", state: "success", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 390, 768, 1280] },
  { route: "/login", state: "signin", routeClass: "AUTH", viewports: [375, 390, 768, 1280] },
  { route: "/login", state: "signup", routeClass: "AUTH", viewports: [375, 390, 768, 1280] },
  { route: "/app", state: "default", routeClass: "DASHBOARD", viewports: [375, 1280] },
  { route: "/app/checkout/complete", state: "unauthenticated", routeClass: "CHECKOUT_COMPLETION", viewports: [375, 1280] },
  { route: "/app/workspaces/:id", state: "valid_workspace", routeClass: "PRODUCT_WORKSPACE", viewports: [375, 1280] },
];
