import type { AgentContextSnapshot } from "./agent-context";
import { assertRequiredContext } from "./agent-context";
import type { AgentResult, ConflictRecord } from "./agent-results";
import { createStubAgentResult } from "./agent-results";
import { buildAgentEvent } from "./agent-events";
import type { AgentEventRecord } from "./agent-events";
import { resolveConflicts, mergeAgentResults } from "./aggregation";
import { runConsensus } from "./consensus";
import { defaultOrchestratorConstraints, assertNoNetworkExecution } from "./constraints";
import { resolveAgentsByIds } from "./registry";
import { buildExecutionGraph, scheduleExecutionBatches, validateExecutionGraph } from "./scheduler";
import type { ExecutionPlan, OrchestrationMode, OrchestrationRun, ConsensusStrategy } from "./agent-types";
import { deterministicStubExecutor } from "./agent";

export type BuildExecutionPlanInput = {
  organizationId: string;
  correlationId: string;
  agentIds: string[];
  mode: OrchestrationMode;
  context: AgentContextSnapshot;
};

export type CoordinatorRunInput = {
  plan: ExecutionPlan;
  context: AgentContextSnapshot;
  consensusStrategy: ConsensusStrategy;
  executiveDecisionSummary?: string | null;
  policyFirstAligned?: boolean;
};

export type CoordinatorRunResult = {
  run: OrchestrationRun;
  results: AgentResult[];
  aggregated: ReturnType<typeof mergeAgentResults>;
  consensus: ReturnType<typeof runConsensus>;
  conflicts: ConflictRecord[];
  events: AgentEventRecord[];
};

export function buildExecutionPlan(input: BuildExecutionPlanInput): ExecutionPlan {
  const agents = resolveAgentsByIds(input.agentIds);
  if (agents.length !== input.agentIds.length) {
    throw new Error("Execution plan references unknown agents.");
  }

  for (const agent of agents) {
    assertRequiredContext(agent.requiredContext, input.context);
  }

  const graph = buildExecutionGraph(agents);
  validateExecutionGraph(graph);
  const batches = scheduleExecutionBatches(graph, input.mode);

  return {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    correlationId: input.correlationId,
    mode: input.mode,
    graph,
    batches,
    createdAt: new Date().toISOString(),
  };
}

export function runCoordinator(input: CoordinatorRunInput): CoordinatorRunResult {
  const constraints = defaultOrchestratorConstraints();
  assertNoNetworkExecution(constraints);

  const runId = crypto.randomUUID();
  const events: AgentEventRecord[] = [];
  const results: AgentResult[] = [];

  const run: OrchestrationRun = {
    id: runId,
    planId: input.plan.id,
    organizationId: input.plan.organizationId,
    correlationId: input.plan.correlationId,
    status: "running",
    agentStatuses: {},
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  const agentsById = new Map(resolveAgentsByIds(input.plan.batches.flat()).map((a) => [a.id, a]));

  for (const batch of input.plan.batches) {
    for (const agentId of batch) {
      const agent = agentsById.get(agentId);
      if (!agent) continue;

      run.agentStatuses[agentId] = "running";
      events.push(
        buildAgentEvent({
          organizationId: input.plan.organizationId,
          runId,
          eventType: "agent.started",
          message: `Agent ${agentId} started.`,
          correlationId: input.plan.correlationId,
          payload: { agent_id: agentId },
        }),
      );

      const execution = deterministicStubExecutor.execute({
        agent,
        runId,
        correlationId: input.plan.correlationId,
      });

      if (execution.status === "failed") {
        run.agentStatuses[agentId] = "failed";
        events.push(
          buildAgentEvent({
            organizationId: input.plan.organizationId,
            runId,
            eventType: "agent.failed",
            message: execution.message,
            correlationId: input.plan.correlationId,
            payload: { agent_id: agentId },
          }),
        );
        continue;
      }

      const result = createStubAgentResult({
        agentId: agent.id,
        agentRole: agent.role,
        runId,
        correlationId: input.plan.correlationId,
        capabilityKeys: agent.capabilities,
        confidenceScore: Math.min(100, agent.priority + 10),
        policyAligned: true,
      });

      results.push(result);
      run.agentStatuses[agentId] = "completed";

      events.push(
        buildAgentEvent({
          organizationId: input.plan.organizationId,
          runId,
          eventType: "agent.completed",
          message: `Agent ${agentId} completed.`,
          correlationId: input.plan.correlationId,
          payload: { agent_id: agentId, confidence: result.confidenceScore },
        }),
      );
    }
  }

  events.push(
    buildAgentEvent({
      organizationId: input.plan.organizationId,
      runId,
      eventType: "consensus.started",
      message: "Consensus started.",
      correlationId: input.plan.correlationId,
      payload: { strategy: input.consensusStrategy },
    }),
  );

  const consensus = runConsensus({
    strategy: input.consensusStrategy,
    results,
    weights: Object.fromEntries(
      [...agentsById.values()].map((agent) => [agent.id, agent.priority]),
    ),
    executiveDecisionSummary: input.executiveDecisionSummary ?? null,
    policyFirstAligned: input.policyFirstAligned ?? true,
  });

  events.push(
    buildAgentEvent({
      organizationId: input.plan.organizationId,
      runId,
      eventType: "consensus.completed",
      message: consensus.summary,
      correlationId: input.plan.correlationId,
      payload: { strategy: input.consensusStrategy, confidence: consensus.confidenceScore },
    }),
  );

  const conflicts = resolveConflicts(results);
  const aggregated = mergeAgentResults(results, conflicts);

  run.status = Object.values(run.agentStatuses).includes("failed") ? "failed" : "completed";
  run.completedAt = new Date().toISOString();

  return { run, results, aggregated, consensus, conflicts, events };
}
