import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Operator Console security", () => {
  it("service-role client is server-only (admin.ts not imported by client components)", () => {
    const clientFiles = [
      "components/dashboard/operator-console/venture-operator-console.tsx",
      "components/dashboard/operator-console/hq-floor.tsx",
    ];
    for (const file of clientFiles) {
      const content = readFileSync(join(process.cwd(), file), "utf8");
      expect(content).not.toContain("createAdminClient");
      expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("no NEXT_PUBLIC service role in operator API route", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/operator-console/ventures/[ventureId]/route.ts"),
      "utf8",
    );
    expect(route).toContain("createAdminClient");
    expect(route).not.toMatch(/NEXT_PUBLIC.*SERVICE/i);
  });

  it("no permissive RLS policies added for operator console", () => {
    const migrations = readFileSync(
      join(process.cwd(), "supabase/migrations/20260816040000_infinity_engine_rls_hardening_v1.sql"),
      "utf8",
    );
    expect(migrations).not.toMatch(/CREATE POLICY/i);
    expect(migrations).not.toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it("API route only accepts ventureId param — no arbitrary table query", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/operator-console/ventures/[ventureId]/route.ts"),
      "utf8",
    );
    expect(route).toContain("loadOperatorVentureSnapshot");
    expect(route).not.toContain(".from(");
  });

  it("sanitize redacts secrets in serialized payload", async () => {
    const { sanitizeOperatorSnapshot } = await import("../sanitize");
    const payload = sanitizeOperatorSnapshot({
      provider: "openai",
      authorization: "Bearer secret-token",
      api_key: "sk-test",
    });
    expect(payload).toEqual({
      provider: "openai",
      authorization: "[redacted]",
      api_key: "[redacted]",
    });
  });
});
