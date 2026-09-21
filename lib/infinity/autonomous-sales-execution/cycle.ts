import { evaluateQualifiedProspectSourceAuthorizationGate } from "@/lib/infinity/growth-engine/prospect-source";
import { nextEligibleSalesCandidates } from "@/lib/infinity/prospect-intelligence/sales-bridge";
import { createProspectIntelligenceService } from "@/lib/infinity/prospect-intelligence/service";
import { getDefaultProspectGraph, type ProspectGraph } from "@/lib/infinity/prospect-intelligence/store";
import { OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID, SALES_INITIAL_RAMP } from "./contract";
import {
  classifySalesReply,
  discoverProspects,
  qualifyProspect,
  resolveOutboundSequence,
  resolveSalesContact,
  resolveSalesFollowUp,
  routeReplyToRoom,
  routeTrialStart,
  routeWonDeal,
} from "./engines";
import { evaluateAutonomousOutboundExecutionPolicy, rememberSalesIdempotency, salesIdempotencyKey } from "./policy";
import type { ReplyRecord, SalesExecutionSnapshot, SalesIntelligenceEvidence, SalesProspectCandidate } from "./types";

const intelligence: SalesIntelligenceEvidence[] = [];
const replies: ReplyRecord[] = [];

export function ingestSalesReply(input: {
  message_id: string;
  thread_id: string;
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  at: string;
  text: string;
}): ReplyRecord & { wakes_runtime: true } {
  const classification = classifySalesReply(input.text);
  const record: ReplyRecord = {
    message_id: input.message_id,
    thread_id: input.thread_id,
    prospect_id: input.prospect_id,
    venture_id: input.venture_id,
    campaign_id: input.campaign_id,
    at: input.at,
    raw_class_evidence: input.text,
    classification,
    original_preserved: true,
  };
  replies.push(record);
  if (classification !== "UNKNOWN") {
    intelligence.push({ outcome: "REPLY", fabricated: false });
  }
  return { ...record, wakes_runtime: true };
}

export function salesIntelligenceEvidence(): SalesIntelligenceEvidence[] {
  return [...intelligence];
}

export function executeAutonomousSalesCycle(input: {
  now?: string;
  candidates?: SalesProspectCandidate[];
  executeSend?: boolean;
  isolated_runtime?: boolean;
  provider_healthy?: boolean;
  store?: Set<string>;
  daily_sent?: number;
  graph?: ProspectGraph;
} = {}): SalesExecutionSnapshot & {
  sequence_ready: boolean;
  handoffs: string[];
  send_attempted: number;
} {
  const now = input.now ?? new Date().toISOString();
  const fromIntelligence = input.candidates?.length
    ? []
    : nextEligibleSalesCandidates({
        service: createProspectIntelligenceService(input.graph ?? getDefaultProspectGraph()),
        venture_id: "occupancynpv",
        campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
        capacity: SALES_INITIAL_RAMP,
        now,
      });
  const discovered = discoverProspects(input.candidates?.length ? input.candidates : fromIntelligence);
  const source = evaluateQualifiedProspectSourceAuthorizationGate();
  const qualified = discovered.filter((row) => qualifyProspect(row).qualified);
  const contacts = qualified.filter((row) => resolveSalesContact(row).address !== "UNKNOWN").slice(0, SALES_INITIAL_RAMP);
  const sequence = resolveOutboundSequence();
  const handoffs = [
    routeTrialStart().to,
    routeReplyToRoom("PRICING_QUESTION").handoff_room ?? "",
    routeReplyToRoom("REFERRAL").handoff_room ?? "",
    routeWonDeal().to,
  ];
  let attempted = 0;
  const noSendReasons: string[] = [];
  if (source.result !== "PASS") noSendReasons.push("SOURCE_NOT_LIVE_VERIFIED");
  if (!input.isolated_runtime) noSendReasons.push("ISOLATED_RUNTIME_REQUIRED_FOR_LIVE_SEND");
  if (contacts.length === 0) noSendReasons.push("NO_QUALIFIED_PROSPECTS_WITH_VERIFIED_CONTACT");
  if (input.executeSend && input.isolated_runtime && contacts.length > 0) {
    for (const prospect of contacts) {
      const touch = (prospect.prior_touches ?? 0) + 1;
      const message = sequence[Math.min(touch, sequence.length) - 1]!;
      const policy = evaluateAutonomousOutboundExecutionPolicy({
        candidate: prospect,
        message: `${message.body} If this is not useful, reply STOP and I will not write again.`,
        now,
        daily_sent: (input.daily_sent ?? 0) + attempted,
        domain_sent: 0,
        recipient_sent: prospect.prior_touches ?? 0,
        provider_healthy: input.provider_healthy !== false,
        touch,
        store: input.store,
      });
      if (!policy.authorized) {
        noSendReasons.push(...policy.reasons);
        continue;
      }
      const key = salesIdempotencyKey({ prospect_id: prospect.prospect_id, campaign_id: prospect.campaign_id, touch });
      if (!rememberSalesIdempotency(key, input.store)) continue;
      attempted += 1;
    }
  }
  return {
    campaign_id: OCCUPANCYNPV_FIRST_OUTBOUND_CAMPAIGN_ID,
    duplicate_campaign: false,
    qualified_prospects: qualified.length,
    qualified_contacts: contacts.length,
    real_outreach_eligible: Boolean(input.isolated_runtime && contacts.length > 0 && source.result === "PASS"),
    attempted,
    delivered: 0,
    bounced: 0,
    replies: replies.length,
    positive_replies: replies.filter((row) => row.classification === "POSITIVE_INTEREST").length,
    trial_starts: 0,
    opportunities: 0,
    purchases: 0,
    no_send_reason: attempted === 0 ? [...new Set(noSendReasons)].join("|") || "NO_JUSTIFIED_SEND" : null,
    founder_approval_per_send: false,
    sequence_ready: sequence.length > 0,
    handoffs,
    send_attempted: attempted,
  };
}

export function followUpAfterReply(classification: Parameters<typeof resolveSalesFollowUp>[0]["classification"], prior = 1) {
  return resolveSalesFollowUp({ classification, prior_sends: prior, suppressed: false, unsubscribed: classification === "UNSUBSCRIBE" });
}
