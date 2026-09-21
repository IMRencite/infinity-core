import { ASKREVIEW_VENTURE_ID } from "@/lib/infinity/second-venture-factory/constants";
import { CRE_VENTURE_ID } from "@/lib/infinity/venture-operating-scale/constants";
import { evaluateAdvancementEconomicsGate } from "@/lib/infinity/venture-economics/advancement";
import type { BuildAuthorization, CompileInput } from "./types";

function normalizeDecision(decision: string): string {
  return decision.trim().toUpperCase();
}

/**
 * Internal BUILD is authorized only when canonical policy says BUILD and
 * buildReady is true. VALIDATE / missing evidence / economics never silently
 * become a build.
 */
export function evaluateBuildAuthorization(input: Pick<
  CompileInput,
  | "decision"
  | "buildReady"
  | "buildReadyReason"
  | "evidence"
  | "economics"
  | "policyBlocked"
  | "policyReasons"
  | "alreadyBuilding"
  | "alreadyBuilt"
  | "ventureId"
>): BuildAuthorization {
  const decision = normalizeDecision(input.decision || "UNKNOWN");

  if (input.alreadyBuilt) {
    return {
      result: "ALREADY_BUILT",
      buildReady: input.buildReady,
      decision,
      blocker: "A validated production artifact already exists.",
      nextGovernedStep: "Evaluate deployment readiness. Do not rebuild or launch.",
      reasons: ["ALREADY_BUILT"],
    };
  }

  if (input.alreadyBuilding) {
    return {
      result: "ALREADY_BUILDING",
      buildReady: input.buildReady,
      decision,
      blocker: "An active build orchestration already exists for this venture version.",
      nextGovernedStep: "Reuse the active run. Do not start a second orchestration.",
      reasons: ["ALREADY_BUILDING"],
    };
  }

  if (input.policyBlocked) {
    return {
      result: "POLICY_BLOCKED",
      buildReady: false,
      decision,
      blocker: input.policyReasons[0] ?? "Policy blocked internal build.",
      nextGovernedStep: "Resolve policy blockers before compiling build work.",
      reasons: input.policyReasons.length ? input.policyReasons : ["POLICY_BLOCKED"],
    };
  }

  if (!input.evidence.customerPain || !input.evidence.competition || !input.evidence.research) {
    return {
      result: "EVIDENCE_BLOCKED",
      buildReady: false,
      decision,
      blocker: input.evidence.missing[0] ?? "Required customer-pain or competition evidence is missing.",
      nextGovernedStep: "Collect complaint-shaped customer pain and competition evidence.",
      reasons: input.evidence.missing.length ? input.evidence.missing : ["EVIDENCE_BLOCKED"],
    };
  }

  if (decision === "VALIDATE") {
    const reasons = ["DECISION_VALIDATE"];
    if (input.economics.placeholder || !input.economics.known) {
      reasons.push("ECONOMICS_RESEARCH_REQUIRED_BEFORE_BUILD");
    }
    return {
      result: "VALIDATION_REQUIRED",
      buildReady: false,
      decision,
      blocker: "Canonical decision is VALIDATE. Internal product BUILD is not authorized.",
      nextGovernedStep: input.economics.placeholder || !input.economics.known
        ? "Complete competitor research and unit economics before BUILD. Remain in VALIDATE."
        : "Run governed validation work. Do not execute product BUILD.",
      reasons,
    };
  }

  if (input.economics.placeholder || !input.economics.known) {
    return {
      result: "ECONOMICS_BLOCKED",
      buildReady: false,
      decision,
      blocker: input.economics.placeholder
        ? "Placeholder economics cannot authorize BUILD."
        : "Unit economics are unknown; unknown is not zero.",
      nextGovernedStep: "Complete monetization research until unit economics are numerically known.",
      reasons: [input.economics.placeholder ? "PLACEHOLDER_ECONOMICS" : "UNIT_ECONOMICS_UNKNOWN", "BUILD_BLOCKED_BY_ECONOMICS"],
    };
  }

  if (decision !== "BUILD" || !input.buildReady) {
    const next =
      decision === "VALIDATE"
        ? "Run governed validation work. Do not execute product BUILD."
        : input.buildReadyReason || "Satisfy the canonical build gate before BUILD.";
    return {
      result: "VALIDATION_REQUIRED",
      buildReady: false,
      decision,
      blocker:
        decision === "VALIDATE"
          ? "Canonical decision is VALIDATE. Internal product BUILD is not authorized."
          : input.buildReadyReason || "buildReady is false.",
      nextGovernedStep: next,
      reasons: decision === "VALIDATE" ? ["DECISION_VALIDATE"] : ["BUILD_NOT_READY", decision],
    };
  }

  if (input.ventureId === CRE_VENTURE_ID || input.ventureId === ASKREVIEW_VENTURE_ID) {
    const intelligence = evaluateAdvancementEconomicsGate({ ventureId: input.ventureId, stage: "BUILD" });
    if (intelligence.blocked) {
      return {
        result: "ECONOMICS_BLOCKED",
        buildReady: false,
        decision,
        blocker: "Empty or unresearched economics cannot authorize BUILD.",
        nextGovernedStep: "Run competitor research and persist VentureEconomicsIntelligenceContract before BUILD.",
        reasons: intelligence.reasons,
      };
    }
  }

  return {
    result: "AUTHORIZED_BUILD",
    buildReady: true,
    decision: "BUILD",
    blocker: null,
    nextGovernedStep: "Compile the executable venture plan and execute internal BUILD only.",
    reasons: ["BUILD_READY"],
  };
}

