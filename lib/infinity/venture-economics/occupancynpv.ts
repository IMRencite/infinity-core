import { ASKREVIEW_CANDIDATE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { classified, stripeCardPresentFeeUsd, unknownScenario, unknownValue } from "./classified";
import type {
  CompetitorRecord,
  ConfidenceDimensions,
  PricingBenchmark,
  ScenarioCase,
  VentureEconomicsIntelligenceRecord,
} from "./types";
import {
  ECONOMICS_COMMERCIALIZATION_READY,
  VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT,
  VENTURE_ECONOMICS_CONFIDENCE_CONTRACT,
  VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT,
} from "./types";

void ASKREVIEW_CANDIDATE_ID;

const RETRIEVED = "2026-09-10T06:50:00.000Z";
const STRIPE_FEE_SOURCE = "https://stripe.com/pricing";
const PROFESSIONAL_USD = 290;
const PER_DEAL_USD = 149;
const PROFESSIONAL_FEE = stripeCardPresentFeeUsd(PROFESSIONAL_USD);
const PER_DEAL_FEE = stripeCardPresentFeeUsd(PER_DEAL_USD);

function competitor(partial: CompetitorRecord): CompetitorRecord {
  return partial;
}

export function buildOccupancynpvEconomics(version = 1): VentureEconomicsIntelligenceRecord {
  const competitors: CompetitorRecord[] = [
    competitor({
      name: "ARGUS Enterprise / ARGUS Intelligence (Altus Group)",
      type: "INDIRECT_COMPETITOR",
      website: "https://www.altusgroup.com/solutions/argus-intelligence/",
      customer_segment: "Institutional CRE investors, owners, lenders, and valuation teams",
      primary_offer: "Property valuation, cash-flow forecasting, and portfolio performance management",
      observed_pricing: classified(
        "UNKNOWN — official price is contact-sales; no public rate card",
        "UNKNOWN",
        "Altus states ARGUS Enterprise is no longer sold standalone and does not publish a public price.",
      ),
      pricing_model: "ENTERPRISE_CONTRACT / CONTACT_SALES",
      free_tier_or_trial: "UNKNOWN — not published as a self-serve free tier",
      key_features: ["cash-flow forecasting", "property valuation", "lease and market-leasing assumptions", "portfolio dashboards"],
      positioning: "Industry-standard institutional CRE valuation platform, not a tenant-rep deal NPV tool",
      strengths: ["category standard", "deep cash-flow engine"],
      weaknesses: ["opaque pricing", "enterprise implementation burden for boutique tenant-rep desks"],
      differentiation_opportunity: "OccupancyNPV targets per-deal tenant-rep NPV comparison at published $290/$149 prices versus institutional software.",
      evidence_source: "https://www.altusgroup.com/solutions/argus-intelligence/",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    }),
    competitor({
      name: "Prophia",
      type: "INDIRECT_COMPETITOR",
      website: "https://www.prophia.com/pricing",
      customer_segment: "Owners, REITs, and institutional portfolio teams",
      primary_offer: "Lease abstraction and portfolio lease-data platform",
      observed_pricing: classified(
        "UNKNOWN — official page is custom/contact-us; no public dollar amount",
        "UNKNOWN",
        "Prophia pricing page lists Essentials as per-tenant annual subscription without a published dollar price.",
      ),
      pricing_model: "ANNUAL_SUBSCRIPTION / CONTACT_SALES",
      free_tier_or_trial: "UNKNOWN",
      key_features: ["AI + expert lease review", "portfolio health add-on", "Yardi/MRI integrations"],
      positioning: "Owner-side lease data and portfolio analytics, not tenant-rep NPV comparison",
      strengths: ["lease data operations", "portfolio reporting"],
      weaknesses: ["not a broker deal-NPV product", "no public comparable price"],
      differentiation_opportunity: "OccupancyNPV models tenant occupancy economics for a single deal rather than abstracting owner portfolios.",
      evidence_source: "https://www.prophia.com/pricing",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    }),
    competitor({
      name: "Occupier",
      type: "INDIRECT_COMPETITOR",
      website: "https://www.occupier.com/",
      customer_segment: "Corporate tenants and occupier real-estate teams",
      primary_offer: "Tenant lease administration, deal tracking, and ASC 842 accounting",
      observed_pricing: classified(
        "UNKNOWN — quote-based; no official public rate card found",
        "UNKNOWN",
        "Vendor does not publish a self-serve price. Secondary writeups describe per-lease modules; those amounts are not treated as official.",
      ),
      pricing_model: "QUOTE / PER_LEASE_MODULE",
      free_tier_or_trial: "Demo / sales-led",
      key_features: ["lease administration", "critical dates", "ASC 842"],
      positioning: "Corporate occupier operating system, not a broker occupancy-NPV calculator",
      strengths: ["tenant lifecycle coverage"],
      weaknesses: ["enterprise sales motion", "unpublished price"],
      differentiation_opportunity: "OccupancyNPV is a priced, self-serve occupancy NPV comparison for brokers, not lease accounting.",
      evidence_source: "https://www.occupier.com/",
      retrieved_at: RETRIEVED,
      confidence: "MEDIUM",
    }),
  ];

  const substitutes: CompetitorRecord[] = [
    competitor({
      name: "Microsoft Excel / Google Sheets manual lease models",
      type: "STATUS_QUO",
      website: null,
      customer_segment: "Tenant-representation brokers and analysts",
      primary_offer: "Ad-hoc spreadsheet NPV / occupancy comparison",
      observed_pricing: classified(
        "UNKNOWN — spreadsheet software is general-purpose; lease-model cost is labor, not a product SKU",
        "UNKNOWN",
        "Status-quo workflow confirmed as the incumbent process. No lease-NPV product price exists to observe.",
      ),
      pricing_model: "MANUAL_LABOR",
      free_tier_or_trial: "Spreadsheets are already on desks",
      key_features: ["custom formulas", "one-off deal files", "no shared productization"],
      positioning: "Default broker workflow OccupancyNPV is built to replace",
      strengths: ["familiar", "flexible"],
      weaknesses: ["error-prone", "not productized", "no governed offer"],
      differentiation_opportunity: "Productized occupancy NPV with published Professional and Per-Deal offers.",
      evidence_source: "OccupancyNPV primary offer: lease-scenario NPV comparison for tenant-representation brokers",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    }),
    competitor({
      name: "Lextract",
      type: "SUBSTITUTE",
      website: "https://lextract.io/resources/comparisons/prophia",
      customer_segment: "Brokers and analysts needing structured lease data",
      primary_offer: "Per-lease AI abstraction",
      observed_pricing: classified(
        "$15 per lease",
        "OBSERVED",
        "Vendor comparison page publishes $15 per lease with no subscription. Abstraction is not occupancy NPV.",
        15,
        "USD_PER_LEASE",
      ),
      pricing_model: "PER_USE",
      free_tier_or_trial: "Self-serve, no contract claimed on vendor page",
      key_features: ["lease abstraction", "structured export"],
      positioning: "Data extraction substitute, not economic comparison",
      strengths: ["published per-use price", "broker-accessible"],
      weaknesses: ["does not compute occupancy NPV or deal economics"],
      differentiation_opportunity: "OccupancyNPV prices the decision model, not the PDF extraction.",
      evidence_source: "https://lextract.io/resources/comparisons/prophia",
      retrieved_at: RETRIEVED,
      confidence: "MEDIUM",
    }),
  ];

  const pricing_benchmarks: PricingBenchmark[] = [
    {
      name: "OccupancyNPV Professional",
      amount_display: "$290/year",
      amount_usd: PROFESSIONAL_USD,
      interval: "year",
      pricing_model: "subscription",
      classification: "OBSERVED",
      source: "OccupancyNPV live Stripe price_1UCs7hLdvXKx7R7GF2TPmwGL",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    },
    {
      name: "OccupancyNPV Per-Deal",
      amount_display: "$149 one-time",
      amount_usd: PER_DEAL_USD,
      interval: "one_time",
      pricing_model: "one-time",
      classification: "OBSERVED",
      source: "OccupancyNPV live Stripe price_1UCs7iLdvXKx7R7GmikBTGx4",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    },
    {
      name: "ARGUS official",
      amount_display: "UNKNOWN — contact sales",
      amount_usd: null,
      interval: "unknown",
      pricing_model: "enterprise_contract",
      classification: "UNKNOWN",
      source: "https://www.altusgroup.com/solutions/argus-intelligence/",
      retrieved_at: RETRIEVED,
      confidence: "HIGH",
    },
    {
      name: "ARGUS secondary market estimate",
      amount_display: "ESTIMATED ~$3,000–$5,000/user/year (not official)",
      amount_usd: null,
      interval: "year",
      pricing_model: "per_seat_estimate",
      classification: "ESTIMATED",
      source: "https://softwarefinder.com/property-management-software/argus-enterprise",
      retrieved_at: RETRIEVED,
      confidence: "LOW",
    },
    {
      name: "Lextract abstraction",
      amount_display: "$15/lease",
      amount_usd: 15,
      interval: "per_use",
      pricing_model: "per_use",
      classification: "OBSERVED",
      source: "https://lextract.io/resources/comparisons/prophia",
      retrieved_at: RETRIEVED,
      confidence: "MEDIUM",
    },
  ];

  const professionalFee = classified(
    `$${PROFESSIONAL_FEE.toFixed(2)} per $290 charge`,
    "DERIVED",
    `US card-not-present published Stripe schedule 2.9% + $0.30 applied to $290. Source: ${STRIPE_FEE_SOURCE}`,
    PROFESSIONAL_FEE,
    "USD",
  );
  const professionalGross = classified(
    `$${ (PROFESSIONAL_USD - PROFESSIONAL_FEE).toFixed(2) } after published payment fee only`,
    "DERIVED",
    "Payment-fee-only residual. Delivery, support, infrastructure, and CAC remain UNKNOWN and are not treated as zero.",
    Math.round((PROFESSIONAL_USD - PROFESSIONAL_FEE) * 100) / 100,
    "USD",
  );

  const price = classified("$290/year Professional; $149 Per-Deal", "OBSERVED", "Live OccupancyNPV Stripe offers. Prices were not changed.", PROFESSIONAL_USD, "USD_YEAR");
  const unknownCac = unknownValue("CAC", "No observed OccupancyNPV acquisition cost exists.");
  const unknownLtv = unknownValue("LTV", "Annual subscription retention is unobserved; unknown retention must not invent LTV.");
  const unknownContribution = unknownValue("contribution", "Delivery and support costs are unknown, so contribution cannot be computed.");

  const dimensions: ConfidenceDimensions = {
    competitor_evidence: "HIGH",
    pricing_evidence: "HIGH",
    demand_evidence: "LOW",
    cost_evidence: "LOW",
    cac_evidence: "INSUFFICIENT",
    retention_evidence: "INSUFFICIENT",
    margin_confidence: "LOW",
  };

  const low: ScenarioCase = {
    ...unknownScenario("LOW", price),
    price,
    gross_margin: classified(
      "Payment-fee-only residual exists; full margin UNKNOWN",
      "DERIVED",
      "Cannot convert payment-fee residual into a scenario margin without delivery cost.",
    ),
  };

  return {
    contract: VENTURE_ECONOMICS_INTELLIGENCE_CONTRACT,
    competitor_contract: VENTURE_COMPETITOR_INTELLIGENCE_CONTRACT,
    venture_id: CRE_VENTURE_ID,
    venture_name: "OccupancyNPV",
    opportunity_id: "7e7e924e-0741-4155-a729-8d529da77ea9",
    research_run_id: "econ_research_occupancynpv_v1",
    economics_version: version,
    generated_at: RETRIEVED,
    last_verified_at: RETRIEVED,
    stage: ECONOMICS_COMMERCIALIZATION_READY,
    market_category: "Commercial lease occupancy / NPV comparison for tenant-representation brokers",
    customer_segment: "US tenant-representation and boutique CRE brokers",
    primary_job_to_be_done: "Compare lease occupancy scenarios and communicate deal NPV without a one-off spreadsheet",
    competitors,
    substitutes,
    competitor_research_status: "PASS",
    pricing_benchmarks,
    monetization_models: [
      { model: "subscription", fit: "PLAUSIBLE", rationale: "Professional is a live $290/year offer.", classification: "OBSERVED" },
      { model: "one-time", fit: "PLAUSIBLE", rationale: "Per-Deal is a live $149 one-time offer.", classification: "OBSERVED" },
      { model: "per-use", fit: "WEAK", rationale: "Lextract-style per-lease abstraction is adjacent, not OccupancyNPV's live model.", classification: "OBSERVED" },
      { model: "enterprise contract", fit: "WEAK", rationale: "ARGUS/Prophia enterprise motion is the expensive incumbent, not OccupancyNPV's published path.", classification: "ESTIMATED" },
    ],
    recommended_monetization_model: "Dual offer: annual Professional subscription + one-time Per-Deal",
    recommended_pricing_hypothesis: "Keep live $290/year and $149 one-time. Do not change prices. Competitive institutional tools are contact-sales / far higher secondary estimates; that does not prove WTP or CAC.",
    revenue_model: "subscription + one-time",
    estimated_variable_costs: professionalFee,
    estimated_fixed_costs: unknownValue("fixed costs", "Infrastructure allocation is not measured."),
    gross_margin_model: professionalGross,
    contribution_margin_model: unknownContribution,
    customer_acquisition_model: unknownCac,
    lifetime_value_model: unknownLtv,
    ltv_cac_ratio: unknownValue("LTV:CAC", "Both LTV and CAC are unknown."),
    payback_period: unknownValue("payback", "CAC is unknown."),
    break_even_model: unknownValue("break-even customers", "Contribution per customer is unknown."),
    unit_economics: {
      price,
      revenue_per_customer: classified("$290/year if Professional; $149 if Per-Deal first purchase", "OBSERVED", "Offer prices are live. Repeat purchase frequency is UNKNOWN.", PROFESSIONAL_USD, "USD"),
      revenue_frequency: classified("Annual for Professional; one-time for Per-Deal", "OBSERVED", "Billing cadence is configured. Renewal/repeat is unobserved."),
      variable_delivery_cost: unknownValue("variable delivery", "No measured fulfillment delivery cost."),
      provider_api_cost: unknownValue("provider/API", "No measured per-customer model/API cost."),
      infrastructure_allocation: unknownValue("infrastructure", "No measured per-customer infra allocation."),
      support_cost: unknownValue("support", "No measured support burden."),
      payment_processing_cost: classified(
        `Professional $${PROFESSIONAL_FEE.toFixed(2)}; Per-Deal $${PER_DEAL_FEE.toFixed(2)}`,
        "DERIVED",
        `Published Stripe US card fee 2.9% + $0.30. ${STRIPE_FEE_SOURCE}`,
        PROFESSIONAL_FEE,
        "USD",
      ),
      gross_profit: professionalGross,
      gross_margin: classified(
        "Payment-fee-only; full gross margin UNKNOWN until delivery cost is known",
        "DERIVED",
        "Do not treat residual after Stripe fees as operating margin.",
      ),
      contribution_profit: unknownContribution,
      contribution_margin: unknownContribution,
    },
    low_case: low,
    base_case: { ...unknownScenario("BASE", price), price },
    high_case: { ...unknownScenario("HIGH", price), price },
    economic_risks: [
      "Unknown CAC may make even published prices unprofitable.",
      "Institutional incumbents may remain the comparison set for sophisticated desks.",
      "Spreadsheet status quo has near-zero license cost and high switching friction.",
    ],
    economic_unknowns: [
      "CAC",
      "retention / Professional LTV",
      "Per-Deal repeat purchase rate",
      "delivery cost",
      "support cost",
      "infrastructure allocation",
      "conversion",
    ],
    evidence: [
      { id: "occ_price_pro", label: "OccupancyNPV Professional $290/year live Stripe price", url: null, retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "occ_price_deal", label: "OccupancyNPV Per-Deal $149 live Stripe price", url: null, retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "stripe_fee", label: "Stripe published US card pricing 2.9% + $0.30", url: STRIPE_FEE_SOURCE, retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "argus_official", label: "Altus ARGUS Intelligence product page; no public price", url: "https://www.altusgroup.com/solutions/argus-intelligence/", retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "argus_estimate", label: "Software Finder secondary ARGUS license estimate", url: "https://softwarefinder.com/property-management-software/argus-enterprise", retrieved_at: RETRIEVED, classification: "ESTIMATED" },
      { id: "prophia", label: "Prophia official pricing page is contact/custom", url: "https://www.prophia.com/pricing", retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "lextract", label: "Lextract vendor page $15/lease abstraction", url: "https://lextract.io/resources/comparisons/prophia", retrieved_at: RETRIEVED, classification: "OBSERVED" },
      { id: "occupier", label: "Occupier tenant lease platform; quote-based", url: "https://www.occupier.com/", retrieved_at: RETRIEVED, classification: "OBSERVED" },
    ],
    confidence: {
      contract: VENTURE_ECONOMICS_CONFIDENCE_CONTRACT,
      overall: "MEDIUM",
      dimensions,
    },
    status: "COMMERCIALIZATION_READY",
    research_ran: true,
    fabricated_competitors: 0,
    production_advancement: "UNCHANGED",
  };
}
