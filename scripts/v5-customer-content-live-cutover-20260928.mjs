#!/usr/bin/env node
/**
 * V5 customer content live cutover — preview deploy, QA, alias promote, live QA.
 * Usage:
 *   node scripts/v5-customer-content-live-cutover-20260928.mjs occupancy-preview
 *   node scripts/v5-customer-content-live-cutover-20260928.mjs occupancy-promote <deploymentId>
 *   node scripts/v5-customer-content-live-cutover-20260928.mjs club-preview
 *   node scripts/v5-customer-content-live-cutover-20260928.mjs club-promote <deploymentId>
 *   node scripts/v5-customer-content-live-cutover-20260928.mjs qa <baseUrl> occupancy|club
 */
import { createHash } from "node:crypto";
import { execSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const LEAK =
  /learning check|learning test|teaching sample|actionability|section-depth|founder review|compose pass|preview pass|publication hold|\bcandidate\b|\bfixture\b|\bgate\b|\bQC\b|cadence|provider readiness|store id|after this page a reader should|for learning the method/i;

const OCC_PATHS = [
  "/blog/valuation/how-is-cap-rate-calculated-for-a-building/",
  "/blog/valuation/how-interest-rates-affect-commercial-property-values/",
  "/blog/occupancy-costs/cam-first-year/",
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
  "/lease-comparison/what-numbers-do-you-need-to-compare-two-commercial-leases/",
  "/blog/leasing/what-is-occupancy-cost-versus-rent/",
];

const CT_PATHS = [
  "/journal/apparel/how-riders-choose-a-shirt/",
  "/journal/night-riding/how-to-ride-after-dark/",
  "/journal/culture/bike-night-etiquette/",
  "/journal/culture/garage-culture-as-rider-social-life/",
  "/journal/rides/group-ride-etiquette/",
  "/journal/apparel/streetwear-vs-riding-gear/",
];

const CT_FOREIGN =
  /occupancynpv|cap rate|commercial lease|compare-commercial-leases|\bCAM\b|occupancy cost/i;

function sha() {
  return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
}

function stripVisible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function qaBase(baseUrl, mode) {
  const paths = mode === "club" ? CT_PATHS : OCC_PATHS;
  const results = [];
  for (const path of paths) {
    const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
    const res = await fetch(url, { redirect: "follow" });
    const html = await res.text();
    const visible = stripVisible(html);
    const leaks = visible.match(new RegExp(LEAK.source, "gi")) ?? [];
    const foreign =
      mode === "club" ? (visible.match(new RegExp(CT_FOREIGN.source, "gi")) ?? []) : [];
    const words = visible.split(/\s+/).filter(Boolean).length;
    results.push({
      path,
      url,
      status: res.status,
      words,
      leak_hits: [...new Set(leaks.map((x) => x.toLowerCase()))],
      foreign_hits: [...new Set(foreign.map((x) => x.toLowerCase()))],
      pass: res.ok && leaks.length === 0 && foreign.length === 0 && words >= 800,
      body_hash: createHash("sha256").update(visible).digest("hex").slice(0, 16),
    });
  }
  const clean = results.filter((r) => r.pass).length;
  return { baseUrl, mode, clean, total: paths.length, results };
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const reportPath = ".infinity/blog-os/v5-customer-content-live-cutover-20260928.json";
  const releaseSha = sha();

  if (cmd === "qa") {
    const report = await qaBase(arg, process.argv[4] === "club" ? "club" : "occupancy");
    console.log(JSON.stringify(report, null, 2));
    writeFileSync(reportPath, `${JSON.stringify({ releaseSha, ...report, at: new Date().toISOString() }, null, 2)}\n`);
    process.exit(report.clean === report.total ? 0 : 1);
  }

  if (cmd === "occupancy-preview") {
    const run = spawnSync("npx", ["tsx", "scripts/v65-occupancy-deploy-preview-only.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: "inherit",
    });
    process.exit(run.status ?? 1);
  }

  if (cmd === "occupancy-promote") {
    if (!arg?.startsWith("dpl_")) {
      console.error("usage: occupancy-promote <deploymentId>");
      process.exit(1);
    }
    const run = spawnSync("npx", ["tsx", "scripts/v65-occupancy-deploy-preview-only.ts", "promote", arg], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: "inherit",
    });
    process.exit(run.status ?? 1);
  }

  if (cmd === "club-preview") {
    const run = spawnSync("npx", ["tsx", "scripts/club-throttle-preview-deploy.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: "inherit",
    });
    process.exit(run.status ?? 1);
  }

  if (cmd === "club-promote") {
    if (!arg?.startsWith("dpl_")) {
      console.error("usage: club-promote <deploymentId>");
      process.exit(1);
    }
    const run = spawnSync("npx", ["tsx", "scripts/club-throttle-preview-deploy.ts", "promote", arg], {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: "inherit",
    });
    process.exit(run.status ?? 1);
  }

  console.log(`Release SHA: ${releaseSha}`);
  console.log("Commands: occupancy-preview | occupancy-promote <dpl> | club-preview | club-promote <dpl> | qa <url> occupancy|club");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
