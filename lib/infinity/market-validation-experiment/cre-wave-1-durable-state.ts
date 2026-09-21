import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { restoreCommunicationAttempt } from "@/lib/infinity/communication-provider";
import type { CommunicationAttempt } from "@/lib/infinity/communication-provider/types";
import type { ProspectVerificationRecord } from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";
import { markPersistedProspectCooldown } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { LOCKED_CRE_EXPERIMENT_ID } from "./constants";

export const CRE_WAVE_1_DURABLE_STATE_FILE = ".infinity/market-validation/cre-wave-1-outreach-state.json" as const;

export type Wave1DurableState = {
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  purpose: "MARKET_VALIDATION_OUTREACH";
  channel: "bounded_professional_outreach";
  updatedAt: string;
  attempts: CommunicationAttempt[];
  verifications: ProspectVerificationRecord[];
  cooldowns: Array<{ prospectId: string; cooldownUntil: string; source: "wave_1" }>;
  conversationMetadata: Array<{
    prospectId: string;
    strategyProfile: "CONSULTATIVE_DISCOVERY";
    conversationStage: string;
    questionObjective: string;
    knownCurrentProcess: "UNKNOWN";
    knownFriction: "UNKNOWN";
    knownImpact: "UNKNOWN";
    solutionRelevance: "UNKNOWN";
    pricingStageReached: "NO";
  }>;
};

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_WAVE1_PERSIST !== "1") return false;
  return true;
}

function secretLike(serialized: string): boolean {
  return /ya29\.|GOCSPX-|1\/\/|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(serialized);
}

export function readWave1DurableState(file = CRE_WAVE_1_DURABLE_STATE_FILE): Wave1DurableState | null {
  if (!persistEnabled()) return null;
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Wave1DurableState;
    if (!parsed || parsed.experimentId !== LOCKED_CRE_EXPERIMENT_ID) return null;
    if (secretLike(JSON.stringify(parsed))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWave1DurableState(state: Wave1DurableState, file = CRE_WAVE_1_DURABLE_STATE_FILE): void {
  if (!persistEnabled()) return;
  const serialized = JSON.stringify(state);
  if (secretLike(serialized)) throw new Error("Secret-like content blocked from Wave 1 persistence");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${serialized}\n`, "utf8");
}

export function hydrateWave1DurableState(file = CRE_WAVE_1_DURABLE_STATE_FILE): Wave1DurableState | null {
  const state = readWave1DurableState(file);
  if (!state) return null;
  for (const attempt of state.attempts) restoreCommunicationAttempt(attempt);
  for (const cooldown of state.cooldowns) markPersistedProspectCooldown(cooldown.prospectId, cooldown.cooldownUntil);
  return state;
}

export function persistWave1OutreachSnapshot(input: {
  attempts: CommunicationAttempt[];
  verifications: ProspectVerificationRecord[];
  recipients: Array<{ prospectId: string; providerResult: string; message: { strategy: { conversationStage: string; questionObjective: string } } | null }>;
  cooldownUntilByProspect: Record<string, string>;
  now?: Date;
}): Wave1DurableState {
  const state: Wave1DurableState = {
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    purpose: "MARKET_VALIDATION_OUTREACH",
    channel: "bounded_professional_outreach",
    updatedAt: (input.now ?? new Date()).toISOString(),
    attempts: input.attempts.filter((attempt) =>
      Boolean(attempt.prospectId) && attempt.toAddress !== "htunity@gmail.com",
    ),
    verifications: input.verifications,
    cooldowns: Object.entries(input.cooldownUntilByProspect).map(([prospectId, cooldownUntil]) => ({
      prospectId,
      cooldownUntil,
      source: "wave_1" as const,
    })),
    conversationMetadata: input.recipients
      .filter((row) => row.providerResult === "PROVIDER_ACCEPTED" && row.message)
      .map((row) => ({
        prospectId: row.prospectId,
        strategyProfile: "CONSULTATIVE_DISCOVERY" as const,
        conversationStage: row.message!.strategy.conversationStage,
        questionObjective: row.message!.strategy.questionObjective,
        knownCurrentProcess: "UNKNOWN" as const,
        knownFriction: "UNKNOWN" as const,
        knownImpact: "UNKNOWN" as const,
        solutionRelevance: "UNKNOWN" as const,
        pricingStageReached: "NO" as const,
      })),
  };
  writeWave1DurableState(state);
  return state;
}
