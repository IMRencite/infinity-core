import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  evaluateServedArtifactIdentityGate,
  servedBuildContainsVerifiedHqRepairs,
  sourceContainsVerifiedHqRepairs,
} from "../lib/infinity/operator-console/served-artifact-identity";
import { evaluateFounderHqRuntimeSourceGate } from "../lib/infinity/operator-console/local-hq-proof";
import { executeAutonomousDailyOperatingLoop } from "../lib/infinity/autonomous-operating-loop/loop";
import { loadCapitalLedger } from "../lib/infinity/financial-truth/capital-ledger";
import { projectVentureSpendAuthority } from "../lib/infinity/financial-truth/spend-authority";
import { CRE_VENTURE_ID } from "../lib/infinity/venture-operating-scale/constants";
import { readOccupancynpvFirstGrowthExperiment } from "../lib/infinity/growth-engine/occupancynpv-experiment";
import { evaluateNoMoneyMovementGate } from "../lib/infinity/financial-truth/financial-commitment-gates";
import { AUTONOMOUS_COMMITMENT_CREATION_ENABLED } from "../lib/infinity/financial-truth/spend-authority";

function walkJs(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkJs(path, acc);
    else if (entry.name.endsWith(".js")) acc.push(path);
  }
  return acc;
}

function listenerPid(): string | null {
  try {
    const out = execSync('netstat -ano | findstr "LISTENING" | findstr ":3000"', { encoding: "utf8" });
    const match = out.match(/\s(\d+)\s*$/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function processCommand(pid: string | null): string {
  if (!pid) return "UNKNOWN";
  try {
    return execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\").CommandLine"`,
      { encoding: "utf8" },
    ).trim();
  } catch {
    return "UNKNOWN";
  }
}

const cwd = process.cwd();
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
const loopInSource = readFileSync("lib/infinity/autonomous-operating-loop/loop.ts", "utf8").includes("AutonomousDailyOperatingLoop");
const loopInServed = compiled.includes("AutonomousDailyOperatingLoop") && compiled.includes("EXISTING_GROWTH_CAMPAIGN_CONTINUES_WITHOUT_NEW_MISSION");
const pid = listenerPid();
const command = processCommand(pid);
const identity = evaluateServedArtifactIdentityGate({
  port: 3000,
  working_directory: cwd,
  startup_command: "next start",
  served_build_path: join(cwd, ".next"),
  served_build_id: existsSync(".next/BUILD_ID") ? readFileSync(".next/BUILD_ID", "utf8").trim() : null,
  served_build_at: existsSync(".next/BUILD_ID") ? statSync(".next/BUILD_ID").mtime.toISOString() : null,
  source_head: "064ad387dd1bd1b360fa91db293c05065dd24a2f",
  source_contains_repairs: sourceContains && loopInSource,
  served_contains_repairs: servedContains && loopInServed,
});
const runtimeGate = evaluateFounderHqRuntimeSourceGate({ inspectedOrigin: "http://localhost:3000" });
const evalResult = executeAutonomousDailyOperatingLoop({
  persist: false,
  createMission: false,
  executeExternal: false,
});
const authority = projectVentureSpendAuthority(loadCapitalLedger(), CRE_VENTURE_ID);
const campaign = readOccupancynpvFirstGrowthExperiment();
const money = evaluateNoMoneyMovementGate({
  mercuryWriteAccess: false,
  moneyMovementEnabled: false,
  achEnabled: false,
  wireEnabled: false,
  cardsEnabled: false,
  recipientCreationEnabled: false,
  externalPurchaseEnabled: false,
});

const payload = {
  runtime: {
    origin: "http://localhost:3000",
    port: 3000,
    pid,
    command,
    cwd,
    next_start: /next/i.test(command) && /start/i.test(command),
    build_id: existsSync(".next/BUILD_ID") ? readFileSync(".next/BUILD_ID", "utf8").trim() : null,
    build_at: existsSync(".next/BUILD_ID") ? statSync(".next/BUILD_ID").mtime.toISOString() : null,
  },
  identity: {
    sourceContains,
    servedContains,
    loopInSource,
    loopInServed,
    gate: identity,
    founderHq: runtimeGate,
  },
  decision: evalResult.decision,
  portfolio_state: evalResult.portfolio_state,
  mission_created: evalResult.mission_created,
  action_executed: evalResult.action_executed,
  occupancy: evalResult.observation.occupancy,
  askreview: evalResult.observation.askreview,
  campaign: campaign
    ? {
        campaign_id: campaign.campaign_id,
        status: campaign.status,
        authorized_to_execute: campaign.authorized_to_execute,
        daily_new_contact_target: campaign.daily_new_contact_target,
        conservative_daily_ramp: campaign.conservative_daily_ramp,
        last_cycle_at: campaign.last_cycle_at,
        next_learning_objective: campaign.next_learning_objective,
        ledger: campaign.ledger,
        incidents: campaign.incidents,
      }
    : null,
  finance: {
    remaining_spend_authority: authority.remaining_spend_authority,
    unused_allocation: authority.unused_allocation,
    allocation_amount: authority.allocation_amount,
    committed: authority.committed_amount,
    actual_spend: authority.actual_spend_amount,
    paid_acquisition: authority.paid_acquisition_authority,
    money_moved: authority.money_moved,
    autonomous_commitment_enabled: AUTONOMOUS_COMMITMENT_CREATION_ENABLED,
  },
  money_gate: money,
  next_review: evalResult.state.next_daily_review_at,
};

mkdirSync(".qc-runtime", { recursive: true });
writeFileSync(".qc-runtime/autonomous-loop-final-verification.json", `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
