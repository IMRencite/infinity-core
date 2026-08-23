import type { DepartmentId } from "./types";

export type RoomWorkZoneConfig = {
  intake: string;
  process: string;
  output: string;
  motif:
    | "radar"
    | "network"
    | "economics"
    | "blueprint"
    | "systems"
    | "branch"
    | "frame"
    | "pipeline"
    | "checkpoint"
    | "launch"
    | "metrics"
    | "command";
};

const ROOM_WORK_ZONES: Record<DepartmentId, RoomWorkZoneConfig> = {
  opportunity_lab: { intake: "Signal intake", process: "Scan core", output: "Candidates", motif: "radar" },
  research_department: { intake: "Sources", process: "Analysis", output: "Findings", motif: "network" },
  strategy_finance: { intake: "Market data", process: "Economics", output: "Revenue plan", motif: "economics" },
  company_operations: { intake: "Inputs", process: "Structure", output: "Venture blueprint", motif: "blueprint" },
  systems_architect: { intake: "Business model", process: "Systems map", output: "Operating blueprint", motif: "systems" },
  growth_department: { intake: "Opportunity", process: "Distribution", output: "Growth plan", motif: "branch" },
  creative_studio: { intake: "Creative brief", process: "Design", output: "Media asset", motif: "frame" },
  product_lab: { intake: "Build task", process: "Implementation", output: "Artifact", motif: "pipeline" },
  quality_control: { intake: "Artifact", process: "Review", output: "Pass / repair", motif: "checkpoint" },
  launch_operations: { intake: "Ready asset", process: "Deploy", output: "External action", motif: "launch" },
  intelligence_center: { intake: "Performance", process: "Diagnosis", output: "Learning signal", motif: "metrics" },
  executive_office: { intake: "Evidence", process: "Decision", output: "Next mission", motif: "command" },
};

export function getRoomWorkZones(departmentId: DepartmentId): RoomWorkZoneConfig {
  return ROOM_WORK_ZONES[departmentId];
}

export const HQ_FLOOR_LAYOUT = {
  radarSpan: "lg:col-span-6",
  researchSpan: "lg:col-span-5",
  strategySpan: "lg:col-span-5",
  blueprintSpan: "lg:col-span-5",
  productionWingSpan: "lg:col-span-11",
} as const;
