import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EmailInboundCapabilityState } from "@/lib/infinity/provider-capabilities/email-inbound-capabilities";
import { EMAIL_READ_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-inbound-capabilities";
import { secretLike } from "./secrets";
import type { CapabilityReadModel } from "./types";
import {
  inspectInboundCapabilityStates,
  persistInboundReadCapabilityStates,
} from "./capabilities";

export const INBOUND_READ_VERIFICATION_FILE =
  ".infinity/communication-provider/inbound-read-verification.json" as const;

export type InboundReadCapabilityArtifact = {
  verifiedAt: string | null;
  scopeSource: string | null;
  observedScopes: string[];
  states: CapabilityReadModel;
  checkpointHistoryId: string | null;
  unrelatedPersisted: 0;
  liveReplyExecuted: false;
  providerWrites: 0;
};

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_INBOUND_PERSIST !== "1") return false;
  return true;
}

export { persistInboundReadCapabilityStates };
export { markInboundReadOnlyVerified } from "./capabilities";
export { inspectInboundCapabilityStates as inspectInboundReadCapabilityStates };

export function writeInboundReadVerificationArtifact(artifact: InboundReadCapabilityArtifact): void {
  if (!persistEnabled()) return;
  const serialized = JSON.stringify(artifact);
  if (secretLike(serialized)) throw new Error("Secret-like content blocked from inbound read verification persistence");
  mkdirSync(dirname(INBOUND_READ_VERIFICATION_FILE), { recursive: true });
  writeFileSync(INBOUND_READ_VERIFICATION_FILE, `${serialized}\n`, "utf8");
}

export function readInboundReadVerificationArtifact(): InboundReadCapabilityArtifact | null {
  if (!persistEnabled() || !existsSync(INBOUND_READ_VERIFICATION_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(INBOUND_READ_VERIFICATION_FILE, "utf8")) as InboundReadCapabilityArtifact;
    if (secretLike(JSON.stringify(parsed))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hydrateInboundReadCapabilityFromDurable(): EmailInboundCapabilityState {
  const artifact = readInboundReadVerificationArtifact();
  if (artifact?.states) persistInboundReadCapabilityStates(artifact.states);
  return inspectInboundCapabilityStates()[EMAIL_READ_CAPABILITY];
}
