export type SuggestionDecision =
  | "RECEIVED"
  | "DEDUPED"
  | "BLOCK_IP_REVIEW"
  | "PRODUCT_OPPORTUNITY_CREATED";

const BLOCKED_MARKS = ["harley-davidson", "yamaha", "honda", "ducati", "indian motorcycle"];

export function evaluateDesignSuggestion(input: {
  text: string;
  prior?: string[];
}): { status: SuggestionDecision; is_authorization_to_publish: false } {
  const text = input.text.trim().toLowerCase();
  if (!text) return { status: "RECEIVED", is_authorization_to_publish: false };
  if ((input.prior ?? []).some((row) => row.trim().toLowerCase() === text)) {
    return { status: "DEDUPED", is_authorization_to_publish: false };
  }
  if (BLOCKED_MARKS.some((mark) => text.includes(mark))) {
    return { status: "BLOCK_IP_REVIEW", is_authorization_to_publish: false };
  }
  return { status: "PRODUCT_OPPORTUNITY_CREATED", is_authorization_to_publish: false };
}
