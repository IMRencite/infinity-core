import { loadServerEnvFromLocalFile, reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole, isStopOnly } from "../lib/infinity/production-outbound/conversation-semantics";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";

const THREAD = "1a0af74557b0eb36";
const KNOWN = new Set([
  "1a0af74557b0eb36",
  "1a0b113843dd3f35",
  "1a0b1cf6a7987986",
  "1a0b2000b6fda6c0",
  "1a0b23d641859457",
  "1a0b254b39f5c645",
  "1a0b2811333bb557",
  "1a0b2c9c7407859a",
  "1a0b2d5878bc6c17",
  "1a0b3b2bd5ab75a7",
  "1a0b3befb327cbcb",
  "1a0b3e44d74d4d98",
  "1a0b3f156756543d",
]);

async function main() {
  loadServerEnvFromLocalFile();
  reloadGmailOAuthFromLocalFile();
  const thread = await readGmailThread({ threadId: THREAD });
  const prospect = resolveApprovedCanaryEmail();
  const messages = thread.ok ? thread.messages : [];
  console.log(JSON.stringify({
    gmail_ok: thread.ok,
    message_count: messages.length,
    messages: messages.map((message) => {
      const body = (message.bodyText || message.snippet || "").trim();
      const role = classifyMessageRole({
        message_id: message.id,
        from: message.from,
        to: message.to,
        body,
        snippet: message.snippet,
        infinity_identity: INFINITY_MANAGED_SENDER,
        prospect_identity: prospect || INFINITY_MANAGED_SENDER,
      });
      return {
        id: message.id,
        known: KNOWN.has(message.id),
        role: role.role,
        direction: role.direction,
        stop: isStopOnly(body),
        preview: body.slice(0, 140),
      };
    }),
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "OBSERVE_FAILED" }));
  process.exit(1);
});
