import type {
  BuildPlanReadiness,
  CanonicalInfinitySystem,
  FounderBuildPlanPhase,
  FounderRequiredSystem,
  SystemCoverage,
  ZeroToProductionStep,
} from "./types";

const STRIPS: Array<{
  id: string;
  label: string;
  systems: CanonicalInfinitySystem[];
}> = [
  { id: "RESEARCH", label: "Research", systems: ["Research / Validation"] },
  { id: "MONEY", label: "Money", systems: ["Monetization Engine", "Treasury / Economic Authorization"] },
  { id: "ARCHITECTURE", label: "Architecture", systems: ["Venture Systems Architecture", "Company Builder"] },
  { id: "BUILD", label: "Build", systems: ["Product / Asset Builder", "Venture Selection"] },
  { id: "GROWTH", label: "Growth", systems: ["Organic Growth", "Creative Media"] },
  { id: "PAY", label: "Payments", systems: ["Payment Architecture", "Commercialization Control Plane"] },
  { id: "DEPLOY", label: "Deploy", systems: ["Production Artifact Handoff", "Deployment Readiness", "Deployment Execution"] },
  { id: "LEARN", label: "Learn", systems: ["Performance Intelligence"] },
];

const NEXT_PHASE_ORDERS: Record<ZeroToProductionStep, number[]> = {
  IDEA: [1, 2, 3],
  VALIDATE: [3, 1, 2],
  DESIGN: [2, 3, 4],
  BUILD: [4, 5, 6],
  LAUNCH: [7, 8, 9],
  ACQUIRE: [9, 10, 11],
  LEARN: [10, 11, 8],
  SCALE: [11, 10, 9],
};

function coverageFrom(readiness: BuildPlanReadiness): { coverage: SystemCoverage; label: string } {
  if (readiness === "READY_NOW" || readiness === "ALREADY_BUILT") {
    return { coverage: "AVAILABLE", label: "Ready" };
  }
  if (readiness === "PARTIALLY_AVAILABLE") {
    return { coverage: "PARTIAL", label: "Partially ready" };
  }
  if (readiness === "BLOCKED_BY_EVIDENCE") {
    return { coverage: "BLOCKED", label: "Blocked by evidence" };
  }
  return { coverage: "NEEDS_WORK", label: "Needs build work" };
}

function worse(a: BuildPlanReadiness, b: BuildPlanReadiness): BuildPlanReadiness {
  const rank: Record<BuildPlanReadiness, number> = {
    READY_NOW: 0,
    ALREADY_BUILT: 0,
    PARTIALLY_AVAILABLE: 1,
    NEEDS_VALIDATION: 2,
    NEEDS_BUILD: 3,
    BLOCKED_BY_EVIDENCE: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

export function deriveRequiredSystems(phases: FounderBuildPlanPhase[]): FounderRequiredSystem[] {
  const used = new Set(phases.flatMap((phase) => phase.systems));
  return STRIPS.filter((strip) => strip.systems.some((system) => used.has(system))).map((strip) => {
    const related = phases.filter((phase) => phase.systems.some((system) => strip.systems.includes(system)));
    const readiness = related.reduce<BuildPlanReadiness>(
      (current, phase) => worse(current, phase.readiness),
      "READY_NOW",
    );
    const mapped = coverageFrom(readiness);
    const why = related[0]?.whyItMatters ?? "Required to take this venture from idea to production.";
    const remains = related.find((phase) => phase.readiness !== "READY_NOW" && phase.readiness !== "ALREADY_BUILT")?.gate
      ?? "Infinity OS already has this internal system.";
    return {
      system: strip.systems.find((system) => used.has(system)) ?? strip.systems[0]!,
      stripId: strip.id,
      stripLabel: strip.label,
      whyNeeded: why,
      readiness,
      coverage: mapped.coverage,
      coverageLabel: mapped.label,
      remains,
    };
  });
}

export function systemCoverageSummary(systems: FounderRequiredSystem[]): {
  systemsReady: number;
  systemsPartial: number;
  systemsMissing: number;
  systemsBlocked: number;
  coverageSummary: string;
  nextRequiredSystems: string[];
  alreadyAvailable: string[];
} {
  const systemsReady = systems.filter((item) => item.coverage === "AVAILABLE").length;
  const systemsPartial = systems.filter((item) => item.coverage === "PARTIAL").length;
  const systemsMissing = systems.filter((item) => item.coverage === "NEEDS_WORK").length;
  const systemsBlocked = systems.filter((item) => item.coverage === "BLOCKED").length;
  const usable = systemsReady + systemsPartial;
  const coverageSummary = systems.length
    ? `${usable} of ${systems.length} Infinity OS systems ready or partially ready. These are internal Infinity capabilities, not customer-facing product features.`
    : "Not enough mapping to describe Infinity OS coverage.";
  return {
    systemsReady,
    systemsPartial,
    systemsMissing,
    systemsBlocked,
    coverageSummary,
    nextRequiredSystems: systems
      .filter((item) => item.coverage === "NEEDS_WORK" || item.coverage === "BLOCKED")
      .map((item) => item.stripLabel),
    alreadyAvailable: systems
      .filter((item) => item.coverage === "AVAILABLE" || item.coverage === "PARTIAL")
      .map((item) => `${item.stripLabel} (${item.system})`),
  };
}

export function nextThreePhases(
  pathCurrent: ZeroToProductionStep,
  phases: FounderBuildPlanPhase[],
): FounderBuildPlanPhase[] {
  const orders = NEXT_PHASE_ORDERS[pathCurrent] ?? [1, 2, 3];
  return orders
    .map((order) => phases.find((phase) => phase.order === order))
    .filter((phase): phase is FounderBuildPlanPhase => Boolean(phase));
}
