import type { FounderResearchFinding, FounderResearchPacket } from "../research-packet";
import type { VentureContext } from "../comparable-economics/qualify";
import { similarityForClaim, similarityScore, confidenceBand } from "../comparable-economics/qualify";
import { unknownRange, rangeHasValue } from "../comparable-economics/provenance";
import { primaryRevenueModelType } from "./classify";
import {
  extractMoneyObservations,
  monthlyRangeFromObservations,
  annualRangeFromObservations,
  preferredSourceClass,
  setupRangeFromObservations,
} from "./extract";
import { classifyPriceRole } from "./price-role";
import { findingsHaveNumericPricing, findingsIndicateRevenueModel, qualitativeMonetizationFinding } from "./coverage";
import type { RevenueModelComparable, RevenueSourceClass } from "./types";
import {
  canContributeToAddOnPricing,
  canContributeToCorePricing,
  canContributeToManagedServicePricing,
  founderComparableRoleLabel,
} from "./numeric-contribution";
import { extractQualifiedComparableNames, qualifyComparableEntity } from "./entity";

const STOP_NAMES = new Set([
  "The",
  "A",
  "An",
  "SMB",
  "CMS",
  "SEO",
  "AEO",
  "AI",
  "SaaS",
  "CAC",
  "LTV",
  "ARR",
  "MRR",
  "One",
  "Local",
  "Website",
  "Comparable",
  "Category",
  "Owners",
  "Inc",
  "Agency",
  "Median",
  "Generic",
  "Incumbent",
  "Industry",
  "CPC",
  "JSON",
  "LLM",
]);

export function extractNamedCompanies(text: string, verified: string[] = []): string[] {
  return extractQualifiedComparableNames(text, verified);
}

function findingsForName(packet: FounderResearchPacket, name: string): FounderResearchFinding[] {
  const needle = name.toLowerCase();
  return packet.findings.filter(
    (finding) =>
      finding.verifiesFounderCompetitor?.toLowerCase() === needle || finding.claim.toLowerCase().includes(needle),
  );
}

function roleFor(findings: FounderResearchFinding[], sourceRefs: string[]): Pick<
  RevenueModelComparable,
  | "revenueModelRole"
  | "revenueModelComparable"
  | "economicComparable"
  | "numericPricingContribution"
  | "sourceConfidence"
  | "revenueModelConfidence"
  | "economicConfidence"
> {
  const numeric = findingsHaveNumericPricing(findings);
  const qualitative = findings.some((item) => qualitativeMonetizationFinding(item)) || findingsIndicateRevenueModel(findings);
  const sourced = sourceRefs.length > 0 && findings.some((item) => item.grounded);
  if (!numeric && !qualitative) {
    return {
      revenueModelRole: "NO",
      revenueModelComparable: false,
      economicComparable: false,
      numericPricingContribution: false,
      sourceConfidence: "NONE",
      revenueModelConfidence: "NONE",
      economicConfidence: "NONE",
    };
  }
  if (numeric && sourced) {
    const official = preferredSourceClass(sourceRefs) === "OFFICIAL_PRICING_PAGE" || preferredSourceClass(sourceRefs) === "OFFICIAL_PLAN_PAGE";
    return {
      revenueModelRole: "YES",
      revenueModelComparable: true,
      economicComparable: true,
      numericPricingContribution: true,
      sourceConfidence: official ? "HIGH" : "MEDIUM",
      revenueModelConfidence: official ? "HIGH" : "MEDIUM",
      economicConfidence: official ? "HIGH" : "MEDIUM",
    };
  }
  if (qualitative || numeric) {
    return {
      revenueModelRole: "PARTIAL",
      revenueModelComparable: true,
      economicComparable: numeric,
      numericPricingContribution: numeric && sourced,
      sourceConfidence: sourced ? "LOW" : "NONE",
      revenueModelConfidence: sourced ? "LOW" : "NONE",
      economicConfidence: numeric && sourced ? "LOW" : "NONE",
    };
  }
  return {
    revenueModelRole: "NO",
    revenueModelComparable: false,
    economicComparable: false,
    numericPricingContribution: false,
    sourceConfidence: "NONE",
    revenueModelConfidence: "NONE",
    economicConfidence: "NONE",
  };
}

