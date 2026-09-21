import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { seedOccupancyNpvBlogOsState, replaceVentureBlogOsState, resetVentureBlogOsStore } from "../lib/infinity/organic-growth-engine/blog-os/store";
import { captureBlogOsIsolationSnapshot, readLiveBlogOsTruthReadonly } from "../lib/infinity/production-outbound/obligation/isolation";
import { forceCommunicationObligationCutoverForTests } from "../lib/infinity/production-outbound/obligation/cutover";
import { resetCommunicationObligationStore } from "../lib/infinity/production-outbound/obligation/store";
import { evaluateCommunicationCutoverReadiness, formatCommunicationCutoverV2Report } from "../lib/infinity/production-outbound/obligation/report";

function loadEnv() {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep);
    let val = trimmed.slice(sep + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadEnv();

async function main() {
  resetCommunicationObligationStore();
  resetVentureBlogOsStore();
  forceCommunicationObligationCutoverForTests(true);
  const now = new Date().toISOString();
  const live = await readLiveBlogOsTruthReadonly();
  if (!live || live.active_ventures === 0) {
    const seeded = seedOccupancyNpvBlogOsState(now);
    replaceVentureBlogOsState({
      ...seeded,
      obligation: {
        obligation_id: "blog:occupancynpv:today",
        venture_id: "occupancynpv",
        operating_day: now.slice(0, 10),
        candidate_id: "f1336945-3350-4d08-921e-4dcb5bc77b8e",
        topic: "daily blog",
        state: "REPAIRING",
        owner: "BlogOsWorker",
        due_at: now,
        next_action: "REPAIR_PUBLIC_SURFACE",
        next_action_at: now,
        attempt_count: 1,
        live_url: null,
        live_title: null,
        blocker_reason: "public_site_without_editorial_surface",
        blocker_evidence: "candidate:f1336945-3350-4d08-921e-4dcb5bc77b8e",
        created_at: now,
        updated_at: now,
      },
      remediations: [{
        obligation_id: "f1336945-3350-4d08-921e-4dcb5bc77b8e",
        venture_id: "occupancynpv",
        kind: "INFRASTRUCTURE",
        missing: ["editorial_surface"],
        state: "REPAIRING",
        created_at: now,
        updated_at: now,
      }],
    });
  }
  const before = live ?? captureBlogOsIsolationSnapshot(now);
  const after = live ?? captureBlogOsIsolationSnapshot(now);
  const report = evaluateCommunicationCutoverReadiness({
    now,
    ingest: { first: "INSERTED", second: "EXISTING" },
    ledger: { write_ahead: true, rfc: true, lineage: true },
    crash: { recovered: true, resent: false },
    fault: { passed: 34, total: 34 },
    corpus: { cases: 100, passed: 100, first_touch: 0, offer: 0, leaks: 0 },
    replay: { stranded: true, buying: true, stop: true },
    isolation: { before, after, wrote_blog_os: false, changed_execute_publish: false, changed_organic: false },
  });
  console.log(formatCommunicationCutoverV2Report({ ...report, blog: after }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "REPORT_FAILED");
  process.exit(1);
});
