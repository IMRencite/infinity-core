import type { CodingCapability, ProviderAvailability } from "./constants";
import type { CodingAgentExecutionRequest, CodingAgentProvider, CodingAgentProviderResult } from "./types";

export type { CodingAgentProvider };

export function providerSupports(provider: CodingAgentProvider, capability: CodingCapability): boolean {
  return provider.supports(capability);
}

export function isProviderReady(provider: CodingAgentProvider): boolean {
  return provider.availability() === "AVAILABLE";
}

export async function runProvider(
  provider: CodingAgentProvider,
  request: CodingAgentExecutionRequest,
): Promise<CodingAgentProviderResult> {
  return provider.execute(request);
}

export function availabilityLabel(state: ProviderAvailability): string {
  return state;
}
