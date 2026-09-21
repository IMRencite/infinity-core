import { FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS } from "@/lib/infinity/venture-operating-scale/legal-facts";

export function askReviewOperatorFacts() {
  const facts = FOUNDER_CONFIRMED_OCCUPANCYNPV_LEGAL_FACTS;
  return {
    legalEntity: facts.legal_entity,
    address: facts.company_address,
    jurisdiction: facts.jurisdiction,
    supportEmail: facts.support_email,
    privacyOperator: facts.privacy_operator,
    termsOperator: facts.terms_operator,
  };
}

export function askReviewDataInventory() {
  return {
    collected: [
      "account email",
      "password hash or Supabase Auth credential verifier (never plaintext password)",
      "session identifier",
      "business/location name",
      "Google Place ID when provided",
      "supported Maps or review URL when provided",
      "generated review URL",
      "generated QR SVG",
      "generated review-request copy",
      "kit history for a location (bounded)",
      "operational events (generate/sign-in/archive) for recovery and support",
    ],
    notCollected: [
      "payment card numbers",
      "SMS or email recipient lists",
      "Google account credentials",
      "review content written by customers",
      "precise device geolocation",
      "third-party advertising cookies on AskReview surfaces",
    ],
    notClaimed: [
      "SOC 2",
      "HIPAA",
      "Google partnership",
      "Google certification",
      "GDPR certification",
    ],
    processors: [
      "Infinity application hosting (when deployed)",
      "Supabase Auth and Postgres when production persistence is enabled",
    ],
    sending: "AskReview does not send SMS or email in V1.",
  };
}

export function askReviewUnsupportedClaims(): string[] {
  return [];
}

export function askReviewGooglePartnershipImplication(): "NONE" {
  return "NONE";
}
