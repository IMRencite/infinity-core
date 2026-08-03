import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import { getLatestAllocationForOpportunity, listResourcePools } from "@/lib/infinity/allocation";
import { recordEngineEvent } from "@/lib/infinity/events";
import {
  calculateOpportunityScore,
  mergeReasoningConfig,
  rankValidatedOpportunities,
  type ReasoningContext,
} from "@/lib/infinity/reasoning";
import { getLatestValidationRunForOpportunity } from "@/lib/infinity/validation";
import { processReasoningOutputs } from "./executive";
import {
  buildExecutiveDedupKey,
  DEFAULT_EXECUTIVE_POLICY_VERSION,
  DEFAULT_REASONING_VERSION,
  executiveDecisionToDb,
  isExecutivePlanningEligibleDecision,
} from "./constants-db";
import {
  countActiveExecutiveApprovals,
  countQueuedEnterpriseEntries,
  getExecutiveDecisionByDedupKey,
  loadPortfolioEntriesForExecutive,
} from "./queries";
import { mergeExecutivePolicy } from "./types";
import type { ExecutiveDecisionRecord } from "./types";

export type RunExecutiveEvaluationInput = {
  organizationId: string;
  opportunityId: string;
  missionId?: string | null;
  validationRunId?: string | null;
  correlationId?: string | null;
  dedupKey?: string | null;
};

export type RunExecutiveEvaluationResult = {
  alreadyRun: boolean;
  decisionId: string;
  decision: string;
  planningEligible: boolean;
  queueEntryId: string | null;
  priorityScore: number;
  executiveRecord: ExecutiveDecisionRecord;
};

async function loadReasoningContext(
  admin: AdminSupabaseClient,
  organizationId: string,
  opportunityId: string,
): Promise<ReasoningContext> {
  const { data: opportunity, error: opportunityError } = await admin
    .from("opportunities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", opportunityId)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    throw new Error(`Opportunity not found: ${opportunityError?.message ?? opportunityId}`);
  }

  const validationRun = await getLatestValidationRunForOpportunity(
    admin,
    organizationId,
    opportunityId,
  );

  if (
    !validationRun ||
    validationRun.run_status !== "completed" ||
    validationRun.recommendation !== "approved_for_planning"
  ) {
    throw new Error(
      "Executive evaluation requires a completed validation run with approved_for_planning.",
    );
  }

  const [
    { data: scores },
    { data: evidence },
    { data: evaluation },
    allocation,
  ] = await Promise.all([
    admin
      .from("opportunity_scores")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .order("scored_at", { ascending: false })
      .limit(1),
    admin
      .from("opportunity_evidence")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId),
    admin
      .from("opportunity_evaluations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("opportunity_id", opportunityId)
      .eq("evaluation_status", "completed")
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getLatestAllocationForOpportunity(admin, organizationId, opportunityId),
  ]);

  if (!evaluation) {
    throw new Error("Executive evaluation requires a completed opportunity evaluation.");
  }

  const allocationAmount =
    allocation?.requested_resources &&
    typeof allocation.requested_resources === "object" &&
    allocation.requested_resources !== null &&
    !Array.isArray(allocation.requested_resources) &&
    "capital" in allocation.requested_resources
      ? Number((allocation.requested_resources as Record<string, unknown>).capital ?? 0)
      : null;

  return {
    organizationId,
    opportunityId,
    opportunityName: opportunity.name,
    opportunity,
    validation: {
      validationRunId: validationRun.id,
      recommendation: validationRun.recommendation,
      overallScore:
        validationRun.overall_score !== null ? Number(validationRun.overall_score) : null,
      overallConfidence:
        validationRun.overall_confidence !== null
          ? Number(validationRun.overall_confidence)
          : null,
      completedAt: validationRun.completed_at,
    },
    latestScore: scores?.[0] ?? null,
    evidence: evidence ?? [],
    evaluation,
    allocationAmount,
  };
}

function mapQueueEntryStatus(
  decision: ReturnType<typeof executiveDecisionToDb>,
): "queued" | "deferred" | "approved" | "removed" {
  if (decision === "approve") {
    return "approved";
  }

  if (decision === "defer") {
    return "deferred";
  }

  if (decision === "queue") {
    return "queued";
  }

  return "removed";
}

