import { createHash } from "node:crypto";
import { lookupPersistedProspect, persistVerifiedProspect, type PersistedProspectRecord } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { qualifyDiscoveredIdentity } from "@/lib/infinity/market-validation-acquisition-runtime/prospects";
import { LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import type { ContextRichVariantId } from "./context-rich-consultative-outreach-optimization";

export const CRE_CONTEXT_RICH_CHALLENGER_COHORT_ID = "chrt_cre_context_rich_challenger_v1" as const;
export const CRE_CONTEXT_RICH_CHALLENGER_V1 = "CRE_CONTEXT_RICH_CHALLENGER_V1" as const;

export type ChallengerPersonaSlot = "PRIMARY" | "SECONDARY";

export type ChallengerCandidateSeed = {
  name: string;
  organization: string;
  role: string;
  market: string;
  email: string;
  sourceUrl: string;
  sourceEvidence: string;
  personaSlot: ChallengerPersonaSlot;
  variantId: ContextRichVariantId;
  qualificationProfile: PersistedProspectRecord["qualificationProfile"];
};

export const CHALLENGER_CANDIDATE_SEEDS: ChallengerCandidateSeed[] = [
  {
    name: "Brooks Murphy",
    organization: "JLL",
    role: "tenant-representation broker",
    market: "Boston, MA",
    email: "brooks.murphy@jll.com",
    sourceUrl: "https://www.jll.com/en-us/people/bio-broker/brooks.murphy",
    sourceEvidence:
      "Brooks Murphy leads JLL Boston tenant representation. Brooks does not represent landlords. mail brooks.murphy@jll.com",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_workflow_context",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "Annie Nicolau",
    organization: "JLL",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    email: "annie.nicolau@jll.com",
    sourceUrl: "https://www.jll.com/en-us/people/bio-broker/annie.nicolau",
    sourceEvidence:
      "Annie is a Senior Vice President in Tenant Representation at JLL Chicago. mail annie.nicolau@jll.com",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_lease_economics",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "Anthony Fritsche",
    organization: "Cresa",
    role: "tenant-representation broker",
    market: "Houston, TX",
    email: "afritsche@cresa.com",
    sourceUrl: "https://www.cresa.com/-/media/Cresa/Files/PDF-Bios/Houston/Anthony-Fritsche-Resume---May-2026.pdf",
    sourceEvidence:
      "Anthony is an Executive Managing Principal with Cresa Houston focused on tenant representation. Email afritsche@cresa.com",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_client_summary",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "Rick Morris",
    organization: "Cresa",
    role: "tenant advisor",
    market: "Chicago, IL",
    email: "rmorris@cresa.com",
    sourceUrl: "https://www.cresa.com/-/media/Cresa/Files/PDF-Bios/Chicago/Resume_Rick-Morris_06052024.pdf",
    sourceEvidence:
      "Rick is a Principal at Cresa and a national tenant representation advisor who exclusively represents tenants. Email rmorris@cresa.com",
    personaSlot: "SECONDARY",
    variantId: "crc_v1_comparison_process",
    qualificationProfile: "lease_consultant",
  },
];

export const REVIEWED_AND_REJECTED_CANDIDATES = [
  { name: "Caleb Struewing", reason: "HISTORICAL_WAVE_1_RECIPIENT" },
  { name: "Michael Vizzone", reason: "HISTORICAL_WAVE_1_RECIPIENT" },
  { name: "Ben Kuhn", reason: "IDENTITY_UNCERTAINTY_ON_PRIOR_REVERIFICATION" },
  { name: "Stephanie Severson", reason: "EMAIL_NOT_EXPLICIT_ON_SOURCE" },
  { name: "Travis Sawvell", reason: "TENANT_AND_LANDLORD_MIX" },
  { name: "Tom Koelzer", reason: "NO_PUBLIC_EMAIL" },
  { name: "Jason Herbrich", reason: "EMAIL_NOT_EXPLICIT_ON_FIRST_PARTY_HTML" },
  { name: "Bryan Witkow", reason: "IDENTITY_UNCERTAINTY_ON_COMPRESSED_PDF" },
  { name: "Matt Perrigue", reason: "IDENTITY_UNCERTAINTY_ON_COMPRESSED_PDF" },
] as const;

export function challengerProspectId(seed: ChallengerCandidateSeed): string {
  return `prs_${createHash("sha256").update([seed.name, seed.organization, seed.sourceUrl].join("|")).digest("hex").slice(0, 16)}`;
}

export function persistChallengerCandidateSeeds(now = new Date()): PersistedProspectRecord[] {
  const records: PersistedProspectRecord[] = [];
  for (const seed of CHALLENGER_CANDIDATE_SEEDS) {
    const existing = lookupPersistedProspect({
      name: seed.name,
      organization: seed.organization,
      email: seed.email,
    });
    const discovered = qualifyDiscoveredIdentity({
      name: seed.name,
      organization: seed.organization,
      role: seed.role,
      sourceUrls: [seed.sourceUrl],
      findingId: `pub_${seed.name.toLowerCase().replace(/\s+/g, "_")}`,
    });
    const prospectId = existing?.prospectId ?? discovered?.prospectId ?? challengerProspectId(seed);
    const record: PersistedProspectRecord = {
      prospectId,
      name: seed.name,
      organization: seed.organization,
      role: seed.role,
      title: seed.role,
      market: seed.market,
      qualificationProfile: seed.qualificationProfile,
      qualificationRationale: discovered?.qualification.reason ?? seed.qualificationProfile,
      qualified: true,
      source: seed.sourceUrl,
      sourceUrls: [seed.sourceUrl],
      sourceType: "first_party_professional_bio",
      sourceEvidence: seed.sourceEvidence,
      contactPath: "PUBLIC_PROFESSIONAL_EMAIL",
      contactChannel: seed.email,
      email: seed.email,
      emailSource: seed.sourceUrl,
      lastVerified: now.toISOString(),
      synthetic: false,
      duplicate: false,
      optedOut: existing?.optedOut ?? false,
      cooldownUntil: existing?.cooldownUntil ?? null,
      experimentId: LOCKED_CRE_EXPERIMENT_ID,
      cohortId: null,
      personalization: {
        role: seed.role,
        organization: seed.organization,
        specialization: seed.role,
        market: seed.market,
        publicFocus: seed.personaSlot,
      },
    };
    const persisted = persistVerifiedProspect(record);
    if (persisted.record) records.push(persisted.record);
  }
  return records;
}

export function seedForProspect(name: string): ChallengerCandidateSeed | undefined {
  return CHALLENGER_CANDIDATE_SEEDS.find((row) => row.name === name);
}
