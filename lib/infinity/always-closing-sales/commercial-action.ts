export const COMMERCIAL_ACTIONS = [
  "ANSWER_QUESTION",
  "ASK_QUALIFYING_QUESTION",
  "CLARIFY_PAIN",
  "SHOW_EXAMPLE",
  "SHOW_PROOF",
  "SEND_RESOURCE",
  "INVITE_TRIAL",
  "START_TRIAL",
  "INVITE_DEMO",
  "BOOK_DEMO",
  "REQUEST_NUMBERS",
  "BUILD_SCENARIO",
  "SEND_PROPOSAL",
  "REQUEST_PURCHASE",
  "FOLLOW_UP",
  "HANDLE_OBJECTION",
  "REACTIVATE",
  "ASK_FOR_REFERRAL",
  "OFFER_UPSELL",
  "OFFER_RENEWAL",
  "WAIT",
  "SUPPRESS",
] as const;

export type CommercialAction = (typeof COMMERCIAL_ACTIONS)[number];

export type ParsedCommercialAction =
  | { ok: true; value: CommercialAction; raw: string }
  | { ok: false; value: null; raw: string; reason: "UNKNOWN_COMMERCIAL_ACTION" };

export function parseCommercialAction(raw: unknown): ParsedCommercialAction {
  if (typeof raw !== "string") {
    return { ok: false, value: null, raw: raw == null ? "" : String(raw), reason: "UNKNOWN_COMMERCIAL_ACTION" };
  }
  for (const action of COMMERCIAL_ACTIONS) {
    if (action === raw) {
      return { ok: true, value: action, raw };
    }
  }
  return { ok: false, value: null, raw, reason: "UNKNOWN_COMMERCIAL_ACTION" };
}
