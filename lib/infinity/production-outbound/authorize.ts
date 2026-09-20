import { evaluateRecipientLocalWindow } from "@/lib/infinity/autonomous-sales-execution/engines";
import { PRODUCTION_OUTBOUND_POLICY_VERSION } from "./contract";
import { channelEnabled, ventureOutboundEnabled } from "./control";
import type {
  OutboundAuthorizationDecision,
  OutboundSendRequest,
  OutboundUsage,
  ProductionOutboundControl,
} from "./types";

export function authorizeOutboundSend(input: {
  request: OutboundSendRequest;
  control: ProductionOutboundControl;
  usage: OutboundUsage;
  already_sent?: boolean;
}): OutboundAuthorizationDecision {
  const { request, control, usage } = input;
  const reasons: string[] = [];
  if (control.mode === "DISABLED") reasons.push("OUTBOUND_DISABLED");
  if (control.kill_switch) reasons.push("GLOBAL_KILL_SWITCH");
  if (!request.isolated_runtime) reasons.push("ISOLATED_RUNTIME_REQUIRED");
  if (!ventureOutboundEnabled(control, request.venture_id)) reasons.push("VENTURE_OUTBOUND_DISABLED");
  if (!channelEnabled(control, request.channel)) reasons.push("CHANNEL_DISABLED");
  if (!request.provider.bound) reasons.push("PROVIDER_NOT_BOUND");
  if (!request.provider.credentials_present) reasons.push("PROVIDER_CREDENTIALS_MISSING");
  if (!request.provider.healthy) reasons.push("PROVIDER_UNHEALTHY");
  if (!request.provider.sending_identity_verified) reasons.push("SENDING_IDENTITY_UNVERIFIED");
  if (!request.provider.reply_path_configured) reasons.push("REPLY_PATH_MISSING");
  if (!request.provider.bounce_path_configured) reasons.push("BOUNCE_PATH_MISSING");
  if (request.channel === "email" && !request.provider.unsubscribe_path_configured) reasons.push("UNSUBSCRIBE_PATH_MISSING");
  if (!request.communication_eligible) reasons.push("COMMUNICATION_INELIGIBLE");
  if (!request.contact_valid) reasons.push("CONTACT_INVALID");
  if (request.suppressed || request.unsubscribed) reasons.push("SUPPRESSED");
  if (input.already_sent) reasons.push("DUPLICATE_TOUCH");
  if (usage.hourly >= control.limits.max_sends_per_hour) reasons.push("HOURLY_CAP");
  if (usage.daily >= control.limits.max_sends_per_day) reasons.push("DAILY_LIMIT_REACHED");
  if ((usage.by_venture[request.venture_id] ?? 0) >= control.limits.max_sends_per_venture) reasons.push("VENTURE_CAP");
  if ((usage.by_channel[request.channel] ?? 0) >= control.limits.max_sends_per_day) reasons.push("CHANNEL_CAP");
  if (!request.in_thread_reply && (usage.by_prospect[request.prospect_id] ?? 0) >= control.limits.max_sends_per_prospect) reasons.push("PROSPECT_CAP");
  if ((request.follow_up || request.in_thread_reply) && usage.followups >= control.limits.max_followups) reasons.push("FOLLOWUP_CAP");
  const window = evaluateRecipientLocalWindow({
    now: request.now,
    timezone: request.timezone,
    timezone_basis: request.timezone_basis,
  });
  if (!window.eligible) reasons.push(...window.reasons);
  return {
    prospectId: request.prospect_id,
    ventureId: request.venture_id,
    channel: request.channel,
    allowed: reasons.length === 0,
    reasons: reasons.length ? reasons : ["AUTHORIZED"],
    evaluatedAt: request.now,
    policyVersion: PRODUCTION_OUTBOUND_POLICY_VERSION,
    mode: control.mode,
  };
}

export function evaluateSuppressedRecipientEligibility(input: {
  request: OutboundSendRequest;
  control: ProductionOutboundControl;
  usage: OutboundUsage;
  suppressed: boolean;
}): { eligibility: "BLOCKED" | "ALLOWED"; providerCalled: false; decision: OutboundAuthorizationDecision } {
  const decision = authorizeOutboundSend({
    request: { ...input.request, suppressed: input.suppressed || input.request.suppressed },
    control: input.control,
    usage: input.usage,
  });
  return {
    eligibility: decision.allowed ? "ALLOWED" : "BLOCKED",
    providerCalled: false,
    decision,
  };
}

export function recordOutboundUsage(usage: OutboundUsage, request: OutboundSendRequest): OutboundUsage {
  return {
    ...usage,
    hourly: usage.hourly + 1,
    daily: usage.daily + 1,
    by_venture: {
      ...usage.by_venture,
      [request.venture_id]: (usage.by_venture[request.venture_id] ?? 0) + 1,
    },
    by_channel: {
      ...usage.by_channel,
      [request.channel]: (usage.by_channel[request.channel] ?? 0) + 1,
    },
    by_prospect: {
      ...usage.by_prospect,
      [request.prospect_id]: (usage.by_prospect[request.prospect_id] ?? 0) + 1,
    },
    followups: usage.followups + (request.follow_up ? 1 : 0),
  };
}
