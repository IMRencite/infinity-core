import { readFileSync } from "node:fs";
import { executeAutonomousSalesCycle } from "../lib/infinity/autonomous-sales-execution/cycle";
import { executeProspectIntelligenceCycle } from "../lib/infinity/prospect-intelligence/cycle";
import { createProspectIntelligenceService } from "../lib/infinity/prospect-intelligence/service";
import { getDefaultProspectGraph } from "../lib/infinity/prospect-intelligence/store";
import { salesSnapshotToOccupancy } from "../lib/infinity/public-operations-projection/derive-occupancy";
import { publishCanonicalPublicOccupancy } from "../lib/infinity/public-operations-projection/publish-occupancy";
import { loadInternalPublicObservation } from "../lib/infinity/public-operations-projection/sources";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 1) continue;
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  const now = new Date().toISOString();
  const observation = loadInternalPublicObservation({ now });
  const prospect = await executeProspectIntelligenceCycle({
    service: createProspectIntelligenceService(getDefaultProspectGraph()),
    now,
    watching: true,
    acquire: true,
  });
  const sales = salesSnapshotToOccupancy(executeAutonomousSalesCycle({ now, executeSend: false }));
  const occupancy = await publishCanonicalPublicOccupancy({
    now,
    loop: observation.loop,
    prospect: { activity: prospect.activity },
    sales,
  });
  console.log(JSON.stringify({
    ok: true,
    summary: occupancy.summary,
    prospect: occupancy.departments.PROSPECT_INTELLIGENCE,
    growth: occupancy.departments.GROWTH,
    sales: occupancy.sales_rooms.OUTBOUND_ACQUISITION,
    generated_at: occupancy.generated_at,
  }));
}

void main();
