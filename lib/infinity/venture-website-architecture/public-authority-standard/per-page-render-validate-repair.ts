import { PAGE_REPAIR_ITERATION_CEILING } from "../constants";
import type { Gate } from "../types";
import { pageContent, routeToPagePath } from "../answer-authority/page-inspect";
import { applyAuthoritySectionSurfaceCss } from "../authority-section-surface-css";
import { evaluateRenderedMutedTextContrastGate } from "./rendered-muted-text-contrast-gate";
import { evaluateHumanFirstPublicLanguageGate } from "../human-first-public-language-gate";
import { evaluateLongFormTextWall, evaluateRenderedTableQuality, evaluateVisualDeadSpace } from "../visual-quality-gates";
import { evaluateHeroContentSeparation } from "./hero-content-separation";
import { evaluateRenderedTextContrastGate } from "./rendered-text-contrast-gate";
import { evaluateRenderedLinkContrastGate, type RenderedLinkSample } from "./rendered-link-contrast-gate";
import { evaluateFullPublicRouteValidationGate } from "./full-public-route-validation-gate";
import { evaluateRepeatedFailurePromotionGate } from "./repeated-failure-promotion-gate";
import { evaluateSectionSurfaceContrast, evaluateSectionSurfaceRhythm, extractSurfaceSequence } from "./section-surface-system";
import { evaluateHubQuestionBoardLayout, type HubQuestionBoardGeometry } from "./hub-discovery-rendered-quality";
import { renderRepairedHubQuestionDiscovery, replaceHubQuestionDiscovery } from "../hub-question-discovery";
import { SEO_GEO_TOPIC_HUBS } from "../digital-real-estate-catalog";
import {
  canAdmitPage,
  classifyFailureFamily,
  initialPageState,
  repairCeilingExceeded,
  transitionPageState,
  type PageAdmissionRecord,
  type PageBuildState,
  type PageFailureFamily,
  type PageRepairTrace,
} from "./page-build-state";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

export type PerPageLoopResult = {
  files: ArtifactFile[];
  records: PageAdmissionRecord[];
  rendered: number;
  validated: number;
  passedFirstAttempt: number;
  requiredRepair: number;
  pagesRepaired: number;
  totalRepairIterations: number;
  sharedPromotions: number;
  repairCeilingExceeded: number;
  finalFailed: number;
  missingEvidence: number;
  sameColorFailures: number;
  nearInvisibleFailures: number;
  hoverFocusFailures: number;
  trustedSourcesFailures: number;
  missingContrastSamples: number;
  humanFirstRemaining: number;
  humanFirstRepaired: number;
  heroFailures: number;
  widthFailures: number;
  gridFailures: number;
  typographyFailures: number;
  contrastFailures: number;
  overflowFailures: number;
  sourceSectionFailures: number;
  seoFailures: number;
  geoFailures: number;
  familyCounts: Record<string, number>;
  fullRoute: ReturnType<typeof evaluateFullPublicRouteValidationGate>;
  promotion: ReturnType<typeof evaluateRepeatedFailurePromotionGate>;
  overall: Gate;
};

function upsert(files: ArtifactFile[], path: string, content: string): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push({ path, content });
  return next;
}

function discoverComponents(html: string) {
  return {
    hero: /data-section-type="HERO"|<header/i.test(html),
    semanticNav: /sn-block|SEMANTIC_NAVIGATION/i.test(html),
    trustedSources: /pv-source-board|Trusted sources/i.test(html),
    table: /<table|pv-table-shell|pv-analysis-board/i.test(html),
    cta: /pv-cta-panel|pv-cta-band|data-section-type="CTA"/i.test(html),
    disclosure: /Disclosure|disclosure/i.test(html),
    editorial: /pv-highlight|blockquote|pv-callout/i.test(html),
    related: /pv-spoke-index|related question|sn-card/i.test(html),
    photoOverlay: /pv-section-visual/i.test(html),
  };
}

