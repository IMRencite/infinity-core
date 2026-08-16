import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    let val = trimmed.slice(separator + 1);
    const key = trimmed.slice(0, separator);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: runs } = await admin
  .from("product_asset_builder_runs")
  .select("id,status,engine_version,cumulative_cost_usd,builder_report,completed_at,idempotency_key")
  .eq("engine_version", "product_asset_builder_v2.1")
  .order("completed_at", { ascending: false })
  .limit(5);

const run =
  runs?.find((r) => r.idempotency_key?.includes("pab-v21-live") && r.status === "ready") ??
  runs?.find((r) => r.status === "ready") ??
  runs?.[0];

if (!run) {
  console.log(JSON.stringify({ runs }, null, 2));
  process.exit(0);
}

const runId = run.id;
const tables = {
  codingTasks: "product_asset_coding_tasks",
  changeSets: "product_asset_code_change_sets",
  mutations: "product_asset_workspace_mutations",
  providerCalls: "product_asset_provider_calls",
  reviewDefects: "product_asset_review_defects",
  validationRuns: "product_asset_validation_runs",
  featureContracts: "product_asset_feature_contracts",
  traceability: "product_asset_traceability_links",
  artifacts: "product_asset_production_artifacts",
};

const out = { run, counts: {}, samples: {} };

for (const [key, table] of Object.entries(tables)) {
  const { data, count, error } = await admin
    .from(table)
    .select("*", { count: "exact" })
    .eq("product_asset_builder_run_id", runId);
  if (error) out.counts[key] = { error: error.message };
  else {
    out.counts[key] = count;
    out.samples[key] = data?.slice(0, 5);
  }
}

// usage aggregation
const { data: calls } = await admin
  .from("product_asset_provider_calls")
  .select("provider,model_id,role,task_type,input_tokens,output_tokens,total_tokens,estimated_cost_usd,usage_source,success")
  .eq("product_asset_builder_run_id", runId);

const usageByProvider = {};
for (const c of calls ?? []) {
  const b = usageByProvider[c.provider] ?? { calls: 0, input: 0, output: 0, total: 0, cost: 0, models: new Set(), roles: new Set() };
  b.calls += 1;
  b.input += c.input_tokens;
  b.output += c.output_tokens;
  b.total += c.total_tokens;
  b.cost += Number(c.estimated_cost_usd);
  b.models.add(c.model_id);
  b.roles.add(c.role);
  usageByProvider[c.provider] = b;
}
out.usageByProvider = Object.fromEntries(
  Object.entries(usageByProvider).map(([k, v]) => [k, { ...v, models: [...v.models], roles: [...v.roles] }]),
);

console.log(JSON.stringify(out, null, 2));
