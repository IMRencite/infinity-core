import { SYSTEM_FAMILIES, type SystemFamily } from "@/lib/infinity/venture-systems-architecture/constants";
import { paymentArchitectureKind, paymentsFamilyRequired } from "./bind-contract";
import { coverageHqView } from "./plan-coverage";
import type {
  BoundVentureSystemsBuildInput,
  VentureSystemsBuildCoveragePlan,
  VentureSystemsBuildCoverageValidation,
  VentureSystemsBuildFailure,
  VentureSystemsCoverageRow,
} from "./types";

export type ArchitectureTaskLineage = {
  ventureId?: string | null;
  companyId?: string | null;
  missionId?: string | null;
  buildContractId?: string | null;
  ventureSystemsBuildContractId?: string | null;
  architectureFamily?: SystemFamily | null;
  coverageDisposition?: VentureSystemsCoverageRow["disposition"] | null;
  treatsUnknownCostAsZero?: boolean;
};

function fail(
  failures: VentureSystemsBuildFailure[],
  code: VentureSystemsBuildFailure["code"],
  family: SystemFamily | null,
  message: string,
): void {
  failures.push({ code, family, message });
}

export function validateVentureSystemsBuildCoverage(input: {
  bound: BoundVentureSystemsBuildInput | null;
  plan: VentureSystemsBuildCoveragePlan | null;
  tasks?: ArchitectureTaskLineage[];
  authorizeDeferredFamilies?: SystemFamily[];
}): VentureSystemsBuildCoverageValidation {
  const failures: VentureSystemsBuildFailure[] = [];
  if (!input.bound || !input.plan) {
    fail(failures, "VENTURE_SYSTEMS_CONTRACT_MISSING", null, "VentureSystemsBuildContract was not supplied to PAB.");
    return { ok: false, failures, coverage: { requiredSystems: 0, plannedInternally: 0, externalDependencies: 0, deferred: 0, blocked: 0, optionalExcluded: 0 } };
  }

  const { bound, plan } = input;
  const coverage = coverageHqView(plan);
  const knownFamilies = new Set<string>(SYSTEM_FAMILIES);
  const required = bound.contract.systemRequirements.filter((item) => item.required);
  const coveredRequired = new Map<SystemFamily, VentureSystemsCoverageRow>();

  for (const row of plan.rows) {
    if (!knownFamilies.has(row.family)) {
      fail(failures, "VENTURE_SYSTEM_UNKNOWN_FAMILY", row.family, `Unknown system family ${row.family}.`);
    }
    if (row.required) coveredRequired.set(row.family, row);
    if (!row.required && row.disposition !== "OPTIONAL_EXCLUDED" && row.disposition !== "DEFERRED") {
      fail(failures, "VENTURE_SYSTEM_OPTIONAL_PROMOTED", row.family, `Optional system ${row.family} was promoted out of optional/deferred.`);
    }
    if (row.externalDependency && row.disposition === "INTERNAL_BUILD") {
      fail(
        failures,
        "VENTURE_SYSTEM_PROVIDER_DEPENDENCY_UNRESOLVED",
        row.family,
        `External provider dependency for ${row.family} was silently converted into an internal build.`,
      );
    }
    if (row.externalDependency && !row.externalDependency.costKnown && row.externalDependency.estimatedCost.value === 0) {
      fail(failures, "VENTURE_SYSTEM_UNKNOWN_COST", row.family, `Unknown paid cost for ${row.family} was treated as $0.`);
    }
    if (row.failureCodes.includes("VENTURE_SYSTEM_UNKNOWN_COST") && row.externalDependency?.estimatedCost.value === 0) {
      fail(failures, "VENTURE_SYSTEM_UNKNOWN_COST", row.family, `Unknown paid cost for ${row.family} was treated as $0.`);
    }
  }

  for (const requirement of required) {
    if (!coveredRequired.has(requirement.family)) {
      fail(failures, "VENTURE_SYSTEM_REQUIRED_OMITTED", requirement.family, `Required system ${requirement.family} was omitted from coverage.`);
    }
  }

  const requiredRows = [...coveredRequired.values()];
  const accounted =
    requiredRows.filter((row) => row.disposition === "INTERNAL_BUILD").length +
    requiredRows.filter((row) => row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY").length +
    requiredRows.filter((row) => row.disposition === "DEFERRED").length +
    requiredRows.filter((row) => row.disposition === "BLOCKED").length;
  if (accounted !== required.length) {
    fail(
      failures,
      "VENTURE_SYSTEM_REQUIRED_OMITTED",
      null,
      `Required coverage invariant failed: ${accounted} accounted vs ${required.length} required.`,
    );
  }

  if (paymentsFamilyRequired(bound.contract) && !paymentArchitectureKind(bound.contract)) {
    fail(failures, "VENTURE_SYSTEM_PAYMENT_ARCHITECTURE_MISSING", "PAYMENTS", "Payments are required but Payment Architecture is absent.");
  }

  const authorizedDeferred = new Set(input.authorizeDeferredFamilies ?? []);
  for (const task of input.tasks ?? []) {
    if (task.ventureId && task.ventureId !== bound.ventureId) {
      fail(failures, "VENTURE_SYSTEM_LINEAGE_MISMATCH", task.architectureFamily ?? null, "Coding task ventureId does not match the architecture contract.");
    }
    if (task.ventureSystemsBuildContractId && task.ventureSystemsBuildContractId !== bound.ventureSystemsBuildContractId) {
      fail(failures, "VENTURE_SYSTEM_LINEAGE_MISMATCH", task.architectureFamily ?? null, "Coding task contract lineage does not match VentureSystemsBuildContract.");
    }
    if (!task.architectureFamily) {
      fail(failures, "VENTURE_SYSTEM_TASK_ORPHANED", null, "Coding task is not mapped to an architecture requirement.");
      continue;
    }
    const row = plan.rows.find((item) => item.family === task.architectureFamily);
    if (!row) {
      fail(failures, "VENTURE_SYSTEM_TASK_ORPHANED", task.architectureFamily, `Coding task maps to unknown family ${task.architectureFamily}.`);
      continue;
    }
    if (row.disposition === "DEFERRED" && !authorizedDeferred.has(row.family)) {
      fail(failures, "VENTURE_SYSTEM_DEFERRED_NOT_AUTHORIZED", row.family, `Deferred system ${row.family} was implemented without architecture authorization.`);
    }
    if (row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY" && task.coverageDisposition === "INTERNAL_BUILD") {
      fail(
        failures,
        "VENTURE_SYSTEM_PROVIDER_DEPENDENCY_UNRESOLVED",
        row.family,
        `External provider dependency ${row.family} was treated as an internal build task.`,
      );
    }
    if (row.disposition === "OPTIONAL_EXCLUDED" && task.coverageDisposition === "INTERNAL_BUILD") {
      fail(failures, "VENTURE_SYSTEM_OPTIONAL_PROMOTED", row.family, `Optional system ${row.family} was implemented as mandatory.`);
    }
    if (task.treatsUnknownCostAsZero) {
      fail(failures, "VENTURE_SYSTEM_UNKNOWN_COST", row.family, `Unknown paid cost for ${row.family} was treated as $0.`);
    }
  }

  return { ok: failures.length === 0, failures, coverage };
}
