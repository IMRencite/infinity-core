import type { NamedOutboundLoopGate } from "@/lib/infinity/production-outbound/closed-loop";
import type { DailyImprovementCandidate, ImprovementRollbackRecord, ImprovementRisk } from "./types";

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

const HIGH_RISK_BLOCKS = [
  "money movement",
  "pricing change",
  "security",
  "auth",
  "legal",
  "compliance",
  "suppression",
  "destructive migration",
  "data deletion",
  "autonomy permission",
  "financial commitment",
];

export function classifyImprovementRisk(input: {
  money_movement?: boolean;
  pricing_change?: boolean;
  security_auth?: boolean;
  legal_compliance?: boolean;
  suppression_change?: boolean;
  autonomy_expansion?: boolean;
  destructive_migration?: boolean;
  high_volume_outreach?: boolean;
  new_automation?: boolean;
  scoring_change?: boolean;
  copy_or_reporting?: boolean;
}): ImprovementRisk {
  if (
    input.money_movement
    || input.pricing_change
    || input.security_auth
    || input.legal_compliance
    || input.suppression_change
    || input.autonomy_expansion
    || input.destructive_migration
    || input.high_volume_outreach
  ) return "HIGH_RISK";
  if (input.new_automation || input.scoring_change) return "MEDIUM_RISK";
  return "LOW_RISK";
}

export function evaluateDailyImprovementSafetyGate(input: {
  candidate: DailyImprovementCandidate;
  evidence_sufficient: boolean;
  rollback_exists: boolean;
  auto_apply: boolean;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  const text = `${input.candidate.gap} ${input.candidate.hypothesis} ${input.candidate.expected_benefit}`.toLowerCase();
  if (!input.evidence_sufficient) reasons.push("INSUFFICIENT_EVIDENCE");
  if (input.auto_apply && !input.rollback_exists) reasons.push("NO_ROLLBACK");
  if (input.candidate.risk === "HIGH_RISK" && input.auto_apply) reasons.push("HIGH_RISK_AUTO_APPLY_BLOCKED");
  if (input.auto_apply && HIGH_RISK_BLOCKS.some((row) => text.includes(row))) reasons.push("PROTECTED_SURFACE");
  if (input.candidate.approval_requirement === "FOUNDER" && input.auto_apply) reasons.push("FOUNDER_APPROVAL_REQUIRED");
  return named("DailyImprovementSafetyGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["SAFE_TO_PROCEED"]);
}

export function evaluateDailyImprovementRollbackGate(input: {
  applied: boolean;
  rollback: ImprovementRollbackRecord | null;
}): NamedOutboundLoopGate {
  if (!input.applied) return named("DailyImprovementRollbackGate", "PASS", ["NOT_APPLIED"]);
  if (!input.rollback) return named("DailyImprovementRollbackGate", "FAIL", ["ROLLBACK_MISSING"]);
  const complete = Boolean(input.rollback.previous_state && input.rollback.new_state && input.rollback.rollback_action);
  return named("DailyImprovementRollbackGate", complete ? "PASS" : "FAIL", complete ? ["ROLLBACK_RECORDED"] : ["ROLLBACK_INCOMPLETE"]);
}

export function evaluateDailyImprovementLineageGate(input: {
  what_changed: string;
  why: string;
  evidence: string[];
  approved_by: string;
  before: string;
  after: string;
}): NamedOutboundLoopGate {
  const reasons: string[] = [];
  if (!input.what_changed.trim()) reasons.push("CHANGE_MISSING");
  if (!input.why.trim()) reasons.push("WHY_MISSING");
  if (!input.evidence.length) reasons.push("EVIDENCE_MISSING");
  if (!input.approved_by.trim()) reasons.push("APPROVER_MISSING");
  if (!input.before.trim() || !input.after.trim()) reasons.push("STATE_LINEAGE_MISSING");
  return named("DailyImprovementLineageGate", reasons.length ? "FAIL" : "PASS", reasons.length ? reasons : ["LINEAGE_COMPLETE"]);
}

export function ownerForSystem(system: DailyImprovementCandidate["system"]): DailyImprovementCandidate["owner"] {
  if (system === "Sales") return "Sales";
  if (system === "Organic Growth" || system === "Content Quality" || system === "Schema / SEO / GEO") return "Organic Growth";
  if (system === "Prospect Intelligence") return "Prospect Intelligence";
  if (system === "Design Core / Creative") return "Design Core";
  if (system === "Backlink Intelligence") return "Backlink Intelligence";
  if (system === "Communication Runtime" || system === "Schedulers" || system === "Provider Integrations") return "Systems Architect / Runtime";
  if (system === "Founder HQ") return "HQ";
  if (system === "Public Operations") return "Public Operations";
  if (system === "Build Factory") return "Build Factory";
  if (system === "QC Gates") return "QC";
  return "Performance Intelligence";
}
