/**
 * Test Supabase Auth API key acceptance without credentials.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sep = trimmed.indexOf("=");
  if (sep === -1) continue;
  let val = trimmed.slice(sep + 1);
  process.env[trimmed.slice(0, sep)] = val.replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const tokenUrl = `${url}/auth/v1/token?grant_type=password`;
const response = await fetch(tokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({ email: "probe-invalid@example.com", password: "wrong-password-probe" }),
});

const body = await response.json().catch(() => ({}));
console.log("Request fired: YES");
console.log("HTTP status:", response.status);
console.log("Supabase error code:", body.error_code ?? body.code ?? "none");
console.log("Supabase message:", body.msg ?? body.error_description ?? body.message ?? "none");
console.log("API key accepted:", response.status !== 401 || body.error_code === "invalid_credentials" ? "YES" : "NO");