/**
 * A validation landing artifact may be authorized while canonical decision
 * remains VALIDATE. This does not set buildReady and cannot authorize a
 * full product BUILD.
 */
export function evaluateValidationArtifactAuthorization(
  input: Pick<
    CompileInput,
    | "decision"
    | "buildReady"
    | "evidence"
    | "policyBlocked"
    | "policyReasons"
    | "alreadyBuilding"
    | "alreadyBuilt"
  >,
): BuildAuthorization {
  const decision = normalizeDecision(input.decision || "UNKNOWN");

  if (input.alreadyBuilt) {
    return {
      result: "ALREADY_BUILT",
      buildReady: false,
      decision,
      blocker: "A production artifact already exists. Do not treat it as a new validation experiment.",
      nextGovernedStep: "Reuse the existing artifact or evaluate deployment readiness.",
      reasons: ["ALREADY_BUILT"],
    };
  }

  if (input.alreadyBuilding) {
    return {
      result: "ALREADY_BUILDING",
      buildReady: false,
      decision,
      blocker: "An active validation-artifact orchestration already exists.",
      nextGovernedStep: "Reuse the active run. Do not start a second artifact build.",
      reasons: ["ALREADY_BUILDING"],
    };
  }

  if (input.policyBlocked) {
    return {
      result: "POLICY_BLOCKED",
      buildReady: false,
      decision,
      blocker: input.policyReasons[0] ?? "Policy blocked the validation artifact.",
      nextGovernedStep: "Resolve policy blockers before compiling a validation landing page.",
      reasons: input.policyReasons.length ? input.policyReasons : ["POLICY_BLOCKED"],
    };
  }

  if (!input.evidence.customerPain || !input.evidence.competition || !input.evidence.research) {
    return {
      result: "EVIDENCE_BLOCKED",
      buildReady: false,
      decision,
      blocker: input.evidence.missing[0] ?? "Customer-pain or competition evidence is missing.",
      nextGovernedStep: "Collect complaint-shaped customer pain and competition evidence.",
      reasons: input.evidence.missing.length ? input.evidence.missing : ["EVIDENCE_BLOCKED"],
    };
  }

  if (decision === "REJECT" || decision === "HOLD") {
    return {
      result: "POLICY_BLOCKED",
      buildReady: false,
      decision,
      blocker: `Canonical decision is ${decision}. A public validation experiment is not authorized.`,
      nextGovernedStep: "Do not publish a validation landing page for a rejected or held candidate.",
      reasons: [`DECISION_${decision}`],
    };
  }

  if (decision === "BUILD" && input.buildReady) {
    return {
      result: "VALIDATION_REQUIRED",
      buildReady: false,
      decision,
      blocker: "Full product BUILD is the authorized path. Do not substitute a validation landing page.",
      nextGovernedStep: "Use AUTHORIZED_BUILD for the product. Validation-artifact authority is for VALIDATE only.",
      reasons: ["USE_FULL_PRODUCT_BUILD"],
    };
  }

  return {
    result: "AUTHORIZED_VALIDATION_ARTIFACT",
    buildReady: false,
    decision: "VALIDATE",
    blocker: null,
    nextGovernedStep: "Compile and build the validation landing artifact only. Do not execute full product BUILD.",
    reasons: ["VALIDATION_ARTIFACT_ALLOWED"],
  };
}
