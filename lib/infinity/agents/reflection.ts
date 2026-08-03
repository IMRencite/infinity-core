import { buildAgentEvent } from "./agent-events";
import type { AgentEventRecord } from "./agent-events";
import type { AgentResult } from "./agent-results";

export type ReflectionInput = {
  organizationId: string;
  runId: string;
  correlationId: string;
  results: AgentResult[];
};

export type ReflectionOutput = {
  summary: string;
  observations: string[];
  advisoryOnly: true;
  binding: false;
  events: AgentEventRecord[];
};

export function runReflectionStage(input: ReflectionInput): ReflectionOutput {
  const events: AgentEventRecord[] = [
    buildAgentEvent({
      organizationId: input.organizationId,
      runId: input.runId,
      eventType: "reflection.started",
      message: "Reflection stage started.",
      correlationId: input.correlationId,
    }),
  ];

  const observations = input.results.map(
    (result) =>
      `${result.agentId}: confidence ${result.confidenceScore}, findings ${result.findings.length}`,
  );

  events.push(
    buildAgentEvent({
      organizationId: input.organizationId,
      runId: input.runId,
      eventType: "reflection.completed",
      message: "Reflection stage completed.",
      correlationId: input.correlationId,
      payload: { observation_count: observations.length },
    }),
  );

  return {
    summary: "Deterministic reflection over agent outputs (no model execution).",
    observations,
    advisoryOnly: true,
    binding: false,
    events,
  };
}
