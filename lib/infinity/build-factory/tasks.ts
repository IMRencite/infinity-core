import type { Json } from "@/lib/supabase/database.types";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { BuildTaskNode, PersistedBuild } from "./types";
import { taskGraphStepOrder } from "./task-graph";
import { emitBuildFactoryEvent } from "./events";

export async function createBuildPlanSteps(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    planId: string;
    build: PersistedBuild;
    tasks: BuildTaskNode[];
    opportunityId: string;
    missionId: string;
  },
): Promise<string[]> {
  const order = taskGraphStepOrder(
    input.build.projectType,
    input.build.specification.aiWebsiteGeneration?.enabled ?? false,
  );
  const createdIds: string[] = [];

  const { count } = await admin
    .from("plan_steps")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", input.organizationId)
    .eq("plan_id", input.planId)
    .filter("constraints->>build_id", "eq", input.build.id);

  if ((count ?? 0) > 0) {
    const { data: existingSteps } = await admin
      .from("plan_steps")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("plan_id", input.planId)
      .filter("constraints->>build_id", "eq", input.build.id);
    return (existingSteps ?? []).map((s) => s.id);
  }

  let stepOrderBase = 100;
  const { data: maxStep } = await admin
    .from("plan_steps")
    .select("step_order")
    .eq("plan_id", input.planId)
    .order("step_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxStep?.step_order) {
    stepOrderBase = maxStep.step_order + 1;
  }

  for (let i = 0; i < order.length; i++) {
    const capabilityKey = order[i]!;
    const task = input.tasks.find((t) => t.capabilityKey === capabilityKey);
    const constraints = {
      organization_id: input.organizationId,
      mission_id: input.missionId,
      opportunity_id: input.opportunityId,
      build_id: input.build.id,
      plan_id: input.planId,
      task_id: task?.id,
      build_factory: true,
    } satisfies Json as Json;

    const { data: step, error } = await admin
      .from("plan_steps")
      .insert({
        organization_id: input.organizationId,
        plan_id: input.planId,
        step_order: stepOrderBase + i,
        capability_key: capabilityKey,
        title: `Build factory: ${capabilityKey}`,
        description: "Internal build factory task — not deployed",
        constraints,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !step) {
      throw new Error(`Failed to create build plan step: ${error?.message}`);
    }

    createdIds.push(step.id);

    await emitBuildFactoryEvent(admin, {
      organizationId: input.organizationId,
      eventType: "build.task_created",
      message: `Build task plan step created for ${capabilityKey}`,
      correlationId: input.build.correlationId ?? crypto.randomUUID(),
      buildId: input.build.id,
      payload: { plan_step_id: step.id, capability_key: capabilityKey },
    });
  }

  return createdIds;
}
