import { describe, expect, it } from "vitest";
import { envPresence, loadServerEnvFromLocalFile } from "../load-local-env";
import { inspectGmailConnectionRecord, resetCommunicationProviderRuntime } from "../index";
import { inspectCreGmailConnectionReadonly } from "@/lib/infinity/market-validation-experiment/cre-gmail-connection-readonly";

function guardedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/(messages\/send|drafts)/i.test(url)) {
    throw new Error("GMAIL_WRITE_BLOCKED");
  }
  return fetch(input, init);
}

describe.skipIf(process.env.RUN_GMAIL_READONLY_LIVE !== "1")("GMAIL READ-ONLY LIVE CONNECTION VERIFY", () => {
  it("verifies identity and scopes without sending or printing secrets", async () => {
    resetCommunicationProviderRuntime();
    const loaded = loadServerEnvFromLocalFile();
    expect(loaded.loaded).toBe(true);
    const presence = {
      GMAIL_OAUTH_CLIENT_ID: envPresence("GMAIL_OAUTH_CLIENT_ID"),
      GMAIL_OAUTH_CLIENT_SECRET: envPresence("GMAIL_OAUTH_CLIENT_SECRET"),
      GMAIL_OAUTH_REFRESH_TOKEN: envPresence("GMAIL_OAUTH_REFRESH_TOKEN"),
      GMAIL_SENDER_EMAIL: envPresence("GMAIL_SENDER_EMAIL"),
      INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX: envPresence("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX"),
      INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED: envPresence("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED"),
    };
    const inspected = await inspectCreGmailConnectionReadonly({ fetchImpl: guardedFetch });
    const record = inspectGmailConnectionRecord();
    const report = {
      presence,
      connected: inspected.connection.connected,
      failure: inspected.connection.failure,
      refresh: inspected.connection.oauthReachable,
      identityEndpoint: inspected.connection.identityEndpoint,
      gmailApi: inspected.connection.gmailApi,
      configuredSender: inspected.connection.configuredSender,
      authenticatedIdentity: inspected.connection.authenticatedIdentity,
      match: inspected.connection.senderMatch,
      ownership: inspected.connection.ownership,
      userinfoEmail: inspected.connection.scopeVerification.userinfoEmail,
      gmailSend: inspected.connection.scopeVerification.gmailSend,
      scopeEvidenceSource: inspected.connection.scopeEvidenceSource,
      state: inspected.capability.after,
      writeTarget: inspected.writeTarget.target,
      writeAuthorized: inspected.writeTarget.authorized,
      writeOrgControlled: inspected.writeTarget.organizationControlled,
      writeSafe: inspected.writeTarget.safeForNext,
      emailsSent: inspected.emailsSent,
      nextBlocker: inspected.nextBlocker,
      result: inspected.result,
      recordState: record?.state ?? null,
      recordSender: record?.senderIdentity ?? null,
      credentialReference: record?.credentialReference ?? null,
    };
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/ya29\.|GOCSPX-|1\/\/[A-Za-z0-9]|Bearer\s+[A-Za-z0-9._-]{20,}/i);
    expect(inspected.emailsSent).toBe(0);
    expect(inspected.draftsCreated).toBe(0);
    expect(inspected.mailboxMutations).toBe(0);
    console.log(`GMAIL_READONLY_LIVE_REPORT ${serialized}`);
  });
});
