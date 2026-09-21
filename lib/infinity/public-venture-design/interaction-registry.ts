import { PUBLIC_VENTURE_INTERACTION_REGISTRY } from "./constants";
import type { InteractionType } from "./types";

export type InteractionRegistryEntry = {
  interactionType: InteractionType;
  reusable: true;
  reducedMotionSafe: boolean;
  purpose: string;
};

const REGISTRY: Record<InteractionType, InteractionRegistryEntry> = {
  CTA_HOVER: { interactionType: "CTA_HOVER", reusable: true, reducedMotionSafe: true, purpose: "Clarify the primary action" },
  CARD_DEPTH: { interactionType: "CARD_DEPTH", reusable: true, reducedMotionSafe: true, purpose: "Light hover depth only" },
  TAB_SWITCHER: { interactionType: "TAB_SWITCHER", reusable: true, reducedMotionSafe: true, purpose: "Compare views without extra pages" },
  PRICING_SELECTION: { interactionType: "PRICING_SELECTION", reusable: true, reducedMotionSafe: true, purpose: "Record pricing interest" },
  COMPARISON_TOGGLE: { interactionType: "COMPARISON_TOGGLE", reusable: true, reducedMotionSafe: true, purpose: "Switch lease or plan views" },
  CHART_HIGHLIGHT: { interactionType: "CHART_HIGHLIGHT", reusable: true, reducedMotionSafe: true, purpose: "Focus one series" },
  SCROLL_REVEAL: { interactionType: "SCROLL_REVEAL", reusable: true, reducedMotionSafe: true, purpose: "Quiet section entrance" },
  PRODUCT_DEMO_STEP: { interactionType: "PRODUCT_DEMO_STEP", reusable: true, reducedMotionSafe: true, purpose: "Step the proposed workflow" },
};

export function publicVentureInteractionRegistry(): typeof REGISTRY {
  void PUBLIC_VENTURE_INTERACTION_REGISTRY;
  return REGISTRY;
}
