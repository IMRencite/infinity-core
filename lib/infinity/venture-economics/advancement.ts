import { evaluateVentureCommercialIntelligenceGate, evaluateVentureCompetitorResearchGate, evaluateVentureEconomicsReadinessGate, missingEconomicsBlocksAdvancement } from "./gates";
import { readVentureEconomics } from "./persist";
import type { NamedGateResult } from "./types";

export type AdvancementStage = "BUILD" | "PRODUCTION_SYSTEM_BUILD" | "COMMERCIALIZATION" | "PAYMENT_ACTIVATION" | "PUBLIC_LAUNCH";

export function evaluateAdvancementEconomicsGate(input: {
  ventureId: string;
  stage: AdvancementStage;
}): NamedGateResult & { blocked: boolean } {
  const record = readVentureEconomics(input.ventureId);
  const competitor = evaluateVentureCompetitorResearchGate(record);
  const readiness = evaluateVentureEconomicsReadinessGate(record);
  const commercial = evaluateVentureCommercialIntelligenceGate(record);
  const reasons = [
    ...(competitor.result === "FAIL" ? competitor.reasons : []),
    ...(readiness.result === "FAIL" ? readiness.reasons : []),
    ...(commercial.result === "FAIL" ? commercial.reasons : []),
  ];
  const blocked = missingEconomicsBlocksAdvancement(record);
  return {
    gate: `VentureAdvancementEconomics:${input.stage}`,
    result: blocked ? "FAIL" : "PASS",
    reasons: blocked ? (reasons.length ? reasons : ["MISSING_ECONOMICS"]) : [],
    blocked,
  };
}

export function economicsBlockBuildAuthorization(input: {
  placeholder: boolean;
  known: boolean;
  ventureId?: string | null;
}): { blocked: boolean; reasons: string[] } {
  if (input.placeholder || !input.known) {
    return {
      blocked: true,
      reasons: [input.placeholder ? "PLACEHOLDER_ECONOMICS" : "UNIT_ECONOMICS_UNKNOWN"],
    };
  }
  if (input.ventureId) {
    const gate = evaluateAdvancementEconomicsGate({ ventureId: input.ventureId, stage: "BUILD" });
    if (gate.blocked) return { blocked: true, reasons: gate.reasons };
  }
  return { blocked: false, reasons: [] };
}
