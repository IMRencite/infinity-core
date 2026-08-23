import { describe, expect, it } from "vitest";
import {
  AI_SEO_PLATFORM_FIXTURE,
  ART_MARKETPLACE_SYSTEMS_FIXTURE,
  HOME_CONTRACTOR_FIXTURE,
  SIMPLE_DIGITAL_PRODUCT_FIXTURE,
  UNKNOWN_COST_FIXTURE,
  buildVentureSystemsContract,
} from "@/lib/infinity/venture-systems-architecture";
import { runProductAssetBuilderV21 } from "@/lib/infinity/product-asset-builder/v2.1/run-v2.1";
import {
  VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY,
  architectureTaskToCanonical,
  bindVentureSystemsBuildInput,
  coverageHqView,
  decomposeArchitectureBuildTasks,
  planVentureSystemsBuildCoverage,
  validateVentureSystemsBuildCoverage,
} from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture";
import type { VentureSystemsBuildCoveragePlan } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type { ArchitectureTaskLineage } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/validate-coverage";

function bindFixture(
  evidence: typeof HOME_CONTRACTOR_FIXTURE,
  extras: { companyId?: string | null; missionId?: string | null; buildContractId?: string | null } = {},
) {
  const ventureId = evidence.ventureId ?? "venture-missing";
  return bindVentureSystemsBuildInput({
    ventureId,
    companyId: extras.companyId ?? null,
    missionId: extras.missionId ?? null,
    buildContractId: extras.buildContractId ?? null,
    contract: buildVentureSystemsContract(evidence),
  });
}

function planned(evidence: typeof HOME_CONTRACTOR_FIXTURE) {
  const bound = bindFixture(evidence, { companyId: "company-1", missionId: "mission-1", buildContractId: "build-1" });
  const plan = planVentureSystemsBuildCoverage(bound);
  const tasks = decomposeArchitectureBuildTasks(plan);
  return { bound, plan, tasks };
}

function taskLineage(
  plan: VentureSystemsBuildCoveragePlan,
  tasks: ReturnType<typeof decomposeArchitectureBuildTasks>,
): ArchitectureTaskLineage[] {
  return tasks.map((task) => ({
    ventureId: task.ventureId,
    companyId: task.companyId,
    missionId: task.missionId,
    buildContractId: task.buildContractId,
    ventureSystemsBuildContractId: task.ventureSystemsBuildContractId,
    architectureFamily: task.architectureFamily,
    coverageDisposition: task.coverageDisposition,
  }));
}

