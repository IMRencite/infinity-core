import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";

export const INBOUND_RUNTIME = "InboundCommunicationRuntime" as const;
export const INBOUND_MISSION = "INBOUND_COMMUNICATION_AUTONOMOUS_CONVERSATION_RUNTIME_V1" as const;
export const INBOUND_MISSION_ID = "msn_inbound_communication_autonomous_conversation_v1" as const;
export const INBOUND_SOURCE = "inbound_communication_runtime_v1" as const;

export const INFINITY_MANAGED_SENDER = "infinitemediaresources@gmail.com" as const;
export const CRE_CHANNEL = "bounded_professional_outreach" as const;
export const GMAIL_PROVIDER_ID = "gmail.com_v1" as const;

export const CALEB_PROSPECT_ID = "prs_089dad6786418f4b" as const;
export const CALEB_ATTEMPT_ID = "att_1898a339925b07c4" as const;
export const CALEB_PROVIDER_MESSAGE_ID = "1a0631f98c277314" as const;
export const CALEB_PROVIDER_THREAD_ID = "1a0631f98c277314" as const;
export const CALEB_CONVERSATION_ID = "cnv_ff749bc4cff5d045" as const;
export const CALEB_EMAIL = "caleb.struewing@jll.com" as const;

export const MICHAEL_PROSPECT_ID = "prs_595d8aa946521b71" as const;
export const MICHAEL_ATTEMPT_ID = "att_b0483f8b754ce12d" as const;
export const MICHAEL_PROVIDER_MESSAGE_ID = "1a0631f9b3cfd151" as const;
export const MICHAEL_PROVIDER_THREAD_ID = "1a0631f9b3cfd151" as const;
export const MICHAEL_CONVERSATION_ID = "cnv_c0e5bd3a282977c0" as const;
export const MICHAEL_EMAIL = "mvizzone@tenantadvisors.com" as const;

export const BEN_PROSPECT_ID = "prs_0ec2773f4c21713c" as const;
export const STEPHANIE_PROSPECT_ID = "prs_4fb32c29477ab519" as const;

export const LOCKED_ORG = LIVE_ORG;
export const LOCKED_VENTURE = `candidate:${CRE_CANDIDATE_ID}`;
export const LOCKED_EXPERIMENT = LOCKED_CRE_EXPERIMENT_ID;
export const LOCKED_COHORT = FIRST_REAL_COHORT_ID;

export const INBOUND_DURABLE_STATE_FILE = ".infinity/communication/inbound-runtime-state.json" as const;

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send" as const;
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly" as const;
export const GMAIL_USERINFO_SCOPE = "https://www.googleapis.com/auth/userinfo.email" as const;

export const GMAIL_INBOUND_REQUIRED_SCOPES = [GMAIL_READONLY_SCOPE] as const;
export const GMAIL_INBOUND_FORBIDDEN_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
] as const;

export const AUTONOMOUS_REPLY_WRITE_MISSION = "AUTONOMOUS_EMAIL_REPLY_WRITE_VERIFICATION_V1" as const;
export const AUTONOMOUS_REPLY_WRITE_MISSION_ID = "msn_autonomous_email_reply_write_verification_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_SOURCE = "autonomous_email_reply_write_verification_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_RUNTIME = "AutonomousEmailReplyWriteVerificationRuntime" as const;
export const AUTONOMOUS_REPLY_WRITE_VENTURE = "verification:autonomous_reply_write_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_VERSION = "autonomous_reply_write_verification_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_SUBJECT = "Infinity OS Autonomous Reply Verification" as const;
export const AUTONOMOUS_REPLY_WRITE_SETUP_BODY =
  'This is a controlled Infinity OS autonomous reply verification thread. Please reply with: "Can you send me more information?"' as const;
export const AUTONOMOUS_REPLY_WRITE_BODY =
  "Absolutely. This was a controlled Infinity OS communication test, and the autonomous reply path is working." as const;
export const AUTONOMOUS_REPLY_WRITE_AUTHORIZATION_ID = "authz_autonomous_reply_write_verification_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION =
  "AUTONOMOUS_EMAIL_REPLY_WRITE_VERIFICATION_CONTINUATION_V1" as const;
export const AUTONOMOUS_REPLY_WRITE_CONTINUATION_MISSION_ID =
  "msn_autonomous_email_reply_write_verification_continuation_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_CONTINUATION_SOURCE =
  "autonomous_email_reply_write_verification_continuation_v1" as const;
export const AUTONOMOUS_REPLY_WRITE_CONTINUATION_RUNTIME =
  "AutonomousEmailReplyWriteVerificationContinuationRuntime" as const;
export const AUTONOMOUS_REPLY_WRITE_LOCKED_CONVERSATION_ID = "cnv_54958c01e820b108" as const;
export const AUTONOMOUS_REPLY_WRITE_LOCKED_THREAD_ID = "1a0636e462c3093e" as const;

export const GMAIL_INBOUND_READ_MISSION = "GMAIL_INBOUND_READ_VERIFICATION_V1" as const;
export const GMAIL_INBOUND_READ_MISSION_ID = "msn_gmail_inbound_read_verification_v1" as const;
export const GMAIL_INBOUND_READ_SOURCE = "gmail_inbound_read_verification_v1" as const;
export const GMAIL_INBOUND_READ_RUNTIME = "GmailInboundReadVerificationRuntime" as const;

export const CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION =
  "GOVERNED_CRE_INBOUND_OBSERVATION_ACTIVATION_V1" as const;
export const CRE_INBOUND_OBSERVATION_ACTIVATION_MISSION_ID =
  "msn_governed_cre_inbound_observation_activation_v1" as const;
export const CRE_INBOUND_OBSERVATION_ACTIVATION_SOURCE =
  "governed_cre_inbound_observation_activation_v1" as const;
export const CRE_INBOUND_OBSERVATION_RUNTIME = "GovernedCreInboundObservationRuntime" as const;
export const INBOUND_COMMUNICATION_PROCESSING_MISSION = "INBOUND_COMMUNICATION_PROCESSING" as const;
export const INBOUND_COMMUNICATION_PROCESSING_MISSION_ID = "msn_inbound_communication_processing_v1" as const;
export const INBOUND_COMMUNICATION_PROCESSING_SOURCE = "inbound_communication_processing_v1" as const;
export const CRE_INBOUND_OBSERVER_FILE = ".infinity/communication/inbound-observer-state.json" as const;
export const CRE_INBOUND_OBSERVER_CADENCE_MS = 300_000 as const;
export const CRE_INBOUND_REPLY_AUTHORIZATION_ID = "authz_cre_inbound_autonomous_reply_v1" as const;

export const INBOUND_MISSION_STEPS = [
  "ORCHESTRATE_INBOUND_COMMUNICATION",
  "INSPECT_INBOUND_SCOPES",
  "PREPARE_TRACKED_CONVERSATIONS",
  "INGEST_INBOUND_EVENTS",
  "CLASSIFY_AND_POLICY",
  "REPLY_PLANNING",
  "EVIDENCE_CONTRACT_AUDIT",
  "HQ_INTELLIGENCE_PROJECTION",
] as const;
