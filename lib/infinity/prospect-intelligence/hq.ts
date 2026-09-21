import { HQ_PROSPECT_WORKER_ROLES, WORKFLOW_STAGES } from "./contract";
import type { ProspectCycleSnapshot } from "./types";

export function projectProspectIntelligenceHq(snapshot: ProspectCycleSnapshot) {
  const occupancy = snapshot.activity === "ACTIVE" ? "ACTIVE_WORK" : snapshot.activity === "MONITORING" ? "WAITING_EXTERNAL" : "PRESENT_IDLE";
  return {
    room_id: "prospect_intelligence" as const,
    display_name: "Prospect Intelligence",
    workflow: [...WORKFLOW_STAGES],
    workflow_stage: snapshot.workflow_stage,
    occupancy,
    visual_state: snapshot.activity,
    current_work:
      snapshot.activity === "ACTIVE"
        ? snapshot.generic_activity
        : snapshot.activity === "MONITORING"
          ? "Watching source schedules, source health, and sales inventory coverage."
          : "Workers present. Ready to process commercial entities.",
    metrics: [
      { key: "sources_enabled", label: "Sources Enabled", value: snapshot.sources_enabled },
      { key: "sources_healthy", label: "Sources Healthy", value: snapshot.sources_healthy },
      { key: "sources_degraded", label: "Sources Degraded", value: snapshot.sources_degraded },
      { key: "discovery_jobs", label: "Discovery Jobs", value: snapshot.discovery_jobs },
      { key: "refresh_jobs", label: "Refresh Jobs", value: snapshot.refresh_jobs },
      { key: "enrichment_jobs", label: "Enrichment Jobs", value: snapshot.enrichment_jobs },
      { key: "records_seen", label: "Records Seen Today", value: snapshot.records_seen },
      { key: "known_people", label: "New People Today", value: snapshot.known_people },
      { key: "known_organizations", label: "New Organizations Today", value: snapshot.known_organizations },
      { key: "updated_entities_today", label: "Updated Entities Today", value: snapshot.updated_entities_today },
      { key: "duplicates_resolved", label: "Duplicates Resolved", value: snapshot.duplicates_resolved },
      { key: "ambiguous_records", label: "Ambiguous Records", value: snapshot.ambiguous_records },
      { key: "ready_prospects", label: "Ready Sales Prospects", value: snapshot.ready_prospects },
      { key: "outbound_coverage_days", label: "Coverage Days", value: snapshot.outbound_coverage_days },
      { key: "venture_matches", label: "Inventory Health", value: snapshot.venture_matches },
      { key: "published_to_sales", label: "Published to Sales", value: snapshot.published_to_sales },
      { key: "source_health", label: "Source Health", value: snapshot.source_health },
    ],
    agents: HQ_PROSPECT_WORKER_ROLES.map((role, index) => ({
      role,
      status: snapshot.activity === "ACTIVE" && index < 4 ? "ACTIVE" : snapshot.activity === "MONITORING" && index < 2 ? "MONITORING" : "IDLE",
    })),
  };
}
