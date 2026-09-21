import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { DEPTH_QUESTION_PAGES, type DepthQuestionPage } from "./search-demand-depth-catalog";

const GROUP_LABEL: Record<DepthQuestionPage["discoveryGroup"], string> = {
  START_HERE: "Start here",
  CALCULATE_IT: "Calculate it",
  COMPARE_OPTIONS: "Compare options",
  COMMON_MISTAKES: "Common mistakes",
  GO_DEEPER: "Go deeper",
  FOR_YOUR_ROLE: "For your role",
};

export type HubDiscoveryItem = { href: string; label: string; group: DepthQuestionPage["discoveryGroup"] };

function clean(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

export function hubDiscoveryItems(hub: string): HubDiscoveryItem[] {
  const prior = [...SEO_GEO_QUESTION_PAGES, ...EXPANSION_QUESTION_PAGES]
    .filter((page) => clean(page.hub) === clean(hub))
    .map((page) => ({
      href: page.route.endsWith("/") ? page.route : `${page.route}/`,
      label: page.question,
      group: inferGroup(page.route, page.question),
    }));
  const next = DEPTH_QUESTION_PAGES.filter((page) => clean(page.hub) === clean(hub)).map((page) => ({
    href: page.route.endsWith("/") ? page.route : `${page.route}/`,
    label: page.question,
    group: page.discoveryGroup,
  }));
  const seen = new Set<string>();
  const out: HubDiscoveryItem[] = [];
  for (const item of [...prior, ...next]) {
    const key = clean(item.href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function inferGroup(route: string, question: string): DepthQuestionPage["discoveryGroup"] {
  if (/what is|what does|why use/i.test(question)) return "START_HERE";
  if (/calculat|how is|how do you|inputs|model/i.test(question)) return "CALCULATE_IT";
  if (/vs|compare|gross|net|normalize/i.test(question) || route.includes("compare")) return "COMPARE_OPTIONS";
  if (/mistake|wrong|limit/i.test(question)) return "COMMON_MISTAKES";
  if (/cfo|broker|client|explain|memo|loi/i.test(question)) return "FOR_YOUR_ROLE";
  return "GO_DEEPER";
}

function renderDiscoveryGroups(
  items: HubDiscoveryItem[],
  groups: Array<DepthQuestionPage["discoveryGroup"]>,
  roleSurface = false,
): string {
  return groups
    .map((group) => {
      const rows = items
        .filter((item) => item.group === group)
        .map((item) => `<li><a href=${JSON.stringify(item.href)}>${item.label}</a></li>`)
        .join("");
      const attrs = roleSurface
        ? ` data-hub-role-band="true" data-discovery-group=${JSON.stringify(group)}`
        : ` data-discovery-group=${JSON.stringify(group)}`;
      return `<div${attrs}><h3>${GROUP_LABEL[group]}</h3><ul className="pv-question-row">${rows}</ul></div>`;
    })
    .join("");
}

export function renderHubQuestionDiscovery(hub: string): string {
  const items = hubDiscoveryItems(hub);
  if (!items.length) return "";
  const groups = (Object.keys(GROUP_LABEL) as Array<DepthQuestionPage["discoveryGroup"]>).filter((group) =>
    items.some((item) => item.group === group),
  );
  const blocks = renderDiscoveryGroups(items, groups);
  return `
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid">
              ${blocks}
            </div>
          </div>
        </section>`;
}

export function renderRepairedHubQuestionDiscovery(hub: string): string {
  const items = hubDiscoveryItems(hub);
  if (!items.length) return "";
  const groups = (Object.keys(GROUP_LABEL) as Array<DepthQuestionPage["discoveryGroup"]>).filter((group) =>
    items.some((item) => item.group === group),
  );
  const primary = groups.filter((group) => group !== "FOR_YOUR_ROLE");
  const role = groups.filter((group) => group === "FOR_YOUR_ROLE");
  const blocks = renderDiscoveryGroups(items, primary);
  const roleBand = renderDiscoveryGroups(items, role, true);
  return `
        <section className="pv-section pv-wide-module" data-section-type="HUB_DISCOVERY" data-section-id="hub-discovery" data-hub-question-discovery="true" data-surface="TINTED">
          <div className="vg-container">
            <h2>Questions this topic answers</h2>
            <p>These are the standalone authority pages in this family. They are grouped so a reader can start, calculate, compare, or go deeper without a wall of cards.</p>
            <div className="pv-discovery-grid pv-discovery-grid--balanced">
              ${blocks}
            </div>
            ${roleBand ? `<div className="pv-discovery-band" data-hub-role-band="true">${roleBand}</div>` : ""}
          </div>
        </section>`;
}

export function replaceHubQuestionDiscovery(source: string, snippet: string): string {
  if (!snippet) return source;
  const marker = `data-hub-question-discovery="true"`;
  const mark = source.indexOf(marker);
  if (mark >= 0) {
    const start = source.lastIndexOf("<section", mark);
    const end = source.indexOf("</section>", mark);
    if (start >= 0 && end >= 0) {
      return `${source.slice(0, start)}${snippet.trim()}${source.slice(end + "</section>".length)}`;
    }
  }
  const cta = source.indexOf(`data-section-type="CTA"`);
  const injectAt = cta >= 0 ? source.lastIndexOf("<section", cta) : source.indexOf("<VentureFooter");
  if (injectAt < 0) return `${source}${snippet}`;
  return `${source.slice(0, injectAt)}${snippet}${source.slice(injectAt)}`;
}

export function hubDiscoveryVisibleCount(html: string, hub: string): number {
  return hubDiscoveryItems(hub).filter((item) => html.includes(clean(item.href))).length;
}

export function allTopicHubs() {
  return SEO_GEO_TOPIC_HUBS;
}
