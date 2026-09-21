import { HQ_OPERATIONS_ROUTE } from "@/lib/infinity/hq-information-architecture/contract";
import {
  ALL_HQ_ROOM_IDS,
  COMMAND_ROOM_ID,
  OPERATIONS_ROOM_ID,
  ROOM_DISPLAY_NAMES,
} from "@/lib/infinity/operator-console/room-naming";
import type { DepartmentId } from "@/lib/infinity/operator-console/types";
import { firstClassRoomWorkerSource } from "@/lib/infinity/hq-room-workers/assigned-roles";
import type { HQFirstClassRoomDefinition } from "./contract";
import { DEPARTMENT_HEADLINES } from "./headlines";
import { registerFirstClassRoom } from "./register";

const HQ_FLOOR_ROUTE = "/dashboard" as const;

const ROOM_ROUTES: Record<DepartmentId, string> = {
  opportunity_lab: HQ_FLOOR_ROUTE,
  research_department: HQ_FLOOR_ROUTE,
  strategy_finance: HQ_FLOOR_ROUTE,
  company_operations: HQ_FLOOR_ROUTE,
  systems_architect: HQ_FLOOR_ROUTE,
  growth_department: HQ_FLOOR_ROUTE,
  creative_studio: HQ_FLOOR_ROUTE,
  product_lab: HQ_FLOOR_ROUTE,
  quality_control: HQ_FLOOR_ROUTE,
  launch_operations: HQ_FLOOR_ROUTE,
  intelligence_center: HQ_FLOOR_ROUTE,
  prospect_intelligence: HQ_FLOOR_ROUTE,
  executive_office: HQ_FLOOR_ROUTE,
  operations: HQ_OPERATIONS_ROUTE,
  sales_floor: HQ_FLOOR_ROUTE,
};

const ROOM_FLOOR_ORDER: Record<DepartmentId, number> = {
  executive_office: 0,
  operations: 1,
  opportunity_lab: 2,
  research_department: 3,
  strategy_finance: 4,
  company_operations: 5,
  systems_architect: 6,
  growth_department: 7,
  creative_studio: 8,
  product_lab: 9,
  quality_control: 10,
  launch_operations: 11,
  intelligence_center: 12,
  prospect_intelligence: 13,
  sales_floor: 14,
};

const ROOM_FLOOR_POSITION: Record<DepartmentId, string> = {
  executive_office: "command-surface",
  opportunity_lab: "discovery-wing",
  research_department: "discovery-wing",
  strategy_finance: "discovery-wing",
  company_operations: "discovery-wing",
  systems_architect: "discovery-wing",
  growth_department: "production-wing",
  creative_studio: "production-wing",
  product_lab: "production-wing",
  quality_control: "production-wing-full",
  operations: "operating-floor-first",
  sales_floor: "sales-wing",
  launch_operations: "deployment-wing",
  intelligence_center: "deployment-wing",
  prospect_intelligence: "deployment-wing",
};

const ROOM_STATUS_RESOLVER: Record<DepartmentId, string> = {
  opportunity_lab: "operator-snapshot.departments.state",
  research_department: "operator-snapshot.departments.state",
  strategy_finance: "operator-snapshot.departments.state",
  company_operations: "operator-snapshot.departments.state",
  systems_architect: "operator-snapshot.departments.state",
  growth_department: "operator-snapshot.departments.state",
  creative_studio: "operator-snapshot.departments.state",
  product_lab: "operator-snapshot.departments.state",
  quality_control: "operator-snapshot.departments.state",
  launch_operations: "operator-snapshot.departments.state",
  intelligence_center: "operator-snapshot.departments.state",
  prospect_intelligence: "operator-snapshot.departments.state",
  executive_office: "operator-snapshot.departments.state",
  operations: "projectOperationsRoom.department.state",
  sales_floor: "salesFloorView.status",
};

const ROOM_CURRENT_WORK_RESOLVER: Record<DepartmentId, string> = {
  opportunity_lab: "operator-snapshot.departments.currentTask",
  research_department: "operator-snapshot.departments.currentTask",
  strategy_finance: "operator-snapshot.departments.currentTask",
  company_operations: "operator-snapshot.departments.currentTask",
  systems_architect: "operator-snapshot.departments.currentTask",
  growth_department: "operator-snapshot.departments.currentTask",
  creative_studio: "operator-snapshot.departments.currentTask",
  product_lab: "operator-snapshot.departments.currentTask",
  quality_control: "operator-snapshot.departments.currentTask",
  launch_operations: "operator-snapshot.departments.currentTask",
  intelligence_center: "operator-snapshot.departments.currentTask",
  prospect_intelligence: "operator-snapshot.departments.currentTask",
  executive_office: "operator-snapshot.currentActivity",
  operations: "projectOperationsRoom.department.currentTask",
  sales_floor: "salesFloorView.next_actions",
};

