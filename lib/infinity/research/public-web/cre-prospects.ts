import { createHash } from "node:crypto";
import { evaluateQualification, QUALIFICATION_CONTRACT_ID } from "@/lib/infinity/market-validation-experiment/qualification-contract";
import type { DiscoveredProspect } from "@/lib/infinity/market-validation-acquisition-runtime/types";
import { extractPublishedContactability } from "@/lib/infinity/market-validation-acquisition-runtime/contactability";
import { MAX_DISCOVERY_COHORT } from "@/lib/infinity/market-validation-acquisition-runtime/constants";
import { PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED } from "./capabilities";
import { saveResearchCheckpoint } from "./checkpoint";
import { professionalsFromEvidence } from "./extract-evidence";
import { runPublicWebResearch } from "./pipeline";
import { buildBoundedQueryPlan, CRE_PUBLIC_WEB_OBJECTIVE } from "./query-plan";
import type { PublicSearchResult, PublicWebResearchResult } from "./types";

const WORKFLOW = /tenant[-\s]?rep|tenant representation|occupier|lease advisory|commercial lease/i;
const GENERIC = /residential|property manager|home sale/i;

function organizationFrom(title: string, url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const known: Record<string, string> = {
      "aquilacommercial.com": "Aquila Commercial",
      "cushmanwakefield.com": "Cushman & Wakefield",
      "jll.com": "JLL",
      "cbre.com": "CBRE",
      "savills.com": "Savills",
      "newmark.com": "Newmark",
    };
    if (known[host]) return known[host];
    const cleaned = title.replace(/\s*[|\-–].*$/, "").trim();
    if (cleaned && !/guide|ultimate|hiring|services in/i.test(cleaned)) return cleaned;
    return host.split(".")[0]?.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) || host;
  } catch {
    return title;
  }
}

function qualifyFromPublicEvidence(input: {
  name: string;
  organization: string;
  excerpt: string;
  sourceUrl: string;
  sourceTitle: string;
}): DiscoveredProspect | null {
  if (GENERIC.test(input.excerpt) && !WORKFLOW.test(input.excerpt)) return null;
  if (!WORKFLOW.test(`${input.excerpt} ${input.sourceTitle}`)) return null;
  const role = WORKFLOW.test(input.excerpt) ? "tenant-representation broker" : "commercial broker";
  const qualification = evaluateQualification({
    role,
    dealFrequency: "active",
    leaseWorkflow: WORKFLOW.test(`${input.excerpt} ${input.sourceTitle}`),
  });
  if (!qualification.qualified) return null;
  const confidence = /tenant[-\s]?rep|tenant representation|occupier representation/i.test(`${input.excerpt} ${input.sourceTitle}`)
    ? "HIGH"
    : "MEDIUM";
  if (confidence !== "HIGH") return null;
  return {
    prospectId: `prs_${createHash("sha256").update([input.name, input.organization, input.sourceUrl].join("|")).digest("hex").slice(0, 16)}`,
    name: input.name,
    organization: input.organization,
    publicRole: role,
    publicProfileUrl: input.sourceUrl,
    publicContactChannel: /contact|team|people|about/i.test(input.sourceUrl) ? input.sourceUrl : null,
    persona: "tenant_rep_broker",
    qualification: {
      contractId: QUALIFICATION_CONTRACT_ID,
      qualified: true,
      reason: qualification.reason,
      highConfidence: true,
      status: "PROSPECT_QUALIFIED",
      contactChannelAvailable: /contact|team|people|about/i.test(input.sourceUrl),
      confidence: "HIGH",
    },
    lineage: {
      sourceUrls: [input.sourceUrl],
      findingId: null,
      grounded: true,
      fabricated: false,
    },
    contactability: extractPublishedContactability({
      url: input.sourceUrl,
      text: `${input.excerpt} ${input.sourceTitle}`,
    }),
  };
}

export async function discoverCreProspectsViaPublicWeb(input: {
  missionId: string;
  extraQueries?: string[];
  fetchImpl?: typeof fetch;
  search?: (query: string) => Promise<PublicSearchResult[]>;
}): Promise<{
  research: PublicWebResearchResult;
  prospects: DiscoveredProspect[];
  blocker: string | null;
}> {
  const queries = buildBoundedQueryPlan({ extraQueries: input.extraQueries });
  const research = await runPublicWebResearch({
    objective: CRE_PUBLIC_WEB_OBJECTIVE,
    queries,
    missionId: input.missionId,
    fetchImpl: input.fetchImpl,
    search: input.search,
  });
  if (research.blocker === PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED) {
    return { research, prospects: [], blocker: PUBLIC_WEB_SEARCH_PROVIDER_CONFIGURATION_REQUIRED };
  }
  const people = professionalsFromEvidence(research.evidence);
  const prospects: DiscoveredProspect[] = [];
  const perOrg = new Map<string, number>();
  for (const person of people) {
    const organization = organizationFrom(person.sourceTitle, person.sourceUrl);
    if ((perOrg.get(organization) ?? 0) >= 2) continue;
    const prospect = qualifyFromPublicEvidence({
      name: person.name,
      organization,
      excerpt: person.excerpt,
      sourceUrl: person.sourceUrl,
      sourceTitle: person.sourceTitle,
    });
    if (!prospect) continue;
    if (prospects.some((item) => item.prospectId === prospect.prospectId || (item.name === prospect.name && item.organization === prospect.organization))) continue;
    perOrg.set(organization, (perOrg.get(organization) ?? 0) + 1);
    prospects.push(prospect);
    if (prospects.length >= MAX_DISCOVERY_COHORT) break;
  }
  saveResearchCheckpoint({
    missionId: input.missionId,
    stage: "final_cohort",
    payload: { prospectIds: prospects.map((item) => item.prospectId) },
    observedAt: new Date().toISOString(),
  });
  research.trace.prospectCount = people.length;
  research.trace.qualifiedCount = prospects.length;
  const blocker =
    prospects.length > 0
      ? "ACQUISITION_PREPARATION_INCOMPLETE"
      : research.results.length === 0
        ? research.blocker
        : "NO_QUALIFIED_PUBLIC_PROSPECTS_FOUND";
  return { research, prospects, blocker };
}
