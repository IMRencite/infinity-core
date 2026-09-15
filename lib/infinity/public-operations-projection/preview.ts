import type { PublicOperationsProjection } from "./types";

export type PublicOperationsPreviewModel = {
  title: string;
  system_status: string;
  departments: Array<{ name: string; activity: string }>;
  agents_active: number | string;
  ventures_started: number | string;
  ventures_operating: number | string;
  missions_completed: number | string;
  last_updated: string;
};

export function publicOperationsPreviewModel(projection: PublicOperationsProjection): PublicOperationsPreviewModel {
  return {
    title: "Infinity OS",
    system_status: projection.system_status === "OPERATIONAL" ? "System Operational" : projection.system_status === "DEGRADED" ? "System Degraded" : "Temporarily Unavailable",
    departments: projection.public_departments.map((row) => ({
      name: row.public_name,
      activity: row.generic_activity_label,
    })),
    agents_active: projection.active_public_agents,
    ventures_started: projection.ventures_started_count,
    ventures_operating: projection.ventures_operating_count,
    missions_completed: projection.missions_completed_count,
    last_updated: projection.generated_at,
  };
}
