export type PublishedEmailDecision = {
  accepted: boolean;
  reason: "PUBLICLY_DISPLAYED_IDENTITY_MATCHED" | "GUESSED_EMAIL_REJECTED" | "NOT_ON_SOURCE" | "NOT_PROFESSIONAL";
};

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function pageHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function acceptPublishedProfessionalEmail(input: {
  email: string;
  sourceUrl: string;
  sourceText: string;
  name: string;
}): PublishedEmailDecision {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { accepted: false, reason: "NOT_PROFESSIONAL" };
  if (!input.sourceText.toLowerCase().includes(email)) return { accepted: false, reason: "NOT_ON_SOURCE" };
  const host = pageHost(input.sourceUrl);
  const domain = email.split("@")[1] ?? "";
  const hostOk =
    !host
    || domain === host
    || host.endsWith(`.${domain}`)
    || domain.endsWith(host.replace(/\.com$/, ""))
    || host.includes(domain.split(".")[0] ?? "");
  if (!hostOk && !/cresa\.com|tenantadvisors\.com|avisonyoung\.com|jll\.com/i.test(domain)) {
    return { accepted: false, reason: "NOT_PROFESSIONAL" };
  }
  const last = input.name.trim().split(/\s+/).pop()?.toLowerCase() ?? "";
  if (last && !email.includes(last.replace(/[^a-z]/g, ""))) {
    return { accepted: false, reason: "NOT_ON_SOURCE" };
  }
  return { accepted: true, reason: "PUBLICLY_DISPLAYED_IDENTITY_MATCHED" };
}
