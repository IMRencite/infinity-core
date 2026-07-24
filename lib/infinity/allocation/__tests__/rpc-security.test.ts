import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

loadEnvLocal();

const PRIVILEGED_ALLOCATION_RPCS = [
  {
    name: "reserve_allocation_resources",
    signature: "public.reserve_allocation_resources(UUID, UUID, TEXT)",
  },
  {
    name: "release_allocation_resources",
    signature: "public.release_allocation_resources(UUID, UUID)",
  },
] as const;

function readMigration(filename: string): string {
  return readFileSync(
    join(process.cwd(), "supabase", "migrations", filename),
    "utf8",
  );
}

function assertFunctionSecured(migrationSql: string, signature: string) {
  expect(migrationSql).toContain(`SECURITY DEFINER`);
  expect(migrationSql).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`);
  expect(migrationSql).toContain(`REVOKE EXECUTE ON FUNCTION ${signature} FROM anon;`);
  expect(migrationSql).toContain(
    `REVOKE EXECUTE ON FUNCTION ${signature} FROM authenticated;`,
  );
  expect(migrationSql).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
}

describe("privileged allocation RPC migration security", () => {
  const foundationMigration = readMigration(
    "20260724020000_decision_engine_capital_allocation_foundation_v1.sql",
  );
  const securityMigration = readMigration(
    "20260724030000_secure_decision_allocation_rpcs.sql",
  );

  it.each(PRIVILEGED_ALLOCATION_RPCS)(
    "secures $name in the foundation migration",
    ({ signature }) => {
      assertFunctionSecured(foundationMigration, signature);
    },
  );

  it.each(PRIVILEGED_ALLOCATION_RPCS)(
    "secures $name in the corrective migration",
    ({ signature }) => {
      assertFunctionSecured(securityMigration, signature);
    },
  );

  it("keeps read-only organization-scoped RLS policies on allocation tables", () => {
    for (const policy of [
      "decision_models_select_member",
      "opportunity_evaluations_select_member",
      "resource_pools_select_member",
      "allocation_proposals_select_member",
      "resource_reservations_select_member",
    ]) {
      expect(foundationMigration).toContain(`CREATE POLICY ${policy}`);
      expect(foundationMigration).toContain("FOR SELECT TO authenticated");
      expect(foundationMigration).toContain("public.is_organization_member(organization_id)");
    }
  });
});

describe("authenticated allocation RPC access", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  it.skipIf(!url || !publishableKey)(
    "denies authenticated/publishable clients from reserve_allocation_resources",
    async () => {
      const client = createClient<Database>(url!, publishableKey!);

      const { error } = await client.rpc("reserve_allocation_resources", {
        p_organization_id: "00000000-0000-0000-0000-000000000001",
        p_proposal_id: "00000000-0000-0000-0000-000000000002",
        p_reservation_key: "test-denied",
      });

      expect(error).toBeTruthy();
      expect(error?.code === "42501" || /permission denied|not authorized/i.test(error?.message ?? "")).toBe(
        true,
      );
    },
  );

  it.skipIf(!url || !publishableKey)(
    "denies authenticated/publishable clients from release_allocation_resources",
    async () => {
      const client = createClient<Database>(url!, publishableKey!);

      const { error } = await client.rpc("release_allocation_resources", {
        p_organization_id: "00000000-0000-0000-0000-000000000001",
        p_proposal_id: "00000000-0000-0000-0000-000000000002",
      });

      expect(error).toBeTruthy();
      expect(error?.code === "42501" || /permission denied|not authorized/i.test(error?.message ?? "")).toBe(
        true,
      );
    },
  );
});
