import { createHash } from "node:crypto";
import { evaluateQualification, QUALIFICATION_CONTRACT_ID } from "@/lib/infinity/market-validation-experiment/qualification-contract";
import { loadResearchConfig } from "@/lib/infinity/research/config";
import { getGroundedResearchProvider } from "@/lib/infinity/research/providers/registry";
import { parseProviderResearchJson, providerResearchJsonSchema } from "@/lib/infinity/research/schema";
import { discoverCreProspectsViaPublicWeb } from "@/lib/infinity/research/public-web/cre-prospects";
import { inspectPublicWebSearchReadiness } from "@/lib/infinity/research/public-web/search-registry";
import type { PublicWebResearchResult } from "@/lib/infinity/research/public-web/types";
import { extractPublishedContactability } from "./contactability";
import { LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED, MAX_DISCOVERY_COHORT } from "./constants";
import {
  PROSPECT_RESEARCH_PLAN,
  chooseResearchFallback,
  classifyProspectResearchFailure,
  isTransientResearchFailure,
  listEligibleGroundedResearchProviders,
  researchCostPolicyCeiling,
  runBoundedResearchTask,
  type ResearchFailureClass,
  type ResearchTaskAttempt,
} from "./research-execution";
import type { DiscoveredProspect } from "./types";

const PRIVATE_EMAIL = /@[a-z0-9.-]+\.(com|net|org|io)\b/i;
const GUESSED_EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;

export function inspectLiveProspectDiscoveryCapability(env: NodeJS.ProcessEnv = process.env): {
  available: boolean;
  provider: string | "NONE";
  reason: typeof LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED | "AVAILABLE";
} {
  const search = inspectPublicWebSearchReadiness(env);
  if (search.available) {
    return { available: true, provider: search.providerId, reason: "AVAILABLE" };
  }
  const eligible = listEligibleGroundedResearchProviders(env);
  if (eligible[0]?.verified) {
    return { available: true, provider: eligible[0].providerId, reason: "AVAILABLE" };
  }
  try {
    const config = loadResearchConfig(env);
    return { available: false, provider: config.providerId, reason: LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED };
  } catch {
    return { available: false, provider: search.providerId, reason: LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED };
  }
}

function personaFromRole(role: string): DiscoveredProspect["persona"] | null {
  if (/tenant[-\s]?rep/i.test(role)) return "tenant_rep_broker";
  if (/independent|boutique/i.test(role) && /broker|advisor/i.test(role)) return "independent_cre_broker";
  if (/advisor|advisory/i.test(role)) return "small_cre_advisory";
  if (/lease consultant|lease advisor/i.test(role)) return "lease_consultant";
  if (/broker/i.test(role)) return "independent_cre_broker";
  return null;
}

