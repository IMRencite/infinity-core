import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { extractThrownCode, extractThrownMessage } from "@/lib/infinity/shared/extract-thrown-message";

export type DatabaseReadyProbeResult = {
  ready: boolean;
  attempts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

function isRetryableDatabaseError(error: { code?: string | null; message?: string | null }): boolean {
  const code = error.code ?? null;
  const message = error.message ?? "";
  return (
    code === "PGRST002" ||
    code === "57014" ||
    message.includes("schema cache") ||
    message.includes("Retrying") ||
    message.includes("statement timeout") ||
    message.includes("canceling statement due to statement timeout") ||
    message.includes("upstream request timeout")
  );
}

/**
 * Probe PostgREST using the same indexed scanner table the venture radar writes to.
 * Avoids unrelated tables (e.g. organizations) that may contend on unrelated locks.
 */
export async function probeScannerDatabaseReady(
  admin: AdminSupabaseClient,
  organizationId: string,
): Promise<{ error: { code: string | null; message: string } | null }> {
  const { error } = await admin
    .from("opportunity_discovery_runs")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (!error) {
    return { error: null };
  }

  return {
    error: {
      code: error.code ?? null,
      message: error.message,
    },
  };
}

export async function waitForScannerDatabaseReady(
  admin: AdminSupabaseClient,
  organizationId: string,
  maxAttempts = 5,
  delayMs = 3_000,
): Promise<DatabaseReadyProbeResult> {
  let lastErrorCode: string | null = null;
  let lastErrorMessage: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startedAt = Date.now();
    const probe = await probeScannerDatabaseReady(admin, organizationId);
    const elapsedMs = Date.now() - startedAt;

    if (!probe.error) {
      if (attempt > 1) {
        console.log(`[FAVC1] scanner database ready after ${attempt} attempts (${elapsedMs}ms probe)`);
      }
      return { ready: true, attempts: attempt, lastErrorCode: null, lastErrorMessage: null };
    }

    lastErrorCode = probe.error.code;
    lastErrorMessage = probe.error.message;

    const retryable = isRetryableDatabaseError(probe.error);
    console.warn("[FAVC1] scanner database probe failed", {
      attempt,
      maxAttempts,
      code: probe.error.code,
      message: probe.error.message,
      elapsedMs,
      retryable,
    });

    if (!retryable || attempt === maxAttempts) {
      return {
        ready: false,
        attempts: attempt,
        lastErrorCode,
        lastErrorMessage,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return {
    ready: false,
    attempts: maxAttempts,
    lastErrorCode,
    lastErrorMessage,
  };
}

export function formatDatabaseProbeFailure(result: DatabaseReadyProbeResult): string {
  const code = result.lastErrorCode ?? "database_probe_failed";
  const message = result.lastErrorMessage ?? "Database probe failed";
  return `[${code}] ${message}`;
}

export function databaseProbeFailureLevel(code: string | null): "INFRASTRUCTURE_BLOCKED" | "LEVEL_0_SYSTEM_FAILURE" {
  if (code === "PGRST002" || code === "57014") {
    return "INFRASTRUCTURE_BLOCKED";
  }
  return "LEVEL_0_SYSTEM_FAILURE";
}

export function thrownDatabaseFailureLevel(error: unknown): "INFRASTRUCTURE_BLOCKED" | "LEVEL_0_SYSTEM_FAILURE" {
  const code = extractThrownCode(error);
  return databaseProbeFailureLevel(code);
}

export function thrownDatabaseFailureMessage(error: unknown): string {
  const code = extractThrownCode(error);
  const message = extractThrownMessage(error);
  return code ? `[${code}] ${message}` : message;
}
