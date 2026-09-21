/**
 * Extract Supabase project refs from env without printing secrets.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    let val = trimmed.slice(sep + 1);
    const key = trimmed.slice(0, sep);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function refFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? "MALFORMED";
  } catch {
    return "MALFORMED";
  }
}

function refFromJwt(jwt) {
  if (!jwt) return "MISSING";
  const parts = jwt.split(".");
  if (parts.length < 2) return "MALFORMED";
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload.ref ?? payload.project_id ?? "UNKNOWN";
  } catch {
    return "MALFORMED";
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Browser/server URL project ref:", refFromUrl(url ?? ""));
console.log("Publishable key project ref:", refFromJwt(publishable));
console.log("Service-role key project ref:", refFromJwt(serviceRole));

const refs = new Set([
  refFromUrl(url ?? ""),
  refFromJwt(publishable),
  refFromJwt(serviceRole),
].filter((r) => r && !["MISSING", "MALFORMED", "UNKNOWN"].includes(r)));

console.log("All same project:", refs.size <= 1 ? "YES" : "NO");
if (refs.size > 1) console.log("Distinct refs:", [...refs].join(", "));

for (const [label, value] of [
  ["Publishable key format", publishable],
  ["Service-role key format", serviceRole],
]) {
  if (!value) {
    console.log(`${label}: MISSING`);
    continue;
  }
  const looksJwt = value.split(".").length === 3;
  console.log(
    `${label}: prefix=${value.slice(0, 15)}… length=${value.length} jwt=${looksJwt}`,
  );
}

if (url && serviceRole) {
  const admin = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
  if (error) {
    console.log("Admin listUsers:", "ERROR", error.message);
  } else {
    console.log("Users in project (count sample):", data.users.length, "(first page, max 5)");
    for (const u of data.users) {
      console.log(
        `  user id=${u.id.slice(0, 8)}… email_confirmed=${Boolean(u.email_confirmed_at)} banned=${Boolean(u.banned_until)}`,
      );
    }
  }
}
