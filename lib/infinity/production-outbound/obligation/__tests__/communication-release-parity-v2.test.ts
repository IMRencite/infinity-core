import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { replaceVentureBlogOsState, resetVentureBlogOsStore, seedOccupancyNpvBlogOsState } from "@/lib/infinity/organic-growth-engine/blog-os/store";
import { captureBlogOsIsolationSnapshot } from "@/lib/infinity/organic-growth-engine/blog-os/isolation-snapshot";
import type { NamedBlogGate } from "@/lib/infinity/organic-growth-engine/blog-os/types";
import {
  COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
  HISTORICAL_BUYING_SIGNAL_MESSAGE_ID,
  HISTORICAL_FALSE_STOP_MESSAGE_ID,
  HISTORICAL_STRANDED_QUESTION_MESSAGE_ID,
  STRANDED_FOUNDER_TRIAL_INBOUND_ID,
  forceCommunicationObligationCutoverForTests,
  setCommunicationCutoverEpochValue,
} from "../cutover";
import { resetCommunicationObligationStore, insertCommunicationOutboundLedger, claimOutboundOwnership } from "../store";
import { resetCommunicationHeartbeats, recordCommunicationHeartbeat, heartbeatLiveness } from "../heartbeat";
import {
  evaluateProductionReleaseParityGate,
  evaluateObservedReleaseParityGate,
  evaluateCommunicationCutoverEpochParityGate,
  evaluateCommunicationRuntimeIdentityGate,
  evaluateMainBranchDeployabilityGate,
  evaluateCrossDomainBuildIsolationGate,
  inspectIgnoreBuildErrorsProhibited,
  persistCommunicationIntendedRelease,
  flipCommunicationCutoverEpoch,
  resetCommunicationReleaseState,
  type CommunicationIntendedRelease,
} from "../release";
import { evaluateExternalCommunicationObserver, evaluateFailedDeploymentAlert, evaluateCommunicationWatchdogIndependenceGate } from "../observer";
import { evaluateShadowCompose, executeNoSendCanary, FOUNDER_TRIAL_INBOUND_TEXT, evaluateCommunicationProviderIdentityParityGate, evaluateCommunicationProviderReadCanaryGate } from "../canary";
import { remainingPacingFromProvider, evaluateCommunicationPacingAnchorGate, evaluateSloMargin, desiredNaturalPacingMs, COMMUNICATION_SCHEDULER_CADENCE_MS } from "../pacing";
import { markRecoveredTurn, evaluateRecoveredTurnMonotonicityGate, resetRecoveredTurns } from "../recovered";
import { evaluateHistoricalInboundCoverageGate, evaluateCommunicationCrossPathSendIdempotencyGate, evaluateProviderInboundCoverage } from "../coverage";
import { attachEvidenceClass, evaluateGateEvidenceClassIntegrity } from "../evidence";
import { normalizeCommunicationTimestamp, evaluateCommunicationTimestampNormalizationGate } from "../timestamps";
import { evaluateCrossSystemRuntimeIsolation } from "../isolation-core";

const NOW = "2026-09-20T16:30:00.000Z";
const SHA_NEW = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SHA_OLD = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const DPL_NEW = "dpl_new_cutover";
const DPL_OLD = "dpl_6dtsxZFscVtDGCKYsW8aKBwpZtNj";

function intended(status: CommunicationIntendedRelease["status"] = "INTENDED"): CommunicationIntendedRelease {
  return {
    release_id: "rel:cutover-v2",
    intended_git_sha: SHA_NEW,
    expected_deployment_target: "infinity-runtime",
    expected_deployment_id: DPL_NEW,
    communication_schema_version: "communication-obligation-authority-v2",
    planner_version: "conversation-planner-v1",
    cutover_epoch: "LEGACY",
    created_at: NOW,
    status,
  };
}

