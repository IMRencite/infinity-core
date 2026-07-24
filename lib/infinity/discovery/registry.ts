import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { DiscoveryProvider } from "./types";

const RESOLVABLE_STATUSES = new Set(["active"]);

export async function resolveDiscoveryProvider(
  admin: AdminSupabaseClient,
  organizationId: string,
  providerKey: string,
  version = "1.0.0",
): Promise<DiscoveryProvider> {
  const { data: orgProviders, error: orgError } = await admin
    .from("discovery_provider_registry")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider_key", providerKey)
    .eq("version", version)
    .in("status", [...RESOLVABLE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  if (orgError) {
    throw new Error(`Discovery provider lookup failed: ${orgError.message}`);
  }

  if (orgProviders && orgProviders.length > 0) {
    return orgProviders[0];
  }

  const { data: globalProviders, error: globalError } = await admin
    .from("discovery_provider_registry")
    .select("*")
    .is("organization_id", null)
    .eq("provider_key", providerKey)
    .eq("version", version)
    .in("status", [...RESOLVABLE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  if (globalError) {
    throw new Error(`Discovery provider lookup failed: ${globalError.message}`);
  }

  if (!globalProviders || globalProviders.length === 0) {
    throw new Error(
      `No active discovery provider registered for key "${providerKey}"@${version}`,
    );
  }

  return globalProviders[0];
}

export async function listDiscoveryProviders(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<DiscoveryProvider[]> {
  const { data: globalProviders, error: globalError } = await admin
    .from("discovery_provider_registry")
    .select("*")
    .is("organization_id", null)
    .eq("status", "active")
    .order("provider_key", { ascending: true });

  if (globalError) {
    throw new Error(`Failed to list global discovery providers: ${globalError.message}`);
  }

  const { data: orgProviders, error: orgError } = await admin
    .from("discovery_provider_registry")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("provider_key", { ascending: true });

  if (orgError) {
    throw new Error(`Failed to list organization discovery providers: ${orgError.message}`);
  }

  return [...(globalProviders ?? []), ...(orgProviders ?? [])];
}
