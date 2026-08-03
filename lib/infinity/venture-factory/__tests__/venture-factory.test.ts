import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  VENTURE_TEMPLATE_TYPES,
  VentureFactoryError,
  assertOpportunityApprovedForBlueprint,
  clearVentureBlueprintTemplateOverrides,
  emitBlueprintCreatedEvent,
  generateVentureBlueprint,
  getVentureBlueprintTemplate,
  listVentureBlueprintTemplates,
  persistVentureBlueprint,
  registerVentureBlueprintTemplate,
  runVentureFactoryPipeline,
  selectVentureBlueprintTemplate,
  validateVentureBlueprint,
} from "@/lib/infinity/venture-factory";
import type { ApprovedOpportunityInput } from "@/lib/infinity/venture-factory";

function approvedOpportunity(
  overrides: Partial<ApprovedOpportunityInput> = {},
): ApprovedOpportunityInput {
  return {
    id: "opp-1",
    organizationId: "org-1",
    name: "Test SaaS Opportunity",
    summary: "A workflow automation tool for SMBs.",
    problem: "Manual workflows waste time.",
    targetCustomer: "SMB operations teams",
    industry: "software",
    category: "product_demand",
    businessModel: "subscription",
    recommendedBuilder: "saas",
    status: "approved",
    decision: "pending",
    overallScore: 72,
    confidenceScore: 68,
    ...overrides,
  };
}

