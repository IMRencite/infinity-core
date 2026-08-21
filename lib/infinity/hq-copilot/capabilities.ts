import {
  HQ_COPILOT_ALLOWED_CAPABILITIES,
  HQ_COPILOT_FORBIDDEN_CAPABILITIES,
  type HqCopilotAllowedCapability,
  type HqCopilotForbiddenCapability,
} from "./types";

const ALLOWED = new Set<string>(HQ_COPILOT_ALLOWED_CAPABILITIES);
const FORBIDDEN = new Set<string>(HQ_COPILOT_FORBIDDEN_CAPABILITIES);

export function isAllowedHqCopilotCapability(value: string): value is HqCopilotAllowedCapability {
  return ALLOWED.has(value);
}

export function isForbiddenHqCopilotCapability(value: string): value is HqCopilotForbiddenCapability {
  return FORBIDDEN.has(value);
}

export const FORBIDDEN_ACTION_ANSWERS: Record<HqCopilotForbiddenCapability, string> = {
  DECIDE:
    "I can report existing Infinity decisions and supporting evidence, but I cannot make a new decision.",
  PRIORITIZE:
    "I can report recorded rankings and status, but I cannot prioritize work or ventures.",
  ASSIGN: "I can report room and agent activity, but I cannot assign agents or rooms to tasks.",
  APPROVE: "I can report approval and readiness state, but I cannot approve actions.",
  EXECUTE: "I can report launch readiness, but I cannot launch or authorize actions.",
  MUTATE: "I can report Infinity state, but I cannot change it.",
  SPEND: "I can report Treasury balances and allocations, but I cannot spend or transfer capital.",
  DEPLOY: "I can report deployment and provider readiness, but I cannot deploy or authorize a deployment.",
  PURCHASE: "I can report domain readiness and registrar status, but I cannot purchase or authorize a domain.",
  DELETE: "I can report venture status, but I cannot delete ventures or records.",
};

type ForbiddenRule = {
  action: HqCopilotForbiddenCapability;
  pattern: RegExp;
};

const FORBIDDEN_RULES: ForbiddenRule[] = [
  { action: "EXECUTE", pattern: /\b(launch|start|kick\s*off|spin\s*up)\s+(this|the|our)?\s*(venture|company|product)\b/i },
  { action: "EXECUTE", pattern: /\blaunch\s+it\b/i },
  { action: "EXECUTE", pattern: /\b(go\s+live|ship\s+it|release\s+(this|the)\s+venture)\b/i },
  { action: "EXECUTE", pattern: /\buse\s+your\s+tools\s+to\s+(launch|deploy|buy|purchase|delete|approve)\b/i },
  { action: "DEPLOY", pattern: /\bapprove\s+(the\s+)?deployment\b/i },
  { action: "DEPLOY", pattern: /\b(deploy|push\s+to\s+production|roll\s+out)\s+(this|the|our)?\s*(venture|site|app|build)?\b/i },
  { action: "APPROVE", pattern: /\b(approve|authorize|green[- ]?light)\b.{0,40}\b(deployment|launch|spend|purchase|action)\b/i },
  { action: "APPROVE", pattern: /\bact\s+as\s+(an?\s+)?(administrator|admin|executive)\b.{0,80}\b(approve|launch|deploy|spend)\b/i },
  { action: "SPEND", pattern: /\b(give|send|transfer|allocate|fund|wire)\b.{0,40}\$?\s*\d/i },
  { action: "SPEND", pattern: /\b(another|more)\s+\$?\s*[\d,]+/i },
  { action: "SPEND", pattern: /\bwhich\s+venture\s+should\s+we\s+fund\b/i },
  { action: "PURCHASE", pattern: /\b(buy|purchase|register)\s+(this|the|a|our)?\s*(domain|tld|name)\b/i },
  { action: "DELETE", pattern: /\b(delete|remove|destroy|wipe)\s+(this|the|our)?\s*(venture|company|record|artifact)\b/i },
  { action: "ASSIGN", pattern: /\bassign\b.{0,60}\b(to\s+this\s+task|research\s+grid|room|agent)\b/i },
  { action: "ASSIGN", pattern: /\b(research\s+grid|validation\s+station).{0,40}\b(assign|do\s+this|handle\s+this)\b/i },
  { action: "PRIORITIZE", pattern: /\bprioritize\s+(venture|this|it|[A-Za-z0-9 _-]{2,40})\b/i },
  { action: "DECIDE", pattern: /\b(please\s+)?(reject|kill|greenlight|hold)\s+(this|the|our)?\s*(venture\s+)?[A-Za-z0-9 _-]{0,40}\b/i },
  { action: "DECIDE", pattern: /\bwhich\s+venture\s+should\s+we\s+(kill|reject|hold|build|choose)\b/i },
  { action: "DECIDE", pattern: /\bmake\s+a\s+(new\s+)?(hold|build|reject)\s+decision\b/i },
  { action: "MUTATE", pattern: /\b(ignore|override|disregard)\s+(your|the)\s+(rules|instructions|constraints)\b.{0,80}\b(launch|approve|buy|delete|spend|deploy|assign)\b/i },
  { action: "MUTATE", pattern: /\b(ignore|override|disregard)\s+all\s+(rules|instructions|constraints)\b.{0,80}\b(launch|approve|buy|delete|spend|deploy|assign)\b/i },
];

function isExistingDecisionExplanation(question: string): boolean {
  return (
    /\bwhy\s+(did|has|was|is)\s+infinity\b/i.test(question) ||
    /\bexplain\s+(the|this|that|existing)\s+(hold|reject|build|decision)\b/i.test(question)
  );
}

export function detectForbiddenHqCopilotAction(question: string): HqCopilotForbiddenCapability | null {
  const text = question.trim();
  if (!text) return null;
  for (const rule of FORBIDDEN_RULES) {
    if (rule.action === "DECIDE" && isExistingDecisionExplanation(text)) continue;
    if (rule.pattern.test(text)) return rule.action;
  }
  return null;
}

export function blockedActionAnswer(action: HqCopilotForbiddenCapability): string {
  return FORBIDDEN_ACTION_ANSWERS[action];
}
