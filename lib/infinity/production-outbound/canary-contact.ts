import { createHash } from "node:crypto";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID } from "@/lib/infinity/autonomous-sales-execution/contract";
import type { SalesProspectCandidate } from "@/lib/infinity/autonomous-sales-execution/types";
import { DEFAULT_CANARY_VENTURE_ID } from "./contract";

export const APPROVED_CANARY_PROSPECT_ID = "canary:founder-controlled:v1" as const;

export type ApprovedCanaryContact = {
  present: boolean;
  enabled: boolean;
  timezone_known: boolean;
  email_valid: boolean;
  fingerprint: string | null;
  domain: string | null;
  candidate: SalesProspectCandidate | null;
  reasons: string[];
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function redactEmail(email: string): { fingerprint: string; domain: string } {
  const domain = email.split("@")[1]?.toLowerCase() ?? "unknown";
  return {
    fingerprint: createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12),
    domain,
  };
}

export function resolveApprovedCanaryEmail(env: NodeJS.Dict<string> = process.env): string {
  const raw = (env.OUTBOUND_CANARY_EMAIL || env.GMAIL_SENDER_EMAIL || "").trim().toLowerCase();
  return raw;
}

export function inspectApprovedCanaryContact(env: NodeJS.Dict<string> = process.env): ApprovedCanaryContact {
  const enabled = parseBoolean(env.OUTBOUND_CANARY_ENABLED, false);
  const email = resolveApprovedCanaryEmail(env);
  const timezone = (env.OUTBOUND_CANARY_TIMEZONE || "").trim();
  const timezoneBasis = (env.OUTBOUND_CANARY_TIMEZONE_BASIS || "founder_declared").trim();
  const reasons: string[] = [];
  if (!enabled) reasons.push("CANARY_OVERRIDE_DISABLED");
  if (!email) reasons.push("CANARY_EMAIL_MISSING");
  if (email.endsWith(".invalid") || email.includes("example.invalid")) reasons.push("CANARY_EMAIL_INVALID");
  if (!email.includes("@") || email.startsWith("@")) reasons.push("CANARY_EMAIL_MALFORMED");
  if (!timezone) reasons.push("CANARY_TIMEZONE_UNKNOWN");
  const email_valid = Boolean(email) && email.includes("@") && !email.endsWith(".invalid") && !email.includes("example.invalid");
  const timezone_known = Boolean(timezone);
  const redacted = email_valid ? redactEmail(email) : { fingerprint: null, domain: null };
  if (!enabled || !email_valid || !timezone_known) {
    return {
      present: email_valid,
      enabled,
      timezone_known,
      email_valid,
      fingerprint: redacted.fingerprint,
      domain: redacted.domain,
      candidate: null,
      reasons: reasons.length ? reasons : ["CANARY_NOT_READY"],
    };
  }
  return {
    present: true,
    enabled: true,
    timezone_known: true,
    email_valid: true,
    fingerprint: redacted.fingerprint,
    domain: redacted.domain,
    candidate: {
      prospect_id: APPROVED_CANARY_PROSPECT_ID,
      venture_id: DEFAULT_CANARY_VENTURE_ID,
      campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
      business_name: "Infinity founder-controlled canary",
      person_name: "Founder canary",
      role: "Tenant representation broker",
      industry: "commercial real estate",
      geography: timezone,
      public_context: "Founder-approved OccupancyNPV canary recipient for production outbound proof.",
      source_url: "canonical://production-outbound/canary",
      source_provider: "prospect_intelligence",
      published_email: email,
      timezone,
      timezone_basis: timezoneBasis,
      suppressed: parseBoolean(env.OUTBOUND_CANARY_SUPPRESSED, false),
      unsubscribed: parseBoolean(env.OUTBOUND_CANARY_SUPPRESSED, false),
    },
    reasons: ["APPROVED_CANARY_ATTACHED"],
  };
}

export function resolveApprovedCanaryCandidates(env: NodeJS.Dict<string> = process.env): SalesProspectCandidate[] {
  const inspected = inspectApprovedCanaryContact(env);
  return inspected.candidate ? [inspected.candidate] : [];
}
