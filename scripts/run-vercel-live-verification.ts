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
const first = buildVercelGovernedVerificationSession({ maxAuthorizedUsd });
const second = buildVercelGovernedVerificationSession({ maxAuthorizedUsd });
if (
  first.executionRequest?.executionRequestId &&
  first.executionRequest.executionRequestId !== second.executionRequest?.executionRequestId
) {
  console.error("Vercel live verification refused: recomputed executionRequestId did not match.");
  process.exit(1);
}

const report = sessionPublicReport(second);
console.log(JSON.stringify(report, null, 2));

if (!report.safeToExecuteLive) {
  console.error("Vercel live verification refused: preflight blockers remain. No Vercel write was performed.");
  process.exit(1);
}

console.error(
  "Vercel live verification refused: session recomputed and preflight passed, but this command will not execute LIVE in this milestone.",
);
process.exit(1);
