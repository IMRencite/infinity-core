import { persistPreparedAttempt, transitionAttempt } from "./attempts";
import { evaluateEmailSendAuthorization } from "./governance";
import { resolveGmailInvocationContext } from "./gmail-invocation-context";
import { gmailSendMessage } from "./gmail-adapter";
import { routeEmailSend } from "./router";
import { communicationTelemetryFromAttempt } from "./telemetry";
import type { CommunicationAuthorizationDecision, CommunicationIntent } from "./types";

export async function executeEmailSend(input: {
  intent: CommunicationIntent;
  prospectSendAuthorized: boolean;
  contentApproved: boolean;
  channelAllowed: boolean;
  prospect?: Parameters<typeof evaluateEmailSendAuthorization>[0]["prospect"];
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<{
  blocked: boolean;
  authorization: CommunicationAuthorizationDecision;
  attempt: ReturnType<typeof persistPreparedAttempt>;
  telemetry: ReturnType<typeof communicationTelemetryFromAttempt>;
}> {
  const attempt = persistPreparedAttempt(input.intent.envelope);
  const authorization = evaluateEmailSendAuthorization({
    intent: input.intent,
    prospect: input.prospect,
    prospectSendAuthorized: input.prospectSendAuthorized,
    contentApproved: input.contentApproved,
    channelAllowed: input.channelAllowed,
    now: input.now,
  });
  if (!authorization.allowed) {
    const blocked = transitionAttempt(attempt.attemptId, authorization.reason === "optOut" ? "OPTED_OUT" : "FAILED", {
      authorized: false,
    }) ?? attempt;
    return {
      blocked: true,
      authorization,
      attempt: blocked,
      telemetry: communicationTelemetryFromAttempt(blocked),
    };
  }
  const route = routeEmailSend(input.intent);
  if (!route.available) {
    const blocked = transitionAttempt(attempt.attemptId, "FAILED", { authorized: false }) ?? attempt;
    return {
      blocked: true,
      authorization: { ...authorization, allowed: false, reason: route.reason, providerVerificationGate: "FAIL" },
      attempt: blocked,
      telemetry: communicationTelemetryFromAttempt(blocked),
    };
  }
  const authorized = transitionAttempt(attempt.attemptId, "AUTHORIZED", { authorized: true }) ?? attempt;
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "HTTP" });
  const providerResult = await gmailSendMessage(input.intent.envelope, input.fetchImpl ?? fetch, gmailContext);
  const next = transitionAttempt(authorized.attemptId, providerResult.attemptState, {
    authorized: true,
    providerResult,
  }) ?? authorized;
  return {
    blocked: false,
    authorization,
    attempt: next,
    telemetry: communicationTelemetryFromAttempt(next),
  };
}
