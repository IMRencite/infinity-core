import type { DepartmentId } from "./types";

export const HQ_WELCOME_TITLE = "Welcome to Infinity OS";
export const HQ_WELCOME_SUBTITLE = "Autonomous Venture Operating Headquarters";

export const COMMAND_ROOM_ID: DepartmentId = "executive_office";

/** Lifecycle rooms in operational order — Command is rendered separately at the top. */
export const LIFECYCLE_ROOM_SEQUENCE: DepartmentId[] = [
  "opportunity_lab",
  "research_department",
  "strategy_finance",
  "company_operations",
  "growth_department",
  "creative_studio",
  "product_lab",
  "quality_control",
  "launch_operations",
  "intelligence_center",
];

export type RoomDisplayNames = {
  displayName: string;
  supportingLabel: string;
};

export const ROOM_DISPLAY_NAMES: Record<DepartmentId, RoomDisplayNames> = {
  opportunity_lab: {
    displayName: "Venture Radar",
    supportingLabel: "Find promising opportunities",
  },
  research_department: {
    displayName: "Research Grid",
    supportingLabel: "Validate demand and evidence",
  },
  strategy_finance: {
    displayName: "Profit Lab",
    supportingLabel: "Define the revenue strategy",
  },
  company_operations: {
    displayName: "Blueprint Lab",
    supportingLabel: "Structure the venture",
  },
  growth_department: {
    displayName: "Growth Nexus",
    supportingLabel: "Plan discovery and acquisition",
  },
  creative_studio: {
    displayName: "Design Core",
    supportingLabel: "Create visual and media assets",
  },
  product_lab: {
    displayName: "Creation Lab",
    supportingLabel: "Build the product and core assets",
  },
  quality_control: {
    displayName: "Validation Station",
    supportingLabel: "Review quality and repair issues",
  },
  launch_operations: {
    displayName: "Deployment Depot",
    supportingLabel: "Prepare and execute launch actions",
  },
  intelligence_center: {
    displayName: "Signal Intelligence",
    supportingLabel: "Measure results and diagnose outcomes",
  },
  executive_office: {
    displayName: "Command",
    supportingLabel: "Choose the next mission",
  },
};

export function getRoomDisplayNames(id: DepartmentId): RoomDisplayNames {
  return ROOM_DISPLAY_NAMES[id];
}

export const FINAL_ROOM_DISPLAY_NAMES: string[] = LIFECYCLE_ROOM_SEQUENCE.map(
  (id) => ROOM_DISPLAY_NAMES[id].displayName,
).concat(ROOM_DISPLAY_NAMES[COMMAND_ROOM_ID].displayName);
