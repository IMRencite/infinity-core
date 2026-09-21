import {
  EMAIL_SEND_CAPABILITY,
  GMAIL_PROVIDER_ID,
  GMAIL_REQUIRED_SCOPES,
  isSuppressed,
  listCommunicationAttempts,
  lookupAttemptByIdempotency,
  readDurableWriteVerificationArtifact,
} from "@/lib/infinity/communication-provider";
import type { CommunicationAttempt } from "@/lib/infinity/communication-provider/types";
import {
  emailOpenIsStrongIntent,
  outreachAttemptIsQualifiedEvidence,
  siteVisitIsPricingIntent,
} from "@/lib/infinity/market-validation-acquisition-runtime/evidence-stages";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { persistedCohortProspects } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { listMissionActivityEvents } from "@/lib/infinity/mission-activity";
import { readPersistedMissionActivity } from "@/lib/infinity/mission-activity/persist-disk";
import {
  CRE_CANDIDATE_ID,
  LIVE_ORG,
  LOCKED_CRE_EXPERIMENT_ID,
} from "./constants";
import {
  CRE_WAVE_1_BOUNDED_SEND_MISSION,
  CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
  CRE_WAVE_1_OBSERVABILITY_SIMULATION_MARK,
  CRE_WAVE_1_OBSERVABILITY_SIMULATION_SOURCE,
} from "./cre-wave-1-bounded-send-mission";
import { buildWave1IdempotencyKey } from "./cre-wave-1-bounded-send";
import { inspectExperimentClock } from "./experiment-clock";
import { inspectRealMarketEvidence } from "./real-market-evidence";
import { getExperimentRuntimeState } from "./runtime-state";

export const WAVE_1_AUDIT_COHORT = [
  { prospectId: "prs_089dad6786418f4b", name: "Caleb Struewing", recipient: "caleb.struewing@jll.com" },
  { prospectId: "prs_0ec2773f4c21713c", name: "Ben Kuhn", recipient: "bkuhn@cresa.com" },
  { prospectId: "prs_595d8aa946521b71", name: "Michael Vizzone", recipient: "mvizzone@tenantadvisors.com" },
  { prospectId: "prs_4fb32c29477ab519", name: "Stephanie Severson", recipient: "stephanie.severson@avisonyoung.com" },
] as const;

export type Wave1SendStatus = "CONFIRMED_SENT" | "CONFIRMED_NOT_SENT" | "AMBIGUOUS";
export type InterruptedRunClassification =
  | "NO_SENDS_OCCURRED"
  | "PARTIAL_SENDS_OCCURRED"
  | "ALL_FOUR_SENT"
  | "AMBIGUOUS_INTERRUPTION";

export type Wave1ProspectAudit = {
  prospectId: string;
  name: string;
  recipient: string;
  status: Wave1SendStatus;
  communicationAttempts: number;
  successfulInitialAttempts: number;
  failedAttempts: number;
  providerAccepted: "YES" | "NO" | "UNKNOWN";
  providerMessageId: string | null;
  threadId: string | null;
  idempotencyKey: string;
  idempotencySuccess: boolean;
  duplicateProtection: "PASS" | "FAIL" | "NOT_APPLICABLE";
  cooldown: boolean;
  cooldownSource: "wave_1" | "other" | null;
  suppressed: boolean;
  experimentEvidenceAddedFromSend: false;
  safeToResume: boolean;
};

export type Wave1AttemptView = {
  prospectId: string | null;
  toAddress: string;
  purpose: "provider_write_verification" | "bounded_outreach" | "internal_test" | "unknown";
  state: string;
  authorized: boolean;
  providerAccepted: boolean;
  providerMessageId: string | null;
  providerThreadId: string | null;
  idempotencyKey: string;
};

export function gmailReadbackAvailability(): {
  available: false;
  result: "GMAIL_READBACK_NOT_AVAILABLE";
  unrelatedMailboxContentIngested: false;
  reason: string;
} {
  return {
    available: false,
    result: "GMAIL_READBACK_NOT_AVAILABLE",
    unrelatedMailboxContentIngested: false,
    reason: `Canonical required Gmail scopes are ${GMAIL_REQUIRED_SCOPES.join(" ")}. This Wave 1 audit does not treat a stored send-only refresh token as live mailbox readback.`,
  };
}

