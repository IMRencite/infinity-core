import {
  AI_WEBSITE_GENERATION_MODES,
  type AiWebsiteGenerationMode,
} from "./constants";

export function loadAiWebsiteGenerationMode(
  env: NodeJS.ProcessEnv = process.env,
): AiWebsiteGenerationMode {
  const raw = (env.AI_WEBSITE_GENERATION_MODE ?? "disabled").trim().toLowerCase();
  if ((AI_WEBSITE_GENERATION_MODES as readonly string[]).includes(raw)) {
    return raw as AiWebsiteGenerationMode;
  }
  return "disabled";
}

export function modeAllowsProviderNetwork(mode: AiWebsiteGenerationMode): boolean {
  return mode === "shadow" || mode === "advisory";
}

export function modeEnablesAiWebsiteTasks(mode: AiWebsiteGenerationMode): boolean {
  return mode !== "disabled";
}

export function modeAllowsTranslationToBuild(mode: AiWebsiteGenerationMode): boolean {
  return mode === "advisory" || mode === "mock";
}

export function modeUsesMockProvider(mode: AiWebsiteGenerationMode): boolean {
  return mode === "mock";
}

export function modeAllowsPlanApproval(mode: AiWebsiteGenerationMode): boolean {
  return mode === "advisory" || mode === "mock";
}
