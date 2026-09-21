export type NormalizedEntityFields = {
  display_name: string | null;
  given_name: string | null;
  family_name: string | null;
  legal_name: string | null;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  domain: string | null;
  url: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  industry: string | null;
  role: string | null;
  business_id: string | null;
  license_id: string | null;
  cik: string | null;
  ticker: string | null;
};

const CORP_SUFFIX = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|ltd|limited|co|company|plc|lp|llp)\.?$/i;

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = normalizeWhitespace(value);
  return cleaned || null;
}

export function normalizeOrganizationName(value: unknown): string | null {
  const name = normalizeName(value);
  return name ? name.replace(CORP_SUFFIX, "").trim() || name : null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const host = raw.replace(/^www\./, "");
  return host.includes(".") ? host : null;
}

export function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return `${url.origin}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function normalizeRegion(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = normalizeWhitespace(value).toUpperCase();
  if (/^[A-Z]{2}$/.test(token)) return `US-${token}`;
  return normalizeWhitespace(value) || null;
}

export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = normalizeWhitespace(value).toUpperCase();
  if (token === "USA" || token === "UNITED STATES") return "US";
  return token.length === 2 ? token : normalizeWhitespace(value);
}

export function normalizeCik(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits ? digits.padStart(10, "0") : null;
}

export function normalizeIndustry(value: unknown): string | null {
  const name = normalizeName(value);
  return name ? name.toLowerCase() : null;
}

export function normalizeRawFields(raw: Record<string, unknown>): NormalizedEntityFields {
  return {
    display_name: normalizeName(raw.display_name ?? raw.person_name ?? raw.name ?? raw.title),
    given_name: normalizeName(raw.given_name ?? raw.first_name),
    family_name: normalizeName(raw.family_name ?? raw.last_name),
    legal_name: normalizeName(raw.legal_name ?? raw.title ?? raw.organization_name ?? raw.company),
    trade_name: normalizeName(raw.trade_name ?? raw.ticker),
    email: normalizeEmail(raw.email),
    phone: normalizePhone(raw.phone),
    domain: normalizeDomain(raw.domain ?? raw.website ?? raw.url),
    url: normalizeUrl(raw.website ?? raw.url ?? raw.source_url),
    address: normalizeName(raw.address),
    city: normalizeName(raw.city),
    region: normalizeRegion(raw.region ?? raw.state),
    country: normalizeCountry(raw.country),
    industry: normalizeIndustry(raw.industry ?? raw.sicDescription ?? raw.sic_description),
    role: normalizeName(raw.role ?? raw.title_role),
    business_id: normalizeName(raw.business_id ?? raw.registration_id),
    license_id: normalizeName(raw.license_id),
    cik: normalizeCik(raw.cik ?? raw.cik_str),
    ticker: normalizeName(raw.ticker)?.toUpperCase() ?? null,
  };
}
