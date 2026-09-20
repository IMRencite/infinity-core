import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateConsultativeSalesLanguageGate } from "@/lib/infinity/always-closing-sales/consultative-sales";
import { captureBlogOsIsolationSnapshot } from "@/lib/infinity/organic-growth-engine/blog-os/isolation-snapshot";
import { planConversation } from "../../conversation-planner";
import {
  atomicFlipThreadToObligation,
  evaluateAtomicCommunicationCutoverGate,
  evaluateLegacyJobCannotResurrectGate,
  resetAtomicCutoverState,
  seedLegacyJob,
} from "../atomic-cutover";
import { deriveEvidenceClass, evaluateEvidenceProvenanceIntegrityGate } from "../evidence";
import {
  composeHighIntentOfferFallback,
  evaluateHighIntentSalesFallbackGate,
  evaluateInRunSemanticRetryGate,
  evaluateSalesGateMutualSatisfiabilityGate,
  evaluateSemanticRetryDiversityGate,
  highIntentFallbackAllowed,
} from "../high-intent";
import {
  evaluateRecoveredTurnDatabaseInvariant,
  founderTrialIncident,
  inheritIncidentOntoObligation,
  persistRecoveredIncident,
  resetCommunicationIncidents,
} from "../incident";
import { replayLegacyDraftGates, replayLegacyDraftOnNewStack } from "../legacy-replay";
import {
  acquireOutboundOwnership,
  evaluateCommunicationCrossPathSendIdempotencyGate,
  evaluateLegacySendEpochCheckGate,
  resetOutboundOwnership,
} from "../ownership";
import {
  evaluateCommunicationProviderCredentialPathGate,
  evaluateProductionProviderIdentityGate,
  forensicCredentialConstruction,
  coverageCredentialConstruction,
  workerCredentialConstruction,
} from "../provider-identity";
import {
  evaluateCleanReleaseSourceGate,
  evaluateCommunicationBuildGraphIsolationGate,
  evaluateDeployableSourceHealthGate,
  evaluateNotProvenCoercionGate,
  evaluatePostDeployRuntimeVerificationGate,
  evaluateRuntimeReleaseParityGate,
  hashReleaseTree,
} from "../release-source";
import { COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID, STRANDED_FOUNDER_TRIAL_INBOUND_ID } from "../cutover";
import { resetCommunicationReleaseState } from "../release";
import { ingestProviderMessage } from "../worker";
import { resetCommunicationObligationStore } from "../store";

const NOW = "2026-09-20T18:00:00.000Z";
const INBOUND = "Yeah, I think I’d rather just try it. How do I start the free trial?";

