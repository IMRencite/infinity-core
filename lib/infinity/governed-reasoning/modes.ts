import {
  DEFAULT_OPENAI_MODEL,
  GOVERNED_REASONING_MODES,
  type GovernedReasoningMode,
} from "./constants";

export function loadGovernedReasoningMode(
  env: NodeJS.ProcessEnv = process.env,
): GovernedReasoningMode {
  const raw = (env.AI_REASONING_MODE ?? "disabled").trim().toLowerCase();

  if ((GOVERNED_REASONING_MODES as readonly string[]).includes(raw)) {
    return raw as GovernedReasoningMode;
  }

  return "disabled";
}

export function modeAllowsProviderNetwork(mode: GovernedReasoningMode): boolean {
  return mode === "shadow" || mode === "advisory";
}

export function modeAffectsMissionDecisions(mode: GovernedReasoningMode): boolean {
  return mode === "advisory";
}

export function modeUsesMockProvider(mode: GovernedReasoningMode): boolean {
  return mode === "mock";
}

export function resolveProviderIdForMode(
  mode: GovernedReasoningMode,
  openaiConfigured: boolean,
): "mock" | "openai" | null {
  if (mode === "disabled") {
    return null;
  }

  if (mode === "mock") {
    return "mock";
  }

  if (openaiConfigured) {
    return "openai";
  }

  return null;
}

export { DEFAULT_OPENAI_MODEL };
