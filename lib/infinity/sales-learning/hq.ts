import { HQ_SALES_LEARNING_ROLES } from "./contract";
import { getDefaultSalesLearningState } from "./store";
import type { SalesLearningState } from "./types";

export function projectSalesLearningHq(state: SalesLearningState = getDefaultSalesLearningState()) {
  const improving = Object.values(state.profiles).flatMap((row) => Object.values(row.dimensions)).filter((row) => row.trend === "UP").length;
  const attention = Object.values(state.profiles).flatMap((row) => Object.values(row.dimensions)).filter((row) => row.state === "DEVELOPING").length;
  const occupancy = state.training_active ? "ACTIVE_WORK" : state.observations.length ? "WAITING_EXTERNAL" : "PRESENT_IDLE";
  return {
    room_id: "sales_floor" as const,
    occupancy,
    visual_state: state.training_active ? "ACTIVE" : state.observations.length ? "MONITORING" : "IDLE",
    current_work: state.training_active
      ? "Running targeted sales simulations and updating agent coaching."
      : state.queue.some((row) => row.state === "QUEUED")
        ? "Reviewing sales outcomes and queued coaching assignments."
        : "Monitoring sales activity and ready inventory.",
    training_active: state.training_active,
    metrics: [
      { key: "agents_selling", label: "Agents Selling", value: state.capacity.selling_capacity },
      { key: "agents_monitoring", label: "Agents Monitoring", value: state.capacity.monitoring_capacity },
      { key: "agents_training", label: "Agents Training", value: state.training_active ? Math.max(1, state.capacity.training_capacity) : 0 },
      { key: "interactions_today", label: "Interactions Today", value: state.metrics.interactions_observed },
      { key: "meetings_booked", label: "Meetings Booked", value: state.follow_up_patterns.reduce((sum, row) => sum + row.meetings, 0) },
      { key: "qualified_opportunities", label: "Qualified Opportunities", value: state.observations.filter((row) => row.qualification_signals.length > 0).length },
      { key: "sales_won", label: "Sales Won", value: state.observations.filter((row) => row.outcome === "won").length },
      { key: "active_coaching", label: "Active Coaching Assignments", value: state.queue.filter((row) => row.state !== "VALIDATED").length },
      { key: "simulations_completed", label: "Simulations Completed", value: state.metrics.simulations_completed },
      { key: "skills_improving", label: "Skills Improving", value: improving },
      { key: "skills_attention", label: "Skills Requiring Attention", value: attention },
      { key: "top_objections", label: "Top Objections", value: state.objection_patterns[0]?.class ?? "NONE" },
      { key: "objection_recovery", label: "Objection Recovery", value: state.simulations.filter((row) => row.mode === "OBJECTION_DRILL" && row.result === "PASS").length },
      { key: "follow_up_performance", label: "Follow-Up Performance", value: state.follow_up_patterns.reduce((sum, row) => sum + row.meetings, 0) },
      { key: "venture_conversion", label: "Venture Conversion", value: state.observations.filter((row) => row.outcome === "won").length },
    ],
    agents: HQ_SALES_LEARNING_ROLES.map((role, index) => ({
      role,
      status: state.training_active && role === "Coaching"
        ? "ACTIVE"
        : state.training_active && index < 2
          ? "MONITORING"
          : occupancy === "WAITING_EXTERNAL" && index < 2
            ? "MONITORING"
            : "IDLE",
    })),
  };
}
