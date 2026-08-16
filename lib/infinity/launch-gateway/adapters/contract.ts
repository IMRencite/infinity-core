export type AdapterCapabilities = {
  provider: string;
  adapterKey: string;
  supportedActions: string[];
  supportsSimulation: boolean;
  supportsVerification: boolean;
  supportsRollback: boolean;
  networkRequired: boolean;
  financialSideEffectPossible: boolean;
  liveExecutionEnabled: boolean;
};

export type AdapterContext = {
  organizationId: string;
  actionType: string;
  target: string;
  payload: Record<string, unknown>;
  correlationId: string | null;
};

export type AdapterEstimate = {
  estimatedCostUsd: number | null;
  currency: string;
};

export type AdapterSimulationResult = {
  simulated: boolean;
  externalIds: Record<string, string>;
  manifest: Record<string, unknown>;
};

export type AdapterVerificationResult = {
  verified: boolean;
  details: string[];
};

export interface ExternalActionAdapter {
  capabilities: AdapterCapabilities;
  validate(ctx: AdapterContext): Promise<{ valid: boolean; issues: string[] }>;
  estimate(ctx: AdapterContext): Promise<AdapterEstimate>;
  simulate(ctx: AdapterContext): Promise<AdapterSimulationResult>;
  execute(ctx: AdapterContext): Promise<AdapterSimulationResult>;
  verify(
    ctx: AdapterContext,
    result: AdapterSimulationResult,
  ): Promise<AdapterVerificationResult>;
  rollback?(
    ctx: AdapterContext,
    result: AdapterSimulationResult,
  ): Promise<{ rolledBack: boolean; reason?: string }>;
}
