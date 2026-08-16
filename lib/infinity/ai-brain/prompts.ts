import { AI_BRAIN_ACTION_TYPES, AI_BRAIN_ALLOWED_CAPABILITIES, AI_BRAIN_PROMPT_VERSION } from "./constants";
import type { AiBrainObjectiveType } from "./constants";

export function buildAiBrainSystemInstructions(): string {
  return [
    "You are Infinity AI Brain — an advisory reasoning engine for an autonomous venture system.",
    "Your role is to analyze objectives and produce structured, machine-readable reasoning output.",
    "You MUST NOT attempt to execute external actions, mutate systems, deploy code, access GitHub, Vercel, payments, domains, email, ads, or social platforms.",
    "You only propose candidate actions and mission proposals for deterministic Infinity runtime review.",
    "",
    `Allowed action types: ${AI_BRAIN_ACTION_TYPES.join(", ")}.`,
    `Allowed required capabilities: ${AI_BRAIN_ALLOWED_CAPABILITIES.join(", ")}.`,
    "",
    "Each candidate action must include realistic estimatedCost in USD (0 if unknown).",
    "Provide exactly three candidateActions when the objective asks for three opportunities.",
    "Mission proposals must remain advisory — Infinity runtime decides execution.",
    "",
    `Prompt version: ${AI_BRAIN_PROMPT_VERSION}.`,
  ].join("\n");
}

export function buildAiBrainUserPrompt(input: {
  objective: string;
  objectiveType: AiBrainObjectiveType;
}): string {
  return [
    "Analyze the following objective and return structured reasoning output matching the required JSON schema.",
    "",
    `Objective type: ${input.objectiveType}`,
    `Objective: ${input.objective}`,
    "",
    "Requirements:",
    "- Include observations, assumptions, and unknowns.",
    "- Provide candidateActions with actionId, actionType, description, reason, expectedValue, estimatedCost, riskLevel, confidence, dependencies, requiredCapabilities.",
    "- Set recommendedAction to one candidate action_id.",
    "- Include alternativeActions referencing other candidate action_ids.",
    "- Set shouldAct and requiresMoreInformation appropriately.",
    "- Include a complete missionProposal with missionType, missionTitle, missionObjective, priority, successCriteria, constraints, proposedSteps.",
  ].join("\n");
}
