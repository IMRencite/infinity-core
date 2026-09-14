import { runInstrumentedMission } from "./instrument";
import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";

export const HQ_CROSS_PROCESS_PROOF_MISSION = "HQ_CROSS_PROCESS_LIVE_OBSERVABILITY_PROOF" as const;
export const HQ_CROSS_PROCESS_PROOF_MISSION_ID = "msn_hq_cross_process_live_observability_v1" as const;

export const HQ_CROSS_PROCESS_PROOF_STEPS = [
  "ORCHESTRATE_HQ_CROSS_PROCESS_PROOF",
  "DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY",
  "VALIDATION_REVIEW",
] as const;

export const HQ_CROSS_PROCESS_PROOF_PHASE_MS = 10000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runHqCrossProcessObservabilityProof(input?: {
  organizationId?: string;
  phaseMs?: number;
}): Promise<{
  missionId: typeof HQ_CROSS_PROCESS_PROOF_MISSION_ID;
  durationMs: number;
  providerWrites: 0;
  externalActions: 0;
}> {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const phaseMs = input?.phaseMs ?? HQ_CROSS_PROCESS_PROOF_PHASE_MS;
  const started = Date.now();
  await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: HQ_CROSS_PROCESS_PROOF_MISSION_ID,
      missionType: HQ_CROSS_PROCESS_PROOF_MISSION,
      source: "hq_cross_process_live_observability_proof_v1",
      executionClass: "VENTURE_EXECUTION",
      summary: "Zero-write HQ cross-process observability proof",
    },
    knownSteps: [...HQ_CROSS_PROCESS_PROOF_STEPS],
    orchestrationStepType: "ORCHESTRATE_HQ_CROSS_PROCESS_PROOF",
    run: async (handle) => {
      await handle.step({
        stepType: "DEPLOYMENT_RECONCILIATION_SIMULATION_READ_ONLY",
        engine: "launch_gateway",
        summary: "Reconciling the existing failed Vercel deployment read-only. No provider write.",
        run: () => wait(phaseMs),
      });
      await handle.step({
        stepType: "VALIDATION_REVIEW",
        engine: "market_validation",
        summary: "Reviewing whether durable mission activity is visible to the founder HQ poll.",
        run: () => wait(phaseMs),
      });
      return { providerWrites: 0 as const };
    },
  });
  return {
    missionId: HQ_CROSS_PROCESS_PROOF_MISSION_ID,
    durationMs: Date.now() - started,
    providerWrites: 0,
    externalActions: 0,
  };
}
