import { inspectGmailProviderReadiness } from "./provider";
import type { OutboundProviderReadiness, ProductionOutboundState } from "./types";

export function projectProductionOutboundHq(
  state: ProductionOutboundState,
  readiness: OutboundProviderReadiness = inspectGmailProviderReadiness(),
) {
  const providerHealth = state.control.kill_switch
    ? "BLOCKED"
    : readiness.healthy
      ? "HEALTHY"
      : readiness.bound
        ? "UNHEALTHY"
        : "UNBOUND";
  return {
    mode: state.control.mode,
    requested_mode: state.control.requested_mode,
    kill_switch: state.control.kill_switch,
    provider_health: providerHealth,
    authorization: state.decisions.at(-1)?.allowed ? "ALLOWED" : (state.decisions.at(-1)?.reasons[0] ?? "IDLE"),
    hourly_usage: `${state.usage.hourly}/${state.control.limits.max_sends_per_hour}`,
    daily_usage: `${state.usage.daily}/${state.control.limits.max_sends_per_day}`,
    metrics: [
      { key: "outbound_mode", label: "Outbound Mode", value: state.control.mode },
      { key: "provider_health", label: "Provider Health", value: providerHealth },
      { key: "send_authorization", label: "Canary Authorization", value: state.decisions.at(-1)?.allowed ? "ALLOWED" : (state.decisions.at(-1)?.reasons[0] ?? "IDLE") },
      { key: "hourly_usage", label: "Hourly Usage", value: `${state.usage.hourly}/${state.control.limits.max_sends_per_hour}` },
      { key: "daily_usage", label: "Daily Usage", value: `${state.usage.daily}/${state.control.limits.max_sends_per_day}` },
      { key: "suppressed", label: "Suppressed", value: state.outbox.filter((row) => row.status === "SUPPRESSED").length },
      { key: "blocked", label: "Blocked", value: state.metrics.blocked },
      { key: "sent", label: "Sent", value: state.metrics.sent },
      { key: "delivered", label: "Delivered", value: state.metrics.delivered },
      { key: "bounced", label: "Bounced", value: state.metrics.bounced },
      { key: "replied", label: "Replied", value: state.metrics.replies },
      { key: "meetings", label: "Meetings", value: state.metrics.meetings },
      { key: "kill_switch", label: "Kill Switch", value: state.control.kill_switch ? "ENGAGED" : "RELEASED" },
    ],
  };
}
