import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isCanonicalPublicOccupancy, PUBLIC_OCCUPANCY_SCOPE, type CanonicalPublicOccupancy } from "./occupancy";

let memory: CanonicalPublicOccupancy | null = null;

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function publicReadClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistCanonicalPublicOccupancy(occupancy: CanonicalPublicOccupancy): Promise<void> {
  memory = occupancy;
  const client = adminClient();
  if (!client) return;
  const { error } = await client.from("cloud_runtime_state").upsert({
    scope: PUBLIC_OCCUPANCY_SCOPE,
    version: 1,
    instance_id: "public-occupancy",
    payload: occupancy,
    updated_at: occupancy.generated_at,
  });
  if (error) return;
}

export async function loadCanonicalPublicOccupancy(): Promise<CanonicalPublicOccupancy | null> {
  const client = publicReadClient();
  if (client) {
    const { data } = await client.from("cloud_runtime_state").select("payload").eq("scope", PUBLIC_OCCUPANCY_SCOPE).maybeSingle();
    if (isCanonicalPublicOccupancy(data?.payload)) {
      if (memory && Date.parse(memory.generated_at) >= Date.parse(data.payload.generated_at)) return memory;
      memory = data.payload;
      return data.payload;
    }
  }
  return memory;
}

export function resetCanonicalPublicOccupancyMemory(): void {
  memory = null;
}
