import type { Json } from "@/lib/supabase/database.types";
import type { CreateMissionInput, Mission } from "./types";

export const FOUNDING_PURPOSE_STATEMENT =
  "Infinity is an autonomous enterprise that continuously discovers, builds, acquires, optimizes, and compounds high-value assets to maximize the long-term enterprise value of its owner's portfolio.";

export const FOUNDING_RULE =
  "Infinity must not require a human prompt in order to create value.";

export const FOUNDING_MISSION_KEY = "founding.enterprise_value_compounding";

export const LEGACY_FOUNDING_MISSION_TITLES = [
  "Autonomous venture discovery and validation",
] as const;

export const FOUNDING_MISSION_TITLE = "Autonomous Enterprise Value Compounding";

export const FOUNDING_MISSION_DESCRIPTION =
  "Maximize long-term enterprise value by autonomously discovering, evaluating, validating, building, acquiring, launching, operating, improving, and compounding high-value ventures and assets within approved constraints.";

export const FOUNDING_MISSION_OBJECTIVE = {
  key: "compound_enterprise_value",
  description:
    "Continuously discover, evaluate, validate, build, acquire, launch, operate, improve, and compound high-value ventures and assets in order to maximize the long-term enterprise value of the organization's portfolio within approved constraints.",
} as const;

export const FOUNDING_MISSION_CONSTRAINTS = {
  founding_mission_key: FOUNDING_MISSION_KEY,
  optimization_target: "enterprise_value",
  discovery_scan_type: "broad_market",
} as const;

export const FOUNDING_DISCOVERY_POLICY = {
  policy_category: "discovery",
  policy_key: "autonomous_scan",
  autonomy_level: "bounded_autonomy" as const,
  config: {
    purpose: "bounded_discovery_for_portfolio_opportunity_flow",
    optimization_target: "enterprise_value",
    max_experiment_usd: 25,
    allow_stub_scans: true,
    governed_future: [
      "autonomous_spend",
      "validation_budgets",
      "build_budgets",
      "acquisition_budgets",
      "allowed_industries",
      "prohibited_industries",
      "jurisdictions",
      "account_creation",
      "domain_purchasing",
      "infrastructure_purchasing",
      "paid_advertising",
      "public_publishing",
      "outbound_communication",
      "legal_commitments",
      "contracts",
      "hiring",
      "acquisitions",
      "data_access",
      "deployment",
      "shutdown_and_asset_disposal",
    ],
  },
} as const;

export function buildFoundingMissionInput(
  organizationId: string,
): CreateMissionInput {
  return {
    organizationId,
    title: FOUNDING_MISSION_TITLE,
    description: FOUNDING_MISSION_DESCRIPTION,
    objectives: [FOUNDING_MISSION_OBJECTIVE],
    constraints: { ...FOUNDING_MISSION_CONSTRAINTS },
    activate: true,
  };
}

function readConstraintKey(mission: Mission, key: string): string | null {
  const constraints = mission.constraints;

  if (
    typeof constraints === "object" &&
    constraints !== null &&
    !Array.isArray(constraints) &&
    key in constraints
  ) {
    return String((constraints as Record<string, Json>)[key]);
  }

  return null;
}

export function isFoundingMission(mission: Mission): boolean {
  if (readConstraintKey(mission, "founding_mission_key") === FOUNDING_MISSION_KEY) {
    return true;
  }

  return LEGACY_FOUNDING_MISSION_TITLES.includes(
    mission.title as (typeof LEGACY_FOUNDING_MISSION_TITLES)[number],
  );
}

export function missionNeedsFoundingSync(mission: Mission): boolean {
  if (mission.title !== FOUNDING_MISSION_TITLE) {
    return true;
  }

  if (mission.description !== FOUNDING_MISSION_DESCRIPTION) {
    return true;
  }

  const objectives = mission.objectives;
  const firstObjective =
    Array.isArray(objectives) &&
    objectives.length > 0 &&
    typeof objectives[0] === "object" &&
    objectives[0] !== null &&
    !Array.isArray(objectives[0])
      ? (objectives[0] as Record<string, Json>)
      : null;

  if (
    firstObjective?.key !== FOUNDING_MISSION_OBJECTIVE.key ||
    firstObjective?.description !== FOUNDING_MISSION_OBJECTIVE.description
  ) {
    return true;
  }

  if (readConstraintKey(mission, "founding_mission_key") !== FOUNDING_MISSION_KEY) {
    return true;
  }

  if (readConstraintKey(mission, "optimization_target") !== "enterprise_value") {
    return true;
  }

  return false;
}

export function readPrimaryMissionObjective(mission: Mission): string {
  const objectives = mission.objectives;

  if (
    Array.isArray(objectives) &&
    objectives.length > 0 &&
    typeof objectives[0] === "object" &&
    objectives[0] !== null &&
    !Array.isArray(objectives[0]) &&
    "description" in objectives[0]
  ) {
    return String((objectives[0] as Record<string, Json>).description);
  }

  return FOUNDING_MISSION_OBJECTIVE.description;
}

export function readMissionScanType(mission: Mission): string {
  return readConstraintKey(mission, "discovery_scan_type") ?? "broad_market";
}
