import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyHqDependencyHealth,
  durableLocalPersistEnabled,
  evaluateHQDependencyIsolationGate,
  evaluateHQHydrationParityGate,
  evaluateHQInitialSnapshotConsistencyGate,
  evaluateHQLiveLogoutGate,
  evaluateHQProductionAuthRedirectGate,
  evaluateHQProductionErrorCorrelationGate,
  evaluateHQProductionGoldenPathGate,
  evaluateHQProductionServerErrorTruthGate,
  evaluateHQProductionServerRuntimeGate,
  evaluateHQRenderedRuntimeIntegrityGate,
  evaluateHQServerlessFilesystemSafetyGate,
  evaluateTreasuryDependencyIsolationGate,
  formatHydrationSafeTime,
  HQ_DASHBOARD_PREVIOUS_PRODUCTION_SERVER_ERROR,
  HQ_DASHBOARD_PRODUCTION_SERVER_ERROR,
  HQ_PRODUCTION_AUTH_CALLBACK,
  HQ_PRODUCTION_ORIGIN,
  isServerlessEphemeralFilesystem,
} from "../index";
import { evaluateLiveDeploymentParityGate } from "@/lib/infinity/organic-growth-engine/continuous/live-deployment-parity";
import { projectVentureSystemQcHqSummary, resetVentureQcHqProjection } from "@/lib/infinity/universal-venture-system-qc/hq";
import { FrozenBundleSnapshotMissingError } from "@/lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor";
import { writePersistedMissionActivity } from "@/lib/infinity/mission-activity/persist-disk";
import { writeOpportunityShortlists } from "@/lib/infinity/opportunity-universe-hq/persist";
import {
  classifyCreativeReuse,
  evaluateCreativeOveruseGate,
  evaluateCreativeSurfaceFitGate,
  evaluateCreativeUniquenessGate,
  evaluateDesignCoreCreativeQualityGate,
  registerCreativeAsset,
} from "@/lib/infinity/design-core/creative-asset-registry";
import { occupancynpvBlogCreativeInventory, occupancynpvCreativeGates } from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-creative";
import {
  classifyRenderedContrastRisk,
  evaluateBlogEditorialDesignGate,
  evaluateBlogHeroContrastGate,
  evaluateBlogRenderedVisualQualityGate,
  evaluateBlogTaxonomyChipGate,
  evaluateBlogTaxonomyContrastGate,
} from "@/lib/infinity/organic-growth-engine/continuous/blog-ux";
import {
  occupancynpvBlogArticleSource,
  occupancynpvBlogCategoryArchiveSource,
  occupancynpvBlogIndexSource,
  occupancynpvBlogTagArchiveSource,
} from "@/lib/infinity/organic-growth-engine/continuous/occupancynpv-blog";

const root = process.cwd();

