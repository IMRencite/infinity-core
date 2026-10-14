#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, "");
}

const { createAdminClient } = await import("../lib/supabase/admin.ts");
const { syncValidationQueueFromPersistence } = await import(
  "../lib/infinity/venture-discovery/venture-candidate-validation-queue-v1.ts"
);

const orgId = process.env.FIRST_AUTONOMOUS_VENTURE_ORG_ID ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";
const admin = createAdminClient();
const snapshot = await syncValidationQueueFromPersistence(admin, orgId, {
  cycleKey: "v40-retry-1791892064524",
});
console.log(JSON.stringify({ ok: true, count: snapshot.entries.length, ids: snapshot.entries.map((e) => e.candidate_id) }, null, 2));
