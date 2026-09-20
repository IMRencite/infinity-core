import { declaredSenderEmail } from "@/lib/infinity/communication-provider/credential-boundary";
import { exchangeGmailAccessToken, gmailSendMessage } from "@/lib/infinity/communication-provider/gmail-adapter";
import type { GmailInvocationContext } from "@/lib/infinity/communication-provider/gmail-invocation-context";
import { EMAIL_SEND_CAPABILITY } from "@/lib/infinity/provider-capabilities/email-send-capability";
import { inspectGmailProviderReadiness } from "./provider";
import { assertSendableOutboundBody } from "./conversation-semantics";
import type { OutboundProviderAdapter } from "./provider";

export function liveGmailOutboundAdapter(
  env: NodeJS.Dict<string> = process.env,
  readiness = inspectGmailProviderReadiness(env),
  gmailContext?: GmailInvocationContext,
): OutboundProviderAdapter {
  return {
    id: "gmail",
    readiness,
    async send(input) {
      const guarded = assertSendableOutboundBody(input.body);
      if (!guarded.ok) {
        return { accepted: false, provider_message_id: null, error: guarded.reason };
      }
      const result = await gmailSendMessage({
        messageId: input.idempotency_key,
        attemptId: input.idempotency_key,
        organizationId: "infinity",
        ventureId: "occupancynpv",
        experimentId: "production-outbound-canary",
        cohortId: "canary",
        prospectId: null,
        provider: "gmail",
        capability: EMAIL_SEND_CAPABILITY,
        fromIdentity: gmailContext?.sender ?? declaredSenderEmail(),
        toAddress: input.to,
        subject: input.subject,
        body: input.body,
        replyTo: null,
        providerThreadId: input.thread_id ?? null,
        inReplyTo: input.in_reply_to ?? null,
        landingUrl: "https://occupancynpv.com",
        attribution: {
          experimentId: "production-outbound-canary",
          cohortId: "canary",
          prospectId: null,
          candidateId: null,
          artifactId: null,
          channel: "email",
          attemptId: input.idempotency_key,
          landingUrl: "https://occupancynpv.com",
        },
        idempotencyKey: input.idempotency_key,
        authorizationId: input.idempotency_key,
        economicExposureCeiling: { classification: "UNKNOWN", amountUsd: null, treatedAsZero: false },
        createdAt: new Date().toISOString(),
      }, fetch, gmailContext);
      return {
        accepted: result.accepted,
        provider_message_id: result.providerMessageId ?? null,
        error: result.accepted ? undefined : result.failureCategory ?? result.failureMessage ?? "SEND_FAILED",
      };
    },
  };
}

export async function inspectGmailProviderMessage(
  messageId: string,
  gmailContext?: GmailInvocationContext,
): Promise<{
  present: boolean;
  sent_label: boolean;
  inbox_label: boolean;
  bounced: boolean;
}> {
  if (!messageId) return { present: false, sent_label: false, inbox_label: false, bounced: false };
  const token = await exchangeGmailAccessToken(fetch, gmailContext);
  if (!token.ok) return { present: false, sent_label: false, inbox_label: false, bounced: false };
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata`,
    { headers: { Authorization: `Bearer ${token.token}` } },
  );
  if (!res.ok) return { present: false, sent_label: false, inbox_label: false, bounced: false };
  const json = (await res.json()) as { labelIds?: string[] };
  const labels = json.labelIds ?? [];
  return {
    present: true,
    sent_label: labels.includes("SENT"),
    inbox_label: labels.includes("INBOX"),
    bounced: labels.some((label) => /bounce/i.test(label)),
  };
}
