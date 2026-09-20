import { evaluateContactGovernance } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import type { ContactabilityRecord } from "@/lib/infinity/market-validation-acquisition-runtime/contactability";
import {
  ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS,
  ALLOWED_CRE_INBOUND_REPLY_THREADS,
  EMAIL_SEND_CAPABILITY,
  FORBIDDEN_WRITE_VERIFICATION_RECIPIENTS,
} from "./constants";
import { lookupAttemptByIdempotency } from "./attempts";
import { inspectEmailSendCapabilityState } from "./capability-state";
import {
  declaredWriteVerificationMailbox,
  writeVerificationExplicitlyAuthorized,
} from "./credential-boundary";
import type { CommunicationAuthorizationDecision, CommunicationIntent, SuppressionRecord } from "./types";

const suppressions = new Map<string, SuppressionRecord>();

export function resetCommunicationSuppression(): void {
  suppressions.clear();
}

export function recordSuppression(record: SuppressionRecord): void {
  suppressions.set(`${record.scope}:${record.key}`, record);
}

export function isSuppressed(input: {
  globalKey?: string | null;
  ventureId?: string | null;
  experimentId?: string | null;
  prospectId?: string | null;
  email?: string | null;
}): boolean {
  const keys = [
    input.globalKey ? `global:${input.globalKey}` : null,
    input.email ? `global:${input.email.toLowerCase()}` : null,
    input.ventureId ? `venture:${input.ventureId}` : null,
    input.experimentId ? `experiment:${input.experimentId}` : null,
    input.prospectId ? `prospect:${input.prospectId}` : null,
  ].filter((key): key is string => Boolean(key));
  return keys.some((key) => suppressions.has(key));
}

export function isForbiddenWriteVerificationRecipient(email: string): boolean {
  return (FORBIDDEN_WRITE_VERIFICATION_RECIPIENTS as readonly string[]).includes(email.trim().toLowerCase());
}

