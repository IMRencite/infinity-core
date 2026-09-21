export const CONTACTABILITY_STATUSES = [
  "DIRECT_PUBLIC_BUSINESS_EMAIL",
  "DIRECT_PUBLIC_BUSINESS_PHONE",
  "PUBLIC_PROFESSIONAL_PROFILE",
  "ORGANIZATION_CONTACT_FORM",
  "ORGANIZATION_GENERAL_CONTACT",
  "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
] as const;

export type ContactabilityStatus = (typeof CONTACTABILITY_STATUSES)[number];
export type ContactScope = "DIRECT_CONTACT" | "ORGANIZATION_LEVEL_CONTACT";

export type ContactabilityRecord = {
  status: ContactabilityStatus;
  channel: string | null;
  sourceUrl: string | null;
  scope: ContactScope | null;
  observedAt: string;
};

const EMAIL = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;

function pageHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isPublicProfessionalProfileUrl(url: string): boolean {
  return /\/(team|people|leadership|bios?|professionals|advisors|brokers)(\/|$)/i.test(url);
}

function publishedOrgEmail(blob: string, host: string | null): string | null {
  if (!host) return null;
  for (const match of blob.matchAll(EMAIL)) {
    const email = match[0];
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && (domain === host || host.endsWith(`.${domain}`))) return email;
  }
  return null;
}

export function extractPublishedContactability(input: {
  url: string;
  html?: string;
  text: string;
  now?: Date;
}): ContactabilityRecord {
  const observedAt = (input.now ?? new Date()).toISOString();
  const host = pageHost(input.url);
  const blob = `${input.html ?? ""}\n${input.text}`;
  const email = publishedOrgEmail(blob, host);
  if (email) {
    return {
      status: "DIRECT_PUBLIC_BUSINESS_EMAIL",
      channel: email,
      sourceUrl: input.url,
      scope: isPublicProfessionalProfileUrl(input.url) ? "DIRECT_CONTACT" : "ORGANIZATION_LEVEL_CONTACT",
      observedAt,
    };
  }
  const tel = blob.match(/href=["']tel:([^"']+)["']/i)?.[1];
  if (tel && /contact|office|main|hq/i.test(`${input.url} ${input.text}`)) {
    return {
      status: "DIRECT_PUBLIC_BUSINESS_PHONE",
      channel: tel,
      sourceUrl: input.url,
      scope: "ORGANIZATION_LEVEL_CONTACT",
      observedAt,
    };
  }
  if (/<form[\s\S]+<\/form>/i.test(input.html ?? "") && /contact|inquiry|reach/i.test(`${input.url} ${input.text}`)) {
    return {
      status: "ORGANIZATION_CONTACT_FORM",
      channel: input.url,
      sourceUrl: input.url,
      scope: "ORGANIZATION_LEVEL_CONTACT",
      observedAt,
    };
  }
  if (/\/contact(\/|$)/i.test(input.url)) {
    return {
      status: "ORGANIZATION_GENERAL_CONTACT",
      channel: input.url,
      sourceUrl: input.url,
      scope: "ORGANIZATION_LEVEL_CONTACT",
      observedAt,
    };
  }
  if (isPublicProfessionalProfileUrl(input.url)) {
    return {
      status: "PUBLIC_PROFESSIONAL_PROFILE",
      channel: input.url,
      sourceUrl: input.url,
      scope: "DIRECT_CONTACT",
      observedAt,
    };
  }
  return {
    status: "CONTACT_CHANNEL_NOT_YET_IDENTIFIED",
    channel: null,
    sourceUrl: null,
    scope: null,
    observedAt,
  };
}

export function mergeContactability(primary: ContactabilityRecord, extra: ContactabilityRecord): ContactabilityRecord {
  const rank: Record<ContactabilityStatus, number> = {
    DIRECT_PUBLIC_BUSINESS_EMAIL: 5,
    DIRECT_PUBLIC_BUSINESS_PHONE: 4,
    PUBLIC_PROFESSIONAL_PROFILE: 3,
    ORGANIZATION_CONTACT_FORM: 2,
    ORGANIZATION_GENERAL_CONTACT: 1,
    CONTACT_CHANNEL_NOT_YET_IDENTIFIED: 0,
  };
  return rank[extra.status] > rank[primary.status] ? extra : primary;
}

export function isActionableContact(record: ContactabilityRecord): boolean {
  return record.status !== "CONTACT_CHANNEL_NOT_YET_IDENTIFIED";
}
