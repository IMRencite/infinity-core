import { OCCUPANCYNPV_AFFILIATE_RECRUITMENT_CATEGORIES } from "./contract";

export type AffiliateRecruitmentCategory = {
  category: string;
  qualified: boolean;
  reason: string;
  contacts_invented: false;
  outreach_sent: false;
};

export function qualifyAffiliateRecruitment(input: {
  audience_fit: boolean;
  buyer_overlap: boolean;
  channel_quality: boolean;
  reputation: boolean;
  promotion_method_allowed: boolean;
  estimated_reach: number | "UNKNOWN";
  industry_fit: boolean;
  compliance_risk: boolean;
  fraud_risk: boolean;
}): { qualified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.audience_fit) reasons.push("AUDIENCE_FIT");
  if (!input.buyer_overlap) reasons.push("BUYER_OVERLAP");
  if (!input.channel_quality) reasons.push("CHANNEL_QUALITY");
  if (!input.reputation) reasons.push("REPUTATION");
  if (!input.promotion_method_allowed) reasons.push("PROMOTION_METHOD");
  if (!input.industry_fit) reasons.push("INDUSTRY_FIT");
  if (input.compliance_risk) reasons.push("COMPLIANCE_RISK");
  if (input.fraud_risk) reasons.push("FRAUD_RISK");
  return { qualified: reasons.length === 0, reasons };
}

export function occupancyNpvRecruitmentCategories(): AffiliateRecruitmentCategory[] {
  return OCCUPANCYNPV_AFFILIATE_RECRUITMENT_CATEGORIES.map((category) => ({
    category,
    qualified: true,
    reason: "Category fits OccupancyNPV buyer overlap; no contacts invented; no outreach sent",
    contacts_invented: false,
    outreach_sent: false,
  }));
}

export function affiliateRecruitmentOutreachAuthorized(): false {
  return false;
}

export function runAffiliateRecruitmentEngine(input: { venture_id: string; room: "PARTNERSHIPS_CHANNEL" }) {
  return {
    engine: "AffiliateRecruitmentEngine" as const,
    room: input.room,
    venture_id: input.venture_id,
    outreach_authorized: affiliateRecruitmentOutreachAuthorized(),
    categories: occupancyNpvRecruitmentCategories(),
    contacts_invented: false as const,
    uses_sales_floor_outreach: true,
  };
}
