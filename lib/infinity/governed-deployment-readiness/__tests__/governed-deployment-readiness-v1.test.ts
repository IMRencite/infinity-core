import { describe, expect, it } from "vitest";
import {
  AI_SEO_PLATFORM_FIXTURE,
  ART_MARKETPLACE_SYSTEMS_FIXTURE,
  LEAD_GENERATION_FIXTURE,
  SIMPLE_DIGITAL_PRODUCT_FIXTURE,
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
  buildProductionArtifactHandoff,
  type ProductionHandoffCollectInput,
  type RuntimeRequirement,
} from "@/lib/infinity/production-artifact/handoff";
import {
  DEPLOYMENT_ACTION_TYPES,
  GOVERNED_DEPLOYMENT_WRITE_BOUNDARY,
  askIfReadyForGovernedDeploymentExecution,
  evaluateGovernedDeploymentReadiness,
  toGovernedDeploymentHqView,
  type GovernedDeploymentReadinessInput,
} from "@/lib/infinity/governed-deployment-readiness";

function planned(evidence: Parameters<typeof buildVentureSystemsContract>[0]) {
  const ventureId = evidence.ventureId ?? "venture-gdr";
  const bound = bindVentureSystemsBuildInput({
    ventureId,
    companyId: "company-gdr",
    missionId: "mission-gdr",
    buildContractId: "build-gdr",
    contract: buildVentureSystemsContract(evidence),
  });
  const plan = planVentureSystemsBuildCoverage(bound);
  const validation = validateVentureSystemsBuildCoverage({ bound, plan, tasks: [] });
  return { bound, plan, validation };
}

function changeSet(taskId: string, paths: string[], migrations: string[] = []): CodeChangeSet {
  return {
    taskId,
    provider: "infinity-native",
    model: "test",
    reasoningSummary: "gdr fixture",
    changes: paths.map((path) => ({ operation: "create", path, content: "export const ok = true;\n", justification: "fixture" })),
    dependencyChanges: [],
    migrationChanges: migrations,
    testsAdded: [],
    expectedBehavior: [],
    assumptions: [],
  };
}

