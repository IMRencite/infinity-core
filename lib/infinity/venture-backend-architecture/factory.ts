import {
  generateVentureBackendContract,
  mapFactoryTemplateToProductType,
  type VentureBackendContract,
  type VentureProductType,
} from "./contract";

export const BACKEND_IMPLEMENTATION_MISSION = "VENTURE_BACKEND_IMPLEMENTATION" as const;

export type VentureBackendImplementationMission = {
  missionType: typeof BACKEND_IMPLEMENTATION_MISSION;
  ventureId: string;
  generatedAutomatically: true;
  founderPromptRequired: false;
  tasks: string[];
};

export function generateBackendImplementationMission(contract: VentureBackendContract): VentureBackendImplementationMission | null {
  const tasks: string[] = [];
  if (contract.capabilities.PERSISTENCE.decision === "REQUIRED") tasks.push("schema", "migrations", "persistence");
  if (contract.capabilities.AUTHENTICATION.decision === "REQUIRED") tasks.push("auth", "permissions");
  if (contract.capabilities.API_LAYER.decision === "REQUIRED" || contract.capabilities.BUSINESS_LOGIC.decision === "REQUIRED") {
    tasks.push("server APIs", "business services");
  }
  if (contract.capabilities.WEBHOOK_PROCESSING.decision === "REQUIRED") tasks.push("webhooks");
  if (contract.capabilities.JOB_PROCESSING.decision === "REQUIRED") tasks.push("jobs");
  if (contract.capabilities.FILE_STORAGE.decision === "REQUIRED") tasks.push("storage");
  if (contract.capabilities.FULFILLMENT_STATE.decision === "REQUIRED") tasks.push("fulfillment state");
  if (contract.capabilities.ADMIN_OPERATOR_STATE.decision === "REQUIRED") tasks.push("operator tooling");
  if (contract.capabilities.OBSERVABILITY.decision === "REQUIRED") tasks.push("telemetry");
  if (tasks.length === 0) return null;
  return {
    missionType: BACKEND_IMPLEMENTATION_MISSION,
    ventureId: contract.ventureId,
    generatedAutomatically: true,
    founderPromptRequired: false,
    tasks: [...new Set(tasks)],
  };
}

export function generateFactoryVentureBackend(input: {
  ventureId: string;
  templateType: string;
  customerAuth?: boolean;
  paidOffer?: boolean;
  durableFulfillment?: boolean;
  productType?: VentureProductType;
}): {
  backendContract: VentureBackendContract;
  backendImplementationMission: VentureBackendImplementationMission | null;
} {
  const backendContract = generateVentureBackendContract({
    ventureId: input.ventureId,
    productType: input.productType ?? mapFactoryTemplateToProductType(input.templateType),
    customerAuth: input.customerAuth ?? /saas|marketplace|subscription/i.test(input.templateType),
    paidOffer: input.paidOffer,
    durableFulfillment: input.durableFulfillment,
  });
  return {
    backendContract,
    backendImplementationMission: generateBackendImplementationMission(backendContract),
  };
}
