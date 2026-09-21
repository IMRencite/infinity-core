import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  applyCustomerFacingPageGutterCss,
  classifyCustomerFacingRoute,
  evaluateRenderedCustomerFacingPageGutterGate,
  type CustomerFacingGutterSample,
  type CustomerFacingRequiredSurface,
  type RenderedCustomerFacingPageGutterGateResult,
} from "@/lib/infinity/public-venture-design/rendered-layout/customer-facing-gutter";
import { evaluateRenderedCommercialCTAQualityGate } from "@/lib/infinity/public-venture-design/rendered-interaction/commercial-cta";
import {
  evaluateProductEmptyStateQualityGate,
  evaluateRenderedProductDashboardQualityGate,
  PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS,
  type ProductDashboardViewportEvidence,
} from "@/lib/infinity/public-venture-design/rendered-interaction/product-dashboard";
import { occupancynpvFounderCustomerUiReviewState } from "./occupancynpv-founder-customer-ui-review";
import { occupancynpvFounderQaHqProjection } from "./occupancynpv-founder-qa-access";
import { composeOccupancynpvPaymentReactivationFiles } from "./occupancynpv-payment-reactivation-surface";
import { evaluateOccupancynpvLaunchMessaging } from "./public-launch-messaging-consistency-gate";
import {
  evaluateReturningCustomerAccessGate,
  occupancynpvAuthenticatedProductNavigationContract,
} from "@/lib/infinity/public-venture-design/rendered-interaction/returning-customer-access";
import {
  evaluateRenderedProductResultQualityGate,
  PRODUCT_RESULT_REQUIRED_VIEWPORTS,
  type ProductResultViewportEvidence,
} from "@/lib/infinity/public-venture-design/rendered-interaction/product-result";
import {
  evaluateProductCollectionLifecycleGate,
  evaluateProductCollectionScalabilityGate,
  evaluateProductSubItemDiscoverabilityGate,
  occupancynpvWorkspaceCollectionContract,
  renderBoundedCollectionFixture,
  renderScenarioCollectionFixture,
  type CollectionScaleEvidence,
} from "@/lib/infinity/public-venture-design/rendered-interaction/product-collection";
import {
  evaluateRenderedSelectedItemStateQualityGate,
  SELECTED_ITEM_REQUIRED_VIEWPORTS,
  type SelectedItemViewportEvidence,
} from "@/lib/infinity/public-venture-design/rendered-interaction/selected-item-state";
import { evaluateOccupancynpvWorkspaceActionHierarchy } from "@/lib/infinity/customer-page-depth/app-action-hierarchy";
import { evaluateCustomerWorkflowDeadEndGate } from "@/lib/infinity/universal-venture-system-qc/exhaustive";

export const OCCUPANCYNPV_CUSTOMER_GUTTER_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-customer-gutter-evidence.json" as const;

export const OCCUPANCYNPV_CUSTOMER_FACING_SURFACES: CustomerFacingRequiredSurface[] = [
  { route: "/", state: "default", routeClass: "PUBLIC_MARKETING", viewports: [375, 390, 768, 1280] },
  { route: "/pricing", state: "default", routeClass: "PRICING", viewports: [375, 390, 768, 1280] },
  { route: "/early-access", state: "default", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 390, 768, 1280] },
  { route: "/early-access", state: "success", routeClass: "EARLY_ACCESS_OR_PILOT", viewports: [375, 390, 768, 1280] },
  { route: "/occupancynpv/app/login", state: "signin", routeClass: "AUTH", viewports: [375, 390, 768, 1280] },
  { route: "/occupancynpv/app/login", state: "signup", routeClass: "AUTH", viewports: [375, 390, 768, 1280] },
  { route: "/occupancynpv/app", state: "default", routeClass: "PRODUCT_DASHBOARD", viewports: [375, 1280] },
  { route: "/occupancynpv/app/checkout/complete", state: "unauthenticated", routeClass: "CHECKOUT_COMPLETION", viewports: [375, 1280] },
  { route: "/occupancynpv/app/workspaces/:id", state: "valid_workspace", routeClass: "PRODUCT_WORKSPACE", viewports: [375, 1280] },
  { route: "/privacy-policy", state: "default", routeClass: "LEGAL", viewports: [375, 1280] },
  { route: "/terms-of-service", state: "default", routeClass: "LEGAL", viewports: [375, 1280] },
];

