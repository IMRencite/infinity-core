import { qualifyDiscoveredIdentity } from "@/lib/infinity/market-validation-acquisition-runtime/prospects";
import { lookupPersistedProspect } from "@/lib/infinity/market-validation-acquisition-runtime/prospect-registry";
import { extractPublishedContactability } from "@/lib/infinity/market-validation-acquisition-runtime/contactability";
import type { DiscoveredProspect } from "@/lib/infinity/market-validation-acquisition-runtime/types";

export const KNOWN_PROSPECT_PROMPT_IS_NOT_EVIDENCE = true as const;

export const CALEB_STRUEWING_PUBLIC_BIO_URL =
  "https://www.jll.com/en-us/people/bio-broker/caleb.struewing" as const;
export const CALEB_STRUEWING_PUBLIC_VERIFIED_AT = "2026-09-02T05:10:00.000Z" as const;

export type KnownProspectVerification = {
  name: "Caleb Struewing";
  organization: "JLL";
  persisted: "YES" | "NO";
  prospectId: string | null;
  qualification: "PASS" | "FAIL" | "UNVERIFIED";
  sourceLineage: string;
  sourceEvidence: string;
  synthetic: "YES" | "NO";
  duplicate: "YES" | "NO";
  lastVerified: string;
  publishedEmail: string | null;
  promptUsedAsEvidence: false;
};

const PUBLIC_BIO_TEXT =
  "Caleb Struewing is a Senior Brokerage Associate at JLL specializing in office tenant representation. mail caleb.struewing@jll.com";

export function verifyCalebStruewingKnownProspect(): KnownProspectVerification {
  const persisted = lookupPersistedProspect({
    name: "Caleb Struewing",
    organization: "JLL",
    email: "caleb.struewing@jll.com",
  });
  if (persisted) {
    return {
      name: "Caleb Struewing",
      organization: "JLL",
      persisted: "YES",
      prospectId: persisted.prospectId,
      qualification: persisted.qualified && !persisted.synthetic ? "PASS" : persisted.synthetic ? "FAIL" : "UNVERIFIED",
      sourceLineage: persisted.sourceUrls[0] ?? persisted.source,
      sourceEvidence: persisted.sourceEvidence,
      synthetic: persisted.synthetic ? "YES" : "NO",
      duplicate: persisted.duplicate ? "YES" : "NO",
      lastVerified: persisted.lastVerified ?? "UNKNOWN",
      publishedEmail: persisted.email,
      promptUsedAsEvidence: false,
    };
  }

  const discovered = qualifyDiscoveredIdentity({
    name: "Caleb Struewing",
    organization: "JLL",
    role: "tenant-representation broker",
    sourceUrls: [CALEB_STRUEWING_PUBLIC_BIO_URL],
    findingId: "pub_jll_caleb_struewing_bio",
  });
  const contact = extractPublishedContactability({
    url: CALEB_STRUEWING_PUBLIC_BIO_URL,
    text: PUBLIC_BIO_TEXT,
    html: `<a href="mailto:caleb.struewing@jll.com">caleb.struewing@jll.com</a>`,
    now: new Date(CALEB_STRUEWING_PUBLIC_VERIFIED_AT),
  });

  return {
    name: "Caleb Struewing",
    organization: "JLL",
    persisted: "NO",
    prospectId: discovered?.prospectId ?? null,
    qualification: discovered?.qualification.qualified ? "PASS" : "UNVERIFIED",
    sourceLineage: CALEB_STRUEWING_PUBLIC_BIO_URL,
    sourceEvidence: "READ_ONLY_PUBLIC_JLL_BIO; prompt is not evidence",
    synthetic: "NO",
    duplicate: "NO",
    lastVerified: CALEB_STRUEWING_PUBLIC_VERIFIED_AT,
    publishedEmail: contact.status === "DIRECT_PUBLIC_BUSINESS_EMAIL" ? contact.channel : null,
    promptUsedAsEvidence: false,
  };
}

export function calebStruewingAsDiscoveredProspect(): DiscoveredProspect | null {
  const verified = verifyCalebStruewingKnownProspect();
  if (verified.qualification !== "PASS" || !verified.prospectId) return null;
  const prospect = qualifyDiscoveredIdentity({
    name: "Caleb Struewing",
    organization: "JLL",
    role: "tenant-representation broker",
    sourceUrls: [CALEB_STRUEWING_PUBLIC_BIO_URL],
    findingId: "pub_jll_caleb_struewing_bio",
  });
  if (!prospect) return null;
  const contact = extractPublishedContactability({
    url: CALEB_STRUEWING_PUBLIC_BIO_URL,
    text: PUBLIC_BIO_TEXT,
    html: `<a href="mailto:caleb.struewing@jll.com">caleb.struewing@jll.com</a>`,
    now: new Date(CALEB_STRUEWING_PUBLIC_VERIFIED_AT),
  });
  return {
    ...prospect,
    publicContactChannel: verified.publishedEmail,
    contactability: contact,
    qualification: {
      ...prospect.qualification,
      contactChannelAvailable: Boolean(verified.publishedEmail),
    },
  };
}

export function promptAloneDoesNotCreateProspect(): null {
  void KNOWN_PROSPECT_PROMPT_IS_NOT_EVIDENCE;
  return null;
}
