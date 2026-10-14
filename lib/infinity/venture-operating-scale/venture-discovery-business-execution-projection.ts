/** Privacy-safe venture discovery cycle summary for runtime / HQ. */

export function projectVentureDiscoveryBusinessExecution(input: {
  cycle_id: string;
  trigger: "scheduled" | "manual";
  post_launch_outcome?: string | null;
  cloud_decision?: string | null;
}): Record<string, unknown> {
  const evaluated = input.post_launch_outcome != null;
  return {
    gate_id: "VENTURE_DISCOVERY_BUSINESS_EXECUTION_QC",
    cycle_id: input.cycle_id,
    trigger: input.trigger,
    opportunities_evaluated: evaluated ? 1 : 0,
    candidates_discovered: 0,
    candidates_rejected: evaluated && input.post_launch_outcome !== "ADVANCE" ? 1 : 0,
    candidates_advanced: input.post_launch_outcome === "ADVANCE" ? 1 : 0,
    economic_scoring: evaluated ? "RECORDED" : "NOT_RUN",
    persistent_state: evaluated ? "UPDATED" : "UNKNOWN",
    success: evaluated,
    actual_blocker: evaluated ? null : "DISCOVERY_DISPATCH_NOT_EVIDENCED",
    next_execution: "0 12 * * *",
  };
}
