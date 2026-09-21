import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import { CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID, CRE_CONTEXT_RICH_CHALLENGER_V1 } from "./cre-context-rich-challenger-cohort";
import type { ContextRichVariantId } from "./context-rich-consultative-outreach-optimization";

export const CRE_CONTEXT_RICH_CHALLENGER_STATE_FILE =
  ".infinity/market-validation/cre-context-rich-challenger-state.json" as const;

export type ChallengerTrackedTarget = {
  prospectId: string;
  name: string;
  email: string;
  conversationId: string;
  threadId: string;
};

export type ChallengerSendRecord = {
  prospectId: string;
  name: string;
  email: string;
  personaSlot: "PRIMARY" | "SECONDARY";
  variantId: ContextRichVariantId;
  subject: string;
  question: string;
  wordCount: number;
  attemptId: string | null;
  conversationId: string | null;
  providerMessageId: string | null;
  providerThreadId: string | null;
  providerResult: "PROVIDER_ACCEPTED" | "FAILED" | "NOT_SENT";
  deliveryState: "DELIVERY_UNKNOWN" | "NOT_SENT";
  strategy: "CONTEXT_RICH_CONSULTATIVE";
  version: "V1";
};

export type ContextRichChallengerState = {
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  cohortId: typeof CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID;
  cohortLabel: typeof CRE_CONTEXT_RICH_CHALLENGER_V1;
  strategy: "CONTEXT_RICH_CONSULTATIVE";
  version: "V1";
  authorization: "GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED";
  authorizationConsumed: boolean;
  nextState:
    | "CRE_CONTEXT_RICH_CHALLENGER_OBSERVING"
    | "CRE_CONTEXT_RICH_CHALLENGER_OBSERVING_WITH_EVIDENCE"
    | "CRE_CONTEXT_RICH_CHALLENGER_DECISION_READY"
    | "CRE_CONTEXT_RICH_CHALLENGER_NOT_EXECUTED"
    | "CRE_CONTEXT_RICH_CHALLENGER_EXECUTION_FAILED";
  startedAt: string;
  updatedAt: string;
  sends: ChallengerSendRecord[];
  tracked: ChallengerTrackedTarget[];
  rejected: Array<{ name: string; reason: string }>;
  providerWrites: number;
};

let memory: ContextRichChallengerState | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_CHALLENGER_PERSIST !== "1") return false;
  return true;
}

export function resetContextRichChallengerState(): void {
  memory = null;
}

export function emptyChallengerState(now = new Date()): ContextRichChallengerState {
  return {
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    cohortId: CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID,
    cohortLabel: CRE_CONTEXT_RICH_CHALLENGER_V1,
    strategy: "CONTEXT_RICH_CONSULTATIVE",
    version: "V1",
    authorization: "GOVERNED_CRE_CONTEXT_RICH_OUTREACH_EXECUTION_REQUIRED",
    authorizationConsumed: false,
    nextState: "CRE_CONTEXT_RICH_CHALLENGER_NOT_EXECUTED",
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sends: [],
    tracked: [],
    rejected: [],
    providerWrites: 0,
  };
}

export function readContextRichChallengerState(): ContextRichChallengerState | null {
  if (memory) return memory;
  if (!persistEnabled() || !existsSync(CRE_CONTEXT_RICH_CHALLENGER_STATE_FILE)) return null;
  try {
    memory = JSON.parse(readFileSync(CRE_CONTEXT_RICH_CHALLENGER_STATE_FILE, "utf8")) as ContextRichChallengerState;
    return memory;
  } catch {
    return null;
  }
}

export function writeContextRichChallengerState(state: ContextRichChallengerState): ContextRichChallengerState {
  memory = state;
  if (persistEnabled()) {
    mkdirSync(dirname(CRE_CONTEXT_RICH_CHALLENGER_STATE_FILE), { recursive: true });
    writeFileSync(CRE_CONTEXT_RICH_CHALLENGER_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  }
  return state;
}
