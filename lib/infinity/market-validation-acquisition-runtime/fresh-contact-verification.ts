import { inflateRawSync, inflateSync } from "node:zlib";
import { acceptPublishedProfessionalEmail, rejectGuessedEmailPermutation } from "./email-verification";
import { isSuppressed } from "@/lib/infinity/communication-provider";
import { lookupAttemptByIdempotency } from "@/lib/infinity/communication-provider";
import type { PersistedProspectRecord } from "./prospect-registry";

export const FRESH_VERIFICATION_VERSION = "cre_wave_1_fresh_reverification_v2" as const;

const FIRST_PARTY_HOSTS = [
  "jll.com",
  "cresa.com",
  "tenantadvisors.com",
  "avisonyoung.com",
  "avisonyoung.us",
] as const;

const PERSONAL_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"];

const PERSONA_TERMS =
  /tenant representation|tenant-representation|occupier|tenant advisor|tenant advisory|lease strategy|lease comparison|occupancy cost|portfolio/i;

export type SourceFreshness = "CURRENT" | "POSSIBLY_STALE" | "STALE" | "UNKNOWN";
export type PersonaEligibility = "QUALIFIED" | "NOT_QUALIFIED" | "UNCERTAIN";

export type ProspectVerificationRecord = {
  prospectId: string;
  verifiedAt: string;
  verifiedName: string;
  verifiedCompany: string;
  verifiedRole: string;
  verifiedMarket: string | "UNKNOWN";
  verifiedProfessionalEmail: string | null;
  sourceUrl: string | null;
  sourcePublisher: string | null;
  sourceType: "first_party_professional_bio" | "first_party_pdf" | "first_party_team_page" | "none";
  firstParty: "YES" | "NO";
  emailExplicitlyPublic: "YES" | "NO";
  currentRoleExplicit: "YES" | "NO";
  roleEligibility: PersonaEligibility;
  identityConfidence: "PASS" | "FAIL";
  emailEvidence: "PASS" | "FAIL";
  staleness: SourceFreshness;
  sendEligibility: "SEND" | "BLOCK";
  blockReason: string | null;
  historicalEmailUsedAlone: false;
  inferredEmail: false;
  contactPath: "PUBLIC_PROFESSIONAL_EMAIL" | "NONE";
};

const verificationRecords = new Map<string, ProspectVerificationRecord>();

export function resetFreshContactVerification(): void {
  verificationRecords.clear();
}

export function inspectFreshVerificationRecord(prospectId: string): ProspectVerificationRecord | null {
  return verificationRecords.get(prospectId) ?? null;
}

export function listFreshVerificationRecords(): ProspectVerificationRecord[] {
  return [...verificationRecords.values()];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function extractMailtoAndJsonEmails(raw: string): string {
  const found: string[] = [];
  for (const match of raw.matchAll(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi)) {
    found.push(match[1]);
  }
  for (const match of raw.matchAll(/"(?:email|e-mail|mail)"\s*:\s*"([^"]+@[^"]+)"/gi)) {
    found.push(match[1]);
  }
  return found.join("\n");
}

function extractPdfStringLiterals(raw: string): string {
  const parts: string[] = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)]){2,}\)/g)) {
    parts.push(match[0].slice(1, -1).replace(/\\n/g, " ").replace(/\\\(/g, "(").replace(/\\\)/g, ")"));
  }
  return parts.join(" ");
}

export function decodeFirstPartySource(url: string, bytes: Buffer): string {
  const utf8 = bytes.toString("utf8");
  const parts = [utf8, extractMailtoAndJsonEmails(utf8)];
  if (!/\.pdf($|\?)/i.test(url) && !utf8.startsWith("%PDF")) return parts.filter(Boolean).join("\n");
  const latin1 = bytes.toString("latin1");
  const printable = latin1.match(/[\x20-\x7E]{6,}/g) ?? [];
  parts.push(...printable);
  parts.push(extractPdfStringLiterals(latin1));
  for (const match of latin1.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    const payload = Buffer.from(match[1], "latin1");
    for (const inflate of [inflateSync, inflateRawSync]) {
      try {
        const inflated = inflate(payload).toString("latin1");
        parts.push(inflated);
        parts.push(extractPdfStringLiterals(inflated));
        parts.push(extractMailtoAndJsonEmails(inflated));
        break;
      } catch {
        continue;
      }
    }
  }
  return parts.filter(Boolean).join("\n");
}

export function isFirstPartyProfessionalHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return FIRST_PARTY_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return PERSONAL_EMAIL_DOMAINS.includes(domain);
}

export function assessSourceFreshness(input: {
  fetched: boolean;
  firstParty: boolean;
  text: string;
}): SourceFreshness {
  if (!input.fetched) return "UNKNOWN";
  if (!input.firstParty) return "UNKNOWN";
  const text = input.text.toLowerCase();
  if (/\b20(1[0-9]|2[0-2])\b/.test(text) && !/\b202[4-6]\b/.test(text) && /formerly|no longer|left the firm/i.test(text)) {
    return "STALE";
  }
  return "CURRENT";
}

export function assessPersona(text: string): PersonaEligibility {
  if (PERSONA_TERMS.test(text)) return "QUALIFIED";
  if (/landlord only|investment sales only|property management only/i.test(text) && !PERSONA_TERMS.test(text)) {
    return "NOT_QUALIFIED";
  }
  return "UNCERTAIN";
}

function persist(record: ProspectVerificationRecord): ProspectVerificationRecord {
  verificationRecords.set(record.prospectId, record);
  return record;
}

export function verifyProspectFromHistoricalRecordAlone(prospect: PersistedProspectRecord): ProspectVerificationRecord {
  return persist({
    prospectId: prospect.prospectId,
    verifiedAt: new Date().toISOString(),
    verifiedName: prospect.name,
    verifiedCompany: prospect.organization,
    verifiedRole: prospect.role,
    verifiedMarket: prospect.market || "UNKNOWN",
    verifiedProfessionalEmail: null,
    sourceUrl: null,
    sourcePublisher: null,
    sourceType: "none",
    firstParty: "NO",
    emailExplicitlyPublic: "NO",
    currentRoleExplicit: "NO",
    roleEligibility: "UNCERTAIN",
    identityConfidence: "FAIL",
    emailEvidence: "FAIL",
    staleness: "UNKNOWN",
    sendEligibility: "BLOCK",
    blockReason: "HISTORICAL_RECORD_INSUFFICIENT",
    historicalEmailUsedAlone: false,
    inferredEmail: false,
    contactPath: "NONE",
  });
}

