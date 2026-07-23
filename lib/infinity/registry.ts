import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CapabilityRecord } from "./types";

type InfinitySupabase = SupabaseClient<Database>;

const RESOLVABLE_HEALTH = new Set(["healthy", "degraded"]);

export async function resolveCapability(
  supabase: InfinitySupabase,
  organizationId: string,
  capabilityKey: string,
): Promise<CapabilityRecord> {
  const { data: orgCapabilities, error: orgError } = await supabase
    .from("capability_registry")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("capability_key", capabilityKey)
    .eq("status", "active")
    .in("health_status", [...RESOLVABLE_HEALTH])
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (orgError) {
    throw new Error(`Registry lookup failed: ${orgError.message}`);
  }

  if (orgCapabilities && orgCapabilities.length > 0) {
    return orgCapabilities[0];
  }

  const { data: globalCapabilities, error: globalError } = await supabase
    .from("capability_registry")
    .select("*")
    .is("organization_id", null)
    .eq("capability_key", capabilityKey)
    .eq("status", "active")
    .in("health_status", [...RESOLVABLE_HEALTH])
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (globalError) {
    throw new Error(`Registry lookup failed: ${globalError.message}`);
  }

  if (!globalCapabilities || globalCapabilities.length === 0) {
    throw new Error(
      `No active capability registered for key "${capabilityKey}"`,
    );
  }

  return globalCapabilities[0];
}
