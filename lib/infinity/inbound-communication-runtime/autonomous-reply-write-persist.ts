import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EmailInboundCapabilityState } from "@/lib/infinity/provider-capabilities/email-inbound-capabilities";
import { secretLike } from "./secrets";

export const AUTONOMOUS_REPLY_WRITE_FILE =
  ".infinity/communication-provider/autonomous-reply-write-verification.json" as const;

export type AutonomousReplyWriteArtifact = {
  conversationId: string | null;
  providerThreadId: string | null;
  setupProviderMessageId: string | null;
  setupEmailsSent: number;
  inboundProviderMessageId: string | null;
  replyProviderMessageId: string | null;
  replyProviderThreadId: string | null;
  replyIdempotencyKey: string | null;
  attemptId: string | null;
  autonomousRepliesAttempted: number;
  replySendState: EmailInboundCapabilityState;
  verifiedAt: string | null;
};

let memory: AutonomousReplyWriteArtifact | null = null;

function persistEnabled(): boolean {
  if (process.env.VITEST && process.env.INFINITY_INBOUND_PERSIST !== "1") return false;
  return true;
}

export function resetAutonomousReplyWriteArtifact(): void {
  memory = null;
}

export function emptyAutonomousReplyWriteArtifact(): AutonomousReplyWriteArtifact {
  return {
    conversationId: null,
    providerThreadId: null,
    setupProviderMessageId: null,
    setupEmailsSent: 0,
    inboundProviderMessageId: null,
    replyProviderMessageId: null,
    replyProviderThreadId: null,
    replyIdempotencyKey: null,
    attemptId: null,
    autonomousRepliesAttempted: 0,
    replySendState: "ARCHITECTURE_BUILT_WRITE_UNVERIFIED",
    verifiedAt: null,
  };
}

export function writeAutonomousReplyWriteArtifact(artifact: AutonomousReplyWriteArtifact): void {
  memory = artifact;
  if (!persistEnabled()) return;
  const serialized = JSON.stringify(artifact);
  if (secretLike(serialized)) throw new Error("Secret-like content blocked from autonomous reply write persistence");
  mkdirSync(dirname(AUTONOMOUS_REPLY_WRITE_FILE), { recursive: true });
  writeFileSync(AUTONOMOUS_REPLY_WRITE_FILE, `${serialized}\n`, "utf8");
}

export function readAutonomousReplyWriteArtifact(): AutonomousReplyWriteArtifact | null {
  if (memory) return memory;
  if (!persistEnabled() || !existsSync(AUTONOMOUS_REPLY_WRITE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(AUTONOMOUS_REPLY_WRITE_FILE, "utf8")) as AutonomousReplyWriteArtifact;
    if (secretLike(JSON.stringify(parsed))) return null;
    return { ...emptyAutonomousReplyWriteArtifact(), ...parsed };
  } catch {
    return null;
  }
}
