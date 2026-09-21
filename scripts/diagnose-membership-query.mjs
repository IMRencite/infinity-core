/**
 * Diagnose organization_members query failures.
 * Does not print secrets, tokens, or user emails.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatError(error) {
  if (!error) return "none";
  return [
    `code=${error.code ?? "none"}`,
    `message=${error.message ?? "none"}`,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
const user = users?.users?.[0];
if (!user) {
  console.log("No user found");
  process.exit(1);
}

console.log("=== USER STATE ===");
console.log("Authenticated user exists: YES");
console.log("User id present:", Boolean(user.id));
console.log("Email confirmed:", Boolean(user.email_confirmed_at));

console.log("\n=== POSTGREST ROOT ===");
const restRoot = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: publishable, Authorization: `Bearer ${publishable}` },
});
console.log("REST service reachable:", restRoot.status !== 503 && restRoot.status !== 502 ? "YES" : "NO");
console.log("REST root status:", restRoot.status);

console.log("\n=== SERVICE-ROLE: organization_members ===");
const serviceMembership = await admin
  .from("organization_members")
  .select("id, organization_id, user_id, role, deleted_at")
  .eq("user_id", user.id)
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();
console.log("Service-role query error:", formatError(serviceMembership.error));
console.log("Service-role membership row:", serviceMembership.data ? "YES" : "NO");
console.log("PGRST002 present:", serviceMembership.error?.code === "PGRST002" ? "YES" : "NO");

console.log("\n=== SERVICE-ROLE: organizations (other Infinity table) ===");
const serviceOrgs = await admin.from("organizations").select("id").limit(1);
console.log("Organizations query error:", formatError(serviceOrgs.error));
console.log("Organizations table reachable:", serviceOrgs.error ? "NO" : "YES");
console.log("PGRST002 present:", serviceOrgs.error?.code === "PGRST002" ? "YES" : "NO");

console.log("\n=== AUTHENTICATED: sign in + membership query ===");
const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: user.email,
});
if (linkError || !linkData.properties?.hashed_token) {
  console.log("generateLink failed:", linkError?.message ?? "no token");
  process.exit(1);
}

const anon = createClient(url, publishable, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: verifyError } = await anon.auth.verifyOtp({
  token_hash: linkData.properties.hashed_token,
  type: "email",
});
console.log("Authenticated session established:", verifyError ? "NO" : "YES");
if (verifyError) {
  console.log("verifyOtp error:", verifyError.message);
  process.exit(1);
}

const authedMembership = await anon
  .from("organization_members")
  .select("id")
  .eq("user_id", user.id)
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();
console.log("Authenticated query error:", formatError(authedMembership.error));
console.log("Authenticated membership row:", authedMembership.data ? "YES" : "NO");
console.log("PGRST002 present:", authedMembership.error?.code === "PGRST002" ? "YES" : "NO");

console.log("\n=== AUTHENTICATED: projects (other Infinity table) ===");
const authedProjects = await anon.from("projects").select("id").limit(1);
console.log("Projects query error:", formatError(authedProjects.error));
console.log("Projects table reachable:", authedProjects.error ? "NO" : "YES");

console.log("\n=== SUMMARY ===");
console.log(
  "Organization membership exists:",
  serviceMembership.data ? "YES" : "NO",
);
console.log(
  "Needs onboarding/org creation:",
  serviceMembership.data ? "NO" : "YES",
);
console.log("Needs new auth account: NO");
