/**
 * Verify scanner database probe latency (same query FAVC1 uses).
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

const orgId =
  process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ??
  "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const startedAt = Date.now();
const { error } = await admin
  .from("opportunity_discovery_runs")
  .select("id")
  .eq("organization_id", orgId)
  .limit(1);
const elapsedMs = Date.now() - startedAt;

console.log("probeTable: opportunity_discovery_runs");
console.log("operation: SELECT id WHERE organization_id = ? LIMIT 1");
console.log("elapsedMs:", elapsedMs);
console.log("errorCode:", error?.code ?? "none");
console.log("errorMessage:", error?.message ?? "none");
console.log("57014:", error?.code === "57014" ? "YES" : "NO");
process.exit(error ? 1 : 0);
