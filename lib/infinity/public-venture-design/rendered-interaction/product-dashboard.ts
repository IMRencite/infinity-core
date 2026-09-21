export const RENDERED_PRODUCT_DASHBOARD_QUALITY_GATE = "RenderedProductDashboardQualityGate" as const;
export const PRODUCT_EMPTY_STATE_QUALITY_GATE = "ProductEmptyStateQualityGate" as const;
export const PRODUCT_DASHBOARD_ROUTE_CLASS = "PRODUCT_DASHBOARD" as const;
export const PRODUCT_DASHBOARD_EVIDENCE_MARK = "data-product-dashboard" as const;

export const PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS = [375, 390, 768, 1280] as const;

export type ProductDashboardState = "empty" | "populated" | "source";

export type ProductDashboardViewportEvidence = {
  route: string;
  state: ProductDashboardState | string;
  viewportWidth: number;
  overflowPx?: number;
  result?: "PASS" | "FAIL";
  fixtureCount?: number;
  renderedItemCount?: number;
  pageSize?: number;
};

export type RenderedProductDashboardQualityGateResult = {
  gate: typeof RENDERED_PRODUCT_DASHBOARD_QUALITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  primaryPurposeVisible: boolean;
  primaryNextActionVisible: boolean;
  accountAccessPresent: boolean;
  productContextPresent: boolean;
  existingWorkDiscoverable: boolean;
  emptyStateUseful: boolean;
  supportDiscoverable: boolean;
  actionHierarchyValid: boolean;
  rawBrowserControls: boolean;
  contentUtilizationAdequate: boolean;
  renderedEvidencePresent: boolean;
};

export type ProductEmptyStateQualityGateResult = {
  gate: typeof PRODUCT_EMPTY_STATE_QUALITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
  areaExplained: boolean;
  actionPresent: boolean;
  guidancePresent: boolean;
};

const PURPOSE = /Lease Comparison Workspace|authenticated operating home|What can I do here|OccupancyNPV|Review-request locations/i;
const PRIMARY_ACTION = /Create New Deal Workspace|Continue Analysis|Start Project|View Report|data-primary-action|Add a location/i;
const ACCESS = /data-access-summary|Professional Access|Per-Deal Access|Internal QA Access/i;
const PRODUCT_CONTEXT = /cash flow|NPV|occupancy costs|sensitivity analysis|lease comparison|review-request kit|Google review link|data-product-context/i;
const WORK_DISCOVERY = /data-workspace-card|data-workspace-list|Continue workspace|View workspace|data-location-card|Open location/i;
const EMPTY = /data-empty-state|Create a workspace|Add lease scenarios|Getting started|Add a Google Place ID|generate your first/i;
const SUPPORT = /infinitemediaresources@gmail\.com|data-support|Help and support/i;
const BRANDED_CONTROL = /vg-cta|onpv-btn-primary|onpv-btn-secondary|onpv-btn-tertiary|onpv-tab|onpv-link|askreview-btn/;
const SECTION_MARKERS = [
  PURPOSE,
  PRIMARY_ACTION,
  ACCESS,
  PRODUCT_CONTEXT,
  SUPPORT,
];

