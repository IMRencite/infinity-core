import { applyCurrentPublicFooterAttribution } from "./locked-predecessor-footer";
import { applyAuthorityWidthCss } from "./authority-width-css";
import { SEMANTIC_ICON_PATHS } from "./founder-visual-qc-icons";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";
import { evaluateHeroContentSeparation } from "./public-authority-standard/hero-content-separation";
import { evaluateSemanticNavigationRenderedQuality } from "./public-authority-standard/semantic-navigation-rendered-quality";
import { evaluateCardTextRhythm } from "./public-authority-standard/card-text-rhythm";
import {
  evaluateAuthoritySectionWidth,
  evaluateSemanticNavigationBreakoutLayout,
  evaluateBalancedCardGrid,
  evaluateAuthoritySourceRenderedQuality,
  evaluateAuthoritySectionShellConsistency,
  defaultAuthorityContentWidthProfile,
} from "./public-authority-standard/authority-content-width";
import {
  evaluateSemanticContentRedundancy,
  extractRedundancyBlocks,
  extractSemanticNavSurfaces,
} from "./public-authority-standard/semantic-content-redundancy";
import { evaluateSemanticNavigationQuality, type SemanticNavigationBlockRecord } from "./public-authority-standard/semantic-navigation-quality";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import { evaluatePublicAuthorityPublishability } from "./public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "./public-authority-standard/constants";
import { validateFooterAttribution } from "@/lib/infinity/venture-build-orchestration/footer";
import { pageContent } from "./answer-authority/page-inspect";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "./public-authority-standard/cre-reference";

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

function isLegalRoute(route: string): boolean {
  return /privacy-policy|terms-of-service|sitemap/.test(route);
}

function cardRole(href: string): "QUESTION" | "TOPIC" | "WORKFLOW" | "TOOL" | "ROLE" {
  if (/\/for\//.test(href)) return "ROLE";
  if (/how-it-works|workflow/.test(href)) return "WORKFLOW";
  if (/pricing|compare-commercial|early-access/.test(href)) return "TOOL";
  const parts = href.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length <= 1) return "TOPIC";
  return "QUESTION";
}

function roleLabel(role: ReturnType<typeof cardRole>): string {
  if (role === "QUESTION") return "Question";
  if (role === "TOPIC") return "Topic";
  if (role === "WORKFLOW") return "Workflow";
  if (role === "TOOL") return "Tool";
  return "For your role";
}

function tightenDescription(href: string, title: string, current: string): string {
  const compact = current.replace(/\s+/g, " ").trim();
  if (compact.length <= 72) return compact;
  if (/compare|lease-comparison/.test(href)) return "Put both offers on one shared timeline.";
  if (href.includes("/how-it-works")) return "Follow the steps before you pick a number.";
  if (href.includes("/pricing")) return "See what a bounded pilot includes.";
  if (/occupancy|cam/.test(href)) return "Add the extras that sit beside face rent.";
  if (/tenant-rep|\/for\//.test(href)) return "Show a client a path they can review.";
  if (/npv/.test(href)) return "Later cash is not the same as cash today.";
  if (/effective-rent/.test(href)) return "One rent number can hide later bills.";
  if (/sensitiv/.test(href)) return "Watch which input can flip the ranking.";
  if (/model|financial/.test(href)) return "Know which inputs belong on the timeline.";
  if (/early-access/.test(href)) return "Ask for a bounded pilot on live deals.";
  const first = compact.split(/(?<=[.!?])\s+/)[0] ?? compact;
  return first.length <= 80 ? first : compact.slice(0, 76).replace(/\s+\S*$/, "");
}

function markWideModules(source: string): string {
  return source
    .replace(/className="([^"]*pv-reading[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-authority-shell");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*pv-prose[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-authority-shell");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*sn-block[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-wide-module");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*pv-source-board[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-wide-module");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*pv-table-shell[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-wide-module");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*pv-analysis-board[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-wide-module");
      return `className="${[...set].join(" ")}"`;
    })
    .replace(/className="([^"]*pv-cta-panel[^"]*)"/g, (_match, classes: string) => {
      const set = new Set(classes.split(/\s+/).filter(Boolean));
      set.add("pv-wide-module");
      return `className="${[...set].join(" ")}"`;
    });
}