export function attemptToView(attempt: CommunicationAttempt, purpose: Wave1AttemptView["purpose"] = "unknown"): Wave1AttemptView {
  return {
    prospectId: attempt.prospectId,
    toAddress: attempt.toAddress.trim().toLowerCase(),
    purpose,
    state: attempt.state,
    authorized: attempt.authorized,
    providerAccepted: Boolean(attempt.providerResult?.accepted || attempt.state === "PROVIDER_ACCEPTED" || attempt.state === "DELIVERED"),
    providerMessageId: attempt.providerResult?.providerMessageId ?? null,
    providerThreadId: attempt.providerResult?.providerThreadId ?? null,
    idempotencyKey: attempt.idempotencyKey,
  };
}

export function classifyWave1ProspectSend(input: {
  prospectId: string;
  name: string;
  recipient: string;
  attempts: Wave1AttemptView[];
  cooldownUntil?: string | null;
  cooldownSource?: "wave_1" | "other" | null;
  suppressed?: boolean;
  experimentCollecting?: boolean;
  capabilityLiveWriteVerified?: boolean;
  now?: Date;
}): Wave1ProspectAudit {
  const recipient = input.recipient.trim().toLowerCase();
  const idempotencyKey = buildWave1IdempotencyKey(input.prospectId);
  const matching = input.attempts.filter((attempt) => {
    if (attempt.purpose === "provider_write_verification") return false;
    return (
      attempt.prospectId === input.prospectId ||
      attempt.toAddress === recipient ||
      attempt.idempotencyKey === idempotencyKey
    );
  });
  const accepted = matching.filter((attempt) => attempt.providerAccepted);
  const failed = matching.filter((attempt) => attempt.state === "FAILED" || attempt.state === "BOUNCED" || attempt.state === "OPTED_OUT");
  const messageId = accepted.find((attempt) => attempt.providerMessageId)?.providerMessageId ?? null;
  const threadId = accepted.find((attempt) => attempt.providerThreadId)?.providerThreadId ?? null;
  const acceptedWithoutId = accepted.some((attempt) => !attempt.providerMessageId);
  const messageWithoutAccept = matching.some((attempt) => attempt.providerMessageId && !attempt.providerAccepted);
  const incomplete = matching.some(
    (attempt) =>
      attempt.state === "PREPARED" ||
      attempt.state === "AUTHORIZED" ||
      attempt.state === "UNKNOWN_DELIVERY" ||
      (attempt.authorized && !attempt.providerAccepted && !attempt.providerMessageId),
  );
  const cooldownActive = Boolean(
    input.cooldownUntil && Date.parse(input.cooldownUntil) > (input.now ?? new Date()).getTime(),
  );
  const wave1Cooldown = cooldownActive && input.cooldownSource === "wave_1";
  const cooldownWithoutSend = wave1Cooldown && accepted.length === 0;
  const idempotencySuccess = matching.some(
    (attempt) =>
      attempt.idempotencyKey === idempotencyKey &&
      (attempt.providerAccepted || attempt.state === "PROVIDER_ACCEPTED" || attempt.state === "DELIVERED"),
  );

  let status: Wave1SendStatus = "CONFIRMED_NOT_SENT";
  if (accepted.length > 0 && messageId) status = "CONFIRMED_SENT";
  else if (
    acceptedWithoutId ||
    messageWithoutAccept ||
    incomplete ||
    cooldownWithoutSend ||
    (accepted.length > 0 && !messageId) ||
    (matching.length > 0 && accepted.length === 0 && incomplete)
  ) {
    status = "AMBIGUOUS";
  } else if (matching.length === 0 && !wave1Cooldown && !idempotencySuccess) {
    status = "CONFIRMED_NOT_SENT";
  } else if (matching.length > 0 && accepted.length === 0 && !incomplete && !messageId) {
    status = "CONFIRMED_NOT_SENT";
  }

  const duplicateProtection: Wave1ProspectAudit["duplicateProtection"] =
    status === "CONFIRMED_SENT" ? (idempotencySuccess ? "PASS" : "FAIL") : "NOT_APPLICABLE";

  const safeToResume =
    status === "CONFIRMED_NOT_SENT" &&
    !input.suppressed &&
    !cooldownActive &&
    input.experimentCollecting !== false &&
    input.capabilityLiveWriteVerified !== false;

  return {
    prospectId: input.prospectId,
    name: input.name,
    recipient,
    status,
    communicationAttempts: matching.length,
    successfulInitialAttempts: accepted.length,
    failedAttempts: failed.length,
    providerAccepted: accepted.length > 0 ? "YES" : matching.length > 0 && incomplete ? "UNKNOWN" : "NO",
    providerMessageId: messageId,
    threadId,
    idempotencyKey,
    idempotencySuccess,
    duplicateProtection,
    cooldown: cooldownActive,
    cooldownSource: cooldownActive ? input.cooldownSource ?? null : null,
    suppressed: Boolean(input.suppressed),
    experimentEvidenceAddedFromSend: false,
    safeToResume,
  };
}

