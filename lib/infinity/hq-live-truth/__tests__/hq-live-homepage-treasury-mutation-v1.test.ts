import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { overlayCanonicalTreasuryOnHqReadModel } from "@/lib/infinity/financial-truth/treasury-overlay";
import {
  evaluateTreasuryAllocationIdempotencyGate,
  evaluateTreasuryAllocationPayloadSecurityGate,
  evaluateTreasuryBudgetMutationIdempotencyGate,
  evaluateTreasuryBudgetPayloadSecurityGate,
} from "@/lib/infinity/financial-truth/treasury-payload-contracts";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { emptyTreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import { assertNoCredentialFields, isForbiddenTreasuryCredentialKey } from "@/lib/infinity/treasury/security";
import { projectCodingCapability } from "@/lib/infinity/capability-truth/coding";
import { projectCanonicalCapabilities } from "@/lib/infinity/capability-truth/projection";
import {
  evaluateCapabilityContradictionGate,
  evaluateCapabilityFreshnessGate,
  evaluateCapabilityScopeGate,
  evaluateCapabilityTruthGate,
  evaluateCanonicalCapabilityProjectionGate,
  evaluateCrossSurfaceCanonicalConsistencyGate,
} from "@/lib/infinity/capability-truth/gates";
import { resolveCanonicalSelectedVenture } from "@/lib/infinity/capability-truth/selected-venture";
import {
  resetCanonicalWorkStore,
  startCurrentImplementationWork,
  completeCurrentImplementationWork,
} from "@/lib/infinity/canonical-work";
import { resetMissionActivityStore } from "@/lib/infinity/mission-activity";
import { projectVentureOperatingScaleHq } from "@/lib/infinity/venture-operating-scale/hq";
import { projectPortfolioActualEconomics } from "@/lib/infinity/financial-truth/portfolio-actual-economics";
import { deriveHqConnectionStatus } from "@/lib/infinity/operator-console/hq-live-policy";
import { isGenericImplementationText, resolveAgentCurrentTask, resolveRoomCurrentWork } from "@/lib/infinity/room-work";
import { applyConnectionFreshness, resolveHqDatumFreshness } from "../freshness";
import { evaluateHQAllDataLiveGate, evaluateHQLiveCanonicalTruthGate } from "../gates";
import { projectCanonicalHQLive } from "../projection";
import { HQ_LIVE_OPERATIONAL_TRUTH_RULE } from "../types";

function source(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("HQ live homepage truth + treasury mutation repair v1", () => {
  beforeEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });
  afterEach(() => {
    resetMissionActivityStore();
    resetCanonicalWorkStore();
  });

  it("1-5: material homepage datums are sourced, freshness-aware, and SSE disconnect marks stale", () => {
    expect(HQ_LIVE_OPERATIONAL_TRUTH_RULE).toMatch(/LIVE PROJECTION/);
    const projection = projectCanonicalHQLive({ generatedAt: "2026-09-13T11:00:00.000Z" });
    expect(projection.contract).toBe("CanonicalHQLiveProjection");
    expect(projection.datums.length).toBeGreaterThan(20);
    expect(projection.datums.every((row) => row.source && row.canonical_reference && row.freshness_state)).toBe(true);
    expect(evaluateHQAllDataLiveGate(projection).result).toBe("PASS");
    expect(evaluateHQLiveCanonicalTruthGate({ projection, staticOperationalSnapshots: 0 }).result).toBe("PASS");
    const stale = applyConnectionFreshness(projection.datums, "STALE");
    expect(stale.some((row) => row.freshness_state === "STALE")).toBe(true);
    expect(resolveHqDatumFreshness({ lastVerifiedAt: "2026-09-13T10:00:00.000Z", thresholdMs: 1000, nowMs: Date.parse("2026-09-13T11:00:00.000Z") })).toBe("STALE");
    expect(deriveHqConnectionStatus({ nowMs: 20_000, lastSuccessMs: 19_000, realtimeState: "closed", lastDisconnectMs: 19_500 })).toBe("RECONNECTING");
    const hook = source("components/dashboard/operator-console/use-hq-live-projection.ts");
    expect(hook).toContain("catchUp");
    expect(hook).toContain("attachEventSource");
  });

  it("6-13: coding, hosting, payments, registrar, DNS, revenue, learning stay source-backed", () => {
    const idle = projectCodingCapability("2026-09-13T11:00:00.000Z");
    expect(idle.external_implementation_agent.value).not.toBe("NOT_CONFIGURED");
    startCurrentImplementationWork({
      title: "INFINITY — LIVE HOMEPAGE TRUTH + TREASURY MUTATION REPAIR V1",
      description: "Editing lib/infinity/treasury/security.ts",
      now: "2026-09-13T11:00:00.000Z",
    });
    expect(projectCodingCapability("2026-09-13T11:00:00.000Z").external_implementation_agent.value).toBe("ACTIVE");
    expect(projectCodingCapability("2026-09-13T11:00:00.000Z").connector_status).toBe("NOT_CONNECTED");
    const capabilities = projectCanonicalCapabilities("2026-09-13T11:00:00.000Z");
    expect(capabilities.capabilities.find((row) => row.capability_id === "HOSTING")?.value).not.toBe("NOT_CONFIGURED");
    expect(capabilities.capabilities.find((row) => row.capability_id === "PAYMENTS")?.value).not.toBe("NOT_CONFIGURED");
    expect(capabilities.capabilities.find((row) => row.capability_id === "DOMAIN_REGISTRAR")?.mutation_authority).toBe("LOCKED");
    expect(capabilities.capabilities.find((row) => row.capability_id === "DNS")?.value).not.toBe("NOT_CONFIGURED");
    const vos = projectVentureOperatingScaleHq();
    expect(vos.revenueState).toMatch(/^\$/);
    expect(vos.latestLearning).not.toBe("UNCONFIGURED");
    expect(["NONE YET", vos.latestLearning]).toContain(vos.latestLearning);
    expect(["RUNNING", "DEGRADED", "STOPPED", "STALE"]).toContain(vos.communicationState);
  });

  it("14-18: communication freshness, top earners, room/agent specificity", () => {
    const economics = projectPortfolioActualEconomics("2026-09-13T11:00:00.000Z");
    expect(economics.top_revenue_venture.ranking_basis).toBe("CURRENT_MONTH_REVENUE");
    const work = startCurrentImplementationWork({
      title: "INFINITY — LIVE HOMEPAGE TRUTH + TREASURY MUTATION REPAIR V1",
      description: "Editing lib/infinity/hq-live-truth/projection.ts",
      now: "2026-09-13T11:00:00.000Z",
    });
    const room = resolveRoomCurrentWork(work, "systems_architect");
    const agent = resolveAgentCurrentTask({
      work,
      roomId: "systems_architect",
      agentName: "Systems Architect",
      agentId: "agent:systems",
    });
    expect(isGenericImplementationText(room.contribution_summary)).toBe(false);
    expect(isGenericImplementationText(agent.task_summary)).toBe(false);
    expect(room.contribution_summary).not.toBe(work.title);
  });

  it("19-23: allocation/budget safe payloads work and secrets stay rejected", () => {
    expect(isForbiddenTreasuryCredentialKey("authorizationSource")).toBe(false);
    expect(isForbiddenTreasuryCredentialKey("remaining_authorization")).toBe(false);
    expect(isForbiddenTreasuryCredentialKey("provider_account_reference")).toBe(false);
    expect(isForbiddenTreasuryCredentialKey("api_key")).toBe(true);
    expect(isForbiddenTreasuryCredentialKey("client_secret")).toBe(true);
    expect(isForbiddenTreasuryCredentialKey("account_number")).toBe(true);
    expect(evaluateTreasuryAllocationPayloadSecurityGate({
      action: "allocate",
      ventureId: CRE_VENTURE_ID,
      amountUsd: 5,
      purpose: "test",
      idempotencyKey: "k1",
    }).result).toBe("PASS");
    expect(evaluateTreasuryBudgetPayloadSecurityGate({
      action: "update_budget",
      scope: "VENTURE",
      ventureId: CRE_VENTURE_ID,
      field: "venture_budget_ceiling",
      amountUsd: 5,
      idempotencyKey: "k2",
    }).result).toBe("PASS");
    expect(evaluateTreasuryAllocationPayloadSecurityGate({ action: "allocate", api_key: "x" }).result).toBe("FAIL");
    expect(evaluateTreasuryBudgetPayloadSecurityGate({ action: "update_budget", password: "x" }).result).toBe("FAIL");
    expect(evaluateTreasuryAllocationIdempotencyGate({ first: { ok: true, allocated: 25 }, retry: { ok: true, allocated: 25 } }).result).toBe("PASS");
    expect(evaluateTreasuryBudgetMutationIdempotencyGate({ first: { ok: true, ceiling: 5 }, retry: { ok: true, ceiling: 5 } }).result).toBe("PASS");
  });

  it("24-27: live overlay, no duplicate pollers, overlay model is not a credential refusal", () => {
    const liveState = source("lib/infinity/operator-console/hq-canonical-live-state.ts");
    expect(liveState).toContain("projectCanonicalHQLive");
    const client = source("components/dashboard/operator-console/venture-operator-console.tsx");
    expect(client).toContain("canonicalLive");
    expect(client).toContain("capabilityArtifacts");
    expect(source("lib/infinity/operator-console/hq-canonical-watch.ts")).toContain("HQ_CANONICAL_WATCH_INTERVAL_MS = 500");
    expect(liveState).not.toMatch(/setInterval\(\s*projectCanonicalHQLive/);
    const model = overlayCanonicalTreasuryOnHqReadModel(emptyTreasuryHqReadModel("org"), {
      contract: "CanonicalTreasuryProjection",
      treasury_status: "LIVE",
      bank_provider: "Mercury",
      bank_connection: "READ_ONLY",
      last_financial_sync: "2026-09-13T11:00:00.000Z",
      cash_completeness: "COMPLETE",
      infrastructure_mode: "SHARED_PARENT",
      parent_entity: "IMR",
      verified_treasury_cash: { value: 50, display: "$50", source: "Mercury", sync: "LIVE" },
      mercury_available: { value: 50, display: "$50", source: "Mercury", sync: "LIVE" },
      mercury_current: { value: 50, display: "$50", source: "Mercury", sync: "LIVE" },
      authorized_capital: { value: 50, display: "$50", source: "policy", sync: "LIVE" },
      allocated_capital: { value: 25, display: "$25", source: "ledger", sync: "LIVE" },
      committed_capital: { value: 0, display: "$0", source: "ledger", sync: "LIVE" },
      actual_spend: { value: 0, display: "$0", source: "ledger", sync: "LIVE" },
      remaining_authorization: { value: 25, display: "$25", source: "policy", sync: "LIVE" },
      unallocated_authorized_capital: { value: 25, display: "$25", source: "ledger", sync: "LIVE" },
      monthly_burn_cap: { value: null, display: "NOT_SET", source: "policy", sync: "LIVE" },
      stripe_available: { value: 0, display: "$0", source: "stripe", sync: "LIVE" },
      stripe_pending: { value: 0, display: "$0", source: "stripe", sync: "LIVE" },
      paid_acquisition_budget: { value: 0, display: "$0", source: "policy", sync: "LIVE" },
      money_movement_enabled: false,
      mercury_write_access: false,
      portfolio_budget: {
        classification: "CANONICAL_POLICY",
        portfolio_capital_ceiling: 50,
        monthly_burn_cap: "NOT_SET",
        maximum_single_autonomous_purchase: "NOT_SET",
        daily_spending_ceiling: "NOT_SET",
        reserve_requirement: "NOT_SET",
        paid_acquisition_budget: 0,
        category_limits: {},
        updated_at: null,
      },
      allocations: [],
      transactions: [
        {
          date: "2026-09-13",
          amount: "$0",
          description: "sync",
          classification: "OTHER",
          venture_attribution: "NONE",
          safe_transaction_id: "txn",
          status: "POSTED",
        },
      ],
      commitments: [],
      ventures: [],
    } as never);
    expect(assertNoCredentialFields(model)).toEqual([]);
    expect(source("app/api/operator-console/treasury/route.ts")).toContain("evaluateTreasuryAllocationPayloadSecurityGate");
    expect(source("lib/infinity/treasury/security.ts")).not.toMatch(/FORBIDDEN_PATTERN = \/secret\|token\|authorization/);
  });

  it("28-33: containment, contradictions, all-data live, founder defect keeps QC blocked", () => {
    expect(source("lib/infinity/financial-truth/machine-state-presentation.ts")).toContain("Processor confirmed");
    const projection = projectCanonicalCapabilities("2026-09-13T11:00:00.000Z");
    expect(evaluateCanonicalCapabilityProjectionGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityTruthGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityScopeGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityFreshnessGate(projection).result).toBe("PASS");
    expect(evaluateCapabilityContradictionGate({ projection, paymentActivation: "YES" }).result).toBe("PASS");
    expect(
      evaluateCrossSurfaceCanonicalConsistencyGate({
        paymentsDisplay: "Stripe — LIVE",
        hostingDisplay: "CONNECTED",
        codingCursorDisplay: "ACTIVE",
        revenueDisplay: "$0",
        selectedVenture: "NONE SELECTED",
        paymentActivation: "YES",
        projection,
      }).result,
    ).toBe("PASS");
    expect(resolveCanonicalSelectedVenture({ ventureName: "Autonomous Venture Cycle" }).rejected_harness_label).toBe(true);
    expect(source("lib/infinity/universal-artifact-qc/lifecycle.ts")).toMatch(/QC_REPAIR_REQUIRED|RELEASE_READY/);
    completeCurrentImplementationWork("stop", "2026-09-13T11:00:01.000Z");
  });
});
