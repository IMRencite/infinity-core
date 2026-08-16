import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

loadEnvLocal();

const PERFORMANCE_TABLES = [
  "performance_intelligence_runs",
  "performance_intelligence_build_packages",
  "performance_sources",
  "performance_observations",
  "performance_events",
  "performance_metric_aggregates",
  "performance_learning_decisions",
  "performance_traceability_links",
] as const;

const runLive = process.env.RUN_PERFORMANCE_INTELLIGENCE_RLS_TEST === "true";

describe("Performance Intelligence RLS hardening", () => {
  it("migration enables RLS and grants service_role without blanket policies", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260816040000_infinity_engine_rls_hardening_v1.sql"),
      "utf8",
    );
    for (const table of PERFORMANCE_TABLES) {
      expect(sql).toContain(`ALTER TABLE IF EXISTS public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(sql).toContain(`GRANT ALL ON public.${table} TO service_role`);
    }
    expect(sql).not.toMatch(/CREATE POLICY/i);
    expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it.runIf(runLive)("anon cannot read internal performance tables", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !anonKey) {
      console.log(JSON.stringify({ classification: "SKIPPED_ENVIRONMENT", reason: "missing anon credentials" }));
      return;
    }

    const anon = createClient<Database>(url, anonKey);
    for (const table of PERFORMANCE_TABLES) {
      const { data, error } = await anon.from(table).select("id").limit(1);
      expect(data ?? []).toHaveLength(0);
      expect(error).toBeNull();
    }
  });

  it.runIf(runLive)("service_role can read performance_intelligence_runs", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.log(JSON.stringify({ classification: "SKIPPED_ENVIRONMENT", reason: "missing service credentials" }));
      return;
    }

    const admin = createClient<Database>(url, serviceKey);
    const { error } = await admin.from("performance_intelligence_runs").select("id").limit(1);
    expect(error).toBeNull();
  });
});