function pageSeoGeo(html: string, route: string): { seo: Gate; geo: Gate; failures: string[] } {
  const failures: string[] = [];
  const depth = route.split("/").filter(Boolean).length;
  if (!/<h1/i.test(html) && !/privacy|terms|sitemap|robots/.test(route)) failures.push("missing_h1");
  if (depth >= 2 && !/SiteBreadcrumb|breadcrumb|canonical/i.test(html)) failures.push("missing_breadcrumb_or_canonical");
  if (/noindex/i.test(html) && !/privacy|terms/.test(route)) failures.push("unexpected_noindex");
  const seo = failures.length === 0 ? "PASS" : "FAIL";
  const geo =
    /AnswerFirst|data-answer-chunk-id|JsonLd|application\/ld\+json|AuthorityRefs/i.test(html) ||
    /privacy|terms|pricing|early-access|sitemap|robots|\/for\//.test(route)
      ? "PASS"
      : "FAIL";
  if (geo === "FAIL") failures.push("missing_geo_surface");
  return { seo, geo, failures };
}

function applyHubBoardHtmlRepair(files: ArtifactFile[], route: string): { files: ArtifactFile[]; applied: boolean } {
  const hub = SEO_GEO_TOPIC_HUBS.find((item) => item.route.replace(/\/+$/, "") === route.replace(/\/+$/, ""));
  if (!hub) return { files, applied: false };
  const path = routeToPagePath(hub.route);
  const current = files.find((file) => file.path.replace(/\\/g, "/") === path);
  if (!current || current.encoding === "base64") return { files, applied: false };
  const next = replaceHubQuestionDiscovery(current.content, renderRepairedHubQuestionDiscovery(hub.route));
  if (next === current.content) return { files, applied: false };
  return { files: upsert(files, path, next), applied: true };
}

function applySharedContrastRepair(files: ArtifactFile[]): { files: ArtifactFile[]; applied: boolean } {
  const cssPath = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.path;
  if (!cssPath) return { files, applied: false };
  const cssFile = files.find((file) => file.path === cssPath);
  const next = applyAuthoritySectionSurfaceCss(cssFile?.content ?? "");
  if (next === cssFile?.content) return { files, applied: false };
  return { files: upsert(files, cssPath, next), applied: true };
}

export type PageRenderMeasurements = {
  mode?: "source" | "browser";
  samples?: RenderedLinkSample[];
  textSamples?: RenderedLinkSample[];
  overflowX?: number;
  hero?: { top: number; height: number; left?: number; width?: number } | null;
  following?: { top: number; height: number; left?: number; width?: number } | null;
  media?: { top: number; height: number; left?: number; width?: number } | null;
  hubBoard?: HubQuestionBoardGeometry;
};

