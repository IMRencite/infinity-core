import type { ExperimentOffer, IntentModel, PricingHypothesis } from "./types";
import { PRIMARY_CTA } from "./constants";

export function creOffer(): ExperimentOffer {
  return {
    targetCustomer:
      "Independent commercial real estate brokers, tenant representatives, and boutique CRE agencies.",
    problem:
      "Brokers repeatedly rebuild complex commercial lease comparison math in spreadsheets, including step-ups, CAM, percentage rent, tenant improvements, free rent, NPV, and discount-rate sensitivity.",
    valueProposition:
      "A focused commercial lease comparison and NPV workflow for smaller CRE professionals who cannot justify heavy enterprise lease-analysis platforms.",
    does: [
      "Side-by-side lease cash-flow comparison",
      "NPV and discount-rate sensitivity",
      "Shareable deal summary for clients",
    ],
    doesNot: [
      "Full brokerage CRM",
      "Enterprise lease administration",
      "Large property-management suite",
    ],
    disclosure:
      "This is a validation / early-access pilot request. The product is not generally available and no purchase is being processed.",
    legalDisclosure:
      "Any calculations described here would be informational. They are not legal advice and not investment advice. Lease terms should be independently verified. Specialist legal review is still required before a full product launch. No attorney review is claimed.",
    cta: PRIMARY_CTA,
  };
}

export function crePricingHypotheses(): PricingHypothesis[] {
  return [
    {
      id: "professional_annual",
      structure: "PROFESSIONAL_ANNUAL",
      label: "Professional annual access",
      displayPrice: "$290 / year",
      anchorOnly: true,
      proven: false,
    },
    {
      id: "per_deal_report",
      structure: "PER_DEAL_REPORT",
      label: "Per-deal comparison report",
      displayPrice: "$149 / deal",
      anchorOnly: true,
      proven: false,
    },
  ];
}

export function pricingRationale(): string {
  return [
    "Monthly SaaS is only partially supported because a lease calculator is used when a deal is live.",
    "Public anchors ($19–$129/seat, LeasePilot-style per-deal fees) are not Infinity WTP.",
    "Two coherent options keep the experiment small: an annual professional seat and a per-deal report.",
    "A team/firm license remains plausible later; exposing more than two choices would split a small sample.",
  ].join(" ");
}

export function intentModel(): IntentModel {
  return {
    weak: ["PAGE_VIEW", "PRICING_VIEW"],
    moderate: ["CTA_CLICK", "FORM_START", "PRICE_OPTION_SELECTED"],
    strong: ["EARLY_ACCESS_REQUEST", "PILOT_REQUEST", "QUALIFIED_PILOT_APPLICATION", "STRONG_PURCHASE_INTENT"],
    paidCommitmentPossible: false,
  };
}

export function forbiddenCopyPatterns(): RegExp {
  return /testimonial|customers already|countdown|limited spots|guaranteed savings|increase revenue|market leader|#1/i;
}
