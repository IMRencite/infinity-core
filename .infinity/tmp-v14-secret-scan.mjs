import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".next", ".next-verify", ".git"]);
const rows = [];

function classify(rel) {
  const lower = rel.toLowerCase().replace(/\\/g, "/");
  if (/(^|\/)\.env($|\.)/.test(lower) && !lower.endsWith(".env.local.example") && !lower.endsWith(".env.example")) {
    return { secret_class: "ENV_FILE", verdict: "EXCLUDE" };
  }
  if (lower.endsWith(".pem") || lower.endsWith(".p12") || lower.endsWith(".pfx") || /id_rsa$|id_ed25519$|\.ppk$/.test(lower)) {
    return { secret_class: "PRIVATE_KEY", verdict: "EXCLUDE" };
  }
  if (/credentials\.json$|service-account.*\.json$|client_secret.*\.json$/.test(lower)) {
    return { secret_class: "CREDENTIAL_JSON", verdict: "EXCLUDE" };
  }
  if (/token|oauth|refresh.token|service.role|secret|password|private.key/i.test(lower) && /\.(json|txt|pem|env|local)$/.test(lower)) {
    return { secret_class: "TOKEN_OR_SECRET_NAMED_FILE", verdict: "REVIEW" };
  }
  if (lower.includes(".vercel/") && /env/.test(lower)) {
    return { secret_class: "VERCEL_LOCAL_ENV", verdict: "EXCLUDE" };
  }
  if (/\.infinity\/.*dump|\.infinity\/.*token|\.infinity\/communication-v5-private/.test(lower)) {
    return { secret_class: "TEMPORARY_OR_PRIVATE_DUMP", verdict: "EXCLUDE" };
  }
  return null;
}

function walk(dir) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
    } else if (entry.isFile()) {
      const rel = relative(SRC, full);
      const hit = classify(rel);
      if (hit) rows.push({ path: rel.replace(/\\/g, "/"), ...hit });
    }
  }
}

walk(SRC);
const summary = {
  collected_at: new Date().toISOString(),
  exclude: rows.filter((row) => row.verdict === "EXCLUDE").length,
  review: rows.filter((row) => row.verdict === "REVIEW").length,
  rows,
};
console.log(JSON.stringify(summary, null, 2));
