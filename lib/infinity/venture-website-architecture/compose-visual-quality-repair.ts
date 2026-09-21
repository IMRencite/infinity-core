import { evaluatePublicAuthorityPublishability } from "./public-authority-publishability-gate";
import { allAuthorityPageSpecs } from "./digital-real-estate-specs";
import { renderVisualQualityAuthorityPage } from "./visual-quality-repair-render";
import { applyVisualQualityRepairCss } from "./visual-quality-repair-css";
import { loadVisualAssetFiles } from "./visual-quality-assets";
import {
  evaluateAuthorityVisualAssetCoverage,
  evaluateCtaVisualHierarchy,
  evaluateLongFormTextWall,
  evaluateRelatedContentDesign,
  evaluateRenderedTableQuality,
  evaluateSourceReferenceDesign,
  evaluateVisibleFooterGutter,
  evaluateVisualDeadSpace,
} from "./visual-quality-gates";
import { pageContent } from "./answer-authority/page-inspect";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";

export type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

function pageFile(route: string): string {
  const clean = route === "/" ? "/" : route.replace(/\/+$/, "");
  return clean === "/" ? "app/page.tsx" : `app${clean}/page.tsx`;
}

function patchRelatedAndSources(chrome: string): string {
  const related = `export function RelatedContent({ items }: { items: Array<{ href: string; label: string; description?: string }> }) {
  return (
    <nav className="pv-related-editorial" data-section-type="RELATED_CONTENT" aria-label="Related reading">
      <p className="pv-eyebrow">Keep reading</p>
      <h2>Related questions</h2>
      <p className="pv-related-lead">These pages sit next to this topic. Use them when you need the next definition or a worked compare.</p>
      <ul className="pv-related-grid">
        {items.slice(0, 4).map((item) => (
          <li key={item.href} className="pv-related-card">
            <Link href={item.href}>{item.label}</Link>
            {item.description ? <p>{item.description}</p> : <p>Open this page for the next plain-language step.</p>}
          </li>
        ))}
      </ul>
    </nav>
  );
}`;
  const sources = `export function AuthorityRefs({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <ol className="pv-authority" data-section-type="AUTHORITY_REFERENCES">
      {items.map((item) => (
        <li key={item.href}><a href={item.href} rel="noopener noreferrer">{item.label}</a></li>
      ))}
    </ol>
  );
}`;
  return chrome
    .replace(/export function RelatedContent\([\s\S]*?\n\}/, related)
    .replace(/export function AuthorityRefs\([\s\S]*?\n\}/, sources);
}

function injectProductHero(source: string, route: string, src: string, alt: string): string {
  if (source.includes("pv-hero-photo")) return source;
  return source.replace(
    /<header className="pv-hero pv-article-hero[^"]*"([^>]*)>/,
    `<header className="pv-hero pv-article-hero pv-hero-photo"$1>
          <figure className="pv-hero-media">
            <img src="${src}" alt="${alt}" width={1600} height={900} fetchPriority="high" decoding="async" />
          </figure>
          <div className="pv-hero-overlay" aria-hidden="true" />`,
  ).replace(
    `<header className="vg-hero pv-hero pv-hero--split"`,
    `<header className="vg-hero pv-hero pv-hero--split pv-hero-photo" data-visual-route=${JSON.stringify(route)}`,
  );
}

function injectHomepageMedia(source: string): string {
  let next = source;
  if (!next.includes("/media/hero-district.webp")) {
    const hero = `<figure className="pv-hero-media">
          <img src="/media/hero-district.webp" alt="Glass office towers in a business district at dusk. Editorial atmosphere only. Not a client site." width={1600} height={900} fetchPriority="high" decoding="async" />
        </figure>
        <div className="pv-hero-overlay" aria-hidden="true" />`;
    next = next.replace(/<header\b[^>]*>/, (open) => `${open}\n        ${hero}`);
    if (!next.includes("/media/hero-district.webp")) {
      next = next.replace(/(<PageIdentity\b[^>]*>)/, `$1\n        ${hero}`);
    }
  }
  next = next
    .replace(/<div className="pv-related">[\s\S]*?<\/div>/, `<RelatedContent items={${JSON.stringify([
      { href: "/commercial-lease-npv", label: "What NPV means in a commercial lease", description: "Start with the money-over-time idea." },
      { href: "/lease-comparison", label: "How to compare two lease options", description: "Put both offers on one timeline." },
      { href: "/occupancy-costs", label: "Occupancy cost beyond face rent", description: "See what extras do to the bill." },
      { href: "/lease-sensitivity-analysis", label: "What sensitivity analysis shows", description: "See which assumption can flip the rank." },
    ])}} />`)
    .replace(
      `import { JsonLdBlock, PageIdentity, SiteBreadcrumb } from "../components/site-chrome";`,
      `import { JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../components/site-chrome";`,
    );
  if (!next.includes("pv-cta-panel")) {
    next = next.replace(
      `<PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA>`,
      `<span className="pv-cta-panel"><PrimaryCTA href="/early-access">Request Pilot Access</PrimaryCTA></span>`,
    );
  }
  if (!next.includes("pv-source-board")) {
    next = next.replace(
      "<VentureFooter />",
      `<section className="pv-source-board"><h2>Trusted sources</h2><p>Public references only. Not client results.</p><AuthorityRefs items={[{ href: "https://www.investopedia.com/terms/n/npv.asp", label: "Investopedia — net present value" }]} /></section>
      <VentureFooter />`,
    ).replace(
      `import { JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../components/site-chrome";`,
      `import { AuthorityRefs, JsonLdBlock, PageIdentity, RelatedContent, SiteBreadcrumb } from "../components/site-chrome";`,
    );
  }
  next = next.replace(/<table>/g, `<table className="pv-fin-table">`).replace(
    /<div className="pv-compare"/,
    `<div className="pv-table-shell pv-compare"`,
  );
  return next;
}