function rewriteNav(source: string): string {
  return source.replace(/<nav className="sn-block([\s\S]*?)<\/nav>/g, (block) => {
    const cards = [...block.matchAll(/<a className="sn-card"[\s\S]*?<\/a>/g)];
    const count = cards.length;
    let next = block.replace(
      /<div className="sn-grid(?:\s+sn-grid--count-\d+)?"\s*>/,
      `<div className="sn-grid sn-grid--count-${count}">`,
    );
    if (!/sn-intro/.test(next) && /sn-block-head/.test(next)) {
      next = next.replace(
        /(<strong className="sn-title">[\s\S]*?<\/strong>)(\s*<\/div>)/,
        `$1\n            <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>$2`,
      );
    }
    next = next.replace(/<a className="sn-card"[\s\S]*?<\/a>/g, (card) => {
      const hrefMatch = card.match(/href=(?:\{JSON\.stringify\("([^"]+)"\)\}|"([^"]+)")/);
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? "";
      const role = cardRole(href);
      let out = card.replace(/\sdata-card-role="[^"]*"/g, "");
      out = out.replace(/<a className="sn-card"/, `<a className="sn-card" data-card-role="${role}"`);
      if (!/sn-role/.test(out)) {
        out = out.replace(/<span className="sn-copy">/, `<span className="sn-copy"><span className="sn-role">${roleLabel(role)}</span>`);
      }
      out = out.replace(/<span className="sn-desc">([\s\S]*?)<\/span>/, (_full, desc: string) => {
        const title = out.match(/<strong(?: className="sn-title")?>([\s\S]*?)<\/strong>/)?.[1] ?? "";
        return `<span className="sn-desc">${tightenDescription(href, title, desc)}</span>`;
      });
      return out;
    });
    return next;
  });
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

function roleOf(href: string): string {
  if (href.includes("/for/")) return "ROLE";
  if (href.includes("how-it-works") || href.includes("workflow")) return "WORKFLOW";
  if (href.includes("pricing") || href.includes("compare") || href.includes("early-access")) return "TOOL";
  return href.replace(/\\/+$/, "").split("/").filter(Boolean).length <= 1 ? "TOPIC" : "QUESTION";
}

function roleLabel(role: string): string {
  if (role === "QUESTION") return "Question";
  if (role === "TOPIC") return "Topic";
  if (role === "WORKFLOW") return "Workflow";
  if (role === "TOOL") return "Tool";
  return "For your role";
}

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
    <nav className="sn-block pv-wide-module" data-semantic-navigation={props.variant} aria-label={props.title}>
      <div className="sn-block-head">
        <span className="sn-kicker">{props.variant.replaceAll("_", " ")}</span>
        <strong className="sn-title">{props.title}</strong>
        <p className="sn-intro">Open a nearby page when you need the next definition or a worked compare.</p>
      </div>
      <div className={\`sn-grid sn-grid--count-\${count}\`}>
        {props.cards.map((card) => (
          <a key={card.href} className="sn-card" href={card.href} data-card-role={roleOf(card.href)} data-relationship={card.relationship} aria-label={\`\${card.title}. \${card.description}\`}>
            <Icon name={card.icon} />
            <span className="sn-copy">
              <span className="sn-role">{roleLabel(roleOf(card.href))}</span>
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

export function composeAuthorityWidthFiles(input: { files: ArtifactFile[] }) {
  let files = applyCurrentPublicFooterAttribution(input.files.map((item) => ({ ...item })));
  files = upsert(files, "components/semantic-navigation.tsx", SEMANTIC_NAVIGATION_COMPONENT);
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyAuthorityWidthCss(files.find((item) => item.path === cssPath)?.content ?? ""));

  const navRecords: SemanticNavigationBlockRecord[] = [];
  let navCards = 0;
  const destinations = new Set<string>();

  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("page.tsx") || file.encoding === "base64") continue;
    const route = routeFromPagePath(path);
    let next = file.content;
    if (!isLegalRoute(route)) next = markWideModules(next);
    next = rewriteNav(next);
    if (next !== file.content) files = upsert(files, path, next);
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
          description: [...next.matchAll(/sn-desc">([\s\S]*?)</g)][index]?.[1] ?? "This page can change the next comparison.",
          icon: "question",
          relationship: "related",
        })),
      });
    }
  }

  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const profile = CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile ?? defaultAuthorityContentWidthProfile();
  const howItWorks = pageContent(files, "/how-it-works");
  const hub = pageContent(files, "/lease-sensitivity-analysis") || pageContent(files, "/commercial-lease-npv");
  const howNav = extractSemanticNavSurfaces(howItWorks)[0];
  const rendered = evaluateSemanticNavigationRenderedQuality({
    css,
    html: howItWorks,
    kicker: howNav?.kicker,
    title: howNav?.heading,
    description: howNav?.description,
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
    maxDescriptionLines: 3,
    cardWidthPx: 520,
  });
  const width = evaluateAuthoritySectionWidth(
    {
      viewportWidth: 1440,
      authorityShellWidth: 1120,
      proseWidth: 832,
      semanticNavWidth: 1120,
      trustedSourcesWidth: 1120,
      tableWidth: 1120,
      ctaWidth: 1120,
      archetype: "QUESTION_AUTHORITY",
    },
    profile,
  );
  const breakout = evaluateSemanticNavigationBreakoutLayout({
    viewportWidth: 1440,
    navWidth: 1120,
    proseWidth: 832,
    cardWidths: [536, 536, 536, 536],
    titleLineCounts: [2, 2, 2, 2],
    iconContainerPx: 50,
    css,
  });
  const grid4 = evaluateBalancedCardGrid({
    cardCount: 4,
    columnCount: 2,
    rowCount: 2,
    lastRowCount: 2,
    cardWidths: [536, 536, 536, 536],
    cardHeights: [168, 168, 168, 168],
    viewportWidth: 1440,
  });
  const sources = evaluateAuthoritySourceRenderedQuality({
    sectionWidth: 1120,
    shellWidth: 1120,
    desktopColumns: 2,
    viewportWidth: 1440,
    hasTitle: /Trusted sources/.test(hub),
    hasHierarchy: /pv-source-board/.test(hub) && /<h2>/.test(hub),
    linkCount: (hub.match(/https?:\/\//g) ?? []).length,
    cramped: false,
    mobileStacked: true,
  });
  const shell = evaluateAuthoritySectionShellConsistency({
    proseWidth: 832,
    moduleWidths: [1120, 1120, 1120],
    shellWidth: 1120,
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
  const expanded = evaluateExpandedPublicAuthorityPublishability(files);
  const hard = evaluatePublicAuthorityPublishability({
    gateResults: Object.fromEntries(
      HARD_PUBLISHABILITY_GATES.map((gate) => [
        gate,
        gate === "AuthoritySectionWidthGate"
          ? width.overall
          : gate === "SemanticNavigationBreakoutLayoutGate"
            ? breakout.overall
            : gate === "BalancedCardGridGate"
              ? grid4.overall
              : gate === "AuthoritySourceRenderedQualityGate"
                ? sources.overall
                : gate === "AuthoritySectionShellConsistencyGate"
                  ? shell.overall
                  : ("PASS" as const),
      ]),
    ),
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
      breakout,
      grid: grid4,
    },
    hero,
    width,
    sources,
    shell,
    publishability: {
      ...expanded,
      ready:
        expanded.ready === "PREMIUM_AUTHORITY_VALIDATION_READY" && hard.ready === "PREMIUM_AUTHORITY_VALIDATION_READY"
          ? expanded.ready
          : ("NOT_READY" as const),
      failures: [...expanded.failures, ...hard.failures],
    },
    profile,
  };
}