export function qualifyRevenueModelComparables(input: {
  packet: FounderResearchPacket;
  context: VentureContext;
}): RevenueModelComparable[] {
  const founderLeads = [...input.packet.verifiedCompetitors, ...input.packet.competitorLeads]
    .map((name) => name.trim())
    .filter(Boolean);
  const discovered = extractNamedCompanies(input.packet.findings.map((item) => item.claim).join(" "), founderLeads);
  const names = [...new Set([...founderLeads, ...discovered])].filter((name) => !STOP_NAMES.has(name));
  const seen = new Set<string>();
  const rows: RevenueModelComparable[] = [];

  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const findings = findingsForName(input.packet, name);
    const claims = findings.map((item) => item.claim).join(" ");
    const similarity = similarityForClaim(claims || name, input.context);
    const score = similarityScore(similarity);
    const strategic = confidenceBand(score, false) !== "WEAK_EXCLUDED";
    const sourceRefs = [...new Set(findings.flatMap((item) => item.sourceUrls))];
    const observations = extractMoneyObservations(claims);
    const priceRoles = findings.map((item) => classifyPriceRole(item.claim, input.context));
    const priceRole = priceRoles.find((role) => role === "DIRECT_COMPARABLE_CORE_PRICE")
      ?? priceRoles.find((role) => role === "ADJACENT_COMPARABLE_CORE_PRICE")
      ?? priceRoles.find((role) => role === "MANAGED_SERVICE_RETAINER")
      ?? priceRoles.find((role) => role === "TOOLING_PRICE" || role === "ADD_ON_PRICE")
      ?? classifyPriceRole(claims, input.context);
    const coreObs = findings.flatMap((item) => {
      const role = classifyPriceRole(item.claim, input.context);
      return extractMoneyObservations(item.claim).filter((obs) => canContributeToCorePricing(obs, role, item.claim));
    });
    const managedObs = findings.flatMap((item) => {
      const role = classifyPriceRole(item.claim, input.context);
      return extractMoneyObservations(item.claim).filter((obs) => canContributeToManagedServicePricing(obs, role));
    });
    const addOnObs = findings.flatMap((item) => {
      const role = classifyPriceRole(item.claim, input.context);
      return extractMoneyObservations(item.claim).filter((obs) => canContributeToAddOnPricing(obs, role));
    });
    const monthly = monthlyRangeFromObservations(coreObs);
    const managedMonthly = monthlyRangeFromObservations(managedObs);
    const addOnMonthly = monthlyRangeFromObservations(addOnObs);
    const setup = setupRangeFromObservations(observations);
    const coreNumeric = coreObs.length > 0 && rangeHasValue(monthly);
    const displayMonthly = coreNumeric
      ? monthly
      : rangeHasValue(managedMonthly)
        ? managedMonthly
        : rangeHasValue(addOnMonthly)
          ? addOnMonthly
          : unknownRange();
    const roles = roleFor(findings, sourceRefs);
    const founderNamed = founderLeads.some((lead) => lead.toLowerCase() === key);
    if (!founderNamed) {
      const entity = qualifyComparableEntity(name, claims, findings.find((item) => item.verifiesFounderCompetitor)?.verifiesFounderCompetitor);
      if (!entity.comparableCandidate) continue;
    }
    if (!strategic && roles.revenueModelRole === "NO" && !coreNumeric && !founderNamed) {
      continue;
    }
    const namedLead = founderNamed;
    const sourceClass: RevenueSourceClass = namedLead
      ? preferredSourceClass(sourceRefs)
      : findings.length &&
          !findings.some((item) => item.verifiesFounderCompetitor === name) &&
          /category|benchmark/i.test(claims)
        ? "CATEGORY_BENCHMARK"
        : preferredSourceClass(sourceRefs);
    const contributesNumeric = coreNumeric;
    rows.push({
      name,
      targetCustomer: input.context.targetCustomer,
      strategicComparable: strategic || coreNumeric,
      economicComparable: contributesNumeric || roles.economicComparable,
      revenueModelComparable: roles.revenueModelComparable || coreNumeric,
      revenueModelRole: coreNumeric && roles.revenueModelRole === "NO" ? "PARTIAL" : roles.revenueModelRole,
      revenueModelConfidence: roles.revenueModelConfidence,
      economicConfidence: contributesNumeric ? roles.economicConfidence : "NONE",
      numericPricingContribution: contributesNumeric,
      adjacent: !namedLead,
      revenueModelType: primaryRevenueModelType(claims || input.context.businessModelHypothesis || ""),
      monthlyPrice: displayMonthly,
      annualPrice: contributesNumeric ? annualRangeFromObservations(observations) : unknownRange(),
      setupFee: setup,
      recurring: /monthly|subscription|recurring|retainer/i.test(claims) ? true : /one[- ]time/i.test(claims) ? false : null,
      addOns: [
        ...new Set(
          findings.flatMap(
            (item) => item.claim.match(/\b(SEO|AEO|content|support|premium|analytics|automation|multi-location|lead generation)\b/gi) ?? [],
          ),
        ),
      ],
      contractModel: /annual/i.test(claims) ? "annual available" : /monthly/i.test(claims) ? "monthly" : null,
      whyRelevant: claims.slice(0, 240) || "Named in research packet without monetization evidence.",
      sourceConfidence: roles.sourceConfidence,
      sourceClass,
      sourceRefs,
      priceRole,
      founderComparableRole: founderComparableRoleLabel({
        numericPricingContribution: contributesNumeric,
        priceRole,
        strategicComparable: strategic || coreNumeric,
      }),
    });
  }

  return rows;
}

export function discoverAdjacentComparableQueries(input: {
  category: string;
  targetCustomer: string | null;
  namedWithoutPricing: string[];
}): string[] {
  if (!input.namedWithoutPricing.length) return [];
  const customer = input.targetCustomer?.trim() || "SMB";
  return [
    `${customer} ${input.category} monthly pricing`,
    `${input.category} website as a service pricing`,
    `${input.category} managed website retainer`,
    `${input.category} setup fee onboarding`,
    `vertical SaaS ${input.category} pricing tiers`,
  ];
}
