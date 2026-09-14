import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateServedArtifactIdentityGate,
  servedBuildContainsVerifiedHqRepairs,
  sourceContainsVerifiedHqRepairs,
} from "../lib/infinity/operator-console/served-artifact-identity";

function keyPresent(env: string, key: string): "YES" | "NO" {
  const line = env.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  if (!line) return "NO";
  const value = line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
  return value.length > 0 ? "YES" : "NO";
}

function mercuryHost(env: string): string {
  const line = env.split(/\r?\n/).find((row) => row.startsWith("MERCURY_BASE_URL="));
  if (!line) return "api.mercury.com";
  const raw = line.slice("MERCURY_BASE_URL=".length).trim().replace(/^['"]|['"]$/g, "");
  try {
    return new URL(raw).host;
  } catch {
    return "INVALID";
  }
}

function walkJs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(path, acc);
    else if (entry.name.endsWith(".js")) acc.push(path);
  }
  return acc;
}

const envPath = ".env.local";
const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const compiled = walkJs(join(".next", "server"))
  .map((path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return "";
    }
  })
  .join("\n");
const sourceContains = sourceContainsVerifiedHqRepairs({
  treasuryCashTruth: readFileSync("lib/infinity/financial-truth/treasury-cash-truth.ts", "utf8"),
  commandCycle: readFileSync("lib/infinity/operator-console/command-cycle-capability.ts", "utf8"),
  codingCapability: readFileSync("lib/infinity/capability-truth/coding.ts", "utf8"),
});
const servedContains = servedBuildContainsVerifiedHqRepairs(compiled);
const gate = evaluateServedArtifactIdentityGate({
  port: 3000,
  working_directory: process.cwd(),
  startup_command: "next start",
  served_build_path: join(process.cwd(), ".next"),
  served_build_id: existsSync(".next/BUILD_ID") ? readFileSync(".next/BUILD_ID", "utf8").trim() : null,
  served_build_at: existsSync(".next/BUILD_ID") ? statSync(".next/BUILD_ID").mtime.toISOString() : null,
  source_head: "992f4e5a10c4e7857bf14a80d489a992f051e175",
  source_contains_repairs: sourceContains,
  served_contains_repairs: servedContains,
});

process.stdout.write(
  `${JSON.stringify(
    {
      cwd: process.cwd(),
      MERCURY_ENABLED: keyPresent(env, "MERCURY_ENABLED"),
      MERCURY_API_TOKEN: keyPresent(env, "MERCURY_API_TOKEN"),
      mercury_host: mercuryHost(env),
      env_mtime: existsSync(envPath) ? statSync(envPath).mtime.toISOString() : null,
      build_id: existsSync(".next/BUILD_ID") ? readFileSync(".next/BUILD_ID", "utf8").trim() : null,
      build_at: existsSync(".next/BUILD_ID") ? statSync(".next/BUILD_ID").mtime.toISOString() : null,
      source_contains_repairs: sourceContains,
      served_contains_repairs: servedContains,
      gate,
    },
    null,
    2,
  )}\n`,
);
