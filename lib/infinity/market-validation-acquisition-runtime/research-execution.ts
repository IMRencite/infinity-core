import { classifyResearchFailure } from "@/lib/infinity/research/failures";
import { loadResearchConfig } from "@/lib/infinity/research/config";
import { loadResearchCostPolicy } from "@/lib/infinity/research/cost-governance";

export const RESEARCH_FAILURES = [
  "TIMEOUT",
  "RATE_LIMIT",
  "PROVIDER_UNAVAILABLE",
  "GROUNDING_EMPTY",
  "INVALID_RESPONSE",
  "INSUFFICIENT_SOURCE_EVIDENCE",
  "POLICY_BLOCKED",
  "NO_RESULTS",
] as const;

export type ResearchFailureClass = (typeof RESEARCH_FAILURES)[number];

export const PROSPECT_RESEARCH_PLAN = [
  {
    id: "discover_organizations",
    phase: 1,
    maxResults: 10,
    objective: "Identify up to 10 public tenant-representation or occupier-advisory firms. Return organization names and public source URLs only. Do not invent firms.",
  },
  {
    id: "discover_professionals",
    phase: 2,
    maxResults: 6,
    objective: "For the strongest public firms already found, identify up to 2 publicly named professionals per firm with a public profile URL. Prefer tenant-representation brokers. Do not invent names.",
  },
  {
    id: "verify_role_workflow",
    phase: 3,
    maxResults: 8,
    objective: "Verify public role and lease/tenant-rep workflow evidence for each named professional. Keep only identities with a public source URL stating the role.",
  },
  {
    id: "rank_qualify",
    phase: 4,
    maxResults: 8,
    objective: "Rank at most 8 HIGH-confidence public identities whose role and lease-workflow evidence are independently supported. Format each claim as: Full Name of Organization is a tenant-representation broker.",
  },
] as const;

export type ResearchTaskId = (typeof PROSPECT_RESEARCH_PLAN)[number]["id"];

export type ResearchTaskAttempt = {
  taskId: ResearchTaskId;
  attempt: number;
  providerId: string;
  classification: ResearchFailureClass | "COMPLETED";
  costState: "ACTUAL" | "ESTIMATED" | "BENCHMARK" | "UNKNOWN";
  estimatedCostUsd: number | null;
};

export function classifyProspectResearchFailure(error: unknown): ResearchFailureClass {
  const classified = classifyResearchFailure(error);
  if (classified.classification === "timeout") return "TIMEOUT";
  if (classified.classification === "rate_limit") return "RATE_LIMIT";
  if (classified.classification === "grounding_unavailable") return "GROUNDING_EMPTY";
  if (classified.classification === "schema_validation_failure" || classified.classification === "evidence_validation_failure") {
    return "INVALID_RESPONSE";
  }
  if (classified.classification === "budget_exceeded") return "POLICY_BLOCKED";
  if (classified.classification === "authentication_failure" || classified.classification === "unsupported_model") {
    return "PROVIDER_UNAVAILABLE";
  }
  if (/PROVIDER_FORMAT_CHANGED/i.test(classified.message)) return "INVALID_RESPONSE";
  if (/NO_RESULTS|no qualifying|empty findings/i.test(classified.message)) return "NO_RESULTS";
  if (/timeout|LIVE_PROSPECT_DISCOVERY_TIMEOUT/i.test(classified.message)) return "TIMEOUT";
  return "PROVIDER_UNAVAILABLE";
}

export function isTransientResearchFailure(classification: ResearchFailureClass): boolean {
  return classification === "TIMEOUT" || classification === "RATE_LIMIT" || classification === "PROVIDER_UNAVAILABLE";
}

export function retryBackoffMs(attempt: number): number {
  return Math.min(2_000, 400 * Math.max(1, attempt));
}

export function mayRetryResearchTask(input: { attempts: number; classification: ResearchFailureClass; maxAttempts?: number }): boolean {
  const maxAttempts = input.maxAttempts ?? 2;
  if (input.attempts >= maxAttempts) return false;
  return isTransientResearchFailure(input.classification);
}

export function listEligibleGroundedResearchProviders(env: NodeJS.ProcessEnv = process.env): Array<{
  providerId: string;
  verified: boolean;
  costState: "UNKNOWN";
}> {
  try {
    const config = loadResearchConfig(env);
    if (!config.enabled) return [];
    if (config.providerId === "gemini" && config.geminiApiKey) {
      return [{ providerId: "gemini", verified: true, costState: "UNKNOWN" }];
    }
    return [];
  } catch {
    return [];
  }
}

