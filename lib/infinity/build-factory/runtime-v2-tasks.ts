import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { createBuildPlanSteps } from "./tasks";

const GENERIC_QA_CAPABILITY = "qa.verify_generic_internal_build";

export async function appendGenericQaPlanStep(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    buildId: string;
    buildJobId: string;
    missionId: string;
    opportunityId: string;
  },
): Promise<void> {
  const { data: existing } = await admin
    .from("plan_steps")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .eq("capability_key", GENERIC_QA_CAPABILITY)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { data: maxOrder } = await admin
    .from("plan_steps")
    .select("step_order")
    .eq("plan_id", input.planId)
    .order("step_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepOrder = (maxOrder?.step_order ?? 0) + 1;

  await admin.from("plan_steps").insert({
    organization_id: input.organizationId,
    plan_id: input.planId,
    step_order: stepOrder,
    capability_key: GENERIC_QA_CAPABILITY,
    title: "Generic Build Factory QA",
    description:
      "Independent QA for generic BuildJob lifecycle — internal only; not deployed or published.",
    constraints: {
      build_id: input.buildId,
      build_job_id: input.buildJobId,
      mission_id: input.missionId,
      opportunity_id: input.opportunityId,
      integration: "build_factory_runtime_v2",
    },
    status: "pending",
  });
}

export { GENERIC_QA_CAPABILITY };
