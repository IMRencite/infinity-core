import { VENTURE_TEMPLATE_TYPES, type VentureTemplateType } from "../constants";
import {
  VENTURE_BLUEPRINT_TEMPLATES,
  type VentureBlueprintTemplate,
} from "../templates/definitions";

const customRegistry = new Map<VentureTemplateType, VentureBlueprintTemplate>();

export function registerVentureBlueprintTemplate(template: VentureBlueprintTemplate): void {
  if (!VENTURE_TEMPLATE_TYPES.includes(template.key)) {
    throw new Error(`Unsupported venture template type: ${template.key}`);
  }
  customRegistry.set(template.key, template);
}

export function getVentureBlueprintTemplate(
  key: VentureTemplateType,
): VentureBlueprintTemplate {
  return customRegistry.get(key) ?? VENTURE_BLUEPRINT_TEMPLATES[key];
}

export function listVentureBlueprintTemplates(): VentureBlueprintTemplate[] {
  return VENTURE_TEMPLATE_TYPES.map((key) => getVentureBlueprintTemplate(key));
}

export function isSupportedVentureTemplateType(value: string): value is VentureTemplateType {
  return (VENTURE_TEMPLATE_TYPES as readonly string[]).includes(value);
}

export function clearVentureBlueprintTemplateOverrides(): void {
  customRegistry.clear();
}
