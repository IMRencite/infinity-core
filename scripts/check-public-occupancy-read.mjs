import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const adminClient = createClient(url, admin, { auth: { persistSession: false, autoRefreshToken: false } });
const a = await anonClient.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "public-operations-occupancy").maybeSingle();
const b = await adminClient.from("cloud_runtime_state").select("payload, updated_at").eq("scope", "public-operations-occupancy").maybeSingle();
console.log(JSON.stringify({
  anon_error: a.error?.message ?? null,
  anon_summary: a.data?.payload?.summary ?? null,
  admin_error: b.error?.message ?? null,
  admin_summary: b.data?.payload?.summary ?? null,
  admin_updated: b.data?.updated_at ?? null,
}));
