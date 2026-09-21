/**
 * Verify SSR cookie round-trip using admin-created session (no operator password).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  process.env[trimmed.slice(0, sep)] = trimmed.slice(sep + 1).replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishable || !serviceRole) {
  console.log("Missing env");
  process.exit(1);
}

/** @type {{ name: string; value: string }[]} */
let jar = [];

function makeServerClient() {
  return createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return jar;
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const index = jar.findIndex((entry) => entry.name === cookie.name);
          if (!cookie.value) {
            if (index >= 0) jar.splice(index, 1);
            continue;
          }
          const entry = { name: cookie.name, value: cookie.value };
          if (index >= 0) jar[index] = entry;
          else jar.push(entry);
        }
      },
    },
  });
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1 });
if (listError || !users.users[0]) {
  console.log("listUsers failed:", listError?.message ?? "no users");
  process.exit(1);
}

const userId = users.users[0].id;
console.log("userId present: YES");

const { data: sess, error: sessErr } = await admin.auth.admin.createSession({ user_id: userId });
console.log("createSession error:", sessErr?.message ?? "none");
console.log("session created:", sess.session ? "YES" : "NO");
if (!sess.session) process.exit(1);

jar = [];
const writer = makeServerClient();
const { error: setErr } = await writer.auth.setSession({
  access_token: sess.session.access_token,
  refresh_token: sess.session.refresh_token,
});
console.log("setSession error:", setErr?.message ?? "none");
console.log(
  "cookie names after setSession:",
  jar.map((c) => c.name).join(", ") || "(none)",
);
console.log("auth cookie count:", jar.filter((c) => c.name.includes("-auth-token")).length);

const reader = makeServerClient();
const {
  data: { user },
  error: userError,
} = await reader.auth.getUser();
console.log("getUser after cookie write:", user ? "YES" : "NO");
console.log("getUser error:", userError?.message ?? "none");

process.exit(user ? 0 : 1);
