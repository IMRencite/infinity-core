import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { OrchestrationSessionResult } from "./types";
import { getModelRegistry } from "./registry";

export async function seedAiModelRegistry(admin: AdminSupabaseClient): Promise<void> {
  const models = getModelRegistry();
  for (const model of models) {
    await admin.from("ai_model_registry").upsert(
      {
        provider: model.provider,
        model_id: model.modelId,
        display_name: model.displayName,
        capabilities: model.capabilities as never,
        estimated_input_cost_per_1k: model.estimatedInputCostPer1k,
        estimated_output_cost_per_1k: model.estimatedOutputCostPer1k,
        context_limit: model.contextLimit,
        latency_tier: model.latencyTier,
        availability: model.availability,
        metadata: { historicalSuccessRate: model.historicalSuccessRate ?? null },
      },
      { onConflict: "provider,model_id" },
    );
  }
}

export async function persistOrchestrationSession(
  admin: AdminSupabaseClient,
  input: {
    organizationId: string;
    productAssetBuildRunId?: string;
    idempotencyKey: string;
    correlationId: string;
    result: OrchestrationSessionResult;
  },
): Promise<string> {
  const { data: session, error: sessionError } = await admin
    .from("ai_orchestration_sessions")
    .insert({
      organization_id: input.organizationId,
      task_type: input.result.taskCharacteristics.taskType,
      execution_strategy: input.result.strategy,
      status: input.result.status === "completed" ? "completed" : input.result.status,
      task_characteristics: input.result.taskCharacteristics as never,
      synthesis_result: input.result.synthesis as never,
      disagreements: input.result.disagreements as never,
      total_estimated_cost_usd: input.result.totalCostUsd,
      correlation_id: input.correlationId,
      idempotency_key: input.idempotencyKey,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  for (const exec of input.result.executions) {
    await admin.from("ai_task_executions").insert({
      organization_id: input.organizationId,
      orchestration_session_id: session.id,
      product_asset_build_run_id: input.productAssetBuildRunId ?? null,
      provider: exec.provider,
      model_id: exec.modelId,
      brain_role: exec.role,
      task_type: input.result.taskCharacteristics.taskType,
      complexity: input.result.taskCharacteristics.complexity,
      input_tokens: exec.inputTokens,
      output_tokens: exec.outputTokens,
      estimated_cost_usd: exec.estimatedCostUsd,
      latency_ms: exec.latencyMs,
      success: exec.success,
      validation_result: exec.success ? "pass" : "fail",
      output: { content: exec.content, structured: exec.structured ?? {} } as never,
    });
  }

  for (const disagreement of input.result.disagreements) {
    await admin.from("ai_task_disagreements").insert({
      organization_id: input.organizationId,
      orchestration_session_id: session.id,
      topic: disagreement.topic,
      positions: disagreement.positions as never,
      resolution: disagreement.resolution,
    });
  }

  return session.id;
}
