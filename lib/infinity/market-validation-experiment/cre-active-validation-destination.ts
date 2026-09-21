import {
  CRE_CANDIDATE_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL,
  DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_SEO_GEO_SUCCESSOR_URL,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL,
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID,
  DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL,
  LOCKED_CRE_EXPERIMENT_ID,
  PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID,
  SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID,
} from "./constants";
import {
  getActivePublicValidationArtifactId,
  getActivePublicValidationDeploymentId,
  getActivePublicValidationUrl,
} from "./active-public-artifact";
import { PUBLIC_INGEST_ROUTE } from "./ingest";
import { fetchPublicPath } from "./validation-grade-live-verify";

export type DestinationGate = "PASS" | "FAIL";

export type ActiveValidationDestinationAudit = {
  url: string;
  providerReady: DestinationGate;
  homepage: DestinationGate;
  earlyAccess: DestinationGate;
  candidateLineage: DestinationGate;
  experimentLineage: DestinationGate;
  artifactLineage: DestinationGate;
  formAttribution: DestinationGate;
  ingestAttribution: DestinationGate;
  mutations: 0;
  submissions: 0;
};

function gate(ok: boolean): DestinationGate {
  return ok ? "PASS" : "FAIL";
}

export async function verifyActiveValidationDestinationReadOnly(input: {
  origin?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<ActiveValidationDestinationAudit> {
  const origin = (
    input.origin ??
    getActivePublicValidationUrl() ??
    (DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL ||
      DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL ||
      DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL)
  ).replace(
    /\/$/,
    "",
  );
  const priorFetch = globalThis.fetch;
  if (input.fetchImpl) globalThis.fetch = input.fetchImpl;
  try {
    const home = await fetchPublicPath(origin, "/");
    const early = await fetchPublicPath(origin, "/early-access");
    const blob = `${home.body}\n${early.body}`;
    const scriptSrcs = [...blob.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]);
    let scripts = "";
    for (const src of scriptSrcs.slice(0, 24)) {
      const asset = await fetchPublicPath(origin, src);
      scripts += `\n${asset.body}`;
    }
    const searchable = `${blob}\n${scripts}`;
    const artifactId = getActivePublicValidationArtifactId();
    return {
      url: origin,
      providerReady: gate(
        home.ok &&
          (origin === getActivePublicValidationUrl() ||
            origin === DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_URL ||
            origin === DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_URL ||
            origin === DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_URL ||
            origin === DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_URL ||
            origin === DEPLOYED_VISUAL_POLISH_SUCCESSOR_URL ||
            origin === DEPLOYED_VISUAL_QUALITY_SUCCESSOR_URL ||
            origin === DEPLOYED_SEO_GEO_SUCCESSOR_URL ||
            origin === DEPLOYED_COMPILE_REPAIR_SUCCESSOR_URL ||
            searchable.includes(DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_VISUAL_TABLE_DESIGN_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_VISUAL_POLISH_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_VISUAL_QUALITY_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_SEO_GEO_SUCCESSOR_DEPLOYMENT_ID) ||
            searchable.includes(DEPLOYED_COMPILE_REPAIR_SUCCESSOR_DEPLOYMENT_ID)) &&
          (artifactId === SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID ||
            artifactId === SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID ||
            artifactId === PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID),
      ),
      homepage: gate(home.ok && /lease|NPV|early access|pilot/i.test(home.body)),
      earlyAccess: gate(early.ok && /workEmail|work email|Request Pilot Access/i.test(early.body)),
      candidateLineage: gate(searchable.includes(CRE_CANDIDATE_ID)),
      experimentLineage: gate(searchable.includes(LOCKED_CRE_EXPERIMENT_ID)),
      artifactLineage: gate(
        searchable.includes(artifactId) ||
          searchable.includes(SEO_GEO_FINAL_AUTHORITY_POLISH_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_AUTHORITY_EXPANSION_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_VISUAL_TABLE_DESIGN_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_VISUAL_POLISH_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_VISUAL_QUALITY_REPAIR_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(SEO_GEO_DIGITAL_REAL_ESTATE_SUCCESSOR_ARTIFACT_ID) ||
          searchable.includes(PROVIDER_EQUIVALENT_COMPILE_REPAIR_SUCCESSOR_ARTIFACT_ID),
      ),
      formAttribution: gate(
        /name|workEmail|role|company|dealFrequency|preferredPricing|pilotInterest/i.test(early.body),
      ),
      ingestAttribution: gate(
        searchable.includes(PUBLIC_INGEST_ROUTE) && searchable.includes(LOCKED_CRE_EXPERIMENT_ID),
      ),
      mutations: 0,
      submissions: 0,
    };
  } finally {
    if (input.fetchImpl) globalThis.fetch = priorFetch;
  }
}

export function destinationDeploymentId(): string {
  return (
    getActivePublicValidationDeploymentId() ??
    (DEPLOYED_FINAL_AUTHORITY_POLISH_SUCCESSOR_DEPLOYMENT_ID ||
      DEPLOYED_AUTHORITY_EXPANSION_SUCCESSOR_DEPLOYMENT_ID ||
      DEPLOYED_VISUAL_HOMEPAGE_FOLD_SUCCESSOR_DEPLOYMENT_ID)
  );
}
