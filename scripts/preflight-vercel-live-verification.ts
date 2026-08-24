import {
  buildVercelGovernedVerificationSession,
  parseMaxUsd,
  sessionPublicReport,
} from "@/lib/infinity/governed-deployment-execution";
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
const session = buildVercelGovernedVerificationSession({ maxAuthorizedUsd });
const report = sessionPublicReport(session);
console.log(JSON.stringify(report, null, 2));
process.exit(report.safeToExecuteLive ? 0 : 1);
