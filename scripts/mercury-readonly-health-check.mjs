import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function fileToken() {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return "";
  const line = readFileSync(path, "utf8").split(/\r?\n/).find((row) => row.startsWith("MERCURY_API_TOKEN="));
  return line ? line.slice("MERCURY_API_TOKEN=".length).trim() : "";
}

const token = fileToken();
const fingerprint = token
  ? {
      present: true,
      length: token.length,
      prefix: token.slice(0, 24),
      hash: createHash("sha256").update(token).digest("hex").slice(0, 12),
      source: "env.local",
    }
  : { present: false };

if (!token) {
  console.log(JSON.stringify({ ok: false, reason: "TOKEN_MISSING", fingerprint }));
  process.exit(1);
}

const response = await fetch("https://api.mercury.com/api/v1/accounts", {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
});
let accountCount = null;
let verifiedTreasuryCash = null;
if (response.ok) {
  const json = await response.json();
  const accounts = Array.isArray(json.accounts) ? json.accounts : [];
  accountCount = accounts.length;
  verifiedTreasuryCash = accounts.reduce((sum, row) => {
    const value = Number(row?.availableBalance ?? row?.currentBalance ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}
console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  host: "api.mercury.com",
  path: "/api/v1/accounts",
  account_access: response.ok && accountCount != null,
  accountCount,
  verified_treasury_cash: verifiedTreasuryCash,
  last_verified_at: response.ok ? new Date().toISOString() : null,
  fingerprint,
  write_attempted: false,
}, null, 2));
