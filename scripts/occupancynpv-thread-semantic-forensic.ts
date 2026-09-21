import { createHash } from "node:crypto";
import { reloadGmailOAuthFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import { INFINITY_MANAGED_SENDER } from "../lib/infinity/inbound-communication-runtime/constants";
import { exchangeAndInspectGrant, readGmailThread } from "../lib/infinity/inbound-communication-runtime/gmail-inbound-read";
import { classifyMessageRole, SECOND_TURN_LEASE_QUESTION } from "../lib/infinity/production-outbound/conversation-semantics";
import { resolveApprovedCanaryEmail } from "../lib/infinity/production-outbound/canary-contact";

function fp(value: string): string {
  return value ? createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 12) : "none";
}

function safeText(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (/^stop$/i.test(trimmed)) return "STOP";
  if (/that makes sense.*lease-vs-alternative/i.test(trimmed)) return SECOND_TURN_LEASE_QUESTION;
  if (/sounds interesting.*best for/i.test(trimmed)) {
    return "Thanks — this sounds interesting. Can you tell me a little more about how OccupancyNPV works and who it’s best for?";
  }
  if (/comparison workspace/i.test(trimmed)) return "[Infinity comparison-workspace reply]";
  if (/occupancynpv makes that much simpler|still rebuilding lease scenarios/i.test(trimmed)) {
    return "[Infinity first-touch outbound]";
  }
  return `[unlabeled ${trimmed.length} chars; hash ${fp(trimmed)}]`;
}

async function main() {
  reloadGmailOAuthFromLocalFile();
  const grant = await exchangeAndInspectGrant();
  const thread = await readGmailThread({ threadId: "1a0af74557b0eb36" });
  if (!thread.ok) {
    console.log(JSON.stringify({ ok: false, reason: thread.reason, grant: grant.refresh }, null, 2));
    process.exit(1);
  }
  const infinity = INFINITY_MANAGED_SENDER;
  const prospect = resolveApprovedCanaryEmail() || infinity;
  const messages = thread.messages.map((message) => {
    const body = (message.bodyText || message.snippet || "").trim();
    const role = classifyMessageRole({
      message_id: message.id,
      from: message.from,
      to: message.to,
      body,
      snippet: message.snippet,
      infinity_identity: infinity,
      prospect_identity: prospect,
    });
    return {
      id: message.id,
      thread_id: message.threadId,
      timestamp: message.date,
      from_role: role.role,
      direction: role.direction,
      from_fp: fp(message.from),
      to_fp: fp(message.to),
      same_mailbox: fp(message.from) === fp(message.to),
      body_length: body.length,
      snippet_length: (message.snippet || "").length,
      parsed_text: safeText(body || message.snippet || ""),
      flags: {
        that_makes_sense: /that makes sense/i.test(body),
        example: /example/i.test(body),
        lease: /lease/i.test(body),
        alternative: /alternative/i.test(body),
        comparison: /comparison/i.test(body),
      },
      processing_state:
        message.id === "1a0b113843dd3f35" ? "INGESTED_POSITIVE_INTEREST"
          : message.id === "1a0b1cf6a7987986" ? "OUTBOUND_INTERESTED_REPLY"
            : message.id === "1a0b23d641859457" ? "OUTBOUND_EMPTY_OR_MALFORMED"
              : message.id === "1a0b254b39f5c645" ? "OUTBOUND_STOP_ECHO"
                : /that makes sense/i.test(body) && /example/i.test(body) ? "SECOND_TURN_QUESTION"
                  : "SEEN",
    };
  });
  const second = messages.find((row) => row.processing_state === "SECOND_TURN_QUESTION");
  console.log(JSON.stringify({
    contract: "OccupancyNpvThreadSemanticForensicV1",
    sent: false,
    grant: grant.refresh,
    thread_id: "1a0af74557b0eb36",
    message_count: messages.length,
    messages,
    second_turn: second
      ? {
        found: true,
        id: second.id,
        direction: second.direction,
        parsed: second.flags.that_makes_sense && second.flags.example && second.flags.lease
          ? SECOND_TURN_LEASE_QUESTION
          : second.parsed_text,
        body_length: second.body_length,
        flags: second.flags,
      }
      : { found: false },
  }, null, 2));
}

void main();
