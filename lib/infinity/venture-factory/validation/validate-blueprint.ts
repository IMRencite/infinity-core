import { VENTURE_TEMPLATE_TYPES } from "../constants";
import { VentureFactoryError } from "../errors";
import type { VentureBlueprint } from "../types/blueprint";

export function validateVentureBlueprint(blueprint: VentureBlueprint): void {
  if (!blueprint.id?.trim()) {
    throw new VentureFactoryError("Blueprint id is required.", "invalid_blueprint");
  }

  if (!(VENTURE_TEMPLATE_TYPES as readonly string[]).includes(blueprint.ventureType)) {
    throw new VentureFactoryError(
      `Unsupported venture type: ${blueprint.ventureType}`,
      "unsupported_venture_type",
    );
  }

  const requiredStrings: Array<[keyof VentureBlueprint, string]> = [
    ["name", "name"],
    ["description", "description"],
    ["targetAudience", "targetAudience"],
    ["customerPersona", "customerPersona"],
    ["valueProposition", "valueProposition"],
    ["revenueModel", "revenueModel"],
    ["estimatedTimeline", "estimatedTimeline"],
    ["estimatedBudget", "estimatedBudget"],
    ["expectedROI", "expectedROI"],
  ];

  for (const [field] of requiredStrings) {
    const value = blueprint[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new VentureFactoryError(`Blueprint field ${field} is required.`, "invalid_blueprint");
    }
  }

  const arrayFieldsRequired: Array<keyof VentureBlueprint> = [
    "marketingChannels",
    "requiredAssets",
    "requiredWorkers",
    "requiredContent",
  ];

  for (const field of arrayFieldsRequired) {
    const value = blueprint[field];
    if (!Array.isArray(value) || value.length === 0) {
      throw new VentureFactoryError(
        `Blueprint field ${field} must be a non-empty array.`,
        "invalid_blueprint",
      );
    }
  }

  const arrayFieldsOptional: Array<keyof VentureBlueprint> = [
    "requiredProducts",
    "requiredServices",
  ];

  for (const field of arrayFieldsOptional) {
    const value = blueprint[field];
    if (!Array.isArray(value)) {
      throw new VentureFactoryError(
        `Blueprint field ${field} must be an array.`,
        "invalid_blueprint",
      );
    }
  }

  if (blueprint.priority < 1 || blueprint.priority > 100) {
    throw new VentureFactoryError("Blueprint priority must be between 1 and 100.", "invalid_blueprint");
  }

  assertNoForbiddenExecutionHints(blueprint);
}

function assertNoForbiddenExecutionHints(blueprint: VentureBlueprint): void {
  const blob = JSON.stringify(blueprint).toLowerCase();
  const forbidden = ["deploy_now", "publish_live", "register_domain", "create_repo"];
  for (const term of forbidden) {
    if (blob.includes(term)) {
      throw new VentureFactoryError(
        `Blueprint contains forbidden execution hint: ${term}`,
        "invalid_blueprint",
      );
    }
  }
}
