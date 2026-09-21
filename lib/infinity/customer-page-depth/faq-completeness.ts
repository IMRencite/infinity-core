import { FAQ_COMPLETENESS_GATE, type NamedDepthGate } from "./types";

export const FAQ_QUESTION_CLUSTERS = [
  "product",
  "npv_analysis",
  "trial",
  "pricing",
  "account_saved_work",
  "billing",
  "limitations_support",
] as const;

export type FaqClusterId = (typeof FAQ_QUESTION_CLUSTERS)[number];

const CLUSTER_MARKERS: Record<FaqClusterId, { heading: RegExp; answers: RegExp[] }> = {
  product: {
    heading: /Getting Started|Using OccupancyNPV/i,
    answers: [
      /OccupancyNPV is a live lease comparison/i,
      /tenant-rep/i,
      /DealWorkspace/i,
      /enter .{0,40}lease scenarios|term, rent steps/i,
      /cash-flow|occupancy cost|NPV/i,
      /not a CRM/i,
    ],
  },
  npv_analysis: {
    heading: /Lease Analysis/i,
    answers: [
      /net present value|today.s dollars|discounted/i,
      /end-of-month cash flows|monthly effective/i,
      /discount-rate sensitivity/i,
      /free rent waives base rent/i,
      /rent steps|escalat/i,
      /allowance|tenant improvement/i,
      /operating expenses|CAM/i,
      /not legal or investment advice/i,
    ],
  },
  trial: {
    heading: /Trial/i,
    answers: [
      /3-day/i,
      /does not collect a card|no-card|no credit card/i,
      /does not automatically convert/i,
      /after the trial|when 72 hours/i,
    ],
  },
  pricing: {
    heading: /Trial/i,
    answers: [/\$290/, /\$149/, /Professional vs Per-Deal|how do (I|you) choose/i, /billed annually|one-time/i],
  },
  account_saved_work: {
    heading: /Accounts/i,
    answers: [/sign in|account/i, /rename or archive/i, /infinitemediaresources@gmail.com/i, /Suggest an Improvement/i],
  },
  billing: {
    heading: /Billing/i,
    answers: [/checkout/i, /does not charge you|charged when/i, /EVIDENCE_GAP|refund/i],
  },
  limitations_support: {
    heading: /Limitations/i,
    answers: [/not a CRM|not lease.administration/i, /independently verif/i, /incomplete|overlapping or missing/i],
  },
};

export function evaluateFAQCompletenessGate(html: string): NamedDepthGate {
  const reasons: string[] = [];
  const covered: FaqClusterId[] = [];
  for (const cluster of FAQ_QUESTION_CLUSTERS) {
    const spec = CLUSTER_MARKERS[cluster];
    const heading = spec.heading.test(html);
    const hits = spec.answers.filter((pattern) => pattern.test(html)).length;
    if (!heading || hits < Math.min(3, spec.answers.length)) {
      reasons.push(`FAQ_CLUSTER_GAP:${cluster}`);
    } else {
      covered.push(cluster);
    }
  }
  if (/Pricing-page FAQ already covers/i.test(html)) reasons.push("FAQ_RELIES_ON_PRICING_PAGE");
  const headings = [...html.matchAll(/<h3[^>]*>([^<]+)<\/h3>/gi)].map((row) => row[1]!.trim());
  if (headings.length < 12) reasons.push("FAQ_CLUSTER_BREADTH_INSUFFICIENT");
  const answers = [...html.matchAll(/<h3[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/gi)].map((row) => row[1]!.replace(/<[^>]+>/g, "").trim());
  const short = answers.filter((answer) => answer.split(/\s+/).length < 12).length;
  if (answers.length && short / answers.length > 0.45) reasons.push("FAQ_ANSWERS_MOSTLY_ONE_SENTENCE");
  return {
    gate: FAQ_COMPLETENESS_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    ...(covered.length ? { covered } : {}),
  } as NamedDepthGate & { covered?: FaqClusterId[] };
}

export function faqEvidenceGapCount(html: string): number {
  return (html.match(/EVIDENCE_GAP/g) ?? []).length;
}
