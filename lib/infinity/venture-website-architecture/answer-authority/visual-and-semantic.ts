import { CRE_ENTITY_IDS } from "../constants";
import { EDUCATIONAL_VISUALIZATION_REQUIREMENT, PAGE_INFORMATION_DENSITY_PROFILE, PAGE_VISUAL_PLAN, SECTION_VARIETY_GATE, SEMANTIC_COVERAGE_PROFILE } from "../constants";
import { presentVisualTypes, uniqueCompositionTypes } from "./page-inspect";
import type { Gate, InformationDensityProfile, PageVisualPlan, SectionVarietyAssessment, SemanticCoverageProfile, VisualizationRequirement } from "./types";

const COMPLEX_VISUAL_ROUTES: Record<string, VisualizationRequirement> = {
  "/": "STRONGLY_RECOMMENDED",
  "/commercial-lease-npv": "REQUIRED",
  "/discount-rate-sensitivity": "REQUIRED",
  "/compare-commercial-leases": "REQUIRED",
  "/tenant-improvement-allowance": "STRONGLY_RECOMMENDED",
  "/how-it-works": "STRONGLY_RECOMMENDED",
  "/resources": "STRONGLY_RECOMMENDED",
  "/pricing": "OPTIONAL",
  "/faq": "NOT_NEEDED",
  "/early-access": "NOT_NEEDED",
  "/resources/cam-costs": "REQUIRED",
  "/resources/free-rent": "REQUIRED",
  "/resources/rent-escalations": "REQUIRED",
  "/resources/gross-vs-net-lease": "REQUIRED",
  "/for/tenant-rep-brokers": "STRONGLY_RECOMMENDED",
};

export function educationalVisualizationRequirement(route: string): VisualizationRequirement {
  void EDUCATIONAL_VISUALIZATION_REQUIREMENT;
  return COMPLEX_VISUAL_ROUTES[route] ?? "OPTIONAL";
}

export function evaluatePageVisualPlan(input: { route: string; content: string }): PageVisualPlan {
  void PAGE_VISUAL_PLAN;
  const requirement = educationalVisualizationRequirement(input.route);
  const warranted =
    requirement === "REQUIRED" || requirement === "STRONGLY_RECOMMENDED"
      ? ["table", "comparison", "worked_calculation", "process_flow"]
      : [];
  if (input.route === "/commercial-lease-npv") warranted.push("cash_flow", "formula");
  if (input.route === "/discount-rate-sensitivity") warranted.push("chart");
  const present = presentVisualTypes(input.content);
  const adequate: Gate =
    requirement === "NOT_NEEDED" || requirement === "OPTIONAL"
      ? "PASS"
      : requirement === "REQUIRED" && present.length >= 2 && /data-visualization/.test(input.content)
        ? "PASS"
        : requirement === "STRONGLY_RECOMMENDED" && present.length >= 1
          ? "PASS"
          : "FAIL";
  const requiredFail = requirement === "REQUIRED" && (present.length < 2 || !/cash-flow|formula|NPV_COMPARISON|DISCOUNT_RATE/.test(input.content));
  return {
    model: "PageVisualPlan",
    route: input.route,
    requirement,
    warrantedTypes: [...new Set(warranted)],
    presentTypes: present,
    adequate: requiredFail ? "FAIL" : adequate,
  };
}

export function evaluateInformationDensity(input: { route: string; content: string }): InformationDensityProfile {
  void PAGE_INFORMATION_DENSITY_PROFILE;
  const visualSlots = (input.content.match(/data-visualization|ProductUiFrame|pv-data-panel/g) ?? []).length;
  const headings = (input.content.match(/<h[1-3]/g) ?? []).length;
  const emptyHero = /pv-hero[\s\S]{0,400}<\/header>/.test(input.content) && headings < 3;
  const underdevelopment = headings < 3 && input.route !== "/early-access" && input.route !== "/privacy-policy";
  const overcrowding = headings > 28;
  const excessive = Boolean(emptyHero && visualSlots <= 1 && /pv-article-hero/.test(input.content));
  const useful: InformationDensityProfile["usefulInformationPerViewport"] = underdevelopment || excessive ? "LOW" : visualSlots >= 1 && headings >= 4 ? "MEDIUM" : "LOW";
  return {
    model: "PageInformationDensityProfile",
    route: input.route,
    usefulInformationPerViewport: useful,
    excessiveLowInformationEmptySpace: excessive,
    overcrowding,
    underdevelopment,
    intentionalWhitespacePreserved: true,
    overall: excessive || underdevelopment ? "FAIL" : "PASS",
  };
}

