import { createMercuryFinancialAccountAdapter } from "@/lib/infinity/financial-truth/adapters/mercury";
import { loadMercuryPublicConfig } from "@/lib/infinity/treasury/providers/mercury/config";

async function main() {
  const pub = loadMercuryPublicConfig();
  const adapter = createMercuryFinancialAccountAdapter();
  const traced = await adapter.snapshotWithTrace();
  const snapshot = traced.snapshot;
  console.log(
    JSON.stringify(
      {
        enabled: pub.enabled,
        mode: pub.mode,
        token_configured: pub.tokenConfigured,
        health: pub.health,
        connection: snapshot.connection,
        operating_account_verified: snapshot.operating_account_verified,
        current: snapshot.current,
        available: snapshot.available,
        failure_stage: snapshot.failure_stage ?? traced.failing_stage,
        provider_error: snapshot.provider_error,
        last_verified: snapshot.last_verified,
        read_only: snapshot.read_only,
      },
      null,
      2,
    ),
  );
}

void main();
