import {
  UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE,
  VENTURE_PRODUCTION_QC_MATRIX,
  VENTURE_QC_COVERAGE_CONTRACT,
  VENTURE_QC_FRESHNESS_GATE,
  type GovernedException,
  type NamedSystemGate,
  type QcMode,
  type QcStatus,
  type SystemQcEvidenceLevel,
  type VentureProductionQcMatrix,
  type VentureProductionQcMatrixEntry,
  type VentureQcCoverage,
  type VentureSystemId,
  type VentureSystemInventory,
} from "./contract";

export type SystemVerificationInput = {
  system_id: VentureSystemId;
  status: QcStatus;
  verification_level?: SystemQcEvidenceLevel | "UNCHECKED";
  environment?: VentureProductionQcMatrixEntry["environment"];
  last_verified_at?: string | null;
  evidence_reference?: string | null;
  failure_reason?: string | null;
  owner?: string;
  freshness_window_ms?: number;
  now?: string;
};

const DEFAULT_FRESHNESS_MS: Partial<Record<VentureSystemId, number>> = {
  PAYMENT: 36 * 60 * 60 * 1000,
  CHECKOUT: 36 * 60 * 60 * 1000,
  COMMERCIAL_OFFER: 36 * 60 * 60 * 1000,
  FULFILLMENT: 36 * 60 * 60 * 1000,
  GROWTH: 48 * 60 * 60 * 1000,
  GROWTH_GMAIL: 48 * 60 * 60 * 1000,
  GROWTH_GEMINI: 48 * 60 * 60 * 1000,
  GROWTH_DURABLE_QUEUE: 48 * 60 * 60 * 1000,
  GROWTH_REPLY_HANDLING: 48 * 60 * 60 * 1000,
  DOMAIN: 7 * 24 * 60 * 60 * 1000,
  DNS: 7 * 24 * 60 * 60 * 1000,
  SSL: 7 * 24 * 60 * 60 * 1000,
  MOBILE: 7 * 24 * 60 * 60 * 1000,
  RESPONSIVE: 7 * 24 * 60 * 60 * 1000,
  PRODUCT_WORKFLOW: 7 * 24 * 60 * 60 * 1000,
  NAVIGATION: 7 * 24 * 60 * 60 * 1000,
};

export function freshnessWindowMs(systemId: VentureSystemId): number {
  return DEFAULT_FRESHNESS_MS[systemId] ?? 7 * 24 * 60 * 60 * 1000;
}

export function evaluateVentureQCFreshnessGate(input: {
  system_id: VentureSystemId;
  last_verified_at: string | null;
  status: QcStatus;
  now?: string;
  freshness_window_ms?: number;
  relevant_change?: boolean;
}): NamedSystemGate & { status: QcStatus } {
  if (input.status === "NOT_APPLICABLE") {
    return { gate: VENTURE_QC_FRESHNESS_GATE, result: "PASS", reasons: ["NOT_APPLICABLE"], status: "NOT_APPLICABLE" };
  }
  if (input.status === "UNKNOWN" || !input.last_verified_at) {
    return { gate: VENTURE_QC_FRESHNESS_GATE, result: "FAIL", reasons: ["UNCHECKED_OR_UNKNOWN"], status: "UNKNOWN" };
  }
  const reasons: string[] = [];
  if (input.relevant_change) reasons.push("RELEVANT_PRODUCT_CHANGE");
  const age = new Date(input.now ?? new Date().toISOString()).getTime() - new Date(input.last_verified_at).getTime();
  const window = input.freshness_window_ms ?? freshnessWindowMs(input.system_id);
  if (age > window) reasons.push("VERIFICATION_STALE");
  if (reasons.length) {
    return { gate: VENTURE_QC_FRESHNESS_GATE, result: "FAIL", reasons, status: "STALE" };
  }
  return { gate: VENTURE_QC_FRESHNESS_GATE, result: "PASS", reasons: [], status: input.status };
}

export function buildVentureProductionQcMatrix(input: {
  inventory: VentureSystemInventory;
  verifications: readonly SystemVerificationInput[];
  mode?: QcMode;
  now?: string;
}): VentureProductionQcMatrix {
  const byId = new Map(input.verifications.map((row) => [row.system_id, row]));
  const entries: VentureProductionQcMatrixEntry[] = input.inventory.entries.map((entry) => {
    if (entry.applicability === "NOT_APPLICABLE") {
      return {
        system_id: entry.system_id,
        venture_id: entry.venture_id,
        applicability: "NOT_APPLICABLE",
        required_surfaces: [],
        required_workflows: [],
        verification_level: "UNCHECKED",
        last_verified_at: null,
        verification_result: "NOT_APPLICABLE",
        evidence_reference: null,
        failure_reason: entry.na_reason ?? null,
        owner: "venture-system-qc",
        status: "NOT_APPLICABLE",
      };
    }
    const verification = byId.get(entry.system_id);
    if (!verification) {
      return {
        system_id: entry.system_id,
        venture_id: entry.venture_id,
        applicability: "APPLICABLE",
        required_surfaces: entry.required_surfaces,
        required_workflows: entry.required_workflows,
        verification_level: "UNCHECKED",
        last_verified_at: null,
        verification_result: "UNKNOWN",
        evidence_reference: null,
        failure_reason: "NOT_CHECKED",
        owner: "venture-system-qc",
        status: "UNKNOWN",
      };
    }
    const fresh = evaluateVentureQCFreshnessGate({
      system_id: entry.system_id,
      last_verified_at: verification.last_verified_at ?? null,
      status: verification.status,
      now: input.now ?? verification.now,
      freshness_window_ms: verification.freshness_window_ms,
    });
    const status = fresh.status === "STALE" && verification.status !== "FAIL" ? "STALE" : verification.status;
    return {
      system_id: entry.system_id,
      venture_id: entry.venture_id,
      applicability: "APPLICABLE",
      required_surfaces: entry.required_surfaces,
      required_workflows: entry.required_workflows,
      verification_level: verification.verification_level ?? "UNCHECKED",
      environment: verification.environment,
      last_verified_at: verification.last_verified_at ?? null,
      verification_result: status,
      evidence_reference: verification.evidence_reference ?? null,
      failure_reason: status === "STALE" ? "VERIFICATION_STALE" : verification.failure_reason ?? null,
      owner: verification.owner ?? "venture-system-qc",
      status,
    };
  });
  return {
    contract: VENTURE_PRODUCTION_QC_MATRIX,
    venture_id: input.inventory.venture_id,
    mode: input.mode ?? "FULL",
    entries,
  };
}

