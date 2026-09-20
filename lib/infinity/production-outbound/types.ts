import type { OutboundChannel, OutboundMode } from "./contract";

export type OutboundLimits = {
  max_sends_per_hour: number;
  max_sends_per_day: number;
  max_sends_per_venture: number;
  max_sends_per_prospect: number;
  max_followups: number;
};

export type OutboundChannelFlags = {
  email_enabled: boolean;
  sms_enabled: boolean;
  phone_enabled: boolean;
  other_channel_enabled: boolean;
};

export type ProductionOutboundControl = {
  mode: OutboundMode;
  requested_mode: OutboundMode;
  kill_switch: boolean;
  venture_outbound_enabled: Record<string, boolean>;
  channels: OutboundChannelFlags;
  limits: OutboundLimits;
  autonomy_ready: boolean;
  policy_version: string;
};

export type OutboundUsage = {
  hour_key: string;
  day_key: string;
  hourly: number;
  daily: number;
  by_venture: Record<string, number>;
  by_channel: Record<string, number>;
  by_prospect: Record<string, number>;
  followups: number;
};

export type OutboundProviderReadiness = {
  bound: boolean;
  credentials_present: boolean;
  healthy: boolean;
  sending_identity_verified: boolean;
  reply_path_configured: boolean;
  bounce_path_configured: boolean;
  unsubscribe_path_configured: boolean;
  token_exchange?: boolean;
  send_scope?: boolean;
  readonly_scope?: boolean;
  userinfo_scope?: boolean;
  credential_fingerprint?: string | null;
  provider: string;
  reasons: string[];
};

export type OutboundAuthorizationDecision = {
  prospectId: string;
  ventureId: string;
  channel: OutboundChannel;
  allowed: boolean;
  reasons: string[];
  evaluatedAt: string;
  policyVersion: string;
  mode: OutboundMode;
};

export type OutboxStatus =
  | "AUTHORIZED"
  | "QUEUED"
  | "CLAIMED"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "BOUNCED"
  | "FAILED"
  | "REJECTED"
  | "SUPPRESSED"
  | "CANCELLED";

export type OutboundOutboxRecord = {
  id: string;
  idempotency_key: string;
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  channel: OutboundChannel;
  status: OutboxStatus;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
  claimed_at: string | null;
  sent_at: string | null;
  completed: boolean;
};

export type OutboundProviderEvent = {
  id: string;
  outbox_id: string;
  kind: "accepted" | "sent" | "delivered" | "bounced" | "failed" | "rejected" | "replied" | "opt_out";
  at: string;
  fabricated: false;
};

export type OutboundMetrics = {
  authorized: number;
  blocked: number;
  provider_accepts: number;
  sent: number;
  delivered: number;
  bounced: number;
  replies: number;
  positive_replies: number;
  negative_replies: number;
  opt_outs: number;
  complaints: number;
  meetings: number;
  duplicates_prevented: number;
  kill_switch_events: number;
  last_failure_category: string | null;
};

export type ProductionOutboundState = {
  control: ProductionOutboundControl;
  usage: OutboundUsage;
  outbox: OutboundOutboxRecord[];
  decisions: OutboundAuthorizationDecision[];
  events: OutboundProviderEvent[];
  metrics: OutboundMetrics;
  last_tick_at: string | null;
};

export type OutboundSendRequest = {
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  channel: OutboundChannel;
  now: string;
  isolated_runtime: boolean;
  suppressed: boolean;
  unsubscribed: boolean;
  communication_eligible: boolean;
  contact_valid: boolean;
  timezone: string | null;
  timezone_basis: string | null;
  prior_touches: number;
  follow_up: boolean;
  in_thread_reply?: boolean;
  provider: OutboundProviderReadiness;
  idempotency_key: string;
};