function src(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("HQ production server runtime recovery", () => {
  it("identifies the current authenticated dashboard frozen-snapshot crash from Vercel logs", () => {
    expect(HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.browser_reference).toBe("1885360420");
    expect(HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.correlated_server_digest).toBe("1885360420");
    expect(HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.exception).toBe("FROZEN_BUNDLE_SNAPSHOT_MISSING");
    expect(HQ_DASHBOARD_PREVIOUS_PRODUCTION_SERVER_ERROR.exception).toBe("ENOENT");
    expect(evaluateHQProductionServerErrorTruthGate({
      evidenceSource: "vercel_runtime_logs",
      exception: "FROZEN_BUNDLE_SNAPSHOT_MISSING",
      route: "/dashboard",
      browserReference: "1885360420",
      correlatedDigest: "1885360420",
    }).result).toBe("PASS");
    expect(src("lib/infinity/venture-website-architecture/cre-occupancynpv-legal-surface-successor.ts")).toContain("FrozenBundleSnapshotMissingError");
    expect(src("lib/infinity/universal-venture-system-qc/hq.ts")).toContain("occupancynpv_compose");
    expect(src("lib/infinity/opportunity-universe-hq/persist.ts")).toContain("durableLocalPersistEnabled");
    expect(src("lib/infinity/hq-canonical-projection/load.ts")).toContain("opportunity_universe_unavailable");
    expect(src("components/dashboard/operator-console/infinity-hq-experience.tsx")).toContain("Promise.allSettled");
  });

  it("correlates browser error 1885360420 without storing secrets", () => {
    expect(evaluateHQProductionErrorCorrelationGate({
      retainsSafeFields: true,
      storesSecretsOrPii: false,
      currentBrowserErrorCorrelated: HQ_DASHBOARD_PRODUCTION_SERVER_ERROR.browser_reference === "1885360420",
    }).result).toBe("PASS");
    expect(src("instrumentation.ts")).toContain("onRequestError");
    expect(src("instrumentation.ts")).toContain("logHqProductionError");
    expect(src("lib/infinity/hq-production-deployment/error-correlation.ts")).toContain("HQ_PRODUCTION_ERROR_FORBIDDEN_FIELDS");
    expect(src("lib/infinity/hq-production-deployment/error-correlation.ts")).toContain("request_id");
  });

  it("guards remaining HQ render-path filesystem writers on Vercel", () => {
    expect(evaluateHQServerlessFilesystemSafetyGate().result).toBe("PASS");
    const previous = process.env.VERCEL;
    process.env.VERCEL = "1";
    expect(isServerlessEphemeralFilesystem()).toBe(true);
    expect(() => writePersistedMissionActivity([])).not.toThrow();
    if (previous == null) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
    expect(src("lib/infinity/mission-activity/persist-disk.ts")).toContain("durableLocalPersistEnabled");
    expect(src("lib/infinity/venture-operating-scale/post-launch-operating-runtime.ts")).toContain("durableLocalPersistEnabled");
    expect(src("lib/infinity/autonomous-operating-loop/persist.ts")).toContain("durableLocalPersistEnabled");
    expect(src("lib/infinity/financial-truth/cache.ts")).toContain("durableLocalPersistEnabled");
  });

  it("does not let OccupancyNPV compose crash HQ venture QC", () => {
    resetVentureQcHqProjection();
    expect(() => projectVentureSystemQcHqSummary("venture:unknown-compose-isolation")).not.toThrow();
    expect(new FrozenBundleSnapshotMissingError().error_class).toBe("FROZEN_BUNDLE_SNAPSHOT_MISSING");
    expect(src("lib/infinity/universal-venture-system-qc/hq.ts")).toContain("unavailableVentureSystemQcHqSummary");
    expect(src("lib/infinity/operator-console/enrich-snapshot.ts")).toContain("operations_room_unavailable");
    expect(src("lib/infinity/operator-console/attach-global-hq-floor.ts")).toContain("operations_room_unavailable");
    expect(evaluateHQDependencyIsolationGate({
      noncriticalFailures: [
        { name: "occupancynpv_compose", crashedDashboard: false },
        { name: "venture_system_qc", crashedDashboard: false },
      ],
    }).result).toBe("PASS");
  });

  it("treats compose PASS as not live PASS", () => {
    expect(evaluateLiveDeploymentParityGate({
      implemented: true,
      productionArtifactIncludesChanges: true,
      deploymentCompleted: false,
      canonicalDomainServesNewVersion: false,
      liveHtmlMatches: false,
      noStaleAlias: false,
      cdnNotStale: false,
    }).result).toBe("FAIL");
  });

  it("does not write local opportunity-universe state on Vercel", () => {
    const previous = process.env.VERCEL;
    process.env.VERCEL = "1";
    process.env.INFINITY_OPPORTUNITY_UNIVERSE_PERSIST = "1";
    expect(isServerlessEphemeralFilesystem()).toBe(true);
    expect(durableLocalPersistEnabled()).toBe(false);
    expect(() => writeOpportunityShortlists([])).not.toThrow();
    if (previous == null) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
    delete process.env.INFINITY_OPPORTUNITY_UNIVERSE_PERSIST;
  });

  it("isolates noncritical dependency failure", () => {
    expect(classifyHqDependencyHealth({ name: "treasury", available: false, threw: true }).crashesDashboard).toBe(false);
    expect(classifyHqDependencyHealth({ name: "auth_session", available: false, threw: true }).crashesDashboard).toBe(true);
    expect(evaluateHQDependencyIsolationGate({
      noncriticalFailures: [{ name: "opportunity_universe", crashedDashboard: false }],
    }).result).toBe("PASS");
    expect(evaluateHQDependencyIsolationGate({
      noncriticalFailures: [{ name: "opportunity_universe", crashedDashboard: true }],
    }).result).toBe("FAIL");
    expect(evaluateTreasuryDependencyIsolationGate({
      dashboardCrashed: false,
      inventedCash: false,
      cashDisplayed: "UNKNOWN",
      mercuryVerified: false,
    }).result).toBe("PASS");
    expect(evaluateTreasuryDependencyIsolationGate({
      dashboardCrashed: true,
      inventedCash: false,
      cashDisplayed: "UNKNOWN",
      mercuryVerified: false,
    }).result).toBe("FAIL");
    expect(evaluateTreasuryDependencyIsolationGate({
      dashboardCrashed: false,
      inventedCash: false,
      cashDisplayed: "$128.40",
      mercuryVerified: false,
    }).result).toBe("FAIL");
  });

  it("requires dashboard render for golden path and runtime gates", () => {
    expect(evaluateHQProductionServerRuntimeGate({
      dashboardHttpOk: false,
      serverRenderCompleted: false,
      vercelException: true,
      criticalHealthy: true,
      noncriticalDegrades: true,
      errorBoundaryTriggered: true,
    }).result).toBe("FAIL");
    expect(evaluateHQProductionGoldenPathGate({
      login: true,
      authorization: true,
      dashboardRender: false,
      serverRuntimeClean: false,
      runtimeState: false,
      todaysReport: false,
      privateApis: false,
      secureCookie: true,
      logout: false,
      loggedOutDenied: false,
      noPrivateLeak: true,
    }).result).toBe("FAIL");
    expect(evaluateHQProductionAuthRedirectGate({
      hqOriginAllowed: true,
      callbackAllowed: HQ_PRODUCTION_AUTH_CALLBACK.startsWith(HQ_PRODUCTION_ORIGIN),
    }).result).toBe("PASS");
    expect(evaluateHQLiveLogoutGate({
      logoutSucceeded: true,
      cookieInvalidated: true,
      dashboardDenied: true,
      dailyReportsDenied: true,
      privateApisDenied: true,
    }).result).toBe("PASS");
    expect(evaluateHQProductionGoldenPathGate({
      login: true,
      authorization: true,
      dashboardRender: null,
      serverRuntimeClean: true,
      runtimeState: null,
      todaysReport: null,
      privateApis: null,
      secureCookie: null,
      logout: null,
      loggedOutDenied: null,
      noPrivateLeak: true,
    }).result).toBe("NOT_PROVEN");
  });
});

describe("HQ hydration parity", () => {
  it("formats a stable America/New_York timestamp", () => {
    expect(formatHydrationSafeTime("2026-09-17T09:20:46Z")).toBe("5:20:46 AM");
    expect(evaluateHQHydrationParityGate({
      ssrText: formatHydrationSafeTime("2026-09-17T09:20:46Z"),
      clientInitialText: formatHydrationSafeTime("2026-09-17T09:20:46Z"),
      usesRenderClock: false,
      usesRandomInitial: false,
      machineLocale: false,
      machineTimezone: false,
      windowBranchChangesMarkup: false,
      hydrationWarning: false,
    }).result).toBe("PASS");
    expect(src("components/dashboard/operator-console/current-activity-bar.tsx")).toContain("formatHydrationSafeTime");
    expect(src("components/dashboard/operator-console/current-activity-bar.tsx")).not.toContain("toLocaleTimeString");
    expect(src("components/dashboard/operator-console/current-activity-bar.tsx")).not.toContain("suppressHydrationWarning");
    expect(evaluateHQInitialSnapshotConsistencyGate({
      serverSnapshot: "A",
      clientInitialSnapshot: "A",
      pollingAfterHydration: true,
    }).result).toBe("PASS");
    expect(evaluateHQRenderedRuntimeIntegrityGate({
      serverRenderErrors: 0,
      hydrationErrors: 0,
      recoverableReactErrors: 0,
      uncaughtRuntimeErrors: 0,
      infinityConsoleErrors: 0,
    }).result).toBe("PASS");
  });
});

describe("Blog visual and unique creative QC", () => {
  it("requires contrast-safe taxonomy pills on the photo hero", () => {
    const article = occupancynpvBlogArticleSource();
    const index = occupancynpvBlogIndexSource();
    expect(article).toContain("data-blog-taxonomy-chip");
    expect(article).toContain('data-blog-taxonomy-surface="hero"');
    expect(article).toContain("[ VALUATION ]");
    expect(article).toContain("[ Interest Rates ]");
    expect(evaluateBlogHeroContrastGate(article).result).toBe("PASS");
    expect(evaluateBlogTaxonomyChipGate(article).result).toBe("PASS");
    expect(evaluateBlogTaxonomyContrastGate(article).result).toBe("NOT_PROVEN");
    expect(evaluateBlogTaxonomyContrastGate(article, {
      rest_rendered: true,
      hover_rendered: true,
      focus_rendered: true,
      computed_contrast_checked: true,
      screenshot_captured: true,
    }).result).toBe("PASS");
    expect(evaluateBlogEditorialDesignGate(index).result).toBe("PASS");
    expect(evaluateBlogEditorialDesignGate(article).reasons).not.toContain("TAXONOMY_PRESENTATION_FAIL");
    expect(evaluateBlogEditorialDesignGate(article).reasons).not.toContain("HERO_READABILITY_FAIL");
    expect(evaluateBlogEditorialDesignGate(article).reasons).not.toContain("plain taxonomy links");
    expect(classifyRenderedContrastRisk("photo")).toBe("HIGH");
    expect(evaluateBlogRenderedVisualQualityGate({
      surfaces: ["/blog/", "/blog/valuation/how-interest-rates-affect-commercial-property-values/", "/blog/category/valuation/", "/blog/tag/interest-rates/"],
      widths: [1440, 1280, 1024, 768, 390],
    }).result).toBe("NOT_PROVEN");
  });

  it("gives category and topic archives unique creative", () => {
    expect(occupancynpvBlogCategoryArchiveSource()).toContain("/media/blog/valuation-category.svg");
    expect(occupancynpvBlogTagArchiveSource("Interest Rates")).toContain("/media/blog/interest-rates.svg");
    expect(occupancynpvBlogTagArchiveSource("Cap Rates")).toContain("/media/blog/cap-rates.svg");
    expect(occupancynpvBlogTagArchiveSource("Commercial Real Estate")).toContain("/media/blog/commercial-real-estate.svg");
    const gates = occupancynpvCreativeGates();
    expect(gates.sameEntity).toBe("SAME_ENTITY_VARIANT");
    expect(gates.uniqueness.result).toBe("PASS");
    expect(gates.overuse.result).toBe("PASS");
    expect(gates.surface.result).toBe("PASS");
    expect(gates.quality.result).toBe("PASS");
    const duplicate = registerCreativeAsset({
      asset_id: "dup",
      venture_id: "occupancynpv",
      content_asset_id: "other",
      entity_type: "article",
      entity_id: "other-article",
      creative_role: "HERO",
      source: "/media/hero-building.webp",
      design_core_job_id: null,
      semantic_topic: "leases",
      brand_profile: "occupancynpv",
      created_at: "2026-09-17T12:00:00.000Z",
      status: "ACTIVE",
    });
    expect(classifyCreativeReuse({
      left: occupancynpvBlogCreativeInventory()[0]!,
      right: duplicate,
    })).toBe("DUPLICATE");
    expect(evaluateCreativeUniquenessGate([...occupancynpvBlogCreativeInventory(), duplicate]).result).toBe("FAIL");
    expect(evaluateCreativeOveruseGate([
      ...occupancynpvBlogCreativeInventory().filter((row) => row.source === "/media/hero-building.webp"),
      duplicate,
      { ...duplicate, asset_id: "dup-2", entity_id: "third" },
    ]).result).toBe("FAIL");
    expect(evaluateCreativeSurfaceFitGate({ role: "SOCIAL", aspectRatio: "16:9", source: "/x" }).result).toBe("FAIL");
    expect(evaluateDesignCoreCreativeQualityGate({
      unique: false,
      relevant: true,
      brandFit: true,
      genericFiller: true,
      textArtifacts: false,
      surfaceFit: true,
    }).result).toBe("FAIL");
  });
});
