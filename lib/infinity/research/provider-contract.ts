import type { ResearchProviderId } from "./constants";
import type { ResearchProviderCallResult } from "./types";

export type GroundedResearchProviderRequest = {
  correlationId: string;
  systemInstructions: string;
  researchObjective: string;
  modelId: string;
  responseSchema: Record<string, unknown>;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
};

export type GroundedResearchProvider = {
  readonly providerId: ResearchProviderId;
  readonly isSimulation: boolean;
  executeGroundedResearch(
    request: GroundedResearchProviderRequest,
  ): Promise<ResearchProviderCallResult>;
};
