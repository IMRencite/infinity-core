export type {
  AgentExecutionMode,
  AgentStatus,
  AgentRole,
  ConsensusStrategy,
  CritiqueKind,
  AgentEventType,
  OrchestrationMode,
  ExecutionGraph,
  ExecutionGraphEdge,
  ExecutionGraphNode,
  ExecutionPlan,
  OrchestrationRun,
  AgentCostEstimate,
} from "./agent-types";

export {
  AGENT_EXECUTION_MODES,
  AGENT_STATUSES,
  AGENT_ROLES,
  CONSENSUS_STRATEGIES,
  CRITIQUE_KINDS,
  AGENT_EVENT_TYPES,
  ORCHESTRATION_MODES,
} from "./agent-types";

export type { AgentDefinition, AgentExecutor } from "./agent";
export { deterministicStubExecutor } from "./agent";

export {
  AGENT_CAPABILITY_KEYS,
  AGENT_CAPABILITY_CATALOG,
  getAgentCapability,
} from "./agent-capabilities";
export type { AgentCapability, AgentCapabilityKey } from "./agent-capabilities";

export {
  AGENT_CONTEXT_KEYS,
  buildAgentContextSnapshot,
  assertRequiredContext,
} from "./agent-context";
export type { AgentContextKey, AgentContextRequirement, AgentContextSnapshot } from "./agent-context";

export type {
  AgentResult,
  AgentResultProvenance,
  AggregatedAgentOutput,
  ConflictRecord,
} from "./agent-results";
export { createStubAgentResult } from "./agent-results";

export {
  createInMemoryAgentMemoryStore,
  createAgentMemoryRecord,
} from "./agent-memory";
export type { AgentMemoryRecord, AgentMemoryStore } from "./agent-memory";

export {
  createInMemoryAgentEventEmitter,
  buildAgentEvent,
} from "./agent-events";
export type { AgentEventRecord, AgentEventEmitter } from "./agent-events";

export {
  registerAgent,
  unregisterAgent,
  getAgent,
  listAgents,
  clearAgentRegistry,
  seedSpecialistAgentTemplates,
  resolveAgentsByIds,
  resolveAgentsByCapabilities,
  SPECIALIST_AGENT_TEMPLATES,
} from "./registry";

export {
  buildExecutionGraph,
  scheduleExecutionBatches,
  validateExecutionGraph,
  ExecutionGraphError,
} from "./scheduler";

export {
  buildExecutionPlan,
  runCoordinator,
} from "./coordinator";
export type {
  BuildExecutionPlanInput,
  CoordinatorRunInput,
  CoordinatorRunResult,
} from "./coordinator";

export { compareAgentPriority, sortAgentsByPriority, normalizePriority } from "./priority";

export {
  defaultOrchestratorConstraints,
  assertOrchestratorActionAllowed,
  assertNoNetworkExecution,
  OrchestratorSafetyError,
  ORCHESTRATOR_FORBIDDEN_ACTIONS,
} from "./constraints";

export {
  detectConflicts,
  resolveConflicts,
  mergeAgentResults,
  scoreAggregateConfidence,
} from "./aggregation";

export { runConsensus } from "./consensus";
export type { ConsensusInput, ConsensusResult } from "./consensus";

export { runReflectionStage } from "./reflection";
export type { ReflectionInput, ReflectionOutput } from "./reflection";

export { runCritique } from "./critique";
export type { CritiqueFinding, CritiqueReport } from "./critique";

export {
  runMultiAgentOrchestration,
  ensureDefaultSpecialistRegistry,
} from "./agent-runtime";
export type {
  MultiAgentOrchestrationInput,
  MultiAgentOrchestrationResult,
} from "./agent-runtime";