const ROOM_OUTPUT_SOURCE: Record<DepartmentId, string> = {
  opportunity_lab: "workArtifacts+buildRoomArtifacts",
  research_department: "workArtifacts+buildRoomArtifacts",
  strategy_finance: "workArtifacts+buildRoomArtifacts",
  company_operations: "workArtifacts+buildRoomArtifacts",
  systems_architect: "systemsArchitectArtifacts",
  growth_department: "workArtifacts+buildRoomArtifacts",
  creative_studio: "workArtifacts+buildRoomArtifacts",
  product_lab: "workArtifacts+buildRoomArtifacts",
  quality_control: "workArtifacts+buildRoomArtifacts",
  launch_operations: "workArtifacts+buildRoomArtifacts",
  intelligence_center: "workArtifacts+buildRoomArtifacts",
  prospect_intelligence: "prospectIntelligenceHq+workArtifacts",
  executive_office: "commandActivity+workArtifacts",
  operations: "projectOperationsRoom.artifacts+HqCanonicalOperatingProjection.recentWork",
  sales_floor: "salesFloorView.rooms+salesFloorView.intelligence",
};

const ROOM_DETAIL_NAVIGATION: Record<DepartmentId, string> = {
  opportunity_lab: HQ_FLOOR_ROUTE,
  research_department: HQ_FLOOR_ROUTE,
  strategy_finance: HQ_FLOOR_ROUTE,
  company_operations: HQ_FLOOR_ROUTE,
  systems_architect: HQ_FLOOR_ROUTE,
  growth_department: HQ_FLOOR_ROUTE,
  creative_studio: HQ_FLOOR_ROUTE,
  product_lab: HQ_FLOOR_ROUTE,
  quality_control: HQ_FLOOR_ROUTE,
  launch_operations: HQ_FLOOR_ROUTE,
  intelligence_center: HQ_FLOOR_ROUTE,
  prospect_intelligence: HQ_FLOOR_ROUTE,
  executive_office: HQ_FLOOR_ROUTE,
  operations: HQ_OPERATIONS_ROUTE,
  sales_floor: HQ_FLOOR_ROUTE,
};

const ROOM_TRACEABILITY: Record<DepartmentId, string> = {
  opportunity_lab: "opportunity_candidates.discovery_run_id",
  research_department: "research evidence + candidate lineage",
  strategy_finance: "monetization_plan + venture_selection + VentureEconomicsIntelligenceContract",
  company_operations: "venture blueprint ids",
  systems_architect: "systemsArchitectView identity",
  growth_department: "organic_growth plan ids",
  creative_studio: "creative/media artifact ids",
  product_lab: "product_asset_builder artifact_id",
  quality_control: "quality review + gate ids",
  launch_operations: "external_action + deployment ids",
  intelligence_center: "performance_intelligence + last_cycle_id",
  prospect_intelligence: "prospect_intelligence graph + inventory + matches",
  executive_office: "missionId + learning decision",
  operations: "event/mission/runtime ids",
  sales_floor: "salesFloorView + OccupancyNPV campaign recognition",
};

function defineFirstClassRoom(id: DepartmentId): HQFirstClassRoomDefinition {
  const names = ROOM_DISPLAY_NAMES[id];
  const headlines = DEPARTMENT_HEADLINES[id];
  return registerFirstClassRoom({
    id,
    name: names.displayName,
    headline: headlines.active,
    headlines,
    purpose: names.shortDescription,
    route: ROOM_ROUTES[id],
    floorOrder: ROOM_FLOOR_ORDER[id],
    floorPosition: ROOM_FLOOR_POSITION[id],
    statusResolver: ROOM_STATUS_RESOLVER[id],
    currentWorkResolver: ROOM_CURRENT_WORK_RESOLVER[id],
    workerSource: firstClassRoomWorkerSource(id),
    outputHistorySource: ROOM_OUTPUT_SOURCE[id],
    detailNavigation: ROOM_DETAIL_NAVIGATION[id],
    traceability: ROOM_TRACEABILITY[id],
  });
}

export const HQ_FIRST_CLASS_ROOMS: HQFirstClassRoomDefinition[] = ALL_HQ_ROOM_IDS.map(defineFirstClassRoom);

export function firstClassRoom(id: DepartmentId): HQFirstClassRoomDefinition {
  const room = HQ_FIRST_CLASS_ROOMS.find((row) => row.id === id);
  if (!room) throw new Error(`HQ_FIRST_CLASS_ROOM_UNREGISTERED:${id}`);
  return room;
}

export function operationsFirstClassRoom(): HQFirstClassRoomDefinition {
  return firstClassRoom(OPERATIONS_ROOM_ID);
}

export { COMMAND_ROOM_ID, OPERATIONS_ROOM_ID };
