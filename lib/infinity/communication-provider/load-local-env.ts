import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UPSERTABLE_LOCAL_SECRETS = new Set(["STRIPE_WEBHOOK_SECRET"]);

export function loadServerEnvFromLocalFile(cwd = process.cwd()): { loaded: boolean } {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") return { loaded: false };
  const file = join(cwd, ".env.local");
  if (!existsSync(file)) return { loaded: false };
  const text = readFileSync(file, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = value;
  }
  return { loaded: true };
}

export function readLocalEnvValue(name: string, cwd = process.cwd()): string | null {
  const file = join(cwd, ".env.local");
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  let matched: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    if (key !== name) continue;
    let value = line.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    matched = value;
  }
  return matched;
}

export function reloadStripeSecretFromLocalFile(cwd = process.cwd()): {
  loaded: boolean;
  replaced: boolean;
  keyPresent: "YES" | "NO";
  confirmed: boolean;
} {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    const current = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    return { loaded: false, replaced: false, keyPresent: current.length > 0 ? "YES" : "NO", confirmed: current.length > 0 };
  }
  const fileValue = readLocalEnvValue("STRIPE_SECRET_KEY", cwd);
  if (fileValue == null || fileValue.trim() === "") {
    const current = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
    return { loaded: false, replaced: false, keyPresent: current.length > 0 ? "YES" : "NO", confirmed: false };
  }
  const previous = process.env.STRIPE_SECRET_KEY ?? "";
  process.env.STRIPE_SECRET_KEY = fileValue.trim();
  const confirmed = (process.env.STRIPE_SECRET_KEY ?? "") === fileValue.trim();
  return {
    loaded: true,
    replaced: previous !== fileValue.trim(),
    keyPresent: "YES",
    confirmed,
  };
}

export function reloadCloudflareRegistrarFromLocalFile(cwd = process.cwd()): {
  loaded: boolean;
  replaced: boolean;
  registrarPresent: "YES" | "NO";
  generalPresent: "YES" | "NO";
  accountIdPresent: "YES" | "NO";
  confirmed: boolean;
  generalPreserved: boolean;
} {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    const registrar = process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim() ?? "";
    const general = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
    const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
    return {
      loaded: false,
      replaced: false,
      registrarPresent: registrar.length > 0 ? "YES" : "NO",
      generalPresent: general.length > 0 ? "YES" : "NO",
      accountIdPresent: account.length > 0 ? "YES" : "NO",
      confirmed: registrar.length > 0,
      generalPreserved: true,
    };
  }
  const registrarValue = readLocalEnvValue("CLOUDFLARE_REGISTRAR_API_TOKEN", cwd);
  const accountValue = readLocalEnvValue("CLOUDFLARE_ACCOUNT_ID", cwd);
  const generalValue = readLocalEnvValue("CLOUDFLARE_API_TOKEN", cwd);
  const priorGeneral = process.env.CLOUDFLARE_API_TOKEN ?? "";
  if (accountValue && accountValue.trim() && !process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
    process.env.CLOUDFLARE_ACCOUNT_ID = accountValue.trim();
  }
  if (generalValue && generalValue.trim() && !process.env.CLOUDFLARE_API_TOKEN?.trim()) {
    process.env.CLOUDFLARE_API_TOKEN = generalValue.trim();
  }
  if (registrarValue == null || registrarValue.trim() === "") {
    const current = process.env.CLOUDFLARE_REGISTRAR_API_TOKEN?.trim() ?? "";
    return {
      loaded: false,
      replaced: false,
      registrarPresent: current.length > 0 ? "YES" : "NO",
      generalPresent: priorGeneral.trim().length > 0 ? "YES" : "NO",
      accountIdPresent: (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "").length > 0 ? "YES" : "NO",
      confirmed: false,
      generalPreserved: process.env.CLOUDFLARE_API_TOKEN === priorGeneral,
    };
  }
  const previous = process.env.CLOUDFLARE_REGISTRAR_API_TOKEN ?? "";
  process.env.CLOUDFLARE_REGISTRAR_API_TOKEN = registrarValue.trim();
  const confirmed = (process.env.CLOUDFLARE_REGISTRAR_API_TOKEN ?? "") === registrarValue.trim();
  return {
    loaded: true,
    replaced: previous !== registrarValue.trim(),
    registrarPresent: "YES",
    generalPresent: (process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "").length > 0 ? "YES" : "NO",
    accountIdPresent: (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "").length > 0 ? "YES" : "NO",
    confirmed,
    generalPreserved: process.env.CLOUDFLARE_API_TOKEN === priorGeneral,
  };
}

