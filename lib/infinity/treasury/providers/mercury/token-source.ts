import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type MercuryTokenTypeClass = "PRODUCTION_RMA" | "PRODUCTION_WMA" | "SANDBOX" | "OTHER";

export type MercuryTokenFingerprint = {
  present: true;
  length: number;
  prefix: string;
  hash: string;
  type_class: MercuryTokenTypeClass;
  leading_ws: boolean;
  trailing_ws: boolean;
  quoted: boolean;
  crlf: boolean;
  newline: boolean;
  malformed: boolean;
};

export type MercuryTokenSource = "env" | "env.local" | "env.production" | "env.production.local" | "none";

export type MercuryTokenResolution = {
  token: string;
  source: MercuryTokenSource;
  fingerprint: MercuryTokenFingerprint | null;
  conflict: boolean;
  process_fingerprint: MercuryTokenFingerprint | null;
  file_fingerprint: MercuryTokenFingerprint | null;
};

const FILE_NAMES = [".env.local", ".env", ".env.production.local", ".env.production"] as const;

export function mercuryTokenFingerprint(value: string | null | undefined): MercuryTokenFingerprint | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const quoted = /^['"]/.test(value.trim()) || /['"]$/.test(value.trim());
  const type_class: MercuryTokenTypeClass = /mercury_production_rma_/.test(trimmed)
    ? "PRODUCTION_RMA"
    : /mercury_production_wma_/.test(trimmed)
      ? "PRODUCTION_WMA"
      : /mercury_sandbox/.test(trimmed)
        ? "SANDBOX"
        : "OTHER";
  return {
    present: true,
    length: trimmed.length,
    prefix: trimmed.slice(0, 24),
    hash: createHash("sha256").update(trimmed).digest("hex").slice(0, 12),
    type_class,
    leading_ws: value !== value.trimStart(),
    trailing_ws: value !== value.trimEnd(),
    quoted,
    crlf: value.includes("\r"),
    newline: value.includes("\n"),
    malformed: quoted || value.includes("\r") || value.includes("\n"),
  };
}

export function inspectMercuryToken(value: string | null | undefined): Omit<MercuryTokenFingerprint, "present"> | { present: false } {
  const fingerprint = mercuryTokenFingerprint(value);
  if (!fingerprint) return { present: false };
  const { present: _present, ...safe } = fingerprint;
  return safe;
}

export function isMercuryReadOnlyTokenClass(typeClass: MercuryTokenTypeClass | null | undefined): boolean {
  return typeClass === "PRODUCTION_RMA" || typeClass === "SANDBOX" || typeClass === "OTHER";
}

function readEnvFileToken(fileName: string, cwd = process.cwd()): string | null {
  const path = join(cwd, fileName);
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  const line = text.split(/\r?\n/).find((row) => row.startsWith("MERCURY_API_TOKEN="));
  if (!line) return null;
  return line.slice("MERCURY_API_TOKEN=".length);
}

export function rawMercuryTokenFromEnv(env: NodeJS.Dict<string>): string {
  return typeof env.MERCURY_API_TOKEN === "string" ? env.MERCURY_API_TOKEN : "";
}

export function normalizeMercuryToken(raw: string): { token: string; fingerprint: MercuryTokenFingerprint | null; rejected: boolean } {
  if (!raw) return { token: "", fingerprint: null, rejected: false };
  const fingerprint = mercuryTokenFingerprint(raw);
  if (fingerprint?.malformed) {
    return { token: "", fingerprint, rejected: true };
  }
  return { token: raw.trim(), fingerprint: mercuryTokenFingerprint(raw.trim()), rejected: false };
}

function isCloudRuntime(env: NodeJS.Dict<string>): boolean {
  return env.VERCEL === "1" || env.INFINITY_CLOUD_RUNTIME === "1";
}

export function resolveMercuryApiToken(
  env: NodeJS.Dict<string> = process.env,
  options: { cwd?: string; preferLocalFile?: boolean } = {},
): MercuryTokenResolution {
  const envRaw = rawMercuryTokenFromEnv(env);
  const envNormalized = normalizeMercuryToken(envRaw);
  const processFingerprint = mercuryTokenFingerprint(process.env.MERCURY_API_TOKEN);
  const preferFile =
    options.preferLocalFile ?? (env === process.env && !isCloudRuntime(env));

  if (!preferFile) {
    return {
      token: envNormalized.rejected ? "" : envNormalized.token,
      source: envNormalized.token ? "env" : "none",
      fingerprint: envNormalized.fingerprint,
      conflict: false,
      process_fingerprint: processFingerprint,
      file_fingerprint: null,
    };
  }

  for (const name of FILE_NAMES) {
    const raw = readEnvFileToken(name, options.cwd);
    if (!raw) continue;
    const normalized = normalizeMercuryToken(raw);
    if (normalized.rejected || !normalized.token) continue;
    const fileFingerprint = normalized.fingerprint;
    const conflict = Boolean(
      processFingerprint && fileFingerprint && processFingerprint.hash !== fileFingerprint.hash,
    );
    return {
      token: normalized.token,
      source: name === ".env.local"
        ? "env.local"
        : name === ".env.production.local"
          ? "env.production.local"
          : name === ".env.production"
            ? "env.production"
            : "env",
      fingerprint: fileFingerprint,
      conflict,
      process_fingerprint: processFingerprint,
      file_fingerprint: fileFingerprint,
    };
  }

  return {
    token: envNormalized.rejected ? "" : envNormalized.token,
    source: envNormalized.token ? "env" : "none",
    fingerprint: envNormalized.fingerprint,
    conflict: false,
    process_fingerprint: processFingerprint,
    file_fingerprint: null,
  };
}
