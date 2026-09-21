/**
 * Read-only verification: cycle-1786944700372 room artifacts from persisted records.
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

const cycleKey = process.argv[2] ?? "cycle-1786944700372";
const orgId = process.argv[3] ?? "8ba4459b-e5f5-4ca3-86db-fbe6bbd51494";

const { resolveLatestFavc1Cycle } = await import(
  "../lib/infinity/operator-console/favc1-cycle/resolve-active-cycle.ts"
);
const { buildFavc1CycleSnapshot } = await import(
  "../lib/infinity/operator-console/favc1-cycle/build-cycle-snapshot.ts"
);

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const cycle = await resolveLatestFavc1Cycle(admin, orgId, cycleKey);
if (!cycle) {
  console.error("Cycle not found");
  process.exit(1);
}

const { snapshot } = await buildFavc1CycleSnapshot(admin, cycle);

const counts = {
  opportunity: snapshot.roomArtifacts?.opportunity_lab?.length ?? 0,
  research: snapshot.roomArtifacts?.research_department?.length ?? 0,
  monetization: snapshot.roomArtifacts?.strategy_finance?.length ?? 0,
  selection: snapshot.roomArtifacts?.company_operations?.length ?? 0,
  validation: snapshot.roomArtifacts?.quality_control?.length ?? 0,
  command: snapshot.roomArtifacts?.executive_office?.length ?? 0,
};

console.log(JSON.stringify({ cycleKey, counts, handoffStage: snapshot.handoffStage }, null, 2));

console.log("\n=== SAMPLE ARTIFACT IDS ===");
for (const [room, items] of Object.entries(snapshot.roomArtifacts ?? {})) {
  console.log(
    room,
    (items ?? []).slice(0, 3).map((a) => ({ type: a.artifactType, id: a.sourceRecordId, state: a.state })),
  );
}
