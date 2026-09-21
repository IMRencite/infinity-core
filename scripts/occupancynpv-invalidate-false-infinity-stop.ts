import { loadServerEnvFromLocalFile } from "../lib/infinity/communication-provider/load-local-env";
import {
  getClosedLoopDurableState,
  hydrateClosedLoopDurableState,
  invalidateFalseInfinityOptOut,
  persistClosedLoopDurableState,
} from "../lib/infinity/production-outbound/closed-loop-durable";

async function main() {
  loadServerEnvFromLocalFile();
  await hydrateClosedLoopDurableState();
  const before = getClosedLoopDurableState().suppression;
  if (before?.source_message_id !== "1a0b254b39f5c645") {
    console.log(JSON.stringify({
      ok: false,
      reason: "SOURCE_NOT_FALSE_INFINITY_STOP",
      source_message_id: before?.source_message_id ?? null,
      status: before?.status ?? null,
    }));
    process.exit(1);
  }
  const result = invalidateFalseInfinityOptOut({ expected_source_message_id: "1a0b254b39f5c645" });
  await persistClosedLoopDurableState();
  const after = getClosedLoopDurableState().suppression;
  console.log(JSON.stringify({
    ok: result.invalidated,
    before_status: before.status,
    after_status: after?.status ?? null,
    source_message_id: after?.source_message_id ?? null,
    conversation_state: getClosedLoopDurableState().conversation?.conversation_state ?? null,
    tick_invoked: false,
    provider_called: false,
  }, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "INVALIDATE_FAILED" }));
  process.exit(1);
});
