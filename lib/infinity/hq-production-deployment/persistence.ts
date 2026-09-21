import { HQ_PRODUCTION_PERSISTENCE_GATE, type HqNamedGate } from "./contract";

export function evaluateHQProductionPersistenceGate(input: {
  productionSupabase: boolean;
  requiredSchema: boolean;
  readOk: boolean;
  writeOk: boolean;
  localDatabase: boolean;
  staleProject: boolean;
  rlsEnabled: boolean;
}): HqNamedGate {
  const reasons: string[] = [];
  if (!input.productionSupabase) reasons.push("PRODUCTION_SUPABASE_UNAVAILABLE");
  if (!input.requiredSchema) reasons.push("REQUIRED_SCHEMA_MISSING");
  if (!input.readOk) reasons.push("READ_FAILED");
  if (!input.writeOk) reasons.push("WRITE_FAILED");
  if (input.localDatabase) reasons.push("LOCAL_DATABASE_IN_PRODUCTION");
  if (input.staleProject) reasons.push("STALE_SUPABASE_PROJECT");
  if (!input.rlsEnabled) reasons.push("RLS_DISABLED");
  return {
    gate: HQ_PRODUCTION_PERSISTENCE_GATE,
    result: reasons.length ? "FAIL" : "PASS",
    reasons: reasons.length ? reasons : ["PRODUCTION_PERSISTENCE_READY"],
  };
}
