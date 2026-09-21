import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { roomForStep } from "@/lib/infinity/mission-activity/rooms";
import {
  evaluateEmailSendAuthorization,
  buildEmailEnvelope,
  buildEmailIntent,
  resetCommunicationProviderRuntime,
  setEmailSendCapabilityStateForTest,
} from "@/lib/infinity/communication-provider";
import { resetPersistedAcquisitionProspects } from "@/lib/infinity/market-validation-acquisition-runtime";
import { resetPublicIngestRuntime } from "../ingest";
import { setExperimentRuntimeState } from "../runtime-state";
import { inspectRealMarketEvidence } from "../real-market-evidence";
import { LOCKED_CRE_EXPERIMENT_ID, LIVE_ORG } from "../constants";
import { completeFirstRealCreProspectCohort } from "../cre-first-real-cohort-completion";
import { executeCreGmailControlledWrite } from "../cre-gmail-controlled-write";
import { executeCreGmailControlledWriteMission } from "../cre-gmail-controlled-write-mission";

const NOW = new Date("2026-09-02T15:20:00.000Z");

function sendFetch(status = 200) {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token") && !url.includes("tokeninfo")) {
      return new Response(JSON.stringify({ access_token: "test-access-token-value" }), { status: 200 });
    }
    if (/messages\/send/i.test(url)) {
      return new Response(JSON.stringify({ id: "msg_hq", threadId: "thrd_hq" }), { status });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return fetchImpl;
}

describe("CRE GMAIL CONTROLLED WRITE VERIFICATION V1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetPublicIngestRuntime();
    resetPersistedAcquisitionProspects();
    resetCommunicationProviderRuntime();
    setExperimentRuntimeState(LOCKED_CRE_EXPERIMENT_ID, "COLLECTING");
    completeFirstRealCreProspectCohort();
    vi.unstubAllEnvs();
    setEmailSendCapabilityStateForTest("READ_ONLY_VERIFIED");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_ID", "test-client-id-value");
    vi.stubEnv("GMAIL_OAUTH_CLIENT_SECRET", "test-client-secret-value");
    vi.stubEnv("GMAIL_OAUTH_REFRESH_TOKEN", "test-refresh-token-value");
    vi.stubEnv("GMAIL_SENDER_EMAIL", "infinitemediaresources@gmail.com");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_MAILBOX", "verify@imros.io");
    vi.stubEnv("INFINITY_GMAIL_WRITE_VERIFICATION_AUTHORIZED", "true");
  });

  it("does not count provider verification as CRE outreach or evidence", async () => {
    const before = inspectRealMarketEvidence({ now: NOW }).counts;
    const run = await executeCreGmailControlledWrite({
      now: NOW,
      fetchImpl: sendFetch(),
      skipIdentityProbe: true,
      durable: false,
    });
    expect(run.verification.emailsSubmitted).toBe(1);
    expect(run.prospectEmails).toBe(0);
    expect(run.prospectMessages).toBe(0);
    expect(run.outreachAttempts).toBe(0);
    expect(run.experiment.qualified).toBe(0);
    expect(run.experiment.strongIntent).toBe(0);
    expect(run.experiment.pricing).toBe(0);
    expect(run.experiment.clockRestarted).toBe("NO");
    expect(run.canonicalReadback).toBe("LIVE_WRITE_VERIFIED");
    expect(run.nextBlocker).toBe("READY_FOR_BOUNDED_CRE_OUTREACH_AUTHORIZATION");
    expect(run.result).toBe("YES — GMAIL LIVE-WRITE VERIFIED; FIRST BOUNDED CRE OUTREACH MAY BE AUTHORIZED NEXT");
    expect(inspectRealMarketEvidence({ now: NOW }).counts).toEqual(before);
    const outreach = evaluateEmailSendAuthorization({
      intent: buildEmailIntent(
        buildEmailEnvelope({
          organizationId: LIVE_ORG,
          experimentId: LOCKED_CRE_EXPERIMENT_ID,
          cohortId: "chrt_cre_first_real_v1",
          prospectId: "prs_089dad6786418f4b",
          toAddress: "caleb.struewing@jll.com",
          subject: "Early validation",
          body: "Public materials describe tenant representation.",
        }),
        "bounded_outreach",
      ),
      prospectSendAuthorized: false,
      contentApproved: true,
      channelAllowed: true,
      now: NOW,
    });
    expect(outreach.allowed).toBe(false);
    expect(outreach.prospectSendAuthorization).toBe("FAIL");
  });

  it("runs HQ with Command and Validation Station; Architect, Growth, and Depot idle", async () => {
    expect(roomForStep("ORCHESTRATE_GMAIL_CONTROLLED_WRITE", "mission_runtime")).toBe("executive_office");
    expect(roomForStep("GMAIL_CONTROLLED_WRITE_VERIFICATION", "market_validation")).toBe("quality_control");
    const run = await executeCreGmailControlledWriteMission({
      now: NOW,
      fetchImpl: sendFetch(),
      skipIdentityProbe: true,
      durable: false,
    });
    expect(run.hq.command).toBe("PASS");
    expect(run.hq.validationStation).toBe("PASS");
    expect(run.hq.systemsArchitectIdle).toBe("PASS");
    expect(run.hq.growthNexusIdle).toBe("PASS");
    expect(run.hq.deploymentDepotIdle).toBe("PASS");
    expect(run.hq.completion).toBe("PASS");
    expect(run.hq.latestCompleted).toBe("PASS");
    expect(run.hq.systemsArchitectLive).toBe("PRESENT_IDLE");
    expect(run.hq.growthLive).toBe("PRESENT_IDLE");
    expect(run.verification.emailsSubmitted).toBe(1);
    expect(run.prospectEmails).toBe(0);
  });
});
