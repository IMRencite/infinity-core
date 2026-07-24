import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { DEFAULT_RESOURCE_POOLS } from "./constants";
import type { ResourcePool } from "./types";

export async function ensureDefaultResourcePools(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<ResourcePool[]> {
  const pools: ResourcePool[] = [];

  for (const poolDef of DEFAULT_RESOURCE_POOLS) {
    const { data: existing, error: existingError } = await admin
      .from("resource_pools")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("resource_type", poolDef.resourceType)
      .eq("name", poolDef.name)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check resource pool: ${existingError.message}`);
    }

    if (existing) {
      pools.push(existing);
      continue;
    }

    const { data: created, error } = await admin
      .from("resource_pools")
      .insert({
        organization_id: organizationId,
        resource_type: poolDef.resourceType,
        name: poolDef.name,
        status: "active",
        currency: "currency" in poolDef ? poolDef.currency : null,
        total_capacity: poolDef.totalCapacity,
        reserved_capacity: 0,
        consumed_capacity: 0,
        metadata: {
          bootstrap: "allocation_foundation_v1",
          zero_capacity_by_design: true,
        },
      })
      .select("*")
      .single();

    if (error || !created) {
      throw new Error(`Failed to create resource pool: ${error?.message ?? "unknown error"}`);
    }

    pools.push(created);
  }

  return pools;
}

export async function getResourcePoolByType(
  admin: AdminSupabaseClient,
  organizationId: string,
  resourceType: string,
  name?: string,
): Promise<ResourcePool | null> {
  let query = admin
    .from("resource_pools")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("resource_type", resourceType)
    .eq("status", "active");

  if (name) {
    query = query.eq("name", name);
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error) {
    throw new Error(`Failed to load resource pool: ${error.message}`);
  }

  return data;
}
