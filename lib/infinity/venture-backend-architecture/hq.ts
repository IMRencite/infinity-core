import { occupancynpvBackendEvidence, occupancynpvVentureBackendContract, evaluateOccupancynpvBackendReadiness } from "./occupancynpv";
import { generateVentureBackendContract, mapFactoryTemplateToProductType, type VentureBackendContract } from "./contract";
import { evaluateVentureBackendReadinessGate, type BackendReadinessStatus } from "./readiness";

export type VentureBackendHqProjection = {
  backend: BackendReadinessStatus;
  provider: string;
  auth: string;
  persistence: string;
  api: string;
  fulfillmentIntegration: string;
  observability: string;
  backendReadinessGate: "PASS" | "FAIL";
  architecture: string;
  databaseStorage: string;
  businessLogic: string;
  jobs: string;
  webhooks: string;
  security: string;
  recovery: string;
};

function providers(contract: VentureBackendContract): string {
  const ids = contract.providerBindings.map((row) => row.providerFamily);
  return [...new Set(ids)].join(", ") || "UNBOUND";
}

export function projectOccupancynpvBackendHq(): VentureBackendHqProjection {
  const contract = occupancynpvVentureBackendContract();
  const gate = evaluateOccupancynpvBackendReadiness();
  const evidence = occupancynpvBackendEvidence();
  return {
    backend: gate.status,
    provider: providers(contract),
    auth: evidence.authOperational ? "SUPABASE_AUTH" : "UNVERIFIED",
    persistence: evidence.persistenceVerified ? "SUPABASE" : "UNVERIFIED",
    api: evidence.apiOrBusinessLogicOperational ? "OPERATIONAL" : "UNVERIFIED",
    fulfillmentIntegration: evidence.fulfillmentLinkageVerified ? "PASS" : "FAIL",
    observability: evidence.observabilityVerified ? "PASS" : "FAIL",
    backendReadinessGate: gate.result,
    architecture: contract.productType,
    databaseStorage: contract.persistenceRequirements.join("; ") || "NONE",
    businessLogic: evidence.apiOrBusinessLogicOperational ? "OPERATIONAL" : "UNVERIFIED",
    jobs: contract.capabilities.JOB_PROCESSING.decision,
    webhooks: evidence.webhooksVerified ? "VERIFIED" : "UNVERIFIED",
    security: evidence.secretsServerOnly && evidence.serverAuthorizationOperational ? "PASS" : "FAIL",
    recovery: evidence.recoveryPathVerified ? "PASS" : "FAIL",
  };
}

export function projectVentureBackendHq(input: {
  ventureId: string;
  templateType?: string;
  customerAuth?: boolean;
}): VentureBackendHqProjection {
  if (input.ventureId === "occupancynpv" || /occupancynpv/i.test(input.ventureId)) {
    return projectOccupancynpvBackendHq();
  }
  const contract = generateVentureBackendContract({
    ventureId: input.ventureId,
    productType: mapFactoryTemplateToProductType(input.templateType ?? "saas"),
    customerAuth: input.customerAuth,
  });
  const gate = evaluateVentureBackendReadinessGate({ contract, evidence: { contractExists: true, secretsServerOnly: true } });
  return {
    backend: gate.status,
    provider: providers(contract),
    auth: contract.authModel,
    persistence: contract.capabilities.PERSISTENCE.decision,
    api: contract.capabilities.API_LAYER.decision,
    fulfillmentIntegration: contract.capabilities.FULFILLMENT_STATE.decision,
    observability: contract.capabilities.OBSERVABILITY.decision,
    backendReadinessGate: gate.result,
    architecture: contract.productType,
    databaseStorage: contract.persistenceRequirements.join("; ") || "NONE",
    businessLogic: contract.capabilities.BUSINESS_LOGIC.decision,
    jobs: contract.capabilities.JOB_PROCESSING.decision,
    webhooks: contract.capabilities.WEBHOOK_PROCESSING.decision,
    security: contract.securityModel,
    recovery: contract.capabilities.RECOVERY_RETRY.decision,
  };
}
