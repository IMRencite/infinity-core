/** Future tool contracts — not implemented in Foundation v1. */
export type ReasoningToolCategory =
  | "search"
  | "validation"
  | "planning"
  | "memory"
  | "knowledge"
  | "analytics"
  | "finance"
  | "calendar"
  | "filesystem"
  | "browser"
  | "build"
  | "publishing";

export type ReasoningToolDefinition = {
  id: string;
  name: string;
  category: ReasoningToolCategory;
  description: string;
  requiresExecutiveAuthorization: boolean;
  inputSchema: Record<string, unknown>;
};

export type ReasoningToolInvocation = {
  toolId: string;
  arguments: Record<string, unknown>;
};

export type ReasoningToolResolver = {
  resolve(invocation: ReasoningToolInvocation): {
    status: "not_implemented" | "denied" | "resolved";
    summary: string;
  };
};

export const REASONING_TOOL_CATALOG: ReasoningToolDefinition[] = [
  {
    id: "tool.search",
    name: "Search",
    category: "search",
    description: "Future search tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.validation",
    name: "Validation",
    category: "validation",
    description: "Future validation tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.planning",
    name: "Planning",
    category: "planning",
    description: "Future planning tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.memory",
    name: "Memory",
    category: "memory",
    description: "Future memory tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.knowledge",
    name: "Knowledge",
    category: "knowledge",
    description: "Future knowledge tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.analytics",
    name: "Analytics",
    category: "analytics",
    description: "Future analytics tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.finance",
    name: "Finance",
    category: "finance",
    description: "Future finance tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.calendar",
    name: "Calendar",
    category: "calendar",
    description: "Future calendar tool.",
    requiresExecutiveAuthorization: false,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.filesystem",
    name: "Filesystem",
    category: "filesystem",
    description: "Future filesystem tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.browser",
    name: "Browser",
    category: "browser",
    description: "Future browser tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.build",
    name: "Build",
    category: "build",
    description: "Future build tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
  {
    id: "tool.publishing",
    name: "Publishing",
    category: "publishing",
    description: "Future publishing tool.",
    requiresExecutiveAuthorization: true,
    inputSchema: { type: "object" },
  },
];

export const notImplementedToolResolver: ReasoningToolResolver = {
  resolve() {
    return {
      status: "not_implemented",
      summary: "Tool execution is not available in AI Reasoning Foundation v1.",
    };
  },
};

export function getToolDefinition(toolId: string): ReasoningToolDefinition | null {
  return REASONING_TOOL_CATALOG.find((tool) => tool.id === toolId) ?? null;
}