export function classifyInterruptedRun(audits: Wave1ProspectAudit[]): InterruptedRunClassification {
  if (audits.some((row) => row.status === "AMBIGUOUS")) return "AMBIGUOUS_INTERRUPTION";
  const sent = audits.filter((row) => row.status === "CONFIRMED_SENT").length;
  if (sent === 0) return "NO_SENDS_OCCURRED";
  if (sent === audits.length) return "ALL_FOUR_SENT";
  return "PARTIAL_SENDS_OCCURRED";
}

export function safeResumeProspectIds(audits: Wave1ProspectAudit[]): string[] {
  return audits.filter((row) => row.safeToResume && row.status === "CONFIRMED_NOT_SENT").map((row) => row.prospectId);
}

function durableAttemptViews(): Wave1AttemptView[] {
  const views: Wave1AttemptView[] = [];
  const artifact = readDurableWriteVerificationArtifact();
  if (artifact?.attempt) {
    views.push(attemptToView(artifact.attempt, artifact.record.purpose === "PROVIDER_WRITE_VERIFICATION" ? "provider_write_verification" : "unknown"));
  }
  for (const attempt of listCommunicationAttempts()) {
    const already = views.some((row) => row.idempotencyKey === attempt.idempotencyKey && row.toAddress === attempt.toAddress.toLowerCase());
    if (!already) views.push(attemptToView(attempt, "unknown"));
  }
  return views;
}

function isSimulationMissionEvent(event: { source?: string; technicalDetail?: string | null }): boolean {
  return event.source === CRE_WAVE_1_OBSERVABILITY_SIMULATION_SOURCE || event.technicalDetail === CRE_WAVE_1_OBSERVABILITY_SIMULATION_MARK;
}

export function inspectInterruptedWave1HqHistory(): {
  interruptedDirectFunctionMissionEvents: number;
  laterWrapperOrSimulationEvents: number;
  simulationMissionEvents: number;
  canonicalMissionRuntimeUsed: false;
  directFunctionExecutionEvidence: "NONE_DURABLE";
} {
  const disk = readPersistedMissionActivity();
  const memory = listMissionActivityEvents({
    organizationId: LIVE_ORG,
    missionId: CRE_WAVE_1_BOUNDED_SEND_MISSION_ID,
  });
  const merged = [...disk, ...memory].filter(
    (event) => event.missionId === CRE_WAVE_1_BOUNDED_SEND_MISSION_ID || event.missionType === CRE_WAVE_1_BOUNDED_SEND_MISSION,
  );
  const unique = new Map(merged.map((event) => [event.eventId, event]));
  const events = [...unique.values()];
  return {
    interruptedDirectFunctionMissionEvents: 0,
    laterWrapperOrSimulationEvents: events.length,
    simulationMissionEvents: events.filter((event) => isSimulationMissionEvent(event)).length,
    canonicalMissionRuntimeUsed: false,
    directFunctionExecutionEvidence: "NONE_DURABLE",
  };
}

