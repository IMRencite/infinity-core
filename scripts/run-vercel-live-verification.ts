import {
  createLaunchGatewayGdeLiveActionLedger,
  isDurableLedgerUuid,
  parseMaxUsd,
  runVercelGovernedLiveVerification,
} from "@/lib/infinity/governed-deployment-execution";
import { createAdminClient } from "@/lib/supabase/admin";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  try {
    const content = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator);
      let val = trimmed.slice(separator + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();
const maxAuthorizedUsd = parseMaxUsd(process.argv, process.env);
const organizationId = process.env.INFINITY_VERCEL_ORGANIZATION_ID ?? "";
const missionId = process.env.INFINITY_VERCEL_MISSION_ID ?? "";
let liveLedger = null;
try {
  if (isDurableLedgerUuid(organizationId) && isDurableLedgerUuid(missionId)) {
    liveLedger = createLaunchGatewayGdeLiveActionLedger(createAdminClient(), {
      organizationId,
      missionId,
      ventureId: process.env.INFINITY_VERCEL_TEST_RESOURCE ?? "infinity-test-live-verification-gde",
    });
  }
} catch {
  liveLedger = null;
}
const result = await runVercelGovernedLiveVerification({ maxAuthorizedUsd, liveLedger });
console.log(JSON.stringify(result, null, 2));
if (result.state !== "SUCCEEDED") {
  process.exit(1);
}
