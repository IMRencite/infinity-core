export const AGENT_CAPABILITY_KEYS = [
  "research.synthesize",
  "market.analyze",
  "finance.model",
  "risk.assess",
  "technical.review",
  "seo.evaluate",
  "product.strategy",
  "executive.critique",
  "devils_advocate.challenge",
  "reflection.summarize",
] as const;

export type AgentCapabilityKey = (typeof AGENT_CAPABILITY_KEYS)[number];

export type AgentCapability = {
  key: AgentCapabilityKey;
  label: string;
  description: string;
};

export const AGENT_CAPABILITY_CATALOG: AgentCapability[] = [
  {
    key: "research.synthesize",
    label: "Research synthesis",
    description: "Future research agent synthesis capability.",
  },
  {
    key: "market.analyze",
    label: "Market analysis",
    description: "Future market analyst capability.",
  },
  {
    key: "finance.model",
    label: "Financial modeling",
    description: "Future financial analyst capability.",
  },
  {
    key: "risk.assess",
    label: "Risk assessment",
    description: "Future risk analyst capability.",
  },
  {
    key: "technical.review",
    label: "Technical review",
    description: "Future technical analyst capability.",
  },
  {
    key: "seo.evaluate",
    label: "SEO evaluation",
    description: "Future SEO analyst capability.",
  },
  {
    key: "product.strategy",
    label: "Product strategy",
    description: "Future product strategist capability.",
  },
  {
    key: "executive.critique",
    label: "Executive critique",
    description: "Future executive critic capability.",
  },
  {
    key: "devils_advocate.challenge",
    label: "Devil's advocate",
    description: "Future contrarian challenge capability.",
  },
  {
    key: "reflection.summarize",
    label: "Reflection",
    description: "Future reflection agent capability.",
  },
];

export function getAgentCapability(key: AgentCapabilityKey): AgentCapability | null {
  return AGENT_CAPABILITY_CATALOG.find((cap) => cap.key === key) ?? null;
}
