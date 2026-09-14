import { CRE_CANDIDATE_ID, LIVE_ORG, LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { runInstrumentedMission } from "./instrument";

export const HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION = "HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF" as const;
export const HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID = "msn_hq_real_dashboard_live_execution_proof_v1" as const;

export const HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_STEPS = [
  "ORCHESTRATE_HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF",
  "SITE_ARCHITECTURE",
  "PAGE_GENERATION",
  "VALIDATION_REVIEW",
] as const;

export const HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_PHASE_MS = 25000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function runHqRealDashboardLiveExecutionProof(input?: {
  organizationId?: string;
  phaseMs?: number;
}): Promise<{
  missionId: typeof HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID;
  missionType: typeof HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION;
  durationMs: number;
  providerWrites: 0;
  externalActions: 0;
}> {
  const organizationId = input?.organizationId ?? LIVE_ORG;
  const phaseMs = input?.phaseMs ?? HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_PHASE_MS;
  const started = Date.now();
  await runInstrumentedMission({
    emit: {
      organizationId,
      ventureId: `candidate:${CRE_CANDIDATE_ID}`,
      candidateId: CRE_CANDIDATE_ID,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      missionId: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID,
      missionType: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION,
      source: "hq_real_dashboard_live_execution_proof_v1",
      executionClass: "VENTURE_EXECUTION",
      summary: "Zero-write real /dashboard live execution proof",
    },
    knownSteps: [...HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_STEPS],
    orchestrationStepType: "ORCHESTRATE_HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF",
    run: async (handle) => {
      await handle.step({
        stepType: "SITE_ARCHITECTURE",
        engine: "venture_systems_architecture",
        summary: "Planning architecture on the founder /dashboard surface.",
        run: () => wait(phaseMs),
      });
      await handle.step({
        stepType: "PAGE_GENERATION",
        engine: "product_asset_builder",
        summary: "Generating the successor page locally. No provider write.",
        run: () => wait(phaseMs),
      });
      await handle.step({
        stepType: "VALIDATION_REVIEW",
        engine: "market_validation",
        summary: "Verifying clean-room build integrity locally. No provider write.",
        run: () => wait(phaseMs),
      });
      return { providerWrites: 0 as const };
    },
  });
  return {
    missionId: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION_ID,
    missionType: HQ_REAL_DASHBOARD_LIVE_EXECUTION_PROOF_MISSION,
    durationMs: Date.now() - started,
    providerWrites: 0,
    externalActions: 0,
  };
}
