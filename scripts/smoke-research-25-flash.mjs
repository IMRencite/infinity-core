/**
 * Quick live grounded research smoke test with gemini-2.5-flash.
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

const orgId = "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const { runGroundedResearch } = await import("../lib/infinity/research/run.ts");

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const result = await runGroundedResearch(admin, {
  organizationId: orgId,
  researchObjective:
    "Research SMB construction SaaS customer acquisition cost benchmarks. Cite public sources with URLs.",
  providerId: "gemini",
  modelId: "gemini-2.5-flash",
  idempotencyKey: `cac-smoke-${Date.now()}`,
  runPurpose: "probe_smoke",
  requireSourceBackedFindings: true,
});

console.log(JSON.stringify({
  ok: result.ok,
  failure: result.ok ? null : result.failure.message,
  researchRunId: result.ok ? result.result.researchRunId : result.failure.researchRunId,
  sourceCount: result.ok ? result.result.sources.length : 0,
  evidenceCount: result.ok ? result.result.evidence.length : 0,
  sources: result.ok ? result.result.sources.slice(0, 5).map((s) => s.url) : [],
}, null, 2));