export function chooseResearchFallback(input: {
  primaryProviderId: string;
  eligible: Array<{ providerId: string; verified: boolean }>;
  estimatedFallbackCostUsd: number | null;
  maxEstimatedCostUsd: number;
}): string | null {
  const fallback = input.eligible.find((item) => item.providerId !== input.primaryProviderId && item.verified);
  if (!fallback) return null;
  if (!shouldUseResearchFallback({
    fallbackVerified: fallback.verified,
    estimatedFallbackCostUsd: input.estimatedFallbackCostUsd,
    maxEstimatedCostUsd: input.maxEstimatedCostUsd,
  })) {
    return null;
  }
  return fallback.providerId;
}

export function shouldUseResearchFallback(input: {
  fallbackVerified: boolean;
  estimatedFallbackCostUsd: number | null;
  maxEstimatedCostUsd: number;
}): boolean {
  if (!input.fallbackVerified) return false;
  if (input.estimatedFallbackCostUsd === null) return false;
  return input.estimatedFallbackCostUsd <= input.maxEstimatedCostUsd;
}

export function researchCostPolicyCeiling(env: NodeJS.ProcessEnv = process.env): number {
  try {
    return loadResearchCostPolicy(loadResearchConfig(env)).maxEstimatedCostUsd;
  } catch {
    return 2;
  }
}

export async function runBoundedResearchTask<T>(input: {
  taskId: ResearchTaskId;
  providerId: string;
  maxAttempts?: number;
  backoff?: (attempt: number) => number;
  sleep?: (ms: number) => Promise<void>;
  onAttempt?: (attempt: ResearchTaskAttempt) => void;
  run: (attempt: number) => Promise<T>;
}): Promise<{
  ok: boolean;
  result: T | null;
  attempts: ResearchTaskAttempt[];
  classification: ResearchFailureClass | "COMPLETED";
}> {
  const maxAttempts = input.maxAttempts ?? 2;
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const backoff = input.backoff ?? retryBackoffMs;
  const attempts: ResearchTaskAttempt[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await input.run(attempt);
      const record: ResearchTaskAttempt = {
        taskId: input.taskId,
        attempt,
        providerId: input.providerId,
        classification: "COMPLETED",
        costState: "UNKNOWN",
        estimatedCostUsd: null,
      };
      attempts.push(record);
      input.onAttempt?.(record);
      return { ok: true, result, attempts, classification: "COMPLETED" };
    } catch (error) {
      const classification = classifyProspectResearchFailure(error);
      const record: ResearchTaskAttempt = {
        taskId: input.taskId,
        attempt,
        providerId: input.providerId,
        classification,
        costState: "UNKNOWN",
        estimatedCostUsd: null,
      };
      attempts.push(record);
      input.onAttempt?.(record);
      if (!mayRetryResearchTask({ attempts: attempt, classification, maxAttempts })) {
        return { ok: false, result: null, attempts, classification };
      }
      await sleep(backoff(attempt));
    }
  }
  return { ok: false, result: null, attempts, classification: attempts.at(-1)?.classification ?? "PROVIDER_UNAVAILABLE" };
}

export function resolveResearchBlocker(input: {
  prospectCount: number;
  capabilityMissing: boolean;
  classification: ResearchFailureClass | "COMPLETED" | null;
  pathsExhausted: boolean;
  founderChannelRequired: boolean;
  searchConfigurationMissing?: boolean;
}): string {
  if (input.searchConfigurationMissing) return "PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED";
  if (input.capabilityMissing) return "LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED";
  if (input.classification === "TIMEOUT" || input.classification === "RATE_LIMIT") {
    return "RESEARCH_EXECUTION_RETRY_REQUIRED";
  }
  if (input.classification === "PROVIDER_UNAVAILABLE" && !input.pathsExhausted) {
    return "RESEARCH_PROVIDER_UNAVAILABLE";
  }
  if (input.classification === "POLICY_BLOCKED") return "RESEARCH_CAPABILITY_UNAVAILABLE";
  if (input.classification === "INVALID_RESPONSE") return "RESEARCH_PROVIDER_UNAVAILABLE";
  if (input.classification === "NO_RESULTS" || input.classification === "GROUNDING_EMPTY" || input.classification === "INSUFFICIENT_SOURCE_EVIDENCE") {
    return input.founderChannelRequired
      ? "FOUNDER_PROSPECT_INPUT_REQUIRED"
      : "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND";
  }
  if (input.pathsExhausted && input.founderChannelRequired) return "FOUNDER_PROSPECT_INPUT_REQUIRED";
  if (input.pathsExhausted) return "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND";
  return "RESEARCH_EXECUTION_RETRY_REQUIRED";
}