describe("communication clean-release cutover v3", () => {
  it("1 dirty deployment source is rejected", () => {
    expect(evaluateCleanReleaseSourceGate({ dirty: true }).result).toBe("FAIL");
    expect(evaluateCleanReleaseSourceGate({ dirty: false }).result).toBe("PASS");
    expect(evaluateCleanReleaseSourceGate({ dirty: false, uploaded_includes_unrelated_blog_os: true }).result).toBe("FAIL");
  });

  it("2-3 release tree hash matches uploaded files and changes if contents change", () => {
    const a = hashReleaseTree([{ path: "a.ts", contents: "one" }]);
    const b = hashReleaseTree([{ path: "a.ts", contents: "one" }]);
    const c = hashReleaseTree([{ path: "a.ts", contents: "two" }]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("4 runtime and HQ release tracks are independent", () => {
    expect(evaluateRuntimeReleaseParityGate({
      intended_sha: "sha-a",
      observed_sha: "sha-a",
      intended_deployment: "dpl_a",
      observed_deployment: "dpl_a",
      dirty: false,
    }).result).toBe("PASS");
    expect(evaluateRuntimeReleaseParityGate({
      intended_sha: "sha-a",
      observed_sha: "sha-old",
      intended_deployment: "dpl_a",
      observed_deployment: "dpl_old",
      dirty: false,
    }).result).toBe("FAIL");
  });

  it("5 runtime isolation.ts no longer imports Blog-OS", () => {
    const isolation = readFileSync(join(process.cwd(), "lib/infinity/production-outbound/obligation/isolation.ts"), "utf8");
    expect(isolation).not.toMatch(/organic-growth-engine\/blog-os/);
    expect(evaluateCommunicationBuildGraphIsolationGate({
      includes_blog_os: false,
      includes_organic_growth: false,
      includes_geo_engine: false,
      blocking_import_edge: null,
    }).result).toBe("PASS");
  });

  it("6 NOT_PROVEN cannot be coerced to PASS or FAIL", () => {
    expect(evaluateNotProvenCoercionGate({ from: "NOT_PROVEN", to: "PASS" }).result).toBe("FAIL");
    expect(evaluateNotProvenCoercionGate({ from: "NOT_PROVEN", to: "FAIL" }).result).toBe("FAIL");
    expect(evaluateNotProvenCoercionGate({ from: "NOT_PROVEN", to: "NOT_PROVEN" }).result).toBe("PASS");
  });

  it("7 deployable source health keeps tracks separate", () => {
    const health = evaluateDeployableSourceHealthGate({
      repository_tests: "PASS",
      runtime_typecheck: "PASS",
      runtime_build: "PASS",
      hq_typecheck: "FAIL",
      hq_build: "FAIL",
    });
    expect(health.RuntimeTypecheck).toBe("PASS");
    expect(health.HQBuild).toBe("FAIL");
    expect(health.DeployableSourceHealthGate.result).toBe("PASS");
  });

  it("8-11 post-deploy heartbeat mismatches fail", () => {
    const expected = {
      RELEASE_SHA: "sha",
      RELEASE_TREE_HASH: "tree",
      RELEASE_DIRTY: false,
      BUILD_GRAPH_HASH: "graph",
      DEPLOYABLE_UNIT: "infinity-runtime" as const,
      DEPLOYMENT_ID: "dpl_new",
      CUTOVER_EPOCH_SEEN: "LEGACY",
    };
    expect(evaluatePostDeployRuntimeVerificationGate({ expected, heartbeat: null }).result).toBe("FAIL");
    expect(evaluatePostDeployRuntimeVerificationGate({ expected, heartbeat: { ...expected, RELEASE_SHA: "other" } }).result).toBe("FAIL");
    expect(evaluatePostDeployRuntimeVerificationGate({ expected, heartbeat: { ...expected, DEPLOYMENT_ID: "dpl_old" } }).result).toBe("FAIL");
    expect(evaluatePostDeployRuntimeVerificationGate({ expected, heartbeat: { ...expected, RELEASE_TREE_HASH: "other" } }).result).toBe("FAIL");
    expect(evaluatePostDeployRuntimeVerificationGate({ expected, heartbeat: expected }).result).toBe("PASS");
  });

  it("12-13 provider identity and credential path", () => {
    expect(evaluateProductionProviderIdentityGate({ email: "other@example.com" }).result).toBe("FAIL");
    expect(evaluateProductionProviderIdentityGate({ email: "hello@imros.io" }).result).toBe("PASS");
    expect(evaluateCommunicationProviderCredentialPathGate({
      worker: workerCredentialConstruction(),
      forensic: forensicCredentialConstruction(),
      coverage: coverageCredentialConstruction(),
    }).result).toBe("PASS");
    expect(evaluateCommunicationProviderCredentialPathGate({
      worker: workerCredentialConstruction(),
      forensic: "local-forensic-oauth",
      coverage: coverageCredentialConstruction(),
    }).result).toBe("FAIL");
  });

  it("14-15 recovered incident is monotonic and inherited", () => {
    resetCommunicationIncidents();
    const first = persistRecoveredIncident({
      mailbox_id: "occupancynpv-canary",
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      now: NOW,
    });
    expect(first.recovered).toBe(true);
    expect(first.clean_eligible).toBe(false);
    expect(evaluateRecoveredTurnDatabaseInvariant({ first, later: { recovered: false } }).result).toBe("FAIL");
    expect(evaluateRecoveredTurnDatabaseInvariant({ first, later: { recovered: true, clean_eligible: false } }).result).toBe("PASS");
    const inherited = inheritIncidentOntoObligation({
      mailbox_id: "occupancynpv-canary",
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
    });
    expect(inherited?.recovered).toBe(true);
    expect(inherited?.clean_eligible).toBe(false);
    resetCommunicationObligationStore();
    const ingested = ingestProviderMessage({
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      visible_body: INBOUND,
      received_at: "2026-09-20T11:01:41.000Z",
      now: NOW,
    });
    expect(ingested.obligation?.recovered).toBe(true);
    expect(ingested.obligation?.clean_eligible).toBe(false);
  });

  it("16-19 legacy draft replay and sales satisfiability", () => {
    const first = replayLegacyDraftGates(1);
    const second = replayLegacyDraftGates(2);
    expect(first.first_failing_gate).toBe("ConsultativeSalesLanguageGate");
    expect(first.first_reason).toBe("NO_PAIN");
    expect(second.first_failing_gate).toBe("ConsultativeSalesLanguageGate");
    expect(evaluateSemanticRetryDiversityGate({
      previous_strategy: "POSITIVE_INTEREST:START_TRIAL",
      new_strategy: "POSITIVE_INTEREST:START_TRIAL",
      rejection_reason: "NO_PAIN",
      repair_action: "REWRITE_SAME",
    }).result).toBe("FAIL");
    expect(evaluateSemanticRetryDiversityGate({
      previous_strategy: "POSITIVE_INTEREST:START_TRIAL",
      new_strategy: "HIGH_INTENT_OFFER_TRUTH_FALLBACK",
      rejection_reason: "NO_PAIN",
      repair_action: "SWITCH_TO_OFFER_TRUTH",
    }).result).toBe("PASS");
    expect(evaluateSalesGateMutualSatisfiabilityGate(INBOUND).result).toBe("PASS");
    const replay = replayLegacyDraftOnNewStack(1);
    expect(replay.new_first_failing_gate).toBeNull();
  });

  it("20-22 in-run retry, high-intent fallback, suppression wins", () => {
    expect(evaluateInRunSemanticRetryGate({ same_run: true, scheduler_cycle_consumed: false }).result).toBe("PASS");
    expect(evaluateInRunSemanticRetryGate({ same_run: false, scheduler_cycle_consumed: true }).result).toBe("FAIL");
    expect(evaluateHighIntentSalesFallbackGate(INBOUND).result).toBe("PASS");
    expect(highIntentFallbackAllowed({
      authorship: "PROSPECT",
      suppressed: true,
      offer_current: true,
      thread_valid: true,
      ownership_free: true,
    })).toBe(false);
    expect(composeHighIntentOfferFallback(INBOUND).body).toMatch(/3-day free trial/i);
  });

  it("23-26 cross-path ownership, epoch check, atomic flip, no resurrection", () => {
    resetOutboundOwnership();
    resetAtomicCutoverState();
    const first = {
      mailbox_id: "occupancynpv-canary",
      thread_id: COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID,
      answered_inbound_provider_message_id: STRANDED_FOUNDER_TRIAL_INBOUND_ID,
      owner_path: "OBLIGATION" as const,
      owner_id: "ob-1",
      created_at: NOW,
    };
    expect(acquireOutboundOwnership(first).ok).toBe(true);
    expect(acquireOutboundOwnership({ ...first, owner_path: "LEGACY", owner_id: "legacy-1" }).ok).toBe(false);
    expect(evaluateCommunicationCrossPathSendIdempotencyGate({
      first,
      second: { ...first, owner_path: "LEGACY", owner_id: "legacy-1" },
    }).result).toBe("FAIL");
    expect(evaluateLegacySendEpochCheckGate({
      database_epoch: "OBLIGATION",
      cached_startup_flag: "LEGACY",
      attempted_legacy_send: true,
    }).result).toBe("FAIL");
    seedLegacyJob({
      job_id: `job:${COMMUNICATION_OBLIGATION_CUTOVER_THREAD_ID}:${STRANDED_FOUNDER_TRIAL_INBOUND_ID}`,
      state: "BLOCKED",
      failure_reason: "ESCALATE_VISIBLE",
      superseded_by_obligation_id: null,
    });
    const flipped = atomicFlipThreadToObligation({
      now: NOW,
      mailbox_id: "occupancynpv-canary",
      obligation_id: "ob-1",
    });
    expect(flipped.job.state).toBe("SUPERSEDED_BY_OBLIGATION");
    expect(evaluateAtomicCommunicationCutoverGate({
      pre_epoch: "LEGACY",
      post_epoch: "OBLIGATION",
      job_state: flipped.job.state,
      ownership_path: "OBLIGATION",
      same_transaction: true,
    }).result).toBe("PASS");
    expect(evaluateLegacyJobCannotResurrectGate({
      job: flipped.job,
      reconciler_claimed: false,
      scheduler_claimed: false,
      worker_sent: false,
    }).result).toBe("PASS");
    resetCommunicationReleaseState();
  });

  it("27-32 planner, evidence, recovered never increments clean, blog snapshot unchanged", () => {
    const before = captureBlogOsIsolationSnapshot(NOW);
    const plan = planConversation({
      visible_body: INBOUND,
      previous_intent: "REQUEST_INPUTS",
      previous_outbound: "prior",
      stage: "QUALIFIED",
      prior_infinity_outbound_count: 4,
    });
    expect(plan.stage).toBe("HIGH_INTENT");
    expect(plan.intent).toBe("POSITIVE_INTEREST");
    expect(plan.first_touch_legal).toBe(false);
    expect(evaluateConsultativeSalesLanguageGate({
      inbound: INBOUND,
      generated: composeHighIntentOfferFallback(INBOUND).body,
      stage: "HIGH_INTENT",
      next_action: "START_TRIAL",
      turn: 5,
    }).result).toBe("PASS");
    expect(deriveEvidenceClass({ vitest: true })).toBe("UNIT");
    expect(evaluateEvidenceProvenanceIntegrityGate({ self_declared: true, derived: "LIVE_PROD" }).result).toBe("FAIL");
    expect(evaluateEvidenceProvenanceIntegrityGate({ self_declared: false, derived: "UNIT" }).result).toBe("PASS");
    const incident = founderTrialIncident(NOW);
    expect(incident.clean_eligible).toBe(false);
    const after = captureBlogOsIsolationSnapshot(NOW);
    expect(after.digest).toBe(before.digest);
  });
});
