import {
  BACKEND_CAPABILITIES,
  backendContractRequiresDurableState,
  type BackendCapability,
  type VentureBackendContract,
} from "./contract";

export const VENTURE_BACKEND_READINESS_GATE = "VentureBackendReadinessGate" as const;
export const BACKEND_SCHEMA_QUALITY_GATE = "BackendSchemaQualityGate" as const;
export const BACKEND_AUTHORIZATION_GATE = "BackendAuthorizationGate" as const;
export const BACKEND_PERSISTENCE_GATE = "BackendPersistenceGate" as const;
export const BACKEND_ISOLATION_GATE = "BackendIsolationGate" as const;
export const BACKEND_BUSINESS_LOGIC_GATE = "BackendBusinessLogicGate" as const;
export const BACKEND_OBSERVABILITY_GATE = "BackendObservabilityGate" as const;
export const BACKEND_RECOVERY_GATE = "BackendRecoveryGate" as const;
export const BACKEND_SECRETS_GATE = "BackendSecretsGate" as const;

export type BackendReadinessStatus = "READY" | "PARTIAL" | "BLOCKED" | "NOT_REQUIRED";

export type VentureBackendEvidence = {
  contractExists?: boolean;
  productionProviderBound?: boolean;
  databaseOrStorageReachable?: boolean;
  schemaOrStateModelExists?: boolean;
  authOperational?: boolean;
  serverAuthorizationOperational?: boolean;
  apiOrBusinessLogicOperational?: boolean;
  persistenceVerified?: boolean;
  paymentLinkageVerified?: boolean;
  fulfillmentLinkageVerified?: boolean;
  tenantIsolationVerified?: boolean;
  webhooksVerified?: boolean;
  recoveryPathVerified?: boolean;
  observabilityVerified?: boolean;
  secretsServerOnly?: boolean;
  productionReadWriteVerified?: boolean;
  frontendOnly?: boolean;
  clientOnlyEntitlement?: boolean;
  clientOnlyPaymentTrust?: boolean;
};

export type NamedBackendGateResult = {
  gate: string;
  result: "PASS" | "FAIL" | "NOT_REQUIRED";
  reasons: string[];
};

export type VentureBackendReadinessGateResult = {
  gate: typeof VENTURE_BACKEND_READINESS_GATE;
  result: "PASS" | "FAIL";
  status: BackendReadinessStatus;
  reasons: string[];
  frontendOnlyRequiredState: boolean;
  quality: {
    schema: NamedBackendGateResult;
    authorization: NamedBackendGateResult;
    persistence: NamedBackendGateResult;
    isolation: NamedBackendGateResult;
    businessLogic: NamedBackendGateResult;
    observability: NamedBackendGateResult;
    recovery: NamedBackendGateResult;
    secrets: NamedBackendGateResult;
  };
};

function required(contract: VentureBackendContract, capability: BackendCapability): boolean {
  return contract.capabilities[capability].decision === "REQUIRED";
}

function named(gate: string, needed: boolean, ok: boolean, reason: string): NamedBackendGateResult {
  if (!needed) return { gate, result: "NOT_REQUIRED", reasons: [] };
  return { gate, result: ok ? "PASS" : "FAIL", reasons: ok ? [] : [reason] };
}

