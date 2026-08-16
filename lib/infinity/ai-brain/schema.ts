import { createHash } from "node:crypto";
import {
  AI_BRAIN_ACTION_TYPES,
  AI_BRAIN_ALLOWED_CAPABILITIES,
  AI_BRAIN_LIMITS,
  AI_BRAIN_MISSION_PRIORITIES,
  AI_BRAIN_MISSION_TYPES,
  AI_BRAIN_OBJECTIVE_TYPES,
  AI_BRAIN_RISK_LEVELS,
  AI_BRAIN_SCHEMA_VERSION,
} from "./constants";
import type {
  AiBrainCandidateAction,
  AiBrainMissionProposal,
  AiBrainStructuredOutput,
} from "./types";

const FORBIDDEN_EXECUTION_PATTERNS = [
  /\bgithub\b/i,
  /\bvercel\b/i,
  /\bdeploy\b/i,
  /\bpayment\b/i,
  /\bdomain\b/i,
  /\bemail campaign\b/i,
  /\bsocial post\b/i,
  /\bexternal action gateway\b/i,
  /\bexecute_external\b/i,
  /\bmutate\b/i,
  /\bsupabase insert\b/i,
];

function isConfidence(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 100;
}

function isNonNegativeCost(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value >= 0 && value <= 1_000_000;
}

