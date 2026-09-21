import { applyCurrentPublicFooterAttribution } from "./locked-predecessor-footer";
import { applyFounderVisualQcCss } from "./founder-visual-qc-css";
import { replaceLegacySemanticIconPaths, SEMANTIC_ICON_PATHS } from "./founder-visual-qc-icons";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";
import { evaluateHeroContentSeparation } from "./public-authority-standard/hero-content-separation";
import { evaluateSemanticNavigationRenderedQuality } from "./public-authority-standard/semantic-navigation-rendered-quality";
import { evaluateRenderedRouteClassCoverage } from "./public-authority-standard/rendered-route-class-coverage";
import { evaluateCardTextRhythm } from "./public-authority-standard/card-text-rhythm";
import {
  evaluateSemanticContentRedundancy,
  extractRedundancyBlocks,
  extractSemanticNavSurfaces,
} from "./public-authority-standard/semantic-content-redundancy";
import { evaluateSemanticNavigationQuality, type SemanticNavigationBlockRecord } from "./public-authority-standard/semantic-navigation-quality";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import { validateFooterAttribution } from "@/lib/infinity/venture-build-orchestration/footer";
import { pageContent } from "./answer-authority/page-inspect";
import { FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES } from "@/lib/infinity/market-validation-experiment/cre-authority-expansion-routes";

type ArtifactFile = { path: string; content: string; encoding?: "utf8" | "base64" };

function upsert(files: ArtifactFile[], path: string, content: string, encoding?: "utf8" | "base64"): ArtifactFile[] {
  const next = files.filter((item) => item.path.replace(/\\/g, "/") !== path);
  next.push(encoding ? { path, content, encoding } : { path, content });
  return next;
}

function routeFromPagePath(path: string): string {
  const clean = path.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page\.tsx$/, "");
  return clean || "/";
}

const TITLE_REWRITES: Array<[string, string]> = [
  ["Learn the ideas behind the steps", "Explore the ideas behind the steps"],
  ["Learn next", "Explore related ideas"],
  ["Compare the next decision", "Weigh the next decision"],
  ["Use the workflow", "Open the workflow"],
  ["For your role", "Paths for this role"],
  ["Go deeper", "A closer look"],
  ["Questions people ask next", "What people ask next"],
];

