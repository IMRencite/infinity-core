export {
  AI_PROVIDER_IDS,
  DEFAULT_AI_PROVIDER_ID,
  STRUCTURED_OUTPUT_SCHEMA_VERSION,
  PROVIDER_ERROR_CODES,
} from "./constants";
export type { AiProviderId, ProviderErrorCode } from "./constants";

export { AiProviderError, isAiProviderError } from "./errors";

export {
  loadAiProviderEnvConfig,
  isProviderConfigured,
  mayExecuteProvider,
} from "./config";
export type { AiProviderEnvConfig } from "./config";

export {
  validateStructuredAdvisoryPayload,
  parseStructuredAdvisoryJson,
} from "./structured-output";
export type { StructuredAdvisoryPayload } from "./structured-output";

export {
  registerAiModel,
  unregisterAiModel,
  getRegisteredAiModel,
  listRegisteredAiModels,
  clearAiModelRegistry,
  seedExampleModelCatalog,
} from "./model-registry";
export type { RegisteredAiModel } from "./model-registry";

export type {
  AiProviderAdapter,
  ProviderExecuteRequest,
  ProviderExecuteResult,
  ProviderHealthStatus,
  TokenEstimate,
  CostEstimate,
  ProviderExecutionTelemetry,
  ExecutiveReviewEnvelope,
} from "./types";

export {
  registerAiProvider,
  unregisterAiProvider,
  getAiProvider,
  listAiProviders,
  clearAiProviderRegistry,
  selectAiProvider,
} from "./registry";

export { mockProviderAdapter } from "./adapters/mock-adapter";
export {
  createOpenAiAdapter,
  createAnthropicAdapter,
  createGeminiAdapter,
  createOpenRouterAdapter,
  createOllamaAdapter,
} from "./adapters/vendor-adapters";

export { bootstrapAiProviders } from "./bootstrap";
export { bootstrapAiProvidersWithReasoning } from "./integration";
export { createReasoningProviderBridge } from "./reasoning-bridge";

export {
  executeProviderRuntime,
  executeProviderRuntimeSync,
  buildExecutiveReviewEnvelope,
} from "./runtime";
export type { ProviderRuntimeInput, ProviderRuntimeResult } from "./runtime";

export {
  recordProviderTelemetry,
  listProviderTelemetry,
  clearProviderTelemetry,
} from "./observability";

export { defaultRetryPolicy, withProviderRetry, isRetryableProviderError } from "./retry";
export type { RetryPolicy } from "./retry";
