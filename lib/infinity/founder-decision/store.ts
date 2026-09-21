import { createHash, randomUUID } from "node:crypto";

export type FounderDecision = {
  id: string;
  decision_type: "ORGANIC_QC_HOLD" | "COMMUNICATION_ATTESTATION";
  subject_id: string;
  decision: "CLEAR_HOLD" | "KEEP_HOLD" | "ATTEST" | "REJECT";
  statement_hash: string;
  evidence_hash: string;
  requested_at: string;
  acted_at: string;
  actor_identity: string;
  authentication_method: "WEBAUTHN_PASSKEY" | "FOUNDER_GPG";
  previous_decision_id: string | null;
};

const rows: FounderDecision[] = [];

export function rejectForgeableFactor(method: string | null | undefined): boolean {
  return !method || /ENV|CRON|CI|CURSOR|SERVICE|BEARER|HQ_SESSION/i.test(method);
}

export function hashStatement(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function appendFounderDecision(input: Omit<FounderDecision, "id">): FounderDecision {
  if (rejectForgeableFactor(input.authentication_method)) {
    throw new Error("AGENT_FORGEABLE_FACTOR");
  }
  const row: FounderDecision = { ...input, id: `fd:${randomUUID()}` };
  rows.push(row);
  return row;
}

export function listFounderDecisions(): FounderDecision[] {
  return [...rows];
}
