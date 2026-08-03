import type { AgentDefinition } from "./agent";

export function compareAgentPriority(a: AgentDefinition, b: AgentDefinition): number {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }

  return a.id.localeCompare(b.id);
}

export function sortAgentsByPriority(agents: AgentDefinition[]): AgentDefinition[] {
  return [...agents].sort(compareAgentPriority);
}

export function normalizePriority(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
