import type { AgentCapabilityKey } from "./agent-capabilities";
import type { AgentContextRequirement } from "./agent-context";
import type {
  AgentCostEstimate,
  AgentExecutionMode,
  AgentRole,
  AgentStatus,
} from "./agent-types";

/** Specialist agent contract — metadata only; no LLM execution in Foundation v1. */
export type AgentDefinition = {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: AgentCapabilityKey[];
  requiredContext: AgentContextRequirement[];
  supportedTools: string[];
  priority: number;
  timeoutMs: number;
  costEstimate: AgentCostEstimate;
  executionMode: AgentExecutionMode;
  dependencies: string[];
  status: AgentStatus;
};

export type AgentExecutor = {
  execute(input: {
    agent: AgentDefinition;
    runId: string;
    correlationId: string;
  }): {
    status: "completed" | "failed" | "skipped";
    message: string;
  };
};

export const deterministicStubExecutor: AgentExecutor = {
  execute({ agent }) {
    return {
      status: "completed",
      message: `Stub executor completed for ${agent.id} (no provider).`,
    };
  },
};