function decode(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function submitButtons(html: string): Array<{ attrs: string; label: string }> {
  return [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map((match) => ({
    attrs: match[1] ?? "",
    label: decode(match[2] ?? ""),
  }));
}

export function evaluateProductEmptyStateQualityGate(input: {
  html: string;
  hasExistingWork?: boolean;
}): ProductEmptyStateQualityGateResult {
  if (input.hasExistingWork) {
    return {
      gate: PRODUCT_EMPTY_STATE_QUALITY_GATE,
      result: "PASS",
      reasons: [],
      areaExplained: true,
      actionPresent: true,
      guidancePresent: true,
    };
  }
  const html = input.html;
  const text = decode(html);
  const areaExplained = /OccupancyNPV|lease comparison|what you can do|data-empty-state|Review-request locations/i.test(html);
  const actionPresent = PRIMARY_ACTION.test(html);
  const guidancePresent = /Create a workspace|Add lease scenarios|Enter economic terms|Review NPV|Add a location|Generate your first kit|Add a Google Place ID/i.test(html);
  const loneButton = actionPresent && text.length < 180 && !guidancePresent;
  const reasons: string[] = [];
  if (!areaExplained) reasons.push("EMPTY_STATE_AREA_UNEXPLAINED");
  if (!actionPresent) reasons.push("EMPTY_STATE_ACTION_MISSING");
  if (!guidancePresent) reasons.push("EMPTY_STATE_GUIDANCE_MISSING");
  if (loneButton) reasons.push("EMPTY_WHITE_AREA_LONE_BUTTON");
  return {
    gate: PRODUCT_EMPTY_STATE_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    areaExplained,
    actionPresent,
    guidancePresent,
  };
}

export function evaluateRenderedProductDashboardQualityGate(input: {
  html: string;
  css?: string;
  route?: string;
  state?: ProductDashboardState;
  evidence?: ProductDashboardViewportEvidence[] | null;
}): RenderedProductDashboardQualityGateResult {
  const html = input.html;
  const css = input.css ?? "";
  const text = decode(html);
  const reasons: string[] = [];
  const primaryPurposeVisible = PURPOSE.test(html) && /data-product-dashboard|Lease Comparison Workspace/i.test(html);
  const primaryNextActionVisible = PRIMARY_ACTION.test(html);
  const accountAccessPresent = ACCESS.test(html);
  const productContextPresent = PRODUCT_CONTEXT.test(html);
  const existingWorkDiscoverable = WORK_DISCOVERY.test(html);
  const empty = evaluateProductEmptyStateQualityGate({
    html,
    hasExistingWork: input.state === "populated" || (input.state === "source" && existingWorkDiscoverable),
  });
  const emptyStateUseful = input.state === "populated" ? true : empty.result === "PASS";
  const supportDiscoverable = SUPPORT.test(html);
  const primaryCount = [...html.matchAll(/data-primary-action|Create New Deal Workspace/gi)].length;
  const actionHierarchyValid = primaryNextActionVisible && primaryCount >= 1 && primaryCount <= 4;
  const rawBrowserControls = submitButtons(html).some((button) => {
    if (/Sign out/i.test(button.label) && /onpv-link|onpv-btn-tertiary/.test(button.attrs)) return false;
    const classes = button.attrs.match(/class(Name)?=["']([^"']+)["']/)?.[2] ?? "";
    return !BRANDED_CONTROL.test(`${button.attrs} ${classes}`);
  });
  const sectionHits = SECTION_MARKERS.filter((rule) => rule.test(html)).length;
  const contentUtilizationAdequate = sectionHits >= 4 && text.length >= 200;
  const required = PRODUCT_DASHBOARD_REQUIRED_VIEWPORTS;
  const samples = input.evidence ?? [];
  const renderedEvidencePresent = required.every((width) =>
    samples.some((sample) => sample.viewportWidth === width && sample.route.includes("/app") && sample.overflowPx !== undefined && (sample.result ?? "PASS") === "PASS"),
  );

  if (!primaryPurposeVisible) reasons.push("PRIMARY_PURPOSE_MISSING");
  if (!primaryNextActionVisible) reasons.push("PRIMARY_NEXT_ACTION_MISSING");
  if (!accountAccessPresent) reasons.push("ACCOUNT_ACCESS_CONTEXT_MISSING");
  if (!productContextPresent) reasons.push("PRODUCT_CONTEXT_MISSING");
  if (input.state !== "empty" && !existingWorkDiscoverable) reasons.push("EXISTING_WORK_NOT_DISCOVERABLE");
  if (!emptyStateUseful) reasons.push(...empty.reasons);
  if (!supportDiscoverable) reasons.push("SUPPORT_NOT_DISCOVERABLE");
  if (!actionHierarchyValid) reasons.push("ACTION_HIERARCHY_INVALID");
  if (rawBrowserControls) reasons.push("RAW_BROWSER_CONTROLS");
  if (!contentUtilizationAdequate) reasons.push("EXTREME_UNDER_UTILIZATION");
  if (!renderedEvidencePresent) reasons.push("MISSING_RENDERED_EVIDENCE");
  const collectionDashboard = /data-collection=|data-workspace-list/i.test(html);
  if (collectionDashboard) {
    if (!/data-collection-bounded|data-collection-page-size|data-pagination/i.test(html)) reasons.push("UNBOUNDED_COLLECTION_RENDER");
    if (!/Active/.test(html) || !/Archived/.test(html)) reasons.push("COLLECTION_ORGANIZATION_MISSING");
    const heavyUse = [25, 100].every((count) =>
      samples.some((sample) => sample.fixtureCount === count && (sample.renderedItemCount ?? 0) <= (sample.pageSize ?? 10) && (sample.result ?? "PASS") === "PASS"),
    );
    if (!heavyUse) reasons.push("HEAVY_USE_FIXTURE_MISSING");
  }
  if (!/onpv-dash|onpv-page--dash|data-product-dashboard/.test(html) && !/min-height:\s*2\.75rem/.test(css)) {
    reasons.push("DASHBOARD_SHELL_MISSING");
  }

  return {
    gate: RENDERED_PRODUCT_DASHBOARD_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: [...new Set(reasons)],
    primaryPurposeVisible,
    primaryNextActionVisible,
    accountAccessPresent,
    productContextPresent,
    existingWorkDiscoverable,
    emptyStateUseful,
    supportDiscoverable,
    actionHierarchyValid,
    rawBrowserControls,
    contentUtilizationAdequate,
    renderedEvidencePresent,
  };
}

export function classifyProductDashboardRoute(route: string): boolean {
  const path = (route.split("?")[0] || "/").replace(/\/$/, "") || "/";
  return /\/(app|dashboard|account|portal)$/i.test(path);
}
