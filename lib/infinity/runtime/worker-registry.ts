import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { CapabilityRecord, WorkerDefinition } from "./types";

const RESOLVABLE_HEALTH = new Set(["healthy", "degraded"]);
const WORKER_IMPLEMENTATIONS: Record<string, WorkerDefinition> = {};

export function registerWorkerImplementation(worker: WorkerDefinition) {
  WORKER_IMPLEMENTATIONS[worker.implementationKey] = worker;
}

export async function resolveCapabilityRecord(
  admin: AdminSupabaseClient,
  organizationId: string,
  capabilityKey: string,
  resolvedCapabilityId: string | null,
): Promise<CapabilityRecord> {
  if (resolvedCapabilityId) {
    const { data, error } = await admin
      .from("capability_registry")
      .select("*")
      .eq("id", resolvedCapabilityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Registry lookup failed: ${error.message}`);
    }

    if (data && isCapabilityExecutable(data, organizationId)) {
      return data;
    }
  }

  const { data: orgCapabilities, error: orgError } = await admin
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

  const orgMatch = orgCapabilities?.find((entry) =>
    isCapabilityExecutable(entry, organizationId),
  );

  if (orgMatch) {
    return orgMatch;
  }

  const { data: globalCapabilities, error: globalError } = await admin
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

  const globalMatch = globalCapabilities?.find((entry) =>
    isCapabilityExecutable(entry, organizationId),
  );

  if (!globalMatch) {
    throw new Error(
      `No active healthy capability registered for key "${capabilityKey}"`,
    );
  }

  return globalMatch;
}

export async function resolveWorkerForJob(
  admin: AdminSupabaseClient,
  organizationId: string,
  capabilityKey: string,
  resolvedCapabilityId: string | null,
): Promise<WorkerDefinition> {
  const capability = await resolveCapabilityRecord(
    admin,
    organizationId,
    capabilityKey,
    resolvedCapabilityId,
  );

  const implementationKey = readImplementationKey(capability);

  if (!implementationKey) {
    throw new Error(
      `Capability ${capability.capability_key} has no implementation_key registered`,
    );
  }

  const worker = WORKER_IMPLEMENTATIONS[implementationKey];

  if (!worker) {
    throw new Error(
      `No local worker implementation registered for key "${implementationKey}"`,
    );
  }

  return worker;
}

function isCapabilityExecutable(
  capability: CapabilityRecord,
  organizationId: string,
): boolean {
  if (capability.status !== "active") {
    return false;
  }

  if (!RESOLVABLE_HEALTH.has(capability.health_status)) {
    return false;
  }

  if (
    capability.organization_id !== null &&
    capability.organization_id !== organizationId
  ) {
    return false;
  }

  return true;
}

export function readImplementationKey(capability: CapabilityRecord): string | null {
  if ("implementation_key" in capability && capability.implementation_key) {
    return String(capability.implementation_key);
  }

  const metadata = capability.provider_metadata;
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    !Array.isArray(metadata) &&
    "implementation_key" in metadata
  ) {
    return String((metadata as Record<string, Json>).implementation_key);
  }

  return null;
}
