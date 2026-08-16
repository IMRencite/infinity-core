import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      let val = trimmed.slice(separator + 1);
      const key = trimmed.slice(0, separator);
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  "performance_intelligence_runs",
  "performance_intelligence_build_packages",
  "performance_sources",
  "performance_observations",
  "performance_events",
  "performance_metric_aggregates",
  "performance_learning_decisions",
  "performance_traceability_links",
];

const counts = {};
for (const table of tables) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) {
    console.error(table, error.message);
    process.exit(1);
  }
  counts[table] = count ?? 0;
}

console.log(JSON.stringify(counts, null, 2));
