import { STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "./cutover";

/**
 * Stakes decision 2026-09-21.
 * No real prospect cohort is on the legacy path. The only open inbound is the
 * same-mailbox founder trial. Dual-path fences exist only because two
 * architectures run at once; downtime cost is near zero.
 */
export const COMMUNICATION_STAKES = {
  real_prospects_on_legacy: false,
  evidence: [
    "Only open inbound is founder trial 1a0be7a9feee5375 on thread 1a0af74557b0eb36",
    "Other historical inbound is COVERED or SUPPRESSED, not live prospect work",
    "Acquisition first-handoff still reports REAL_PROSPECT_COHORT_NOT_READY",
    "Serving discovery/worker last_success_at is null; no live prospect jobs",
  ],
  decision: "HARD_CUTOVER",
  founder_trial_disposition: "ABANDONED_TEST_ARTIFACT",
} as const;

export function isAbandonedFounderTrial(provider_message_id: string = STRANDED_FOUNDER_TRIAL_INBOUND_ID): boolean {
  return provider_message_id === STRANDED_FOUNDER_TRIAL_INBOUND_ID
    && COMMUNICATION_STAKES.founder_trial_disposition === "ABANDONED_TEST_ARTIFACT";
}

export function abandonFounderTrialArtifact(now: string) {
  return {
    provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    recovered: true as const,
    clean_eligible: false as const,
    counts_toward_clean: false as const,
    classification: "ABANDONED_TEST_ARTIFACT" as const,
    abandoned_at: now,
  };
}
