import type { ResearchConfig } from "../config";
import type { ResearchProviderId } from "../constants";
import type { GroundedResearchProvider } from "../provider-contract";
import { createGeminiGroundedResearchProvider } from "./gemini-provider";
import { createMockGroundedResearchProvider } from "./mock-provider";

export function getGroundedResearchProvider(
  providerId: ResearchProviderId,
  config: ResearchConfig,
): GroundedResearchProvider {
  if (providerId === "mock") {
    return createMockGroundedResearchProvider();
  }
  if (providerId === "gemini") {
    return createGeminiGroundedResearchProvider(config);
  }
  throw new Error(`Research provider not registered: ${providerId}`);
}
