import type { CustomerPageDepthScorecard } from "./types";

export function hqCustomerPageDepthFields(scorecard: CustomerPageDepthScorecard | null): {
  page: string;
  information_depth: string;
  question_coverage: string;
  product_understanding: string;
  buyer_decision_support: string;
  information_gain: string;
  thinness: string;
  missing_material_questions: number;
} {
  return {
    page: scorecard?.page ?? "UNKNOWN",
    information_depth: scorecard?.information_depth ?? "UNVERIFIED",
    question_coverage: scorecard?.question_coverage ?? "UNVERIFIED",
    product_understanding: scorecard?.product_understanding ?? "UNVERIFIED",
    buyer_decision_support: scorecard?.buyer_decision_support ?? "UNVERIFIED",
    information_gain: scorecard?.information_gain ?? "UNVERIFIED",
    thinness: scorecard?.thinness ?? "UNVERIFIED",
    missing_material_questions: scorecard?.missing_material_questions ?? 0,
  };
}