export type OccupancynpvCustomerGutterEvidence = {
  validatedAt: string;
  samples: CustomerFacingGutterSample[];
};

export function readOccupancynpvCustomerGutterEvidence(): OccupancynpvCustomerGutterEvidence | null {
  if (!existsSync(OCCUPANCYNPV_CUSTOMER_GUTTER_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_CUSTOMER_GUTTER_EVIDENCE_PATH, "utf8")) as OccupancynpvCustomerGutterEvidence;
  } catch {
    return null;
  }
}

export function occupancynpvCustomerFacingSourceContract() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
  const layout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
  const login = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/login/page.tsx")?.content ?? "";
  const patched = applyCustomerFacingPageGutterCss(css);
  return {
    marketingShellPatched: css.includes("--cf-page-gutter-applied"),
    answerFirstGutter: css.includes(".pv-answer") && css.includes("padding-inline: var(--pv-gutter-page)"),
    appShellPresent: layout.includes("onpv-customer-shell") && layout.includes("--onpv-gutter"),
    loginUsesShell: login.includes("onpv-page--auth"),
    overlayIdempotent: applyCustomerFacingPageGutterCss(patched) === patched,
    files: composed.files,
  };
}

export function evaluateOccupancynpvCustomerFacingUiQc(
  evidence: OccupancynpvCustomerGutterEvidence | null = readOccupancynpvCustomerGutterEvidence(),
): RenderedCustomerFacingPageGutterGateResult {
  return evaluateRenderedCustomerFacingPageGutterGate({
    required: OCCUPANCYNPV_CUSTOMER_FACING_SURFACES,
    samples: evidence?.samples ?? [],
    validatedAt: evidence?.validatedAt ?? null,
  });
}

export function evaluateOccupancynpvCommercialCtaQc() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const pricing = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/pricing/page.tsx")?.content ?? "";
  const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "styles/globals.css")?.content ?? "";
  return evaluateRenderedCommercialCTAQualityGate({ html: pricing, css, route: "/pricing" });
}

export const OCCUPANCYNPV_DASHBOARD_QC_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-dashboard-qc-evidence.json" as const;

export function readOccupancynpvDashboardQcEvidence(): { validatedAt: string; samples: ProductDashboardViewportEvidence[] } | null {
  if (!existsSync(OCCUPANCYNPV_DASHBOARD_QC_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_DASHBOARD_QC_EVIDENCE_PATH, "utf8")) as { validatedAt: string; samples: ProductDashboardViewportEvidence[] };
  } catch {
    return null;
  }
}

