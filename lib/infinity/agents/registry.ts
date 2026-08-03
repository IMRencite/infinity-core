import type { AgentDefinition } from "./agent";
import type { AgentRole } from "./agent-types";
import type { AgentCapabilityKey } from "./agent-capabilities";
import type { AgentContextRequirement } from "./agent-context";

function baseRequirement(key: AgentContextRequirement["key"], required: boolean): AgentContextRequirement {
  return { key, required, description: `${key} context for agent execution.` };
}

function defineAgent(input: Omit<AgentDefinition, "status"> & { status?: AgentDefinition["status"] }): AgentDefinition {
  return {
    ...input,
    status: input.status ?? "registered",
  };
}

/** Pre-registered specialist placeholders — no implementations. */
export const SPECIALIST_AGENT_TEMPLATES: AgentDefinition[] = [
  defineAgent({
    id: "agent.research",
    name: "Research Agent",
    role: "research",
    capabilities: ["research.synthesize"],
    requiredContext: [baseRequirement("opportunity", true), baseRequirement("validation", true)],
    supportedTools: ["tool.search", "tool.knowledge"],
    priority: 60,
    timeoutMs: 120_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens", notes: "Placeholder" },
    executionMode: "parallel",
    dependencies: [],
  }),
  defineAgent({
    id: "agent.market_analyst",
    name: "Market Analyst",
    role: "market_analyst",
    capabilities: ["market.analyze"],
    requiredContext: [baseRequirement("opportunity", true)],
    supportedTools: ["tool.analytics"],
    priority: 55,
    timeoutMs: 90_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "parallel",
    dependencies: ["agent.research"],
  }),
  defineAgent({
    id: "agent.financial_analyst",
    name: "Financial Analyst",
    role: "financial_analyst",
    capabilities: ["finance.model"],
    requiredContext: [baseRequirement("opportunity", true), baseRequirement("executive_decision", false)],
    supportedTools: ["tool.finance"],
    priority: 58,
    timeoutMs: 90_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "parallel",
    dependencies: ["agent.research"],
  }),
  defineAgent({
    id: "agent.risk_analyst",
    name: "Risk Analyst",
    role: "risk_analyst",
    capabilities: ["risk.assess"],
    requiredContext: [baseRequirement("validation", true)],
    supportedTools: ["tool.validation"],
    priority: 57,
    timeoutMs: 90_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "parallel",
    dependencies: [],
  }),
  defineAgent({
    id: "agent.technical_analyst",
    name: "Technical Analyst",
    role: "technical_analyst",
    capabilities: ["technical.review"],
    requiredContext: [baseRequirement("opportunity", true)],
    supportedTools: ["tool.analytics"],
    priority: 50,
    timeoutMs: 90_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "sequential",
    dependencies: ["agent.research"],
  }),
  defineAgent({
    id: "agent.seo_analyst",
    name: "SEO Analyst",
    role: "seo_analyst",
    capabilities: ["seo.evaluate"],
    requiredContext: [baseRequirement("opportunity", true)],
    supportedTools: ["tool.search"],
    priority: 45,
    timeoutMs: 60_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "parallel",
    dependencies: [],
  }),
  defineAgent({
    id: "agent.product_strategist",
    name: "Product Strategist",
    role: "product_strategist",
    capabilities: ["product.strategy"],
    requiredContext: [baseRequirement("mission", true), baseRequirement("opportunity", true)],
    supportedTools: ["tool.planning"],
    priority: 62,
    timeoutMs: 120_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "hybrid",
    dependencies: ["agent.market_analyst", "agent.financial_analyst"],
  }),
  defineAgent({
    id: "agent.executive_critic",
    name: "Executive Critic",
    role: "executive_critic",
    capabilities: ["executive.critique"],
    requiredContext: [baseRequirement("executive_decision", true)],
    supportedTools: [],
    priority: 70,
    timeoutMs: 60_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "sequential",
    dependencies: ["agent.product_strategist"],
  }),
  defineAgent({
    id: "agent.devils_advocate",
    name: "Devil's Advocate",
    role: "devils_advocate",
    capabilities: ["devils_advocate.challenge"],
    requiredContext: [baseRequirement("prior_agent_results", false)],
    supportedTools: [],
    priority: 65,
    timeoutMs: 60_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "sequential",
    dependencies: ["agent.product_strategist"],
  }),
  defineAgent({
    id: "agent.reflection",
    name: "Reflection Agent",
    role: "reflection",
    capabilities: ["reflection.summarize"],
    requiredContext: [baseRequirement("prior_agent_results", true)],
    supportedTools: ["tool.memory"],
    priority: 40,
    timeoutMs: 45_000,
    costEstimate: { currency: "USD", estimatedUnits: 0, unitLabel: "tokens" },
    executionMode: "sequential",
    dependencies: ["agent.executive_critic", "agent.devils_advocate"],
  }),
];

const registry = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition): void {
  registry.set(agent.id, agent);
}

export function unregisterAgent(agentId: string): void {
  registry.delete(agentId);
}

export function getAgent(agentId: string): AgentDefinition | null {
  return registry.get(agentId) ?? null;
}

export function listAgents(filter?: { role?: AgentRole }): AgentDefinition[] {
  const agents = [...registry.values()];
  if (!filter?.role) return agents.sort((a, b) => a.id.localeCompare(b.id));
  return agents.filter((agent) => agent.role === filter.role).sort((a, b) => a.id.localeCompare(b.id));
}

export function clearAgentRegistry(): void {
  registry.clear();
}

export function seedSpecialistAgentTemplates(): void {
  for (const template of SPECIALIST_AGENT_TEMPLATES) {
    registerAgent(template);
  }
}

export function resolveAgentsByIds(agentIds: string[]): AgentDefinition[] {
  return agentIds
    .map((id) => getAgent(id))
    .filter((agent): agent is AgentDefinition => agent !== null);
}

export function resolveAgentsByCapabilities(capability: AgentCapabilityKey): AgentDefinition[] {
  return listAgents().filter((agent) => agent.capabilities.includes(capability));
}
