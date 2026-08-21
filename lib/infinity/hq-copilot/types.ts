import type { DepartmentId } from "@/lib/infinity/operator-console/types";

export const HQ_COPILOT_ALLOWED_CAPABILITIES = [
  "READ",
  "EXPLAIN",
  "SUMMARIZE",
  "COMPARE",
  "TRACE",
  "NAVIGATE",
] as const;

export const HQ_COPILOT_FORBIDDEN_CAPABILITIES = [
  "DECIDE",
  "PRIORITIZE",
  "ASSIGN",
  "APPROVE",
  "EXECUTE",
  "MUTATE",
  "SPEND",
  "DEPLOY",
  "PURCHASE",
  "DELETE",
] as const;

export type HqCopilotAllowedCapability = (typeof HQ_COPILOT_ALLOWED_CAPABILITIES)[number];
export type HqCopilotForbiddenCapability = (typeof HQ_COPILOT_FORBIDDEN_CAPABILITIES)[number];
export type HqCopilotCapability = HqCopilotAllowedCapability | HqCopilotForbiddenCapability;

export const HQ_COPILOT_INTENTS = [
  "PORTFOLIO_STATUS",
  "VENTURE_STATUS",
  "VENTURE_BLOCKERS",
  "VENTURE_READINESS",
  "ROOM_STATUS",
  "ROOM_ACTIVITY",
  "MISSION_STATUS",
  "VALIDATION_STATUS",
  "RESEARCH_EVIDENCE",
  "MONETIZATION_STATUS",
  "TREASURY_STATUS",
  "PROVIDER_STATUS",
  "BUILD_STATUS",
  "ARTIFACT_STATUS",
  "PERFORMANCE_STATUS",
  "EXISTING_DECISION_EXPLANATION",
  "COMPARE_EXISTING_METRICS",
  "TRACE_LINEAGE",
  "NAVIGATION_REQUEST",
  "GENERAL_HQ_SUMMARY",
  "INSUFFICIENT_SCOPE",
  "FORBIDDEN_ACTION",
] as const;

export type HqCopilotIntent = (typeof HQ_COPILOT_INTENTS)[number];

export type HqCopilotConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

export type HqCopilotQuery = {
  organizationId: string;
  userId: string;
  question: string;
  currentRoute?: string | null;
  currentVentureId?: string | null;
  currentRoom?: DepartmentId | null;
  selectedArtifactId?: string | null;
  conversationId?: string | null;
  conversation?: HqCopilotConversationTurn[];
};

export type HqCopilotSourceType =
  | "HQ_ROOM"
  | "VENTURE"
  | "MISSION"
  | "DECISION"
  | "RESEARCH_EVIDENCE"
  | "VALIDATION_RESULT"
  | "MONETIZATION_RESULT"
  | "TREASURY_RECORD"
  | "PROVIDER_VERIFICATION"
  | "PERFORMANCE_OBSERVATION"
  | "BUILD"
  | "ARTIFACT"
  | "PORTFOLIO";

export type HqCopilotSource = {
  type: HqCopilotSourceType;
  label: string;
  id?: string;
  href?: string;
};

export type HqCopilotGroundingStatus =
  | "GROUNDED"
  | "INSUFFICIENT_EVIDENCE"
  | "BLOCKED"
  | "NAVIGATION_ONLY";

export type HqCopilotNavigationAction = {
  type: "NAVIGATE";
  href: string;
  label: string;
};

export type HqCopilotResponse = {
  answer: string;
  intent: HqCopilotIntent;
  capability: HqCopilotCapability;
  sources: HqCopilotSource[];
  groundingStatus: HqCopilotGroundingStatus;
  navigation?: HqCopilotNavigationAction;
  blockedAction?: HqCopilotForbiddenCapability;
  latencyMs: number;
  provider: string | null;
  model: string | null;
  costUsd: number | null;
  inputChars: number;
  outputChars: number;
};

export const HQ_COPILOT_SYSTEM_INSTRUCTION = `You are Infinity HQ's reporting interface.

You report recorded Infinity state.

You may explain, summarize, compare, trace, and help navigate.

You do not make business decisions.
You do not prioritize work.
You do not assign agents.
You do not approve actions.
You do not mutate system state.
You do not spend money.
You do not deploy.
You do not purchase.
You do not perform provider actions.

Only make factual claims supported by the supplied Infinity context.
When information is unavailable, state that explicitly.
Never invent metrics, decisions, sources, or identifiers.`;

export const INSUFFICIENT_EVIDENCE_ANSWER =
  "Infinity does not currently have enough recorded evidence to answer that.";

export const MAX_COPILOT_CONTEXT_CHARS = 8_000;
export const MAX_COPILOT_QUESTION_CHARS = 2_000;
export const MAX_COPILOT_CONVERSATION_TURNS = 4;
