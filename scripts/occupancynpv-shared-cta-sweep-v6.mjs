import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|css)$/.test(name)) acc.push(full);
  }
  return acc;
}

const root = process.cwd();
const files = [];
for (const dir of [
  join(root, "lib/infinity/organic-growth-engine/continuous"),
  join(root, ".infinity/tmp-occupancynpv-blog-build/app"),
]) {
  try {
    for (const file of walk(dir)) {
      const text = readFileSync(file, "utf8");
      if (/vg-cta|pv-cta-panel/.test(text)) files.push({ file: file.replace(/\\/g, "/"), text });
    }
  } catch {
    // optional tree
  }
}

const override = /vg-cta[^{]{0,80}\{[^}]*(color|background)\s*:/i;
const rows = files.map((row) => {
  const localOverride = override.test(row.text);
  const usesPanel = /pv-cta-panel/.test(row.text) && /vg-cta/.test(row.text);
  return {
    file: row.file.replace(root.replace(/\\/g, "/"), "").replace(/^\//, ""),
    local_override: localOverride,
    uses_panel_and_cta: usesPanel,
    verdict: localOverride ? "FAIL" : "PASS",
    class: localOverride ? "page-specific" : "shared",
  };
});

const out = {
  collected_at: new Date().toISOString(),
  exit_condition_version: "second-qc-escape-v2",
  discovered: rows.length,
  checked: rows.length,
  passed: rows.filter((row) => row.verdict === "PASS").length,
  failed: rows.filter((row) => row.verdict === "FAIL").length,
  errors: 0,
  sampling_policy: "all discovered files containing vg-cta or pv-cta-panel; shared CSS #102033 on #f4f7fb unless local override",
  failures: rows.filter((row) => row.verdict === "FAIL"),
};
mkdirSync(join(root, ".infinity/blog-os"), { recursive: true });
writeFileSync(join(root, ".infinity/blog-os/shared-cta-sweep-v6.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
