export const AGENT_EXECUTION_MODES = ["sequential", "parallel", "hybrid"] as const;

export const AGENT_STATUSES = [
  "registered",
  "planned",
  "running",
  "completed",
  "failed",
  "skipped",
  "cancelled",
] as const;

export const AGENT_ROLES = [
  "research",
  "market_analyst",
  "financial_analyst",
  "risk_analyst",
  "technical_analyst",
  "seo_analyst",
  "product_strategist",
  "executive_critic",
  "devils_advocate",
  "reflection",
  "custom",
] as const;

export const CONSENSUS_STRATEGIES = [
  "majority",
  "weighted",
  "executive_override",
  "unanimous",
  "best_confidence",
  "policy_first",
] as const;

export const CRITIQUE_KINDS = [
  "reflection",
  "self_review",
  "peer_review",
  "devils_advocate",
  "contradiction_detection",
  "missing_evidence_detection",
  "policy_conflict_detection",
] as const;

export const AGENT_EVENT_TYPES = [
  "agent.started",
  "agent.completed",
  "agent.failed",
  "consensus.started",
  "consensus.completed",
  "reflection.started",
  "reflection.completed",
] as const;

export const ORCHESTRATION_MODES = ["sequential", "parallel"] as const;

export type AgentExecutionMode = (typeof AGENT_EXECUTION_MODES)[number];

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export type AgentRole = (typeof AGENT_ROLES)[number];

export type ConsensusStrategy = (typeof CONSENSUS_STRATEGIES)[number];

export type CritiqueKind = (typeof CRITIQUE_KINDS)[number];

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export type OrchestrationMode = (typeof ORCHESTRATION_MODES)[number];

export type AgentCostEstimate = {
  currency: string;
  estimatedUnits: number;
  unitLabel: string;
  notes?: string;
};

export type ExecutionGraphNode = {
  agentId: string;
  depth: number;
  batchIndex: number;
};

export type ExecutionGraphEdge = {
  fromAgentId: string;
  toAgentId: string;
};

export type ExecutionGraph = {
  nodes: ExecutionGraphNode[];
  edges: ExecutionGraphEdge[];
};

export type ExecutionPlan = {
  id: string;
  organizationId: string;
  correlationId: string;
  mode: OrchestrationMode;
  graph: ExecutionGraph;
  batches: string[][];
  createdAt: string;
};

export type OrchestrationRun = {
  id: string;
  planId: string;
  organizationId: string;
  correlationId: string;
  status: "pending" | "running" | "completed" | "failed";
  agentStatuses: Record<string, AgentStatus>;
  startedAt: string;
  completedAt: string | null;
};
