import { acceptPublishedProfessionalEmail } from "@/lib/infinity/growth-engine/published-email";
import { qualifySalesProspect } from "@/lib/infinity/venture-sales-floor/qualification";
import { resolveSalesRoomHandoff } from "@/lib/infinity/venture-sales-floor/handoff";
import { OCCUPANCYNPV_MESSAGE_VARIANTS } from "@/lib/infinity/growth-engine/occupancynpv-experiment";
import { localPartsInZone, recipientLocalWindowEligible } from "@/lib/infinity/growth-engine/scheduler-coverage";
import {
  OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
  SALES_DAILY_CAP,
  SALES_INITIAL_RAMP,
  SALES_MAX_TOUCHES,
  SALES_PER_DOMAIN_CAP,
  SALES_PER_RECIPIENT_CAP,
  type FollowUpAction,
  type ResponseClass,
} from "./contract";
import type {
  ContactResolution,
  FollowUpDecision,
  MessageQualityDecision,
  QualificationDecision,
  RateLimitDecision,
  SalesProspectCandidate,
  SequenceTouch,
  WindowDecision,
} from "./types";

const TENANT_ICP = /tenant[-\s]?rep|tenant representation|occupier|lease advisory|commercial lease advisor|tenant-side|commercial leasing|brokerage/i;
const FAKE_CLAIM = /save \$?\d|guaranteed roi|our customers saved|everyone uses|limited time only|act now/i;

export function discoverProspects(candidates: SalesProspectCandidate[]): SalesProspectCandidate[] {
  return candidates.filter((row) =>
    (row.source_url.startsWith("http") || row.source_provider === "prospect_intelligence") &&
    row.public_context.trim().length > 0,
  );
}

export function qualifyProspect(candidate: SalesProspectCandidate): QualificationDecision {
  if (candidate.source_provider === "prospect_intelligence") {
    const channel_eligible = Boolean(candidate.published_email);
    const qualified = channel_eligible && !candidate.suppressed && !candidate.unsubscribed && !candidate.existing_customer;
    return {
      qualified,
      reasons: qualified ? ["PROSPECT_INTELLIGENCE_MATCH"] : [...(channel_eligible ? [] : ["NO_PUBLISHED_CHANNEL"])],
      icp_fit: true,
      role_fit: Boolean(candidate.role),
      company_fit: true,
      channel_eligible,
    };
  }
  const icp = TENANT_ICP.test(`${candidate.role ?? ""} ${candidate.public_context} ${candidate.industry ?? ""}`);
  const role = candidate.role ? TENANT_ICP.test(candidate.role) || /broker|advisor|analyst|consultant/i.test(candidate.role) : false;
  const company = !/residential realtor|home sale|mortgage/i.test(candidate.public_context);
  const base = qualifySalesProspect({
    icp_match: icp,
    role_fit: role,
    company_type_fit: company,
    use_case_fit: /occupancy|lease|npv|tenant/i.test(candidate.public_context),
    commercial_viability: !candidate.existing_customer,
    suppressed: Boolean(candidate.suppressed || candidate.unsubscribed),
    previously_disqualified: Boolean(candidate.existing_opportunity && candidate.existing_customer),
  });
  const channel_eligible = Boolean(candidate.published_email);
  const qualified = base.qualified && channel_eligible && !candidate.existing_customer;
  return {
    qualified,
    reasons: qualified ? ["ICP_FIT"] : [...base.reasons, ...(channel_eligible ? [] : ["NO_PUBLISHED_CHANNEL"])],
    icp_fit: icp,
    role_fit: role,
    company_fit: company,
    channel_eligible,
  };
}

export function resolveSalesContact(candidate: SalesProspectCandidate): ContactResolution {
  if (!candidate.published_email) {
    return { channel: "UNKNOWN", address: "UNKNOWN", fabricated: false, reasons: ["NO_PUBLISHED_CONTACT"] };
  }
  const published = acceptPublishedProfessionalEmail({
    email: candidate.published_email,
    sourceUrl: candidate.source_url,
    sourceText: `${candidate.public_context} ${candidate.published_email}`,
    name: candidate.person_name ?? candidate.business_name,
  });
  if (!published.accepted) {
    return { channel: "UNKNOWN", address: "UNKNOWN", fabricated: false, reasons: [published.reason] };
  }
  return { channel: "BUSINESS_EMAIL", address: candidate.published_email.toLowerCase(), fabricated: false, reasons: ["PUBLISHED_BUSINESS_EMAIL"] };
}

