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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const runId = "88240a41-eab2-4c5d-b520-31b1523580a4";
const { data: run } = await admin.from("research_runs").select("id,status,structured_result").eq("id", runId).maybeSingle();
const evidence = run?.structured_result?.evidence ?? [];
const { data: idea } = await admin
  .from("founder_idea_submissions")
  .select("id,scores_json,infinity_decision,status")
  .eq("id", "69d45f14-ca07-4a30-b601-54af6d05953f")
  .maybeSingle();
const scores = idea?.scores_json ?? {};
console.log(
  JSON.stringify(
    {
      latestRun: scores.researchRunId,
      matchesLive: scores.researchRunId === runId,
      persistedRevenue: Boolean(scores.revenueModel),
      persistedBench: Boolean(scores.benchmarkEconomics),
      persistedExplain: Boolean(scores.explainability),
      buildReady: scores.buildReady,
      decision: idea?.infinity_decision,
      status: idea?.status,
      pricingClaims: evidence
        .filter((item) => /\$|month|churn|margin|CAC|setup|subscription/i.test(item.claim))
        .map((item) => ({ signalType: item.signalType, claim: item.claim, grounded: item.grounded, urls: item.sourceUrls })),
    },
    null,
    2,
  ),
);
