import { PUBLIC_OUTBOUND_FORBIDDEN } from "./contract";
import type { ProductionOutboundState } from "./types";

export function projectPublicOutbound(state: ProductionOutboundState) {
  const executing = state.outbox.some((row) => row.status === "QUEUED" || row.status === "CLAIMED" || row.status === "SENDING");
  return {
    department: "GROWTH" as const,
    mode: state.control.mode === "DISABLED" ? "IDLE" : executing ? "ACTIVE" : "MONITORING",
    kill_switch: state.control.kill_switch,
    activity: state.control.kill_switch
      ? "Sales outbound is paused."
      : state.metrics.sent > 0 && state.outbox.some((row) => row.status === "SENDING" || row.status === "CLAIMED")
        ? "Executing qualified outreach"
        : state.metrics.replies > 0
          ? "Processing sales responses"
          : state.control.mode === "DISABLED"
            ? "Sales outbound is idle."
            : "Monitoring provider health",
  };
}

export function outboundPublicForbiddenPatterns() {
  return PUBLIC_OUTBOUND_FORBIDDEN;
}
