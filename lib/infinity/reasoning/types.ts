import {
  ADVISORY_OUTPUT_KINDS,
  EXECUTIVE_GATED_ACTIONS,
  MEMORY_SCOPES,
  PROMPT_TEMPLATE_ROLES,
  REASONING_EVENT_TYPES,
  REASONING_PIPELINE_STAGES,
  REASONING_SESSION_STATUSES,
} from "./constants";
import type { ReasoningContextBundle } from "./context";
import type { ReasoningMessage, ToolCallRecord } from "./messages";
import type { ReasoningProviderCapabilities, ReasoningProviderId } from "./providers";
import type { ComposedPromptBundle } from "./prompts";

export type ReasoningSessionStatus = (typeof REASONING_SESSION_STATUSES)[number];

export type ReasoningPipelineStage = (typeof REASONING_PIPELINE_STAGES)[number];

export type ReasoningEventType = (typeof REASONING_EVENT_TYPES)[number];

export type PromptTemplateRole = (typeof PROMPT_TEMPLATE_ROLES)[number];

export type MemoryScope = (typeof MEMORY_SCOPES)[number];

export type ExecutiveGatedAction = (typeof EXECUTIVE_GATED_ACTIONS)[number];

export type AdvisoryOutputKind = (typeof ADVISORY_OUTPUT_KINDS)[number];

export type ReasoningModelMetadata = {
  providerId: ReasoningProviderId;
  modelId: string;
  displayName: string;
  version: string;
  contextWindowTokens: number;
  maxOutputTokens: number;
};

export type ReasoningSessionRefs = {
  organizationId: string;
  missionId: string | null;
  opportunityId: string | null;
  validationRunId: string | null;
  executiveDecisionId: string | null;
  plannerPlanId: string | null;
  correlationId: string;
};

export type ReasoningSession = {
  id: string;
  refs: ReasoningSessionRefs;
  status: ReasoningSessionStatus;
  context: ReasoningContextBundle | null;
  memoryRefIds: string[];
  messages: ReasoningMessage[];
  toolCalls: ToolCallRecord[];
  constraints: ReasoningConstraintSet;
  composedPrompts: ComposedPromptBundle | null;
  selectedProviderId: ReasoningProviderId | null;
  selectedModel: ReasoningModelMetadata | null;
  advisoryOutputs: AdvisoryOutput[];
  pipelineStageResults: Partial<Record<ReasoningPipelineStage, PipelineStageResult>>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ReasoningConstraintSet = {
  advisoryOnly: true;
  executiveAuthoritative: true;
  forbiddenWithoutExecutiveAuth: ExecutiveGatedAction[];
  allowedAdvisoryOutputs: AdvisoryOutputKind[];
  maxToolCalls: number;
  notes: string[];
};

export type AdvisoryOutput = {
  kind: AdvisoryOutputKind;
  summary: string;
  details: string[];
  generatedAt: string;
  /** Always false until Executive explicitly consumes advisory output. */
  binding: false;
};

export type PipelineStageResult = {
  stage: ReasoningPipelineStage;
  status: "completed" | "skipped" | "failed";
  message: string;
  completedAt: string;
};

export type ProviderSelectionPolicy = {
  preferredProviderId: ReasoningProviderId | null;
  requireCapabilities?: Partial<ReasoningProviderCapabilities>;
  fallbackProviderIds: ReasoningProviderId[];
};

export type ReasoningPipelineInput = {
  session: ReasoningSession;
  selectionPolicy?: ProviderSelectionPolicy;
};

export type ReasoningPipelineResult = {
  session: ReasoningSession;
  events: ReasoningEventRecord[];
};

export type ReasoningEventRecord = {
  id: string;
  organizationId: string;
  sessionId: string;
  eventType: ReasoningEventType;
  message: string;
  payload: Record<string, unknown>;
  correlationId: string;
  occurredAt: string;
};

export type PersistableReasoningSession = ReasoningSession & {
  persistVersion: string;
};
