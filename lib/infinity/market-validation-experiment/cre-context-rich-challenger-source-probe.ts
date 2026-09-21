import { CHALLENGER_CANDIDATE_SEEDS, type ChallengerCandidateSeed } from "./cre-context-rich-challenger-cohort";
import {
  decodeFirstPartySource,
  isFirstPartyProfessionalHost,
} from "@/lib/infinity/market-validation-acquisition-runtime/fresh-contact-verification";

export async function probeChallengerSource(seed: ChallengerCandidateSeed, fetchImpl: typeof fetch = fetch) {
  const firstParty = isFirstPartyProfessionalHost(seed.sourceUrl);
  let fetched = false;
  let text = "";
  try {
    const res = await fetchImpl(seed.sourceUrl);
    const bytes = Buffer.from(await res.arrayBuffer());
    text = decodeFirstPartySource(seed.sourceUrl, bytes);
    fetched = res.ok && text.trim().length > 0;
  } catch {
    fetched = false;
  }
  const hay = text.toLowerCase();
  return {
    name: seed.name,
    fetched,
    firstParty,
    namePresent: hay.includes(seed.name.toLowerCase()),
    companyPresent: hay.includes(seed.organization.toLowerCase()),
    personaPresent: /tenant representation|tenant-representation|occupier|tenant advisor/i.test(hay),
    emailOnSource: hay.includes(seed.email.toLowerCase()),
    mailtoPresent: /mailto:/i.test(text),
    sendShape: fetched && firstParty,
  };
}

export const ADDITIONAL_SOURCE_PROBES: ChallengerCandidateSeed[] = [
  {
    name: "Brooks Murphy",
    organization: "JLL",
    role: "tenant-representation broker",
    market: "Boston, MA",
    email: "brooks.murphy@jll.com",
    sourceUrl: "https://www.jll.com/en-us/people/bio-broker/brooks.murphy",
    sourceEvidence: "probe",
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
    sourceEvidence: "probe",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_lease_economics",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "David Ven Horst",
    organization: "Tenant Advisors",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    email: "dvenhorst@tenantadvisors.com",
    sourceUrl: "https://tenantadvisors.com/david-ven-horst/",
    sourceEvidence: "probe",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_client_summary",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "David EtsHokin",
    organization: "Tenant Advisors",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    email: "detshokin@tenantadvisors.com",
    sourceUrl: "https://tenantadvisors.com/david-etshokin/",
    sourceEvidence: "probe",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_comparison_process",
    qualificationProfile: "tenant_rep_broker",
  },
  {
    name: "Carlos Tenorio",
    organization: "Tenant Advisors",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    email: "ctenorio@tenantadvisors.com",
    sourceUrl: "https://tenantadvisors.com/carlos-tenorio/",
    sourceEvidence: "probe",
    personaSlot: "PRIMARY",
    variantId: "crc_v1_workflow_context",
    qualificationProfile: "tenant_rep_broker",
  },
];

export async function probeAllChallengerSeeds(fetchImpl: typeof fetch = fetch) {
  const rows = [];
  for (const seed of [...CHALLENGER_CANDIDATE_SEEDS, ...ADDITIONAL_SOURCE_PROBES]) {
    rows.push(await probeChallengerSource(seed, fetchImpl));
  }
  return rows;
}
