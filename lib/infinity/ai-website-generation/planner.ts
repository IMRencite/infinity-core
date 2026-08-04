import { createHash } from "node:crypto";
import type { AiWebsiteGenerationMode } from "./constants";
import { AI_WEBSITE_PROMPT_VERSION, AI_WEBSITE_GENERATION_SCHEMA_VERSION } from "./constants";

export function buildAiWebsitePlanIdempotencyKey(input: {
  organizationId: string;
  missionId: string;
  ventureBlueprintId: string;
  buildId: string;
  buildSpecificationVersion: string;
  contextHash: string;
  promptVersion: string;
  schemaVersion: string;
  provider: string;
  model: string;
  mode: AiWebsiteGenerationMode;
}): string {
  return [
    "ai-website-plan",
    input.organizationId,
    input.missionId,
    input.ventureBlueprintId,
    input.buildId,
    input.buildSpecificationVersion,
    input.contextHash,
    input.promptVersion,
    input.schemaVersion,
    input.provider,
    input.model,
    input.mode,
  ].join(":");
}

export function hashPlanOutput(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function defaultPlanVersion(): string {
  return "1";
}

export function nextPlanVersion(current: string): string {
  const n = Number.parseInt(current, 10);
  return Number.isFinite(n) ? String(n + 1) : "2";
}

export { AI_WEBSITE_PROMPT_VERSION, AI_WEBSITE_GENERATION_SCHEMA_VERSION };
