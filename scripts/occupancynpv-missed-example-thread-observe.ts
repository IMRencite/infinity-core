import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { resolveGmailInvocationContext } from "../lib/infinity/communication-provider/gmail-invocation-context";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole, isProspectRequest, isStopOnly } from "../lib/infinity/production-outbound/conversation-semantics";
import { stripQuotedReply } from "../lib/infinity/production-outbound/gmail-message-body";
import { selectLatestActionableProspectInbound } from "../lib/infinity/production-outbound/business-loop-health";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";
import { classifySalesReply } from "../lib/infinity/autonomous-sales-execution/engines";
import { nextActionForClassification } from "../lib/infinity/production-outbound/canary-inbound";

const THREAD = "1a0af74557b0eb36";

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  const gmailContext = resolveGmailInvocationContext({ trigger_source: "UNKNOWN", now: new Date().toISOString() });
  const thread = await readGmailThread({ threadId: THREAD, gmailContext });
  const prospect = resolveApprovedCanaryEmail() || INFINITY_MANAGED_SENDER;
  const messages = thread.ok ? thread.messages : [];
  const mapped = messages.map((message) => {
    const visible = stripQuotedReply(message.bodyText || message.snippet || "");
    const role = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body: visible,
      snippet: "",
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: prospect,
    });
    return {
      message_id: message.id,
      date: message.date,
      in_reply_to: message.inReplyTo ?? null,
      from: message.from.includes("@") ? message.from.replace(/.*</, "<") : "redacted",
      to: message.to.includes("@") ? message.to.replace(/.*</, "<") : "redacted",
      visible: visible.slice(0, 240),
      role: role.role,
      direction: role.direction,
      prospect_request: isProspectRequest(visible),
      stop: isStopOnly(visible),
      classification: classifySalesReply(visible),
      next_action: nextActionForClassification(classifySalesReply(visible)).action,
    };
  });
  const selected = thread.ok
    ? selectLatestActionableProspectInbound({
      messages,
      infinity_identity: INFINITY_MANAGED_SENDER,
      prospect_identity: prospect,
    })
    : null;
  const target = mapped.find((row) => /yes give me a real example/i.test(row.visible));
  console.log(JSON.stringify({
    observe_only: true,
    gmail_ok: thread.ok,
    reason: thread.ok ? null : thread.reason,
    thread_id: THREAD,
    message_count: messages.length,
    latest_12: mapped.slice(-12),
    target,
    turn_a: mapped.find((row) => /what would you need from me to compare them/i.test(row.visible)),
    provider_after_turn_a: mapped.find((row) => row.message_id === "1a0bd3490dd9fbba") ?? mapped.at(-1),
    provider_full_visible: messages.find((row) => row.id === "1a0bd3490dd9fbba")
      ? stripQuotedReply((messages.find((row) => row.id === "1a0bd3490dd9fbba")?.bodyText || ""))
      : null,
    selected_actionable_id: selected?.id ?? null,
    selected_visible: selected?.visible.slice(0, 160) ?? null,
    selected_role: selected?.role ?? null,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
