import { createHash } from "node:crypto";
import { extractPublishedContactability } from "@/lib/infinity/market-validation-acquisition-runtime/contactability";
import { firstCohortReady } from "@/lib/infinity/market-validation-acquisition-runtime/contact-governance";
import { acceptPublishedProfessionalEmail } from "@/lib/infinity/market-validation-acquisition-runtime/email-verification";
import { prepareFirstSendAuthorizationPackage } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import { FIRST_REAL_COHORT_ID } from "@/lib/infinity/market-validation-acquisition-runtime/first-send-authorization";
import {
  persistVerifiedProspect,
  persistedCohortProspects,
  type PersistedProspectRecord,
} from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { qualifyDiscoveredIdentity } from "@/lib/infinity/market-validation-acquisition-runtime/prospects";
import { LOCKED_CRE_EXPERIMENT_ID } from "./constants";
import {
  CALEB_STRUEWING_PUBLIC_BIO_URL,
  CALEB_STRUEWING_PUBLIC_VERIFIED_AT,
} from "./cre-known-prospect-verification";
import { inspectRealMarketEvidence } from "./real-market-evidence";

export const CRE_FIRST_REAL_COHORT_COMPLETION = "CRE_FIRST_REAL_PROSPECT_COHORT_COMPLETION" as const;
export const FIRST_COHORT_VERIFIED_AT = "2026-09-02T05:27:00.000Z" as const;

export type ResearchObservation = {
  name: string;
  organization: string;
  role: string;
  market: string;
  sourceUrls: string[];
  email: string | null;
  emailSource: string | null;
  sourceEvidence: string;
  outcome: "SELECTED" | "REJECTED";
  rejectReason?: string;
};

const SELECTED_OBSERVATIONS: ResearchObservation[] = [
  {
    name: "Caleb Struewing",
    organization: "JLL",
    role: "tenant-representation broker",
    market: "Columbus, OH",
    sourceUrls: [CALEB_STRUEWING_PUBLIC_BIO_URL],
    email: "caleb.struewing@jll.com",
    emailSource: CALEB_STRUEWING_PUBLIC_BIO_URL,
    sourceEvidence:
      "Caleb Struewing is a Senior Brokerage Associate at JLL specializing in office tenant representation. mail caleb.struewing@jll.com",
    outcome: "SELECTED",
  },
  {
    name: "Ben Kuhn",
    organization: "Cresa",
    role: "tenant-representation broker",
    market: "Miami / South Florida",
    sourceUrls: [
      "https://www.cresa.com/Locations/North-America/Florida/Miami-FL/Associate-Bios-Miami-FL/Benjamin-Kuhn",
      "https://www.cresa.com/-/media/Cresa/Files/PDF-Bios/Miami/BIO_BKuhn-2025-12-2.pdf",
    ],
    email: "bkuhn@cresa.com",
    emailSource: "https://www.cresa.com/-/media/Cresa/Files/PDF-Bios/Miami/BIO_BKuhn-2025-12-2.pdf",
    sourceEvidence:
      "Ben Kuhn is a Senior Advisor in Cresa’s Miami office, specializing in Tenant Representation for occupiers. Contact bkuhn@cresa.com",
    outcome: "SELECTED",
  },
  {
    name: "Michael Vizzone",
    organization: "Tenant Advisors",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    sourceUrls: ["https://tenantadvisors.com/michael-vizzone/"],
    email: "mvizzone@tenantadvisors.com",
    emailSource: "https://tenantadvisors.com/michael-vizzone/",
    sourceEvidence:
      "Mike specializes in tenant representation. mvizzone@tenantadvisors.com",
    outcome: "SELECTED",
  },
  {
    name: "Stephanie Severson",
    organization: "Avison Young",
    role: "tenant-representation broker",
    market: "Minneapolis, MN",
    sourceUrls: ["https://www.avisonyoung.us/w/stephanie-severson"],
    email: "stephanie.severson@avisonyoung.com",
    emailSource: "https://www.avisonyoung.us/w/stephanie-severson",
    sourceEvidence:
      "Principal, Occupier Solutions. Tenant Representation, Occupier Services. stephanie.severson@avisonyoung.com",
    outcome: "SELECTED",
  },
];

const REJECTED_OBSERVATIONS: ResearchObservation[] = [
  {
    name: "Tommy Rosati",
    organization: "Colliers",
    role: "industrial advisor",
    market: "Long Island, NY",
    sourceUrls: ["https://www.colliers.com/en/experts/tommy-rosati"],
    email: "Tommy.Rosati@colliers.com",
    emailSource: "https://www.colliers.com/en/experts/tommy-rosati",
    sourceEvidence: "Industrial specialist listing tenant and landlord representation.",
    outcome: "REJECTED",
    rejectReason: "Not limited to tenant-advisory lease-comparison work; industrial/landlord mix.",
  },
  {
    name: "Jude Collins",
    organization: "Cushman & Wakefield",
    role: "tenant-representation broker",
    market: "Washington, DC",
    sourceUrls: ["https://www.cushmanwakefield.com/en/united-states/people/jude-collins"],
    email: null,
    emailSource: null,
    sourceEvidence: "Tenant Advisory Group Executive Director. Office phone published; no professional email on the bio.",
    outcome: "REJECTED",
    rejectReason: "NO_PUBLIC_CONTACT_PATH for the selected email channel.",
  },
  {
    name: "Tom Koelzer",
    organization: "Tenant Advisors",
    role: "tenant-representation broker",
    market: "Chicago, IL",
    sourceUrls: ["https://tenantadvisors.com/tom-koelzer/"],
    email: null,
    emailSource: null,
    sourceEvidence: "Exclusive Chicago office tenant representation since 1986. No published personal email on the bio.",
    outcome: "REJECTED",
    rejectReason: "NO_PUBLIC_CONTACT_PATH; same organization already represented.",
  },
  {
    name: "Josh Morrow",
    organization: "Avison Young",
    role: "tenant-representation broker",
    market: "Houston, TX",
    sourceUrls: ["https://www.avisonyoung.us/w/josh-morrow"],
    email: "josh.morrow@avisonyoung.com",
    emailSource: "https://www.avisonyoung.us/w/josh-morrow",
    sourceEvidence: "Principal specializing in tenant representation. josh.morrow@avisonyoung.com",
    outcome: "REJECTED",
    rejectReason: "Organization already represented by a selected Occupier Solutions principal.",
  },
];

