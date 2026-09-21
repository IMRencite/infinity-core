import { midpointRange, unknownRange, type EconomicEvidenceClass, type EconomicRange } from "../comparable-economics/provenance";
import type { AcquisitionChannel } from "../comparable-economics/types";
import type { FounderResearchFinding } from "../research-packet";
import type {
  BenchmarkDimension,
  BenchmarkSourceClass,
  ChurnKind,
  ExtractedBenchmarkObservation,
} from "./types";
import { classifyBenchmarkSource } from "./quality";
import { qualifyComparableEntity } from "../revenue-model-research/entity";

const CHANNELS: Array<{ channel: AcquisitionChannel; pattern: RegExp }> = [
  { channel: "paid_search", pattern: /\b(paid search|ppc|cpc|google ads|search ads|paid cac|paid acquisition)\b/i },
  { channel: "outbound", pattern: /\b(outbound|cold email|sdr)\b/i },
  { channel: "partnership", pattern: /\b(partner|partnership)\b/i },
  { channel: "seo", pattern: /\b(organic cac|organic search|organic|seo)\b/i },
  { channel: "content", pattern: /\b(content marketing)\b/i },
  { channel: "affiliate", pattern: /\b(affiliate)\b/i },
  { channel: "agency_channel", pattern: /\b(agency)\b/i },
];

function parseNumber(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

function windowAround(claim: string, index: number, length: number, radius = 56): string {
  return claim.slice(Math.max(0, index - radius), Math.min(claim.length, index + length + radius));
}

function clauseAround(claim: string, index: number, length: number): string {
  const splitters = [", and ", "; ", ". ", " — ", " - ", ", while ", ", whereas ", ", but "];
  let start = 0;
  let end = claim.length;
  for (const splitter of splitters) {
    const left = claim.lastIndexOf(splitter, index);
    if (left >= 0) start = Math.max(start, left + splitter.length);
    const right = claim.indexOf(splitter, index + length);
    if (right >= 0) end = Math.min(end, right);
  }
  return claim.slice(start, end);
}

function moneyRange(text: string): EconomicRange {
  const range = text.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:[-–—]|to)\s*\$?\s*([\d,]+(?:\.\d+)?)/i);
  if (range) {
    const low = parseNumber(range[1]!);
    const high = parseNumber(range[2]!);
    if (Number.isFinite(low) && Number.isFinite(high)) return midpointRange(Math.min(low, high), Math.max(low, high));
  }
  const single = text.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (single) {
    const value = parseNumber(single[1]!);
    if (Number.isFinite(value)) return { low: value, base: value, high: value };
  }
  return unknownRange();
}

function percentRange(text: string): EconomicRange {
  const range = text.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*%/);
  if (range) {
    const low = Number(range[1]) / 100;
    const high = Number(range[2]) / 100;
    if (Number.isFinite(low) && Number.isFinite(high)) return { low: Math.min(low, high), base: (low + high) / 2, high: Math.max(low, high) };
  }
  const single = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (single) {
    const value = Number(single[1]) / 100;
    if (Number.isFinite(value)) return { low: value, base: value, high: value };
  }
  return unknownRange();
}

function monthsRange(text: string): EconomicRange {
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*months/i);
  if (range) return midpointRange(Number(range[1]), Number(range[2]));
  const single = text.match(/(\d+(?:\.\d+)?)\s*months/i);
  if (single) {
    const value = Number(single[1]);
    return { low: value, base: value, high: value };
  }
  return unknownRange();
}

function daysRange(text: string): EconomicRange {
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*days/i);
  if (range) return midpointRange(Number(range[1]), Number(range[2]));
  const single = text.match(/(\d+(?:\.\d+)?)\s*days/i);
  if (single) {
    const value = Number(single[1]);
    return { low: value, base: value, high: value };
  }
  return unknownRange();
}

function channelOf(claim: string): AcquisitionChannel | null {
  for (const row of CHANNELS) {
    if (row.pattern.test(claim)) return row.channel;
  }
  return null;
}

export function cacChannelLabel(channel: AcquisitionChannel | null): "organic" | "paid" | null {
  if (channel === "seo" || channel === "content") return "organic";
  if (channel === "paid_search" || channel === "social") return "paid";
  return null;
}

function namedCompany(claim: string, verified: string | null | undefined): string | null {
  if (verified?.trim()) return verified.trim();
  const match = claim.match(/\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/);
  const name = match?.[1] ?? null;
  if (!name) return null;
  const qualified = qualifyComparableEntity(name, claim);
  return qualified.comparableCandidate ? name : null;
}