export function evaluateVentureQCCoverageContract(matrix: VentureProductionQcMatrix): VentureQcCoverage {
  const applicable = matrix.entries.filter((row) => row.applicability === "APPLICABLE");
  const passing = applicable.filter((row) => row.status === "PASS");
  const failing = applicable.filter((row) => row.status === "FAIL");
  const unknown = applicable.filter((row) => row.status === "UNKNOWN");
  const stale = applicable.filter((row) => row.status === "STALE");
  const partial = applicable.filter((row) => row.status === "PARTIAL");
  const verified = applicable.filter((row) => row.status !== "UNKNOWN");
  const coverage_percent = applicable.length === 0 ? 0 : Math.round((verified.length / applicable.length) * 100);
  const reasons: string[] = [];
  if (unknown.length) reasons.push("INCOMPLETE_MATERIAL_COVERAGE");
  if (stale.length) reasons.push("STALE_EVIDENCE_PRESENT");
  if (failing.length) reasons.push("FAILING_SYSTEMS_PRESENT");
  if (partial.length) reasons.push("PARTIAL_SYSTEMS_PRESENT");
  return {
    contract: VENTURE_QC_COVERAGE_CONTRACT,
    venture_id: matrix.venture_id,
    total_applicable_systems: applicable.length,
    verified_systems: verified.length,
    passing_systems: passing.length,
    failing_systems: failing.length,
    unknown_systems: unknown.length,
    stale_systems: stale.length,
    partial_systems: partial.length,
    coverage_percent,
    result: reasons.length === 0 && passing.length === applicable.length ? "PASS" : "FAIL",
    reasons,
  };
}

export function evaluateUniversalVentureProductionQualityGate(input: {
  matrix: VentureProductionQcMatrix;
  coverage?: VentureQcCoverage;
  exceptions?: readonly GovernedException[];
  inventory?: VentureSystemInventory;
}): NamedSystemGate & { overall: "PASS" | "FAIL" | "PARTIAL"; coverage: VentureQcCoverage } {
  const coverage = input.coverage ?? evaluateVentureQCCoverageContract(input.matrix);
  const material = input.matrix.entries.filter((row) => {
    if (row.applicability !== "APPLICABLE") return false;
    const inventoryRow = input.inventory?.entries.find((entry) => entry.system_id === row.system_id);
    return inventoryRow?.material !== false;
  });
  const accepted = new Set(
    (input.exceptions ?? []).filter((row) => row.accepted).map((row) => row.system_id),
  );
  const reasons: string[] = [];
  for (const row of material) {
    if (accepted.has(row.system_id)) continue;
    if (row.status === "PASS") continue;
    reasons.push(`${row.system_id}:${row.status}${row.failure_reason ? `:${row.failure_reason}` : ""}`);
  }
  if (coverage.unknown_systems > 0) reasons.push("UNKNOWN_IS_NOT_PASS");
  if (coverage.stale_systems > 0) reasons.push("STALE_IS_NOT_CURRENT");
  const blocking = material.filter((row) => !accepted.has(row.system_id) && row.status !== "PASS");
  const hasFail = blocking.some((row) => row.status === "FAIL" || row.status === "STALE");
  const hasUnknownOrPartial = blocking.some((row) => row.status === "UNKNOWN" || row.status === "PARTIAL");
  const overall: "PASS" | "FAIL" | "PARTIAL" = reasons.length === 0
    ? "PASS"
    : hasFail && hasUnknownOrPartial
      ? "PARTIAL"
      : hasUnknownOrPartial && !hasFail
        ? "PARTIAL"
        : "FAIL";
  return {
    gate: UNIVERSAL_VENTURE_PRODUCTION_QUALITY_GATE,
    result: overall === "PASS" ? "PASS" : "FAIL",
    reasons,
    overall,
    coverage,
  };
}

export function overallCannotBeHealthyGreen(gate: { result: "PASS" | "FAIL" }): boolean {
  return gate.result !== "PASS";
}
