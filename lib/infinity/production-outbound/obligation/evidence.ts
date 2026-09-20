import type { NamedOutboundLoopGate } from "../closed-loop";

export const GATE_EVIDENCE_CLASSES = ["LIVE_PROD", "SYNTHETIC_PROD", "LOCAL", "UNIT", "STATIC"] as const;
export type GateEvidenceClass = (typeof GATE_EVIDENCE_CLASSES)[number];

export type GatedEvidence = NamedOutboundLoopGate & {
  evidence_class: GateEvidenceClass;
  evidence_at: string;
  git_sha: string | null;
  deployment_id: string | null;
};

export const CRITICAL_LIVE_GATES = [
  "ProductionReleaseParityGate",
  "CommunicationRuntimeIdentityGate",
  "ObservedReleaseParityGate",
  "ExternalCommunicationObserverGate",
  "CommunicationProviderIdentityParityGate",
  "ProviderInboundCoverageGate",
  "CommunicationCutoverEpochParityGate",
] as const;

export const ALLOWED_SYNTHETIC_GATES = [
  "CommunicationNoSendCanaryGate",
  "CommunicationProviderReadCanaryGate",
  "LiveInboundShadowComposeGate",
] as const;

function named(gate: string, result: NamedOutboundLoopGate["result"], reasons: string[]): NamedOutboundLoopGate {
  return { gate, result, reasons };
}

export type EvidenceProvenance = {
  source_table?: string | null;
  writer_runtime?: string | null;
  production_alias_identity?: string | null;
  serving_deployment_id?: string | null;
  writer_deployment_id?: string | null;
  intended_sha?: string | null;
  writer_sha?: string | null;
  freshness_ms?: number;
  freshness_limit_ms?: number;
  invoked_by?: string | null;
  vitest?: boolean;
};

export function deriveEvidenceClass(input: EvidenceProvenance = {}): GateEvidenceClass {
  if (input.vitest || process.env.VITEST) return "UNIT";
  const fresh = (input.freshness_ms ?? Number.POSITIVE_INFINITY) <= (input.freshness_limit_ms ?? 11 * 60 * 1000);
  const serving = Boolean(input.serving_deployment_id)
    && input.serving_deployment_id === input.writer_deployment_id
    && Boolean(input.intended_sha)
    && input.intended_sha === input.writer_sha
    && Boolean(input.production_alias_identity)
    && fresh;
  if (serving && input.invoked_by === "cron") return "LIVE_PROD";
  if (serving && input.invoked_by === "synthetic_canary") return "SYNTHETIC_PROD";
  if (input.writer_runtime === "local" || input.source_table === "local") return "LOCAL";
  if (!input.writer_deployment_id && !input.writer_sha) return "STATIC";
  return "LOCAL";
}

export function attachEvidenceClass(
  gate: NamedOutboundLoopGate,
  _ignored: GateEvidenceClass | EvidenceProvenance = {},
  input: { now?: string; git_sha?: string | null; deployment_id?: string | null } & EvidenceProvenance = {},
): GatedEvidence {
  const provenance: EvidenceProvenance = typeof _ignored === "string"
    ? { ...input, writer_sha: input.git_sha, writer_deployment_id: input.deployment_id }
    : { ..._ignored, ...input };
  return {
    ...gate,
    evidence_class: deriveEvidenceClass(provenance),
    evidence_at: input.now ?? new Date().toISOString(),
    git_sha: input.git_sha ?? null,
    deployment_id: input.deployment_id ?? null,
  };
}

export function evaluateEvidenceProvenanceIntegrityGate(input: {
  self_declared?: boolean;
  derived: GateEvidenceClass;
}): NamedOutboundLoopGate {
  return named(
    "EvidenceProvenanceIntegrityGate",
    input.self_declared ? "FAIL" : "PASS",
    [input.derived, input.self_declared ? "SELF_DECLARED" : "DERIVED"],
  );
}

export function evaluateGateEvidenceClassIntegrity(gates: GatedEvidence[]): NamedOutboundLoopGate {
  const illegal = gates.filter((row) => {
    const critical = (CRITICAL_LIVE_GATES as readonly string[]).includes(row.gate);
    const syntheticOk = (ALLOWED_SYNTHETIC_GATES as readonly string[]).includes(row.gate);
    if (critical && row.evidence_class !== "LIVE_PROD" && !(syntheticOk && row.evidence_class === "SYNTHETIC_PROD")) {
      return row.result === "PASS";
    }
    if (row.result === "PASS" && (row.evidence_class === "LOCAL" || row.evidence_class === "UNIT" || row.evidence_class === "STATIC") && critical) {
      return true;
    }
    return false;
  });
  return named(
    "GateEvidenceClassIntegrityGate",
    illegal.length ? "FAIL" : "PASS",
    illegal.length ? illegal.map((row) => `${row.gate}:${row.evidence_class}`) : ["EVIDENCE_CLASS_OK"],
  );
}

export function readinessMayUse(evidence_class: GateEvidenceClass, gate: string): boolean {
  if (evidence_class === "LIVE_PROD") return true;
  if (evidence_class === "SYNTHETIC_PROD" && (ALLOWED_SYNTHETIC_GATES as readonly string[]).includes(gate)) return true;
  return false;
}
