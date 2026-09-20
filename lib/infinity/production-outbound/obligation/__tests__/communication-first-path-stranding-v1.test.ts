import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { replaceVentureBlogOsState, resetVentureBlogOsStore, seedOccupancyNpvBlogOsState } from "@/lib/infinity/organic-growth-engine/blog-os/store";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
  forceCommunicationObligationCutoverForTests,
} from "../cutover";
import { captureBlogOsIsolationSnapshot } from "@/lib/infinity/organic-growth-engine/blog-os/isolation-snapshot";
import { resetCommunicationObligationStore } from "../store";
import { evaluateProviderInboundCoverage, evaluateCommunicationDiscoveryLatencyGate, coverMissingProspectObligations } from "../coverage";
import {
  evaluateCommunicationCutoverRuntimeParityGate,
  evaluateCommunicationRuntimeHeartbeatGate,
  evaluateCommunicationSchedulerWorkerDeploymentParityGate,
  heartbeatLiveness,
  recordCommunicationHeartbeat,
  resetCommunicationHeartbeats,
} from "../heartbeat";
import { executeTestThreadCutoverTick } from "../cycle";
import { PREVIOUS_READY_FOR_FOUNDER_LIVE_TEST } from "@/lib/infinity/qc-escape/escaped-defect-registry";

const NOW = "2026-09-20T15:50:00.000Z";
const RECEIVED = "2026-09-20T11:01:41.000Z";
const DISCOVERED = "2026-09-20T11:05:31.494Z";

describe("live first-path stranding always-on repair", () => {
  beforeEach(() => {
    resetCommunicationObligationStore();
    resetCommunicationHeartbeats();
    resetVentureBlogOsStore();
    replaceVentureBlogOsState({
      ...seedOccupancyNpvBlogOsState(NOW),
      remediations: [{
        obligation_id: "f1336945-3350-4d08-921e-4dcb5bc77b8e",
        venture_id: "occupancynpv",
        kind: "INFRASTRUCTURE",
        missing: ["editorial_surface"],
        state: "REPAIRING",
        created_at: NOW,
        updated_at: NOW,
      }],
    });
    forceCommunicationObligationCutoverForTests(true);
  });
  afterEach(() => forceCommunicationObligationCutoverForTests(null));

  it("detects provider message without obligation and stale configured-only runtime", () => {
    const coverage = evaluateProviderInboundCoverage({
      mailbox_id: "occupancynpv-canary",
      messages: [{ id: STRANDED_FOUNDER_TRIAL_INBOUND_ID, role: "PROSPECT", later_reply: false }],
    });
    expect(coverage.missing).toBe(1);
    expect(coverage.ProviderInboundCoverageGate.result).toBe("FAIL");
    expect(evaluateCommunicationDiscoveryLatencyGate({
      provider_received_at: RECEIVED,
      discovered_at: DISCOVERED,
    }).result).toBe("PASS");
    expect(evaluateCommunicationDiscoveryLatencyGate({
      provider_received_at: RECEIVED,
      discovered_at: null,
    }).result).toBe("FAIL");
    expect(evaluateCommunicationRuntimeHeartbeatGate(NOW).result).toBe("FAIL");
    expect(heartbeatLiveness("scheduler", NOW)).toBe("DOWN");
    expect(evaluateCommunicationSchedulerWorkerDeploymentParityGate({
      scheduler_deployment: "dpl_6dtsxZFscVtDGCKYsW8aKBwpZtNj",
      worker_deployment: "dpl_old",
      handler: "legacy-executeScheduledReplyJob",
    }).result).toBe("FAIL");
    expect(evaluateCommunicationCutoverRuntimeParityGate({
      expected_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      runtime_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      runtime_version: "missing",
      deployment_id: "dpl_6dtsxZFscVtDGCKYsW8aKBwpZtNj",
    }).result).toBe("FAIL");
    expect(PREVIOUS_READY_FOR_FOUNDER_LIVE_TEST).toEqual({ result: "PASS", escaped: "ESCAPED_DEFECT" });
  });

  it("covers the missing obligation, recovers without counting clean, and isolates Blog-OS", async () => {
    const before = captureBlogOsIsolationSnapshot(NOW);
    const covered = coverMissingProspectObligations({
      mailbox_id: "occupancynpv-canary",
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      now: NOW,
      messages: [{
        id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
        visible: "Yeah, I think I'd rather just try it. How do I start the free trial?",
        received_at: RECEIVED,
        role: "PROSPECT",
      }],
    });
    expect(covered.inserted).toBe(1);
    expect(evaluateProviderInboundCoverage({
      mailbox_id: "occupancynpv-canary",
      messages: [{ id: STRANDED_FOUNDER_TRIAL_INBOUND_ID, role: "PROSPECT", later_reply: false }],
    }).ProviderInboundCoverageGate.result).toBe("PASS");

    const result = await executeTestThreadCutoverTick({
      now: NOW,
      execute_jobs: true,
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      inbound: {
        provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
        visible_body: "Yeah, I think I'd rather just try it. How do I start the free trial?",
        received_at: RECEIVED,
      },
      messages: [{
        provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
        visible_body: "Yeah, I think I'd rather just try it. How do I start the free trial?",
        received_at: RECEIVED,
        role: "PROSPECT",
        later_reply: false,
      }],
      recovered_ids: [STRANDED_FOUNDER_TRIAL_INBOUND_ID],
      deployment: "dpl-cutover",
      provider: {
        send: async () => ({ accepted: true, provider_message_id: "gmail-recovered-1", status: 200 }),
      },
    });
    expect(result.skipped).toBe(false);
    if (result.skipped) return;
    expect(result.sent).toBe(true);
    expect(result.recovered).toBe(true);
    expect(result.obligation?.state).toBe("CONFIRMED");
    expect(result.body).toMatch(/3-day free trial/i);
    expect(result.body).toMatch(/occupancynpv\.com\/pricing/);
    expect(result.body).not.toMatch(/Want one short example|helps you compare lease options without rebuilding/i);
    expect(result.hq.clean_live_turns).toBe("0 / 3");
    expect(evaluateCommunicationRuntimeHeartbeatGate(NOW).result).toBe("PASS");
    expect(evaluateCommunicationSchedulerWorkerDeploymentParityGate({
      scheduler_deployment: "dpl-cutover",
      worker_deployment: "dpl-cutover",
      handler: "executeTestThreadCutoverTick",
    }).result).toBe("PASS");
    expect(evaluateCommunicationCutoverRuntimeParityGate({
      expected_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      runtime_thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      runtime_version: COMMUNICATION_OBLIGATION_CUTOVER_RUNTIME_VERSION,
      deployment_id: "dpl-cutover",
    }).result).toBe("PASS");
    const after = captureBlogOsIsolationSnapshot(NOW);
    expect(after.digest).toBe(before.digest);
    expect(after.remediation_ids).toContain("f1336945-3350-4d08-921e-4dcb5bc77b8e");
  });

  it("keeps a stale worker heartbeat from looking configured-and-healthy", () => {
    recordCommunicationHeartbeat({ runtime: "scheduler", now: "2026-09-20T11:00:00.000Z", success: true, deployment: "old" });
    expect(heartbeatLiveness("scheduler", NOW)).toBe("STALE");
    expect(evaluateCommunicationRuntimeHeartbeatGate(NOW).result).toBe("FAIL");
  });
});
