import type { AgentDefinition } from "./agent";
import type { ExecutionGraph, ExecutionGraphEdge, OrchestrationMode } from "./agent-types";

export class ExecutionGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionGraphError";
  }
}

function buildEdges(agents: AgentDefinition[]): ExecutionGraphEdge[] {
  const edges: ExecutionGraphEdge[] = [];

  for (const agent of agents) {
    for (const dependencyId of agent.dependencies) {
      edges.push({ fromAgentId: dependencyId, toAgentId: agent.id });
    }
  }

  return edges;
}

function topologicalLayers(agentIds: string[], edges: ExecutionGraphEdge[]): string[][] {
  const incoming = new Map<string, Set<string>>();
  for (const id of agentIds) incoming.set(id, new Set());

  for (const edge of edges) {
    if (!incoming.has(edge.toAgentId)) continue;
    incoming.get(edge.toAgentId)?.add(edge.fromAgentId);
  }

  const remaining = new Set(agentIds);
  const layers: string[][] = [];

  while (remaining.size > 0) {
    const layer = [...remaining].filter((id) => {
      const deps = incoming.get(id) ?? new Set();
      return [...deps].every((dep) => !remaining.has(dep));
    });

    if (layer.length === 0) {
      throw new ExecutionGraphError("Cycle detected in agent dependency graph.");
    }

    layers.push(layer.sort());
    for (const id of layer) remaining.delete(id);
  }

  return layers;
}

export function buildExecutionGraph(agents: AgentDefinition[]): ExecutionGraph {
  const agentIds = agents.map((agent) => agent.id);
  const edges = buildEdges(agents);

  for (const edge of edges) {
    if (!agentIds.includes(edge.fromAgentId) || !agentIds.includes(edge.toAgentId)) {
      throw new ExecutionGraphError(`Unknown dependency edge: ${edge.fromAgentId} -> ${edge.toAgentId}`);
    }
  }

  const layers = topologicalLayers(agentIds, edges);
  const nodes = layers.flatMap((layer, batchIndex) =>
    layer.map((agentId) => ({
      agentId,
      depth: batchIndex,
      batchIndex,
    })),
  );

  return { nodes, edges };
}

export function scheduleExecutionBatches(
  graph: ExecutionGraph,
  mode: OrchestrationMode,
): string[][] {
  const layerMap = new Map<number, string[]>();

  for (const node of graph.nodes) {
    const list = layerMap.get(node.batchIndex) ?? [];
    list.push(node.agentId);
    layerMap.set(node.batchIndex, list);
  }

  const layers = [...layerMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, ids]) => [...ids].sort());

  if (mode === "sequential") {
    return graph.nodes
      .slice()
      .sort((a, b) => a.batchIndex - b.batchIndex || a.agentId.localeCompare(b.agentId))
      .map((node) => [node.agentId]);
  }

  return layers;
}

export function validateExecutionGraph(graph: ExecutionGraph): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    const list = adjacency.get(edge.fromAgentId) ?? [];
    list.push(edge.toAgentId);
    adjacency.set(edge.fromAgentId, list);
  }

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      throw new ExecutionGraphError(`Cycle detected at ${node}`);
    }

    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) dfs(next);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.nodes) dfs(node.agentId);
}
