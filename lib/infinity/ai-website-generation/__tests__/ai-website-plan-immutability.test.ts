import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBuildFactoryE2EValidation } from "@/lib/infinity/build-factory/validate-e2e";
import { loadAiWebsitePlanForBuild } from "@/lib/infinity/ai-website-generation/persistence";

const runLive =
  process.env.RUN_AI_WEBSITE_IMMUTABILITY_TESTS === "true" ||
  process.env.RUN_AI_WEBSITE_GENERATION_E2E_LIVE === "true";

describe("AI website generation plan immutability (database)", () => {
  it("migration defines semantic immutability trigger with safe search_path", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260803120000_ai_website_plans_immutability_v1.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("prevent_ai_website_plan_semantic_mutation");
    expect(sql).toContain("structured_plan IS DISTINCT FROM OLD.structured_plan");
    expect(sql).toContain("cannot be deleted");
  });

  it.runIf(runLive)(
    "approved plans reject semantic mutation; revisions create new rows",
    async () => {
      const admin = createAdminClient();
      process.env.AI_WEBSITE_GENERATION_MODE = "mock";
      process.env.ALLOW_AI_WEBSITE_E2E_AUTO_APPROVE = "true";
      process.env.RUN_BUILD_FACTORY_E2E_LIVE = "true";

      const base = await runBuildFactoryE2EValidation(admin);
      const plan = await loadAiWebsitePlanForBuild(admin, base.organizationId, base.buildId);
      expect(plan?.status).toBe("approved");

      const { error: structuredErr } = await admin
        .from("ai_website_generation_plans")
        .update({ structured_plan: { tampered: true } })
        .eq("id", plan!.id);
      expect(structuredErr?.message).toMatch(/immutable|semantic/i);

      const { error: contextErr } = await admin
        .from("ai_website_generation_plans")
        .update({ context_hash: "tampered-context-hash-value" })
        .eq("id", plan!.id);
      expect(contextErr?.message).toMatch(/immutable|semantic/i);

      const { error: outputErr } = await admin
        .from("ai_website_generation_plans")
        .update({ output_hash: "tampered-output-hash-value000000000000" })
        .eq("id", plan!.id);
      expect(outputErr?.message).toMatch(/immutable|semantic/i);

      const { error: providerErr } = await admin
        .from("ai_website_generation_plans")
        .update({ provider: "openai", model: "gpt-4o" })
        .eq("id", plan!.id);
      expect(providerErr?.message).toMatch(/immutable|semantic/i);

      const { error: buildErr } = await admin
        .from("ai_website_generation_plans")
        .update({ build_id: crypto.randomUUID() })
        .eq("id", plan!.id);
      expect(buildErr?.message).toMatch(/immutable|semantic/i);

      const { data: pendingPlan } = await admin
        .from("ai_website_generation_plans")
        .insert({
          organization_id: base.organizationId,
          mission_id: base.missionId,
          opportunity_id: base.opportunityId,
          venture_blueprint_id: base.blueprintId,
          build_id: base.buildId,
          build_specification_id: base.buildId,
          provider: "mock",
          model: "mock-website-plan-v1",
          mode: "mock",
          plan_version: "99",
          prompt_version: "ai_website_prompt_v1",
          schema_version: "ai_website_generation_plan_v1",
          status: "running",
          review_status: "pending",
          context_manifest: [],
          context_hash: `pending-${Date.now()}`,
          idempotency_key: `immutability-pending-${Date.now()}`,
        })
        .select("id")
        .single();

      expect(pendingPlan?.id).toBeTruthy();
      const { error: advanceErr } = await admin
        .from("ai_website_generation_plans")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", pendingPlan!.id);
      expect(advanceErr).toBeNull();

      const { data: originalAfter } = await admin
        .from("ai_website_generation_plans")
        .select("structured_plan, context_hash, output_hash, provider, plan_version")
        .eq("id", plan!.id)
        .single();
      expect(originalAfter?.context_hash).toBe(plan!.contextHash);
      expect(originalAfter?.provider).toBe(plan!.provider);

      const { count: planRows } = await admin
        .from("ai_website_generation_plans")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", base.organizationId)
        .eq("build_id", base.buildId);
      expect((planRows ?? 0) >= 1).toBe(true);
    },
    900_000,
  );
});
