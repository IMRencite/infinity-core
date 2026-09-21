import { sitemapSource } from "@/lib/infinity/public-venture-template";
import { SEO_GEO_LEGAL_ROUTES, SEO_GEO_PRODUCT_ROUTES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { DEPTH_QUESTION_PAGES, depthPageFile, plannedDepthQuestionPage } from "./search-demand-depth-catalog";
import { allDepthPageSpecs } from "./search-demand-depth-specs";
import { renderDepthAuthorityPage } from "./search-demand-depth-render";
import { renderHubQuestionDiscovery } from "./hub-question-discovery";
import { applyAuthoritySectionSurfaceCss, applySectionSurfaces } from "./authority-section-surface-css";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import {
  evaluateHubQuestionDiscoveryCoverage,
  evaluateSearchDemandAuthoritySurface,
  evaluateSearchIntentCannibalization,
} from "./search-demand-depth-gates";
import {
  evaluateSectionSurfaceContrast,
  evaluateSectionSurfaceRhythm,
  extractSurfaceSequence,
} from "./public-authority-standard/section-surface-system";
import { evaluatePublicAuthorityPublishability } from "./public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "./public-authority-standard/constants";
import { evaluateRenderedTextContrastFromFiles } from "./public-authority-standard/rendered-text-contrast-gate";
import { runDeterministicPerPageAdmission } from "./public-authority-standard/per-page-render-validate-repair";
import { evaluateHumanFirstPublicLanguageAcrossFiles } from "./human-first-public-language-gate";
import { buildPageSchema } from "./schema-builder";
import { siteSchemaModule } from "./site-chrome";
import { searchDepthNavigationForRoute } from "./search-demand-depth-nav";
import { pageContent } from "./answer-authority/page-inspect";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";
import { searchDepthRouteManifest } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

function filePath(route: string): string {
  const clean = route.replace(/\/+$/, "") || "/";
  return clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
}

function mergeSitemap(existing: string, extraRoutes: string[]): string {
  const found = [...existing.matchAll(/url:\s*"([^"]+)"/g)].map((item) => item[1]);
  return sitemapSource([...found, ...extraRoutes, ...SEO_GEO_PRODUCT_ROUTES, ...SEO_GEO_LEGAL_ROUTES]);
}

function mergeSchema(existing: string): string {
  const match = existing.match(/export const SITE_SCHEMA[^=]*=\s*(\{[\s\S]*\});?\s*$/);
  let prior: Record<string, unknown> = {};
  try {
    prior = match ? (JSON.parse(match[1]) as Record<string, unknown>) : {};
  } catch {
    prior = {};
  }
  const next = { ...prior };
  for (const page of DEPTH_QUESTION_PAGES) {
    const planned = plannedDepthQuestionPage(page);
    const faq = {
      faq: page.question
        ? [
            {
              "@type": "Question",
              name: page.question,
              acceptedAnswer: { "@type": "Answer", text: page.description },
            },
          ]
        : [],
    };
    next[page.route] = buildPageSchema(planned, faq);
    next[planned.canonical] = buildPageSchema(planned, faq);
  }
  return siteSchemaModule(next);
}

function iconPath(name: string): string {
  if (name === "topic") return "M4 6h16v3H4zm0 5h10v3H4zm0 5h16v3H4z";
  if (name === "compare") return "M7 4h3v16H7zm7 4h3v12h-3z";
  if (name === "cost") return "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z";
  if (name === "role") return "M12 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 12 12z";
  if (name === "tool") return "M4 6h7v5H4zm9 0h7v12h-7zM4 13h7v5H4z";
  if (name === "deeper") return "M12 4v12M8 12l4 4 4-4M5 19h14";
  return "M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z";
}

function navSnippet(route: string): string | null {
  const plan = searchDepthNavigationForRoute(route);
  if (!plan) return null;
  const cards = plan.cards
    .map(
      (card) => `<a className="sn-card" href=${JSON.stringify(card.href)} data-relationship=${JSON.stringify(card.relationship)} aria-label=${JSON.stringify(`${card.title}. ${card.description}`)}>
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d=${JSON.stringify(iconPath(card.icon))} /></svg></span>
              <span className="sn-copy"><span className="sn-role">Related</span><strong>${card.title}</strong><span className="sn-desc">${card.description}</span></span>
            </a>`,
    )
    .join("\n            ");
  return `
        <div className="vg-container">
          <nav className="sn-block" data-semantic-navigation=${JSON.stringify(plan.variant)} aria-label=${JSON.stringify(plan.title)} data-surface="TINTED">
            <div className="sn-block-head">
              <span className="sn-kicker">${plan.variant.replaceAll("_", " ")}</span>
              <strong className="sn-title">${plan.title}</strong>
              <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
            </div>
            <div className="sn-grid sn-grid--count-${plan.cards.length}">
            ${cards}
            </div>
          </nav>
        </div>`;
}

function injectBeforeCta(source: string, snippet: string): string {
  if (!snippet || source.includes("data-semantic-navigation")) return source;
  const mark = source.indexOf(`data-section-type="CTA"`);
  if (mark < 0) {
    const footer = source.indexOf("<VentureFooter");
    return footer >= 0 ? `${source.slice(0, footer)}${snippet}${source.slice(footer)}` : `${source}${snippet}`;
  }
  const start = source.lastIndexOf("<section", mark);
  return `${source.slice(0, start)}${snippet}${source.slice(start)}`;
}

function sectionBlockAt(source: string, open: number): { block: string; end: number } | null {
  const re = /<\/?section\b[^>]*>/g;
  re.lastIndex = open;
  let depth = 0;
  let match = re.exec(source);
  while (match) {
    depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return { block: source.slice(open, match.index + match[0].length), end: match.index + match[0].length };
    match = re.exec(source);
  }
  return null;
}

function balancedElementAt(source: string, open: number): { block: string; end: number } | null {
  const tagMatch = source.slice(open).match(/^<([A-Za-z][\w.-]*)\b/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  if (tag.toLowerCase() === "section") return sectionBlockAt(source, open);
  const re = new RegExp(`</?${tag}\\b[^>]*>`, "g");
  re.lastIndex = open;
  let depth = 0;
  let match = re.exec(source);
  while (match) {
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (!selfClosing) depth += match[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return { block: source.slice(open, match.index + match[0].length), end: match.index + match[0].length };
    match = re.exec(source);
  }
  return null;
}

function hoistLightModulesOutOfEmphasis(source: string): string {
  let cursor = 0;
  let out = "";
  while (cursor < source.length) {
    const mark = source.indexOf('data-surface="EMPHASIS"', cursor);
    if (mark < 0) {
      out += source.slice(cursor);
      break;
    }
    const open = source.lastIndexOf("<section", mark);
    if (open < cursor) {
      out += source.slice(cursor, mark + 1);
      cursor = mark + 1;
      continue;
    }
    const extracted = sectionBlockAt(source, open);
    if (!extracted) {
      out += source.slice(cursor);
      break;
    }
    out += source.slice(cursor, open);
    const innerStart = source.indexOf(">", open) + 1;
    let inner = source.slice(innerStart, extracted.end - "</section>".length);
    const pulled: string[] = [];
    const takeBalanced = (findOpen: (from: number) => number) => {
      let searchFrom = 0;
      while (searchFrom < inner.length) {
        const nextOpen = findOpen(searchFrom);
        if (nextOpen < 0) break;
        const block = balancedElementAt(inner, nextOpen);
        if (!block) break;
        pulled.push(block.block);
        inner = `${inner.slice(0, nextOpen)}${inner.slice(block.end)}`;
        searchFrom = nextOpen;
      }
    };
    takeBalanced((from) => {
      const byType = inner.indexOf('data-section-type="SEMANTIC_NAVIGATION"', from);
      return byType >= 0 ? inner.lastIndexOf("<section", byType) : -1;
    });
    takeBalanced((from) => inner.indexOf('<nav className="sn-block', from));
    takeBalanced((from) => {
      const board = inner.indexOf("pv-source-board", from);
      const refs = inner.indexOf('data-section-type="AUTHORITY_REFERENCES"', from);
      const markAt = board >= 0 && (refs < 0 || board < refs) ? board : refs;
      if (markAt < 0) return -1;
      const sectionOpen = inner.lastIndexOf("<section", markAt);
      return sectionOpen >= from ? sectionOpen : -1;
    });
    takeBalanced((from) => inner.indexOf('<nav className="pv-related-editorial"', from));
    takeBalanced((from) => inner.indexOf('<div className="pv-related-editorial"', from));
    takeBalanced((from) => inner.indexOf("<Disclosure>", from));
    inner = inner.replace(/\n[ \t]*\n[ \t]*\n/g, "\n");
    const openTag = source.slice(open, innerStart);
    out += `${openTag}${inner}</section>${pulled.length ? `\n        <div className="vg-container pv-hoisted-light-modules">${pulled.join("\n        ")}</div>` : ""}`;
    cursor = extracted.end;
  }
  return out;
}

function injectDiscovery(source: string, snippet: string): string {
  if (!snippet || source.includes("data-hub-question-discovery")) return source;
  const mark = source.indexOf(`data-section-type="CTA"`);
  const start = mark >= 0 ? source.lastIndexOf("<section", mark) : source.indexOf("<VentureFooter");
  if (start < 0) return `${source}${snippet}`;
  return `${source.slice(0, start)}${snippet}${source.slice(start)}`;
}

export function composeSearchDepthFiles(input: { files: ArtifactFile[] }) {
  let files = input.files.map((item) => ({ ...item }));
  for (const spec of allDepthPageSpecs()) {
    let page = renderDepthAuthorityPage(spec);
    const nav = navSnippet(spec.route);
    if (nav) page = injectBeforeCta(page, nav);
    files = upsert(files, depthPageFile(spec.route), page);
  }
  for (const hub of SEO_GEO_TOPIC_HUBS) {
    const path = filePath(hub.route);
    const current = files.find((item) => item.path.replace(/\\/g, "/") === path);
    if (!current || current.encoding === "base64") continue;
    files = upsert(files, path, injectDiscovery(applySectionSurfaces(current.content, "TOPIC_HUB"), renderHubQuestionDiscovery(hub.route)));
  }
  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (file.encoding === "base64" || !path.endsWith("/page.tsx")) continue;
    if (path.includes("/privacy") || path.includes("/terms")) {
      files = upsert(files, file.path, applySectionSurfaces(file.content, "LEGAL"));
      continue;
    }
    if (!file.content.includes("data-surface=")) {
      files = upsert(files, file.path, applySectionSurfaces(file.content, path.split("/").filter(Boolean).length <= 2 ? "TOPIC_HUB" : "QUESTION_AUTHORITY"));
    }
    const latest = files.find((item) => item.path === file.path);
    if (latest && latest.content.includes('data-surface="EMPHASIS"')) {
      files = upsert(files, file.path, hoistLightModulesOutOfEmphasis(latest.content));
    }
  }
  const resources = files.find((item) => item.path.replace(/\\/g, "/") === "app/resources/page.tsx");
  if (resources && !resources.content.includes("data-depth-resources")) {
    const cards = DEPTH_QUESTION_PAGES.map((page) => `<p className="pv-surface"><a href=${JSON.stringify(page.route)}>${page.question}</a></p>`).join("");
    files = upsert(
      files,
      "app/resources/page.tsx",
      resources.content.replace(
        /<\/header>/,
        `</header>
        <section className="pv-section" data-depth-resources="true" data-section-type="RELATED" data-surface="TINTED"><div className="vg-container"><h2>More search-demand questions</h2><div className="pv-related">${cards}</div></div></section>`,
      ),
    );
  }
  const sitemap = files.find((item) => item.path.replace(/\\/g, "/") === "app/sitemap.ts");
  files = upsert(
    files,
    "app/sitemap.ts",
    mergeSitemap(
      sitemap?.content ?? "",
      DEPTH_QUESTION_PAGES.map((page) => (page.route.endsWith("/") ? page.route : `${page.route}/`)),
    ),
  );
  const schema = files.find((item) => item.path.replace(/\\/g, "/") === "lib/site-schema.ts");
  files = upsert(files, "lib/site-schema.ts", mergeSchema(schema?.content ?? ""));
  const early = files.find((item) => item.path.replace(/\\/g, "/") === "app/early-access/page.tsx");
  if (early && !/<h1[\s>]/i.test(early.content)) {
    files = upsert(
      files,
      early.path,
      early.content.replace(
        /(<(?:header|main|section|div|form|FormContainer)\b[^>]*>)/i,
        `$1\n        <h1>Request pilot access</h1>`,
      ),
    );
  }
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "app/globals.css";
  const cssFile = files.find((item) => item.path === cssPath);
  files = upsert(files, cssPath, applyAuthoritySectionSurfaceCss(cssFile?.content ?? ""));
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const sample = pageContent(files, DEPTH_QUESTION_PAGES[0]?.route ?? "/commercial-lease-npv/why-use-npv-when-comparing-leases");
  const surfaces = extractSurfaceSequence(sample);
  const rhythm = evaluateSectionSurfaceRhythm({ surfaces, longPage: true });
  const occupancy = pageContent(files, "/occupancy-costs");
  const present = pageContent(files, "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client");
  const cam = pageContent(files, "/commercial-lease-npv/should-cam-be-in-lease-npv");
  const contrast = evaluateSectionSurfaceContrast({
    variants: surfaces,
    textOnEmphasisLight: css.includes("--pv-surface-emphasis-ink"),
    cardsDistinctOnTinted: css.includes("[data-surface=\"TINTED\"] .sn-card"),
    linksReadable: css.includes("[data-surface=\"EMPHASIS\"] .pv-cta-panel a") || css.includes("[data-surface=\"EMPHASIS\"] a"),
    html: `${sample}\n${occupancy}\n${present}\n${cam}`,
    css,
  });
  const demand = evaluateSearchDemandAuthoritySurface(files);
  const discovery = evaluateHubQuestionDiscoveryCoverage(files);
  const cannibal = evaluateSearchIntentCannibalization(files);
  const rendered = evaluateRenderedTextContrastFromFiles(files);
  const humanFirst = evaluateHumanFirstPublicLanguageAcrossFiles(files);
  const publicRoutes = searchDepthRouteManifest();
  const pageLoop = runDeterministicPerPageAdmission({
    files,
    routes: [...publicRoutes.pageRoutes],
    redirects: [...publicRoutes.redirectSupport],
  });
  files = pageLoop.files;
  const expanded = evaluateExpandedPublicAuthorityPublishability(files);
  const hard = evaluatePublicAuthorityPublishability({
    gateResults: Object.fromEntries(
      HARD_PUBLISHABILITY_GATES.map((gate) => [
        gate,
        gate === "SearchDemandAuthoritySurfaceGate"
          ? demand.overall
          : gate === "HubQuestionDiscoveryCoverageGate" || gate === "HubQuestionBoardLayoutGate"
            ? discovery.overall
            : gate === "SearchIntentCannibalizationGate"
              ? cannibal.overall
              : gate === "SectionSurfaceRhythmGate"
                ? rhythm.overall
                : gate === "SectionSurfaceContrastGate"
                  ? contrast.overall
                  : gate === "RenderedTextContrastGate"
                    ? rendered.overall
                    : gate === "RenderedHeadingInkGate"
                      ? rendered.headings
                      : gate === "HumanFirstPublicLanguageGate"
                        ? humanFirst.overall
                        : gate === "RenderedLinkContrastGate"
                          ? pageLoop.overall
                          : gate === "FullPublicRouteValidationGate"
                            ? pageLoop.fullRoute.overall
                            : gate === "RepeatedFailurePromotionGate"
                              ? pageLoop.promotion.overall
                              : ("PASS" as const),
      ]),
    ),
  });
  return {
    files,
    publishability: expanded,
    hard,
    demand,
    discovery,
    cannibal,
    rhythm,
    contrast,
    footer: evaluateVisibleFooterGutter(css),
    pageLoop,
  };
}