export function evaluateFreshPublicSourceVerification(input: {
  prospect: PersistedProspectRecord;
  sourceUrl: string;
  sourceText: string;
  fetched: boolean;
  now?: Date;
  suppressed?: boolean;
  cooldownActive?: boolean;
  existingSuccessfulSend?: boolean;
}): ProspectVerificationRecord {
  const now = (input.now ?? new Date()).toISOString();
  const firstParty = isFirstPartyProfessionalHost(input.sourceUrl);
  const text = input.sourceText;
  const nameTokens = input.prospect.name.toLowerCase().split(/\s+/).filter((part) => part.length > 2);
  const namePresent =
    text.toLowerCase().includes(input.prospect.name.toLowerCase()) ||
    (/\.pdf($|\?)/i.test(input.sourceUrl) &&
      nameTokens.length >= 2 &&
      nameTokens.every((part) => text.toLowerCase().includes(part)));
  const companyPresent = text.toLowerCase().includes(input.prospect.organization.toLowerCase());
  const historicalEmail = input.prospect.email?.trim().toLowerCase() ?? null;
  const emailOnSource = Boolean(historicalEmail && text.toLowerCase().includes(historicalEmail));
  const inferred = Boolean(historicalEmail && rejectGuessedEmailPermutation(historicalEmail, text));
  const personal = historicalEmail ? isPersonalEmail(historicalEmail) : false;
  const emailDecision =
    historicalEmail && emailOnSource
      ? acceptPublishedProfessionalEmail({
          email: historicalEmail,
          sourceUrl: input.sourceUrl,
          sourceText: text,
          name: input.prospect.name,
        })
      : { accepted: false, reason: "NOT_ON_SOURCE" as const };
  const persona = assessPersona(text);
  const roleExplicit = PERSONA_TERMS.test(text);
  const freshness = assessSourceFreshness({ fetched: input.fetched, firstParty, text });
  const identity =
    input.fetched && namePresent && companyPresent && firstParty ? ("PASS" as const) : ("FAIL" as const);
  let blockReason: string | null = null;
  if (!input.fetched) blockReason = "SOURCE_UNAVAILABLE";
  else if (!firstParty) blockReason = "FIRST_PARTY_SOURCE_REQUIRED";
  else if (!namePresent || !companyPresent) blockReason = "IDENTITY_UNCERTAINTY";
  else if (freshness === "STALE" || freshness === "UNKNOWN") blockReason = "SOURCE_STALE_OR_UNKNOWN";
  else if (!emailOnSource || inferred || !emailDecision.accepted) blockReason = "EMAIL_NOT_EXPLICIT_ON_SOURCE";
  else if (personal) blockReason = "PERSONAL_EMAIL_BLOCKED";
  else if (persona !== "QUALIFIED") blockReason = persona === "UNCERTAIN" ? "PERSONA_UNCERTAIN" : "PERSONA_MISMATCH";
  else if (!roleExplicit) blockReason = "CURRENT_ROLE_NOT_EXPLICIT";
  else if (input.suppressed) blockReason = "SUPPRESSED";
  else if (input.cooldownActive) blockReason = "COOLDOWN";
  else if (input.existingSuccessfulSend) blockReason = "DUPLICATE_INITIAL_SEND";
  const eligible = blockReason === null;
  return persist({
    prospectId: input.prospect.prospectId,
    verifiedAt: now,
    verifiedName: input.prospect.name,
    verifiedCompany: input.prospect.organization,
    verifiedRole: roleExplicit ? input.prospect.role : "UNKNOWN",
    verifiedMarket: input.prospect.market || "UNKNOWN",
    verifiedProfessionalEmail: eligible ? historicalEmail : emailOnSource ? historicalEmail : null,
    sourceUrl: input.sourceUrl,
    sourcePublisher: hostOf(input.sourceUrl),
    sourceType: /\.pdf($|\?)/i.test(input.sourceUrl) ? "first_party_pdf" : "first_party_professional_bio",
    firstParty: firstParty ? "YES" : "NO",
    emailExplicitlyPublic: emailOnSource ? "YES" : "NO",
    currentRoleExplicit: roleExplicit ? "YES" : "NO",
    roleEligibility: persona,
    identityConfidence: identity,
    emailEvidence: emailDecision.accepted ? "PASS" : "FAIL",
    staleness: freshness,
    sendEligibility: eligible ? "SEND" : "BLOCK",
    blockReason,
    historicalEmailUsedAlone: false,
    inferredEmail: false,
    contactPath: eligible ? "PUBLIC_PROFESSIONAL_EMAIL" : "NONE",
  });
}

export async function reverifyPersistedProspect(input: {
  prospect: PersistedProspectRecord;
  fetchImpl?: typeof fetch;
  now?: Date;
  idempotencyKey?: string;
}): Promise<ProspectVerificationRecord> {
  const urls = [
    ...input.prospect.sourceUrls,
    input.prospect.emailSource,
    input.prospect.source,
  ].filter((url, index, all): url is string => Boolean(url) && all.indexOf(url) === index);
  if (urls.length === 0) return verifyProspectFromHistoricalRecordAlone(input.prospect);
  const fetchImpl = input.fetchImpl ?? fetch;
  const suppressed = isSuppressed({
    prospectId: input.prospect.prospectId,
    email: input.prospect.email,
    experimentId: input.prospect.experimentId,
  });
  const cooldownActive = Boolean(
    input.prospect.cooldownUntil && Date.parse(input.prospect.cooldownUntil) > (input.now ?? new Date()).getTime(),
  );
  const existing = input.idempotencyKey ? lookupAttemptByIdempotency(input.idempotencyKey) : null;
  const existingSuccessfulSend = Boolean(
    existing && (existing.state === "PROVIDER_ACCEPTED" || existing.state === "DELIVERED"),
  );
  let last = verifyProspectFromHistoricalRecordAlone(input.prospect);
  for (const url of urls) {
    if (!isFirstPartyProfessionalHost(url)) continue;
    let text = "";
    let fetched = false;
    try {
      const res = await fetchImpl(url);
      const bytes = Buffer.from(await res.arrayBuffer());
      text = decodeFirstPartySource(url, bytes);
      fetched = res.ok && text.trim().length > 0;
    } catch {
      fetched = false;
    }
    last = evaluateFreshPublicSourceVerification({
      prospect: input.prospect,
      sourceUrl: url,
      sourceText: text,
      fetched,
      now: input.now,
      suppressed,
      cooldownActive,
      existingSuccessfulSend,
    });
    if (last.sendEligibility === "SEND") return last;
  }
  return last;
}
