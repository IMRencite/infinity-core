import type { DepartmentId, EngineId } from "./types";

export type DepartmentDefinition = {
  id: DepartmentId;
  label: string;
  shortLabel: string;
  engines: EngineId[];
  lifecycleOrder: number;
  gridArea: string;
  description: string;
  missionTargetEngines: EngineId[];
};

export const DEPARTMENTS: DepartmentDefinition[] = [
  {
    id: "opportunity_lab",
    label: "Opportunity Lab",
    shortLabel: "Opportunity",
    engines: ["opportunity_discovery", "opportunity_scanner"],
    lifecycleOrder: 1,
    gridArea: "opportunity",
    description: "Find and evaluate potential business opportunities.",
    missionTargetEngines: [],
  },
  {
    id: "research_department",
    label: "Research Department",
    shortLabel: "Research",
    engines: ["ai_brain", "grounded_research", "multi_model_router"],
    lifecycleOrder: 2,
    gridArea: "research",
    description: "Investigate opportunities with grounded evidence.",
    missionTargetEngines: [],
  },
  {
    id: "strategy_finance",
    label: "Strategy & Finance",
    shortLabel: "Strategy",
    engines: ["monetization_engine", "venture_selection"],
    lifecycleOrder: 3,
    gridArea: "strategy",
    description: "Monetization and venture selection decisions.",
    missionTargetEngines: [],
  },
  {
    id: "company_operations",
    label: "Company Operations",
    shortLabel: "Company",
    engines: ["company_builder"],
    lifecycleOrder: 4,
    gridArea: "company",
    description: "Venture and company operating blueprint.",
    missionTargetEngines: [],
  },
  {
    id: "growth_department",
    label: "Growth Department",
    shortLabel: "Growth",
    engines: ["organic_growth"],
    lifecycleOrder: 5,
    gridArea: "growth",
    description: "Organic acquisition strategy and content opportunities.",
    missionTargetEngines: ["organic_growth"],
  },
  {
    id: "creative_studio",
    label: "Creative Studio",
    shortLabel: "Creative",
    engines: ["creative_media"],
    lifecycleOrder: 6,
    gridArea: "creative",
    description: "Media assets, briefs, and creative production.",
    missionTargetEngines: ["creative_media"],
  },
  {
    id: "product_lab",
    label: "Product Lab",
    shortLabel: "Product",
    engines: ["product_asset_builder"],
    lifecycleOrder: 7,
    gridArea: "product",
    description: "Website, software, and production artifacts.",
    missionTargetEngines: ["product_asset_builder"],
  },
  {
    id: "quality_control",
    label: "Quality Control",
    shortLabel: "Quality",
    engines: ["quality_control"],
    lifecycleOrder: 8,
    gridArea: "quality",
    description: "Review gates, adversarial review, and repair logic.",
    missionTargetEngines: ["product_asset_builder", "creative_media"],
  },
  {
    id: "launch_operations",
    label: "Launch Operations",
    shortLabel: "Launch",
    engines: ["external_action_gateway"],
    lifecycleOrder: 9,
    gridArea: "launch",
    description: "Approved external actions and deployment steps.",
    missionTargetEngines: ["external_action_gateway"],
  },
  {
    id: "intelligence_center",
    label: "Intelligence Center",
    shortLabel: "Intelligence",
    engines: ["performance_intelligence"],
    lifecycleOrder: 10,
    gridArea: "intelligence",
    description: "Performance measurement, diagnosis, and optimization.",
    missionTargetEngines: [],
  },
  {
    id: "executive_office",
    label: "Executive Office",
    shortLabel: "Executive",
    engines: ["executive_decision"],
    lifecycleOrder: 11,
    gridArea: "executive",
    description: "Learning decisions, mission handoff, and next actions.",
    missionTargetEngines: [],
  },
];

const ENGINE_TO_DEPARTMENT = new Map<EngineId, DepartmentId>();
for (const dept of DEPARTMENTS) {
  for (const engine of dept.engines) {
    ENGINE_TO_DEPARTMENT.set(engine, dept.id);
  }
}

export function getDepartment(id: DepartmentId): DepartmentDefinition {
  const dept = DEPARTMENTS.find((d) => d.id === id);
  if (!dept) throw new Error(`Unknown department: ${id}`);
  return dept;
}

export function getDepartmentForEngine(engine: EngineId | string): DepartmentId | null {
  return ENGINE_TO_DEPARTMENT.get(engine as EngineId) ?? null;
}

export function getDepartmentForMissionTargetEngine(engine: string): DepartmentId | null {
  for (const dept of DEPARTMENTS) {
    if (dept.missionTargetEngines.includes(engine as EngineId)) return dept.id;
  }
  if (engine === "organic_growth") return "growth_department";
  if (engine === "creative_media") return "creative_studio";
  if (engine === "product_asset_builder") return "product_lab";
  if (engine === "external_action") return "launch_operations";
  return null;
}

export function listDepartmentsInLifecycleOrder(): DepartmentDefinition[] {
  return [...DEPARTMENTS].sort((a, b) => a.lifecycleOrder - b.lifecycleOrder);
}