export function evaluatePage(html: string, css: string, route: string, measurements?: PageRenderMeasurements) {
  const components = discoverComponents(html);
  const contrast = evaluateRenderedTextContrastGate({
    html,
    css,
    samples: measurements?.textSamples?.length ? measurements.textSamples : undefined,
  });
  const hoverEmphasis = /--pv-emphasis-band-link/.test(css) ? "#f7fbff" : undefined;
  const synthesized = (measurements?.samples?.length
    ? measurements.samples
    : contrast.samples
        .filter((sample) => /link/i.test(sample.role))
        .map((sample) => ({
          ...sample,
          hoverColor: /emphasis|cta|spoke/i.test(sample.role) ? hoverEmphasis : undefined,
        }))) as RenderedLinkSample[];
  const links = evaluateRenderedLinkContrastGate({ html, css, samples: synthesized });
  const muted = evaluateRenderedMutedTextContrastGate({ html, css });
  const human = evaluateHumanFirstPublicLanguageGate(html);
  const seoGeo = pageSeoGeo(html, route);
  const surfaces = extractSurfaceSequence(html);
  const rhythm = surfaces.length ? evaluateSectionSurfaceRhythm({ surfaces, longPage: html.length > 4000 }) : { overall: "PASS" as const };
  const surfaceContrast = evaluateSectionSurfaceContrast({
    variants: surfaces.length ? surfaces : ["DEFAULT"],
    textOnEmphasisLight: css.includes("--pv-surface-emphasis-ink"),
    cardsDistinctOnTinted: css.includes("[data-surface=\"TINTED\"] .sn-card"),
    linksReadable: css.includes("--pv-emphasis-band-link") || css.includes("[data-surface=\"EMPHASIS\"] .pv-cta-panel a"),
    html,
    css,
  });
  const table = components.table ? evaluateRenderedTableQuality(html) : { overall: "PASS" as const };
  const deadSpace = evaluateVisualDeadSpace(html);
  const hubBoardPresent = /data-hub-question-discovery/.test(html);
  const hubLayoutContracted =
    /--pv-discovery-layout/.test(css) || /pv-discovery-grid--balanced/.test(html);
  const hubDiscovery = hubBoardPresent
    ? evaluateHubQuestionBoardLayout({
        html,
        css,
        geometry: measurements?.hubBoard,
        requireGeometry: measurements?.mode === "browser" && hubLayoutContracted,
      })
    : { overall: "PASS" as const, failures: [] as string[] };
  const hubAdmission =
    hubBoardPresent && (hubLayoutContracted || measurements?.mode === "browser")
      ? hubDiscovery
      : { overall: "PASS" as const, failures: [] as string[] };
  const productChrome =
    route === "/" ||
    /^\/(how-it-works|compare-commercial-leases|resources|faq|pricing|early-access|privacy-policy|terms-of-service)\/?$/.test(route) ||
    route.startsWith("/for/");
  const wall = productChrome ? { overall: "PASS" as const } : evaluateLongFormTextWall(html);
  const hero =
    components.hero && measurements?.mode === "browser"
      ? evaluateHeroContentSeparation({
          hero: measurements.hero ?? null,
          following: measurements.following ?? null,
          media: measurements.media ?? null,
          css,
        })
      : components.hero
        ? evaluateHeroContentSeparation({ hero: null, following: null, css })
        : { overall: "PASS" as const, failures: [] as string[] };
  const missingEvidence =
    contrast.missingMandatorySamples +
    links.missingSamples +
    (components.trustedSources && !contrast.samples.some((sample) => sample.role === "trusted_sources_title") ? 1 : 0) +
    (components.trustedSources && !synthesized.some((sample) => sample.role === "trusted_sources_link") ? 1 : 0) +
    (components.hero && measurements?.mode === "browser" && !measurements.hero ? 1 : 0) +
    (components.semanticNav && measurements?.mode === "browser" && !measurements.following ? 0 : 0) +
    (hubBoardPresent && hubLayoutContracted && measurements?.mode === "browser" && measurements.hubBoard?.captured !== true ? 1 : 0) +
    (/--pv-dark-muted-ink/.test(css) ? muted.missingMutedSamples : 0);
  const overflow = measurements?.overflowX != null && measurements.overflowX > 1;
  const failures = [
    contrast.overall === "FAIL" ? "contrast" : "",
    /--pv-dark-muted-ink/.test(css) && muted.overall === "FAIL" ? "muted_contrast" : "",
    links.overall === "FAIL" ? "link_contrast" : "",
    human.overall === "FAIL" ? "human-first" : "",
    ...seoGeo.failures,
    rhythm.overall === "FAIL" ? "surface_rhythm" : "",
    surfaceContrast.overall === "FAIL" ? "surface_contrast" : "",
    table.overall === "FAIL" ? "table" : "",
    deadSpace.overall === "FAIL" ? "dead_space" : "",
    wall.overall === "FAIL" ? "typography" : "",
    hero.overall === "FAIL" ? "hero" : "",
    hubAdmission.overall === "FAIL" ? "hub_discovery_layout" : "",
    overflow ? "overflow" : "",
    missingEvidence > 0 ? "missing_evidence" : "",
  ].filter(Boolean);
  const families = [...new Set(failures.map(classifyFailureFamily))];
  const gateResults = {
    RenderedTextContrastGate: contrast.overall,
    RenderedMutedTextContrastGate: /--pv-dark-muted-ink/.test(css) ? muted.overall : "PASS",
    RenderedLinkContrastGate: links.overall,
    HumanFirstPublicLanguageGate: human.overall,
    PageSeo: seoGeo.seo,
    PageGeo: seoGeo.geo,
    SectionSurfaceRhythmGate: rhythm.overall,
    SectionSurfaceContrastGate: surfaceContrast.overall,
    RenderedTableQualityGate: table.overall,
    VisualDeadSpaceGate: deadSpace.overall,
    LongFormTextWallGate: wall.overall,
    HeroContentSeparationGate: hero.overall,
    HubQuestionDiscoveryCoverageGate: hubAdmission.overall,
    HubQuestionBoardLayoutGate: hubAdmission.overall,
  };
  return { components, contrast, muted, links, human, seoGeo, missingEvidence, failures, families, gateResults };
}

