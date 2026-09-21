import type { PublicPageFetchResult, PublicSearchResult, ResearchEvidence } from "./types";

const WORKFLOW = /tenant[-\s]?rep|tenant representation|occupier representation|lease advisory|lease comparison|commercial lease/i;
const ROLE = /broker|principal|advisor|partner|director|managing director/i;
const GENERIC_DISQUALIFY = /residential realtor|property manager|home sale|apartment locator/i;
const PERSON_ROLE =
  /\b([A-Z][a-z]{2,15}\s[A-Z][a-z'.-]{2,15})\s+(?:is a|is an|,\s+(?:Principal|Broker|Partner|Director|Managing Director|Advisor))\b/g;
const TEAM_CARD =
  /\b([A-Z][a-z]{2,15}\s[A-Z][a-z'.-]{2,15})\s*,\s*(?:a\s+)?(?:Principal|Broker|Partner|Director|Managing Director|Advisor)\b/g;
const NAME_BLOCKLIST =
  /Service|Tenant|Representation|Development|Valuation|Advisory|Guide|Portal|Commercial|Estate|Ultimate|View|Privacy|Cookie|Contact|About|Home|Menu|LinkedIn|Subscribe|Occupier|Advisors|Associates|Properties|Capital|Group|United|States|Real/i;

export function extractEvidenceFromPage(page: PublicPageFetchResult, searchTraceId: string | null): ResearchEvidence[] {
  if (!page.ok || !page.text) return [];
  const evidence: ResearchEvidence[] = [];
  const observedAt = page.observedAt;
  const push = (claimType: ResearchEvidence["claimType"], claim: string, excerpt: string, confidence: ResearchEvidence["confidence"]) => {
    evidence.push({
      claimType,
      claim,
      sourceUrl: page.finalUrl || page.url,
      sourceTitle: page.title,
      supportingExcerpt: excerpt.slice(0, 280),
      observedAt,
      confidence,
      provider: page.provider,
      traceability: {
        searchTraceId,
        fetchTraceId: page.traceId,
        capability: "research.extract_evidence",
      },
    });
  };
  if (WORKFLOW.test(page.text) || WORKFLOW.test(page.title)) {
    const match = page.text.match(WORKFLOW);
    push("workflow", "Public page describes tenant-representation or commercial lease advisory work.", match?.[0] ?? page.title, "HIGH");
  }
  if (ROLE.test(page.text) && !GENERIC_DISQUALIFY.test(page.text)) {
    push("role", "Public page describes a commercial brokerage or advisory role.", page.title || "role evidence", "MEDIUM");
  }
  const window = page.text.slice(0, 6_000);
  for (const match of window.matchAll(PERSON_ROLE)) {
    const name = match[1] ?? "";
    if (!name || NAME_BLOCKLIST.test(name)) continue;
    const around = window.slice(Math.max(0, (match.index ?? 0) - 20), (match.index ?? 0) + name.length + 100);
    if (WORKFLOW.test(around) || ROLE.test(around)) {
      push("professional", `${name} is named on a public professional or team page.`, around, WORKFLOW.test(around) ? "HIGH" : "MEDIUM");
    }
  }
  const pageUrl = page.finalUrl || page.url;
  if (/\/(team|people|leadership|bios?|professionals|advisors|brokers)(\/|$)/i.test(pageUrl)) {
    for (const match of window.matchAll(TEAM_CARD)) {
      const name = match[1] ?? "";
      if (!name || NAME_BLOCKLIST.test(name)) continue;
      const around = window.slice(Math.max(0, (match.index ?? 0) - 40), (match.index ?? 0) + name.length + 160);
      if (!WORKFLOW.test(around)) continue;
      if (evidence.some((item) => item.claimType === "professional" && item.claim.startsWith(name))) continue;
      push("professional", `${name} is named on a public professional or team page.`, around, "HIGH");
    }
  }
  if (page.title) {
    push("organization", page.title, page.title, WORKFLOW.test(page.title) ? "HIGH" : "LOW");
  }
  return evidence.slice(0, 20);
}

export function selectOrganizationResults(results: PublicSearchResult[], max = 8): PublicSearchResult[] {
  const selected: PublicSearchResult[] = [];
  for (const result of results) {
    const blob = `${result.title} ${result.snippet}`;
    if (GENERIC_DISQUALIFY.test(blob) && !WORKFLOW.test(blob)) continue;
    if (!/broker|tenant|occupier|lease|advisory|commercial|cre|real estate/i.test(blob)) continue;
    if (selected.some((item) => item.url === result.url)) continue;
    selected.push(result);
    if (selected.length >= max) break;
  }
  return selected;
}

export function professionalsFromEvidence(evidence: ResearchEvidence[]): Array<{ name: string; excerpt: string; sourceUrl: string; sourceTitle: string }> {
  const found: Array<{ name: string; excerpt: string; sourceUrl: string; sourceTitle: string }> = [];
  for (const item of evidence) {
    if (item.claimType !== "professional") continue;
    const name = item.claim.match(/^([A-Z][a-z]{2,15}\s[A-Z][a-z'.-]{2,15})/)?.[1];
    if (!name || NAME_BLOCKLIST.test(name)) continue;
    if (found.some((row) => row.name === name && row.sourceUrl === item.sourceUrl)) continue;
    found.push({ name, excerpt: item.supportingExcerpt, sourceUrl: item.sourceUrl, sourceTitle: item.sourceTitle });
  }
  return found.slice(0, 16);
}
