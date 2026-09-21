import type { AffiliateApplication } from "./types";
import { occupancyNpvAffiliateProgram } from "./occupancy";

const applications: AffiliateApplication[] = [];

export function submitAffiliateApplication(input: {
  name: string;
  email: string;
  organization?: string;
  website?: string;
  social_url?: string;
  audience?: string;
  promotion_method?: string;
  country?: string;
  agreement_accepted: boolean;
  production?: boolean;
}): { ok: boolean; application?: AffiliateApplication; reason?: string } {
  if (input.production) {
    return { ok: false, reason: "PRODUCTION_APPLICATIONS_DISABLED_FOR_QC" };
  }
  if (!input.name.trim() || !input.email.includes("@") || !input.agreement_accepted) {
    return { ok: false, reason: "INVALID_APPLICATION" };
  }
  const application: AffiliateApplication = {
    application_id: `fixture-app:${applications.length + 1}`,
    program_id: occupancyNpvAffiliateProgram().program_id,
    name: input.name.trim(),
    email: input.email.trim(),
    organization: input.organization,
    website: input.website,
    social_url: input.social_url,
    audience: input.audience,
    promotion_method: input.promotion_method,
    country: input.country,
    agreement_accepted: true,
    status: "SUBMITTED",
    fixture: true,
    production: false,
  };
  applications.push(application);
  return { ok: true, application };
}

export function listFixtureApplications(): AffiliateApplication[] {
  return applications.filter((row) => row.fixture && !row.production);
}

export function resetFixtureApplications(): void {
  applications.length = 0;
}

export function productionAffiliatesCreated(): false {
  return false;
}