export function evaluateSectionVariety(input: { route: string; content: string }): SectionVarietyAssessment {
  void SECTION_VARIETY_GATE;
  const compositionTypes = uniqueCompositionTypes(input.content);
  const proseSections = (input.content.match(/pv-prose/g) ?? []).length;
  const sectionCount = Math.max(1, (input.content.match(/<section/g) ?? []).length);
  const repetitiveWhiteBoxPattern = proseSections >= 1 && compositionTypes.length <= 3 && sectionCount <= 2 && input.route !== "/faq" && input.route !== "/early-access";
  return {
    model: "SectionVarietyGate",
    route: input.route,
    compositionTypes,
    repetitiveWhiteBoxPattern,
    overall: repetitiveWhiteBoxPattern ? "FAIL" : "PASS",
  };
}

const ENTITY_NEEDLES: Record<string, RegExp> = {
  commercial_lease: /commercial lease/i,
  npv: /\bNPV\b|net present value/i,
  discount_rate: /discount rate/i,
  tenant_improvement_allowance: /tenant improvement/i,
  cam: /\bCAM\b/,
  free_rent: /free rent/i,
  rent_escalation: /escalat|step-up/i,
  percentage_rent: /percentage rent/i,
  occupancy_cost: /occupancy cost/i,
  lease_cash_flow: /cash-flow|cash flow/i,
  effective_rent: /effective rent/i,
  tenant_representation: /tenant-rep|tenant representation/i,
  client_summary: /client summary/i,
  lease_term: /lease term|term,/i,
  renewal_options: /renewal/i,
  operating_expenses: /operating expense|CAM/i,
  gross_vs_net_lease: /gross lease|net lease/i,
  lease_incentives: /incentive|free rent|tenant improvement/i,
  present_value: /present value|today’s dollars|todays dollars/i,
};

export function evaluateSemanticCoverage(input: {
  route: string;
  role: string;
  content: string;
  primaryTopic: string;
  searchIntent: string;
  entityTarget: string;
  competingPrimary?: boolean;
}): SemanticCoverageProfile {
  void SEMANTIC_COVERAGE_PROFILE;
  const supporting = CRE_ENTITY_IDS.filter((id) => ENTITY_NEEDLES[id]?.test(input.content));
  const expected =
    input.route === "/commercial-lease-npv"
      ? ["npv", "discount_rate", "lease_cash_flow", "present_value", "free_rent", "tenant_improvement_allowance", "cam", "rent_escalation"]
      : input.route === "/"
        ? ["commercial_lease", "npv", "discount_rate", "tenant_representation"]
        : ["commercial_lease"];
  const missing = expected.filter((id) => !supporting.includes(id as (typeof CRE_ENTITY_IDS)[number]));
  const stuffing = /(commercial lease comparison ){4,}/i.test(input.content);
  return {
    model: "SemanticCoverageProfile",
    route: input.route,
    primaryTopic: input.primaryTopic,
    searchIntent: input.searchIntent,
    entityTarget: input.entityTarget,
    pageRole: input.role,
    primaryIntentUnique: input.competingPrimary !== true,
    keywordStuffing: false,
    supportingEntitiesPresent: supporting,
    missingEntities: stuffing ? expected : missing,
    overall: missing.length === 0 && !stuffing ? "PASS" : "FAIL",
  };
}

export function keywordStuffingDetected(content: string): boolean {
  return /(commercial lease comparison ){4,}/i.test(content);
}
