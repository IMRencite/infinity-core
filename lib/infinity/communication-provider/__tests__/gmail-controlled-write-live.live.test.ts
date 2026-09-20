import { describe, expect, it } from "vitest";
import { envPresence, loadServerEnvFromLocalFile } from "../load-local-env";
import { GMAIL_WRITE_VERIFICATION_PERSIST_FILE } from "../constants";
import { resetCommunicationProviderRuntime, setWriteVerificationPersistFile } from "../index";
import { isForbiddenWriteVerificationRecipient } from "../governance";
import { declaredWriteVerificationMailbox } from "../credential-boundary";
import { executeCreGmailControlledWriteMission } from "@/lib/infinity/market-validation-experiment/cre-gmail-controlled-write-mission";

describe.skipIf(process.env.RUN_GMAIL_WRITE_LIVE !== "1")("GMAIL CONTROLLED WRITE LIVE VERIFY", () => {
  it("sends at most one governed verification email to the founder-authorized mailbox", async () => {
    resetCommunicationProviderRuntime();
    setWriteVerificationPersistFile(GMAIL_WRITE_VERIFICATION_PERSIST_FILE);
    const loaded = loadServerEnvFromLocalFile();
    expect(loaded.loaded).toBe(true);
    const mailbox = declaredWriteVerificationMailbox();
    expect(mailbox).toBeTruthy();
    expect(isForbiddenWriteVerificationRecipient(mailbox ?? "")).toBe(false);
    const presence = {
      INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX: envPresence("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX"),
      INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED: envPresence("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED"),
    };
    const run = await executeCreGmailControlledWriteMission({ durable: true });
    const report = {
      presence,
      target: run.verification.target,
      founderAuthorized: run.verification.founderAuthorized,
      targetIsProspect: run.verification.targetIsProspect,
      sendAttempts: run.verification.sendAttempts,
      emailsAccepted: run.verification.emailsAccepted,
      providerMessageId: run.verification.providerMessageId,
      threadId: run.verification.threadId,
      providerError: run.verification.providerError,
      providerAccepted: run.verification.providerAccepted,
      delivered: run.verification.delivered,
      capabilityBefore: run.verification.capabilityBefore,
      capabilityAfter: run.verification.capabilityAfter,
      canonicalReadback: run.canonicalReadback,
      liveWriteVerified: run.liveWriteVerified,
      attemptId: run.verification.attempt?.attemptId ?? null,
      idempotencyKey: run.verification.idempotencyKey,
      authorizationConsumed: run.authorizationConsumed,
      reusedExisting: run.verification.reusedExisting,
      countedAsAcquisition: run.verification.countedAsAcquisition,
      countedAsExperimentEvidence: run.verification.countedAsExperimentEvidence,
      cost: run.verification.attempt?.providerResult?.cost ?? null,
      nextBlocker: run.nextBlocker,
      result: run.result,
      hq: {
        mission: run.hq.mission,
        command: run.hq.command,
        validationStation: run.hq.validationStation,
        deploymentDepotIdle: run.hq.deploymentDepotIdle,
        completion: run.hq.completion,
        latestCompleted: run.hq.latestCompleted,
      },
      experiment: run.experiment,
      prospectEmails: run.prospectEmails,
    };
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/ya29\.|GOCSPX-|1\/\/[A-Za-z0-9]|Bearer\s+[A-Za-z0-9._-]{20,}/i);
    expect(run.verification.sendAttempts).toBeLessThanOrEqual(1);
    expect(run.prospectEmails).toBe(0);
    console.log(`GMAIL_WRITE_LIVE_REPORT ${serialized}`);
  });
});