export async function runExecutiveEvaluation(
  admin: AdminSupabaseClient,
  input: RunExecutiveEvaluationInput,
): Promise<RunExecutiveEvaluationResult> {
  const validationRun = input.validationRunId
    ? (
        await admin
          .from("validation_runs")
          .select("*")
          .eq("organization_id", input.organizationId)
          .eq("id", input.validationRunId)
          .maybeSingle()
      ).data
    : await getLatestValidationRunForOpportunity(
        admin,
        input.organizationId,
        input.opportunityId,
      );

  if (
    !validationRun ||
    validationRun.opportunity_id !== input.opportunityId ||
    validationRun.recommendation !== "approved_for_planning" ||
    validationRun.run_status !== "completed"
  ) {
    throw new Error("Executive evaluation requires approved_for_planning validation run.");
  }

  const dedupKey =
    input.dedupKey ??
    buildExecutiveDedupKey({
      opportunityId: input.opportunityId,
      validationRunId: validationRun.id,
      reasoningVersion: DEFAULT_REASONING_VERSION,
      policyVersion: DEFAULT_EXECUTIVE_POLICY_VERSION,
    });

  const existing = await getExecutiveDecisionByDedupKey(
    admin,
    input.organizationId,
    dedupKey,
  );

  if (existing) {
    const { data: queueEntry } = await admin
      .from("enterprise_queue_entries")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("executive_decision_id", existing.id)
      .maybeSingle();

    return {
      alreadyRun: true,
      decisionId: existing.id,
      decision: existing.decision,
      planningEligible: existing.planning_eligible,
      queueEntryId: queueEntry?.id ?? null,
      priorityScore: Number(existing.priority_score),
      executiveRecord: {
        organizationId: existing.organization_id,
        opportunityId: existing.opportunity_id,
        opportunityName: "",
        decision: existing.decision.toUpperCase() as ExecutiveDecisionRecord["decision"],
        reasoningOutcome: "",
        reasoningScore: 0,
        reasoningRank: 0,
        signals: {
          expectedRoiScore: null,
          timeToValueScore: null,
          riskScore: null,
          strategicAlignmentScore: null,
          enterpriseValueScore: null,
          portfolioConcentration: 0,
          capitalSufficient: true,
          capacityAvailable: true,
          workloadWithinLimits: true,
        },
        rationale: [],
        decidedAt: existing.created_at,
      },
    };
  }

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "executive_engine",
    eventType: "executive.evaluation_started",
    entityType: "opportunity",
    entityId: input.opportunityId,
    message: "Executive evaluation started",
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      validation_run_id: validationRun.id,
      dedup_key: dedupKey,
    },
  });

  const reasoningContext = await loadReasoningContext(
    admin,
    input.organizationId,
    input.opportunityId,
  );

  const config = mergeReasoningConfig();
  const scored = calculateOpportunityScore(reasoningContext, config);
  const ranked = rankValidatedOpportunities([scored], config)[0];

  if (!ranked) {
    throw new Error("Deterministic reasoning did not produce a ranked opportunity.");
  }

  const pools = await listResourcePools(admin, input.organizationId);
  const capitalTotals = pools.reduce(
    (acc, pool) => {
      acc.totalCapacity += Number(pool.total_capacity);
      acc.reservedCapacity += Number(pool.reserved_capacity);
      acc.consumedCapacity += Number(pool.consumed_capacity);
      return acc;
    },
    { totalCapacity: 0, reservedCapacity: 0, consumedCapacity: 0 },
  );

  const portfolioEntries = await loadPortfolioEntriesForExecutive(
    admin,
    input.organizationId,
  );

  const activeBuilds = await countActiveExecutiveApprovals(admin, input.organizationId);
  const queuedBuilds = await countQueuedEnterpriseEntries(admin, input.organizationId);

  const allocation = await getLatestAllocationForOpportunity(
    admin,
    input.organizationId,
    input.opportunityId,
  );

  let requestedAmount = 10_000;
  if (
    allocation?.requested_resources &&
    typeof allocation.requested_resources === "object" &&
    allocation.requested_resources !== null &&
    !Array.isArray(allocation.requested_resources)
  ) {
    requestedAmount = Number(
      (allocation.requested_resources as Record<string, unknown>).capital ?? requestedAmount,
    );
  }

  const processing = processReasoningOutputs([ranked], {
    organizationId: input.organizationId,
    portfolioEntries: portfolioEntries.map((entry) => ({
      opportunityId: entry.opportunityId,
      industry: entry.industry,
      category: entry.category,
      decision: entry.decision,
    })),
    capital: capitalTotals,
    workload: { activeBuilds, queuedBuilds },
    opportunityMeta: {
      [input.opportunityId]: {
        industry: reasoningContext.opportunity.industry,
        category: reasoningContext.opportunity.category,
        requestedAmount,
      },
    },
    policy: mergeExecutivePolicy(),
  });

  const executiveRecord = processing.decisions[0];
  if (!executiveRecord) {
    throw new Error("Executive processing returned no decision.");
  }

  const decisionDb = executiveDecisionToDb(executiveRecord.decision);
  const planningEligible = isExecutivePlanningEligibleDecision(decisionDb);
  const policy = mergeExecutivePolicy();

  const { data: previousActive } = await admin
    .from("executive_decisions")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .eq("record_status", "active");

  const supersedesId = previousActive?.[0]?.id ?? null;

  if (previousActive && previousActive.length > 0) {
    await admin
      .from("executive_decisions")
      .update({ record_status: "superseded" })
      .eq("organization_id", input.organizationId)
      .eq("opportunity_id", input.opportunityId)
      .eq("record_status", "active");
  }

  await admin
    .from("enterprise_queue_entries")
    .update({ entry_status: "superseded", updated_at: new Date().toISOString() })
    .eq("organization_id", input.organizationId)
    .eq("opportunity_id", input.opportunityId)
    .in("entry_status", ["queued", "deferred", "approved"]);

  const queueItem = processing.queue.find(
    (item) => item.opportunityId === input.opportunityId,
  );

  const priorityScore = queueItem?.queuePriority ?? executiveRecord.reasoningScore;

  const { data: inserted, error: insertError } = await admin
    .from("executive_decisions")
    .insert({
      organization_id: input.organizationId,
      mission_id: input.missionId ?? null,
      opportunity_id: input.opportunityId,
      validation_run_id: validationRun.id,
      reasoning_version: DEFAULT_REASONING_VERSION,
      executive_policy_version: DEFAULT_EXECUTIVE_POLICY_VERSION,
      decision: decisionDb,
      priority_score: priorityScore,
      rationale: executiveRecord.rationale,
      policy_results: {
        signals: executiveRecord.signals,
        reasoning_outcome: executiveRecord.reasoningOutcome,
        reasoning_score: executiveRecord.reasoningScore,
        reasoning_rank: executiveRecord.reasoningRank,
        policy: policy,
      },
      capital_context: {
        ...capitalTotals,
        requested_amount: requestedAmount,
        active_builds: activeBuilds,
        queued_builds: queuedBuilds,
      },
      correlation_id: input.correlationId,
      record_status: "active",
      planning_eligible: planningEligible,
      dedup_key: dedupKey,
      supersedes_id: supersedesId,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to persist executive decision: ${insertError?.message ?? "unknown error"}`,
    );
  }

  let queueEntryId: string | null = null;

  if (queueItem && ["APPROVE", "QUEUE", "DEFER"].includes(executiveRecord.decision)) {
    const { data: allQueueDecisions } = await admin
      .from("executive_decisions")
      .select("id, opportunity_id, priority_score, decision")
      .eq("organization_id", input.organizationId)
      .eq("record_status", "active")
      .in("decision", ["approve", "queue", "defer"]);

    const sorted = [...(allQueueDecisions ?? [])].sort(
      (a, b) => Number(b.priority_score) - Number(a.priority_score),
    );

    const position =
      sorted.findIndex((row) => row.id === inserted.id) >= 0
        ? sorted.findIndex((row) => row.id === inserted.id) + 1
        : sorted.length;

    const { data: queueRow, error: queueError } = await admin
      .from("enterprise_queue_entries")
      .insert({
        organization_id: input.organizationId,
        opportunity_id: input.opportunityId,
        executive_decision_id: inserted.id,
        queue_position: position,
        queue_priority: priorityScore,
        entry_status: mapQueueEntryStatus(decisionDb),
        planning_eligible: planningEligible,
        ordering_rationale: executiveRecord.rationale,
      })
      .select("id")
      .single();

    if (queueError) {
      throw new Error(`Failed to persist enterprise queue entry: ${queueError.message}`);
    }

    queueEntryId = queueRow?.id ?? null;

    await recordEngineEvent(admin, {
      organizationId: input.organizationId,
      engineName: "executive_engine",
      eventType: "executive.queue_updated",
      entityType: "enterprise_queue_entry",
      entityId: queueEntryId ?? inserted.id,
      message: "Enterprise build queue updated",
      correlationId: input.correlationId ?? undefined,
      payload: {
        opportunity_id: input.opportunityId,
        queue_position: position,
        queue_priority: priorityScore,
        planning_eligible: planningEligible,
      },
    });
  }

  const decisionEventMap = {
    approve: "executive.opportunity_approved",
    defer: "executive.opportunity_deferred",
    reject: "executive.opportunity_rejected",
    queue: "executive.opportunity_queued",
    research_more: "executive.research_requested",
  } as const;

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "executive_engine",
    eventType: "executive.decision_created",
    entityType: "executive_decision",
    entityId: inserted.id,
    message: `Executive decision created: ${decisionDb}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      validation_run_id: validationRun.id,
      decision: decisionDb,
      priority_score: priorityScore,
      planning_eligible: planningEligible,
      dedup_key: dedupKey,
    },
  });

  await recordEngineEvent(admin, {
    organizationId: input.organizationId,
    engineName: "executive_engine",
    eventType: decisionEventMap[decisionDb],
    entityType: "executive_decision",
    entityId: inserted.id,
    message: `Executive outcome recorded: ${decisionDb}`,
    correlationId: input.correlationId ?? undefined,
    payload: {
      opportunity_id: input.opportunityId,
      rationale: executiveRecord.rationale,
      policy_results: executiveRecord.signals,
    },
  });

  return {
    alreadyRun: false,
    decisionId: inserted.id,
    decision: decisionDb,
    planningEligible,
    queueEntryId,
    priorityScore,
    executiveRecord: {
      ...executiveRecord,
      opportunityName: ranked.opportunityName,
    },
  };
}