export function auditInterruptedCreWave1Run(input: {
  now?: Date;
  attempts?: Wave1AttemptView[];
  cooldownByProspect?: Record<string, { until: string | null; source: "wave_1" | "other" | null }>;
  experimentState?: string | null;
  capabilityState?: string | null;
} = {}) {
  const now = input.now ?? new Date();
  const attempts = input.attempts ?? durableAttemptViews();
  const evidence = inspectRealMarketEvidence({ now });
  const clock = inspectExperimentClock(now);
  const experimentState = input.experimentState ?? getExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID) ?? evidence.experiment.state;
  const artifact = readDurableWriteVerificationArtifact();
  const capabilityState = input.capabilityState ?? artifact?.capabilityState ?? "UNVERIFIED";
  const collecting = experimentState === "COLLECTING";
  const liveWrite = capabilityState === "LIVE_WRITE_VERIFIED";
  const cohort = persistedCohortProspects();

  const prospects = WAVE_1_AUDIT_COHORT.map((row) => {
    const persisted = cohort.find((item) => item.prospectId === row.prospectId);
    const cooldown = input.cooldownByProspect?.[row.prospectId] ?? {
      until: persisted?.cooldownUntil ?? null,
      source: persisted?.cooldownUntil ? ("other" as const) : null,
    };
    return classifyWave1ProspectSend({
      prospectId: row.prospectId,
      name: row.name,
      recipient: row.recipient,
      attempts,
      cooldownUntil: cooldown.until,
      cooldownSource: cooldown.source,
      suppressed: isSuppressed({
        prospectId: row.prospectId,
        email: row.recipient,
        experimentId: LOCKED_CRE_EXPERIMENT_ID,
      }),
      experimentCollecting: collecting,
      capabilityLiveWriteVerified: liveWrite,
      now,
    });
  });

  const classification = classifyInterruptedRun(prospects);
  const resumeIds = safeResumeProspectIds(prospects);
  const hq = inspectInterruptedWave1HqHistory();
  const writeVerificationTarget = artifact?.record.controlledTarget?.trim().toLowerCase() ?? null;
  const writeVerificationTouchesProspect = WAVE_1_AUDIT_COHORT.some((row) => row.recipient === writeVerificationTarget);

  return {
    provider: GMAIL_PROVIDER_ID,
    capability: EMAIL_SEND_CAPABILITY,
    capabilityState,
    organizationId: LIVE_ORG,
    candidateId: CRE_CANDIDATE_ID,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    cohortId: FIRST_REAL_COHORT_ID,
    experimentState,
    clockRestarted: clock.restarted,
    evidenceStart: clock.evidenceStart,
    deadline: clock.deadline,
    evidenceCounts: evidence.counts,
    sendIsEvidence: outreachAttemptIsQualifiedEvidence(),
    openIsStrongIntent: emailOpenIsStrongIntent(),
    visitIsPricingIntent: siteVisitIsPricingIntent(),
    writeVerification: artifact
      ? {
          purpose: artifact.record.purpose,
          providerAccepted: artifact.record.providerAccepted,
          prospectRecipient: writeVerificationTouchesProspect,
          telemetryKind: artifact.record.telemetryKind,
        }
      : null,
    gmailReadback: gmailReadbackAvailability(),
    classification,
    prospects,
    confirmedSent: prospects.filter((row) => row.status === "CONFIRMED_SENT").length,
    confirmedNotSent: prospects.filter((row) => row.status === "CONFIRMED_NOT_SENT").length,
    ambiguous: prospects.filter((row) => row.status === "AMBIGUOUS").length,
    suppressed: prospects.filter((row) => row.suppressed).length,
    cooldown: prospects.filter((row) => row.cooldown).length,
    safeResumeProspectIds: resumeIds,
    safeResumeCount: resumeIds.length,
    containsConfirmedSent: resumeIds.some((id) => prospects.find((row) => row.prospectId === id)?.status === "CONFIRMED_SENT"),
    containsAmbiguous: resumeIds.some((id) => prospects.find((row) => row.prospectId === id)?.status === "AMBIGUOUS"),
    hq,
    providerWrites: 0,
    emails: 0,
  };
}

export function lookupWave1IdempotencyAttempt(prospectId: string): CommunicationAttempt | null {
  return lookupAttemptByIdempotency(buildWave1IdempotencyKey(prospectId));
}