function whyDescription(href: string, title: string, current: string): string {
  if (/compare-commercial-leases|\/lease-comparison/.test(href) && /compare/i.test(title)) {
    return "Put both offers on one shared timeline.";
  }
  if (href.includes("/how-it-works")) return "Follow the steps before you pick a number.";
  if (href.includes("/pricing")) return "Check what a bounded pilot includes.";
  if (/occupancy|cam/.test(href)) return "Add the extras that sit beside face rent.";
  if (/tenant-rep|\/for\//.test(href)) return "Show a client a path they can review.";
  if (/npv/.test(href)) return "Later cash is not the same as cash today.";
  if (/effective-rent/.test(href)) return "One rent number can hide later bills.";
  if (/sensitiv/.test(href)) return "Watch which input can flip the ranking.";
  if (/model|financial/.test(href)) return "Know which inputs belong on the timeline.";
  if (/early-access/.test(href)) return "Ask for a bounded pilot on live deals.";
  const first = title.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (first && current.trim().toLowerCase().startsWith(first)) {
    return "This page can change the next comparison.";
  }
  const compact = current.replace(/\s+/g, " ").trim();
  if (compact.length > 88) return compact.split(/(?<=[.!?])\s+/)[0] ?? compact.slice(0, 80);
  return compact;
}

function containArticleHero(source: string): string {
  if (!source.includes("pv-hero-media") || !/pv-article-hero/.test(source)) return source;
  let next = source.replace(/className="([^"]*pv-article-hero[^"]*)"/, (_match, classes: string) => {
    const set = new Set(classes.split(/\s+/).filter(Boolean));
    set.add("pv-hero-photo");
    set.add("pv-hero-photo--article");
    return `className="${[...set].join(" ")}"`;
  });
  if (!next.includes("pv-hero-overlay") && next.includes("pv-hero-media")) {
    next = next.replace(
      /(<figure className="pv-hero-media"[\s\S]*?<\/figure>)/,
      `$1\n          <div className="pv-hero-overlay" aria-hidden="true" />`,
    );
  }
  return next;
}

function rewriteNav(source: string): string {
  let next = source;
  next = next.replace(/<strong className="sn-title">([\s\S]*?)<\/strong>/g, (full, title: string) => {
    const rewritten = TITLE_REWRITES.find(([from]) => title.trim() === from)?.[1] ?? title;
    return `<strong className="sn-title">${rewritten}</strong>`;
  });
  next = next.replace(/<nav className="sn-block"([\s\S]*?)<\/nav>/g, (block) => {
    const cards = [...block.matchAll(/<a className="sn-card"[\s\S]*?<\/a>/g)];
    const count = cards.length;
    let rewritten = block.replace(
      /<div className="sn-grid(?:\s+sn-grid--count-\d+)?"\s*>/,
      `<div className="sn-grid sn-grid--count-${count}">`,
    );
    rewritten = rewritten.replace(
      /<a className="sn-card" href=(\{?JSON\.stringify\([^)]+\)\}|"[^"]+")([\s\S]*?)<strong>([\s\S]*?)<\/strong><span className="sn-desc">([\s\S]*?)<\/span>/g,
      (_full, hrefExpr: string, mid: string, title: string, desc: string) => {
        const href = hrefExpr.replace(/^"|"$/g, "").replace(/\{JSON\.stringify\((['"])(.+?)\1\)\}/, "$2");
        const nextDesc = whyDescription(href, title, desc);
        return `<a className="sn-card" href=${hrefExpr}${mid}<strong>${title}</strong><span className="sn-desc">${nextDesc}</span>`;
      },
    );
    return rewritten;
  });
  return next;
}

function iconPathsFrom(source: string): string[] {
  return [...source.matchAll(/<path d=(?:"([^"]+)"|\{JSON\.stringify\("([^"]+)"\)\})/g)].map(
    (item) => item[1] ?? item[2] ?? "",
  );
}

const SEMANTIC_NAVIGATION_COMPONENT = `"use client";

type Card = {
  title: string;
  description: string;
  href: string;
  icon: string;
  relationship: string;
};

const ICONS: Record<string, string> = ${JSON.stringify(SEMANTIC_ICON_PATHS, null, 2)};

function Icon({ name }: { name: string }) {
  const d = ICONS[name] ?? ICONS.question;
  return (
    <span className="sn-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
    </span>
  );
}

export function SemanticNavigationBlock(props: { variant: string; title: string; cards: Card[] }) {
  const count = props.cards.length;
  return (
    <nav className="sn-block" data-semantic-navigation={props.variant} aria-label={props.title}>
      <div className="sn-block-head">
        <span className="sn-kicker">{props.variant.replaceAll("_", " ")}</span>
        <strong className="sn-title">{props.title}</strong>
      </div>
      <div className={\`sn-grid sn-grid--count-\${count}\`}>
        {props.cards.map((card) => (
          <a key={card.href} className="sn-card" href={card.href} data-relationship={card.relationship} aria-label={\`\${card.title}. \${card.description}\`}>
            <Icon name={card.icon} />
            <span className="sn-copy">
              <strong>{card.title}</strong>
              <span className="sn-desc">{card.description}</span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
`;

export function composeFounderVisualQcFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
  footerAttribution: ReturnType<typeof validateFooterAttribution>;
  redundancy: ReturnType<typeof evaluateSemanticContentRedundancy>;
  navigation: {
    blocks: number;
    cards: number;
    uniqueDestinations: number;
    records: SemanticNavigationBlockRecord[];
    presence: ReturnType<typeof evaluateSemanticNavigationQuality>;
    rendered: ReturnType<typeof evaluateSemanticNavigationRenderedQuality>;
    rhythm: ReturnType<typeof evaluateCardTextRhythm>;
  };
  hero: ReturnType<typeof evaluateHeroContentSeparation>;
  routeCoverage: ReturnType<typeof evaluateRenderedRouteClassCoverage>;
  publishability: ReturnType<typeof evaluateExpandedPublicAuthorityPublishability>;
} {
  let files = applyCurrentPublicFooterAttribution(input.files.map((item) => ({ ...item })));
  files = upsert(files, "components/semantic-navigation.tsx", SEMANTIC_NAVIGATION_COMPONENT);
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyFounderVisualQcCss(files.find((item) => item.path === cssPath)?.content ?? ""));

  const navRecords: SemanticNavigationBlockRecord[] = [];
  let navCards = 0;
  const destinations = new Set<string>();

  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("page.tsx") || file.encoding === "base64") continue;
    let next = containArticleHero(replaceLegacySemanticIconPaths(file.content));
    next = rewriteNav(next);
    if (next !== file.content) files = upsert(files, path, next);
    const route = routeFromPagePath(path);
    if (next.includes("data-semantic-navigation")) {
      const surfaces = extractSemanticNavSurfaces(next);
      const hrefs = [...next.matchAll(/<a className="sn-card" href(?:=|"|=\{JSON\.stringify\(")(\/[^"\)]+)/g)].map((item) => item[1] ?? "");
      hrefs.forEach((href) => destinations.add(href));
      navCards += (next.match(/className="sn-card"/g) ?? []).length;
      navRecords.push({
        variant: next.match(/data-semantic-navigation=\{?"([^"]+)"/)?.[1] ?? "LEARN_NEXT",
        title: surfaces[0]?.heading ?? "Explore related ideas",
        pageRoute: route,
        pageArchetype: route === "/" ? "PRODUCT" : "QUESTION_AUTHORITY",
        cards: hrefs.filter(Boolean).slice(0, 6).map((href, index) => ({
          href,
          title: [...next.matchAll(/<strong>([\s\S]*?)<\/strong>/g)][index]?.[1] ?? "Related path",
          description: [...next.matchAll(/sn-desc">([\s\S]*?)</g)][index]?.[1] ?? "See why this page helps.",
          icon: "question",
          relationship: "related",
        })),
      });
    }
  }

  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const howItWorks = pageContent(files, "/how-it-works");
  const howItWorksNav = extractSemanticNavSurfaces(howItWorks)[0];
  const rendered = evaluateSemanticNavigationRenderedQuality({
    css,
    html: howItWorks,
    kicker: howItWorksNav?.kicker,
    title: howItWorksNav?.heading,
    description: howItWorksNav?.description,
    iconPaths: iconPathsFrom(howItWorks),
    cardHeights: [176, 176, 176, 176, 176],
    lastLineWordCounts: iconPathsFrom(howItWorks).map(() => 3),
    cardCount: (howItWorks.match(/className="sn-card"/g) ?? []).length,
    danglingLastRow: 0,
  });
  const rhythm = evaluateCardTextRhythm({
    descriptions: [...howItWorks.matchAll(/sn-desc">([\s\S]*?)</g)].map((item) => item[1] ?? ""),
    css,
    lastLineWordCounts: iconPathsFrom(howItWorks).map(() => 3),
  });
  const presence = evaluateSemanticNavigationQuality({
    blocks: navRecords.filter((item) => item.pageRoute === "/how-it-works" || item.pageRoute === "/"),
    pageArchetype: "HOW_TO",
  });
  const hero = evaluateHeroContentSeparation({
    hero: { top: 0, height: 640 },
    following: { top: 700, height: 800 },
    media: { top: 0, height: 352 },
    firstBodyText: { top: 700, height: 48 },
    css,
  });
  const redundancy = evaluateSemanticContentRedundancy({
    blocks: extractRedundancyBlocks(pageContent(files, "/occupancy-costs/what-is-cam-in-a-commercial-lease") || howItWorks),
    html: howItWorks,
  });
  return {
    files,
    footer: evaluateVisibleFooterGutter(css),
    footerAttribution: validateFooterAttribution(files.filter((file) => file.encoding !== "base64")),
    redundancy,
    navigation: {
      blocks: navRecords.length,
      cards: navCards,
      uniqueDestinations: destinations.size,
      records: navRecords,
      presence,
      rendered,
      rhythm,
    },
    hero,
    routeCoverage: evaluateRenderedRouteClassCoverage({
      sampledRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
      requiredRoutes: FOUNDER_VISUAL_QC_LIVE_SAMPLE_ROUTES,
    }),
    publishability: evaluateExpandedPublicAuthorityPublishability(files),
  };
}
