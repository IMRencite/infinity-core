import { describe, expect, it } from "vitest";
import {
  AI_SEO_PLATFORM_FIXTURE,
  ART_MARKETPLACE_SYSTEMS_FIXTURE,
  HOME_CONTRACTOR_FIXTURE,
  LEAD_GENERATION_FIXTURE,
  SIMPLE_DIGITAL_PRODUCT_FIXTURE,
  UNKNOWN_COST_FIXTURE,
  buildVentureSystemsContract,
} from "@/lib/infinity/venture-systems-architecture";
import {
  bindVentureSystemsBuildInput,
  planVentureSystemsBuildCoverage,
  validateVentureSystemsBuildCoverage,
} from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture";
import type { VentureSystemsBuildCoveragePlan } from "@/lib/infinity/product-asset-builder/v2.1/systems-architecture/types";
import type { CodeChangeSet } from "@/lib/infinity/product-asset-builder/v2.1/types";
import {
  PRODUCTION_HANDOFF_WRITE_BOUNDARY,
  acceptProductionArtifactHandoffForCommercialization,
  buildProductionArtifactHandoff,
  collectProductionArtifactHandoff,
  toDeploymentHandoffIntake,
  toProductionHandoffHqView,
  validateProductionArtifactHandoff,
  type EnvironmentRequirement,
  type ProductionHandoffCollectInput,
  type RuntimeRequirement,
} from "@/lib/infinity/production-artifact/handoff";

function bindFixture(
  evidence: Parameters<typeof buildVentureSystemsContract>[0],
  extras: { companyId?: string | null; missionId?: string | null; buildContractId?: string | null } = {},
) {
  const ventureId = evidence.ventureId ?? "venture-handoff";
  return bindVentureSystemsBuildInput({
    ventureId,
    companyId: extras.companyId ?? "company-handoff",
    missionId: extras.missionId ?? "mission-handoff",
    buildContractId: extras.buildContractId ?? "build-handoff",
    contract: buildVentureSystemsContract(evidence),
  });
}

