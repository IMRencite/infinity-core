import { AUTONOMOUS_REPLY_WRITE_BODY, AUTONOMOUS_REPLY_WRITE_SUBJECT, AUTONOMOUS_REPLY_WRITE_VERSION } from "./constants";
import { groundedReplyContainsFabricatedClaims } from "./grounded-response";
import { buildId } from "./persist";
import type { ConversationStage } from "@/lib/infinity/market-validation-acquisition-runtime/consultative-discovery";

const CRE_CLAIM =
  /\$290|\$149|lease-scenario|occupancy-cost|NPV|not a CRM|validation page|cre /i;

export function generateAutonomousReplyWriteVerificationBody(): string {
  return AUTONOMOUS_REPLY_WRITE_BODY;
}

export function generateAutonomousReplyWriteVerificationSubject(): string {
  return `Re: ${AUTONOMOUS_REPLY_WRITE_SUBJECT}`;
}

export function autonomousReplyWriteVerificationGroundingPass(body: string): boolean {
  return (
    body.includes("controlled Infinity OS communication test") &&
    !CRE_CLAIM.test(body) &&
    !groundedReplyContainsFabricatedClaims(body) &&
    !/ya29\.|GOCSPX-|1\/\/|Bearer /i.test(body)
  );
}

export function buildAutonomousReplyIdempotencyKey(input: {
  conversationId: string;
  inboundMessageId: string;
}): string {
  return buildId("rply", [input.conversationId, input.inboundMessageId, "AUTONOMOUS_REPLY_WRITE_VERIFICATION", AUTONOMOUS_REPLY_WRITE_VERSION].join("|"));
}

export function buildAutonomousReplySetupIdempotencyKey(mailbox: string): string {
  return buildId("rply", ["AUTONOMOUS_REPLY_WRITE_VERIFICATION_SETUP", AUTONOMOUS_REPLY_WRITE_VERSION, mailbox].join("|"));
}

export function verificationStageAfterRequestMoreInformation(current: ConversationStage): ConversationStage {
  if (current === "OPEN_CONTEXT" || current === "OPEN_CONTEXT+CURRENT_PROCESS" || current === "CURRENT_PROCESS") {
    return "RELEVANCE";
  }
  return current;
}
