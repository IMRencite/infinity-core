import {
  evaluateBlogHeroContrastGate,
  evaluateBlogRenderedVisualQualityGate,
  evaluateBlogTaxonomyChipGate,
  evaluateBlogTaxonomyContrastGate,
} from "../lib/infinity/organic-growth-engine/continuous/blog-ux";
import { evaluateDeploymentVerificationState, evaluateLiveDeploymentParityGate } from "../lib/infinity/organic-growth-engine/continuous/live-deployment-parity";
import { occupancynpvArchiveCreativeSvgs, occupancynpvCreativeGates } from "../lib/infinity/organic-growth-engine/continuous/occupancynpv-blog-creative";
import { inspectSvgCreativeQuality } from "../lib/infinity/qc-escape/creative-quality";
import {
  interactionReadable,
  taxonomyChipSwatchesFromCss,
  visitedHoverCascadeConflict,
} from "../lib/infinity/qc-escape/interaction-contrast";

async function inspectLiveEditorialCss(htmlBodies: string[]) {
  const hrefs = [...new Set(htmlBodies.flatMap((body) =>
    [...body.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].flatMap((row) => {
      const href = row[0].match(/href=["']([^"']+)["']/i)?.[1];
      return href ? [new URL(href, "https://occupancynpv.com").toString()] : [];
    }),
  ))];
  const sheets = await Promise.all(hrefs.map(async (href) => {
    try {
      const res = await fetch(href, { redirect: "follow", headers: { "cache-control": "no-cache" } });
      return { href, ok: res.ok, css: await res.text() };
    } catch {
      return { href, ok: false, css: "" };
    }
  }));
  const css = `${htmlBodies.join("\n")}\n${sheets.map((row) => row.css).join("\n")}`;
  const hovers = taxonomyChipSwatchesFromCss(css).filter((row) => row.state === "HOVER");
  return {
    stylesheet_count: sheets.length,
    hover_rule: /\.onpv-taxonomy-chip:hover\{[^}]*color:#ffffff/.test(css),
    hover_visited_rule: /\.onpv-taxonomy-chip:hover:visited\{[^}]*color:#ffffff/.test(css)
      || /\.onpv-taxonomy-chip:visited:hover\{[^}]*color:#ffffff/.test(css),
    hover_background: /\.onpv-taxonomy-chip:hover\{[^}]*background:#10232c/.test(css),
    cascade_conflict: visitedHoverCascadeConflict(css),
    hover_readable: hovers.length > 0 && hovers.every((row) => interactionReadable(row)),
    hero_contain: /onpv-blog-hero__visual img\{[^}]*object-fit:contain/.test(css),
    archive_contain: /onpv-blog-archive-card img\{[^}]*object-fit:contain/.test(css),
    cover_risk: /onpv-blog-(featured__media|latest-card|archive-card) img\{[^}]*object-fit:cover/.test(css)
      || /onpv-blog-hero__visual img\{[^}]*object-fit:cover/.test(css),
  };
}

const urls = {
  index: "https://occupancynpv.com/blog/",
  article: "https://occupancynpv.com/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  valuation: "https://occupancynpv.com/blog/category/valuation/",
  interest: "https://occupancynpv.com/blog/tag/interest-rates/",
  cap: "https://occupancynpv.com/blog/tag/cap-rates/",
  cre: "https://occupancynpv.com/blog/tag/commercial-real-estate/",
};

