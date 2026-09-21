import {
  CUSTOMER_FACING_PRODUCTION_QUALITY_GATE,
  SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY,
  type NamedGate,
  type ProductionQualityEvidence,
} from "./contract";

const REQUIRED: Array<keyof Pick<
  ProductionQualityEvidence,
  | "rendered"
  | "interaction"
  | "console"
  | "network"
  | "navigation"
  | "responsive"
  | "accessibility"
  | "workflow"
  | "production_readiness"
>> = [
  "rendered",
  "interaction",
  "console",
  "network",
  "navigation",
  "responsive",
  "accessibility",
  "workflow",
  "production_readiness",
];

export function evaluateCustomerFacingProductionQualityGate(evidence: ProductionQualityEvidence): NamedGate {
  const reasons: string[] = [];
  if (evidence.evidence_level === "SOURCE_ONLY") {
    reasons.push(SOURCE_ONLY_INSUFFICIENT_FOR_PRODUCTION_QUALITY);
  }
  if (evidence.typecheck === "PASS" && evidence.production_build === "PASS" && evidence.rendered?.result === "FAIL") {
    reasons.push("BUILD_PASS_DOES_NOT_OVERRIDE_BROWSER_FAILURE");
  }
  for (const key of REQUIRED) {
    const gate = evidence[key];
    if (!gate) {
      reasons.push(`MISSING_${key.toUpperCase()}_EVIDENCE`);
      continue;
    }
    if (gate.result === "FAIL") reasons.push(`${gate.gate}:FAIL`);
  }
  return {
    gate: CUSTOMER_FACING_PRODUCTION_QUALITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    evidence_level: evidence.evidence_level,
  };
}