function provenanceOf(claim: string, company: string | null, sourceClass: BenchmarkSourceClass): EconomicEvidenceClass {
  if (/\bfounder\b/i.test(claim) && /hypothesis|assumed/i.test(claim)) return "FOUNDER_HYPOTHESIS";
  if (company && /\b(reported|disclos|cites|public packages|official)\b/i.test(claim)) return "COMPANY_COMPARABLE";
  if (/\badjacent|similar but|nearby categor/i.test(claim)) return "ADJACENT_BENCHMARK";
  if (/\b(categor(y|ies)|industry|benchmark|smb saas|website-as-a-service|managed website)\b/i.test(claim)) return "CATEGORY_BENCHMARK";
  if (company) return "COMPANY_COMPARABLE";
  if (sourceClass === "CREDIBLE_BENCHMARK_STUDY" || sourceClass === "RECOGNIZED_RESEARCH_FIRM") return "CATEGORY_BENCHMARK";
  return "CATEGORY_BENCHMARK";
}

export function churnKindOf(window: string): ChurnKind {
  const monthly = /\bmonthly\b/i.test(window);
  const annual = /\bannual\b/i.test(window);
  const grossChurn = /\bgross\s+(?:revenue\s+)?churn\b/i.test(window);
  const revenueChurn = /\brevenue churn\b/i.test(window) || grossChurn;
  const logo = /\blogo\b/i.test(window);
  if (/\bnet revenue retention|nrr\b/i.test(window)) return "net_retention";
  if (/\bgross (?:revenue )?retention|grr\b/i.test(window)) return "gross_retention";
  if (monthly && revenueChurn && !logo) return "monthly_revenue";
  if (annual && revenueChurn && !logo) return "annual_revenue";
  if (monthly && logo) return "monthly_logo";
  if (annual && logo) return "annual_logo";
  if (/\bcustomer retention\b/i.test(window)) return "customer_retention";
  if (monthly && /\bchurn\b/i.test(window) && !revenueChurn && !logo) return "unknown";
  if (annual && /\bchurn\b/i.test(window) && !revenueChurn && !logo) return "unknown";
  if (/\bmonthly churn\b/i.test(window)) return "monthly_logo";
  if (/\bannual churn\b/i.test(window)) return "unknown";
  return "unknown";
}

function churnDimensionOf(kind: ChurnKind, window: string): BenchmarkDimension | null {
  if (kind === "net_retention" || kind === "gross_retention" || kind === "customer_retention") return "retention_rate";
  if (/\bretention\b/i.test(window) && !/\bchurn\b/i.test(window)) return "retention_rate";
  if (kind === "monthly_logo" || kind === "monthly_revenue") return "monthly_churn";
  if (kind === "annual_logo" || kind === "annual_revenue") return "annual_churn";
  if (kind === "unknown") {
    if (/\bmonthly\b/i.test(window) && /\bchurn\b/i.test(window)) return "monthly_churn";
    if (/\bannual\b/i.test(window) && /\bchurn\b/i.test(window)) return "annual_churn";
    if (/\bretention\b/i.test(window)) return "retention_rate";
    return null;
  }
  return null;
}

type KindMatch = {
  dimension: BenchmarkDimension;
  test: RegExp;
  unit: ExtractedBenchmarkObservation["unit"];
  parser: (text: string) => EconomicRange;
};

const KIND_MATCHES: KindMatch[] = [
  { dimension: "cost_per_click", test: /\bcpc\b|cost per click/i, unit: "usd", parser: moneyRange },
  { dimension: "cost_per_lead", test: /\bcpl\b|cost per lead/i, unit: "usd", parser: moneyRange },
  { dimension: "visitor_to_lead_conversion", test: /visitor[- ]to[- ]lead|click[- ]to[- ]lead/i, unit: "percent", parser: percentRange },
  { dimension: "lead_to_customer_conversion", test: /lead[- ]to[- ]customer|leads required per customer/i, unit: "percent", parser: percentRange },
  { dimension: "demo_to_close_conversion", test: /demo[- ]to[- ]close/i, unit: "percent", parser: percentRange },
  { dimension: "trial_to_paid_conversion", test: /trial[- ]to[- ]paid/i, unit: "percent", parser: percentRange },
  { dimension: "sales_close_rate", test: /close rate|sales[- ]qualified.{0,20}customer/i, unit: "percent", parser: percentRange },
  { dimension: "sales_cycle_days", test: /sales cycle/i, unit: "days", parser: daysRange },
  { dimension: "commission_rate", test: /commission rate|partner commission/i, unit: "percent", parser: percentRange },
  { dimension: "contribution_margin", test: /contribution margin/i, unit: "percent", parser: percentRange },
  { dimension: "ARPU", test: /\barpu\b|average revenue per (user|customer)/i, unit: "usd", parser: moneyRange },
  { dimension: "ACV", test: /\bacv\b|annual contract value/i, unit: "usd", parser: moneyRange },
  { dimension: "sales_labor_cost", test: /sales labor cost|list cost|data\/list cost|touch cost|contact cost/i, unit: "usd", parser: moneyRange },
  { dimension: "partner_fee", test: /partner (fee|commission)|affiliate fee/i, unit: "percent", parser: percentRange },
  { dimension: "fulfillment_cost", test: /fulfillment cost/i, unit: "usd", parser: moneyRange },
  { dimension: "hosting_cost", test: /hosting cost/i, unit: "usd", parser: moneyRange },
  { dimension: "support_cost", test: /support cost/i, unit: "usd", parser: moneyRange },
  { dimension: "onboarding_cost", test: /onboarding cost|content production (cost|expense)/i, unit: "usd", parser: moneyRange },
  { dimension: "software_variable_cost", test: /ai\/api|api usage cost|llm usage cost|software variable cost/i, unit: "usd", parser: moneyRange },
  { dimension: "payment_processing", test: /payment processing/i, unit: "percent", parser: percentRange },
  { dimension: "customer_lifetime", test: /customer lifetime|lifetime of \d/i, unit: "months", parser: monthsRange },
];

