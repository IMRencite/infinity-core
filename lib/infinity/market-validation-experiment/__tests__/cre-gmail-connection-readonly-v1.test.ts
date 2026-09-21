import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import {
  FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED,
  gmailFounderSetupContract,
  inspectGmailConnectionRecord,
  resetCommunicationProviderRuntime,
  verifyEmailSendReadOnly,
} from "@/lib/infinity/communication-provider";
import {
  auditCommunicationCapabilities,
  executableCommunicationCapability,
  resetPersistedAcquisitionProspects,
} from "@/lib/infinity/market-validation-acquisition-runtime";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { LOCKED_CRE_EXPERIMENT_ID } from "../constants";
import { inspectCreGmailConnectionReadonly } from "../cre-gmail-connection-readonly";
import { executeCreGmailConnectionReadonlyMission } from "../cre-gmail-connection-readonly-mission";

const NOW = new Date("2026-09-02T14:01:00.000Z");

describe("GMAIL PROVIDER CONNECTION + READ-ONLY IDENTITY VERIFICATION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    vi.unstubAllEnvs();
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", "");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "");
  });

  it("keeps the capability UNVERIFIED when Google OAuth is not configured", async () => {
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const inspected = await inspectCreGmailConnectionReadonly({ now: NOW });
    expect(inspected.environment.required).toEqual([
      "GMAIL_OAUTH_CLIENT_ID",
      "GMAIL_OAUTH_CLIENT_SECRET",
      "GMAIL_OAUTH_REFRESH_TOKEN",
    ]);
    expect(inspected.environment.missing).toEqual(inspected.environment.required);
    expect(inspected.environment.secretValuesPrinted).toBe("NO");
    expect(inspected.connection.connected).toBe("NO");
    expect(inspected.connection.failure).toBe("GOOGLE_OAUTH_NOT_CONFIGURED");
    expect(inspected.capability.after).toBe("UNVERIFIED");
    expect(inspected.capability.liveWriteVerified).toBe("NO");
    expect(inspected.emailsSent).toBe(0);
    expect(inspected.prospectEmails).toBe(0);
    expect(inspected.writeTarget.target).toBe("NONE");
    expect(inspected.cohort.size).toBe(4);
    expect(inspected.experiment.state).toBe("COLLECTING");
    expect(inspected.nextBlocker).toBe(FOUNDER_GOOGLE_OAUTH_CONFIGURATION_REQUIRED);
    expect(inspected.result).toBe("PARTIAL — GMAIL PROVIDER READY FOR CONFIGURATION; FOUNDER GOOGLE OAUTH SETUP REQUIRED");
    expect(executableCommunicationCapability()).toBeNull();
    expect(auditCommunicationCapabilities().find((row) => row.capability === "communication.email.send")?.verificationState).toBe(
      "UNVERIFIED",
    );
    expect(inspectGmailConnectionRecord()?.state).toBe("UNVERIFIED");
    expect(JSON.stringify(inspectGmailConnectionRecord())).not.toMatch(/ya29\.|GOCSPX-|1\/\//);
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(before);
  });

  it("advances only to READ_ONLY_VERIFIED when identity and scopes pass, and fails sender mismatch", async () => {
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "ops@imros.io");
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      expect(url).not.toContain("gmail/v1/users/me/messages");
      expect(url).not.toContain("/drafts");
      if (url.includes("oauth2.googleapis.com/tokeninfo")) {
        return new Response(
          JSON.stringify({
            scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
          }),
          { status: 200 },
        );
      }
      if (url.includes("oauth2.googleapis.com/token")) {
        return new Response(
          JSON.stringify({
            access_token: "test-access-token-value",
            scope: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email",
          }),
          { status: 200 },
        );
      }
      if (url.includes("oauth2/v2/userinfo")) {
        return new Response(JSON.stringify({ email: "ops@imros.io", verified_email: true }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${url} ${init?.method ?? "GET"}`);
    };
    const verified = await verifyEmailSendReadOnly(fetchImpl);
    expect(verified.state).toBe("READ_ONLY_VERIFIED");
    expect(verified.liveWriteVerified).toBe(false);
    expect(verified.connection.authenticatedIdentity).toBe("ops@imros.io");
    expect(verified.connection.senderMatch).toBe("YES");
    expect(verified.connection.ownership).toBe("FOUNDER_CONFIRMED");
    expect(verified.connection.oauthReachable).toBe("PASS");
    expect(verified.connection.identityEndpoint).toBe("PASS");
    expect(verified.connection.gmailApi).toBe("NOT_NEEDED");
    expect(verified.connection.scopeVerification.userinfoEmail).toBe("PASS");
    expect(verified.connection.scopeVerification.gmailSend).toBe("PASS");
    expect(verified.connection.scopeEvidenceSource).toBe("tokeninfo");
    expect(verified.writeVerification).toBe("NOT_RUN");

    resetCommunicationProviderRuntime();
    vi.stubEnv("GMAIL_SENDER_EMAIL", "other@imros.io");
    const mismatch = await verifyEmailSendReadOnly(fetchImpl);
    expect(mismatch.state).toBe("FAILED_VERIFICATION");
    expect(mismatch.connection.failure).toBe("GOOGLE_SENDER_IDENTITY_MISMATCH");
    expect(mismatch.connection.senderMatch).toBe("NO");
  });

  it("documents the founder OAuth contract from the repository, not invented names", () => {
    const setup = gmailFounderSetupContract();
    expect(setup.requiredEnvNames).toEqual([
      "GMAIL_OAUTH_CLIENT_ID",
      "GMAIL_OAUTH_CLIENT_SECRET",
      "GMAIL_OAUTH_REFRESH_TOKEN",
    ]);
    expect(setup.secretEnvNames).toEqual(["GMAIL_OAUTH_CLIENT_SECRET", "GMAIL_OAUTH_REFRESH_TOKEN"]);
    expect(setup.oauthApplicationType).toBe("Web application");
    expect(setup.requiredRedirectUri).toBe("https://developers.google.com/oauthplayground");
    expect(setup.requiredScopes).toEqual([
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ]);
    expect(setup.steps.every((step) => !/two required scopes/i.test(step))).toBe(true);
    expect(setup.steps.some((step) => /three required scopes/i.test(step))).toBe(true);
    expect(setup.additionalGoogleApis).toEqual([]);
    expect(setup.steps.some((step) => /Cursor chat/i.test(step))).toBe(true);
  });

  it("runs HQ with Command, Systems Architect, and Validation Station; Growth and Depot idle", async () => {
    expect(roomForStep("GMAIL_OAUTH_INTEGRATION", "venture_systems_architecture")).toBe("systems_architect");
    expect(roomForStep("GMAIL_IDENTITY_SCOPE_VERIFICATION", "market_validation")).toBe("quality_control");
    const run = await executeCreGmailConnectionReadonlyMission({ now: NOW });
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.systemsArchitect).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.growthNexusIdle).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.emailsSent).toBe(0);
    expect(run.capability.after).toBe("UNVERIFIED");
  });
});
