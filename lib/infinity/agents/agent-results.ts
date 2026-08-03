import type { AgentCapabilityKey } from "./agent-capabilities";

export type AgentResultProvenance = {
  agentId: string;
  agentRole: string;
  runId: string;
  startedAt: string;
  completedAt: string;
  correlationId: string;
  deterministic: true;
};

export type AgentResult = {
  agentId: string;
  capabilityKeys: AgentCapabilityKey[];
  summary: string;
  findings: string[];
  confidenceScore: number;
  policyAligned: boolean;
  advisoryOnly: true;
  binding: false;
  provenance: AgentResultProvenance;
};

export type ConflictRecord = {
  id: string;
  topic: string;
  agentIds: string[];
  descriptions: string[];
  resolution: "unresolved" | "merged" | "executive_override" | "highest_confidence";
  resolvedSummary: string | null;
};

export type AggregatedAgentOutput = {
  mergedSummary: string;
  mergedFindings: string[];
  averageConfidence: number;
  conflicts: ConflictRecord[];
  provenance: AgentResultProvenance[];
  advisoryOnly: true;
  binding: false;
};

export function createStubAgentResult(input: {
  agentId: string;
  agentRole: string;
  runId: string;
  correlationId: string;
  capabilityKeys: AgentCapabilityKey[];
  confidenceScore: number;
  policyAligned?: boolean;
}): AgentResult {
  const now = new Date().toISOString();
  return {
    agentId: input.agentId,
    capabilityKeys: input.capabilityKeys,
    summary: `Deterministic stub output for agent ${input.agentId}.`,
    findings: [`Agent ${input.agentRole} completed without provider execution.`],
    confidenceScore: input.confidenceScore,
    policyAligned: input.policyAligned ?? true,
    advisoryOnly: true,
    binding: false,
    provenance: {
      agentId: input.agentId,
      agentRole: input.agentRole,
      runId: input.runId,
      startedAt: now,
      completedAt: now,
      correlationId: input.correlationId,
      deterministic: true,
    },
  };
}