function rangeHasValue(range: EconomicRange): boolean {
  return range.low != null || range.base != null || range.high != null;
}

function canonicalKey(dimension: BenchmarkDimension, range: EconomicRange, sourceUrl: string): string {
  const center = range.base ?? range.low ?? range.high ?? 0;
  const rounded = Math.round(center * 1000) / 1000;
  const host = (() => {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return sourceUrl;
    }
  })();
  return `${dimension}:${rounded}:${host}`;
}

function pushObservation(
  out: ExtractedBenchmarkObservation[],
  finding: FounderResearchFinding,
  dimension: BenchmarkDimension,
  range: EconomicRange,
  unit: ExtractedBenchmarkObservation["unit"],
  churnKind: ChurnKind | null,
  index: { value: number },
  channelOverride?: AcquisitionChannel | null,
  extra?: Pick<ExtractedBenchmarkObservation, "marginStage" | "usableForModel" | "unusedWhy" | "marginRole">,
): void {
  if (!rangeHasValue(range)) return;
  const sourceUrl = finding.sourceUrls[0] ?? "UNKNOWN";
  const sourceClass = classifyBenchmarkSource(sourceUrl, finding.claim);
  const company = namedCompany(finding.claim, finding.verifiesFounderCompetitor);
  index.value += 1;
  out.push({
    observationId: `bench-${index.value}`,
    dimension,
    claim: finding.claim,
    findingId: finding.findingId,
    sourceUrl,
    sourceClass,
    companyName: company,
    categoryLabel: /categor|industry|benchmark|website-as-a-service|smb/i.test(finding.claim) ? "category" : company,
    channel: channelOverride !== undefined ? channelOverride : channelOf(finding.claim),
    range,
    unit,
    churnKind,
    provenance: provenanceOf(finding.claim, company, sourceClass),
    publishedAt: finding.claim.match(/\b(20\d{2})\b/)?.[1] ?? null,
    retrievedAt: null,
    grounded: finding.grounded,
    canonicalStatKey: canonicalKey(dimension, range, sourceUrl),
    marginStage: extra?.marginStage,
    marginRole: extra?.marginRole,
    usableForModel: extra?.usableForModel,
    unusedWhy: extra?.unusedWhy ?? null,
  });
}

