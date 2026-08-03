import type { CritiqueKind } from "./agent-types";
import type { AgentResult } from "./agent-results";
import type { AgentContextSnapshot } from "./agent-context";

export type CritiqueFinding = {
  kind: CritiqueKind;
  severity: "info" | "warning" | "critical";
  message: string;
  agentIds: string[];
};

export type CritiqueReport = {
  findings: CritiqueFinding[];
  advisoryOnly: true;
  binding: false;
};

export function runCritique(input: {
  kinds: CritiqueKind[];
  results: AgentResult[];
  context: AgentContextSnapshot;
}): CritiqueReport {
  const findings: CritiqueFinding[] = [];

  for (const kind of input.kinds) {
    switch (kind) {
      case "reflection":
        findings.push({
          kind,
          severity: "info",
          message: "Reflection critique recorded (deterministic).",
          agentIds: input.results.map((result) => result.agentId),
        });
        break;
      case "self_review":
        findings.push({
          kind,
          severity: "info",
          message: "Self-review placeholder for each agent output.",
          agentIds: input.results.map((result) => result.agentId),
        });
        break;
      case "peer_review":
        if (input.results.length > 1) {
          findings.push({
            kind,
            severity: "info",
            message: "Peer-review possible with multiple agent outputs.",
            agentIds: input.results.map((result) => result.agentId),
          });
        }
        break;
      case "devils_advocate":
        findings.push({
          kind,
          severity: "warning",
          message: "Devil's advocate challenge slot reserved (non-binding).",
          agentIds: input.results.map((result) => result.agentId),
        });
        break;
      case "contradiction_detection": {
        const spread =
          input.results.length > 1
            ? Math.max(...input.results.map((r) => r.confidenceScore)) -
              Math.min(...input.results.map((r) => r.confidenceScore))
            : 0;
        if (spread >= 20) {
          findings.push({
            kind,
            severity: "warning",
            message: `Potential contradiction: confidence spread ${spread.toFixed(1)}.`,
            agentIds: input.results.map((result) => result.agentId),
          });
        }
        break;
      }
      case "missing_evidence_detection":
        if (!input.context.validationRunId) {
          findings.push({
            kind,
            severity: "critical",
            message: "Missing validation run reference in orchestration context.",
            agentIds: [],
          });
        }
        break;
      case "policy_conflict_detection": {
        const misaligned = input.results.filter((result) => !result.policyAligned);
        if (misaligned.length > 0) {
          findings.push({
            kind,
            severity: "critical",
            message: `${misaligned.length} agent result(s) not policy aligned.`,
            agentIds: misaligned.map((result) => result.agentId),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    findings,
    advisoryOnly: true,
    binding: false,
  };
}