export function evaluateOutboundMessageQuality(input: {
  message: string;
  venture: string;
  recipient_context: string;
  fake_personalization?: boolean;
  first_touch?: boolean;
}): MessageQualityDecision {
  const reasons: string[] = [];
  if (!input.message.toLowerCase().includes(input.venture.toLowerCase())) reasons.push("VENTURE_MISMATCH");
  if (FAKE_CLAIM.test(input.message)) reasons.push("UNSUPPORTED_CLAIM");
  if (input.fake_personalization) reasons.push("FAKE_PERSONALIZATION");
  if (!/occupancy|lease|npv|tenant/i.test(input.message)) reasons.push("NO_REAL_VALUE_PROP");
  if (!/opt[-\s]?out|reply stop|unsubscribe/i.test(input.message)) reasons.push("MISSING_OPT_OUT");
  if (input.first_touch !== false) {
    const firstSentence = input.message.split(/[.!?]/)[0] ?? "";
    if (/^(\s*(hi[^\n]*\n+)?i(['’]m| am) infinity|we built|i work on occupancynpv)/i.test(input.message.trim())) {
      reasons.push("PRODUCT_BEFORE_PAIN");
    }
    if (/we built|i['’]m writing because i work/i.test(firstSentence) && !/spreadsheet|rebuild|messy|manual/i.test(firstSentence)) {
      reasons.push("NO_RECOGNIZABLE_PAIN");
    }
  }
  return { pass: reasons.length === 0, reasons };
}

export function resolveOutboundSequence(maxTouches = SALES_MAX_TOUCHES): SequenceTouch[] {
  const count = Math.min(Math.max(1, maxTouches), SALES_MAX_TOUCHES);
  const first = OCCUPANCYNPV_MESSAGE_VARIANTS[0];
  const second = OCCUPANCYNPV_MESSAGE_VARIANTS[1] ?? first;
  const optOut = " If this is not useful, reply STOP and I will not write again.";
  const touches: SequenceTouch[] = [
    { touch: 1, kind: "INITIAL", subject: first.subject, body: `${first.body}${optOut}` },
    { touch: 2, kind: "FOLLOW_UP", subject: second.subject, body: `${second.body}${optOut}` },
    { touch: 3, kind: "FINAL", subject: first.subject, body: `Short follow-up only: OccupancyNPV still compares tenant occupancy cost side by side at occupancynpv.com.${optOut}` },
  ];
  return touches.slice(0, count);
}

export function resolveSalesFollowUp(input: {
  classification: ResponseClass | "NONE";
  prior_sends: number;
  suppressed: boolean;
  unsubscribed: boolean;
}): FollowUpDecision {
  if (input.unsubscribed || input.classification === "UNSUBSCRIBE" || input.classification === "SPAM_COMPLAINT") {
    return { action: "SUPPRESS", reason: "UNSUBSCRIBE_OR_COMPLAINT" };
  }
  if (input.suppressed) return { action: "STOP", reason: "SUPPRESSED" };
  if (input.classification === "NOT_INTERESTED") return { action: "STOP", reason: "NOT_INTERESTED" };
  if (input.classification === "OUT_OF_OFFICE") return { action: "WAIT", reason: "OOO_NOT_REJECTION" };
  if (input.classification === "BOUNCE") return { action: "SUPPRESS", reason: "HARD_BOUNCE" };
  if (input.classification === "PRICING_QUESTION" || input.classification === "POSITIVE_INTEREST" || input.classification === "DEMO_REQUEST") {
    const handoff = resolveSalesRoomHandoff({ from: "OUTBOUND_ACQUISITION", event: "QUALIFIED_COMMERCIAL_INTENT" });
    return { action: "HANDOFF", reason: input.classification, handoff_room: handoff.to };
  }
  if (input.prior_sends >= SALES_MAX_TOUCHES) return { action: "STOP", reason: "SEQUENCE_CAP" };
  if (input.classification === "NONE" || input.classification === "UNKNOWN") {
    return { action: input.prior_sends === 0 ? "FOLLOW_UP" : "WAIT", reason: "NO_REPLY_YET" };
  }
  return { action: "WAIT", reason: input.classification };
}

export function evaluateSalesOutboundRateLimit(input: {
  daily_sent: number;
  domain_sent: number;
  recipient_sent: number;
  ramp?: boolean;
}): RateLimitDecision {
  const daily = input.ramp === false ? SALES_DAILY_CAP : SALES_INITIAL_RAMP;
  const reasons: string[] = [];
  if (input.daily_sent >= daily) reasons.push("DAILY_CAP");
  if (input.domain_sent >= SALES_PER_DOMAIN_CAP) reasons.push("DOMAIN_CAP");
  if (input.recipient_sent >= SALES_PER_RECIPIENT_CAP) reasons.push("RECIPIENT_CAP");
  return { allowed: reasons.length === 0, reasons, daily_cap: SALES_DAILY_CAP, ramp_cap: daily };
}

export function evaluateRecipientLocalWindow(input: {
  now: string;
  timezone: string | null;
  timezone_basis: string | null;
}): WindowDecision {
  if (!input.timezone || !input.timezone_basis) {
    return { eligible: false, timezone: "UNKNOWN", fabricated: false, reasons: ["TIMEZONE_UNKNOWN"] };
  }
  const parts = localPartsInZone(input.now, input.timezone);
  if (parts.weekday === 0 || parts.weekday === 6) {
    return { eligible: false, timezone: input.timezone, fabricated: false, reasons: ["WEEKEND"] };
  }
  if (!recipientLocalWindowEligible(parts.hour, parts.minute)) {
    return { eligible: false, timezone: input.timezone, fabricated: false, reasons: ["OUTSIDE_WINDOW"] };
  }
  return { eligible: true, timezone: input.timezone, fabricated: false, reasons: ["LOCAL_WINDOW"] };
}

export function classifySalesReply(text: string): ResponseClass {
  const value = text.toLowerCase();
  if (/^\s*stop\s*$/im.test(text) || /unsubscribe|opt[-\s]?out|stop contacting|remove me/.test(value)) return "UNSUBSCRIBE";
  if (/out of office|on leave|parental leave/.test(value)) return "OUT_OF_OFFICE";
  if (/mailbox not found|user unknown|550 5\.1\.1/.test(value)) return "BOUNCE";
  if (/spam|abuse@/.test(value)) return "SPAM_COMPLAINT";
  if (/not interested|no thanks|please don't/.test(value)) return "NOT_INTERESTED";
  if (/wrong person|not my role/.test(value)) return "WRONG_PERSON";
  if (/price|pricing|how much|professional plan|per-deal/.test(value)) return "PRICING_QUESTION";
  if (/demo|walkthrough|show me/.test(value)) return "DEMO_REQUEST";
  if (/partner|affiliate|referral program/.test(value)) return "REFERRAL";
  if (/later|next quarter|not now/.test(value)) return "NOT_NOW";
  if (/sounds interesting|tell me .{0,24}more|how (does|do) .{0,48}work|who(?:'s| is) (?:it )?best for/.test(value)) {
    return "POSITIVE_INTEREST";
  }
  if (/interested|let's talk|sounds useful/.test(value)) return "POSITIVE_INTEREST";
  if (/\?/.test(value)) return "QUESTION";
  return "UNKNOWN";
}

export function routeReplyToRoom(classification: ResponseClass): FollowUpDecision {
  if (classification === "REFERRAL") {
    return { action: "HANDOFF", reason: classification, handoff_room: "PARTNERSHIPS_CHANNEL" };
  }
  if (classification === "DEMO_REQUEST") {
    const inbound = resolveSalesRoomHandoff({ from: "OUTBOUND_ACQUISITION", event: "INBOUND_ACTIVE" });
    return { action: "HANDOFF", reason: classification, handoff_room: inbound.to };
  }
  return resolveSalesFollowUp({ classification, prior_sends: 1, suppressed: false, unsubscribed: false });
}

export function routeTrialStart() {
  return resolveSalesRoomHandoff({ from: "OUTBOUND_ACQUISITION", event: "ACCOUNT_OR_TRIAL_CREATED" });
}

export function routeWonDeal() {
  return resolveSalesRoomHandoff({ from: "OFFER_CLOSING", event: "WON_AND_ACTIVATED" });
}

export function occupancyCampaignId(): string {
  return OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID;
}
