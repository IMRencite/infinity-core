import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const keys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_INTEGRATION_TEST_EMAIL",
  "AUTH_INTEGRATION_TEST_PASSWORD",
];

function status(key, lines) {
  const line = lines.find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return "MISSING";
  const value = line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  if (!value) return "MISSING";
  if (key.includes("URL") && !/^https?:\/\/.+/.test(value)) return "MALFORMED";
  if (value.length < 20) return "MALFORMED";
  return "PRESENT";
}

if (!existsSync(envPath)) {
  console.log("ENV_FILE: MISSING");
  process.exit(0);
}

const lines = readFileSync(envPath, "utf8").split("\n");
console.log("ENV_FILE: PRESENT");
for (const key of keys) {
  console.log(`${key}: ${status(key, lines)}`);
}
