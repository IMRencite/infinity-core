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
  "systems_architect",
  "growth_department",
  "creative_studio",
  "product_lab",
  "quality_control",
  "launch_operations",
  "intelligence_center",
];

export type RoomDisplayNames = {
  displayName: string;
  /** Operator-facing one-sentence job. Also exposed as supportingLabel for existing callers. */
  shortDescription: string;
  expandedDescription: string;
  supportingLabel: string;
};

function roomCopy(input: {
  displayName: string;
  shortDescription: string;
  expandedDescription: string;
}): RoomDisplayNames {
  return {
    ...input,
    supportingLabel: input.shortDescription,
  };
}

export const ROOM_DISPLAY_NAMES: Record<DepartmentId, RoomDisplayNames> = {
  opportunity_lab: roomCopy({
    displayName: "Venture Radar",
    shortDescription: "Finds new business ideas and opportunities worth exploring.",
    expandedDescription:
      "Scans for real problems, demand signals, trends, and market gaps, then sends promising opportunities forward for deeper research.",
  }),
  research_department: roomCopy({
    displayName: "Research Grid",
    shortDescription: "Checks the market, customers, competitors, facts, and evidence behind an idea.",
    expandedDescription:
      "Collects and evaluates grounded evidence so Infinity can understand the opportunity before committing more time or money.",
  }),
  strategy_finance: roomCopy({
    displayName: "Profit Lab",
    shortDescription: "Figures out how the business can make money and whether the economics make sense.",
    expandedDescription:
      "Tests pricing, revenue models, costs, margins, customer acquisition assumptions, and other financial factors before the venture moves forward.",
  }),
  company_operations: roomCopy({
    displayName: "Blueprint Lab",
    shortDescription: "Turns a validated idea into a clear business plan and build roadmap.",
    expandedDescription:
      "Defines the venture structure, business model, product requirements, operating plan, and the major pieces that need to be built.",
  }),
  systems_architect: roomCopy({
    displayName: "Systems Architect",
    shortDescription: "Shows the operating systems this venture needs before anything is built or bought.",
    expandedDescription:
      "Maps the business model onto payments, CRM, communications, scheduling, support, analytics, compliance, and provider tenancy so Infinity can explain the operating path without purchasing software or creating accounts.",
  }),
  growth_department: roomCopy({
    displayName: "Growth Nexus",
    shortDescription: "Plans how the venture will attract customers and grow.",
    expandedDescription:
      "Builds the growth strategy across content, SEO, social media, distribution, acquisition channels, and other ways the venture can reach customers.",
  }),
  creative_studio: roomCopy({
    displayName: "Design Core",
    shortDescription: "Creates the brand, visuals, messaging, and creative direction.",
    expandedDescription:
      "Develops the venture's identity, visual system, media, creative assets, and customer-facing presentation.",
  }),
  product_lab: roomCopy({
    displayName: "Creation Lab",
    shortDescription: "Builds the product, website, software, assets, and systems the venture needs.",
    expandedDescription:
      "Turns the venture blueprint into working digital products, websites, software, content, integrations, and production-ready assets.",
  }),
  quality_control: roomCopy({
    displayName: "Validation Station",
    shortDescription: "Tests the work, catches problems, and decides if the venture is ready to move forward.",
    expandedDescription:
      "Checks technical quality, business assumptions, evidence, safety, readiness, and production artifacts before the venture advances.",
  }),
  launch_operations: roomCopy({
    displayName: "Deployment Depot",
    shortDescription: "Handles the technical steps needed to put the venture online.",
    expandedDescription:
      "Coordinates domains, DNS, hosting, deployment, SSL, provider readiness, and other infrastructure required for a controlled launch.",
  }),
  intelligence_center: roomCopy({
    displayName: "Signal Intelligence",
    shortDescription: "Watches performance, learns what is working, and finds what should improve next.",
    expandedDescription:
      "Collects performance signals, compares expected results with actual results, diagnoses problems, and creates optimization opportunities.",
  }),
  executive_office: roomCopy({
    displayName: "Command",
    shortDescription: "Coordinates the whole venture and decides what should happen next.",
    expandedDescription:
      "Acts as Infinity HQ's operating brain, using evidence, economics, readiness, and system state to coordinate work across every room.",
  }),
};

export function getRoomDisplayNames(id: DepartmentId): RoomDisplayNames {
  return ROOM_DISPLAY_NAMES[id];
}

export const ALL_HQ_ROOM_IDS: DepartmentId[] = [...LIFECYCLE_ROOM_SEQUENCE, COMMAND_ROOM_ID];

export const FINAL_ROOM_DISPLAY_NAMES: string[] = LIFECYCLE_ROOM_SEQUENCE.map(
  (id) => ROOM_DISPLAY_NAMES[id].displayName,
).concat(ROOM_DISPLAY_NAMES[COMMAND_ROOM_ID].displayName);
