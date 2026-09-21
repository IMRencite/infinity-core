import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import type { PainCategory, PainObservation } from "./types";

const CATEGORY_RULES: Array<{ category: PainCategory; test: RegExp }> = [
  { category: "SEO", test: /\b(seo|rank|google|search visib|local.search|thin site|thin page)/i },
  { category: "AEO", test: /\b(aeo|answer engine|chatgpt|perplexity|ai search)/i },
  { category: "CUSTOMIZATION", test: /\b(customiz|can't edit|cannot edit|limited control|hard to (edit|change)|generic template)/i },
  { category: "CONTENT", test: /\b(thin (ai |generated )?content|generic (copy|page)|ai-generated pages?|shallow content)/i },
  { category: "PRICE", test: /\b(expensive|overpay|too much|forced bundle|\bbundled\b|confusing pricing|hidden fee)/i },
  { category: "SUPPORT", test: /\b(support|unresponsive|wait time|poor (help|service desk))/i },
  { category: "ONBOARDING", test: /\b(onboard|setup (was|is) (hard|slow|confusing)|implementation (pain|delay))/i },
  { category: "AUTOMATION", test: /\b(manual (seo|page|content)|can't automat|cannot automat|too much manual)/i },
  { category: "COMPLEXITY", test: /\b(complex|confusing|steep learning|hard to use|overwhelming)/i },
  { category: "QUALITY", test: /\b(poor quality|broken|slow site|performance|looks cheap)/i },
  { category: "LOCK_IN", test: /\b(lock-?in|can't (leave|export|migrate)|hostage)/i },
  { category: "INTEGRATIONS", test: /\b(integrat|doesn't connect|cannot connect|no api)/i },
  { category: "REPORTING", test: /\b(report|analytics|opaque (results|reporting)|can't see (leads|roi))/i },
  { category: "SPEED", test: /\b(slow to (launch|publish|rank)|takes (weeks|months) to)/i },
  { category: "SERVICE", test: /\b(agency|done-for-you|retainer|account manager dissatisfaction)/i },
];

const PAIN_HINT =
  /\b(complaint|complain|hate|frustrat|pain|weakness|problem|struggle|don't|doesn't|cannot|can't|poor|thin|generic|expensive|confusing|hard to|limited|missing|fail to|unresponsive|bundled|forced bundle|retainer)\b/i;

function sourceQuality(finding: FounderResearchFinding): "HIGH" | "MEDIUM" | "LOW" {
  if (finding.grounded && (finding.confidence ?? 0) >= 0.75 && finding.sourceUrls.length >= 2) return "HIGH";
  if (finding.grounded && (finding.confidence ?? 0) >= 0.55) return "MEDIUM";
  return "LOW";
}

function severity(claim: string): "high" | "medium" | "low" {
  if (/\b(don't rank|fail to rank|can't edit|forced bundle|thin (ai )?content|expensive)\b/i.test(claim)) return "high";
  if (/\b(hard to|limited|confusing|poor|generic)\b/i.test(claim)) return "medium";
  return "low";
}

function categoryOf(claim: string): PainCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.test.test(claim)) return rule.category;
  }
  return "OTHER";
}

function provenancePhrase(quality: "HIGH" | "MEDIUM" | "LOW"): string {
  if (quality === "HIGH") return "Public research suggests";
  if (quality === "MEDIUM") return "Reviews indicate";
  return "Competitor feedback points to";
}

export function extractPainObservations(packet: FounderResearchPacket): PainObservation[] {
  const out: PainObservation[] = [];
  for (const finding of packet.findings) {
    const claim = finding.claim.trim();
    if (!claim) continue;
    const category = categoryOf(claim);
    const negative =
      finding.polarity === "negative" ||
      finding.polarity === "mixed" ||
      PAIN_HINT.test(claim) ||
      (category === "PRICE" && /bundle|expensive|retainer|confusing pricing/i.test(claim));
    if (!negative) continue;
    if (!PAIN_HINT.test(claim) && finding.polarity !== "negative" && category !== "PRICE") continue;
    const quality = sourceQuality(finding);
    out.push({
      problem: claim.length > 180 ? `${claim.slice(0, 177)}…` : claim,
      customerType: packet.findings.some((item) => /smb|small business|local business/i.test(item.claim))
        ? "SMB / local business owners"
        : null,
      competitor: finding.verifiesFounderCompetitor ?? null,
      category,
      severity: severity(claim),
      frequencySignal: "single",
      sourceCount: Math.max(1, finding.sourceUrls.length),
      sourceQuality: quality,
      evidenceText: claim,
      sourceRefs: finding.sourceUrls,
      confidence: quality === "HIGH" ? "HIGH" : quality === "MEDIUM" ? "MEDIUM" : "LOW",
      provenancePhrase: provenancePhrase(quality),
    });
  }
  const counts = new Map<string, number>();
  for (const item of out) {
    const key = `${item.category}:${item.problem.slice(0, 40).toLowerCase()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return out.map((item) => ({
    ...item,
    frequencySignal: (counts.get(`${item.category}:${item.problem.slice(0, 40).toLowerCase()}`) ?? 1) > 1 ? "repeated" : "single",
  }));
}

export function extractCompetitorStrengths(packet: FounderResearchPacket): Array<{
  strength: string;
  competitor: string | null;
  evidenceText: string;
  sourceRefs: string[];
}> {
  const out: Array<{ strength: string; competitor: string | null; evidenceText: string; sourceRefs: string[] }> = [];
  for (const finding of packet.findings) {
    if (finding.polarity !== "positive") continue;
    const claim = finding.claim;
    if (
      !/\b(template|mobile|analytics|hosting|dashboard|support|listings|crm|seo tools?|onboarding)\b/i.test(claim) &&
      !finding.verifiesFounderCompetitor
    ) {
      continue;
    }
    if (PAIN_HINT.test(claim) && finding.polarity === "positive" && !/\b(strong|well|robust|includes|offers|dashboard)\b/i.test(claim)) {
      continue;
    }
    out.push({
      strength: claim.length > 160 ? `${claim.slice(0, 157)}…` : claim,
      competitor: finding.verifiesFounderCompetitor ?? null,
      evidenceText: claim,
      sourceRefs: finding.sourceUrls,
    });
  }
  return out;
}
