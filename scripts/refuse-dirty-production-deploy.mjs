import { spawnSync } from "node:child_process";

const status = spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" });
const rows = (status.stdout || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
const allow = new Set([".infinity/blog-os/", ".infinity/observer-setup/"]);
const tracked = rows.filter((row) => /^[ MADRCU]{2}/.test(row) && !row.startsWith("??"));
const untracked = rows.filter((row) => row.startsWith("??")).map((row) => row.slice(3));
const blockedUntracked = untracked.filter((path) => ![...allow].some((prefix) => path.startsWith(prefix)));

if (tracked.length || blockedUntracked.length) {
  console.log(JSON.stringify({
    ok: false,
    reason: "DIRTY_TREE_PRODUCTION_DEPLOY_REFUSED",
    tracked_modifications: tracked.length,
    staged_or_unstaged: tracked.length,
    untracked_non_allowlisted: blockedUntracked.length,
  }));
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, dirty_deploy_refusal: "PASS" }));
