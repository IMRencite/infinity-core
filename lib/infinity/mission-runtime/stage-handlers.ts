import type { MissionRuntimeStage } from "./constants";
import type {
  MissionRuntimeContext,
  MissionRuntimeInstance,
  StageEvaluation,
  StageInspectionSnapshot,
} from "./types";

function idempotencyKey(instance: MissionRuntimeInstance, suffix: string): string {
  return `runtime:${instance.id}:${instance.currentStage}:${suffix}`;
}

function hasIdempotency(context: MissionRuntimeContext, key: string): boolean {
  return context.idempotency[key] === true;
}

export function evaluateStage(
  instance: MissionRuntimeInstance,
  inspection: StageInspectionSnapshot,
): StageEvaluation {
  const stage = instance.currentStage;
  const context = instance.context;

  switch (stage) {
    case "command": {
      if (!inspection.missionActive) {
        return {
          outcome: { kind: "block", reason: "Mission is not active." },
          workRequest: { kind: "none" },
        };
      }

      const key = idempotencyKey(instance, "command_cycle");
      if (!hasIdempotency(context, key)) {
        return {
          outcome: {
            kind: "wait",
            reason: "Command cycle requested for strategic intent.",
          },
          workRequest: { kind: "command_autonomous", idempotencyKey: key },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "discovery", reason: "Command context recorded." },
        workRequest: { kind: "none" },
      };
    }

    case "discovery": {
      if (inspection.hasPendingDiscoveryJobs) {
        return {
          outcome: { kind: "wait", reason: "Discovery jobs in progress." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      const key = idempotencyKey(instance, "discovery_cycle");
      if (!hasIdempotency(context, key) && !inspection.hasCompletedPlanStepJob) {
        return {
          outcome: { kind: "wait", reason: "Discovery work requested." },
          workRequest: { kind: "command_discovery", idempotencyKey: key },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "evaluation", reason: "Discovery stage complete." },
        workRequest: { kind: "none" },
      };
    }

    case "evaluation": {
      if (inspection.hasPendingDecisionJobs) {
        return {
          outcome: { kind: "wait", reason: "Decision evaluation jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "validation", reason: "Evaluation complete." },
        workRequest: { kind: "none" },
      };
    }

    case "validation": {
      if (inspection.hasPendingValidationJobs) {
        return {
          outcome: { kind: "wait", reason: "Validation jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (!inspection.latestValidationRunCompleted) {
        return {
          outcome: { kind: "wait", reason: "Validation run must complete before reasoning." },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: {
            kind: "block",
            reason: "Validation must be approved_for_planning before reasoning.",
          },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "reasoning", reason: "Validation gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "allocation": {
      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: {
            kind: "block",
            reason: "Allocation requires validation approved_for_planning.",
          },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.hasPlannerEligiblePlan) {
        return {
          outcome: { kind: "block", reason: "Allocation requires an eligible persisted plan." },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.allocationProposalRecorded) {
        const key = idempotencyKey(instance, "allocation_proposal");
        if (!hasIdempotency(context, key)) {
          return {
            outcome: { kind: "wait", reason: "Allocation proposal required (no spend)." },
            workRequest: { kind: "command_autonomous", idempotencyKey: key },
          };
        }
      }

      return {
        outcome: { kind: "advance", nextStage: "scheduling", reason: "Allocation proposal recorded." },
        workRequest: { kind: "none" },
      };
    }

    case "reasoning": {
      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: {
            kind: "block",
            reason: "Validation must remain approved_for_planning for governed reasoning.",
          },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.hasExecutiveContext) {
        const ctxKey = idempotencyKey(instance, "executive_build_context");
        if (!hasIdempotency(context, ctxKey)) {
          return {
            outcome: { kind: "wait", reason: "Executive context job requested." },
            workRequest: {
              kind: "executive_build_context",
              idempotencyKey: ctxKey,
              contextHash: inspection.executiveContextHash ?? "pending",
            },
          };
        }
        return {
          outcome: { kind: "wait", reason: "Executive context required before reasoning." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (inspection.hasPendingReasoningJobs) {
        return {
          outcome: { kind: "wait", reason: "Governed reasoning job in progress." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (!inspection.primaryOpportunityId) {
        return {
          outcome: { kind: "block", reason: "No opportunity available for governed reasoning." },
          workRequest: { kind: "none" },
        };
      }

      const jobKey = idempotencyKey(instance, "advisory_job");
      if (!inspection.hasCompletedGovernedReasoningSession && !hasIdempotency(context, jobKey)) {
        return {
          outcome: { kind: "wait", reason: "Governed advisory reasoning job requested." },
          workRequest: {
            kind: "reasoning_advisory_job",
            idempotencyKey: jobKey,
            opportunityId: inspection.primaryOpportunityId,
          },
        };
      }

      if (!inspection.hasCompletedGovernedReasoningSession) {
        return {
          outcome: { kind: "wait", reason: "Waiting for governed reasoning session completion." },
          workRequest: { kind: "none" },
        };
      }

      if (inspection.governedReasoningMode === "shadow") {
        return {
          outcome: {
            kind: "advance",
            nextStage: "executive",
            reason: "Shadow reasoning recorded; output does not affect gates.",
          },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: {
          kind: "advance",
          nextStage: "executive",
          reason: "Governed advisory reasoning complete; Executive review required.",
        },
        workRequest: { kind: "none" },
      };
    }

    case "executive": {
      if (inspection.hasPendingExecutiveJobs) {
        return {
          outcome: { kind: "wait", reason: "Executive selection jobs running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (inspection.hasExecutiveEscalationPending) {
        return {
          outcome: {
            kind: "wait",
            reason: "Executive escalation requires human review before planning.",
          },
          workRequest: { kind: "none" },
        };
      }

      if (
        inspection.hasExecutiveContext &&
        !inspection.hasExecutiveSelectionQaPassed &&
        !inspection.hasExecutiveSelectionPlanningEligible &&
        inspection.executiveContextId &&
        inspection.executiveContextHash
      ) {
        const key = idempotencyKey(instance, "exec_sel_remainder");
        if (!hasIdempotency(context, key)) {
          return {
            outcome: { kind: "wait", reason: "Executive autonomous selection pipeline requested." },
            workRequest: {
              kind: "executive_selection_remainder",
              idempotencyKey: key,
              contextHash: inspection.executiveContextHash,
              executiveContextId: inspection.executiveContextId,
            },
          };
        }
        return {
          outcome: { kind: "wait", reason: "Waiting for Executive selection QA." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (inspection.hasExecutiveRejectOrDefer && !inspection.hasExecutiveSelectionPlanningEligible) {
        return {
          outcome: { kind: "block", reason: "Executive rejected or deferred opportunity." },
          workRequest: { kind: "none" },
        };
      }

      if (!inspection.hasExecutiveApproveOrQueue) {
        if (!inspection.hasExecutiveContext) {
          return {
            outcome: { kind: "wait", reason: "Executive decision required." },
            workRequest: { kind: "command_autonomous", idempotencyKey: idempotencyKey(instance, "executive") },
          };
        }
        return {
          outcome: { kind: "wait", reason: "Executive autonomous selection in progress." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (!inspection.latestValidationApprovedForPlanning) {
        return {
          outcome: { kind: "block", reason: "Executive gate blocked: validation no longer approved." },
          workRequest: { kind: "none" },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "planning", reason: "Executive gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "planning": {
      if (!inspection.hasPlannerEligiblePlan) {
        const key = idempotencyKey(instance, "planner_executive_handoff");
        if (!hasIdempotency(context, key)) {
          return {
            outcome: { kind: "wait", reason: "Planner Executive handoff requested." },
            workRequest: { kind: "planner_executive_handoff", idempotencyKey: key },
          };
        }
        return {
          outcome: {
            kind: "wait",
            reason: inspection.plannerHandoffBlocker ?? "Planner gate: eligible plan not ready.",
          },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "allocation", reason: "Planner gate satisfied." },
        workRequest: { kind: "none" },
      };
    }

    case "scheduling": {
      if (
        inspection.hasPendingDiscoveryJobs ||
        inspection.hasPendingDecisionJobs ||
        inspection.hasPendingValidationJobs ||
        inspection.hasPendingExecutiveJobs
      ) {
        return {
          outcome: { kind: "wait", reason: "Scheduled engine jobs still pending." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "execution", reason: "Scheduling stage complete." },
        workRequest: { kind: "none" },
      };
    }

    case "execution": {
      if (inspection.hasPendingWorkerCapabilityJobs) {
        return {
          outcome: { kind: "wait", reason: "Worker capability jobs still pending." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      if (inspection.hasWorkerResultsAwaitingReview) {
        return {
          outcome: { kind: "wait", reason: "Worker results awaiting independent QA review." },
          workRequest: { kind: "none" },
        };
      }

      if (inspection.hasPendingBuildJobs) {
        return {
          outcome: {
            kind: "block",
            reason: "Build Factory capabilities are not implemented; mission blocked at execution.",
          },
          workRequest: { kind: "none" },
        };
      }

      if (
        inspection.hasPendingDiscoveryJobs ||
        inspection.hasPendingDecisionJobs ||
        inspection.hasPendingValidationJobs ||
        inspection.hasPendingExecutiveJobs
      ) {
        return {
          outcome: { kind: "wait", reason: "Safe execution jobs still running." },
          workRequest: { kind: "run_next_job", idempotencyKey: idempotencyKey(instance, "run_job") },
        };
      }

      return {
        outcome: { kind: "advance", nextStage: "review", reason: "Execution observations complete." },
        workRequest: { kind: "none" },
      };
    }

    case "review": {
      return {
        outcome: { kind: "advance", nextStage: "completed", reason: "Review recorded deterministically." },
        workRequest: { kind: "none" },
      };
    }

    case "completed": {
      return {
        outcome: { kind: "complete", reason: "Mission runtime finalized." },
        workRequest: { kind: "none" },
      };
    }

    default: {
      const exhaustive: never = stage;
      return {
        outcome: { kind: "fail", reason: `Unknown stage ${String(exhaustive)}.` },
        workRequest: { kind: "none" },
      };
    }
  }
}

export function stageLabel(stage: MissionRuntimeStage): string {
  return stage;
}
