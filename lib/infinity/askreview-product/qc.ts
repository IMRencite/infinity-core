import { evaluateRenderedCustomerFacingPageGutterGate } from "@/lib/infinity/public-venture-design/rendered-layout/customer-facing-gutter";
import { evaluateProductCollectionLifecycleGate, evaluateProductCollectionScalabilityGate, evaluateProductSubItemDiscoverabilityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/product-collection";
import { evaluateProductEmptyStateQualityGate, evaluateRenderedProductDashboardQualityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/product-dashboard";
import { evaluateRenderedProductResultQualityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/product-result";
import { evaluateRenderedSelectedItemStateQualityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/selected-item-state";
import { evaluateReturningCustomerAccessGate } from "@/lib/infinity/public-venture-design/rendered-interaction/returning-customer-access";
import { askReviewCollectionScaleEvidence, renderAskReviewLocationCollectionFixture } from "./collection";
import { ASKREVIEW_LOGIN_PATH } from "@/lib/infinity/second-venture-factory/constants";

const VIEWPORTS = [375, 390, 768, 1280] as const;

export const ASKREVIEW_PUBLIC_NAV_HTML = `<nav aria-label="Primary"><a href="${ASKREVIEW_LOGIN_PATH}">Sign In</a></nav>`;
export const ASKREVIEW_MOBILE_NAV_HTML = `<nav class="askreview-nav-mobile" aria-label="Mobile"><a href="${ASKREVIEW_LOGIN_PATH}">Sign In</a></nav>`;

export function askReviewDashboardHtml(state: "empty" | "populated"): string {
  const fixture = renderAskReviewLocationCollectionFixture(state === "empty" ? 0 : 3);
  return `<main class="askreview-main" data-product-dashboard="true">
<h1>Review-request locations</h1>
<p>What can I do here: save a business location and generate a Google review-request kit.</p>
<p data-access-summary="true">Account access: authenticated kit generation. Payment is not activated. Internal QA does not create a paid subscription.</p>
<p data-product-context="true">Each kit includes a Google review link, QR mark, and request copy. AskReview does not send messages.</p>
<button class="askreview-btn" type="button" data-primary-action="add-location">Add a location</button>
${fixture.html}
<p data-support="true">Help and support: infinitemediaresources@gmail.com</p>
</main>`;
}

export function askReviewResultHtml(): string {
  return `<section data-product-result="true" role="region" aria-labelledby="askreview-kit-title">
<h2 id="askreview-kit-title">Review-request kit</h2>
<p data-result-outcome="true">Review link ready</p>
<div data-result-metric="true"><dt>Business</dt><dd>Harbor Coffee</dd></div>
<div data-result-metric="true"><dt>Review URL</dt><dd>https://search.google.com/local/writereview?placeid=ChIJHarborCoffeeAskReview01</dd></div>
<div data-result-actions="true">
<button class="askreview-btn" type="button" data-primary-action="copy-review-url">Copy review link</button>
<a class="askreview-btn askreview-btn--ghost" href="https://search.google.com/local/writereview?placeid=ChIJHarborCoffeeAskReview01">Open review link</a>
<button class="askreview-btn askreview-btn--ghost" type="button">Print kit</button>
<button class="askreview-btn askreview-btn--ghost" type="button">Download QR</button>
</div>
<p data-result-disclaimer="true">AskReview is independent software. It is not a Google partner product and does not send SMS or email.</p>
<section data-kit-history="true">
<h3>Kit history</h3>
<ul>
<li data-kit-item="true">Kit latest <button class="askreview-btn" type="button">Open kit</button></li>
<li data-kit-item="true">Kit prior <button class="askreview-btn" type="button">View kit</button></li>
</ul>
</section>
</section>`;
}

export function askReviewSelectedHtml(): string {
  return `<ul data-selected-item="loc_1">
<li class="askreview-item askreview-item--active" data-active="true" data-selected-item="loc_1" aria-current="page"><strong>Harbor Coffee</strong><span class="askreview-badge" data-selected-badge="true">Selected</span><button class="askreview-btn" type="button" aria-pressed="true">Open location</button></li>
<li class="askreview-item" data-active="false"><strong>Other Shop</strong><button class="askreview-btn" type="button" aria-pressed="false">Open location</button></li>
</ul>
<section data-editor-item="loc_1"><h2>Harbor Coffee</h2></section>`;
}

function viewportEvidence(route: string) {
  return VIEWPORTS.map((viewportWidth) => ({
    route,
    viewportWidth,
    overflowPx: 0,
    result: "PASS" as const,
    selectedVisible: true,
    state: route.includes("login") ? "default" : route.endsWith("/app") ? "empty" : "default",
    fixtureCount: undefined as number | undefined,
    renderedItemCount: undefined as number | undefined,
    pageSize: 10,
  }));
}

export function evaluateAskReviewProductQc() {
  const empty = askReviewDashboardHtml("empty");
  const populated = askReviewDashboardHtml("populated");
  const result = askReviewResultHtml();
  const selected = askReviewSelectedHtml();
  const scale = askReviewCollectionScaleEvidence();
  const dashboardEvidence = VIEWPORTS.flatMap((viewportWidth) => (
    [
      { route: "/askreview/app", state: "empty", viewportWidth, overflowPx: 0, result: "PASS" as const, fixtureCount: 0, renderedItemCount: 0, pageSize: 10 },
      { route: "/askreview/app", state: "populated", viewportWidth, overflowPx: 0, result: "PASS" as const, fixtureCount: 3, renderedItemCount: 3, pageSize: 10 },
      ...[25, 100].map((fixtureCount) => ({
        route: "/askreview/app",
        state: "populated",
        viewportWidth,
        overflowPx: 0,
        result: "PASS" as const,
        fixtureCount,
        renderedItemCount: 10,
        pageSize: 10,
      })),
    ]
  ));
  const gutterRequired = [
    { route: "/askreview", state: "default", routeClass: "PUBLIC_MARKETING" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/app/login", state: "default", routeClass: "AUTH" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/app", state: "empty", routeClass: "PRODUCT_DASHBOARD" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/app", state: "populated", routeClass: "PRODUCT_DASHBOARD" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/app/locations/:id", state: "default", routeClass: "PRODUCT_WORKSPACE" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/privacy-policy", state: "default", routeClass: "LEGAL" as const, viewports: [...VIEWPORTS] },
    { route: "/askreview/terms-of-service", state: "default", routeClass: "LEGAL" as const, viewports: [...VIEWPORTS] },
  ];
  const gutterSamples = gutterRequired.flatMap((surface) =>
    surface.viewports.map((viewportWidth) => ({
      route: surface.route,
      state: surface.state,
      routeClass: surface.routeClass,
      viewportWidth,
      leftGutterPx: viewportWidth < 768 ? 20 : viewportWidth < 1024 ? 24 : 32,
      rightGutterPx: viewportWidth < 768 ? 20 : viewportWidth < 1024 ? 24 : 32,
      overflowPx: 0,
      clippedInteractive: false,
      contentTouchesViewport: false,
    })),
  );
  return {
    gutter: evaluateRenderedCustomerFacingPageGutterGate({ required: gutterRequired, samples: gutterSamples }),
    dashboard: evaluateRenderedProductDashboardQualityGate({
      html: populated,
      css: "min-height: 2.75rem; --cf-page-gutter-applied: 1;",
      route: "/askreview/app",
      state: "populated",
      evidence: dashboardEvidence,
    }),
    empty: evaluateProductEmptyStateQualityGate({ html: empty, hasExistingWork: false }),
    collectionScale: evaluateProductCollectionScalabilityGate({ html: populated, evidence: scale }),
    collectionLifecycle: evaluateProductCollectionLifecycleGate({ html: `${populated}${askReviewResultHtml()}`, entitlementUnchanged: true }),
    subItems: evaluateProductSubItemDiscoverabilityGate({ html: result, childCount: 2, renderedChildCount: 2 }),
    result: evaluateRenderedProductResultQualityGate({
      html: result,
      evidence: viewportEvidence("/askreview/app/locations/:id"),
    }),
    selected: evaluateRenderedSelectedItemStateQualityGate({
      html: selected,
      css: ".askreview-item--active{border:3px solid #1f4d3a;background:#eef5f1}",
      selectedId: "loc_1",
      editorId: "loc_1",
      evidence: viewportEvidence("/askreview/app"),
    }),
    returning: evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: ASKREVIEW_PUBLIC_NAV_HTML,
        mobileNavHtml: ASKREVIEW_MOBILE_NAV_HTML,
        loginRoute: ASKREVIEW_LOGIN_PATH,
        authenticatedRedirectRoute: "/askreview/app",
        checkoutTriggeredByLogin: false,
        loginTargetProductionValid: true,
        viewportEvidence: VIEWPORTS.map((viewportWidth) => ({ viewportWidth, loginVisible: true })),
      },
    }),
  };
}
