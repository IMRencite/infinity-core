import type { CodingHqReadModel } from "@/lib/infinity/coding-agents/hq/read-model";
import type { TreasuryHqReadModel } from "@/lib/infinity/treasury/hq/read-model";
import type { FinancialActionStatus } from "@/lib/infinity/treasury/constants";
import type { HqWorkArtifact } from "./artifacts/types";
import type { OperatorVentureSnapshot } from "./types";

export type InfrastructurePresentation = "COMPACT" | "EXPANDED";

export type CommandSystemIndicator = {
  id: string;
  label: string;
  status: string;
};

const TREASURY_ATTENTION_STATUSES = new Set<FinancialActionStatus>([
  "PENDING_POLICY",
  "AUTHORIZED",
  "RESERVED",
  "EXECUTING",
  "BLOCKED",
  "ESCALATED",
  "FAILED",
]);

const CODING_ACTIVE_STATUSES = new Set(["RUNNING", "QA_RUNNING", "ROUTED", "PENDING"]);

export function treasuryPresentation(model: TreasuryHqReadModel | null | undefined): InfrastructurePresentation {
  if (!model) return "COMPACT";
  if (model.state.providerFreshness === "STALE" || model.state.providerFreshness === "UNAVAILABLE") return "EXPANDED";
  if (model.requests.some((request) => TREASURY_ATTENTION_STATUSES.has(request.status))) return "EXPANDED";
  if ((model.state.pendingTransactions ?? 0) > 0) return "EXPANDED";
  return "COMPACT";
}

export function treasuryAttentionLabel(model: TreasuryHqReadModel): string | null {
  if (model.state.providerFreshness === "STALE") return "PROVIDER STALE";
  if (model.state.providerFreshness === "UNAVAILABLE") return "PROVIDER UNAVAILABLE";
  if (model.requests.some((request) => request.status === "BLOCKED" || request.status === "ESCALATED")) {
    return "BUDGET BLOCKED";
  }
  if (model.requests.some((request) => request.status === "AUTHORIZED" || request.status === "RESERVED" || request.status === "EXECUTING")) {
    return "PAYMENT AUTHORIZATION ACTIVE";
  }
  if (model.requests.some((request) => request.status === "FAILED")) return "FINANCIAL ACTION FAILED";
  return null;
}

export function codingPresentation(model: CodingHqReadModel | null | undefined): InfrastructurePresentation {
  if (!model) return "COMPACT";
  return model.rows.some((row) => CODING_ACTIVE_STATUSES.has(row.status)) ? "EXPANDED" : "COMPACT";
}

export function codingActiveRun(model: CodingHqReadModel) {
  return model.rows.find((row) => CODING_ACTIVE_STATUSES.has(row.status)) ?? null;
}

function providerStatus(model: CodingHqReadModel | null | undefined, name: string): string {
  const row = model?.providers.find((provider) => provider.provider.toLowerCase().includes(name.toLowerCase()));
  if (!row) return "UNKNOWN";
  if (row.availability === "NOT_CONFIGURED" || row.status === "NOT_CONFIGURED") return "NOT CONFIGURED";
  if (row.availability === "AVAILABLE" && row.status === "READY") return "READY";
  return row.status.replace(/_/g, " ");
}

function treasuryCommandStatus(model: TreasuryHqReadModel | null | undefined): string {
  if (!model) return "NOT CONFIGURED";
  if (model.state.providerFreshness === "NOT_CONFIGURED") return "NOT CONFIGURED";
  if (model.state.providerFreshness === "UNAVAILABLE") return "DEGRADED";
  if (model.state.providerFreshness === "STALE") return "DEGRADED";
  if (model.state.providerFreshness === "FRESH") return "READY";
  return "ENGINE READY · PROVIDER NOT CONFIGURED";
}

function aiBrainStatus(snapshot: OperatorVentureSnapshot): string {
  const research = snapshot.departments.find((dept) => dept.id === "research_department");
  const activeProvider = snapshot.providers.find(
    (session) =>
      session.engine === "ai_brain" ||
      session.engine === "grounded_research" ||
      session.role === "RESEARCH_PROVIDER" ||
      /gemini|ai brain/i.test(`${session.provider ?? ""} ${session.model ?? ""} ${session.engine}`),
  );
  if (activeProvider && (activeProvider.status === "RUNNING" || research?.isActive)) return "ACTIVE";
  if (activeProvider || (research && research.recordCount > 0) || research?.state === "COMPLETE" || research?.state === "RUNNING") {
    return "READY";
  }
  return "IDLE";
}

function commercializationStatus(snapshot: OperatorVentureSnapshot): string {
  const artifacts = Object.values(snapshot.roomArtifacts ?? {}).flat();
  const commercial = artifacts.filter((artifact) => artifact.artifactType.startsWith("commercial_"));
  if (commercial.some((artifact) => artifact.metadata.liveMutation === true || artifact.metadata.publicDeploy === true)) {
    return "READY";
  }
  return "ENGINE VERIFIED · MUTATIONS LOCKED";
}

export function deriveCommandSystemReadiness(input: {
  snapshot: OperatorVentureSnapshot;
  treasury?: TreasuryHqReadModel | null;
  coding?: CodingHqReadModel | null;
}): CommandSystemIndicator[] {
  return [
    { id: "ai_brain", label: "AI Brain", status: aiBrainStatus(input.snapshot) },
    { id: "treasury", label: "Treasury", status: treasuryCommandStatus(input.treasury) },
    { id: "native_coder", label: "Native Coder", status: providerStatus(input.coding, "native") },
    { id: "cursor", label: "Cursor", status: providerStatus(input.coding, "cursor") },
    { id: "commercialization", label: "Commercialization", status: commercializationStatus(input.snapshot) },
  ];
}

export function findRoomArtifact(
  snapshot: OperatorVentureSnapshot,
  artifactType: HqWorkArtifact["artifactType"],
): HqWorkArtifact | null {
  const rooms = snapshot.roomArtifacts ?? {};
  for (const artifacts of Object.values(rooms)) {
    const match = artifacts?.find((artifact) => artifact.artifactType === artifactType);
    if (match) return match;
  }
  for (const department of snapshot.departments) {
    const match = department.workArtifacts?.find((artifact) => artifact.artifactType === artifactType);
    if (match) return match;
  }
  return null;
}

export const HQ_DESKTOP_REGION_ORDER = [
  "welcome",
  "command",
  "scoreboard",
  "operating-floor",
  "infrastructure",
] as const;
