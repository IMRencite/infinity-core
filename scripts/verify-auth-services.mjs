/**
 * Verify Supabase Auth and PostgREST independently.
 * Usage: node scripts/verify-auth-services.mjs [email] [password]
 * Does not print secrets, tokens, or passwords.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

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

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function envStatus(name, value) {
  if (!value) return "MISSING";
  if (name.includes("URL") && !/^https?:\/\/.+/.test(value)) return "MALFORMED";
  if (value.length < 20) return "MALFORMED";
  return "PRESENT";
}

console.log("ENV NEXT_PUBLIC_SUPABASE_URL:", envStatus("URL", url));
console.log("ENV public/publishable key:", envStatus("KEY", key));
console.log(
  "ENV SUPABASE_SERVICE_ROLE_KEY:",
  envStatus("KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
);

if (!url || !key) {
  process.exit(1);
}

/** @type {{ name: string; value: string }[]} */
let cookieJar = [];

function createCookieServerClient() {
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieJar;
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          const index = cookieJar.findIndex((entry) => entry.name === cookie.name);
          if (!cookie.value) {
            if (index >= 0) cookieJar.splice(index, 1);
            continue;
          }
          const entry = { name: cookie.name, value: cookie.value };
          if (index >= 0) cookieJar[index] = entry;
          else cookieJar.push(entry);
        }
      },
    },
  });
}

const email = process.argv[2];
const password = process.argv[3];

console.log("\n--- PostgREST ---");
try {
  const rest = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const postgrestHealthy = rest.status !== 503 && rest.status !== 502;
  console.log("PostgREST reachable:", postgrestHealthy ? "YES" : "NO");
  console.log("PostgREST status:", rest.status);
  if (!postgrestHealthy) {
    const body = await rest.text();
    if (body.includes("PGRST002")) console.log("PostgREST error: PGRST002 schema cache");
  }
} catch (error) {
  console.log("PostgREST reachable: NO");
  console.log("PostgREST error:", error instanceof Error ? error.message : String(error));
}

console.log("\n--- Auth API ---");
if (!email || !password) {
  console.log("signIn test: SKIPPED (pass email and password args for live sign-in test)");
  process.exit(0);
}

const direct = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const signInStarted = Date.now();
const { data: directData, error: directError } = await direct.auth.signInWithPassword({
  email,
  password,
});

console.log("signInWithPassword completed:", directError ? "YES (with error)" : "YES");
console.log("user returned:", directData.user ? "YES" : "NO");
console.log("session returned:", directData.session ? "YES" : "NO");
if (directError) {
  console.log("auth error code:", directError.code ?? "none");
  console.log("auth error message:", directError.message);
  process.exit(1);
}

console.log("signIn elapsed ms:", Date.now() - signInStarted);

console.log("\n--- SSR cookie round-trip ---");
cookieJar = [];
const serverClient = createCookieServerClient();
const { error: serverSignInError } = await serverClient.auth.signInWithPassword({
  email,
  password,
});
console.log("server signIn error:", serverSignInError ? serverSignInError.message : "none");
console.log("auth cookies in jar:", cookieJar.filter((c) => c.name.includes("-auth-token")).length);

const reader = createCookieServerClient();
const {
  data: { user },
  error: userError,
} = await reader.auth.getUser();

console.log("getUser after cookie write user:", user ? "YES" : "NO");
console.log("getUser error:", userError?.message ?? "none");

process.exit(user ? 0 : 1);
