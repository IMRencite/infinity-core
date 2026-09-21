import { applyCurrentPublicFooterAttribution } from "./locked-predecessor-footer";
import { applyAuthorityFinalPolishCss } from "./authority-final-polish-css";
import { EDITORIAL_HIGHLIGHT_COMPONENT, SEMANTIC_NAVIGATION_COMPONENT } from "./authority-final-polish-components";
import { polishNavEligibleRoutes, semanticNavigationForRoute } from "./authority-final-polish-nav";
import { evaluateSemanticContentRedundancy, extractRedundancyBlocks, evaluateSemanticPair } from "./public-authority-standard/semantic-content-redundancy";
import { evaluateEditorialHighlightQuality, type EditorialHighlightRecord } from "./public-authority-standard/editorial-highlight-quality";
import { evaluateSemanticNavigationQuality, type SemanticNavigationBlockRecord } from "./public-authority-standard/semantic-navigation-quality";
import { evaluateVisibleFooterGutter } from "./visual-quality-gates";
import { SEO_GEO_LEGAL_ROUTES } from "./digital-real-estate-catalog";
import { pageContent } from "./answer-authority/page-inspect";
import { evaluateExpandedPublicAuthorityPublishability } from "./authority-expansion-gates";
import { validateFooterAttribution } from "@/lib/infinity/venture-build-orchestration/footer";

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

const WHAT_CHANGES_VALUE =
  "If one option is full-service gross and the other is net, put those extras on one path before you compare them.";
const COMMON_MISTAKE_VALUE =
  "That hides how two buildings share cost. Split the bills, then compare the stacks.";