function stringArray(value: unknown, max: number, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length (${max}).`);
  }
  const items = value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
  if (items.length !== value.length) {
    throw new Error(`${field} must contain non-empty strings.`);
  }
  return items;
}

function assertNoPromptInjection(text: string, field: string): void {
  for (const pattern of FORBIDDEN_EXECUTION_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`${field} contains forbidden execution instruction pattern.`);
    }
  }
}

function validateCandidateAction(entry: unknown, index: number): AiBrainCandidateAction {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new Error(`candidateActions[${index}] must be an object.`);
  }

  const action = entry as Record<string, unknown>;
  const actionType = action.actionType ?? action.action_type;

  if (
    typeof actionType !== "string" ||
    !(AI_BRAIN_ACTION_TYPES as readonly string[]).includes(actionType)
  ) {
    throw new Error(`candidateActions[${index}].actionType is unsupported.`);
  }

  if (!isConfidence(action.confidence)) {
    throw new Error(`candidateActions[${index}].confidence must be 0-100.`);
  }

  if (!isNonNegativeCost(action.estimatedCost ?? action.estimated_cost)) {
    throw new Error(`candidateActions[${index}].estimatedCost must be a non-negative number.`);
  }

  const riskLevel = action.riskLevel ?? action.risk_level;
  if (
    typeof riskLevel !== "string" ||
    !(AI_BRAIN_RISK_LEVELS as readonly string[]).includes(riskLevel)
  ) {
    throw new Error(`candidateActions[${index}].riskLevel is invalid.`);
  }

  const description = String(action.description ?? "");
  const reason = String(action.reason ?? "");
  assertNoPromptInjection(description, `candidateActions[${index}].description`);
  assertNoPromptInjection(reason, `candidateActions[${index}].reason`);

  const requiredCapabilities = stringArray(
    action.requiredCapabilities ?? action.required_capabilities ?? [],
    AI_BRAIN_LIMITS.maxDependencies,
    `candidateActions[${index}].requiredCapabilities`,
  );

  for (const capability of requiredCapabilities) {
    if (!(AI_BRAIN_ALLOWED_CAPABILITIES as readonly string[]).includes(capability)) {
      throw new Error(`Unsupported capability request: ${capability}`);
    }
  }

  return {
    actionId: String(action.actionId ?? action.action_id ?? `action_${index + 1}`),
    actionType: actionType as AiBrainCandidateAction["actionType"],
    description,
    reason,
    expectedValue: String(action.expectedValue ?? action.expected_value ?? ""),
    estimatedCost: (action.estimatedCost ?? action.estimated_cost) as number,
    riskLevel: riskLevel as AiBrainCandidateAction["riskLevel"],
    confidence: action.confidence as number,
    dependencies: stringArray(
      action.dependencies ?? [],
      AI_BRAIN_LIMITS.maxDependencies,
      `candidateActions[${index}].dependencies`,
    ),
    requiredCapabilities,
  };
}

function validateMissionProposal(entry: unknown): AiBrainMissionProposal {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new Error("missionProposal must be an object.");
  }

  const proposal = entry as Record<string, unknown>;
  const missionType = proposal.missionType ?? proposal.mission_type;

  if (
    typeof missionType !== "string" ||
    !(AI_BRAIN_MISSION_TYPES as readonly string[]).includes(missionType)
  ) {
    throw new Error("missionProposal.missionType is unsupported.");
  }

  const priority = proposal.priority;
  if (
    typeof priority !== "string" ||
    !(AI_BRAIN_MISSION_PRIORITIES as readonly string[]).includes(priority)
  ) {
    throw new Error("missionProposal.priority is invalid.");
  }

  const missionTitle = String(proposal.missionTitle ?? proposal.mission_title ?? "");
  const missionObjective = String(proposal.missionObjective ?? proposal.mission_objective ?? "");

  if (missionTitle.trim().length === 0 || missionTitle.length > 200) {
    throw new Error("missionProposal.missionTitle is required and must be <= 200 chars.");
  }

  if (missionObjective.trim().length === 0 || missionObjective.length > AI_BRAIN_LIMITS.maxDescriptionLength) {
    throw new Error("missionProposal.missionObjective is required and within size limits.");
  }

  assertNoPromptInjection(missionTitle, "missionProposal.missionTitle");
  assertNoPromptInjection(missionObjective, "missionProposal.missionObjective");

  return {
    missionType: missionType as AiBrainMissionProposal["missionType"],
    missionTitle,
    missionObjective,
    priority: priority as AiBrainMissionProposal["priority"],
    successCriteria: stringArray(
      proposal.successCriteria ?? proposal.success_criteria ?? [],
      AI_BRAIN_LIMITS.maxSuccessCriteria,
      "missionProposal.successCriteria",
    ),
    constraints: stringArray(
      proposal.constraints ?? [],
      AI_BRAIN_LIMITS.maxConstraints,
      "missionProposal.constraints",
    ),
    proposedSteps: stringArray(
      proposal.proposedSteps ?? proposal.proposed_steps ?? [],
      AI_BRAIN_LIMITS.maxProposedSteps,
      "missionProposal.proposedSteps",
    ),
  };
}

export function validateAiBrainStructuredOutput(value: unknown): AiBrainStructuredOutput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Structured reasoning output must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (record.schemaVersion !== AI_BRAIN_SCHEMA_VERSION) {
    throw new Error("Structured reasoning schemaVersion mismatch.");
  }

  const objectiveType = record.objectiveType ?? record.objective_type;
  if (
    typeof objectiveType !== "string" ||
    !(AI_BRAIN_OBJECTIVE_TYPES as readonly string[]).includes(objectiveType)
  ) {
    throw new Error("objectiveType is unsupported.");
  }

  const summary = String(record.summary ?? "");
  if (summary.trim().length === 0 || summary.length > AI_BRAIN_LIMITS.maxSummaryLength) {
    throw new Error("summary is required and must be within size limits.");
  }

  const observations = stringArray(record.observations ?? [], AI_BRAIN_LIMITS.maxObservations, "observations");
  const assumptions = stringArray(record.assumptions ?? [], AI_BRAIN_LIMITS.maxAssumptions, "assumptions");
  const unknowns = stringArray(record.unknowns ?? [], AI_BRAIN_LIMITS.maxUnknowns, "unknowns");

  const candidateActionsRaw: unknown[] = Array.isArray(record.candidateActions ?? record.candidate_actions)
    ? ((record.candidateActions ?? record.candidate_actions) as unknown[])
    : [];

  if (candidateActionsRaw.length > AI_BRAIN_LIMITS.maxCandidateActions) {
    throw new Error("candidateActions exceeds maximum length.");
  }

  const candidateActions = candidateActionsRaw.map((entry: unknown, index: number) =>
    validateCandidateAction(entry, index),
  );

  const recommendedAction = String(record.recommendedAction ?? record.recommended_action ?? "");
  if (recommendedAction.trim().length === 0) {
    throw new Error("recommendedAction is required.");
  }

  const candidateIds = new Set(candidateActions.map((action) => action.actionId));
  if (!candidateIds.has(recommendedAction)) {
    throw new Error("recommendedAction must reference a candidate action_id.");
  }

  const alternativeActions = stringArray(
    record.alternativeActions ?? record.alternative_actions ?? [],
    AI_BRAIN_LIMITS.maxAlternativeActions,
    "alternativeActions",
  );

  for (const alt of alternativeActions) {
    if (!candidateIds.has(alt)) {
      throw new Error(`alternativeActions contains unknown action_id: ${alt}`);
    }
  }

  if (typeof record.shouldAct !== "boolean") {
    throw new Error("shouldAct must be boolean.");
  }

  if (typeof record.requiresMoreInformation !== "boolean") {
    throw new Error("requiresMoreInformation must be boolean.");
  }

  const missionProposal = validateMissionProposal(record.missionProposal ?? record.mission_proposal);

  return {
    schemaVersion: AI_BRAIN_SCHEMA_VERSION,
    objective: String(record.objective ?? ""),
    objectiveType: objectiveType as AiBrainStructuredOutput["objectiveType"],
    summary,
    observations,
    assumptions,
    unknowns,
    candidateActions,
    recommendedAction,
    alternativeActions,
    shouldAct: record.shouldAct,
    requiresMoreInformation: record.requiresMoreInformation,
    missionProposal,
  };
}

export function parseAiBrainStructuredJson(raw: string): AiBrainStructuredOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed JSON response from reasoning provider.");
  }

  return validateAiBrainStructuredOutput(parsed);
}

export function hashReasoningInput(input: {
  objective: string;
  objectiveType: string;
  systemInstructions: string;
  providerId: string;
  modelId: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        objective: input.objective,
        objectiveType: input.objectiveType,
        systemInstructions: input.systemInstructions,
        providerId: input.providerId,
        modelId: input.modelId,
        schemaVersion: AI_BRAIN_SCHEMA_VERSION,
      }),
    )
    .digest("hex");
}

export function aiBrainReasoningJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "objective",
      "objectiveType",
      "summary",
      "observations",
      "assumptions",
      "unknowns",
      "candidateActions",
      "recommendedAction",
      "alternativeActions",
      "shouldAct",
      "requiresMoreInformation",
      "missionProposal",
    ],
    properties: {
      schemaVersion: { type: "string", const: AI_BRAIN_SCHEMA_VERSION },
      objective: { type: "string" },
      objectiveType: { type: "string", enum: [...AI_BRAIN_OBJECTIVE_TYPES] },
      summary: { type: "string" },
      observations: { type: "array", items: { type: "string" } },
      assumptions: { type: "array", items: { type: "string" } },
      unknowns: { type: "array", items: { type: "string" } },
      candidateActions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "actionId",
            "actionType",
            "description",
            "reason",
            "expectedValue",
            "estimatedCost",
            "riskLevel",
            "confidence",
            "dependencies",
            "requiredCapabilities",
          ],
          properties: {
            actionId: { type: "string" },
            actionType: { type: "string", enum: [...AI_BRAIN_ACTION_TYPES] },
            description: { type: "string" },
            reason: { type: "string" },
            expectedValue: { type: "string" },
            estimatedCost: { type: "number" },
            riskLevel: { type: "string", enum: [...AI_BRAIN_RISK_LEVELS] },
            confidence: { type: "number" },
            dependencies: { type: "array", items: { type: "string" } },
            requiredCapabilities: { type: "array", items: { type: "string" } },
          },
        },
      },
      recommendedAction: { type: "string" },
      alternativeActions: { type: "array", items: { type: "string" } },
      shouldAct: { type: "boolean" },
      requiresMoreInformation: { type: "boolean" },
      missionProposal: {
        type: "object",
        additionalProperties: false,
        required: [
          "missionType",
          "missionTitle",
          "missionObjective",
          "priority",
          "successCriteria",
          "constraints",
          "proposedSteps",
        ],
        properties: {
          missionType: { type: "string", enum: [...AI_BRAIN_MISSION_TYPES] },
          missionTitle: { type: "string" },
          missionObjective: { type: "string" },
          priority: { type: "string", enum: [...AI_BRAIN_MISSION_PRIORITIES] },
          successCriteria: { type: "array", items: { type: "string" } },
          constraints: { type: "array", items: { type: "string" } },
          proposedSteps: { type: "array", items: { type: "string" } },
        },
      },
    },
  };
}
