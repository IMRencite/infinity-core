import { extractInternalHrefsInBody } from "@/lib/infinity/venture-website-architecture/answer-authority/page-inspect";
import { EXPANSION_QUESTION_PAGES } from "@/lib/infinity/venture-website-architecture/authority-expansion-catalog";
import { evaluateTopicGraphConnectivity } from "@/lib/infinity/venture-website-architecture/authority-expansion-gates";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "@/lib/infinity/venture-website-architecture/digital-real-estate-catalog";

const COMMERCIAL = new Set([
  "/compare-commercial-leases",
  "/how-it-works",
  "/pricing",
  "/early-access",
  "/for/tenant-rep-brokers",
]);

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function authorityNodes(): Set<string> {
  return new Set(
    [
      ...SEO_GEO_TOPIC_HUBS.map((hub) => hub.route),
      ...SEO_GEO_QUESTION_PAGES.map((page) => page.route),
      ...EXPANSION_QUESTION_PAGES.map((page) => page.route),
    ].map(clean),
  );
}

function extractHrefs(html: string): string[] {
  return [...html.matchAll(/href\s*[:=]\s*["'](\/[^"']*)["']/g)].map((match) => clean(match[1] ?? "/"));
}

function graphTarget(href: string, nodes: Set<string>): boolean {
  return nodes.has(href) || COMMERCIAL.has(href);
}

function splitPageLinks(content: string): { body: string[]; nav: string[] } {
  const navBlocks = [...content.matchAll(/<nav\b[^>]*data-semantic-navigation[\s\S]*?<\/nav>/gi)].map(
    (match) => match[0],
  );
  const nav = navBlocks.flatMap(extractHrefs);
  const withoutNav = content.replace(/<nav\b[^>]*data-semantic-navigation[\s\S]*?<\/nav>/gi, " ");
  return { body: extractInternalHrefsInBody(withoutNav).map(clean), nav };
}

function routeFromPagePath(pathName: string): string {
  const cleanPath = pathName.replace(/\\/g, "/").replace(/^app/, "").replace(/\/page\.tsx$/, "");
  return clean(cleanPath || "/");
}

export function clarifyAuthorityGraphCounts(files: Array<{ path: string; content: string; encoding?: string }>) {
  const nodes = authorityNodes();
  const connectivity = evaluateTopicGraphConnectivity(files);
  let rawBodyLinkInstances = 0;
  let rawSemanticNavInstances = 0;
  const bodyEdges = new Set<string>();
  const navEdges = new Set<string>();
  for (const file of files) {
    const pathName = file.path.replace(/\\/g, "/");
    if (!pathName.endsWith("page.tsx") || file.encoding === "base64") continue;
    const from = routeFromPagePath(pathName);
    const split = splitPageLinks(file.content);
    rawBodyLinkInstances += split.body.length;
    rawSemanticNavInstances += split.nav.length;
    if (!nodes.has(from)) continue;
    for (const href of split.body) {
      if (href === from || !graphTarget(href, nodes)) continue;
      bodyEdges.add(`${from}->${href}`);
    }
    for (const href of split.nav) {
      if (href === from || !graphTarget(href, nodes)) continue;
      navEdges.add(`${from}->${href}`);
    }
  }
  let overlapping = 0;
  for (const edge of bodyEdges) if (navEdges.has(edge)) overlapping += 1;
  const totalUnique = new Set([...bodyEdges, ...navEdges]);
  const previous409Explanation =
    "A+C: evaluateTopicGraphConnectivity counts unique outbound source→destination edges per authority page into authority nodes plus the commercial set. Semantic-nav hrefs sit in the same page body, so they are included in the 409. The 253 figure is raw semantic-nav card instances, not unique edges. Duplicate source→destination pairs on one page are deduplicated. The second 409 was therefore the total unique authority graph, not body-only plus nav.";
  return {
    rawBodyLinkInstances,
    rawSemanticNavInstances,
    uniqueBodyGraphEdges: bodyEdges.size,
    uniqueSemanticNavGraphEdges: navEdges.size,
    overlappingSourceDestinationEdges: overlapping,
    totalUniqueAuthorityGraphEdges: totalUnique.size,
    connectivityEdges: connectivity.report.contextualInternalEdges,
    authorityNodes: connectivity.report.authorityNodes,
    orphans: connectivity.report.orphans,
    deadEnds: connectivity.report.deadEnds,
    previous409Explanation,
    model: "A+C" as const,
    overall: connectivity.report.orphans === 0 && connectivity.report.deadEnds === 0 ? ("PASS" as const) : ("FAIL" as const),
  };
}
