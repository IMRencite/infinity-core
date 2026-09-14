import { existsSync, statSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { MercuryFinancialAccountAdapter } from "../lib/infinity/financial-truth/adapters/mercury";
import { loadMercuryConfig } from "../lib/infinity/treasury/providers/mercury/config";
import { readFinancialTruthCache } from "../lib/infinity/financial-truth/cache";
import { MercuryTreasuryMutationAdapter } from "../lib/infinity/financial-truth/adapters/mercury-mutation";

function tokenPresence(value: string | undefined): "MISSING" | "PRESENT" {
  return typeof value === "string" && value.trim().length > 0 ? "PRESENT" : "MISSING";
}

function tokenShape(value: string | undefined): { present: boolean; length_class: "EMPTY" | "SHORT" | "STANDARD" } {
  const token = typeof value === "string" ? value.trim() : "";
  if (!token) return { present: false, length_class: "EMPTY" };
  return { present: true, length_class: token.length < 16 ? "SHORT" : "STANDARD" };
}

async function main() {
  const envPath = ".env.local";
  const fileExists = existsSync(envPath);
  const fileMtime = fileExists ? statSync(envPath).mtime.toISOString() : null;
  loadEnvConfig(process.cwd());

  const httpStatuses: number[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const response = await fetch(input, init);
    httpStatuses.push(response.status);
    return response;
  };

  const loaded = loadMercuryConfig(process.env);
  const adapter = new MercuryFinancialAccountAdapter({ env: process.env, fetchImpl });
  const traced = await adapter.snapshotWithTrace();
  const cached = readFinancialTruthCache();
  const mutation = new MercuryTreasuryMutationAdapter();

  process.stdout.write(
    `${JSON.stringify(
      {
        env_file: {
          present: fileExists,
          mtime: fileMtime,
        },
        public_config: {
          enabled: loaded.public.enabled,
          mode: loaded.public.mode,
          base_host: new URL(loaded.public.baseUrl).host,
          token_configured: loaded.public.tokenConfigured,
          health: loaded.public.health,
          timeout_ms: loaded.public.timeoutMs,
        },
        credential_presence: {
          MERCURY_ENABLED: process.env.MERCURY_ENABLED ? "SET" : "UNSET",
          MERCURY_ENV: process.env.MERCURY_ENV ? "SET" : "UNSET",
          MERCURY_API_TOKEN: tokenPresence(process.env.MERCURY_API_TOKEN),
          MERCURY_API_TOKEN_SHAPE: tokenShape(process.env.MERCURY_API_TOKEN),
          MERCURY_BASE_URL: process.env.MERCURY_BASE_URL ? "SET" : "UNSET",
        },
        live_probe: {
          connection: traced.snapshot.connection,
          failure_stage: traced.failing_stage,
          provider_error: traced.snapshot.provider_error,
          operating_account_verified: traced.snapshot.operating_account_verified,
          safe_account_reference: traced.snapshot.safe_account_reference,
          current: traced.snapshot.current,
          available: traced.snapshot.available,
          last_verified: traced.snapshot.last_verified,
          mutation_capability: traced.snapshot.mutation_capability,
          money_movement_capability: traced.snapshot.money_movement_capability,
          read_only: traced.snapshot.read_only,
          http_statuses: httpStatuses,
        },
        cached: cached
          ? {
              connection: cached.mercury.connection,
              provider_error: cached.mercury.provider_error ?? null,
              failure_stage: cached.mercury.failure_stage ?? null,
              last_verified: cached.mercury.last_verified,
              available: cached.mercury.available,
              current: cached.mercury.current,
              safe_account_reference: cached.mercury.safe_account_reference,
            }
          : null,
        mutation: {
          write_access: mutation.write_access,
          money_movement: mutation.money_movement,
          status: mutation.status,
        },
      },
      null,
      2,
    )}\n`,
  );
}

void main();