function extractIdentity(claim: string): { name: string; organization: string; role: string } | null {
  const named = claim.match(
    /([A-Z][a-z]+(?:\s[A-Z][a-z'.-]+){1,3})\s+(?:of|at)\s+([A-Z][A-Za-z0-9&.,'-]+(?:\s[A-Z][A-Za-z0-9&.,'-]+){0,6})\s+is a\s+(tenant-representation broker|tenant-rep broker|commercial broker|CRE broker|lease consultant|boutique (?:CRE )?advisor)/i,
  );
  if (!named) return null;
  return { name: named[1].trim(), organization: named[2].trim(), role: named[3].trim() };
}

export function qualifyDiscoveredIdentity(input: {
  name: string;
  organization: string;
  role: string;
  sourceUrls: string[];
  findingId: string | null;
  publicContactChannel?: string | null;
}): DiscoveredProspect | null {
  if (!input.name.trim() || !input.organization.trim()) return null;
  if (input.sourceUrls.length === 0) return null;
  if (input.sourceUrls.some((url) => !/^https?:\/\//i.test(url))) return null;
  if (
    input.publicContactChannel &&
    GUESSED_EMAIL.test(input.publicContactChannel) &&
    !input.sourceUrls.some((url) => url.includes(input.publicContactChannel!))
  ) {
    return null;
  }
  const persona = personaFromRole(input.role);
  if (!persona) return null;
  const qualification = evaluateQualification({
    role: input.role,
    dealFrequency: "active",
    leaseWorkflow: /lease|tenant|occupier|broker/i.test(input.role),
  });
  if (!qualification.qualified) return null;
  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    persona === "tenant_rep_broker" && /lease|tenant|occupier/i.test(input.role)
      ? "HIGH"
      : persona === "independent_cre_broker"
        ? "MEDIUM"
        : "LOW";
  if (confidence === "LOW") return null;
  return {
    prospectId: `prs_${createHash("sha256").update([input.name, input.organization, input.sourceUrls[0]].join("|")).digest("hex").slice(0, 16)}`,
    name: input.name,
    organization: input.organization,
    publicRole: input.role,
    publicProfileUrl: input.sourceUrls[0],
    publicContactChannel: input.publicContactChannel ?? null,
    persona,
    qualification: {
      contractId: QUALIFICATION_CONTRACT_ID,
      qualified: true,
      reason: qualification.reason,
      highConfidence: confidence === "HIGH",
      status: "PROSPECT_QUALIFIED",
      contactChannelAvailable: Boolean(input.publicContactChannel),
      confidence,
    },
    lineage: {
      sourceUrls: input.sourceUrls,
      findingId: input.findingId,
      grounded: true,
      fabricated: false,
    },
    contactability: extractPublishedContactability({
      url: input.sourceUrls[0],
      text: `${input.role} ${input.organization}`,
    }),
  };
}

export function extractProspectsFromFindings(
  findings: Array<{
    findingId: string;
    claim: string;
    grounded: boolean;
    inference?: boolean;
    sourceUrls: string[];
  }>,
): DiscoveredProspect[] {
  const accepted: DiscoveredProspect[] = [];
  for (const finding of findings) {
    if (!finding.grounded || finding.inference) continue;
    if (!finding.sourceUrls?.length) continue;
    if (PRIVATE_EMAIL.test(finding.claim) && !finding.sourceUrls.some((url) => /contact|team|about/i.test(url))) {
      continue;
    }
    const identity = extractIdentity(finding.claim);
    if (!identity) continue;
    const prospect = qualifyDiscoveredIdentity({
      ...identity,
      sourceUrls: finding.sourceUrls,
      findingId: finding.findingId,
    });
    if (!prospect) continue;
    if (accepted.some((item) => item.prospectId === prospect.prospectId)) continue;
    if (accepted.filter((item) => item.organization === prospect.organization).length >= 2) continue;
    accepted.push(prospect);
    if (accepted.length >= MAX_DISCOVERY_COHORT) break;
  }
  return accepted.filter((prospect) => prospect.qualification.confidence === "HIGH").slice(0, MAX_DISCOVERY_COHORT);
}

export type ProspectDiscoveryResult = {
  executed: boolean;
  liveGrounded: boolean;
  researchProvider: string | "NONE";
  capability: "AVAILABLE" | typeof LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED;
  prospects: DiscoveredProspect[];
  lineage: "PASS" | "NOT_AVAILABLE";
  classification: ResearchFailureClass | "COMPLETED" | null;
  attempts: number;
  providersUsed: string[];
  pathsExhausted: boolean;
  publicWeb?: PublicWebResearchResult | null;
  searchConfigurationRequired?: boolean;
};

export async function discoverPublicProspects(input: {
  liveDiscovery: boolean;
  researchFindings?: Array<{
    findingId: string;
    claim: string;
    grounded: boolean;
    inference?: boolean;
    sourceUrls: string[];
  }>;
  executeTask?: (taskId: string, attempt: number, providerId: string) => Promise<DiscoveredProspect[]>;
  onAttempt?: (attempt: ResearchTaskAttempt) => void;
  sleep?: (ms: number) => Promise<void>;
  estimatedFallbackCostUsd?: number | null;
  search?: (query: string) => Promise<import("@/lib/infinity/research/public-web/types").PublicSearchResult[]>;
  fetchImpl?: typeof fetch;
}): Promise<ProspectDiscoveryResult> {
  if (input.researchFindings) {
    const prospects = extractProspectsFromFindings(input.researchFindings);
    return {
      executed: true,
      liveGrounded: false,
      researchProvider: "NONE",
      capability: "AVAILABLE",
      prospects,
      lineage: prospects.length ? "PASS" : "NOT_AVAILABLE",
      classification: prospects.length ? "COMPLETED" : "NO_RESULTS",
      attempts: 0,
      providersUsed: [],
      pathsExhausted: true,
    };
  }

  const capability = inspectLiveProspectDiscoveryCapability();
  if (!input.liveDiscovery || !capability.available) {
    return {
      executed: false,
      liveGrounded: false,
      researchProvider: capability.provider,
      capability: LIVE_PROSPECT_DISCOVERY_CAPABILITY_REQUIRED,
      prospects: [],
      lineage: "NOT_AVAILABLE",
      classification: null,
      attempts: 0,
      providersUsed: [],
      pathsExhausted: true,
    };
  }

  if (!input.executeTask) {
    const searchReady = inspectPublicWebSearchReadiness();
    if (!searchReady.available) {
      return {
        executed: false,
        liveGrounded: false,
        researchProvider: searchReady.providerId,
        capability: "AVAILABLE",
        prospects: [],
        lineage: "NOT_AVAILABLE",
        classification: "POLICY_BLOCKED",
        attempts: 0,
        providersUsed: [],
        pathsExhausted: true,
        publicWeb: null,
        searchConfigurationRequired: true,
      };
    }
    const publicWeb = await discoverCreProspectsViaPublicWeb({
      missionId: "msn_mva_e72beb7b6d35e7b2",
      search: input.search,
      fetchImpl: input.fetchImpl,
    });
    return {
      executed: true,
      liveGrounded: publicWeb.prospects.length > 0,
      researchProvider: publicWeb.research.trace.searchProvider,
      capability: "AVAILABLE",
      prospects: publicWeb.prospects,
      lineage: publicWeb.prospects.length ? "PASS" : publicWeb.research.results.length ? "PASS" : "NOT_AVAILABLE",
      classification:
        publicWeb.research.blocker === "PROVIDER_FORMAT_CHANGED"
          ? "INVALID_RESPONSE"
          : publicWeb.prospects.length > 0
            ? "COMPLETED"
            : publicWeb.blocker === "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND"
              ? "NO_RESULTS"
              : publicWeb.research.results.length === 0
                ? "NO_RESULTS"
                : "COMPLETED",
      attempts: publicWeb.research.trace.queryCount,
      providersUsed: publicWeb.research.trace.searchProvider === "NONE" ? [] : [publicWeb.research.trace.searchProvider],
      pathsExhausted: true,
      publicWeb: publicWeb.research,
      searchConfigurationRequired: false,
    };
  }

  const providerId = capability.provider;
  const eligible = listEligibleGroundedResearchProviders();
  const attempts: ResearchTaskAttempt[] = [];
  const providersUsed = [providerId];
  let lastClassification: ResearchFailureClass | "COMPLETED" = "NO_RESULTS";
  let prospects: DiscoveredProspect[] = [];
  const sleep =
    input.sleep ??
    (process.env.VITEST
      ? async () => undefined
      : (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (const task of PROSPECT_RESEARCH_PLAN) {
    const executed = await runBoundedResearchTask({
      taskId: task.id,
      providerId,
      sleep,
      onAttempt: (attempt) => {
        attempts.push(attempt);
        input.onAttempt?.(attempt);
      },
      run: async (attempt) => {
        if (input.executeTask) return input.executeTask(task.id, attempt, providerId);
        return executeLiveResearchTask(providerId, task.id, task.objective, attempt);
      },
    });
    lastClassification = executed.classification;
    if (executed.ok && executed.result) {
      prospects = mergeProspects(prospects, executed.result);
      continue;
    }
    const fallbackId = chooseResearchFallback({
      primaryProviderId: providerId,
      eligible,
      estimatedFallbackCostUsd: input.estimatedFallbackCostUsd ?? null,
      maxEstimatedCostUsd: researchCostPolicyCeiling(),
    });
    if (
      fallbackId &&
      executed.classification !== "COMPLETED" &&
      isTransientResearchFailure(executed.classification)
    ) {
      providersUsed.push(fallbackId);
      const fallback = await runBoundedResearchTask({
        taskId: task.id,
        providerId: fallbackId,
        maxAttempts: 1,
        sleep,
        onAttempt: (attempt) => {
          attempts.push(attempt);
          input.onAttempt?.(attempt);
        },
        run: async (attempt) => {
          if (input.executeTask) return input.executeTask(task.id, attempt, fallbackId);
          return executeLiveResearchTask(fallbackId, task.id, task.objective, attempt);
        },
      });
      lastClassification = fallback.classification;
      if (fallback.ok && fallback.result) {
        prospects = mergeProspects(prospects, fallback.result);
        continue;
      }
    }
    if (executed.classification !== "NO_RESULTS" && executed.classification !== "GROUNDING_EMPTY") {
      return {
        executed: true,
        liveGrounded: false,
        researchProvider: providerId,
        capability: "AVAILABLE",
        prospects,
        lineage: prospects.length ? "PASS" : "NOT_AVAILABLE",
        classification: executed.classification,
        attempts: attempts.length,
        providersUsed,
        pathsExhausted: !fallbackId,
      };
    }
  }

  return {
    executed: true,
    liveGrounded: prospects.length > 0,
    researchProvider: providerId,
    capability: "AVAILABLE",
    prospects: prospects.slice(0, MAX_DISCOVERY_COHORT),
    lineage: prospects.length ? "PASS" : "NOT_AVAILABLE",
    classification: prospects.length ? "COMPLETED" : lastClassification,
    attempts: attempts.length,
    providersUsed,
    pathsExhausted: true,
  };
}

function mergeProspects(current: DiscoveredProspect[], next: DiscoveredProspect[]): DiscoveredProspect[] {
  const merged = [...current];
  for (const prospect of next) {
    if (merged.some((item) => item.prospectId === prospect.prospectId)) continue;
    merged.push(prospect);
    if (merged.length >= MAX_DISCOVERY_COHORT) break;
  }
  return merged;
}

async function executeLiveResearchTask(
  providerId: string,
  taskId: string,
  objective: string,
  attempt: number,
): Promise<DiscoveredProspect[]> {
  const config = loadResearchConfig();
  if (providerId !== "gemini") {
    throw new Error(`Unverified research provider blocked: ${providerId}`);
  }
  const provider = getGroundedResearchProvider("gemini", config);
  const timeoutMs = Math.min(config.timeoutMs, 20_000);
  const call = await Promise.race([
    provider.executeGroundedResearch({
      correlationId: `mva_cre_${taskId}_${attempt}`,
      systemInstructions:
        "Return grounded_research_v1 JSON only. Each finding must be grounded with a public source URL. Do not invent names, emails, or phone numbers. Prefer tenant-representation brokers.",
      researchObjective: objective,
      modelId: config.modelId,
      responseSchema: providerResearchJsonSchema(),
      maxOutputTokens: Math.min(config.maxOutputTokens, 2048),
      timeoutMs,
      maxRetries: 0,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("LIVE_PROSPECT_DISCOVERY_TIMEOUT")), timeoutMs + 1_000);
    }),
  ]);
  const structured = parseProviderResearchJson(call.rawText);
  const prospects = extractProspectsFromFindings(structured.findings);
  if (structured.findings.length === 0) {
    throw new Error("NO_RESULTS");
  }
  void classifyProspectResearchFailure;
  return prospects;
}