export function composeVisualQualityRepairFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  publishability: ReturnType<typeof evaluatePublicAuthorityPublishability>;
  visual: {
    footer: ReturnType<typeof evaluateVisibleFooterGutter>;
    tables: ReturnType<typeof evaluateRenderedTableQuality>;
    deadSpace: GateAgg;
    textWall: GateAgg;
    related: GateAgg;
    sources: GateAgg;
    cta: GateAgg;
    homepageImages: number;
    hubImages: number;
    questionImages: number;
  };
} {
  let files = input.files.map((item) => ({ ...item }));
  for (const spec of allAuthorityPageSpecs()) {
    files = upsert(files, pageFile(spec.route), renderVisualQualityAuthorityPage(spec));
  }
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyVisualQualityRepairCss(files.find((item) => item.path === cssPath)?.content ?? ""));
  const chrome = files.find((item) => item.path.replace(/\\/g, "/") === "components/site-chrome.tsx");
  if (chrome) files = upsert(files, chrome.path, patchRelatedAndSources(chrome.content));
  const home = files.find((item) => item.path.replace(/\\/g, "/") === "app/page.tsx");
  if (home) files = upsert(files, home.path, injectHomepageMedia(home.content));
  for (const [route, src, alt] of [
    ["/pricing", "/media/hero-building.webp", "A commercial office building exterior. Editorial setting only."],
    ["/resources", "/media/hero-interior.webp", "Empty conference room used as editorial context. Not a customer photo."],
    ["/for/tenant-rep-brokers", "/media/hero-building.webp", "A commercial office building exterior. Editorial setting only."],
  ] as const) {
    const file = files.find((item) => item.path.replace(/\\/g, "/") === pageFile(route));
    if (file) files = upsert(files, file.path, injectProductHero(file.content, route, src, alt));
  }
  for (const asset of loadVisualAssetFiles()) {
    files = upsert(files, asset.path, asset.content, asset.encoding);
  }
  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const homeHtml = pageContent(files, "/");
  const sample = pageContent(files, SEO_GEO_QUESTION_PAGES[0]?.route ?? "/commercial-lease-npv/what-is-npv-in-a-commercial-lease");
  return {
    files,
    publishability: evaluatePublicAuthorityPublishability(files),
    visual: {
      footer: evaluateVisibleFooterGutter(css),
      tables: evaluateRenderedTableQuality(sample),
      deadSpace: evaluateVisualDeadSpace(sample).overall,
      textWall: evaluateLongFormTextWall(sample).overall,
      related: evaluateRelatedContentDesign(`${sample}\n${files.find((item) => item.path.includes("site-chrome"))?.content ?? ""}`),
      sources: evaluateSourceReferenceDesign(sample),
      cta: evaluateCtaVisualHierarchy(sample),
      homepageImages: evaluateAuthorityVisualAssetCoverage({ html: homeHtml, pageClass: "homepage" }).realImages,
      hubImages: SEO_GEO_TOPIC_HUBS.filter(
        (hub) => evaluateAuthorityVisualAssetCoverage({ html: pageContent(files, hub.route), pageClass: "topic_hub" }).overall === "PASS",
      ).length,
      questionImages: SEO_GEO_QUESTION_PAGES.filter(
        (page) => evaluateAuthorityVisualAssetCoverage({ html: pageContent(files, page.route), pageClass: "question" }).overall === "PASS",
      ).length,
    },
  };
}

type GateAgg = "PASS" | "FAIL";
