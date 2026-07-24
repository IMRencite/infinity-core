import { describe, expect, it } from "vitest";
import {
  buildUniqueOpportunitySlug,
  slugifyOpportunityName,
} from "@/lib/infinity/opportunities/slug";

describe("slugifyOpportunityName", () => {
  it("normalizes names into slug format", () => {
    expect(slugifyOpportunityName("  SaaS Billing Tool  ")).toBe("saas-billing-tool");
  });

  it("falls back to empty-safe output", () => {
    expect(slugifyOpportunityName("***")).toBe("");
  });
});

describe("buildUniqueOpportunitySlug", () => {
  it("returns base slug when unused", () => {
    expect(buildUniqueOpportunitySlug(new Set(), "Billing Tool")).toBe("billing-tool");
  });

  it("appends numeric suffix for collisions", () => {
    const existing = new Set(["billing-tool", "billing-tool-2"]);
    expect(buildUniqueOpportunitySlug(existing, "Billing Tool")).toBe("billing-tool-3");
  });
});
