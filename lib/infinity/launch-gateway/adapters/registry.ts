import type { ExternalActionAdapter } from "./contract";
import { mockInfinityAdapter } from "./mock-provider";
import { githubAdapter } from "./github-adapter";
import { vercelAdapter } from "./vercel-adapter";
import { MOCK_PROVIDER_KEY } from "../constants";
import { PROVIDER_KEYS } from "../provider-config";

export function resolveAdapter(adapterKey: string): ExternalActionAdapter {
  if (adapterKey === MOCK_PROVIDER_KEY) return mockInfinityAdapter;
  if (adapterKey === PROVIDER_KEYS.github) return githubAdapter;
  if (adapterKey === PROVIDER_KEYS.vercel) return vercelAdapter;
  throw new Error(`Unknown adapter: ${adapterKey}`);
}

export function adapterSupportsAction(adapterKey: string, actionType: string): boolean {
  const adapter = resolveAdapter(adapterKey);
  return adapter.capabilities.supportedActions.includes(actionType);
}