describe("Venture Systems → Build Execution Integration V1", () => {
  it("keeps the integration write boundary at zero", () => {
    expect(VENTURE_SYSTEMS_BUILD_WRITE_BOUNDARY).toEqual({
      providerAccountCreation: 0,
      providerWrites: 0,
      treasuryMovements: 0,
      purchases: 0,
      eagActions: 0,
      deployments: 0,
      domainPurchases: 0,
      dnsWrites: 0,
      paymentWrites: 0,
      publicLaunches: 0,
      validationWrites: 0,
      selectionWrites: 0,
      missionCreation: 0,
    });
  });

  it("plans home contractor architecture into PAB without inventing HubSpot or Twilio", async () => {
    const { bound, plan, tasks } = planned(HOME_CONTRACTOR_FIXTURE);
    const required = plan.rows.filter((row) => row.required).map((row) => row.family);
    expect(required).toEqual(expect.arrayContaining(["LEAD_CAPTURE", "CRM", "SCHEDULING", "TRANSACTIONAL_EMAIL", "ANALYTICS"]));
    expect(plan.rows.find((row) => row.family === "CRM")?.disposition).toBe("INTERNAL_BUILD");
    expect(plan.rows.find((row) => row.family === "TRANSACTIONAL_EMAIL")?.disposition).toBe("EXTERNAL_PROVIDER_DEPENDENCY");
    expect(plan.rows.find((row) => row.family === "SMS")?.disposition).toBe("OPTIONAL_EXCLUDED");
    expect(plan.rows.find((row) => row.family === "SMS")?.required).toBe(false);
    expect(tasks.some((task) => task.architectureFamily === "CRM")).toBe(true);
    expect(tasks.some((task) => task.architectureFamily === "SMS")).toBe(false);
    expect(tasks.every((task) => task.ventureId === bound.ventureId)).toBe(true);
    expect(tasks.every((task) => task.ventureSystemsBuildContractId === bound.ventureSystemsBuildContractId)).toBe(true);
    expect(JSON.stringify(tasks)).not.toMatch(/HubSpot is required/i);
    expect(JSON.stringify(tasks)).not.toMatch(/must use Twilio/i);
    const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: taskLineage(plan, tasks) });
    expect(validation.ok).toBe(true);
    expect(validation.coverage.requiredSystems).toBe(
      validation.coverage.plannedInternally +
        validation.coverage.externalDependencies +
        validation.coverage.deferred +
        validation.coverage.blocked,
    );

    const viaPab = await runProductAssetBuilderV21(null, {
      organizationId: "org-contractor",
      idempotencyKey: "vsa-pab-contractor",
      ventureId: bound.ventureId,
      companyId: bound.companyId,
      missionId: bound.missionId,
      buildContractId: bound.buildContractId,
      ventureSystemsBuildContract: bound.contract,
      architecturePlanningOnly: true,
    });
    expect(viaPab.ok).toBe(true);
    expect(viaPab.architectureCoverage?.requiredSystems).toBeGreaterThan(0);
    expect(viaPab.architectureTaskCount).toBe(tasks.length);
  });

  it("preserves art marketplace payment architecture and identity systems", () => {
    const { bound, plan, tasks } = planned(ART_MARKETPLACE_SYSTEMS_FIXTURE);
    expect(bound.contract.paymentArchitecture.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(bound.contract.paymentArchitecture.architectureKind).toBe("MARKETPLACE_MULTI_PARTY");
    expect(plan.paymentArchitecture?.architectureKind).toBe("MARKETPLACE_MULTI_PARTY");
    expect(plan.rows.filter((row) => row.required).map((row) => row.family)).toEqual(
      expect.arrayContaining(["PAYMENTS", "CUSTOMER_SUPPORT", "ANALYTICS"]),
    );
    const payments = plan.rows.find((row) => row.family === "PAYMENTS");
    expect(payments?.required).toBe(true);
    expect(["INTERNAL_BUILD", "EXTERNAL_PROVIDER_DEPENDENCY", "DEFERRED", "BLOCKED"]).toContain(payments?.disposition);
    expect(plan.input.contract.identityArchitecture.models).toEqual(
      expect.arrayContaining(["ARTIST_IDENTITY", "COLLECTOR_IDENTITY"]),
    );
    if (payments?.disposition === "INTERNAL_BUILD") {
      expect(tasks.some((task) => task.architectureFamily === "PAYMENTS")).toBe(true);
      expect(tasks.find((task) => task.architectureFamily === "PAYMENTS")?.architectureContext?.paymentArchitectureKind).toBe(
        "MARKETPLACE_MULTI_PARTY",
      );
    } else {
      expect(tasks.some((task) => task.architectureFamily === "PAYMENTS")).toBe(false);
    }
    expect(validateVentureSystemsBuildCoverage({ bound, plan, tasks: taskLineage(plan, tasks) }).ok).toBe(true);
  });

  it("plans the AI SEO platform with entitlements and subscription payments", () => {
    const { bound, plan, tasks } = planned(AI_SEO_PLATFORM_FIXTURE);
    expect(bound.contract.paymentArchitecture.architectureKind).toBe("BILLING_SUBSCRIPTIONS");
    expect(plan.rows.filter((row) => row.required).map((row) => row.family)).toEqual(
      expect.arrayContaining(["IDENTITY_AND_ACCOUNTS", "ENTITLEMENTS", "PAYMENTS", "ANALYTICS"]),
    );
    const entitlements = plan.rows.find((row) => row.family === "ENTITLEMENTS");
    expect(entitlements?.required).toBe(true);
    expect(["INTERNAL_BUILD", "DEFERRED", "EXTERNAL_PROVIDER_DEPENDENCY", "BLOCKED"]).toContain(entitlements?.disposition);
    if (entitlements?.disposition === "DEFERRED") {
      expect(tasks.some((task) => task.architectureFamily === "ENTITLEMENTS")).toBe(false);
    } else if (entitlements?.disposition === "INTERNAL_BUILD") {
      expect(tasks.some((task) => task.architectureFamily === "ENTITLEMENTS")).toBe(true);
    }
    const identity = plan.rows.find((row) => row.family === "IDENTITY_AND_ACCOUNTS");
    expect(identity?.required).toBe(true);
    if (identity?.disposition === "INTERNAL_BUILD") {
      expect(tasks.some((task) => task.architectureFamily === "IDENTITY_AND_ACCOUNTS")).toBe(true);
    }
    expect(validateVentureSystemsBuildCoverage({ bound, plan, tasks: taskLineage(plan, tasks) }).ok).toBe(true);
  });

  it("does not overbuild a simple digital product", () => {
    const { bound, plan, tasks } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const required = plan.rows.filter((row) => row.required).map((row) => row.family);
    expect(required).toEqual(expect.arrayContaining(["PAYMENTS", "ANALYTICS"]));
    expect(required).not.toContain("CRM");
    expect(required).not.toContain("SMS");
    expect(required).not.toContain("SCHEDULING");
    expect(plan.rows.some((row) => row.family === "CRM" && row.required)).toBe(false);
    expect(tasks.some((task) => task.architectureFamily === "CRM")).toBe(false);
    expect(validateVentureSystemsBuildCoverage({ bound, plan, tasks: taskLineage(plan, tasks) }).ok).toBe(true);
  });

  it("preserves coding-task lineage onto the canonical coding-agent task", () => {
    const { bound, plan, tasks } = planned(HOME_CONTRACTOR_FIXTURE);
    const crm = tasks.find((task) => task.architectureFamily === "CRM");
    expect(crm).toBeTruthy();
    const canonical = architectureTaskToCanonical("org-1", {
      ...crm!,
      buildRunId: "build-run-1",
      status: "pending",
      repositoryContext: {
        fileTree: [],
        packageSummary: {},
        frameworkHints: [],
        relevantFiles: [],
        existingRoutes: [],
        existingEntities: [],
        featureContracts: [],
        priorFailures: [],
        reviewerFindings: [],
        tokenEstimate: 0,
      },
    });
    expect(canonical.ventureId).toBe(bound.ventureId);
    expect(canonical.companyId).toBe(bound.companyId);
    expect(canonical.missionId).toBe(bound.missionId);
    expect(canonical.buildContractId).toBe(bound.buildContractId);
    expect(canonical.ventureSystemsBuildContractId).toBe(bound.ventureSystemsBuildContractId);
    expect(canonical.architectureFamily).toBe("CRM");
    expect(canonical.scope).toBe("architecture:CRM");
    expect(plan.input.ventureSystemsBuildContractId).toBe(`vsa:${bound.ventureId}`);
  });

  it("fails when a required CRM row is dropped", () => {
    const { bound, plan, tasks } = planned(HOME_CONTRACTOR_FIXTURE);
    const omitted = { ...plan, rows: plan.rows.filter((row) => row.family !== "CRM") };
    const result = validateVentureSystemsBuildCoverage({ bound, plan: omitted, tasks: taskLineage(omitted, tasks) });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_REQUIRED_OMITTED");
  });

  it("fails when deferred SMS is implemented without authorization", () => {
    const { bound, plan } = planned(HOME_CONTRACTOR_FIXTURE);
    const withDeferredSms: VentureSystemsBuildCoveragePlan = {
      ...plan,
      rows: plan.rows.map((row) =>
        row.family === "SMS" ? { ...row, disposition: "DEFERRED", authorizedForImplementation: false } : row,
      ),
    };
    const result = validateVentureSystemsBuildCoverage({
      bound,
      plan: withDeferredSms,
      tasks: [{ ventureId: bound.ventureId, architectureFamily: "SMS", coverageDisposition: "INTERNAL_BUILD" }],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_DEFERRED_NOT_AUTHORIZED");
  });

  it("fails when the wrong venture contract is attached", () => {
    const { bound, plan, tasks } = planned(HOME_CONTRACTOR_FIXTURE);
    const result = validateVentureSystemsBuildCoverage({
      bound,
      plan,
      tasks: taskLineage(plan, tasks).map((task) => ({ ...task, ventureId: "venture-other" })),
    });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_LINEAGE_MISMATCH");
  });

  it("fails when payments are required but Payment Architecture is absent", () => {
    const bound = bindFixture(HOME_CONTRACTOR_FIXTURE);
    const broken = {
      ...bound,
      contract: {
        ...bound.contract,
        paymentArchitecture: {
          ...bound.contract.paymentArchitecture,
          architectureKind: "" as never,
        },
      },
    };
    const plan = planVentureSystemsBuildCoverage(broken);
    const result = validateVentureSystemsBuildCoverage({ bound: broken, plan, tasks: [] });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_PAYMENT_ARCHITECTURE_MISSING");
    expect(plan.rows.find((row) => row.family === "PAYMENTS")?.disposition).toBe("BLOCKED");
  });

  it("fails when an external provider dependency is treated as an internal build", () => {
    const { bound, plan } = planned(HOME_CONTRACTOR_FIXTURE);
    expect(plan.rows.find((row) => row.family === "TRANSACTIONAL_EMAIL")?.disposition).toBe("EXTERNAL_PROVIDER_DEPENDENCY");
    const result = validateVentureSystemsBuildCoverage({
      bound,
      plan,
      tasks: [
        {
          ventureId: bound.ventureId,
          architectureFamily: "TRANSACTIONAL_EMAIL",
          coverageDisposition: "INTERNAL_BUILD",
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_PROVIDER_DEPENDENCY_UNRESOLVED");
  });

  it("fails when unknown paid provider cost is treated as zero", () => {
    const bound = bindFixture(UNKNOWN_COST_FIXTURE);
    const plan = planVentureSystemsBuildCoverage(bound);
    const crm = plan.rows.find((row) => row.family === "CRM");
    expect(crm?.disposition).toBe("BLOCKED");
    expect(crm?.externalDependency?.costKnown).toBe(false);
    expect(crm?.externalDependency?.estimatedCost.value).not.toBe(0);
    const zeroed: VentureSystemsBuildCoveragePlan = {
      ...plan,
      rows: plan.rows.map((row) =>
        row.family === "CRM" && row.externalDependency
          ? {
              ...row,
              externalDependency: {
                ...row.externalDependency,
                estimatedCost: { value: 0, actuality: "UNKNOWN", currency: "USD" },
              },
            }
          : row,
      ),
    };
    const result = validateVentureSystemsBuildCoverage({
      bound,
      plan: zeroed,
      tasks: [{ architectureFamily: "CRM", treatsUnknownCostAsZero: true }],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("VENTURE_SYSTEM_UNKNOWN_COST");
  });

  it("passes when an optional system is omitted and when full coverage is valid", () => {
    const { bound, plan, tasks } = planned(HOME_CONTRACTOR_FIXTURE);
    expect(plan.rows.find((row) => row.family === "SMS")?.disposition).toBe("OPTIONAL_EXCLUDED");
    expect(tasks.some((task) => task.architectureFamily === "SMS")).toBe(false);
    const optionalOmission = validateVentureSystemsBuildCoverage({ bound, plan, tasks: taskLineage(plan, tasks) });
    expect(optionalOmission.ok).toBe(true);
    expect(coverageHqView(plan).optionalExcluded).toBeGreaterThan(0);
    expect(optionalOmission.failures).toEqual([]);
  });

  it("does not create a parallel build engine and reuses the typed contract", async () => {
    const viaMissing = await runProductAssetBuilderV21(null, {
      organizationId: "org-missing",
      idempotencyKey: "vsa-missing",
      architecturePlanningOnly: true,
    });
    expect(viaMissing.ok).toBe(false);
    expect(viaMissing.blockedReasons).toContain("VENTURE_SYSTEMS_CONTRACT_MISSING");
  });
});
