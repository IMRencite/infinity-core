export type VentureAssemblyRow = {
  id: string;
  mission_id: string;
  status: string;
  venture_blueprint_id: string | null;
  identity_package: Record<string, unknown> | null;
  manifest: Record<string, unknown> | null;
  idempotency_key?: string | null;
};

export type VentureClassification = {
  includeInPortfolio: boolean;
  exclusionReason: string | null;
  isTestFixture: boolean;
};

const TEST_NAME_PATTERN =
  /(?:^|[\s_-])(e2e|fixture|mock|simulation|capability[_-]?test|strong_in_policy|verification)(?:[\s_-]|$)|_test\b|test_/i;

const TERMINAL_STATUSES = new Set([
  "shutdown",
  "terminated",
  "archived",
  "cancelled",
  "failed",
]);

const PAUSED_STATUSES = new Set(["paused", "suspended"]);

const ACTIVE_STATUSES = new Set([
  "active",
  "running",
  "in_progress",
  "building",
  "internally_ready",
  "ready",
  "launching",
]);

export function ventureDisplayName(row: VentureAssemblyRow): string {
  const identity = row.identity_package;
  const manifest = row.manifest;
  const ventureIdentity = manifest?.ventureIdentity as Record<string, unknown> | undefined;
  const fromIdentity =
    typeof identity?.workingName === "string"
      ? identity.workingName
      : typeof identity?.name === "string"
        ? identity.name
        : null;
  const fromManifest =
    typeof ventureIdentity?.workingName === "string"
      ? ventureIdentity.workingName
      : typeof ventureIdentity?.name === "string"
        ? ventureIdentity.name
        : null;
  return fromIdentity ?? fromManifest ?? row.id.slice(0, 8);
}

export function classifyVentureForPortfolio(
  row: VentureAssemblyRow,
  opts?: {
    blueprintSimulationOnly?: boolean;
    allRunsSimulationOrTest?: boolean;
  },
): VentureClassification {
  const name = ventureDisplayName(row);
  const idempotency = row.idempotency_key ?? "";
  const manifestStr = JSON.stringify(row.manifest ?? {});

  if (TEST_NAME_PATTERN.test(name) || TEST_NAME_PATTERN.test(idempotency) || TEST_NAME_PATTERN.test(manifestStr)) {
    return {
      includeInPortfolio: false,
      exclusionReason: "verification_or_test_venture",
      isTestFixture: true,
    };
  }

  if (opts?.blueprintSimulationOnly) {
    return {
      includeInPortfolio: false,
      exclusionReason: "simulation_only_blueprint",
      isTestFixture: true,
    };
  }

  if (opts?.allRunsSimulationOrTest) {
    return {
      includeInPortfolio: false,
      exclusionReason: "simulation_or_capability_test_runs",
      isTestFixture: true,
    };
  }

  return { includeInPortfolio: true, exclusionReason: null, isTestFixture: false };
}

export function isOperatorAllocatableVenture(
  row: VentureAssemblyRow,
  opts?: {
    blueprintSimulationOnly?: boolean;
    allRunsSimulationOrTest?: boolean;
  },
): boolean {
  return classifyVentureForPortfolio(row, opts).includeInPortfolio;
}

export function isVentureBuilt(row: VentureAssemblyRow, blueprintCompleted: boolean): boolean {
  return Boolean(row.venture_blueprint_id) || blueprintCompleted;
}

export function isVentureActive(status: string): boolean {
  const normalized = status.toLowerCase().trim();
  if (TERMINAL_STATUSES.has(normalized)) return false;
  if (PAUSED_STATUSES.has(normalized)) return false;
  if (normalized.includes("complete") && !normalized.includes("internally")) return false;
  return ACTIVE_STATUSES.has(normalized) || normalized.includes("running") || normalized.includes("active");
}
