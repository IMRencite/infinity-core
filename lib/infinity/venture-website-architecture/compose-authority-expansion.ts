import { sitemapSource } from "@/lib/infinity/public-venture-template";
import { SEO_GEO_LEGAL_ROUTES, SEO_GEO_PRODUCT_ROUTES, SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { EXPANSION_QUESTION_PAGES, expansionPageFile, plannedExpansionQuestionPage } from "./authority-expansion-catalog";
import { allExpansionPageSpecs } from "./authority-expansion-specs";
import { renderExpansionAuthorityPage } from "./authority-expansion-render";
import { linksForRoute, newSpokesForHub, surfacesForRoute } from "./authority-expansion-hub-answers";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import { buildPageSchema } from "./schema-builder";
import { siteSchemaModule } from "./site-chrome";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";

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

function answerSection(route: string): string {
  const surfaces = surfacesForRoute(route);
  if (!surfaces.length) return "";
  const blocks = surfaces
    .map(
      (item, index) =>
        `<div data-question-id=${JSON.stringify(`exp_${route}_${index}`)} data-answer-chunk-id=${JSON.stringify(`exp_${route}_${index}_chunk`)}>
              <AnswerFirst question=${JSON.stringify(item.question)} answer=${JSON.stringify(item.answer)} />
            </div>`,
    )
    .join("\n            ");
  const links = linksForRoute(route)
    .map((item) => `<p>${item.sentence}</p>`)
    .join("\n            ");
  const spokes = newSpokesForHub(route);
  const spokeLine = spokes.length
    ? `<p className="pv-spoke-index" data-expansion-spokes="true">${spokes
        .map((item) => `<a href=${JSON.stringify(item.route)}>${item.question}</a>`)
        .join(" · ")}</p>`
    : "";
  return `
        <section className="pv-section" data-section-type="ANSWER_SURFACES" data-section-id="answer-surfaces" data-expansion-inject="true">
          <div className="vg-container pv-reading">
            <h2>Questions people ask next</h2>
            ${blocks}
            ${links}
            ${spokeLine}
          </div>
        </section>`;
}

function injectAfterHeader(source: string, extra: string): string {
  if (!extra || source.includes("data-expansion-inject")) return source;
  const index = source.indexOf("</header>");
  if (index < 0) return source;
  return `${source.slice(0, index + "</header>".length)}\n${extra}${source.slice(index + "</header>".length)}`;
}

function injectCommercialHero(source: string, src: string, alt: string): string {
  const header = source.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
  if (/<img\b/.test(header)) return source;
  return source.replace(
    /(<header[^>]*>)/,
    `$1
          <figure className="pv-hero-media" data-above-fold-visual="true"><img src="${src}" alt="${alt}" width={1600} height={900} fetchPriority="high" decoding="async" /></figure>`,
  );
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
  for (const page of EXPANSION_QUESTION_PAGES) {
    const planned = plannedExpansionQuestionPage(page);
    const faq = {
      faq: surfacesForRoute(page.hub).slice(0, 3).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    };
    next[page.route] = buildPageSchema(planned, faq);
    next[planned.canonical] = buildPageSchema(planned, faq);
  }
  return siteSchemaModule(next);
}

export function composeAuthorityExpansionFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  publishability: ReturnType<typeof evaluateExpandedPublicAuthorityPublishability>;
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
} {
  let files = input.files.map((item) => ({ ...item }));
  for (const spec of allExpansionPageSpecs()) {
    files = upsert(files, expansionPageFile(spec.route), renderExpansionAuthorityPage(spec));
  }
  for (const route of [...SEO_GEO_TOPIC_HUBS.map((hub) => hub.route), ...SEO_GEO_QUESTION_PAGES.map((page) => page.route)]) {
    const path = filePath(route);
    const current = files.find((item) => item.path.replace(/\\/g, "/") === path);
    if (!current || current.encoding === "base64") continue;
    files = upsert(files, path, injectAfterHeader(current.content, answerSection(route)));
  }
  for (const route of ["/compare-commercial-leases", "/how-it-works", "/pricing", "/for/tenant-rep-brokers"]) {
    const path = filePath(route);
    const current = files.find((item) => item.path.replace(/\\/g, "/") === path);
    if (!current || current.encoding === "base64") continue;
    const patched = injectCommercialHero(
      current.content,
      route.includes("pricing") || route.includes("tenant-rep") ? "/media/hero-building.webp" : "/media/hero-interior.webp",
      "Editorial commercial setting. Not a customer photo.",
    );
    files = upsert(files, path, patched);
  }
  const resources = files.find((item) => item.path.replace(/\\/g, "/") === "app/resources/page.tsx");
  if (resources && !resources.content.includes("data-expansion-resources")) {
    const cards = EXPANSION_QUESTION_PAGES.map(
      (page) => `<p className="pv-surface"><a href=${JSON.stringify(page.route)}>${page.question}</a></p>`,
    ).join("");
    files = upsert(
      files,
      "app/resources/page.tsx",
      resources.content.replace(
        /<\/header>/,
        `</header>
        <section className="pv-section" data-expansion-resources="true"><div className="vg-container"><h2>New search-validated questions</h2><div className="pv-related">${cards}</div></div></section>`,
      ),
    );
  }
  const sitemap = files.find((item) => item.path.replace(/\\/g, "/") === "app/sitemap.ts");
  files = upsert(
    files,
    "app/sitemap.ts",
    mergeSitemap(
      sitemap?.content ?? "",
      EXPANSION_QUESTION_PAGES.map((page) => (page.route.endsWith("/") ? page.route : `${page.route}/`)),
    ),
  );
  const schema = files.find((item) => item.path.replace(/\\/g, "/") === "lib/site-schema.ts");
  files = upsert(files, "lib/site-schema.ts", mergeSchema(schema?.content ?? ""));
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "app/globals.css";
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const publishability = evaluateExpandedPublicAuthorityPublishability(files);
  return { files, publishability, footer: evaluateVisibleFooterGutter(css) };
}