describe("communication release-parity v2", () => {
  beforeEach(() => {
    resetCommunicationObligationStore();
    resetCommunicationHeartbeats();
    resetCommunicationReleaseState();
    resetRecoveredTurns();
    resetVentureBlogOsStore();
    replaceVentureBlogOsState(seedOccupancyNpvBlogOsState(NOW));
    forceCommunicationObligationCutoverForTests(null);
    setCommunicationCutoverEpochValue("LEGACY");
  });
  afterEach(() => forceCommunicationObligationCutoverForTests(null));

  it("1 intended release build fail keeps production on old alias", () => {
    const gate = evaluateProductionReleaseParityGate({
      intended_git_sha: SHA_NEW,
      intended_deployment_id: DPL_NEW,
      promoted_deployment_id: DPL_OLD,
      observed_git_sha: SHA_OLD,
      observed_deployment_id: DPL_OLD,
    });
    expect(gate.result).toBe("FAIL");
  });

  it("2 production alias remains on old deployment", () => {
    expect(evaluateProductionReleaseParityGate({
      intended_git_sha: SHA_NEW,
      intended_deployment_id: DPL_NEW,
      promoted_deployment_id: DPL_OLD,
      observed_git_sha: SHA_NEW,
      observed_deployment_id: DPL_NEW,
    }).result).toBe("FAIL");
  });

  it("3 observer detects intended/observed mismatch", () => {
    persistCommunicationIntendedRelease(intended());
    recordCommunicationHeartbeat({ runtime: "scheduler", now: NOW, deployment: DPL_OLD, git_sha: SHA_OLD, invoked_by: "cron" });
    const observer = evaluateExternalCommunicationObserver({
      now: NOW,
      promoted_deployment_id: DPL_OLD,
      observed_git_sha: SHA_OLD,
      observed_deployment_id: DPL_OLD,
    });
    expect(observer.intended_vs_observed.result).toBe("FAIL");
    expect(observer.ExternalCommunicationObserverGate.result).toBe("FAIL");
  });

  it("4 old deployment heartbeat differs from intended SHA", () => {
    persistCommunicationIntendedRelease(intended());
    const observed = evaluateObservedReleaseParityGate({
      intended: intended(),
      observed: {
        runtime_name: "scheduler",
        git_sha: SHA_OLD,
        deployment_id: DPL_OLD,
        cutover_epoch_seen: "LEGACY",
        build_version: "pre-cutover",
        invoked_by: "cron",
        started_at: NOW,
        last_success_at: NOW,
        last_failure_at: null,
        last_error: null,
        work_seen: 1,
        work_claimed: 0,
      },
      now: NOW,
    });
    expect(observed.result).toBe("FAIL");
  });

  it("5 new code in repo is not production until heartbeat matches", () => {
    persistCommunicationIntendedRelease(intended());
    expect(evaluateObservedReleaseParityGate({
      intended: intended(),
      observed: null,
      now: NOW,
    }).result).toBe("FAIL");
  });

  it("6 Blog-OS type mapping is semantics-preserving and does not mutate blog state", () => {
    const before = captureBlogOsIsolationSnapshot(NOW);
    const mapped: NamedBlogGate = { gate: "QuestionCoverageGate", result: "NOT_PROVEN", reasons: ["X"] };
    expect(mapped.result).toBe("NOT_PROVEN");
    expect(mapped.result).not.toBe("PASS");
    expect(mapped.result).not.toBe("FAIL");
    const after = captureBlogOsIsolationSnapshot(NOW);
    expect(after.digest).toBe(before.digest);
    expect(after.obligation_states).toEqual(before.obligation_states);
  });

  it("7 ignoreBuildErrors is prohibited", () => {
    expect(inspectIgnoreBuildErrorsProhibited(join(process.cwd())).result).toBe("PASS");
    expect(readFileSync(join(process.cwd(), "next.config.ts"), "utf8")).not.toMatch(/ignoreBuildErrors\s*:\s*true/);
  });

  it("8 intended release times out after two ticks", () => {
    persistCommunicationIntendedRelease(intended());
    const stale = evaluateObservedReleaseParityGate({
      intended: intended(),
      observed: {
        runtime_name: "scheduler",
        git_sha: SHA_NEW,
        deployment_id: DPL_NEW,
        cutover_epoch_seen: "LEGACY",
        build_version: "v2",
        invoked_by: "cron",
        started_at: "2026-09-20T16:00:00.000Z",
        last_success_at: "2026-09-20T16:00:00.000Z",
        last_failure_at: null,
        last_error: null,
        work_seen: 1,
        work_claimed: 0,
      },
      now: NOW,
    });
    expect(stale.result).toBe("FAIL");
    expect(stale.reasons.some((row) => row.includes("ms") || row === "NO_HEARTBEAT")).toBe(true);
  });

  it("9 cutover epoch does not flip until new heartbeat exists", () => {
    expect(flipCommunicationCutoverEpoch("OBLIGATION", NOW).epoch).toBe("OBLIGATION");
    expect(evaluateCommunicationCutoverEpochParityGate({
      database_epoch: "OBLIGATION",
      runtime_epoch_seen: "LEGACY",
    }).result).toBe("FAIL");
  });

  it("10 runtime sees wrong epoch", () => {
    expect(evaluateCommunicationCutoverEpochParityGate({
      database_epoch: "LEGACY",
      runtime_epoch_seen: "OBLIGATION",
    }).result).toBe("FAIL");
  });

  it("11 failed deployment alert creates remediation", () => {
    const alert = evaluateFailedDeploymentAlert({
      intended_release_id: "rel:cutover-v2",
      commit: SHA_NEW,
      deployment: "dpl_AgYvu7v8rca3cSht3G7mzKtsCrX5",
      reason: "Blog-OS report.ts NOT_PROVEN not assignable to PASS|FAIL",
    });
    expect(alert.kind).toBe("RELEASE_FAILED");
    expect(alert.next_action).toContain("REPAIR_BUILD");
  });

  it("12 old production remains responsive but readiness still fails", () => {
    recordCommunicationHeartbeat({ runtime: "scheduler", now: NOW, deployment: DPL_OLD, git_sha: SHA_OLD, invoked_by: "cron" });
    expect(heartbeatLiveness("scheduler", NOW)).toBe("RUNNING");
    expect(evaluateProductionReleaseParityGate({
      intended_git_sha: SHA_NEW,
      intended_deployment_id: DPL_NEW,
      promoted_deployment_id: DPL_OLD,
      observed_git_sha: SHA_OLD,
      observed_deployment_id: DPL_OLD,
    }).result).toBe("FAIL");
  });

  it("provider mailbox mismatch fails identity parity", () => {
    expect(evaluateCommunicationProviderIdentityParityGate({
      production_mailbox: "hello@imros.io",
      forensic_mailbox: "other@example.com",
      watchdog_mailbox: "hello@imros.io",
      expected: "hello@imros.io",
    }).result).toBe("FAIL");
  });

  it("provider read failure fails canary", () => {
    expect(evaluateCommunicationProviderReadCanaryGate({ ok: false, mailbox: null, error: "GMAIL_READ_FAILED" }).result).toBe("FAIL");
  });

  it("coverage observer catches missing obligation", () => {
    const coverage = evaluateProviderInboundCoverage({
      mailbox_id: "occupancynpv-canary",
      messages: [{ id: STRANDED_FOUNDER_TRIAL_INBOUND_ID, role: "PROSPECT", later_reply: false }],
    });
    expect(coverage.missing).toBe(1);
    expect(coverage.ProviderInboundCoverageGate.result).toBe("FAIL");
  });

  it("cross-path unique send ownership prevents duplicate", () => {
    const first = claimOutboundOwnership({
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      path: "OBLIGATION",
    });
    insertCommunicationOutboundLedger({
      obligation_id: "ob-1",
      attempt_id: "at-1",
      rfc_message_id: "<a@infinity>",
      custom_header: "X-Obligation-Id: ob-1",
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      path: "OBLIGATION",
      body_hash: "x",
      created_at: NOW,
      provider_message_id: null,
      accepted_at: null,
    });
    const second = insertCommunicationOutboundLedger({
      obligation_id: "ob-legacy",
      attempt_id: "at-legacy",
      rfc_message_id: "<b@infinity>",
      custom_header: null,
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      path: "LEGACY",
      body_hash: "y",
      created_at: NOW,
      provider_message_id: null,
      accepted_at: null,
    });
    expect(first.ok).toBe(true);
    expect(second).toBe("EXISTING");
    expect(evaluateCommunicationCrossPathSendIdempotencyGate({ first: "OK", second: "EXISTING" }).result).toBe("PASS");
  });

  it("historical inbounds map to covered or suppressed", () => {
    expect(evaluateHistoricalInboundCoverageGate({
      messages: [
        { id: HISTORICAL_STRANDED_QUESTION_MESSAGE_ID, later_reply: true },
        { id: HISTORICAL_BUYING_SIGNAL_MESSAGE_ID, later_reply: true },
        { id: HISTORICAL_FALSE_STOP_MESSAGE_ID, later_reply: false },
        { id: STRANDED_FOUNDER_TRIAL_INBOUND_ID, later_reply: false },
      ],
    }).result).toBe("PASS");
  });

  it("pacing anchors to provider received and worst-case 5m cadence fits 20m SLO", () => {
    const pacing = remainingPacingFromProvider({
      provider_received_at: "2026-09-20T11:01:41.000Z",
      now: "2026-09-20T11:05:31.494Z",
      desired_ms: desiredNaturalPacingMs(),
    });
    expect(pacing.anchored_to).toBe("PROVIDER_RECEIVED");
    expect(pacing.remaining_ms).toBeLessThan(desiredNaturalPacingMs());
    expect(evaluateCommunicationPacingAnchorGate({
      anchored_to: pacing.anchored_to,
      provider_received_at: "2026-09-20T11:01:41.000Z",
      discovered_at: "2026-09-20T11:05:31.494Z",
      eligible_at: pacing.eligible_at,
    }).result).toBe("PASS");
    const worstPacing = remainingPacingFromProvider({
      provider_received_at: "2026-09-20T11:00:00.000Z",
      now: "2026-09-20T11:05:00.000Z",
      desired_ms: desiredNaturalPacingMs(),
    });
    const margin = evaluateSloMargin({
      discovery_ms: COMMUNICATION_SCHEDULER_CADENCE_MS,
      pacing_ms: worstPacing.remaining_ms,
      claim_ms: COMMUNICATION_SCHEDULER_CADENCE_MS,
      retry_ms: COMMUNICATION_SCHEDULER_CADENCE_MS,
      send_ms: 60_000,
    });
    expect(margin.fits).toBe(true);
  });

  it("shadow compose of founder inbound is high-intent trial close", () => {
    const shadow = evaluateShadowCompose({ visible_body: FOUNDER_TRIAL_INBOUND_TEXT });
    expect(shadow.plan.intent).toBe("POSITIVE_INTEREST");
    expect(shadow.plan.next_action).toBe("START_TRIAL");
    expect(shadow.plan.stage).not.toBe("FIRST_TOUCH");
    expect(shadow.body).toMatch(/3-day/);
    expect(shadow.body).toMatch(/no credit card/i);
    expect(shadow.body).toMatch(/no automatic billing/i);
    expect(shadow.body).toMatch(/occupancynpv.com\/pricing/);
    expect(shadow.LiveInboundShadowComposeGate.result).toBe("PASS");
  });

  it("no-send canary writes ledger and never sends", async () => {
    const canary = await executeNoSendCanary({ now: NOW, invoked_by: "synthetic_canary" });
    expect(canary.provider_send).toBe("NO-OP");
    expect(canary.gate.result).toBe("PASS");
    expect(canary.obligation?.state).toBe("NO_REPLY_POLICY");
  });

  it("recovered turn cannot become clean", () => {
    const first = markRecoveredTurn({
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      now: NOW,
      reason: "SLO_BREACHED",
    });
    expect(evaluateRecoveredTurnMonotonicityGate({ first, later: { recovered: true, clean: false } }).result).toBe("PASS");
    expect(evaluateRecoveredTurnMonotonicityGate({ first, later: { recovered: true, clean: true } }).result).toBe("FAIL");
  });

  it("evidence class integrity rejects LOCAL-only critical PASS", () => {
    const gate = attachEvidenceClass(
      evaluateProductionReleaseParityGate({
        intended_git_sha: SHA_NEW,
        intended_deployment_id: DPL_NEW,
        promoted_deployment_id: DPL_NEW,
        observed_git_sha: SHA_NEW,
        observed_deployment_id: DPL_NEW,
      }),
      "LOCAL",
      { now: NOW, git_sha: SHA_NEW, deployment_id: DPL_NEW },
    );
    expect(evaluateGateEvidenceClassIntegrity([gate]).result).toBe("FAIL");
  });

  it("watchdog independence and main deployability", () => {
    expect(evaluateCommunicationWatchdogIndependenceGate({
      observer_project: "infinity-hq",
      worker_project: "infinity-runtime",
    }).result).toBe("PASS");
    expect(evaluateMainBranchDeployabilityGate({
      ignore_build_errors: false,
      typecheck_bypass: false,
      production_target_builds: true,
    }).result).toBe("PASS");
    expect(evaluateCrossDomainBuildIsolationGate({
      isolated_runtime_project: true,
      blog_os_excluded_from_runtime_typecheck: true,
      ignore_build_errors: false,
    }).result).toBe("PASS");
    expect(evaluateCrossSystemRuntimeIsolation({
      communication_wrote_blog_os: false,
      communication_changed_execute_publish: false,
      communication_changed_organic_runtime: false,
    }).result).toBe("PASS");
  });

  it("runtime identity requires sha or deployment plus epoch and invoker", () => {
    expect(evaluateCommunicationRuntimeIdentityGate({
      runtime_name: "scheduler",
      git_sha: SHA_NEW,
      deployment_id: DPL_NEW,
      cutover_epoch_seen: "LEGACY",
      build_version: "communication-release-parity-v2",
      invoked_by: "cron",
      started_at: NOW,
      last_success_at: NOW,
      last_failure_at: null,
      last_error: null,
      work_seen: 1,
      work_claimed: 0,
    }).result).toBe("PASS");
    expect(normalizeCommunicationTimestamp({ raw: "2026-09-20T11:01:41.000Z", source: "PROVIDER" }).utc).toBe("2026-09-20T11:01:41.000Z");
    expect(evaluateCommunicationTimestampNormalizationGate(normalizeCommunicationTimestamp({ raw: "2026-09-20T11:01:41.000Z" })).result).toBe("PASS");
  });
});