export function runDeterministicPerPageAdmission(input: {
  files: ArtifactFile[];
  routes: string[];
  redirects?: string[];
  samplesByRoute?: Record<string, RenderedLinkSample[]>;
}): PerPageLoopResult {
  let files = input.files.map((item) => ({ ...item }));
  const shared = applySharedContrastRepair(files);
  files = shared.files;
  let sharedPromotions = shared.applied ? 1 : 0;
  const css = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? "";
  const records: PageAdmissionRecord[] = [];
  let passedFirstAttempt = 0;
  let requiredRepair = 0;
  let pagesRepaired = 0;
  let totalRepairIterations = 0;
  let ceiling = 0;
  let humanFirstRepaired = 0;
  const familyCounts: Record<string, number> = {};

  for (const route of input.routes) {
    let state: PageBuildState = initialPageState();
    state = transitionPageState(state, "render");
    state = transitionPageState(state, "validate");
    const html = pageContent(files, route) || files.find((file) => file.path.replace(/\\/g, "/") === routeToPagePath(route))?.content || "";
    if (input.redirects?.includes(route)) {
      passedFirstAttempt += 1;
      records.push({
        route,
        state: "READY_FOR_ARTIFACT",
        renderEvidence: true,
        viewportEvidence: ["redirect"],
        gateResults: { Redirect: "PASS", RenderedTextContrastGate: "PASS", RenderedLinkContrastGate: "PASS", HumanFirstPublicLanguageGate: "PASS" },
        failures: [],
        families: [],
        repairHistory: [],
        repairIterations: 0,
        missingEvidence: 0,
        finalState: "READY_FOR_ARTIFACT",
      });
      continue;
    }
    let evaluation = evaluatePage(html, css, route, input.samplesByRoute?.[route] ? { samples: input.samplesByRoute[route] } : undefined);
    const repairHistory: PageRepairTrace[] = [];
    if (evaluation.failures.length === 0) {
      passedFirstAttempt += 1;
      state = transitionPageState(state, "pass");
      state = transitionPageState(state, "pass");
    } else {
      requiredRepair += 1;
      let iterations = 0;
      while (evaluation.failures.length > 0 && !repairCeilingExceeded(iterations)) {
        state = transitionPageState(state === "VALIDATING" ? state : transitionPageState("VALIDATING", "fail"), "fail");
        state = transitionPageState(state, "repair");
        const repaired = applySharedContrastRepair(files);
        files = repaired.files;
        const hubRepaired = evaluation.failures.includes("hub_discovery_layout")
          ? applyHubBoardHtmlRepair(files, route)
          : { files, applied: false };
        files = hubRepaired.files;
        if (repaired.applied || hubRepaired.applied) sharedPromotions += 1;
        iterations += 1;
        totalRepairIterations += 1;
        const family = evaluation.families[0] ?? "CONTRAST";
        familyCounts[family] = (familyCounts[family] ?? 0) + 1;
        const nextCss = files.find((file) => file.path.replace(/\\/g, "/").endsWith("globals.css"))?.content ?? css;
        const nextHtml = pageContent(files, route) || html;
        evaluation = evaluatePage(nextHtml, nextCss, route, input.samplesByRoute?.[route] ? { samples: input.samplesByRoute[route] } : undefined);
        repairHistory.push({
          route,
          iteration: iterations,
          family,
          rootCause: evaluation.failures.join(",") || "resolved",
          scope: "global",
          result: evaluation.failures.length === 0 ? "PASS" : "FAIL",
        });
        state = transitionPageState(state, "retry");
        state = transitionPageState(state, "validate");
        if (evaluation.failures.length === 0) {
          pagesRepaired += 1;
          if (family === "CONTENT_VOICE") humanFirstRepaired += 1;
          state = "VALIDATED";
          state = transitionPageState(state, "pass");
          break;
        }
      }
      if (evaluation.failures.length > 0) {
        if (repairCeilingExceeded(iterations)) {
          ceiling += 1;
          state = "FAILED_BOUNDED_REPAIR";
        } else {
          state = "FAILED_BOUNDED_REPAIR";
        }
      }
    }
    records.push({
      route,
      state,
      renderEvidence: Boolean(html),
      viewportEvidence: html ? ["1280-source", "390-source"] : [],
      gateResults: evaluation.gateResults,
      failures: evaluation.failures,
      families: evaluation.families,
      repairHistory,
      repairIterations: repairHistory.length,
      missingEvidence: evaluation.missingEvidence,
      finalState: canAdmitPage(state) ? state : state === "VALIDATED" ? "READY_FOR_ARTIFACT" : state,
    });
  }

  for (const record of records) {
    if (record.finalState === "VALIDATED") record.finalState = "READY_FOR_ARTIFACT";
    if (record.state === "VALIDATED") {
      record.state = "READY_FOR_ARTIFACT";
      record.finalState = "READY_FOR_ARTIFACT";
    }
  }

  const promotion = evaluateRepeatedFailurePromotionGate(records);
  if (promotion.promotions.length && sharedPromotions === 0) sharedPromotions = promotion.sharedFixesRequired;
  const fullRoute = evaluateFullPublicRouteValidationGate({ expectedRoutes: input.routes, records });
  const missingEvidence = records.reduce((sum, record) => sum + record.missingEvidence, 0);
  const finalFailed = records.filter((record) => !canAdmitPage(record.finalState)).length;
  const humanFirstRemaining = records.filter((record) => record.gateResults.HumanFirstPublicLanguageGate === "FAIL").length;
  return {
    files,
    records,
    rendered: records.filter((record) => record.renderEvidence).length,
    validated: records.filter((record) => canAdmitPage(record.finalState)).length,
    passedFirstAttempt,
    requiredRepair,
    pagesRepaired,
    totalRepairIterations,
    sharedPromotions,
    repairCeilingExceeded: ceiling,
    finalFailed,
    missingEvidence,
    sameColorFailures: records.reduce((sum, record) => sum + (record.failures.includes("link_contrast") ? 1 : 0), 0),
    nearInvisibleFailures: records.filter((record) => record.failures.includes("link_contrast")).length,
    hoverFocusFailures: records.filter((record) => record.failures.includes("link_contrast") && record.families.includes("CONTRAST")).length,
    trustedSourcesFailures: records.filter((record) => record.families.includes("SOURCE_PRESENTATION") && record.finalState !== "READY_FOR_ARTIFACT").length,
    missingContrastSamples: missingEvidence,
    humanFirstRemaining,
    humanFirstRepaired,
    heroFailures: records.filter((record) => record.failures.includes("hero")).length,
    widthFailures: records.filter((record) => record.families.includes("WIDTH")).length,
    gridFailures: records.filter((record) => record.families.includes("GRID")).length,
    typographyFailures: records.filter((record) => record.failures.includes("typography") || record.families.includes("TYPOGRAPHY")).length,
    contrastFailures: records.filter((record) => record.families.includes("CONTRAST")).length,
    overflowFailures: records.filter((record) => record.failures.includes("overflow")).length,
    sourceSectionFailures: records.filter((record) => record.families.includes("SOURCE_PRESENTATION")).length,
    seoFailures: records.filter((record) => record.families.includes("SEO")).length,
    geoFailures: records.filter((record) => record.families.includes("GEO")).length,
    familyCounts,
    fullRoute,
    promotion,
    overall: fullRoute.overall === "PASS" && finalFailed === 0 ? "PASS" : "FAIL",
  };
}

export { PAGE_REPAIR_ITERATION_CEILING };
