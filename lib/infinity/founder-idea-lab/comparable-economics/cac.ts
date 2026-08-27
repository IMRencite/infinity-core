import type { FounderResearchFinding } from "../research-packet";
import { mergeRanges, unknownRange, type EconomicEvidenceClass, type EconomicRange } from "./provenance";
import { parseMoneyRange } from "./pricing";
import type { AcquisitionChannel, ChannelCacComponent } from "./types";

const CHANNEL_PATTERNS: Array<{ channel: AcquisitionChannel; pattern: RegExp }> = [
  { channel: "paid_search", pattern: /\b(paid search|ppc|cpc|google ads|search ads)\b/i },
  { channel: "seo", pattern: /\b(seo|organic search|rankable)\b/i },
  { channel: "content", pattern: /\b(content|aeo|publishing)\b/i },
  { channel: "outbound", pattern: /\b(outbound|cold email|sdr)\b/i },
  { channel: "inside_sales", pattern: /\b(inside sales|sales team|closer)\b/i },
  { channel: "reseller", pattern: /\b(reseller)\b/i },
  { channel: "partnership", pattern: /\b(partner|partnership)\b/i },
  { channel: "agency_channel", pattern: /\b(agency)\b/i },
  { channel: "affiliate", pattern: /\b(affiliate)\b/i },
  { channel: "marketplace", pattern: /\b(marketplace)\b/i },
  { channel: "local_sales", pattern: /\b(local sales|door.to.door)\b/i },
  { channel: "social", pattern: /\b(social ads|meta ads|facebook ads)\b/i },
  { channel: "referral", pattern: /\b(referral)\b/i },
];

export function channelsFromFindings(findings: FounderResearchFinding[]): AcquisitionChannel[] {
  const found = new Set<AcquisitionChannel>();
  for (const finding of findings) {
    for (const row of CHANNEL_PATTERNS) {
      if (row.pattern.test(finding.claim)) found.add(row.channel);
    }
  }
  return [...found];
}

function cacRangeFromClaim(claim: string): EconomicRange {
  if (!/cac|cost per (lead|acquisition|click)|cpl|cpc/i.test(claim)) return unknownRange();
  return parseMoneyRange(claim);
}

export function modelCac(input: {
  findings: FounderResearchFinding[];
  provenance: EconomicEvidenceClass;
}): {
  channels: AcquisitionChannel[];
  components: ChannelCacComponent[];
  range: EconomicRange;
  formula: string;
} {
  const channels = channelsFromFindings(input.findings);
  const components: ChannelCacComponent[] = [];
  for (const finding of input.findings) {
    const range = cacRangeFromClaim(finding.claim);
    if (range.base == null && range.low == null) continue;
    const channel = channelsFromFindings([finding])[0] ?? "paid_search";
    components.push({
      channel,
      name: finding.claim.slice(0, 80),
      range,
      provenance: finding.grounded ? input.provenance : "UNKNOWN",
      sourceRefs: finding.sourceUrls,
      formulaRole: /cpc|cost per click/i.test(finding.claim)
        ? "traffic_cost"
        : /lead|cpl/i.test(finding.claim)
          ? "lead_cost"
          : "customer_acquisition_cost",
    });
  }

  const customerCosts = components.filter((item) => item.formulaRole === "customer_acquisition_cost").map((item) => item.range);
  const leadCosts = components.filter((item) => item.formulaRole === "lead_cost").map((item) => item.range);
  const trafficCosts = components.filter((item) => item.formulaRole === "traffic_cost").map((item) => item.range);

  let range = unknownRange();
  let formula = "UNKNOWN — no grounded CAC components";
  if (customerCosts.length) {
    range = mergeRanges(customerCosts);
    formula = "CAC from comparable customer-acquisition cost observations (range, not a single fact)";
  } else if (leadCosts.length) {
    range = mergeRanges(leadCosts);
    formula = "Lead cost observed; conversion-to-customer unknown so this is not a complete CAC";
  } else if (trafficCosts.length) {
    range = mergeRanges(trafficCosts);
    formula = "Traffic cost observed; clicks-per-lead and close rate unknown so CAC remains incomplete";
  }

  return { channels, components, range, formula };
}

export function defaultChannelSetForDigitalSmb(): AcquisitionChannel[] {
  return ["seo", "content", "paid_search", "agency_channel", "referral"];
}
