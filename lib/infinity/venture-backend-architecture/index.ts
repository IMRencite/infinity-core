export {
  VENTURE_BACKEND_CONTRACT,
  VENTURE_BACKEND_REQUIRED_BY_DEFAULT,
  VENTURE_BACKEND_PROVIDER_SPECIFIC,
  BACKEND_CAPABILITIES,
  VENTURE_PRODUCT_TYPES,
  generateVentureBackendContract,
  defaultCapabilitiesForProductType,
  backendContractRequiresDurableState,
  mapFactoryTemplateToProductType,
} from "./contract";
export type {
  BackendCapability,
  BackendCapabilityDecision,
  BackendCapabilityRecord,
  VentureBackendContract,
  VentureBackendProviderBinding,
  VentureProductType,
  GenerateVentureBackendContractInput,
} from "./contract";
export {
  VENTURE_BACKEND_READINESS_GATE,
  BACKEND_SCHEMA_QUALITY_GATE,
  BACKEND_AUTHORIZATION_GATE,
  BACKEND_PERSISTENCE_GATE,
  BACKEND_ISOLATION_GATE,
  BACKEND_BUSINESS_LOGIC_GATE,
  BACKEND_OBSERVABILITY_GATE,
  BACKEND_RECOVERY_GATE,
  BACKEND_SECRETS_GATE,
  evaluateVentureBackendReadinessGate,
  backendReadinessBlocksCommercialActivation,
} from "./readiness";
export type {
  BackendReadinessStatus,
  VentureBackendEvidence,
  VentureBackendReadinessGateResult,
  NamedBackendGateResult,
} from "./readiness";
export { generateBackendImplementationMission, generateFactoryVentureBackend, BACKEND_IMPLEMENTATION_MISSION } from "./factory";
export type { VentureBackendImplementationMission } from "./factory";
export {
  occupancynpvVentureBackendContract,
  occupancynpvBackendEvidence,
  evaluateOccupancynpvBackendReadiness,
  evaluateOccupancynpvProductLayerReadiness,
  OCCUPANCYNPV_BACKEND_VENTURE_ID,
} from "./occupancynpv";
export { projectOccupancynpvBackendHq, projectVentureBackendHq } from "./hq";
export type { VentureBackendHqProjection } from "./hq";
