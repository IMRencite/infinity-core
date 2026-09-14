export const SERVED_ARTIFACT_IDENTITY_GATE = "ServedArtifactIdentityGate" as const;
export const HQ_SERVED_ARTIFACT_MARKER =
  "hq-served-artifact:treasury-cash-truth+command-cycle+external-agent.v1" as const;

export const CANONICAL_HQ_PORT = 3000 as const;

export type ServedArtifactIdentity = {
  port: number;
  working_directory: string;
  startup_command: string;
  served_build_path: string;
  served_build_id: string | null;
  served_build_at: string | null;
  source_head: string | null;
  source_contains_repairs: boolean;
  served_contains_repairs: boolean;
};

export function evaluateServedArtifactIdentityGate(identity: ServedArtifactIdentity): {
  gate: typeof SERVED_ARTIFACT_IDENTITY_GATE;
  result: "PASS" | "FAIL";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (identity.port !== CANONICAL_HQ_PORT) reasons.push("NON_CANONICAL_PORT");
  if (!/infinity-core$/i.test(identity.working_directory.replace(/\\/g, "/"))) {
    reasons.push("WRONG_WORKING_DIRECTORY");
  }
  if (!identity.served_build_path.replace(/\\/g, "/").endsWith("/.next") && !identity.served_build_path.replace(/\\/g, "/").includes("/.next")) {
    reasons.push("UNEXPECTED_BUILD_PATH");
  }
  if (identity.source_contains_repairs && !identity.served_contains_repairs) {
    reasons.push("SERVED_BUILD_MISSING_CURRENT_REPAIRS");
  }
  if (!identity.source_contains_repairs) reasons.push("SOURCE_MISSING_VERIFIED_REPAIRS");
  return {
    gate: SERVED_ARTIFACT_IDENTITY_GATE,
    result: reasons.length === 0 ? "PASS" : "FAIL",
    reasons: reasons.length ? reasons : ["PORT_3000_SERVES_CURRENT_SOURCE_ARTIFACT"],
  };
}

export function sourceContainsVerifiedHqRepairs(source: {
  treasuryCashTruth: string;
  commandCycle: string;
  codingCapability: string;
}): boolean {
  return (
    source.treasuryCashTruth.includes("UNKNOWN_COERCED_TO_ZERO") &&
    source.treasuryCashTruth.includes("TreasuryCashTruthGate") &&
    source.commandCycle.includes("CONNECTED / DEGRADED") &&
    source.commandCycle.includes("CommandCycleCapabilityProjection") &&
    source.codingCapability.includes("EXTERNAL_IMPLEMENTATION_AGENT") &&
    source.codingCapability.includes("PRESENT_IDLE")
  );
}

export function servedBuildContainsVerifiedHqRepairs(compiled: string): boolean {
  return (
    compiled.includes("PROVIDER_FAIL_NOT_ZERO") &&
    compiled.includes("CONNECTED / DEGRADED") &&
    compiled.includes("EXTERNAL_IMPLEMENTATION_AGENT")
  );
}
