import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SRC = process.cwd();
const BASE = "0eb2cc70adcc98b115088a3ef118715e9bd63b80";
const DEST = join(process.env.USERPROFILE || "C:\\Users\\Antivist", "InfinityForensicV14");
mkdirSync(DEST, { recursive: true });

const missingFromPrior = [
  "lib/infinity/autonomous-sales-execution/contract.ts",
  "lib/infinity/autonomous-sales-execution/cycle.ts",
  "lib/infinity/daily-improvement-engine/index.ts",
  "lib/infinity/hq-venture-selection/index.ts",
  "lib/infinity/qc-escape/escaped-defect-registry.ts",
  "lib/infinity/sales-learning/method.ts",
  "lib/infinity/venture-operating-scale/post-launch-operating-runtime.ts",
  "lib/infinity/venture-operating-scale/constants.ts",
  "lib/infinity/operator-console/attach-global-hq-floor.ts",
  "components/dashboard/operator-console/venture-intelligence-panel.tsx",
];

function git(args) {
  return spawnSync("git", args, { cwd: SRC, encoding: "utf8" }).stdout || "";
}

const rows = [];
for (const path of missingFromPrior) {
  const dirty = existsSync(join(SRC, path));
  const inBase = git(["cat-file", "-e", `${BASE}:${path}`]).length >= 0
    ? spawnSync("git", ["cat-file", "-e", `${BASE}:${path}`], { cwd: SRC }).status === 0
    : false;
  const log = git(["log", "--all", "--pretty=%h %s", "--", path]).trim().split(/\r?\n/).filter(Boolean).slice(0, 8);
  rows.push({
    path,
    in_current_dirty_tree: dirty,
    in_0eb2cc70: inBase,
    history_commits: log,
    history_count: log.length,
  });
}

writeFileSync(join(DEST, "v14-module-history-sample.json"), `${JSON.stringify({ collected_at: new Date().toISOString(), rows }, null, 2)}\n`);
console.log(JSON.stringify({ collected_at: new Date().toISOString(), rows }, null, 2));