export function evaluateEmailSendAuthorization(input: {
  intent: CommunicationIntent;
  prospect?: {
    prospectId: string;
    name: string;
    organization: string;
    qualified: boolean;
    synthetic: boolean;
    optedOut: boolean;
    duplicate: boolean;
    cooldownUntil: string | null;
    activeInOtherCohort: boolean;
    contactability: ContactabilityRecord;
    attempts: number;
  };
  prospectSendAuthorized: boolean;
  contentApproved: boolean;
  channelAllowed: boolean;
  now?: Date;
}): CommunicationAuthorizationDecision {
  const capability = inspectEmailSendCapabilityState();
  const suppressed = isSuppressed({
    experimentId: input.intent.envelope.experimentId,
    ventureId: input.intent.envelope.ventureId,
    prospectId: input.intent.envelope.prospectId,
    email: input.intent.envelope.toAddress,
  });
  const existing = lookupAttemptByIdempotency(input.intent.envelope.idempotencyKey);
  const duplicateSend =
    Boolean(existing) &&
    (existing!.state === "PROVIDER_ACCEPTED" ||
      existing!.state === "DELIVERED" ||
      existing!.state === "UNKNOWN_DELIVERY" ||
      existing!.authorized);
  const writeVerification = input.intent.purpose === "provider_write_verification";
  const replyWriteVerification = input.intent.purpose === "autonomous_reply_write_verification";
  const inboundReply = input.intent.purpose === "autonomous_inbound_reply";
  const controlledVerification = writeVerification || replyWriteVerification;
  const inboundRecipientOk =
    ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS.includes(
      input.intent.envelope.toAddress.trim().toLowerCase() as (typeof ALLOWED_CRE_INBOUND_REPLY_RECIPIENTS)[number],
    ) &&
    Boolean(
      input.intent.envelope.providerThreadId &&
        ALLOWED_CRE_INBOUND_REPLY_THREADS.includes(
          input.intent.envelope.providerThreadId as (typeof ALLOWED_CRE_INBOUND_REPLY_THREADS)[number],
        ),
    );
  const writeVerificationRecipient =
    controlledVerification && isForbiddenWriteVerificationRecipient(input.intent.envelope.toAddress)
      ? "FAIL"
      : "PASS";
  const providerGate = writeVerification
    ? capability.state === "READ_ONLY_VERIFIED" || capability.state === "LIVE_WRITE_VERIFIED"
      ? "PASS"
      : "FAIL"
    : capability.state === "LIVE_WRITE_VERIFIED"
    ? "PASS"
    : "FAIL";
  const prospectAuth = controlledVerification || inboundReply
    ? "PASS"
    : input.prospectSendAuthorized
      ? "PASS"
      : "FAIL";
  const contact = input.prospect
    ? evaluateContactGovernance({
        experimentId: input.intent.envelope.experimentId ?? "",
        prospectId: input.prospect.prospectId,
        name: input.prospect.name,
        organization: input.prospect.organization,
        qualified: input.prospect.qualified,
        synthetic: input.prospect.synthetic,
        optedOut: input.prospect.optedOut,
        duplicate: input.prospect.duplicate,
        cooldownUntil: input.prospect.cooldownUntil,
        activeInOtherCohort: input.prospect.activeInOtherCohort,
        contactability: input.prospect.contactability,
        attempts: input.prospect.attempts,
        now: input.now,
      })
    : null;
  const qualification = inboundReply
    ? "PASS"
    : contact
      ? contact.qualification
      : input.intent.purpose === "bounded_outreach"
        ? "FAIL"
        : "PASS";
  const gates = {
    qualificationGate: qualification,
    duplicatePrevention: inboundReply ? "PASS" : contact?.duplicate === "FAIL" || input.prospect?.duplicate ? "FAIL" : "PASS",
    idempotency: duplicateSend ? "FAIL" : "PASS",
    cooldown: inboundReply ? "PASS" : contact?.cooldown ?? "PASS",
    optOut: contact?.optOut ?? (input.prospect?.optedOut ? "FAIL" : "PASS"),
    suppression: suppressed ? "FAIL" : "PASS",
    experimentStateGate: contact?.experimentCollecting ?? "PASS",
    deadlineGate: contact?.deadline ?? "PASS",
    providerVerificationGate: providerGate,
    prospectSendAuthorization: prospectAuth as "PASS" | "FAIL",
    channelAllowed: input.channelAllowed ? "PASS" : "FAIL",
    contentPolicy: input.contentApproved ? "PASS" : "FAIL",
    attemptCeiling: inboundReply ? "PASS" : contact?.attemptCeiling ?? "PASS",
    economicCeiling: "PASS" as const,
    recipientAllowed: inboundReply
      ? inboundRecipientOk
        ? "PASS"
        : "FAIL"
      : writeVerificationRecipient === "FAIL" && controlledVerification
        ? "FAIL"
        : contact?.validContact ?? "PASS",
    writeVerificationRecipient,
  } satisfies Omit<CommunicationAuthorizationDecision, "allowed" | "authorizationId" | "reason">;
  if (inboundReply && !inboundRecipientOk) {
    return {
      allowed: false,
      authorizationId: null,
      reason: "NEW_COLD_RECIPIENT_FORBIDDEN",
      ...gates,
      recipientAllowed: "FAIL",
    };
  }
  if (controlledVerification && writeVerificationRecipient === "FAIL") {
    return {
      allowed: false,
      authorizationId: null,
      reason: "PROSPECT_CANNOT_BE_PROVIDER_VERIFICATION_RECIPIENT",
      ...gates,
      recipientAllowed: "FAIL",
    };
  }
  if (controlledVerification) {
    const declaredTarget = declaredWriteVerificationMailbox();
    if (!declaredTarget) {
      return {
        allowed: false,
        authorizationId: null,
        reason: "CONTROLLED_WRITE_TARGET_MISSING",
        ...gates,
        recipientAllowed: "FAIL",
      };
    }
    if (!writeVerificationExplicitlyAuthorized()) {
      return {
        allowed: false,
        authorizationId: null,
        reason: "WRITE_VERIFICATION_NOT_AUTHORIZED",
        ...gates,
        recipientAllowed: "FAIL",
      };
    }
    if (input.intent.envelope.toAddress !== declaredTarget) {
      return {
        allowed: false,
        authorizationId: null,
        reason: "WRITE_VERIFICATION_TARGET_MISMATCH",
        ...gates,
        recipientAllowed: "FAIL",
      };
    }
  }
  if (input.intent.capability !== EMAIL_SEND_CAPABILITY) {
    return { allowed: false, authorizationId: null, reason: "UNKNOWN_CAPABILITY", ...gates };
  }
  const failed = Object.entries(gates).find(([, value]) => value === "FAIL");
  return {
    allowed: !failed,
    authorizationId: failed ? null : input.intent.envelope.authorizationId,
    reason: failed ? failed[0] : "ALLOWED",
    ...gates,
  };
}
