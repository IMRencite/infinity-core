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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
const user = users?.users?.[0];
if (!user) {
  console.log("No user");
  process.exit(1);
}

console.log("user email domain present:", Boolean(user.email?.includes("@")));
console.log("email confirmed:", Boolean(user.email_confirmed_at));

const { data: memberships, error } = await admin
  .from("organization_members")
  .select("organization_id, role, deleted_at")
  .eq("user_id", user.id);

console.log("membership query error:", error?.message ?? "none");
console.log("membership rows:", memberships?.length ?? 0);
const active = (memberships ?? []).filter((row) => !row.deleted_at);
console.log("active memberships:", active.length);
