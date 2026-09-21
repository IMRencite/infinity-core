import type { SalesRoomId } from "@/lib/infinity/venture-sales-floor/contract";
import type { FollowUpAction, ObjectionClass, ResponseClass } from "./contract";

export type SalesContactChannel = "BUSINESS_EMAIL" | "CONTACT_FORM" | "PROFESSIONAL_NETWORK" | "BUSINESS_PHONE" | "UNKNOWN";

export type SalesProspectCandidate = {
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  business_name: string;
  person_name: string | null;
  role: string | null;
  industry: string | null;
  geography: string | null;
  public_context: string;
  source_url: string;
  source_provider: string;
  published_email: string | null;
  timezone: string | null;
  timezone_basis: string | null;
  existing_customer?: boolean;
  existing_opportunity?: boolean;
  suppressed?: boolean;
  unsubscribed?: boolean;
  prior_touches?: number;
  last_touch_at?: string | null;
  last_idempotency_key?: string | null;
};

export type QualificationDecision = {
  qualified: boolean;
  reasons: string[];
  icp_fit: boolean;
  role_fit: boolean;
  company_fit: boolean;
  channel_eligible: boolean;
};

export type ContactResolution = {
  channel: SalesContactChannel;
  address: string | "UNKNOWN";
  fabricated: false;
  reasons: string[];
};

export type MessageQualityDecision = {
  pass: boolean;
  reasons: string[];
};

export type SequenceTouch = {
  touch: number;
  kind: "INITIAL" | "FOLLOW_UP" | "FINAL";
  body: string;
  subject: string;
};

export type FollowUpDecision = {
  action: FollowUpAction;
  reason: string;
  handoff_room?: SalesRoomId;
};

export type RateLimitDecision = {
  allowed: boolean;
  reasons: string[];
  daily_cap: number;
  ramp_cap: number;
};

export type WindowDecision = {
  eligible: boolean;
  timezone: string | "UNKNOWN";
  fabricated: false;
  reasons: string[];
};

export type ReplyRecord = {
  message_id: string;
  thread_id: string;
  prospect_id: string;
  venture_id: string;
  campaign_id: string;
  at: string;
  raw_class_evidence: string;
  classification: ResponseClass;
  original_preserved: true;
};

export type SalesActionAudit = {
  venture_id: string;
  room: SalesRoomId;
  campaign_id: string;
  prospect_id: string;
  qualification: string[];
  message_version: string;
  provider: string;
  at: string;
  delivery_state: "NOT_SENT" | "ATTEMPTED" | "DELIVERED" | "BOUNCED" | "PROVIDER_FAILURE";
  reply_state: ResponseClass | "NONE";
  next_action: string;
  idempotency_key: string;
};

export type SalesExecutionSnapshot = {
  campaign_id: string;
  duplicate_campaign: false;
  qualified_prospects: number;
  qualified_contacts: number;
  real_outreach_eligible: boolean;
  attempted: number;
  delivered: number;
  bounced: number;
  replies: number;
  positive_replies: number;
  trial_starts: number;
  opportunities: number;
  purchases: number;
  no_send_reason: string | null;
  founder_approval_per_send: false;
};

export type SalesIntelligenceEvidence = {
  outcome: "SEND" | "REPLY" | "TRIAL" | "OBJECTION" | "WIN" | "LOSS" | "TECHNICAL_FAILURE";
  fabricated: false;
  objection?: ObjectionClass;
};
