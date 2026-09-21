import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadDotEnv(path) {
  if (!existsSync(path)) return { present: false, value: null, rawLine: null };
  const text = readFileSync(path, "utf8");
  const line = text.split(/\r?\n/).find((row) => row.startsWith("MERCURY_API_TOKEN="));
  if (!line) return { present: true, value: null, rawLine: null };
  let value = line.slice("MERCURY_API_TOKEN=".length);
  return { present: true, value, rawLine: line };
}

function fingerprint(value) {
  if (!value) return null;
  const trimmed = value.trim();
  return {
    present: true,
    length: trimmed.length,
    prefix: trimmed.slice(0, 28),
    hash: createHash("sha256").update(trimmed).digest("hex").slice(0, 12),
    leading_ws: value !== value.trimStart(),
    trailing_ws: value !== value.trimEnd(),
    quoted: /^['"]/.test(value) || /['"]$/.test(value),
    crlf: value.includes("\r"),
    newline: value.includes("\n"),
    type_class: /mercury_production_rma_/.test(trimmed)
      ? "PRODUCTION_RMA"
      : /mercury_production_wma_/.test(trimmed)
        ? "PRODUCTION_WMA"
        : /mercury_sandbox/.test(trimmed)
          ? "SANDBOX"
          : "OTHER",
  };
}

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

const cwd = process.cwd();
const files = [".env", ".env.local", ".env.production", ".env.production.local"].map((name) => {
  const path = join(cwd, name);
  const loaded = loadDotEnv(path);
  return { name, exists: existsSync(path), token: fingerprint(loaded.value) };
});

const processEnv = fingerprint(process.env.MERCURY_API_TOKEN);
const fileLocal = loadDotEnv(join(cwd, ".env.local"));
const token = (fileLocal.value ?? process.env.MERCURY_API_TOKEN ?? "").trim();

async function probe(label, headers) {
  const started = Date.now();
  try {
    const response = await fetch("https://api.mercury.com/api/v1/accounts", {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
    });
    let accountCount = null;
    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      accountCount = Array.isArray(json.accounts) ? json.accounts.length : Array.isArray(json) ? json.length : null;
    }
    return { label, status: response.status, ok: response.ok, ms: Date.now() - started, accountCount };
  } catch (error) {
    return { label, status: 0, ok: false, ms: Date.now() - started, error: error instanceof Error ? error.name : "FETCH_FAIL" };
  }
}

const probes = [];
if (token) {
  probes.push(await probe("bearer_env_local", { Authorization: `Bearer ${token}` }));
  probes.push(await probe("basic_env_local", { Authorization: `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}` }));
}
const processToken = (process.env.MERCURY_API_TOKEN ?? "").trim();
if (processToken && fingerprint(processToken)?.hash !== fingerprint(token)?.hash) {
  probes.push(await probe("bearer_process_env", { Authorization: `Bearer ${processToken}` }));
  probes.push(await probe("basic_process_env", { Authorization: `Basic ${Buffer.from(`${processToken}:`, "utf8").toString("base64")}` }));
}

console.log(JSON.stringify({
  host: "api.mercury.com",
  path: "/api/v1/accounts",
  mercury_enabled: parseBoolean(process.env.MERCURY_ENABLED),
  mercury_env: process.env.MERCURY_ENV ?? null,
  process_pid: process.pid,
  files,
  process_env_token: processEnv,
  loaded_from: fileLocal.value ? ".env.local" : processEnv ? "process.env" : "NONE",
  loaded_fingerprint: fingerprint(token),
  windows_process_conflict: Boolean(process.env.MERCURY_API_TOKEN) && fingerprint(process.env.MERCURY_API_TOKEN)?.hash !== fingerprint(fileLocal.value)?.hash,
  vercel_env_present_in_process: Boolean(process.env.VERCEL),
  probes,
}, null, 2));