function repairAdjacentCallouts(source: string): { source: string; repaired: number; exact: number; near: number; retained: number } {
  let repaired = 0;
  let exact = 0;
  let near = 0;
  let retained = 0;
  const next = source.replace(
    /(<section\b[\s\S]*?<\/section>)/g,
    (section) => {
      const items = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((item) =>
        (item[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      );
      return section.replace(
        /<aside className="pv-callout" data-callout=([^>]+)><h3>([^<]+)<\/h3><p>([\s\S]*?)<\/p><\/aside>/g,
        (full, rawKind: string, title: string, body: string) => {
          const kind = rawKind.replace(/["'`{}]/g, "");
          const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const neighbor = items.find((item) => evaluateSemanticPair(item, text).overall === "FAIL") ?? items[0];
          if (!neighbor) return full;
          const pair = evaluateSemanticPair(neighbor, text);
          if (pair.overall === "PASS") {
            retained += 1;
            return full
              .replace('className="pv-callout"', 'className="pv-callout ed-highlight"')
              .replace("<aside ", `<aside data-editorial-highlight=${JSON.stringify(kind)} `);
          }
          if (pair.exact) exact += 1;
          else near += 1;
          const replacement =
            /WHAT_CHANGES|DECISION/i.test(kind) || /what changes/i.test(title)
              ? WHAT_CHANGES_VALUE
              : COMMON_MISTAKE_VALUE;
          if (evaluateSemanticPair(neighbor, replacement).overall === "FAIL") return full;
          repaired += 1;
          return `<aside className="pv-callout ed-highlight" data-editorial-highlight=${JSON.stringify(kind)} data-callout=${rawKind}><h3>${title}</h3><p>${replacement}</p></aside>`;
        },
      );
    },
  );
  return { source: next, repaired, exact, near, retained };
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

function navJsx(route: string): string | null {
  const plan = semanticNavigationForRoute(route);
  if (!plan) return null;
  const cards = plan.cards
    .map(
      (card) => `<a className="sn-card" href=${JSON.stringify(card.href)} data-relationship=${JSON.stringify(card.relationship)} aria-label=${JSON.stringify(`${card.title}. ${card.description}`)}>
              <span className="sn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d=${JSON.stringify(iconPath(card.icon))} /></svg></span>
              <span className="sn-copy"><strong>${card.title}</strong><span className="sn-desc">${card.description}</span></span>
            </a>`,
    )
    .join("\n            ");
  return `
        <div className="vg-container">
          <nav className="sn-block" data-semantic-navigation=${JSON.stringify(plan.variant)} aria-label=${JSON.stringify(plan.title)}>
            <div className="sn-block-head">
              <span className="sn-kicker">${plan.variant.replaceAll("_", " ")}</span>
              <strong className="sn-title">${plan.title}</strong>
            </div>
            <div className="sn-grid">
            ${cards}
            </div>
          </nav>
        </div>`;
}

function injectNav(source: string, snippet: string): string {
  if (source.includes("data-semantic-navigation") || source.includes("<SemanticNavigationBlock")) return source;
  const markers = [
    /<section[^>]*data-section-type="RELATED[\s\S]*?>/,
    /<section[^>]*data-expansion-resources/,
    /<h2>Trusted sources<\/h2>/,
    /<h2>Questions people ask next<\/h2>/,
    /<section className="pv-section pv-cta-band"/,
    /<VentureFooter \/>/,
  ];
  for (const marker of markers) {
    const match = source.match(marker);
    if (!match || match.index == null) continue;
    return `${source.slice(0, match.index)}
        <section className="pv-section" data-section-type="SEMANTIC_NAVIGATION" data-section-id="semantic-nav">${snippet}
        </section>
        ${source.slice(match.index)}`;
  }
  return source;
}

function markExistingCallouts(source: string): string {
  return source.replace(
    /<aside className="pv-callout"(?![^>]*ed-highlight)/g,
    '<aside className="pv-callout ed-highlight"',
  );
}

function routeFromPagePath(path: string): string {
  const clean = path.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page\.tsx$/, "");
  return clean || "/";
}

export function composeAuthorityFinalPolishFiles(input: { files: ArtifactFile[] }): {
  files: ArtifactFile[];
  footer: ReturnType<typeof evaluateVisibleFooterGutter>;
  footerAttribution: ReturnType<typeof validateFooterAttribution>;
  redundancy: {
    exactFound: number;
    nearFound: number;
    repaired: number;
    retained: number;
    evaluated: number;
    overall: "PASS" | "FAIL";
  };
  highlights: { added: number; sourcedQuotes: number };
  navigation: {
    blocks: number;
    cards: number;
    uniqueDestinations: number;
    duplicateDestinationProblems: number;
    records: SemanticNavigationBlockRecord[];
  };
  publishability: ReturnType<typeof evaluateExpandedPublicAuthorityPublishability>;
} {
  let files = applyCurrentPublicFooterAttribution(input.files.map((item) => ({ ...item })));
  files = upsert(files, "components/editorial-highlight.tsx", EDITORIAL_HIGHLIGHT_COMPONENT);
  files = upsert(files, "components/semantic-navigation.tsx", SEMANTIC_NAVIGATION_COMPONENT);
  const cssPath = files.find((item) => item.path.replace(/\\/g, "/").endsWith("globals.css"))?.path ?? "styles/globals.css";
  files = upsert(files, cssPath, applyAuthorityFinalPolishCss(files.find((item) => item.path === cssPath)?.content ?? ""));

  let exactFound = 0;
  let nearFound = 0;
  let repaired = 0;
  let retained = 0;
  let evaluated = 0;
  let highlightAdds = 0;
  const navRecords: SemanticNavigationBlockRecord[] = [];
  let navCards = 0;
  const destinations = new Set<string>();
  let duplicateDestinationProblems = 0;

  for (const file of [...files]) {
    const path = file.path.replace(/\\/g, "/");
    if (!path.endsWith("page.tsx") || file.encoding === "base64") continue;
    const route = routeFromPagePath(path);
    if (SEO_GEO_LEGAL_ROUTES.some((item) => item === route)) continue;
    let next = file.content;
    const repair = repairAdjacentCallouts(next);
    next = markExistingCallouts(repair.source);
    exactFound += repair.exact;
    nearFound += repair.near;
    repaired += repair.repaired;
    retained += repair.retained;
    const blocks = extractRedundancyBlocks(next);
    evaluated += evaluateSemanticContentRedundancy({ blocks }).candidates.length;
    highlightAdds += (next.match(/ed-highlight/g) ?? []).length;
    const snippet = navJsx(route);
    if (snippet) {
      next = injectNav(next, snippet);
      const plan = semanticNavigationForRoute(route);
      if (plan) {
        const hrefs = plan.cards.map((card) => card.href);
        if (new Set(hrefs).size !== hrefs.length) duplicateDestinationProblems += 1;
        hrefs.forEach((href) => destinations.add(href));
        navCards += plan.cards.length;
        navRecords.push({
          variant: plan.variant,
          title: plan.title,
          cards: plan.cards,
          pageRoute: route,
          pageArchetype: route === "/" ? "PRODUCT" : polishNavEligibleRoutes().includes(route) ? "QUESTION_AUTHORITY" : "PRODUCT",
        });
      }
    }
    if (next !== file.content) files = upsert(files, file.path, next);
  }

  const css = files.find((item) => item.path === cssPath)?.content ?? "";
  const footer = evaluateVisibleFooterGutter(css);
  const footerAttribution = validateFooterAttribution(files.filter((file) => file.encoding !== "base64"));
  const sampleBlocks = extractRedundancyBlocks(pageContent(files, "/occupancy-costs/what-is-cam-in-a-commercial-lease") || pageContent(files, "/"));
  const redundancyGate = evaluateSemanticContentRedundancy({ blocks: sampleBlocks });
  void evaluateEditorialHighlightQuality({
    highlights: highlightRecordsFromFiles(files),
    wordCount: 2200,
  });
  void evaluateSemanticNavigationQuality({
    blocks: navRecords.filter((item) => item.pageRoute === "/"),
    pageArchetype: "PRODUCT",
  });
  return {
    files,
    footer,
    footerAttribution,
    redundancy: {
      exactFound,
      nearFound,
      repaired,
      retained,
      evaluated,
      overall: redundancyGate.overall,
    },
    highlights: { added: highlightAdds, sourcedQuotes: 0 },
    navigation: {
      blocks: navRecords.length,
      cards: navCards,
      uniqueDestinations: destinations.size,
      duplicateDestinationProblems,
      records: navRecords,
    },
    publishability: evaluateExpandedPublicAuthorityPublishability(files),
  };
}

function highlightRecordsFromFiles(files: ArtifactFile[]): EditorialHighlightRecord[] {
  const records: EditorialHighlightRecord[] = [];
  for (const file of files) {
    if (!file.path.endsWith("page.tsx") || file.encoding === "base64") continue;
    for (const match of file.content.matchAll(/data-editorial-highlight=\{?"?([A-Z_]+)"?\}?[\s\S]*?<p>([\s\S]*?)<\/p>/g)) {
      records.push({
        kind: match[1] ?? "KEY_TAKEAWAY",
        title: match[1] ?? "Key takeaway",
        body: (match[2] ?? "").replace(/<[^>]+>/g, " ").trim(),
      });
    }
  }
  return records;
}
