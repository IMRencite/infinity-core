import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = "20260909040000_askreview_product_v1.sql";

describe("AskReview migration safety", () => {
  const sql = readFileSync(`supabase/migrations/${MIGRATION}`, "utf8");
  const names = readdirSync("supabase/migrations");

  it("is the only AskReview migration and has a unique timestamp", () => {
    expect(names.filter((name) => name.includes("askreview"))).toEqual([MIGRATION]);
    expect(names.filter((name) => name.startsWith("20260909040000"))).toHaveLength(1);
    expect(names).toContain("20260816150000_opportunity_scanner_evidence_org_idx.sql");
  });

  it("creates only AskReview objects and has no destructive shared-state operations", () => {
    expect(sql.match(/CREATE TABLE/g)?.length).toBe(4);
    expect(sql).toContain("askreview_customers");
    expect(sql).toContain("askreview_locations");
    expect(sql).toContain("askreview_kits");
    expect(sql).toContain("askreview_events");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("REFERENCES auth.users");
    expect(sql).toContain("auth_identity_id UUID NOT NULL UNIQUE");
    expect(sql).not.toMatch(/\bDROP\b/);
    expect(sql).not.toMatch(/\bTRUNCATE\b/);
    expect(sql).not.toMatch(/\boccupancynpv_/);
    expect(sql).not.toMatch(/\bDELETE FROM\b/);
    expect(sql).not.toMatch(/\bALTER TABLE (?!public\.askreview_)/);
  });
});