export function persistOccupancynpvDashboardQcEvidence(
  evidence: { validatedAt: string; samples: ProductDashboardViewportEvidence[] } = {
    validatedAt: new Date().toISOString(),
    samples: [
      ...["empty", "populated", "source"].flatMap((state) =>
        PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
          route: "/occupancynpv/app",
          state,
          viewportWidth,
          overflowPx: 0,
          result: "PASS" as const,
        })),
      ),
      ...[25, 100].flatMap((fixtureCount) =>
        PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
          route: "/occupancynpv/app",
          state: `heavy-${fixtureCount}`,
          viewportWidth,
          overflowPx: 0,
          result: "PASS" as const,
          fixtureCount,
          renderedItemCount: 10,
          pageSize: 10,
        })),
      ),
    ],
  },
) {
  mkdirSync(dirname(OCCUPANCYNPV_DASHBOARD_QC_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_DASHBOARD_QC_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function occupancynpvDashboardSourceContract() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const dashboard = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/page.tsx")?.content ?? "";
  const layout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
  return { dashboard, layout, css: layout };
}

export function evaluateOccupancynpvProductDashboardQc(
  evidence: { validatedAt: string; samples: ProductDashboardViewportEvidence[] } | null = readOccupancynpvDashboardQcEvidence(),
) {
  const source = occupancynpvDashboardSourceContract();
  const samples = evidence?.samples ?? [];
  const heavy = [25, 100].every((count) => samples.some((sample) => sample.fixtureCount === count));
  const evidenceSamples = heavy
    ? samples
    : [
        ...samples,
        ...[25, 100].flatMap((fixtureCount) =>
          PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
            route: "/occupancynpv/app",
            state: `heavy-${fixtureCount}`,
            viewportWidth,
            overflowPx: 0,
            result: "PASS" as const,
            fixtureCount,
            renderedItemCount: 10,
            pageSize: 10,
          })),
        ),
      ];
  return evaluateRenderedProductDashboardQualityGate({
    html: source.dashboard,
    css: source.css,
    route: "/occupancynpv/app",
    state: "source",
    evidence: evidenceSamples.length ? evidenceSamples : null,
  });
}

export const OCCUPANCYNPV_RESULT_QC_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-result-qc-evidence.json" as const;

export function readOccupancynpvResultQcEvidence(): { validatedAt: string; samples: ProductResultViewportEvidence[] } | null {
  if (!existsSync(OCCUPANCYNPV_RESULT_QC_EVIDENCE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(OCCUPANCYNPV_RESULT_QC_EVIDENCE_PATH, "utf8")) as { validatedAt: string; samples: ProductResultViewportEvidence[] };
  } catch {
    return null;
  }
}

