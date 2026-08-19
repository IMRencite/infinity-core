import { buildArtifactRenderId } from "@/lib/infinity/operator-console/artifacts/artifact-identity";
import type { HqRoomArtifactMap, HqWorkArtifact } from "@/lib/infinity/operator-console/artifacts/types";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { ZeroToProductionStore } from "../store";
import type { ZeroToProductionRun } from "../types";

function push(map: HqRoomArtifactMap, roomId: DepartmentId, artifact: HqWorkArtifact): void {
  if (!map[roomId]) map[roomId] = [];
  map[roomId]!.push(artifact);
}

export type ZtpHqRow = {
  runId: string;
  venture: string;
  origin: string;
  stage: string;
  businessDecision: string;
  progress: string;
  status: string;
  codingProvider: string;
  qa: string;
  repairAttempts: number;
  cost: string;
  commercialization: string;
  launchReadiness: string;
  blocker: string;
  candidateId: string;
  blueprintId: string;
  buildPackageId: string;
  buildGraphId: string;
  codingAgentRunIds: string;
  productionArtifactId: string;
  commercializationPlanId: string;
  financialActionRequestIds: string;
  idempotencyKey: string;
  publiclyLaunched: "NO";
};

export type ZtpHqReadModel = {
  organizationId: string;
  rows: ZtpHqRow[];
};

export function emptyZtpHqReadModel(organizationId: string): ZtpHqReadModel {
  return { organizationId, rows: [] };
}

export function buildZtpHqReadModel(store: ZeroToProductionStore, organizationId: string): ZtpHqReadModel {
  return {
    organizationId,
    rows: store.scoped(organizationId).map(rowFromRun),
  };
}

function rowFromRun(run: ZeroToProductionRun): ZtpHqRow {
  const cost =
    run.costKnown && run.estimatedCostUsd != null ? `ESTIMATE $${run.estimatedCostUsd}` : run.estimatedCostUsd == null ? "UNKNOWN" : `ESTIMATE $${run.estimatedCostUsd}`;
  return {
    runId: run.id,
    venture: run.ventureId ?? "NONE",
    origin: run.origin,
    stage: run.stage,
    businessDecision: run.infinityDecision ?? "NONE",
    progress: `${Math.round(run.progress * 100)}%`,
    status: run.status,
    codingProvider: run.codingProvider ?? "NONE",
    qa: run.qaPassed == null ? "UNKNOWN" : run.qaPassed ? "PASS" : "FAIL",
    repairAttempts: run.repairAttempts,
    cost,
    commercialization: run.productReadiness.COMMERCIALIZATION_READY ? "READY" : "NOT_READY",
    launchReadiness: run.readiness ?? "UNKNOWN",
    blocker: run.currentBlocker ?? "NONE",
    candidateId: run.opportunityCandidateId,
    blueprintId: run.ventureBlueprintId ?? "NONE",
    buildPackageId: run.buildPackageId ?? "NONE",
    buildGraphId: run.buildGraphId ?? "NONE",
    codingAgentRunIds: run.codingAgentRunIds.join(",") || "NONE",
    productionArtifactId: run.productionArtifactId ?? "NONE",
    commercializationPlanId: run.commercializationPlanId ?? "NONE",
    financialActionRequestIds: run.financialActionRequestIds.join(",") || "NONE",
    idempotencyKey: run.idempotencyKey,
    publiclyLaunched: "NO",
  };
}

export function buildZtpHqArtifacts(model: ZtpHqReadModel): HqRoomArtifactMap {
  const map: HqRoomArtifactMap = {};
  for (const row of model.rows) {
    const artifact: HqWorkArtifact = {
      id: buildArtifactRenderId({
        artifactType: "ztp_run",
        sourceRecordType: "zero_to_production_run",
        sourceRecordId: row.runId,
      }),
      roomId: "executive_office",
      artifactType: "ztp_run",
      title: `ZTP · ${row.origin}`,
      subtitle: `${row.stage} · ${row.status}`,
      state: row.status === "FAILED" || row.status === "BLOCKED" ? "FAILED" : row.status === "RUNNING" ? "CREATING" : "READY",
      createdAt: null,
      sourceRecordType: "zero_to_production_run",
      sourceRecordId: row.runId,
      metadata: {
        ztpRunId: row.runId,
        ventureId: row.venture,
        origin: row.origin,
        stage: row.stage,
        businessDecision: row.businessDecision,
        progress: row.progress,
        status: row.status,
        codingProvider: row.codingProvider,
        qa: row.qa,
        repairAttempts: row.repairAttempts,
        cost: row.cost,
        commercialization: row.commercialization,
        launchReadiness: row.launchReadiness,
        blocker: row.blocker,
        candidateId: row.candidateId,
        blueprintId: row.blueprintId,
        buildPackageId: row.buildPackageId,
        buildGraphId: row.buildGraphId,
        codingAgentRunIds: row.codingAgentRunIds,
        productionArtifactId: row.productionArtifactId,
        commercializationPlanId: row.commercializationPlanId,
        financialActionRequestIds: row.financialActionRequestIds,
        idempotencyKey: row.idempotencyKey,
        publiclyLaunched: row.publiclyLaunched,
        token: null,
        apiKey: null,
      },
    };
    push(map, "executive_office", artifact);
    push(map, "product_lab", { ...artifact, roomId: "product_lab", id: `${artifact.id}:product_lab` });
    push(map, "launch_operations", { ...artifact, roomId: "launch_operations", id: `${artifact.id}:launch` });
  }
  return map;
}