function planned(evidence: Parameters<typeof buildVentureSystemsContract>[0]) {
  const bound = bindFixture(evidence);
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(taskId: string, paths: string[], migrations: string[] = []): CodeChangeSet {
  return {
    taskId,
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "Deterministic test change set",
    changes: paths.map((path) => ({
      operation: "create",
      path,
      content: "export const placeholder = true;\n",
      justification: "test artifact",
    })),
    dependencyChanges: [],
    migrationChanges: migrations,
    testsAdded: ["tests/app.test.ts"],
    expectedBehavior: ["renders"],
    assumptions: [],
  };
}

function declaredRuntime(): RuntimeRequirement[] {
  return [
    { key: "runtimeVersion", required: true, value: "node-20", status: "DECLARED", sourceCapability: null },
    { key: "framework", required: true, value: "nextjs", status: "DECLARED", sourceCapability: null },
    { key: "buildCommand", required: true, value: "npm run build", status: "DECLARED", sourceCapability: null },
    { key: "startCommand", required: true, value: "npm start", status: "DECLARED", sourceCapability: null },
    { key: "database", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "storage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "queue", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "scheduledJobs", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "objectStorage", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "email", required: false, value: null, status: "NOT_REQUIRED", sourceCapability: null },
    { key: "payments", required: true, value: "required", status: "DECLARED", sourceCapability: "PAYMENTS" },
    { key: "environmentVariables", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
    { key: "secrets", required: true, value: null, status: "DECLARED", sourceCapability: "SECRET_MANAGEMENT" },
    { key: "providerAdapters", required: true, value: null, status: "DECLARED", sourceCapability: null },
  ];
}

function databaseAwareRuntime(plan: VentureSystemsBuildCoveragePlan): RuntimeRequirement[] {
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      (row.family === "IDENTITY_AND_ACCOUNTS" || row.family === "CRM" || row.family === "ENTITLEMENTS" || row.family === "COMMERCE_AND_FULFILLMENT"),
  );
  return declaredRuntime().map((item) =>
    item.key === "database"
      ? { ...item, required: dbRequired, value: dbRequired ? "required" : null, status: dbRequired ? "DECLARED" : "NOT_REQUIRED" }
      : item,
  );
}

function passingEvidence() {
  return {
    buildVerification: {
      status: "PASS" as const,
      timestamp: "2026-08-23T00:00:00.000Z",
      source: "pab-quality-gates",
      summary: "production_build passed",
      counts: { passed: 1, failed: 0, total: 1 },
    },
    testVerification: {
      status: "PASS" as const,
      timestamp: "2026-08-23T00:00:00.000Z",
      source: "pab-quality-gates",
      summary: "unit_tests passed",
      counts: { passed: 4, failed: 0, total: 4 },
    },
    typecheckVerification: {
      status: "PASS" as const,
      timestamp: "2026-08-23T00:00:00.000Z",
      source: "pab-quality-gates",
      summary: "typecheck passed",
      counts: { passed: 1, failed: 0, total: 1 },
    },
  };
}

function collectFromPlan(
  plan: VentureSystemsBuildCoveragePlan,
  extras: Partial<ProductionHandoffCollectInput> = {},
): ProductionHandoffCollectInput {
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      (row.family === "IDENTITY_AND_ACCOUNTS" || row.family === "CRM" || row.family === "ENTITLEMENTS" || row.family === "COMMERCE_AND_FULFILLMENT"),
  );
  const taskId = "task-app-1";
  const changeSetId = "changeset-app-1";
  const migrations = dbRequired ? ["supabase/migrations/0001_init.sql"] : [];
  return {
    ventureId: plan.input.ventureId,
    companyId: plan.input.companyId,
    missionId: plan.input.missionId,
    buildContractId: plan.input.buildContractId,
    ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
    pabBuildRunId: "pab-run-1",
    pabArtifactId: "pab-artifact-1",
    createdAt: "2026-08-23T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: extras.architectureValidation,
    codingTaskIds: [taskId],
    codeChangeSets: [
      {
        codeChangeSetId: changeSetId,
        ventureId: plan.input.ventureId,
        companyId: plan.input.companyId,
        missionId: plan.input.missionId,
        buildContractId: plan.input.buildContractId,
        ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
        validationState: "VALID",
        reviewState: "APPROVED",
        changeSet: changeSet(taskId, ["app/page.tsx", ...migrations], migrations),
      },
    ],
    artifacts: [
      {
        artifactId: "app-source-1",
        kind: "APPLICATION_SOURCE",
        status: "PRESENT",
        path: "app/page.tsx",
        sourceRef: changeSetId,
        codingTaskId: taskId,
        codeChangeSetId: changeSetId,
      },
      {
        artifactId: "arch-evidence-1",
        kind: "ARCHITECTURE_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: plan.input.ventureSystemsBuildContractId,
      },
      {
        artifactId: "build-evidence-1",
        kind: "BUILD_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: "pab-quality-gates",
      },
      {
        artifactId: "test-evidence-1",
        kind: "TEST_EVIDENCE",
        status: "PRESENT",
        path: null,
        sourceRef: "pab-quality-gates",
      },
      ...(dbRequired
        ? [
            {
              artifactId: "migration-1",
              kind: "DATABASE_MIGRATION" as const,
              status: "PRESENT" as const,
              path: "supabase/migrations/0001_init.sql",
              sourceRef: changeSetId,
              codingTaskId: taskId,
              codeChangeSetId: changeSetId,
            },
            {
              artifactId: "schema-1",
              kind: "DATABASE_SCHEMA" as const,
              status: "PRESENT" as const,
              path: "supabase/migrations/0001_init.sql",
              sourceRef: changeSetId,
            },
          ]
        : []),
    ],
    runtimeRequirements: databaseAwareRuntime(plan),
    ...passingEvidence(),
    ...extras,
  };
}

describe("Build Execution → Production Artifact Handoff V1", () => {
  it("keeps the handoff write boundary at zero and never grants deployment authority", () => {
    expect(PRODUCTION_HANDOFF_WRITE_BOUNDARY).toEqual({
      validationWrites: 0,
      selectionWrites: 0,
      missionCreation: 0,
      treasuryMovements: 0,
      treasuryReservations: 0,
      providerAccountCreation: 0,
      providerWrites: 0,
      purchases: 0,
      eagActions: 0,
      deployments: 0,
      domainPurchases: 0,
      dnsWrites: 0,
      paymentWrites: 0,
      publicLaunches: 0,
    });
    const { plan } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan));
    expect(result.handoff.deploymentAuthority).toBe("NONE");
    expect(result.handoff.writeBoundary).toEqual(PRODUCTION_HANDOFF_WRITE_BOUNDARY);
    expect(result.handoff.codeChangeSets.every((item) => item.productionReady === false)).toBe(true);
  });

  it("packages a simple digital product with preserved lineage", () => {
    const { bound, plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(result.ok).toBe(true);
    expect(result.readiness).toBe("READY_FOR_COMMERCIALIZATION_REVIEW");
    expect(result.handoff.ventureId).toBe(bound.ventureId);
    expect(result.handoff.companyId).toBe(bound.companyId);
    expect(result.handoff.buildContractId).toBe(bound.buildContractId);
    expect(result.handoff.ventureSystemsBuildContractId).toBe(bound.ventureSystemsBuildContractId);
    expect(result.handoff.traceability.codingTaskIds).toContain("task-app-1");
    expect(result.handoff.traceability.codeChangeSetIds).toContain("changeset-app-1");
    expect(result.handoff.architectureCoverage.requiredSystemsAccounted).toBe(true);
    expect(result.handoff.completeness.accounted).toBe(result.handoff.completeness.required);
    expect(result.handoff.artifactInventory.some((item) => item.kind === "APPLICATION_SOURCE" && item.status === "PRESENT")).toBe(true);
    expect(JSON.stringify(result.handoff)).not.toMatch(/sk_live_|ghp_|password=/i);
  });

  it("packages a SaaS subscription build with identity/payment requirements", () => {
    const { plan, validation } = planned(AI_SEO_PLATFORM_FIXTURE);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(result.handoff.runtimeRequirements.find((item) => item.key === "payments")?.required).toBe(true);
    expect(result.handoff.architectureCoverage.deferredFamilies).toEqual(expect.arrayContaining(plan.rows.filter((row) => row.required && row.disposition === "DEFERRED").map((row) => row.family)));
    expect(result.handoff.environmentRequirements.some((item) => item.key === "PAYMENTS_PROVIDER_SECRET" && item.secret)).toBe(true);
    expect(result.handoff.environmentRequirements.every((item) => !("value" in item && typeof (item as EnvironmentRequirement & { value?: string }).value === "string"))).toBe(true);
    if (plan.rows.some((row) => row.required && row.family === "IDENTITY_AND_ACCOUNTS" && row.disposition === "INTERNAL_BUILD")) {
      expect(result.handoff.databaseRequirements.schemaRequired).toBe(true);
      expect(result.handoff.databaseRequirements.migrations.length).toBeGreaterThan(0);
      expect(result.handoff.databaseRequirements.verificationStatus).toBe("UNVERIFIED");
    }
    expect(result.handoff.deploymentRequirements.deploymentAuthority).toBe("NONE");
    expect(result.ok || result.failures.every((item) => item.code !== "PRODUCTION_HANDOFF_LINEAGE_MISMATCH")).toBe(true);
  });

  it("packages a marketplace with payment/provider dependencies without choosing a vendor", () => {
    const { plan, validation } = planned(ART_MARKETPLACE_SYSTEMS_FIXTURE);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(plan.input.contract.paymentArchitecture.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    const payments = result.handoff.architectureCoverage.blockedFamilies.includes("PAYMENTS")
      ? "BLOCKED"
      : result.handoff.externalDependencies.find((item) => item.capability === "PAYMENTS")
        ? "EXTERNAL"
        : "INTERNAL";
    expect(["BLOCKED", "EXTERNAL", "INTERNAL"]).toContain(payments);
    expect(result.handoff.deploymentRequirements.providerChosen).toBe(false);
    expect(result.handoff.externalDependencies.every((item) => item.writeAuthorized === false)).toBe(true);
    expect(result.handoff.completeness.accounted).toBe(result.handoff.completeness.required);
  });

  it("packages a lead-gen business with CRM/email/SMS dependencies", () => {
    const { plan, validation } = planned({ ...LEAD_GENERATION_FIXTURE, ventureId: "lead-gen-handoff-v1" });
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(plan.rows.some((row) => row.family === "CRM" && row.required)).toBe(true);
    expect(result.handoff.externalDependencies.map((item) => item.capability)).toEqual(
      expect.arrayContaining(plan.rows.filter((row) => row.disposition === "EXTERNAL_PROVIDER_DEPENDENCY").map((row) => row.family)),
    );
    expect(result.handoff.environmentRequirements.some((item) => item.sourceCapability === "TRANSACTIONAL_EMAIL" || item.key.includes("EMAIL"))).toBe(
      plan.rows.some((row) => row.required && row.family === "TRANSACTIONAL_EMAIL"),
    );
    expect(result.handoff.writeBoundary.purchases).toBe(0);
    expect(result.handoff.writeBoundary.eagActions).toBe(0);
  });

  it("keeps deferred systems deferred on an AI SEO handoff", () => {
    const { plan, validation } = planned(AI_SEO_PLATFORM_FIXTURE);
    const deferred = plan.rows.filter((row) => row.required && row.disposition === "DEFERRED").map((row) => row.family);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(result.handoff.architectureCoverage.deferredFamilies).toEqual(expect.arrayContaining(deferred));
    expect(result.handoff.completeness.deferred).toBeGreaterThanOrEqual(deferred.length);
    expect(result.handoff.architectureCoverage.requiredSystemsAccounted).toBe(true);
  });

  it("surfaces a regulated compliance blocker on the handoff", () => {
    const { plan, validation } = planned({
      ...SIMPLE_DIGITAL_PRODUCT_FIXTURE,
      ventureId: "regulated-digital-v1",
      regulatedIndustry: true,
    });
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_ARCHITECTURE_BLOCKED");
    expect(result.readiness).toBe("BLOCKED");
  });

  it("is idempotent for the same canonical build output", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    const a = collectProductionArtifactHandoff(input);
    const b = collectProductionArtifactHandoff(input);
    expect(a.handoffId).toBe(b.handoffId);
    expect(a.artifactInventory).toEqual(b.artifactInventory);
    expect(a.codeChangeSetIds).toEqual(b.codeChangeSetIds);
    expect(a.completeness).toEqual(b.completeness);
  });

  it("fails when a required artifact is missing", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    input.artifacts = (input.artifacts ?? []).filter((item) => item.kind !== "APPLICATION_SOURCE");
    input.codeChangeSets = [];
    input.codingTaskIds = [];
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_ARTIFACT_MISSING");
  });

  it("fails when build evidence failed", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(
      collectFromPlan(plan, {
        architectureValidation: validation,
        buildVerification: { status: "FAIL", source: "pab", summary: "production_build failed", counts: { passed: 0, failed: 1, total: 1 } },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_BUILD_INCOMPLETE");
  });

  it("fails when tests failed", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(
      collectFromPlan(plan, {
        architectureValidation: validation,
        testVerification: { status: "FAIL", source: "pab", summary: "unit_tests failed", counts: { passed: 0, failed: 2, total: 2 } },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_TESTS_FAILED");
  });

  it("fails when venture lineage is wrong", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    input.codeChangeSets = input.codeChangeSets?.map((item) => ({ ...item, ventureId: "venture-other" }));
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_LINEAGE_MISMATCH");
  });

  it("fails when build-contract lineage is wrong", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    input.codeChangeSets = input.codeChangeSets?.map((item) => ({ ...item, buildContractId: "build-other" }));
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_LINEAGE_MISMATCH");
  });

  it("fails when a CodeChangeSet is orphaned from coding tasks", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    input.codingTaskIds = [];
    input.codeChangeSets = input.codeChangeSets?.map((item) => ({
      ...item,
      changeSet: { ...item.changeSet, taskId: "task-orphan" },
    }));
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_ORPHAN_CHANGESET");
  });

  it("fails when a required migration is missing", () => {
    const { plan, validation } = planned(HOME_CONTRACTOR_FIXTURE);
    const input = collectFromPlan(plan, {
      architectureValidation: validation,
      databaseRequirements: { schemaRequired: true, migrations: [], requiredCapabilities: ["relational_schema"], verificationStatus: "MISSING" },
    });
    input.artifacts = (input.artifacts ?? []).filter((item) => item.kind !== "DATABASE_MIGRATION" && item.kind !== "DATABASE_SCHEMA");
    input.codeChangeSets = input.codeChangeSets?.map((item) => ({
      ...item,
      changeSet: { ...item.changeSet, migrationChanges: [], changes: item.changeSet.changes.filter((change) => !change.path.includes("migration")) },
    }));
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_MIGRATION_MISSING");
  });

  it("fails when required env declarations are missing", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(
      collectFromPlan(plan, {
        architectureValidation: validation,
        environmentRequirements: [],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_ENV_REQUIREMENT_MISSING");
  });

  it("blocks unresolved provider dependencies", () => {
    const { bound, plan } = planned(HOME_CONTRACTOR_FIXTURE);
    const mutated: VentureSystemsBuildCoveragePlan = {
      ...plan,
      rows: plan.rows.map((row) =>
        row.family === "TRANSACTIONAL_EMAIL" && row.externalDependency
          ? {
              ...row,
              externalDependency: {
                ...row.externalDependency,
                providerStatus: "UNRESOLVED",
                blockingStatus: "POLICY",
              },
            }
          : row,
      ),
    };
    const result = buildProductionArtifactHandoff(
      collectFromPlan(mutated, {
        architectureValidation: validateVentureSystemsBuildCoverage({ bound, plan: mutated, tasks: [] }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_PROVIDER_DEPENDENCY_BLOCKED");
    expect(result.readiness).toBe("BLOCKED");
  });

  it("fails when unknown paid cost is treated as zero", () => {
    const bound = bindFixture(UNKNOWN_COST_FIXTURE);
    const plan = planVentureSystemsBuildCoverage(bound);
    const zeroed: VentureSystemsBuildCoveragePlan = {
      ...plan,
      rows: plan.rows.map((row) =>
        row.externalDependency && !row.externalDependency.costKnown
          ? {
              ...row,
              externalDependency: {
                ...row.externalDependency,
                estimatedCost: { value: 0, actuality: "UNKNOWN", currency: "USD" },
                costKnown: false,
                blockingStatus: "UNKNOWN_COST",
              },
            }
          : row,
      ),
    };
    const result = buildProductionArtifactHandoff(
      collectFromPlan(zeroed, {
        architectureValidation: validateVentureSystemsBuildCoverage({ bound, plan: zeroed, tasks: [] }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_UNKNOWN_COST");
  });

  it("fails when a secret value is placed on the handoff", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const collected = collectProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    const syntheticStripeSecret = ["sk", "live", "x".repeat(24)].join("_");
    collected.environmentRequirements = [
      ...collected.environmentRequirements,
      {
        key: "PAYMENTS_PROVIDER_SECRET",
        required: true,
        secret: true,
        sourceCapability: "PAYMENTS",
        provider: null,
        scope: "RUNTIME",
        status: "AVAILABLE",
        // @ts-expect-error adversarial secret value
        value: syntheticStripeSecret,
      },
    ];
    const result = validateProductionArtifactHandoff(collected);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_SECRET_LEAKAGE");
  });

  it("fails when an artifact path traverses out of project scope", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const input = collectFromPlan(plan, { architectureValidation: validation });
    input.artifacts = [
      ...(input.artifacts ?? []),
      {
        artifactId: "evil-path",
        kind: "STATIC_ASSET",
        status: "PRESENT",
        path: "../../etc/passwd",
        sourceRef: "agent",
      },
    ];
    const result = buildProductionArtifactHandoff(input);
    expect(result.ok).toBe(false);
    expect(result.failures.map((item) => item.code)).toContain("PRODUCTION_HANDOFF_PATH_UNSAFE");
  });

  it("passes a fully valid handoff and exposes a read-only HQ/commercialization/deployment intake", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(collectFromPlan(plan, { architectureValidation: validation }));
    expect(result.ok).toBe(true);
    expect(result.readiness).toBe("READY_FOR_COMMERCIALIZATION_REVIEW");
    const hq = toProductionHandoffHqView(result.handoff);
    expect(hq.deploymentAuthority).toBe("NONE");
    expect(hq.build).toBe("PASS");
    expect(hq.tests).toBe("PASS");
    expect(hq.artifacts).toBeGreaterThan(0);
    const commercial = acceptProductionArtifactHandoffForCommercialization(result.handoff);
    expect(commercial.accepted).toBe(true);
    expect(commercial.deploymentTriggered).toBe(false);
    expect(commercial.purchaseTriggered).toBe(false);
    expect(commercial.publicLaunchTriggered).toBe(false);
    expect(commercial.writeBoundary.deployments).toBe(0);
    const deployment = toDeploymentHandoffIntake(result.handoff);
    expect(deployment.deploymentAuthority).toBe("NONE");
    expect(deployment.writeAuthorized).toBe(false);
    expect(deployment.readOnlyVerificationInterpretedAsWrite).toBe(false);
  });

  it("does not treat READ_ONLY_VERIFIED as write authority", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const result = buildProductionArtifactHandoff(
      collectFromPlan(plan, {
        architectureValidation: validation,
        providerVerifications: plan.rows
          .filter((row) => row.externalDependency)
          .map((row) => ({ capability: row.family, state: "READ_ONLY_VERIFIED" as const })),
      }),
    );
    expect(result.handoff.externalDependencies.every((item) => item.writeAuthorized === false)).toBe(true);
    expect(result.handoff.externalDependencies.every((item) => item.writeAuthorityRequired === false)).toBe(true);
    const verified = result.handoff.externalDependencies.filter((item) => item.providerVerificationState === "READ_ONLY_VERIFIED");
    expect(verified.every((item) => item.writeAuthorized === false)).toBe(true);
  });
});
