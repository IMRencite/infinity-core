import {
  countAssetsCreated,
  countAutonomousOperatingHours,
  countDeploymentsCompleted,
  countMissionsCompleted,
  countResearchCycles,
  countVenturesOperating,
  countVenturesStarted,
} from "./counters";
import { readPublicProjectionCache, writePublicProjectionCache } from "./cache";
import {
  countActivePublicAgents,
  countIdlePublicAgents,
  mapAutonomousMode,
  mapLoopStateToPublicActivity,
  mapLoopStateToSystemStatus,
  mapPublicActivityReason,
  projectPublicAgents,
  projectPublicDepartments,
} from "./sanitize";
import { loadInternalPublicObservation } from "./sources";
import {
  PUBLIC_OPERATIONS_PROJECTION,
  PUBLIC_OPERATIONS_PROJECTION_VERSION,
  type InternalPublicObservation,
  type PublicOperationsProjection,
  type PublicStatProjection,
  type PublicVentureVisibility,
} from "./types";
import { projectPublicVenture, resolvePublicVentureVisibility } from "./visibility";

export function emptyUnavailableProjection(now = new Date().toISOString()): PublicOperationsProjection {
  return {
    contract: PUBLIC_OPERATIONS_PROJECTION,
    projection_version: PUBLIC_OPERATIONS_PROJECTION_VERSION,
    generated_at: now,
    system_status: "TEMPORARILY_UNAVAILABLE",
    autonomous_mode: "OBSERVING",
    public_activity_summary: "UPDATING",
    public_activity_reason: "Public operations are updating",
    active_public_agents: 0,
    idle_public_agents: 0,
    public_departments: [],
    public_agents: [],
    ventures_started_count: "UNKNOWN",
    ventures_operating_count: "UNKNOWN",
    public_ventures_count: "UNKNOWN",
    missions_completed_count: "UNKNOWN",
    autonomous_operating_hours: "UNKNOWN",
    autonomous_operating_hours_label: "Hours since autonomous operations enabled",
    deployments_completed_count: "UNKNOWN",
    public_assets_created_count: "UNKNOWN",
    research_cycles_completed_count: "UNKNOWN",
    last_public_activity_at: null,
    public_ventures: [],
    stats: [],
  };
}

export function projectPublicOperations(input?: {
  now?: string;
  observation?: InternalPublicObservation;
  visibilityOverrides?: Record<string, PublicVentureVisibility>;
  useCache?: boolean;
  forceUnavailable?: boolean;
}): PublicOperationsProjection {
  const now = input?.now ?? new Date().toISOString();
  if (input?.forceUnavailable) return emptyUnavailableProjection(now);
  if (input?.useCache !== false && !input?.observation) {
    const cached = readPublicProjectionCache();
    if (cached) return cached;
  }
  try {
    const observation = loadInternalPublicObservation({ now, observation: input?.observation });
    const projection = constructPublicOperationsProjection(observation, input?.visibilityOverrides);
    if (input?.useCache !== false && !input?.observation) writePublicProjectionCache(projection);
    return projection;
  } catch {
    return emptyUnavailableProjection(now);
  }
}

export function constructPublicOperationsProjection(
  observation: InternalPublicObservation,
  visibilityOverrides?: Record<string, PublicVentureVisibility>,
): PublicOperationsProjection {
  const loop = observation.loop;
  const agents = projectPublicAgents(loop, observation.now);
  const departments = projectPublicDepartments(loop, observation.now);
  const publicVentures = observation.ventures
    .map((venture) => {
      const visibility = resolvePublicVentureVisibility(venture, visibilityOverrides);
      return projectPublicVenture(venture, visibility);
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const started = countVenturesStarted(observation);
  const operating = countVenturesOperating(observation);
  const completed = countMissionsCompleted(observation);
  const hours = countAutonomousOperatingHours(observation);
  const deployments = countDeploymentsCompleted(observation);
  const assets = countAssetsCreated(observation);
  const research = countResearchCycles(observation);
  const stats: PublicStatProjection[] = [
    { key: "ventures_started", label: "Ventures Started", value: started },
    { key: "ventures_operating", label: "Ventures Operating", value: operating },
    { key: "public_ventures_live", label: "Public Ventures Live", value: publicVentures.length },
    { key: "missions_completed", label: "Missions Completed", value: completed },
    { key: "autonomous_operating_hours", label: "Hours since autonomous operations enabled", value: hours, unit: "hours" },
    { key: "deployments_completed", label: "Deployments Completed", value: deployments },
    { key: "assets_created", label: "Assets Created", value: assets },
    { key: "research_cycles_completed", label: "Research Cycles Completed", value: research },
  ];
  return {
    contract: PUBLIC_OPERATIONS_PROJECTION,
    projection_version: PUBLIC_OPERATIONS_PROJECTION_VERSION,
    generated_at: observation.now,
    system_status: mapLoopStateToSystemStatus(loop),
    autonomous_mode: mapAutonomousMode(loop),
    public_activity_summary: mapLoopStateToPublicActivity(loop),
    public_activity_reason: mapPublicActivityReason(loop),
    active_public_agents: countActivePublicAgents(agents),
    idle_public_agents: countIdlePublicAgents(agents),
    public_departments: departments,
    public_agents: agents,
    ventures_started_count: started,
    ventures_operating_count: operating,
    public_ventures_count: publicVentures.length,
    missions_completed_count: completed,
    autonomous_operating_hours: hours,
    autonomous_operating_hours_label: "Hours since autonomous operations enabled",
    deployments_completed_count: deployments,
    public_assets_created_count: assets,
    research_cycles_completed_count: research,
    last_public_activity_at: loop?.updated_at ?? observation.now,
    public_ventures: publicVentures,
    stats,
  };
}

export const PUBLIC_OPERATIONS_SURFACE = {
  methods: ["GET"] as const,
  mutationCapable: false,
  createMission: false,
  triggerTick: false,
  sendOutreach: false,
  deploy: false,
  mutateFinance: false,
  mutateProvider: false,
};