function extractMarginObservations(finding: FounderResearchFinding, out: ExtractedBenchmarkObservation[], index: { value: number }): void {
  const claim = finding.claim;
  if (!/gross margin/i.test(claim)) return;
  const seen = new Set<number>();
  for (const match of claim.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
    const window = clauseAround(claim, match.index ?? 0, match[0].length);
    if (!/margin|projected|starting near/i.test(window)) continue;
    const pct = Number(match[1]);
    if (!Number.isFinite(pct) || seen.has(pct)) continue;
    seen.add(pct);
    const value = pct / 100;
    const stage: NonNullable<ExtractedBenchmarkObservation["marginStage"]> = /project/i.test(window)
      ? "PROJECTED_MARGIN"
      : /starting near|current|today|now|near 0/i.test(window)
        ? "OBSERVED_CURRENT_MARGIN"
        : /adjacent|similar/i.test(claim)
          ? "ADJACENT_MARGIN"
          : "CATEGORY_MARGIN";
    const aiInfra = /\b(wix|base44|llm|compute costs?|ai-native content|gpu|inference)\b/i.test(claim);
    const earlyZero = value <= 0.05 && /starting near|near 0|upfront|pre-scale/i.test(claim);
    const marginRole: NonNullable<ExtractedBenchmarkObservation["marginRole"]> = aiInfra
      ? "INFRASTRUCTURE_MARGIN"
      : stage === "PROJECTED_MARGIN"
        ? "PROJECTED_MARGIN"
        : /10-k|gross profit|company reported/i.test(claim)
          ? "DIRECT_COMPANY_MARGIN"
          : stage === "ADJACENT_MARGIN"
            ? "ADJACENT_MARGIN"
            : /unrelated|enterprise field.sales/i.test(claim)
              ? "IRRELEVANT_MARGIN"
              : "CATEGORY_MARGIN";
    const usable =
      stage !== "PROJECTED_MARGIN" &&
      !aiInfra &&
      !earlyZero &&
      value > 0 &&
      marginRole !== "INFRASTRUCTURE_MARGIN" &&
      marginRole !== "IRRELEVANT_MARGIN";
    const why = usable
      ? null
      : aiInfra
        ? "Low relevance / different AI-builder cost structure"
        : earlyZero
          ? "Early-stage 0% is not a steady-state comparable margin"
          : stage === "PROJECTED_MARGIN"
            ? "Projected margin is not observed comparable margin"
            : "Margin observation is not usable as a venture base";
    pushObservation(out, finding, "gross_margin", { low: value, base: value, high: value }, "percent", null, index, null, {
      marginStage: stage,
      usableForModel: usable,
      unusedWhy: why,
      marginRole,
    });
  }
}

function extractCacRanges(claim: string): Array<{ range: EconomicRange; channel: AcquisitionChannel | null }> {
  if (!/\bcac\b|customer acquisition cost|cost per (new )?customer/i.test(claim)) return [];
  const ranges: Array<{ range: EconomicRange; channel: AcquisitionChannel | null }> = [];
  const seen = new Set<string>();
  for (const match of claim.matchAll(/\$\s*([\d,]+(?:\.\d+)?)(?:\s*(?:[-–—]|to)\s*\$?\s*([\d,]+(?:\.\d+)?))?/g)) {
    const local = clauseAround(claim, match.index ?? 0, match[0].length);
    if (!/\bcac\b|customer acquisition/i.test(local)) continue;
    const range = moneyRange(match[0]);
    if (!rangeHasValue(range)) continue;
    const key = `${range.low}:${range.base}:${range.high}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ranges.push({ range, channel: channelOf(local) });
  }
  return ranges;
}

function extractChurnObservations(finding: FounderResearchFinding, out: ExtractedBenchmarkObservation[], index: { value: number }): void {
  const claim = finding.claim;
  if (!/\bchurn\b|\bretention\b|\bnrr\b|\bgrr\b/i.test(claim)) return;
  const seen = new Set<string>();
  for (const match of claim.matchAll(/(\d+(?:\.\d+)?)\s*%?\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*%/g)) {
    const window = clauseAround(claim, match.index ?? 0, match[0].length);
    if (!/\bchurn\b|\bretention\b|\bnrr\b|\bgrr\b/i.test(window)) continue;
    const kind = churnKindOf(window);
    const dimension = churnDimensionOf(kind, window);
    if (!dimension) continue;
    const used = percentRange(match[0]);
    if (!rangeHasValue(used)) continue;
    const key = `${dimension}:${kind}:${used.low}:${used.high}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pushObservation(out, finding, dimension, used, "percent", kind, index);
  }
}

export function extractBenchmarkObservations(findings: FounderResearchFinding[]): ExtractedBenchmarkObservation[] {
  const out: ExtractedBenchmarkObservation[] = [];
  const index = { value: 0 };
  for (const finding of findings) {
    extractChurnObservations(finding, out, index);
    extractMarginObservations(finding, out, index);
    for (const row of extractCacRanges(finding.claim)) {
      pushObservation(out, finding, "customer_acquisition_cost", row.range, "usd", null, index, row.channel);
    }
    for (const match of KIND_MATCHES) {
      const regex = new RegExp(match.test.source, match.test.flags.includes("g") ? match.test.flags : `${match.test.flags}g`);
      let found = false;
      for (const hit of finding.claim.matchAll(regex)) {
        found = true;
        const window = windowAround(finding.claim, hit.index ?? 0, hit[0].length);
        const range = match.parser(window);
        if (!rangeHasValue(range)) continue;
        pushObservation(out, finding, match.dimension, range, match.unit, null, index);
      }
      if (!found && match.test.test(finding.claim)) {
        const range = match.parser(finding.claim);
        if (rangeHasValue(range)) {
          pushObservation(out, finding, match.dimension, range, match.unit, null, index);
        }
      }
    }
  }
  return out;
}

export function classifySourcePublic(url: string, claim: string): BenchmarkSourceClass {
  return classifyBenchmarkSource(url, claim);
}
