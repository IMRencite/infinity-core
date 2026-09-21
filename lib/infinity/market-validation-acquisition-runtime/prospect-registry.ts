import { founderApprovedProspects } from "@/lib/infinity/market-validation-experiment/founder-assisted-cohort";
import { LOCKED_CRE_EXPERIMENT_ID } from "@/lib/infinity/market-validation-experiment/constants";
import { FIRST_REAL_COHORT_ID } from "./first-send-authorization";
import { acceptPublishedProfessionalEmail } from "./email-verification";

export type ProspectContactPath =
  | "PUBLIC_PROFESSIONAL_EMAIL"
  | "PUBLIC_BUSINESS_CONTACT_FORM"
  | "PUBLIC_PROFESSIONAL_PROFILE_CONTACT"
  | "NO_PUBLIC_CONTACT_PATH";

export type PersistedProspectRecord = {
  prospectId: string;
  name: string;
  organization: string;
  role: string;
  title: string;
  market: string;
  qualificationProfile: "tenant_rep_broker" | "independent_cre_broker" | "small_cre_advisory" | "lease_consultant";
  qualificationRationale: string;
  qualified: boolean;
  source: string;
  sourceUrls: string[];
  sourceType: "first_party_professional_bio" | "first_party_team_page" | "founder_approved_named";
  sourceEvidence: string;
  contactPath: ProspectContactPath;
  contactChannel: string | null;
  email: string | null;
  emailSource: string | null;
  lastVerified: string | null;
  synthetic: boolean;
  duplicate: boolean;
  optedOut: boolean;
  cooldownUntil: string | null;
  experimentId: typeof LOCKED_CRE_EXPERIMENT_ID;
  cohortId: typeof FIRST_REAL_COHORT_ID | null;
  personalization: {
    role: string;
    organization: string;
    specialization: string;
    market: string;
    publicFocus: string;
  };
};

const persisted = new Map<string, PersistedProspectRecord>();

export function resetPersistedAcquisitionProspects(): void {
  persisted.clear();
}

export function persistVerifiedProspect(record: PersistedProspectRecord): {
  ok: boolean;
  reason: string;
  record: PersistedProspectRecord | null;
} {
  if (record.synthetic) return { ok: false, reason: "SYNTHETIC_REJECTED", record: null };
  if (!record.name.trim() || !record.organization.trim() || !record.prospectId.trim()) {
    return { ok: false, reason: "IDENTITY_UNCERTAINTY", record: null };
  }
  if (!record.qualified) return { ok: false, reason: "NOT_QUALIFIED", record: null };
  if (record.sourceUrls.length === 0 || record.sourceUrls.some((url) => !/^https?:\/\//i.test(url))) {
    return { ok: false, reason: "PUBLIC_SOURCE_REQUIRED", record: null };
  }
  const existing = lookupPersistedProspect({
    name: record.name,
    organization: record.organization,
    email: record.email ?? undefined,
  });
  if (existing && existing.prospectId !== record.prospectId) {
    return { ok: false, reason: "DUPLICATE_REJECTED", record: null };
  }
  if (record.email) {
    const emailOk = acceptPublishedProfessionalEmail({
      email: record.email,
      sourceUrl: record.emailSource ?? record.sourceUrls[0] ?? "",
      sourceText: `${record.sourceEvidence} ${record.email}`,
      name: record.name,
    });
    if (!emailOk.accepted) return { ok: false, reason: "UNSUPPORTED_CONTACT_REJECTED", record: null };
  }
  persisted.set(record.prospectId, record);
  return { ok: true, reason: "PERSISTED", record };
}

export function persistedAcquisitionProspects(): PersistedProspectRecord[] {
  const named = founderApprovedProspects().filter(
    (prospect) => ![...persisted.values()].some((item) => item.name === prospect.name),
  );
  const fromFounder: PersistedProspectRecord[] = named.map((prospect) => ({
    prospectId: prospect.id,
    name: prospect.name,
    organization: "",
    role: prospect.role,
    title: prospect.role,
    market: "",
    qualificationProfile: "tenant_rep_broker",
    qualificationRationale: "founder_approved_named",
    qualified: true,
    source: prospect.source,
    sourceUrls: [],
    sourceType: "founder_approved_named",
    sourceEvidence: "founder_approved_named",
    contactPath: "NO_PUBLIC_CONTACT_PATH",
    contactChannel: null,
    email: null,
    emailSource: null,
    lastVerified: null,
    synthetic: false,
    duplicate: false,
    optedOut: false,
    cooldownUntil: null,
    experimentId: LOCKED_CRE_EXPERIMENT_ID,
    cohortId: null,
    personalization: {
      role: prospect.role,
      organization: "",
      specialization: prospect.role,
      market: "",
      publicFocus: prospect.role,
    },
  }));
  return [...persisted.values(), ...fromFounder];
}

export function lookupPersistedProspect(input: {
  name?: string;
  organization?: string;
  email?: string;
  prospectId?: string;
}): PersistedProspectRecord | null {
  if (input.prospectId) return persisted.get(input.prospectId) ?? null;
  const name = input.name?.trim().toLowerCase();
  const organization = input.organization?.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase();
  return (
    persistedAcquisitionProspects().find((record) => {
      if (email && record.email?.toLowerCase() === email) return true;
      if (name && record.name.toLowerCase() === name) {
        return !organization || record.organization.toLowerCase() === organization;
      }
      return false;
    }) ?? null
  );
}

export function persistedCohortProspects(cohortId: string = FIRST_REAL_COHORT_ID): PersistedProspectRecord[] {
  return persistedAcquisitionProspects().filter((record) => record.cohortId === cohortId && record.qualified);
}

export function markPersistedProspectCooldown(prospectId: string, until: string): boolean {
  const existing = persisted.get(prospectId);
  if (!existing) return false;
  persisted.set(prospectId, { ...existing, cooldownUntil: until });
  return true;
}
