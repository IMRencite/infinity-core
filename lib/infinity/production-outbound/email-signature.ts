import { OCCUPANCYNPV_DOMAIN } from "@/lib/infinity/growth-engine/venture-identity";

export const OUTBOUND_EMAIL_SIGNATURE_STANDARD = "OutboundEmailSignatureStandard" as const;

export function ventureEmailSignature(input: { ventureName: string; canonicalUrl: string }): string {
  const host = input.canonicalUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return `— Infinity\nIMR’s autonomous venture operating system\n${input.ventureName} | ${host}`;
}

export const OCCUPANCYNPV_EMAIL_SIGNATURE = ventureEmailSignature({
  ventureName: "OccupancyNPV",
  canonicalUrl: OCCUPANCYNPV_DOMAIN,
});

export function evaluateOutboundEmailSignatureStandard(input: {
  body: string;
  expected?: string;
}): { gate: typeof OUTBOUND_EMAIL_SIGNATURE_STANDARD; result: "PASS" | "FAIL"; reasons: string[] } {
  const expected = input.expected ?? OCCUPANCYNPV_EMAIL_SIGNATURE;
  const reasons: string[] = [];
  if (!input.body.includes(expected)) reasons.push("SIGNATURE_MISSING");
  if (/linkedin\.com|twitter\.com|instagram\.com|facebook\.com|x\.com/i.test(input.body)) {
    reasons.push("SOCIAL_LINKS");
  }
  if (/book a (call|demo)|schedule time|calendly/i.test(input.body) && /can send|example|want/i.test(input.body)) {
    reasons.push("MULTIPLE_CTAS");
  }
  return {
    gate: OUTBOUND_EMAIL_SIGNATURE_STANDARD,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["VENTURE_SIGNATURE"],
  };
}
