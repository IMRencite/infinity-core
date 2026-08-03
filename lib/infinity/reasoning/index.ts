export * from "./deterministic";

export {
  REASONING_ENGINE_NAME,
  REASONING_SESSION_STATUSES,
  REASONING_PIPELINE_STAGES,
  REASONING_EVENT_TYPES,
  PROMPT_TEMPLATE_ROLES,
  MEMORY_SCOPES,
  KNOWN_PROVIDER_IDS,
  EXECUTIVE_GATED_ACTIONS,
  ADVISORY_OUTPUT_KINDS,
  DEFAULT_REASONING_RUNTIME_VERSION,
  isReasoningSessionStatus,
  isReasoningPipelineStage,
  isReasoningEventType,
} from "./constants";

export type {
  ReasoningSession,
  ReasoningSessionStatus,
  ReasoningSessionRefs,
  ReasoningPipelineStage,
  ReasoningPipelineInput,
  ReasoningPipelineResult,
  ReasoningEventType,
  ReasoningEventRecord,
  ReasoningConstraintSet,
  AdvisoryOutput,
  AdvisoryOutputKind,
  ProviderSelectionPolicy,
  ReasoningModelMetadata,
  PersistableReasoningSession,
  PromptTemplateRole,
  MemoryScope,
  ExecutiveGatedAction,
  PipelineStageResult,
} from "./types";

export type {
  ReasoningProvider,
  ReasoningProviderId,
  ReasoningProviderCapabilities,
  ProviderCostMetrics,
  ReasoningProviderRegistration,
} from "./providers";
export { describeProviderCapabilities } from "./providers";

export {
  listRegisteredModels,
  listModelsForProvider,
  getModelDescriptor,
} from "./models";
export type { ReasoningModelDescriptor } from "./models";

export {
  registerReasoningProvider,
  unregisterReasoningProvider,
  getReasoningProvider,
  listReasoningProviders,
  clearReasoningProviderRegistry,
  selectReasoningProvider,
} from "./registry";

export {
  createReasoningSession,
  transitionSessionStatus,
  withSessionContext,
  toPersistableSession,
  freezeSessionSnapshot,
} from "./sessions";

export {
  createInMemoryMemoryStore,
  createMemoryRecord,
} from "./memory";
export type { MemoryRecord, MemoryQuery, ReasoningMemoryStore } from "./memory";

export {
  assembleReasoningContext,
  buildMissionContext,
  buildOpportunityContext,
  buildValidationContext,
  buildPolicyContext,
  buildMemoryContext,
  buildBuildContext,
} from "./context";
export type {
  ReasoningContextBundle,
  AssembleReasoningContextInput,
  MissionContextSnapshot,
  OpportunityContextSnapshot,
  ValidationContextSnapshot,
  PolicyContextSnapshot,
  MemoryContextSnapshot,
  BuildContextSnapshot,
} from "./context";

export { buildExecutiveContext } from "./executive-context";
export type { ExecutiveContextInput, ExecutiveContextSnapshot } from "./executive-context";

export { buildPlannerContext } from "./planner-context";
export type { PlannerContextInput, PlannerContextSnapshot } from "./planner-context";

export {
  createReasoningMessage,
  appendMessage,
} from "./messages";
export type { ReasoningMessage, ReasoningMessageRole, ToolCallRecord } from "./messages";

export {
  listPromptTemplates,
  getPromptTemplate,
  composePrompts,
  renderPromptSegment,
} from "./prompts";
export type { PromptTemplate, PromptTemplateSegment, ComposedPromptBundle } from "./prompts";

export {
  REASONING_TOOL_CATALOG,
  notImplementedToolResolver,
  getToolDefinition,
} from "./tools";
export type {
  ReasoningToolDefinition,
  ReasoningToolCategory,
  ReasoningToolInvocation,
  ReasoningToolResolver,
} from "./tools";

export {
  defaultReasoningConstraints,
  injectConstraints,
  assertAdvisoryOnlyOutput,
  assertActionAllowedByExecutive,
  ReasoningSafetyError,
} from "./constraints";

export {
  runReasoningPipeline,
  runContextAssemblyStage,
  runConstraintInjectionStage,
  runPromptConstructionStage,
  runProviderSelectionStage,
  runExecutionStage,
  runToolResolutionStage,
  runReflectionStage,
  runCritiqueStage,
  runExecutiveReviewStage,
  runPlanningHandoffStage,
  runPersistenceStage,
} from "./pipeline";

export { runAdvisoryReasoningRuntime } from "./runtime";
export type { StartAdvisoryReasoningInput, AdvisoryReasoningRuntimeResult } from "./runtime";

export {
  createInMemoryReasoningEventEmitter,
  buildReasoningEvent,
} from "./events";
export type { ReasoningEventEmitter } from "./events";

/** @deprecated Use `ReasoningContext` from deterministic scoring or `ReasoningContextBundle` for AI advisory context. */
export type { ReasoningContext as DeterministicScoringContext } from "./deterministic/types";
