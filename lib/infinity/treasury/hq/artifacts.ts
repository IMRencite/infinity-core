import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import { resolveVentureDisplayName } from "@/lib/infinity/operator-console/resolve-venture-display-name";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { TreasuryHqReadModel } from "./read-model";

export type TreasuryVentureNameLookup = {
  displayNameForVenture?: (ventureId: string) => string;
  lineageForVenture?: (ventureId: string) => { candidateId?: string | null; blueprintId?: string | null };
};

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export function buildTreasuryHqArtifacts(
  model: TreasuryHqReadModel,
  names?: TreasuryVentureNameLookup,
): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};

  push(map, "executive_office", {
    id: buildArtifactRenderId({
      artifactType: "treasury_state",
      sourceRecordType: "treasury_state",
      sourceRecordId: model.organizationId,
    }),
    roomId: "executive_office",
    artifactType: "treasury_state",
    title: "Treasury & Capital",
    subtitle: model.freshnessLabel,
    state: model.state.providerFreshness === "UNAVAILABLE" ? "FAILED" : "READY",
    createdAt: model.state.lastProviderSyncAt,
    sourceRecordType: "treasury_state",
    sourceRecordId: model.organizationId,
    metadata: {
      totalCash: model.cards.totalCash.display,
      internalCapital: model.cards.internalCapital.display,
      availableCapital: model.cards.availableCapital.display,
      allocatedCapital: model.cards.infinityAllocatedCapital.display,
      unallocatedCapital: model.cards.unallocatedCapital.display,
      reservedCapital: model.cards.reservedCapital.display,
      committedCapital: model.cards.committedCapital.display,
      treasurySource: model.treasurySource,
      bankingProvider: model.bankingProvider,
      freshness: model.freshnessLabel,
      fundingClass: "INTERNAL / MANUAL / NON-BANK",
    },
  });

  for (const constraint of model.constraints.filter((c) => c.category)) {
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "treasury_budget",
        sourceRecordType: "treasury_budget",
        sourceRecordId: `${model.organizationId}:${constraint.category}`,
      }),
      roomId: "strategy_finance",
      artifactType: "treasury_budget",
      title: `${constraint.label} budget`,
      subtitle: `Available ${constraint.available.display}`,
      state: "READY",
      createdAt: null,
      sourceRecordType: "treasury_budget",
      sourceRecordId: `${model.organizationId}:${constraint.category}`,
      metadata: {
        spent: constraint.spent.display,
        reserved: constraint.reserved.display,
        committed: constraint.committed.display,
        available: constraint.available.display,
      },
    });
  }

  for (const venture of model.ventures) {
    const displayName =
      names?.displayNameForVenture?.(venture.ventureId) ?? resolveVentureDisplayName({ id: venture.ventureId });
    const lineage = names?.lineageForVenture?.(venture.ventureId) ?? {};
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "venture_capital_allocation",
        sourceRecordType: "venture_capital_allocation",
        sourceRecordId: venture.ventureId,
      }),
      roomId: "strategy_finance",
      artifactType: "venture_capital_allocation",
      title: displayName,
      subtitle: `${venture.status} · allocated ${venture.allocated.display}`,
      state: "READY",
      createdAt: venture.updatedAt,
      sourceRecordType: "venture_capital_allocation",
      sourceRecordId: venture.ventureId,
      metadata: {
        ventureDisplayName: displayName,
        ventureId: venture.ventureId,
        candidateId: lineage.candidateId ?? null,
        blueprintId: lineage.blueprintId ?? null,
        allocated: venture.allocated.display,
        reserved: venture.reserved.display,
        committed: venture.committed.display,
        spent: venture.spent.display,
        available: venture.available.display,
        expectedRevenue: venture.expectedRevenue.display,
        actualRevenue: venture.actualRevenue.display,
        expectedProfit: venture.expectedProfit.display,
        actualProfit: venture.actualProfit.display,
        revenue: venture.revenue.display,
        profit: venture.profit.display,
        roi: venture.roi.display,
        origin: venture.origin,
        stage: venture.stage,
        updatedAt: venture.updatedAt,
        fundingClass: "INTERNAL / MANUAL / NON-BANK",
      },
    });
  }

  for (const request of model.requests) {
    push(map, "executive_office", {
      id: buildArtifactRenderId({
        artifactType: "financial_action",
        sourceRecordType: "financial_action_request",
        sourceRecordId: request.requestId,
      }),
      roomId: "executive_office",
      artifactType: "financial_action",
      title: request.purpose,
      subtitle: request.status,
      state: request.status === "BLOCKED" || request.status === "FAILED" ? "FAILED" : request.status === "EXECUTED" ? "READY" : "CREATING",
      createdAt: request.createdAt,
      sourceRecordType: "financial_action_request",
      sourceRecordId: request.requestId,
      metadata: {
        category: request.category,
        amount: request.amount.value == null ? "UNKNOWN" : String(request.amount.value),
        actuality: request.amount.actuality,
        currency: request.currency,
        recurring: request.recurring,
        ventureId: request.ventureId,
        missionId: request.missionId,
        justification: request.economicJustification,
        idempotencyKey: request.idempotencyKey,
        provider: request.provider,
      },
    });
  }

  for (const txn of model.transactions) {
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "treasury_transaction",
        sourceRecordType: "treasury_transaction",
        sourceRecordId: txn.transactionId,
      }),
      roomId: "strategy_finance",
      artifactType: "treasury_transaction",
      title: txn.merchant,
      subtitle: txn.amount.display,
      state: txn.status === "FAILED" ? "FAILED" : "READY",
      createdAt: txn.date,
      sourceRecordType: "treasury_transaction",
      sourceRecordId: txn.transactionId,
      metadata: {
        category: txn.category,
        ventureId: txn.ventureId,
        purpose: txn.purpose,
        provider: txn.provider,
        financialActionId: txn.financialActionId,
        authorizationSource: txn.authorizationSource,
        status: txn.status,
      },
    });
  }

  for (const commitment of model.commitments) {
    push(map, "strategy_finance", {
      id: buildArtifactRenderId({
        artifactType: "recurring_commitment",
        sourceRecordType: "treasury_recurring_commitment",
        sourceRecordId: commitment.commitmentId,
      }),
      roomId: "strategy_finance",
      artifactType: "recurring_commitment",
      title: commitment.vendor,
      subtitle: commitment.purpose,
      state: commitment.status === "ACTIVE" ? "READY" : "ARCHIVED",
      createdAt: commitment.createdAt,
      sourceRecordType: "treasury_recurring_commitment",
      sourceRecordId: commitment.commitmentId,
      metadata: {
        category: commitment.category,
        monthly: commitment.monthlyEquivalent.value == null ? "UNKNOWN" : String(commitment.monthlyEquivalent.value),
        annual: commitment.annualEquivalent.value == null ? "UNKNOWN" : String(commitment.annualEquivalent.value),
        nextExpectedCharge: commitment.nextExpectedCharge,
        provider: commitment.provider,
      },
    });
  }

  return map;
}

export function mergeTreasuryArtifacts(base: HqRoomArtifactMap | undefined, treasury: HqRoomArtifactMap): HqRoomArtifactMap {
  const out: HqRoomArtifactMap = { ...base };
  for (const [roomId, artifacts] of Object.entries(treasury)) {
    const key = roomId as DepartmentId;
    out[key] = [...(out[key] ?? []), ...(artifacts ?? [])];
  }
  return out;
}

export function replaceTreasuryArtifacts(base: HqRoomArtifactMap | undefined, treasury: HqRoomArtifactMap): HqRoomArtifactMap {
  const treasuryTypes = new Set([
    "treasury_state",
    "treasury_budget",
    "venture_capital_allocation",
    "financial_action",
    "treasury_transaction",
    "recurring_commitment",
  ]);
  const stripped: HqRoomArtifactMap = {};
  for (const [roomId, artifacts] of Object.entries(base ?? {})) {
    stripped[roomId as DepartmentId] = (artifacts ?? []).filter((artifact) => !treasuryTypes.has(artifact.artifactType));
  }
  return mergeTreasuryArtifacts(stripped, treasury);
}