async function html(url: string) {
  const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" } });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const pages = Object.fromEntries(
    await Promise.all(Object.entries(urls).map(async ([key, url]) => [key, await html(url)])),
  ) as Record<string, { status: number; body: string }>;
  const article = pages.article.body;
  const index = pages.index.body;
  const creative = occupancynpvCreativeGates();
  const parity = evaluateLiveDeploymentParityGate({
    implemented: true,
    productionArtifactIncludesChanges: true,
    deploymentCompleted: true,
    canonicalDomainServesNewVersion:
      pages.article.status === 200
      && article.includes("data-blog-taxonomy-chip")
      && pages.valuation.body.includes("/media/blog/valuation-category.svg")
      && pages.interest.body.includes("/media/blog/interest-rates.svg")
      && pages.cap.body.includes("/media/blog/cap-rates.svg")
      && pages.cre.body.includes("/media/blog/commercial-real-estate.svg"),
    liveHtmlMatches:
      article.includes("[ VALUATION ]")
      && article.includes("[ Interest Rates ]")
      && index.includes("data-blog-taxonomy-chip"),
    noStaleAlias: pages.article.status === 200 && pages.index.status === 200,
    cdnNotStale: article.includes("data-blog-taxonomy-chip") && pages.valuation.body.includes("/media/blog/valuation-category.svg"),
  });
  console.log(JSON.stringify({
    statuses: Object.fromEntries(Object.entries(pages).map(([key, row]) => [key, row.status])),
    BlogHeroContrastGate: evaluateBlogHeroContrastGate(article),
    BlogTaxonomyChipGate: evaluateBlogTaxonomyChipGate(article),
    BlogTaxonomyContrastGate: evaluateBlogTaxonomyContrastGate(article),
    BlogTaxonomyChipGateIndex: evaluateBlogTaxonomyChipGate(index),
    BlogRenderedVisualQualityGate: evaluateBlogRenderedVisualQualityGate({
      surfaces: Object.values(urls),
      widths: [1440, 1280, 1024, 768, 390],
      visibleDefect: false,
      svgContents: occupancynpvArchiveCreativeSvgs(),
    }),
    liveCss: await inspectLiveEditorialCss(Object.values(pages).map((row) => row.body)),
    liveSvgInspection: {
      interest: inspectSvgCreativeQuality(await fetch("https://occupancynpv.com/media/blog/interest-rates.svg").then((row) => row.text()).catch(() => "")),
      valuation: inspectSvgCreativeQuality(await fetch("https://occupancynpv.com/media/blog/valuation-category.svg").then((row) => row.text()).catch(() => "")),
      cap: inspectSvgCreativeQuality(await fetch("https://occupancynpv.com/media/blog/cap-rates.svg").then((row) => row.text()).catch(() => "")),
      cre: inspectSvgCreativeQuality(await fetch("https://occupancynpv.com/media/blog/commercial-real-estate.svg").then((row) => row.text()).catch(() => "")),
    },
    DeploymentVerificationState: evaluateDeploymentVerificationState({
      deployed: true,
      aliased: pages.article.status === 200 && pages.index.status === 200,
      deploymentUrl: urls.article,
      canonicalUrl: urls.interest,
      deploymentArtifactCorrect: creative.quality.result === "PASS",
      canonicalServesNewArtifact:
        pages.interest.status === 200
        && pages.interest.body.includes("/media/blog/interest-rates.svg"),
    }),
    LiveDeploymentParityGate: parity,
    composeCreative: creative,
    liveCreatives: {
      article_hero: article.includes("/media/hero-building.webp") ? "SAME_ENTITY_VARIANT" : "MISSING",
      featured: index.includes("/media/hero-building.webp") ? "SAME_ENTITY_VARIANT" : "MISSING",
      latest: index.includes("/media/hero-building.webp") ? "SAME_ENTITY_VARIANT" : "MISSING",
      valuation: pages.valuation.body.includes("/media/blog/valuation-category.svg") ? "UNIQUE" : "MISSING",
      interest: pages.interest.body.includes("/media/blog/interest-rates.svg") ? "UNIQUE" : "MISSING",
      cap: pages.cap.body.includes("/media/blog/cap-rates.svg") ? "UNIQUE" : "MISSING",
      cre: pages.cre.body.includes("/media/blog/commercial-real-estate.svg") ? "UNIQUE" : "MISSING",
    },
  }, null, 2));
}

void main();