describe("Venture Factory Foundation v1", () => {
  beforeEach(() => {
    clearVentureBlueprintTemplateOverrides();
  });

  describe("template registry", () => {
    it("lists all supported venture templates", () => {
      const templates = listVentureBlueprintTemplates();
      expect(templates).toHaveLength(VENTURE_TEMPLATE_TYPES.length);
      expect(templates.map((t) => t.key)).toEqual(expect.arrayContaining(["saas", "marketplace"]));
    });

    it("registers template overrides dynamically", () => {
      const base = getVentureBlueprintTemplate("saas");
      registerVentureBlueprintTemplate({
        ...base,
        displayName: "SaaS Custom",
        baseBudgetUsd: 80000,
      });
      expect(getVentureBlueprintTemplate("saas").baseBudgetUsd).toBe(80000);
    });
  });

  describe("blueprint generation", () => {
    it("selects saas template from recommended builder", () => {
      const type = selectVentureBlueprintTemplate(approvedOpportunity());
      expect(type).toBe("saas");
    });

    it("generates deterministic blueprint fields", () => {
      const template = getVentureBlueprintTemplate("saas");
      const blueprint = generateVentureBlueprint(approvedOpportunity(), template);
      expect(blueprint.ventureType).toBe("saas");
      expect(blueprint.name).toBe("Test SaaS Opportunity");
      expect(blueprint.requiredWorkers.length).toBeGreaterThan(0);
      expect(blueprint.marketingChannels).toContain("content_marketing");
      expect(blueprint.estimatedBudget).toMatch(/USD/);
      expect(blueprint.id).toHaveLength(32);

      const again = generateVentureBlueprint(approvedOpportunity(), template);
      expect(again.id).toBe(blueprint.id);
    });
  });

  describe("validation", () => {
    it("rejects unapproved opportunities", () => {
      expect(() =>
        assertOpportunityApprovedForBlueprint(
          approvedOpportunity({ status: "discovered", decision: "pending" }),
        ),
      ).toThrow(VentureFactoryError);
    });

    it("accepts build decision", () => {
      expect(() =>
        assertOpportunityApprovedForBlueprint(
          approvedOpportunity({ status: "discovered", decision: "build" }),
        ),
      ).not.toThrow();
    });

    it("rejects unsupported venture types in blueprint validation", () => {
      const template = getVentureBlueprintTemplate("saas");
      const blueprint = generateVentureBlueprint(approvedOpportunity(), template);
      expect(() =>
        validateVentureBlueprint({
          ...blueprint,
          ventureType: "unknown_type" as typeof blueprint.ventureType,
        }),
      ).toThrow(/Unsupported venture type/);
    });

    it("rejects empty required arrays", () => {
      const template = getVentureBlueprintTemplate("saas");
      const blueprint = generateVentureBlueprint(approvedOpportunity(), template);
      expect(() =>
        validateVentureBlueprint({ ...blueprint, requiredAssets: [] }),
      ).toThrow(/requiredAssets/);
    });
  });

  describe("persistence and events", () => {
    it("persists blueprint idempotently", async () => {
      const template = getVentureBlueprintTemplate("affiliate_site");
      const blueprint = generateVentureBlueprint(
        approvedOpportunity({ recommendedBuilder: "affiliate" }),
        template,
      );
      validateVentureBlueprint(blueprint);

      const rows: Record<string, unknown>[] = [];
      const admin = {
        from: (table: string) => {
          if (table !== "venture_blueprints") {
            throw new Error(`Unexpected table ${table}`);
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: rows.find(
                      (r) =>
                        r.organization_id === "org-1" &&
                        r.idempotency_key === `venture-blueprint:opp-1:venture_blueprint_v1`,
                    ) ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => ({
              select: () => ({
                single: async () => {
                  const record = {
                    id: "bp-1",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...payload,
                  };
                  rows.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
          };
        },
      } as unknown as import("@/lib/supabase/admin").AdminSupabaseClient;

      const first = await persistVentureBlueprint(admin, {
        organizationId: "org-1",
        opportunityId: "opp-1",
        blueprint,
        templateKey: template.key,
      });
      expect(first.created).toBe(true);

      const second = await persistVentureBlueprint(admin, {
        organizationId: "org-1",
        opportunityId: "opp-1",
        blueprint,
        templateKey: template.key,
      });
      expect(second.created).toBe(false);
      expect(second.record.id).toBe(first.record.id);
    });

    it("emits BlueprintCreated event", async () => {
      const recordSpy = vi.fn();
      const admin = {
        from: () => ({
          insert: (payload: unknown) => {
            recordSpy(payload);
            return {
              select: () => ({
                single: async () => ({ data: { id: "event-1" }, error: null }),
              }),
            };
          },
        }),
      } as unknown as import("@/lib/supabase/admin").AdminSupabaseClient;

      await emitBlueprintCreatedEvent(admin, {
        organizationId: "org-1",
        created: true,
        blueprint: {
          id: "bp-1",
          organizationId: "org-1",
          opportunityId: "opp-1",
          ventureType: "saas",
          templateKey: "saas",
          templateVersion: "1.0.0",
          schemaVersion: "venture_blueprint_v1",
          status: "validated",
          idempotencyKey: "k1",
          createdAt: new Date().toISOString(),
          blueprint: generateVentureBlueprint(
            approvedOpportunity(),
            getVentureBlueprintTemplate("saas"),
          ),
        },
      });

      expect(recordSpy).toHaveBeenCalled();
      const insertArg = recordSpy.mock.calls[0]?.[0] as { event_type?: string };
      expect(insertArg.event_type).toBe("venture_factory.blueprint_created");
    });
  });

  describe("pipeline", () => {
    it("runs opportunity → template → generate → validate → persist → event", async () => {
      const opportunityRow = {
        id: "opp-1",
        organization_id: "org-1",
        name: "Local HVAC Leads",
        summary: "Lead gen for HVAC contractors",
        problem: "Contractors need leads",
        target_customer: "HVAC contractors",
        industry: "local_services",
        category: "lead_generation",
        business_model: "lead_gen",
        recommended_builder: "custom",
        status: "approved",
        decision: "pending",
        overall_score: 65,
        confidence_score: 60,
      };

      const blueprintRows: Record<string, unknown>[] = [];
      const eventInserts: unknown[] = [];

      const admin = {
        from: (table: string) => {
          if (table === "opportunities") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: opportunityRow, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === "venture_blueprints") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data:
                        blueprintRows.find(
                          (r) => r.idempotency_key === "venture-blueprint:opp-1:venture_blueprint_v1",
                        ) ?? null,
                      error: null,
                    }),
                  }),
                }),
              }),
              insert: (payload: Record<string, unknown>) => ({
                select: () => ({
                  single: async () => {
                    const row = {
                      id: "bp-pipeline-1",
                      created_at: new Date().toISOString(),
                      ...payload,
                    };
                    blueprintRows.push(row);
                    return { data: row, error: null };
                  },
                }),
              }),
            };
          }
          if (table === "engine_events") {
            return {
              insert: (payload: unknown) => {
                eventInserts.push(payload);
                return { select: () => ({ single: async () => ({ data: { id: "e1" }, error: null }) }) };
              },
            };
          }
          throw new Error(`Unexpected table ${table}`);
        },
      } as unknown as import("@/lib/supabase/admin").AdminSupabaseClient;

      const result = await runVentureFactoryPipeline(admin, {
        organizationId: "org-1",
        opportunityId: "opp-1",
      });

      expect(result.alreadyExists).toBe(false);
      expect(result.blueprint.ventureType).toBe("lead_generation_website");
      expect(eventInserts.length).toBeGreaterThan(0);
      expect(JSON.stringify(eventInserts)).toContain("venture_factory.blueprint_created");
    });

    it("fails pipeline for invalid opportunities", async () => {
      const admin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "opp-2",
                    organization_id: "org-1",
                    name: "X",
                    status: "discovered",
                    decision: "pending",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      } as unknown as import("@/lib/supabase/admin").AdminSupabaseClient;

      await expect(
        runVentureFactoryPipeline(admin, {
          organizationId: "org-1",
          opportunityId: "opp-2",
        }),
      ).rejects.toMatchObject({ code: "opportunity_not_approved" });
    });
  });
});