export function evaluateVentureBackendReadinessGate(input: {
  contract: VentureBackendContract | null;
  evidence?: VentureBackendEvidence | null;
}): VentureBackendReadinessGateResult {
  const reasons: string[] = [];
  const contract = input.contract;
  const evidence = input.evidence ?? {};
  if (!contract) {
    return {
      gate: VENTURE_BACKEND_READINESS_GATE,
      result: "FAIL",
      status: "BLOCKED",
      reasons: ["BACKEND_CONTRACT_MISSING"],
      frontendOnlyRequiredState: false,
      quality: {
        schema: { gate: BACKEND_SCHEMA_QUALITY_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        authorization: { gate: BACKEND_AUTHORIZATION_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        persistence: { gate: BACKEND_PERSISTENCE_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        isolation: { gate: BACKEND_ISOLATION_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        businessLogic: { gate: BACKEND_BUSINESS_LOGIC_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        observability: { gate: BACKEND_OBSERVABILITY_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        recovery: { gate: BACKEND_RECOVERY_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
        secrets: { gate: BACKEND_SECRETS_GATE, result: "FAIL", reasons: ["BACKEND_CONTRACT_MISSING"] },
      },
    };
  }

  const durableRequired = backendContractRequiresDurableState(contract);
  const frontendOnly = evidence.frontendOnly === true;
  if (durableRequired && frontendOnly) reasons.push("FRONTEND_ONLY_REQUIRED_STATE");
  if (evidence.contractExists === false) reasons.push("BACKEND_CONTRACT_MISSING");
  if (durableRequired && evidence.productionProviderBound !== true) reasons.push("PRODUCTION_PROVIDER_UNBOUND");
  if (required(contract, "PERSISTENCE") && evidence.databaseOrStorageReachable !== true) reasons.push("DATABASE_OR_STORAGE_UNREACHABLE");
  if (required(contract, "PERSISTENCE") && evidence.schemaOrStateModelExists !== true) reasons.push("SCHEMA_OR_STATE_MODEL_MISSING");
  if (required(contract, "AUTHENTICATION") && evidence.authOperational !== true) reasons.push("AUTH_BACKEND_NOT_OPERATIONAL");
  if (required(contract, "SECURITY_AUTHORIZATION") && evidence.serverAuthorizationOperational !== true) reasons.push("SERVER_AUTHORIZATION_NOT_OPERATIONAL");
  if ((required(contract, "API_LAYER") || required(contract, "BUSINESS_LOGIC")) && evidence.apiOrBusinessLogicOperational !== true) {
    reasons.push("API_OR_BUSINESS_LOGIC_NOT_OPERATIONAL");
  }
  if (required(contract, "PERSISTENCE") && evidence.persistenceVerified !== true) reasons.push("PERSISTENCE_NOT_VERIFIED");
  if (required(contract, "PAYMENT_BINDING") && evidence.paymentLinkageVerified !== true) reasons.push("PAYMENT_LINKAGE_NOT_VERIFIED");
  if (required(contract, "FULFILLMENT_STATE") && evidence.fulfillmentLinkageVerified !== true) reasons.push("FULFILLMENT_LINKAGE_NOT_VERIFIED");
  if (required(contract, "TENANT_ISOLATION") && evidence.tenantIsolationVerified !== true) reasons.push("TENANT_ISOLATION_NOT_VERIFIED");
  if (required(contract, "WEBHOOK_PROCESSING") && evidence.webhooksVerified !== true) reasons.push("WEBHOOKS_NOT_VERIFIED");
  if (required(contract, "RECOVERY_RETRY") && evidence.recoveryPathVerified !== true) reasons.push("RECOVERY_PATH_NOT_VERIFIED");
  if (required(contract, "OBSERVABILITY") && evidence.observabilityVerified !== true) reasons.push("OBSERVABILITY_NOT_VERIFIED");
  if (evidence.secretsServerOnly !== true) reasons.push("SECRETS_NOT_SERVER_ONLY");
  if (durableRequired && evidence.productionReadWriteVerified !== true) reasons.push("PRODUCTION_READ_WRITE_NOT_VERIFIED");
  if (evidence.clientOnlyEntitlement === true) reasons.push("CLIENT_ONLY_ENTITLEMENT");
  if (evidence.clientOnlyPaymentTrust === true) reasons.push("CLIENT_ONLY_PAYMENT_TRUST");

  const quality = {
    schema: named(BACKEND_SCHEMA_QUALITY_GATE, required(contract, "PERSISTENCE"), evidence.schemaOrStateModelExists === true, "SCHEMA_OR_STATE_MODEL_MISSING"),
    authorization: named(
      BACKEND_AUTHORIZATION_GATE,
      required(contract, "AUTHENTICATION") || required(contract, "SECURITY_AUTHORIZATION"),
      evidence.authOperational === true && evidence.serverAuthorizationOperational === true && evidence.clientOnlyEntitlement !== true,
      "AUTHORIZATION_BACKEND_FAIL",
    ),
    persistence: named(BACKEND_PERSISTENCE_GATE, required(contract, "PERSISTENCE"), evidence.persistenceVerified === true && evidence.databaseOrStorageReachable === true, "PERSISTENCE_FAIL"),
    isolation: named(BACKEND_ISOLATION_GATE, required(contract, "TENANT_ISOLATION"), evidence.tenantIsolationVerified === true, "TENANT_ISOLATION_FAIL"),
    businessLogic: named(BACKEND_BUSINESS_LOGIC_GATE, required(contract, "BUSINESS_LOGIC") || required(contract, "API_LAYER"), evidence.apiOrBusinessLogicOperational === true, "BUSINESS_LOGIC_FAIL"),
    observability: named(BACKEND_OBSERVABILITY_GATE, required(contract, "OBSERVABILITY"), evidence.observabilityVerified === true, "OBSERVABILITY_FAIL"),
    recovery: named(BACKEND_RECOVERY_GATE, required(contract, "RECOVERY_RETRY"), evidence.recoveryPathVerified === true, "RECOVERY_FAIL"),
    secrets: named(BACKEND_SECRETS_GATE, true, evidence.secretsServerOnly === true && evidence.clientOnlyPaymentTrust !== true, "SECRETS_FAIL"),
  };

  const missingRequiredEvidence = durableRequired && Object.keys(evidence).length === 0;
  if (missingRequiredEvidence) reasons.push("MISSING_REQUIRED_BACKEND_EVIDENCE");

  const result = reasons.length === 0 ? "PASS" as const : "FAIL" as const;
  const anyRequired = BACKEND_CAPABILITIES.some((capability) => required(contract, capability));
  const status: BackendReadinessStatus = !anyRequired
    ? "NOT_REQUIRED"
    : result === "PASS"
      ? "READY"
      : frontendOnly && durableRequired
        ? "BLOCKED"
        : "PARTIAL";

  return {
    gate: VENTURE_BACKEND_READINESS_GATE,
    result,
    status,
    reasons: [...new Set(reasons)],
    frontendOnlyRequiredState: durableRequired && frontendOnly,
    quality,
  };
}

export function backendReadinessBlocksCommercialActivation(result: VentureBackendReadinessGateResult): boolean {
  return result.result !== "PASS" && result.status !== "NOT_REQUIRED";
}