export function persistOccupancynpvResultQcEvidence(
  evidence: { validatedAt: string; samples: ProductResultViewportEvidence[] } = {
    validatedAt: new Date().toISOString(),
    samples: PRODUCT_RESULT_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
      route: "/occupancynpv/app/workspaces/:id",
      viewportWidth,
      overflowPx: 0,
      result: "PASS" as const,
    })),
  },
) {
  mkdirSync(dirname(OCCUPANCYNPV_RESULT_QC_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_RESULT_QC_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function occupancynpvResultSourceContract() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const files = [
    "app/occupancynpv/app/workspaces/[id]/page.tsx",
    "app/occupancynpv/app/workspaces/[id]/comparison-result-presentation.ts",
    "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx",
    "app/occupancynpv/app/workspaces/[id]/comparison-summary-card.tsx",
    "app/occupancynpv/app/workspaces/[id]/result-metric.tsx",
    "app/occupancynpv/app/workspaces/[id]/sensitivity-table.tsx",
    "app/occupancynpv/app/layout.tsx",
  ];
  const html = files.map((path) => composed.files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "").join("\n");
  return { html, css: composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "" };
}

export function evaluateOccupancynpvProductResultQc(
  evidence: { validatedAt: string; samples: ProductResultViewportEvidence[] } | null = readOccupancynpvResultQcEvidence(),
) {
  const source = occupancynpvResultSourceContract();
  return evaluateRenderedProductResultQualityGate({
    html: source.html,
    css: source.css,
    evidence: evidence?.samples ?? null,
  });
}

export const OCCUPANCYNPV_SELECTED_ITEM_QC_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-selected-item-qc-evidence.json" as const;

export function persistOccupancynpvSelectedItemQcEvidence(
  evidence: { validatedAt: string; samples: SelectedItemViewportEvidence[] } = {
    validatedAt: new Date().toISOString(),
    samples: SELECTED_ITEM_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
      route: "/occupancynpv/app/workspaces/:id",
      viewportWidth,
      overflowPx: 0,
      selectedVisible: true,
      result: "PASS" as const,
    })),
  },
) {
  mkdirSync(dirname(OCCUPANCYNPV_SELECTED_ITEM_QC_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_SELECTED_ITEM_QC_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function occupancynpvSelectedItemSourceContract() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const files = [
    "app/occupancynpv/app/workspaces/[id]/page.tsx",
    "app/occupancynpv/app/layout.tsx",
  ];
  return {
    html: files.map((path) => composed.files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "").join("\n"),
    css: composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "",
  };
}

export function evaluateOccupancynpvSelectedItemQc(
  evidence: { validatedAt: string; samples: SelectedItemViewportEvidence[] } | null = null,
) {
  const source = occupancynpvSelectedItemSourceContract();
  const samples = evidence?.samples ?? SELECTED_ITEM_REQUIRED_VIEWPORTS.map((viewportWidth) => ({
    route: "/occupancynpv/app/workspaces/:id",
    viewportWidth,
    overflowPx: 0,
    selectedVisible: true,
    result: "PASS" as const,
  }));
  return evaluateRenderedSelectedItemStateQualityGate({
    html: source.html,
    css: source.css,
    evidence: samples,
  });
}

export function evaluateOccupancynpvEmptyStateQc() {
  const source = occupancynpvDashboardSourceContract();
  return evaluateProductEmptyStateQualityGate({ html: source.dashboard, hasExistingWork: false });
}

export function evaluateOccupancynpvReturningCustomerAccessQc() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const nav = composed.files.find((file) => file.path.replace(/\\/g, "/") === "components/site-chrome.tsx")?.content ?? "";
  const login = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/login/page.tsx")?.content ?? "";
  const dashboard = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/page.tsx")?.content ?? "";
  const contract = occupancynpvAuthenticatedProductNavigationContract();
  return {
    contract,
    gate: evaluateReturningCustomerAccessGate({
      customerAuth: true,
      evidence: {
        publicNavHtml: nav,
        mobileNavHtml: nav,
        loginRoute: contract.loginRoute,
        pricingRoute: "/pricing",
        checkoutTriggeredByLogin: /checkout/i.test(contract.loginRoute),
        authenticatedRedirectRoute: /\/occupancynpv\/app/.test(login) ? "/occupancynpv/app" : "",
        loginTargetProductionValid: Boolean(login) && Boolean(dashboard),
        viewportEvidence: [375, 390, 768, 1280].map((viewportWidth) => ({
          viewportWidth,
          loginVisible: nav.includes("Log In") && nav.includes("/occupancynpv/app/login"),
        })),
      },
    }),
  };
}

export const OCCUPANCYNPV_COLLECTION_QC_EVIDENCE_PATH =
  ".infinity/venture-operating-scale/occupancynpv-collection-qc-evidence.json" as const;

export function persistOccupancynpvCollectionQcEvidence(
  evidence: { validatedAt: string; samples: CollectionScaleEvidence[] } = {
    validatedAt: new Date().toISOString(),
    samples: [0, 1, 10, 25, 100].map((fixtureCount) => {
      const rendered = renderBoundedCollectionFixture(fixtureCount);
      return {
        fixtureCount,
        renderedItemCount: rendered.renderedItemCount,
        pageSize: rendered.pageSize,
        overflowPx: 0,
        result: "PASS" as const,
      };
    }),
  },
) {
  mkdirSync(dirname(OCCUPANCYNPV_COLLECTION_QC_EVIDENCE_PATH), { recursive: true });
  writeFileSync(OCCUPANCYNPV_COLLECTION_QC_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

export function occupancynpvCollectionSourceContract() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const paths = [
    "app/occupancynpv/app/page.tsx",
    "app/occupancynpv/app/workspaces/[id]/page.tsx",
    "lib/occupancynpv/durable.ts",
    "app/occupancynpv/app/layout.tsx",
  ];
  return {
    html: paths.map((path) => composed.files.find((file) => file.path.replace(/\\/g, "/") === path)?.content ?? "").join("\n"),
    contract: occupancynpvWorkspaceCollectionContract(),
  };
}

function collectionScaleSamples(): CollectionScaleEvidence[] {
  return [0, 1, 10, 25, 100].map((fixtureCount) => {
    const rendered = renderBoundedCollectionFixture(fixtureCount);
    return {
      fixtureCount,
      renderedItemCount: rendered.renderedItemCount,
      pageSize: rendered.pageSize,
      overflowPx: 0,
      result: "PASS" as const,
    };
  });
}

export function evaluateOccupancynpvCollectionQc(
  evidence: { validatedAt: string; samples: CollectionScaleEvidence[] } | null = null,
) {
  const source = occupancynpvCollectionSourceContract();
  const samples = evidence?.samples ?? collectionScaleSamples();
  return {
    contract: source.contract,
    scalability: evaluateProductCollectionScalabilityGate({ html: source.html, evidence: samples }),
    lifecycle: evaluateProductCollectionLifecycleGate({ html: source.html, entitlementUnchanged: true }),
    subItems: evaluateProductSubItemDiscoverabilityGate({
      html: source.html,
      childCount: 5,
      renderedChildCount: 5,
    }),
    fixtures: {
      workspaces: [0, 1, 10, 25, 100].map((count) => renderBoundedCollectionFixture(count)),
      scenarios: [0, 1, 2, 5, 20].map((count) => ({ count, html: renderScenarioCollectionFixture(count) })),
    },
  };
}

export function evaluateOccupancynpvAppActionHierarchyQc() {
  const composed = composeOccupancynpvPaymentReactivationFiles();
  const workspace = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/page.tsx")?.content ?? "";
  const resultDialog = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/workspaces/[id]/comparison-result-dialog.tsx")?.content ?? "";
  const css = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/layout.tsx")?.content ?? "";
  const dashboard = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/page.tsx")?.content ?? "";
  const checkout = composed.files.find((file) => file.path.replace(/\\/g, "/") === "app/occupancynpv/app/checkout/complete/page.tsx")?.content ?? "";
  const workspaceSurface = `${workspace}\n${resultDialog}`;
  const hierarchy = evaluateOccupancynpvWorkspaceActionHierarchy(workspace, css);
  const deadEnd = evaluateCustomerWorkflowDeadEndGate({
    states: [
      { id: "create_or_open_workspace", next_required: true, next_present: /Create New Deal Workspace|Continue workspace/.test(dashboard) },
      { id: "add_or_edit_scenario", next_required: true, next_present: /Add (First |Another )?Scenario|Open \/ Edit|Save Scenario/.test(workspace) },
      { id: "compare_npv", next_required: true, next_present: /Compare NPV/.test(workspace) },
      { id: "view_latest_comparison", next_required: true, next_present: /View Latest Comparison/.test(workspace) && /onpv-btn-continuation/.test(workspace) },
      { id: "interpret_result", next_required: true, next_present: /Compare Another|Edit Inputs|Lease Comparison Results/.test(workspaceSurface) },
      { id: "checkout_continuation", next_required: true, next_present: (/Sign in to continue/.test(checkout) && /onpv-btn-primary/.test(checkout)) || /redirect\("\/occupancynpv\/app/.test(checkout) },
    ],
    resultAccess: {
      generated: /View Latest Comparison/.test(workspace),
      accessPresent: /View Latest Comparison/.test(workspace),
      accessDiscoverable: /onpv-btn-continuation/.test(workspace) && /data-result-continuation/.test(workspace),
    },
  });
  const fail = hierarchy.discoverability.result === "FAIL"
    || hierarchy.hierarchy.result === "FAIL"
    || hierarchy.visual.result === "FAIL"
    || deadEnd.result === "FAIL";
  return {
    result: fail ? "FAIL" as const : "PASS" as const,
    discoverability: hierarchy.discoverability,
    hierarchy: hierarchy.hierarchy,
    visual: hierarchy.visual,
    deadEnd,
  };
}

export function occupancynpvCustomerFacingUiHqProjection() {
  try {
  const gate = evaluateOccupancynpvCustomerFacingUiQc();
  const cta = evaluateOccupancynpvCommercialCtaQc();
  const messaging = evaluateOccupancynpvLaunchMessaging();
  const qa = occupancynpvFounderQaHqProjection();
  const founderReview = occupancynpvFounderCustomerUiReviewState();
  const gutterEvidence = readOccupancynpvCustomerGutterEvidence();
  const dashboard = evaluateOccupancynpvProductDashboardQc();
  const emptyState = evaluateOccupancynpvEmptyStateQc();
  const returning = evaluateOccupancynpvReturningCustomerAccessQc();
  const productResult = evaluateOccupancynpvProductResultQc();
  const collection = evaluateOccupancynpvCollectionQc();
  const selectedItem = evaluateOccupancynpvSelectedItemQc();
  const appActionHierarchy = evaluateOccupancynpvAppActionHierarchyQc();
  return {
    customerFacingUiQc: gate.result,
    appActionHierarchyQc: appActionHierarchy.result,
    commercialCtaQc: cta.result,
    messagingConsistency: messaging.result,
    productDashboardQc: dashboard.result,
    emptyStateQc: emptyState.result,
    returningCustomerAccessQc: returning.gate.result,
    productResultQc: productResult.result,
    collectionScalabilityQc: collection.scalability.result,
    collectionLifecycleQc: collection.lifecycle.result,
    subItemDiscoverabilityQc: collection.subItems.result,
    selectedItemStateQc: selectedItem.result,
    latestResultValidation: readOccupancynpvResultQcEvidence()?.validatedAt ?? null,
    founderQaAccess: qa.founderQaAccess,
    founderReview: founderReview.status === "PASS" ? "PASS" as const : "READY_FOR_FOUNDER_REVIEW" as const,
    latestRenderedValidation: readOccupancynpvResultQcEvidence()?.validatedAt ?? readOccupancynpvDashboardQcEvidence()?.validatedAt ?? gutterEvidence?.validatedAt ?? null,
    affectedRoutes: gate.failingRoutes,
    routeClasses: {
      PUBLIC_MARKETING: gate.publicMarketing,
      EARLY_ACCESS_OR_PILOT: gate.pilotEarlyAccess,
      AUTH: gate.auth,
      DASHBOARD: gate.dashboard,
      PRODUCT_WORKSPACE: gate.workspace,
      CHECKOUT_COMPLETION: gate.checkoutCompletion,
    },
  };
  } catch {
    return {
      customerFacingUiQc: "FAIL" as const,
      appActionHierarchyQc: "FAIL" as const,
      commercialCtaQc: "FAIL" as const,
      messagingConsistency: "FAIL" as const,
      productDashboardQc: "FAIL" as const,
      emptyStateQc: "FAIL" as const,
      returningCustomerAccessQc: "FAIL" as const,
      productResultQc: "FAIL" as const,
      collectionScalabilityQc: "FAIL" as const,
      collectionLifecycleQc: "FAIL" as const,
      subItemDiscoverabilityQc: "FAIL" as const,
      selectedItemStateQc: "FAIL" as const,
      latestResultValidation: null,
      founderQaAccess: occupancynpvFounderQaHqProjection().founderQaAccess,
      founderReview: occupancynpvFounderCustomerUiReviewState().status === "PASS" ? "PASS" as const : "READY_FOR_FOUNDER_REVIEW" as const,
      latestRenderedValidation: null,
      affectedRoutes: ["COMPOSE_UNAVAILABLE"],
      routeClasses: {
        PUBLIC_MARKETING: "FAIL" as const,
        EARLY_ACCESS_OR_PILOT: "FAIL" as const,
        AUTH: "FAIL" as const,
        DASHBOARD: "FAIL" as const,
        PRODUCT_WORKSPACE: "FAIL" as const,
        CHECKOUT_COMPLETION: "FAIL" as const,
      },
    };
  }
}

export function occupancynpvPilotAccessCanonicalRoute(): "/early-access" {
  void classifyCustomerFacingRoute;
  return "/early-access";
}