function runtime(plan: VentureSystemsBuildCoveragePlan): RuntimeRequirement[] {
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      ["IDENTITY_AND_ACCOUNTS", "CRM", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"].includes(row.family),
  );
  return [
    { key: "runtimeVersion", required: true, value: "node-20", status: "DECLARED", sourceCapability: null },
    { key: "framework", required: true, value: "nextjs", status: "DECLARED", sourceCapability: null },
    { key: "buildCommand", required: true, value: "npm run build", status: "DECLARED", sourceCapability: null },
    { key: "startCommand", required: true, value: "npm start", status: "DECLARED", sourceCapability: null },
    { key: "database", required: dbRequired, value: dbRequired ? "required" : null, status: dbRequired ? "DECLARED" : "NOT_REQUIRED", sourceCapability: null },
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

function verifiedHandoff(plan: VentureSystemsBuildCoveragePlan, extras: Partial<ProductionHandoffCollectInput> = {}) {
  const dbRequired = plan.rows.some(
    (row) =>
      row.required &&
      row.disposition === "INTERNAL_BUILD" &&
      ["IDENTITY_AND_ACCOUNTS", "CRM", "ENTITLEMENTS", "COMMERCE_AND_FULFILLMENT"].includes(row.family),
  );
  const migrations = dbRequired ? ["supabase/migrations/0001_init.sql"] : [];
  const input: ProductionHandoffCollectInput = {
    ventureId: plan.input.ventureId,
    companyId: plan.input.companyId,
    missionId: plan.input.missionId,
    buildContractId: plan.input.buildContractId,
    ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
    pabBuildRunId: "pab-run-gdr",
    pabArtifactId: "pab-artifact-gdr",
    createdAt: "2026-08-23T00:00:00.000Z",
    architecturePlan: plan,
    architectureValidation: extras.architectureValidation,
    codingTaskIds: ["task-gdr"],
    codeChangeSets: [
      {
        codeChangeSetId: "changeset-gdr",
        ventureId: plan.input.ventureId,
        companyId: plan.input.companyId,
        missionId: plan.input.missionId,
        buildContractId: plan.input.buildContractId,
        ventureSystemsBuildContractId: plan.input.ventureSystemsBuildContractId,
        validationState: "VALID",
        reviewState: "APPROVED",
        changeSet: changeSet("task-gdr", ["app/page.tsx", ...migrations], migrations),
      },
    ],
    artifacts: [
      { artifactId: "app", kind: "APPLICATION_SOURCE", status: "PRESENT", path: "app/page.tsx", sourceRef: "changeset-gdr" },
      { artifactId: "arch", kind: "ARCHITECTURE_EVIDENCE", status: "PRESENT", path: null, sourceRef: plan.input.ventureSystemsBuildContractId },
      { artifactId: "build", kind: "BUILD_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      { artifactId: "test", kind: "TEST_EVIDENCE", status: "PRESENT", path: null, sourceRef: "gates" },
      ...(dbRequired
        ? [
            { artifactId: "mig", kind: "DATABASE_MIGRATION" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gdr" },
            { artifactId: "schema", kind: "DATABASE_SCHEMA" as const, status: "PRESENT" as const, path: "supabase/migrations/0001_init.sql", sourceRef: "changeset-gdr" },
          ]
        : []),
    ],
    runtimeRequirements: runtime(plan),
    buildVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
    testVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 3, failed: 0, total: 3 } },
    typecheckVerification: { status: "PASS", timestamp: "2026-08-23T00:00:00.000Z", source: "gates", summary: "pass", counts: { passed: 1, failed: 0, total: 1 } },
    ...extras,
  };
  return buildProductionArtifactHandoff(input);
}

function writeReadyProviders(): GovernedDeploymentReadinessInput["providers"] {
  return [
    { capability: "HOSTING", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    { capability: "DNS", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    { capability: "PAYMENTS", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    { capability: "DATABASE", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    { capability: "EMAIL", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    { capability: "CRM", providerSelected: true, credentialAvailable: true, credentialWriteCapable: true, writeAuthorityGranted: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
  ];
}

function fullAuthority(handoffOk: ReturnType<typeof verifiedHandoff>): GovernedDeploymentReadinessInput {
  const actionsNeeded = [...DEPLOYMENT_ACTION_TYPES].filter((action) => action !== "PURCHASE_DOMAIN");
  return {
    handoff: handoffOk.handoff,
    expectedVentureId: handoffOk.handoff.ventureId,
    expectedHandoffId: handoffOk.handoff.handoffId,
    expectedBuildContractId: handoffOk.handoff.buildContractId,
    companyId: handoffOk.handoff.companyId,
    createdAt: "2026-08-23T00:00:00.000Z",
    providers: writeReadyProviders(),
    domain: { owned: true, selected: true, registrarKnown: true, purchaseRequired: false, renewalCostKnown: true },
    dns: { providerKnown: true, zoneExists: true, zoneVerified: true, writeCredentialAvailable: true, writeAuthorityGranted: true, requiredRecordsKnown: true },
    hosting: { providerSelected: true, writeAuthorityGranted: true, rollbackCapable: true, cost: { value: 0, actuality: "ESTIMATE", currency: "USD" } },
    treasury: { budgetKnown: true, budgetAvailableUsd: 100, reservationPresent: true, authorizedForPaidResources: true },
    eag: { authorizationPresent: true, authorizedActionTypes: actionsNeeded },
    paymentArchitecture: planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE).bound.contract.paymentArchitecture,
    paymentWriteAuthorized: true,
    healthCheckPath: "/api/health",
    deploymentAuthority: { granted: false, authorizationId: null, source: null },
    publicLaunchAuthority: { granted: false, authorizationId: null, source: null },
  };
}

describe("Governed Deployment Readiness V1", () => {
  it("keeps the write boundary at zero and never executes", () => {
    expect(GOVERNED_DEPLOYMENT_WRITE_BOUNDARY).toEqual({
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
      productionMigrations: 0,
      publicLaunches: 0,
    });
  });

  it("packages a simple digital product without treating technical readiness as deploy authority", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    expect(handoff.ok).toBe(true);
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      healthCheckPath: "/api/health",
    });
    expect(readiness.technicalReadiness).toBe("SATISFIED");
    expect(readiness.deploymentAuthorityGranted).toBe(false);
    expect(readiness.publicLaunchAuthorityGranted).toBe(false);
    expect(readiness.readyForDeploymentExecution).toBe(false);
    expect(readiness.executionDraft.executable).toBe(false);
    expect(readiness.hostingReadiness.providerNeutralCapability).toBe("HOSTING");
  });

  it("represents SaaS hosting, database, and payment requirements", () => {
    const { plan, validation, bound } = planned(AI_SEO_PLATFORM_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      paymentArchitecture: bound.contract.paymentArchitecture,
      healthCheckPath: "/api/health",
    });
    expect(readiness.paymentReadiness.required).toBe(true);
    expect(readiness.databaseReadiness.required || readiness.paymentReadiness.required).toBe(true);
    expect(readiness.hostingReadiness.capability).toBeTruthy();
    expect(readiness.requiredAuthorizations.some((row) => row.actionType === "DEPLOY_APPLICATION" && row.requiresEag)).toBe(true);
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("reuses marketplace payment architecture without executing Stripe writes", () => {
    const { plan, validation, bound } = planned(ART_MARKETPLACE_SYSTEMS_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      paymentArchitecture: bound.contract.paymentArchitecture,
      providers: [{ capability: "PAYMENTS", verificationState: "READ_ONLY_VERIFIED", credentialAvailable: true, writeAuthorityGranted: false }],
      healthCheckPath: "/api/health",
    });
    expect(bound.contract.paymentArchitecture.architecture).toBe("STRIPE_CONNECT_MARKETPLACE");
    expect(readiness.paymentReadiness.connectRequired).toBe(true);
    expect(readiness.paymentReadiness.liveWriteAuthority).toBe(false);
    expect(readiness.paymentReadiness.readOnlyVerificationGrantsWrites).toBe(false);
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_PROVIDER_READ_ONLY");
    expect(readiness.writeBoundary.paymentWrites).toBe(0);
  });

  it("packages lead-gen hosting and CRM/email provider dependencies", () => {
    const { plan, validation } = planned({ ...LEAD_GENERATION_FIXTURE, ventureId: "lead-gdr-v1" });
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({ handoff: handoff.handoff, healthCheckPath: "/api/health" });
    expect(readiness.providerRows.some((row) => row.capability === "CRM")).toBe(true);
    expect(readiness.providerRows.some((row) => row.capability === "EMAIL")).toBe(true);
    expect(readiness.hostingReadiness.providerNeutralCapability).toBe("HOSTING");
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("treats domain-required + read-only DNS as not write-ready", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      domain: { selected: true, registrarKnown: true, owned: false, purchaseRequired: true },
      dns: { providerKnown: true, zoneVerified: true, writeAuthorityGranted: false },
      providers: [
        { capability: "DNS", verificationState: "READ_ONLY_VERIFIED", credentialAvailable: true, writeAuthorityGranted: false },
        { capability: "REGISTRAR", verificationState: "READ_ONLY_VERIFIED", credentialAvailable: true, writeAuthorityGranted: false },
      ],
      healthCheckPath: "/api/health",
    });
    expect(readiness.dnsReadiness.readOnlyOnly).toBe(true);
    expect(readiness.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["DEPLOYMENT_DNS_NOT_READY", "DEPLOYMENT_PROVIDER_READ_ONLY"]));
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("blocks unknown hosting cost and does not treat it as zero", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      hosting: { providerSelected: true, cost: { value: 0, actuality: "UNKNOWN", currency: "USD" } },
      providers: [{ capability: "HOSTING", cost: { value: 0, actuality: "UNKNOWN", currency: "USD" }, procurementRequired: true }],
      healthCheckPath: "/api/health",
    });
    expect(readiness.treasuryReadiness.status).toBe("UNKNOWN_COST");
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_UNKNOWN_COST");
  });

  it("blocks unresolved regulated compliance", () => {
    const { plan, validation } = planned({ ...SIMPLE_DIGITAL_PRODUCT_FIXTURE, ventureId: "regulated-gdr", regulatedIndustry: true });
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({ handoff: handoff.handoff, healthCheckPath: "/api/health" });
    expect(handoff.ok).toBe(false);
    expect(readiness.securityComplianceReadiness).toBe("BLOCKED");
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_COMPLIANCE_BLOCKED");
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("keeps technically ready separate from execution when write authority is missing", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      healthCheckPath: "/api/health",
      domain: { owned: true, purchaseRequired: false },
    });
    expect(readiness.technicalReadiness).toBe("SATISFIED");
    expect(readiness.readyForDeploymentExecution).toBe(false);
    expect(readiness.deploymentAuthorityGranted).toBe(false);
    expect(["REQUIRES_AUTHORIZATION", "TECHNICALLY_READY", "BLOCKED", "REQUIRES_PROCUREMENT"]).toContain(readiness.state);
    const hq = toGovernedDeploymentHqView(readiness);
    expect(hq.deploymentAuthority).toBe("NONE");
    expect(hq.publicLaunchAuthority).toBe("NONE");
  });

  it("fails when READ_ONLY_VERIFIED is treated as deployable", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      providers: [
        { capability: "HOSTING", verificationState: "READ_ONLY_VERIFIED", writeAuthorityGranted: true, credentialWriteCapable: false },
      ],
      healthCheckPath: "/api/health",
    });
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_PROVIDER_READ_ONLY");
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("blocks missing write credentials", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      providers: [{ capability: "HOSTING", verificationState: "READ_ONLY_VERIFIED", credentialAvailable: false, credentialWriteCapable: false, writeAuthorityGranted: false }],
      healthCheckPath: "/api/health",
    });
    expect(readiness.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["DEPLOYMENT_WRITE_CREDENTIAL_MISSING", "DEPLOYMENT_WRITE_AUTHORITY_MISSING"]));
  });

  it("blocks missing EAG authority", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      ...fullAuthority(handoff),
      eag: { authorizationPresent: false, authorizedActionTypes: [] },
    });
    expect(readiness.externalActionReadiness).toBe("EAG_AUTHORIZATION_MISSING");
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_WRITE_AUTHORITY_MISSING");
    expect(readiness.readyForDeploymentExecution).toBe(false);
  });

  it("blocks missing Treasury budget for paid resources", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      hosting: { providerSelected: true, cost: { value: 20, actuality: "ESTIMATE", currency: "USD" } },
      providers: [{ capability: "HOSTING", cost: { value: 20, actuality: "ESTIMATE", currency: "USD" }, procurementRequired: true }],
      treasury: { budgetKnown: false, budgetAvailableUsd: null },
      healthCheckPath: "/api/health",
    });
    expect(readiness.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["DEPLOYMENT_BUDGET_MISSING", "DEPLOYMENT_PROCUREMENT_REQUIRED"]));
  });

  it("blocks a missing required domain", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    expect(handoff.handoff.deploymentRequirements.domainRequired).toBe(true);
    const readiness = evaluateGovernedDeploymentReadiness({ handoff: handoff.handoff, healthCheckPath: "/api/health" });
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_DOMAIN_MISSING");
  });

  it("blocks missing DNS authority", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      domain: { owned: true },
      dns: { providerKnown: true, writeAuthorityGranted: false },
      healthCheckPath: "/api/health",
    });
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_DNS_NOT_READY");
  });

  it("blocks missing migrations when the database is required", () => {
    const { plan, validation } = planned(AI_SEO_PLATFORM_FIXTURE);
    const handoff = verifiedHandoff(plan, {
      architectureValidation: validation,
      databaseRequirements: { schemaRequired: true, migrations: [], requiredCapabilities: ["relational_schema"], verificationStatus: "MISSING" },
    });
    const readiness = evaluateGovernedDeploymentReadiness({ handoff: handoff.handoff, healthCheckPath: "/api/health" });
    expect(readiness.blockers.map((item) => item.code)).toEqual(expect.arrayContaining(["DEPLOYMENT_MIGRATION_NOT_READY", "DEPLOYMENT_DATABASE_NOT_READY"]));
  });

  it("blocks missing payment readiness", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      paymentArchitecture: null,
      paymentWriteAuthorized: false,
      healthCheckPath: "/api/health",
    });
    expect(readiness.paymentReadiness.required).toBe(true);
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_PAYMENT_NOT_READY");
  });

  it("fails on wrong venture lineage", () => {
    const { plan, validation } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      handoff: handoff.handoff,
      expectedVentureId: "venture-other",
      healthCheckPath: "/api/health",
    });
    expect(readiness.blockers.map((item) => item.code)).toContain("DEPLOYMENT_LINEAGE_MISMATCH");
  });

  it("passes readiness evaluation when prerequisites are present without fabricating deployment authority", () => {
    const { plan, validation, bound } = planned(SIMPLE_DIGITAL_PRODUCT_FIXTURE);
    const handoff = verifiedHandoff(plan, { architectureValidation: validation });
    const readiness = evaluateGovernedDeploymentReadiness({
      ...fullAuthority(handoff),
      paymentArchitecture: bound.contract.paymentArchitecture,
    });
    expect(readiness.technicalReadiness).toBe("SATISFIED");
    expect(readiness.blockers.map((item) => `${item.code}:${item.capability ?? ""}:${item.message}`)).toEqual([]);
    expect(readiness.readyForDeploymentExecution).toBe(true);
    expect(readiness.state).toBe("READY_FOR_DEPLOYMENT_EXECUTION");
    expect(readiness.deploymentAuthorityGranted).toBe(false);
    expect(readiness.publicLaunchAuthorityGranted).toBe(false);
    expect(readiness.executionDraft.executable).toBe(false);
    expect(readiness.executionDraft.status).toBe("DRAFT");
    const gate = askIfReadyForGovernedDeploymentExecution(readiness);
    expect(gate.readyToEnterGovernedDeploymentExecution).toBe(true);
    expect(gate.deploymentTriggered).toBe(false);
    expect(gate.purchaseTriggered).toBe(false);
    expect(gate.publicLaunchTriggered).toBe(false);
    expect(gate.deploymentAuthorityGranted).toBe(false);
  });
});
