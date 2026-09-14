import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import type { CanonicalWorkType } from "./types";

export const WORK_TYPE_ROOMS: Record<CanonicalWorkType, DepartmentId[]> = {
  OPPORTUNITY_DISCOVERY: ["opportunity_lab"],
  RESEARCH: ["research_department"],
  VALIDATION: ["quality_control"],
  ECONOMICS: ["strategy_finance"],
  OFFER_ARCHITECTURE: ["strategy_finance", "systems_architect"],
  SYSTEM_ARCHITECTURE: ["systems_architect"],
  BUILD: ["product_lab"],
  DESIGN: ["creative_studio"],
  QC: ["quality_control"],
  DEPLOYMENT: ["launch_operations"],
  GROWTH: ["growth_department"],
  COMMERCIALIZATION: ["strategy_finance", "launch_operations"],
  FULFILLMENT: ["company_operations", "quality_control"],
  LEARNING: ["intelligence_center"],
  PRODUCT_IMPROVEMENT: ["product_lab", "intelligence_center"],
  INCIDENT_REPAIR: ["operations", "quality_control"],
  OPERATING: ["operations"],
  OTHER: ["operations"],
};

export function roomsForWorkType(type: CanonicalWorkType): DepartmentId[] {
  return WORK_TYPE_ROOMS[type] ?? ["operations"];
}

export function sourceLabel(source: string): string {
  if (source === "EXTERNAL_IMPLEMENTATION_AGENT") return "External implementation agent";
  if (source === "INFINITY_RUNTIME") return "Infinity runtime";
  if (source === "MISSION_ACTIVITY") return "Mission activity";
  if (source === "FOUNDER") return "Founder";
  if (source === "SCHEDULED_RUNTIME") return "Scheduled runtime";
  return source;
}