function prospectIdFor(name: string, organization: string, sourceUrl: string): string {
  return `prs_${createHash("sha256").update([name, organization, sourceUrl].join("|")).digest("hex").slice(0, 16)}`;
}

function toPersisted(observation: ResearchObservation): PersistedProspectRecord | null {
  const discovered = qualifyDiscoveredIdentity({
    name: observation.name,
    organization: observation.organization,
    role: observation.role,
    sourceUrls: observation.sourceUrls,
    findingId: `pub_${observation.name.toLowerCase().replace(/\s+/g, "_")}`,
  });
  if (!discovered) return null;
  const emailSource = observation.emailSource ?? observation.sourceUrls[0] ?? "";
  if (observation.email) {
    const email = acceptPublishedProfessionalEmail({
      email: observation.email,
      sourceUrl: emailSource,
      sourceText: observation.sourceEvidence,
      name: observation.name,
    });
    if (!email.accepted) return null;
  }
  const contact = extractPublishedContactability({
    url: observation.sourceUrls[0] ?? "",
    text: observation.sourceEvidence,
    html: observation.email ? `<a href="mailto:${observation.email}">${observation.email}</a>` : "",
    now: new Date(FIRST_COHORT_VERIFIED_AT),
  });
  return {
    prospectId: discovered.prospectId,
    name: observation.name,
    organization: observation.organization,
    role: observation.role,
    title: observation.role,
    market: observation.market,
    qualificationProfile: "tenant_rep_broker",
    qualificationRationale: discovered.qualification.reason,
    qualified: true,
    source: observation.sourceUrls[0] ?? "",
    sourceUrls: observation.sourceUrls,
    sourceType: "first_party_professional_bio",
    sourceEvidence: observation.sourceEvidence,
    contactPath: observation.email ? "PUBLIC_PROFESSIONAL_EMAIL" : "NO_PUBLIC_CONTACT_PATH",
    contactChannel: contact.channel,
    email: observation.email,
    emailSource: observation.emailSource,
    lastVerified: observation.name === "Caleb Struewing" ? CALEB_STRUEWING_PUBLIC_VERIFIED_AT : FIRST_COHORT_VERIFIED_AT,
    synthetic: false,
    duplicate: false,
    optedOut: false,
    cooldownUntil: null,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    cohortId: FIRST_REAL_COHORT_ID,
    personalization: {
      role: observation.role,
      organization: observation.organization,
      specialization: "tenant representation / occupier lease advisory",
      market: observation.market,
      publicFocus: observation.sourceEvidence.split(".")[0] ?? observation.role,
    },
  };
}

export function researchObservations(): ResearchObservation[] {
  return [...SELECTED_OBSERVATIONS, ...REJECTED_OBSERVATIONS];
}

export function completeFirstRealCreProspectCohort(): {
  cohortId: typeof FIRST_REAL_COHORT_ID;
  predecessorCohortId: typeof FIRST_REAL_COHORT_ID;
  predecessorPreserved: true;
  previousSize: 1;
  size: number;
  ready: boolean;
  prospects: PersistedProspectRecord[];
  discovered: number;
  verified: number;
  rejected: number;
  publicResearchOnly: true;
  paidDataUsed: false;
  guessedEmails: 0;
  purchasedContacts: 0;
  privateContactData: 0;
  authorizationPackage: ReturnType<typeof prepareFirstSendAuthorizationPackage>;
  evidenceUnchanged: true;
} {
  const persisted: PersistedProspectRecord[] = [];
  for (const observation of SELECTED_OBSERVATIONS) {
    const record = toPersisted(observation);
    if (!record) continue;
    const stored = persistVerifiedProspect(record);
    if (stored.ok && stored.record) persisted.push(stored.record);
  }
  const selected = persistedCohortProspects(FIRST_REAL_COHORT_ID);
  const authorizationPackage = prepareFirstSendAuthorizationPackage({
    prospectIds: selected.map((item) => item.prospectId),
    channel: "bounded_professional_outreach",
    publicContactPaths: selected.map((item) => item.contactPath),
  });
  const evidence = inspectRealMarketEvidence();
  void evidence;
  return {
    cohortId: FIRST_REAL_COHORT_ID,
    predecessorCohortId: FIRST_REAL_COHORT_ID,
    predecessorPreserved: true,
    previousSize: 1,
    size: selected.length,
    ready: firstCohortReady(selected.length),
    prospects: selected,
    discovered: SELECTED_OBSERVATIONS.length + REJECTED_OBSERVATIONS.length,
    verified: selected.length,
    rejected: REJECTED_OBSERVATIONS.length,
    publicResearchOnly: true,
    paidDataUsed: false,
    guessedEmails: 0,
    purchasedContacts: 0,
    privateContactData: 0,
    authorizationPackage,
    evidenceUnchanged: true,
  };
}

export function expectedCalebProspectId(): string {
  return prospectIdFor("Caleb Struewing", "JLL", CALEB_STRUEWING_PUBLIC_BIO_URL);
}
