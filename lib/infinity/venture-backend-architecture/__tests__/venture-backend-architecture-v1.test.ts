import { describe, expect, it } from "vitest";
import {
  BACKEND_CAPABILITIES,
  VENTURE_BACKEND_CONTRACT,
  VENTURE_BACKEND_READINESS_GATE,
  evaluateOccupancynpvBackendReadiness,
  evaluateVentureBackendReadinessGate,
  generateFactoryVentureBackend,
  generateVentureBackendContract,
  occupancynpvVentureBackendContract,
} from "..";

describe("VENTURE_BACKEND_ARCHITECTURE_V1", () => {
  it("requires an explicit backend contract and fails when it is missing", () => {
    const missing = evaluateVentureBackendReadinessGate({ contract: null });
    expect(missing.gate).toBe(VENTURE_BACKEND_READINESS_GATE);
    expect(missing.result).toBe("FAIL");
    expect(missing.reasons).toContain("BACKEND_CONTRACT_MISSING");
  });

  it("generates a provider-neutral contract with no silent capability omission", () => {
    const contract = generateVentureBackendContract({
      ventureId: "venture_future",
      productType: "SAAS_TOOL",
      customerAuth: true,
      paidOffer: true,
    });
    expect(contract.contract).toBe(VENTURE_BACKEND_CONTRACT);
    expect(BACKEND_CAPABILITIES.every((capability) => contract.capabilities[capability]?.decision)).toBe(true);
    expect(contract.providerBindings).toEqual([]);
    expect(contract.capabilities.AUTHENTICATION.decision).toBe("REQUIRED");
    expect(contract.capabilities.PERSISTENCE.decision).toBe("REQUIRED");
  });

  it("fails auth-required ventures without an auth backend", () => {
    const contract = generateVentureBackendContract({
      ventureId: "auth_saas",
      productType: "SAAS_TOOL",
      customerAuth: true,
    });
    const result = evaluateVentureBackendReadinessGate({
      contract,
      evidence: {
        contractExists: true,
        productionProviderBound: true,
        databaseOrStorageReachable: true,
        schemaOrStateModelExists: true,
        authOperational: false,
        serverAuthorizationOperational: true,
        apiOrBusinessLogicOperational: true,
        persistenceVerified: true,
        paymentLinkageVerified: true,
        fulfillmentLinkageVerified: true,
        tenantIsolationVerified: true,
        webhooksVerified: true,
        recoveryPathVerified: true,
        observabilityVerified: true,
        secretsServerOnly: true,
        productionReadWriteVerified: true,
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toContain("AUTH_BACKEND_NOT_OPERATIONAL");
  });

  it("fails durable fulfillment without persistence", () => {
    const contract = generateVentureBackendContract({
      ventureId: "report",
      productType: "GENERATED_REPORT",
      paidOffer: true,
      durableFulfillment: true,
    });
    const result = evaluateVentureBackendReadinessGate({
      contract,
      evidence: {
        contractExists: true,
        productionProviderBound: true,
        databaseOrStorageReachable: false,
        schemaOrStateModelExists: false,
        authOperational: true,
        serverAuthorizationOperational: true,
        apiOrBusinessLogicOperational: true,
        persistenceVerified: false,
        paymentLinkageVerified: true,
        fulfillmentLinkageVerified: true,
        tenantIsolationVerified: true,
        webhooksVerified: true,
        recoveryPathVerified: true,
        observabilityVerified: true,
        secretsServerOnly: true,
        productionReadWriteVerified: true,
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toEqual(expect.arrayContaining(["PERSISTENCE_NOT_VERIFIED", "SCHEMA_OR_STATE_MODEL_MISSING"]));
  });

  it("fails client-only entitlement trust", () => {
    const contract = generateVentureBackendContract({
      ventureId: "paid",
      productType: "SAAS_TOOL",
      customerAuth: true,
    });
    const result = evaluateVentureBackendReadinessGate({
      contract,
      evidence: {
        contractExists: true,
        productionProviderBound: true,
        databaseOrStorageReachable: true,
        schemaOrStateModelExists: true,
        authOperational: true,
        serverAuthorizationOperational: true,
        apiOrBusinessLogicOperational: true,
        persistenceVerified: true,
        paymentLinkageVerified: true,
        fulfillmentLinkageVerified: true,
        tenantIsolationVerified: true,
        webhooksVerified: true,
        recoveryPathVerified: true,
        observabilityVerified: true,
        secretsServerOnly: true,
        productionReadWriteVerified: true,
        clientOnlyEntitlement: true,
      },
    });
    expect(result.result).toBe("FAIL");
    expect(result.reasons).toContain("CLIENT_ONLY_ENTITLEMENT");
  });

  it("fails frontend-only ventures that require durable state", () => {
    const contract = generateVentureBackendContract({
      ventureId: "static",
      productType: "SAAS_TOOL",
      customerAuth: true,
    });
    const result = evaluateVentureBackendReadinessGate({
      contract,
      evidence: { frontendOnly: true, secretsServerOnly: true, contractExists: true },
    });
    expect(result.frontendOnlyRequiredState).toBe(true);
    expect(result.result).toBe("FAIL");
    expect(result.status).toBe("BLOCKED");
  });

  it("auto-generates a factory backend contract and implementation mission", () => {
    const factory = generateFactoryVentureBackend({
      ventureId: "bp_auto",
      templateType: "saas",
    });
    expect(factory.backendContract.ventureId).toBe("bp_auto");
    expect(factory.backendImplementationMission?.generatedAutomatically).toBe(true);
    expect(factory.backendImplementationMission?.founderPromptRequired).toBe(false);
    expect(factory.backendImplementationMission?.tasks).toEqual(expect.arrayContaining(["auth", "persistence"]));
  });

  it("passes OccupancyNPV production backend evidence", () => {
    const contract = occupancynpvVentureBackendContract();
    expect(contract.productType).toBe("SAAS_TOOL");
    expect(contract.providerBindings.some((row) => row.providerFamily === "managed_auth")).toBe(true);
    expect(evaluateOccupancynpvBackendReadiness().result).toBe("PASS");
    expect(evaluateOccupancynpvBackendReadiness().quality.observability.result).toBe("PASS");
  });
});
