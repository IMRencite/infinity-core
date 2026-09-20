export const PRODUCTION_OUTBOUND_CONTRACT = "ProductionOutboundActivationV1" as const;
export const PRODUCTION_OUTBOUND_POLICY_VERSION = "production-outbound-authorization-v1" as const;
export const PRODUCTION_OUTBOUND_SCOPE = "production-outbound-state" as const;

export const OUTBOUND_MODES = ["DISABLED", "CANARY", "AUTONOMOUS"] as const;
export type OutboundMode = (typeof OUTBOUND_MODES)[number];

export const OUTBOUND_CHANNELS = ["email", "sms", "phone", "other"] as const;
export type OutboundChannel = (typeof OUTBOUND_CHANNELS)[number];

export const DEFAULT_CANARY_VENTURE_ID = "candidate:7e7e924e-0741-4155-a729-8d529da77ea9" as const;

export const CANARY_LIMITS = {
  MAX_SENDS_PER_HOUR: 1,
  MAX_SENDS_PER_DAY: 3,
  MAX_SENDS_PER_VENTURE: 3,
  MAX_SENDS_PER_PROSPECT: 1,
  MAX_FOLLOWUPS: 1,
} as const;

export const AUTONOMOUS_LIMITS = {
  MAX_SENDS_PER_HOUR: 2,
  MAX_SENDS_PER_DAY: 8,
  MAX_SENDS_PER_VENTURE: 8,
  MAX_SENDS_PER_PROSPECT: 3,
  MAX_FOLLOWUPS: 2,
} as const;

export const PRODUCTION_OUTBOUND_AUTHORIZATION_GATE = "ProductionOutboundAuthorizationGate" as const;
export const PRODUCTION_SEND_IDEMPOTENCY_GATE = "ProductionSendIdempotencyGate" as const;
export const PRODUCTION_SUPPRESSION_ENFORCEMENT_GATE = "ProductionSuppressionEnforcementGate" as const;
export const PRODUCTION_OUTBOUND_CAPACITY_GATE = "ProductionOutboundCapacityGate" as const;
export const PRODUCTION_OUTBOUND_KILL_SWITCH_GATE = "ProductionOutboundKillSwitchGate" as const;
export const PRODUCTION_OUTBOUND_AUTONOMY_GATE = "ProductionOutboundAutonomyGate" as const;
export const PRODUCTION_OUTBOUND_PROVIDER_READINESS_GATE = "ProductionOutboundProviderReadinessGate" as const;
export const PRODUCTION_SUPPRESSION_LIVE_PROOF_GATE = "ProductionSuppressionLiveProofGate" as const;
export const PRODUCTION_RESTART_IDEMPOTENCY_GATE = "ProductionRestartIdempotencyGate" as const;
export const PRODUCTION_KILL_SWITCH_LIVE_PROOF_GATE = "ProductionKillSwitchLiveProofGate" as const;

export const PUBLIC_OUTBOUND_FORBIDDEN = [
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
  /prospect_id/i,
  /MERCURY_API_TOKEN/,
  /message body/i,
  /recipient/i,
];