export function reloadCloudflareDnsTokenFromLocalFile(cwd = process.cwd()): {
  loaded: boolean;
  replaced: boolean;
  present: "YES" | "NO";
  confirmed: boolean;
} {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    const current = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
    return {
      loaded: false,
      replaced: false,
      present: current.length > 0 ? "YES" : "NO",
      confirmed: current.length > 0,
    };
  }
  const value = readLocalEnvValue("CLOUDFLARE_API_TOKEN", cwd);
  if (value == null || value.trim() === "") {
    return {
      loaded: false,
      replaced: false,
      present: (process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "").length > 0 ? "YES" : "NO",
      confirmed: false,
    };
  }
  const previous = process.env.CLOUDFLARE_API_TOKEN ?? "";
  process.env.CLOUDFLARE_API_TOKEN = value.trim();
  return {
    loaded: true,
    replaced: previous !== value.trim(),
    present: "YES",
    confirmed: (process.env.CLOUDFLARE_API_TOKEN ?? "") === value.trim(),
  };
}

export function reloadVercelFromLocalFile(cwd = process.cwd()): {
  loaded: boolean;
  tokenPresent: "YES" | "NO";
  teamIdPresent: "YES" | "NO";
  confirmed: boolean;
} {
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    const token = process.env.VERCEL_TOKEN?.trim() ?? "";
    const team = process.env.VERCEL_TEAM_ID?.trim() ?? "";
    return {
      loaded: false,
      tokenPresent: token.length > 0 ? "YES" : "NO",
      teamIdPresent: team.length > 0 ? "YES" : "NO",
      confirmed: token.length > 0,
    };
  }
  const tokenValue = readLocalEnvValue("VERCEL_TOKEN", cwd);
  const teamValue = readLocalEnvValue("VERCEL_TEAM_ID", cwd);
  if (teamValue && teamValue.trim()) {
    process.env.VERCEL_TEAM_ID = teamValue.trim();
  }
  if (tokenValue == null || tokenValue.trim() === "") {
    const current = process.env.VERCEL_TOKEN?.trim() ?? "";
    return {
      loaded: false,
      tokenPresent: current.length > 0 ? "YES" : "NO",
      teamIdPresent: (process.env.VERCEL_TEAM_ID?.trim() ?? "").length > 0 ? "YES" : "NO",
      confirmed: false,
    };
  }
  process.env.VERCEL_TOKEN = tokenValue.trim();
  return {
    loaded: true,
    tokenPresent: "YES",
    teamIdPresent: (process.env.VERCEL_TEAM_ID?.trim() ?? "").length > 0 ? "YES" : "NO",
    confirmed: (process.env.VERCEL_TOKEN ?? "") === tokenValue.trim(),
  };
}

export function upsertLocalEnvSecret(
  name: string,
  value: string,
  cwd = process.cwd(),
): { written: boolean; present: boolean } {
  const secret = value.trim();
  if (!UPSERTABLE_LOCAL_SECRETS.has(name) || !secret) return { written: false, present: false };
  process.env[name] = secret;
  if (process.env.VITEST && process.env.INFINITY_LOAD_LOCAL_ENV !== "1") {
    return { written: false, present: Boolean(process.env[name]?.trim()) };
  }
  const file = join(cwd, ".env.local");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = text.length ? text.split(/\r?\n/) : [];
  let found = false;
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const index = trimmed.indexOf("=");
    if (index <= 0) return line;
    if (trimmed.slice(0, index).trim() !== name) return line;
    found = true;
    return `${name}=${secret}`;
  });
  if (!found) {
    if (next.length && next[next.length - 1] !== "") next.push("");
    next.push(`${name}=${secret}`);
  }
  writeFileSync(file, `${next.join("\n").replace(/\n+$/, "")}\n`);
  return { written: true, present: (readLocalEnvValue(name, cwd) ?? "").trim().length > 0 };
}

export function envPresence(name: string): "PRESENT" | "MISSING" {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? "PRESENT" : "MISSING";
}

const GMAIL_ENV_KEYS = [
  "GMAIL_OAUTH_CLIENT_ID",
  "GMAIL_OAUTH_CLIENT_SECRET",
  "GMAIL_OAUTH_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL",
] as const;

export function reloadGmailOAuthFromLocalFile(cwd = process.cwd()): { loaded: boolean; replaced: number } {
  if (process.env.VITEST) return { loaded: false, replaced: 0 };
  const file = join(cwd, ".env.local");
  if (!existsSync(file)) return { loaded: false, replaced: 0 };
  const text = readFileSync(file, "utf8");
  const allowed = new Set<string>(GMAIL_ENV_KEYS);
  let replaced = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    if (!allowed.has(key)) continue;
    let value = line.slice(index + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
    replaced += 1;
  }
  return { loaded: true, replaced };
}
