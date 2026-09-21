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

const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const { runGroundedResearch } = await import("../lib/infinity/research/run.ts");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

for (let i = 0; i < 3; i++) {
  const key = `cac-retry-probe-${Date.now()}-${i}`;
  console.log(`\n=== attempt ${i + 1} key=${key} ===`);
  const result = await runGroundedResearch(admin, {
    organizationId: orgId,
    researchObjective:
      "Find public SaaS CAC benchmarks for SMB construction or field service software. Include CPC data if available.",
    providerId: "gemini",
    idempotencyKey: key,
    runPurpose: "probe_retry",
    requireSourceBackedFindings: true,
  });
  console.log({
    ok: result.ok,
    msg: result.ok ? null : result.failure.message,
    runId: result.ok ? result.result.researchRunId : result.failure.researchRunId,
    sources: result.ok ? result.result.sources.length : 0,
    urls: result.ok ? result.result.sources.slice(0, 3).map((s) => s.url) : [],
  });
  if (result.ok && result.result.sources.length > 0) break;
}
