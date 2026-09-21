import {
  CANONICAL_FOOTER_VISIBLE_FORMAT,
  CANONICAL_IMR_BY_LABEL,
  CANONICAL_IMR_URL,
  CANONICAL_INFINITE_OS_URL,
  CANONICAL_INFINITY_OS_VENTURE_LABEL,
  CANONICAL_PRIVACY_HREF,
  CANONICAL_PRIVACY_LABEL,
  CANONICAL_SITEMAP_HREF,
  CANONICAL_SITEMAP_LABEL,
  CANONICAL_TERMS_HREF,
  CANONICAL_TERMS_LABEL,
  FORBIDDEN_FAKE_TRUST,
  VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1,
  type ValidationQualityState,
} from "./constants";

export type StructuralCheck = "PASS" | "FAIL";

export type ValidationGradeAudit = {
  contract: typeof VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1;
  functional: StructuralCheck;
  responsive: StructuralCheck;
  intentionalContainer: StructuralCheck;
  hero: StructuralCheck;
  ctaStyling: StructuralCheck;
  pricing: StructuralCheck;
  form: StructuralCheck;
  sectionHierarchy: StructuralCheck;
  disclosure: StructuralCheck;
  footer: StructuralCheck;
  privacyDestination: StructuralCheck;
  termsDestination: StructuralCheck;
  sitemapDestination: StructuralCheck;
  duplicateRawBrandingUrls: "YES" | "NO";
  mobileLayout: StructuralCheck;
  fakeTrustSignals: "YES" | "NO";
  validationGradeOverall: StructuralCheck;
  classification: ValidationQualityState;
};

function file(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((item) => item.path.replace(/\\/g, "/") === path)?.content ?? "";
}

function blobOf(files: Array<{ path: string; content: string }>): string {
  return files.map((item) => item.content).join("\n");
}

export function auditFooterContract(files: Array<{ path: string; content: string }>): {
  privacyPresent: boolean;
  termsPresent: boolean;
  sitemapPresent: boolean;
  infiniteOsLinked: boolean;
  imrLinked: boolean;
  duplicateRawBrandingUrls: boolean;
  exactWording: StructuralCheck;
  visibleFormat: typeof CANONICAL_FOOTER_VISIBLE_FORMAT | string;
} {
  const footer = file(files, "components/venture-footer.tsx");
  const blob = `${footer}\n${file(files, "app/early-access/page.tsx")}`;
  const privacyPresent = blob.includes(CANONICAL_PRIVACY_LABEL) && /href=["']\/privacy-policy\/?["']/.test(blob);
  const termsPresent = blob.includes(CANONICAL_TERMS_LABEL) && /href=["']\/terms-of-service\/?["']/.test(blob);
  const sitemapPresent = blob.includes(CANONICAL_SITEMAP_LABEL) && /href=["']\/sitemap\.xml["']/.test(blob);
  const infiniteOsLinked = new RegExp(
    `<a[^>]+href=["']${CANONICAL_INFINITE_OS_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>\\s*${CANONICAL_INFINITY_OS_VENTURE_LABEL}`,
    "i",
  ).test(blob);
  const imrLinked = new RegExp(
    `<a[^>]+href=["']${CANONICAL_IMR_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>\\s*${CANONICAL_IMR_BY_LABEL}`,
    "i",
  ).test(blob);
  const withoutHrefs = blob
    .replace(/href=["']https:\/\/imros\.io["']/g, "")
    .replace(/href=["']https:\/\/infinitemediaresources\.com["']/g, "");
  const duplicateRawBrandingUrls =
    /https:\/\/imros\.io/.test(withoutHrefs) || /https:\/\/infinitemediaresources\.com/.test(withoutHrefs);
  const exactWording =
    blob.includes(CANONICAL_FOOTER_VISIBLE_FORMAT) &&
    blob.includes(CANONICAL_INFINITY_OS_VENTURE_LABEL) &&
    blob.includes(CANONICAL_IMR_BY_LABEL) &&
    !/An Infinite OS Venture/.test(blob)
      ? "PASS"
      : "FAIL";
  return {
    privacyPresent,
    termsPresent,
    sitemapPresent,
    infiniteOsLinked,
    imrLinked,
    duplicateRawBrandingUrls,
    exactWording,
    visibleFormat: CANONICAL_FOOTER_VISIBLE_FORMAT,
  };
}

export function evaluatePublicLegalCompleteness(files: Array<{ path: string; content: string }>): {
  privacy: StructuralCheck;
  terms: StructuralCheck;
  sitemap: StructuralCheck;
  footer: StructuralCheck;
  complete: StructuralCheck;
  fabricatedLegalClaims: boolean;
} {
  const privacy = files.some((item) => item.path.replace(/\\/g, "/") === "app/privacy-policy/page.tsx")
    ? "PASS"
    : "FAIL";
  const terms = files.some((item) => item.path.replace(/\\/g, "/") === "app/terms-of-service/page.tsx")
    ? "PASS"
    : "FAIL";
  const sitemap = files.some((item) => /app\/sitemap\.(ts|js|xml)$/.test(item.path.replace(/\\/g, "/")))
    ? "PASS"
    : "FAIL";
  const footerAudit = auditFooterContract(files);
  const footer =
    footerAudit.privacyPresent &&
    footerAudit.termsPresent &&
    footerAudit.sitemapPresent &&
    footerAudit.infiniteOsLinked &&
    footerAudit.imrLinked &&
    !footerAudit.duplicateRawBrandingUrls &&
    footerAudit.exactWording === "PASS"
      ? "PASS"
      : "FAIL";
  const blob = blobOf(files);
  const fabricatedLegalClaims =
    /refund within|99\.9% uptime|we guarantee|licensed attorney has reviewed|soc 2 certified/i.test(blob);
  return {
    privacy,
    terms,
    sitemap,
    footer,
    complete: privacy === "PASS" && terms === "PASS" && sitemap === "PASS" && footer === "PASS" ? "PASS" : "FAIL",
    fabricatedLegalClaims,
  };
}

export function auditValidationGrade(files: Array<{ path: string; content: string }>): ValidationGradeAudit {
  const css = file(files, "styles/globals.css");
  const landing = file(files, "app/page.tsx");
  const form = file(files, "app/early-access/page.tsx");
  const primitives = file(files, "components/validation-grade.tsx");
  const blob = `${css}\n${landing}\n${form}\n${primitives}`;
  const footerAudit = auditFooterContract(files);
  const legal = evaluatePublicLegalCompleteness(files);
  const responsive = /@media/.test(css) && /max-width:\s*640px/.test(css) ? "PASS" : "FAIL";
  const intentionalContainer = /\.vg-container|max-width:\s*68rem|max-width:\s*var\(--vg-max\)/.test(css)
    ? "PASS"
    : "FAIL";
  const hero = /vg-hero|<h1>|<Hero/.test(`${landing}\n${primitives}`) ? "PASS" : "FAIL";
  const ctaStyling = /vg-cta--primary|vg-cta/.test(blob) && /Request Pilot Access|Request Early Access/.test(blob)
    ? "PASS"
    : "FAIL";
  const pricing = /vg-pricing-card/.test(blob) && /not a purchase|interest/i.test(blob) ? "PASS" : "FAIL";
  const formStyled = /vg-form/.test(form) && /<label/.test(form) ? "PASS" : "FAIL";
  const sectionHierarchy =
    /<h1>|<Hero/.test(`${landing}\n${primitives}`) && /<h2>|<Section/.test(`${landing}\n${primitives}`)
      ? "PASS"
      : "FAIL";
  const disclosure = /vg-disclosure|not generally available|in validation/i.test(blob) ? "PASS" : "FAIL";
  const footer = legal.footer;
  const functional =
    /Request Pilot Access|Request Early Access/.test(blob) &&
    /workEmail/.test(form || landing) &&
    /in validation|early access/i.test(blob)
      ? "PASS"
      : "FAIL";
  const fakeTrustSignals = FORBIDDEN_FAKE_TRUST.test(blob) ? "YES" : "NO";
  const structuralPass =
    functional === "PASS" &&
    responsive === "PASS" &&
    intentionalContainer === "PASS" &&
    hero === "PASS" &&
    ctaStyling === "PASS" &&
    pricing === "PASS" &&
    formStyled === "PASS" &&
    sectionHierarchy === "PASS" &&
    disclosure === "PASS" &&
    footer === "PASS" &&
    legal.privacy === "PASS" &&
    legal.terms === "PASS" &&
    legal.sitemap === "PASS" &&
    fakeTrustSignals === "NO";
  let classification: ValidationQualityState = "FUNCTIONALLY_INVALID";
  if (functional === "PASS" && !structuralPass) {
    classification = "FUNCTIONALLY_VALID_VISUALLY_BELOW_VALIDATION_GRADE";
  } else if (structuralPass) {
    classification = "VALIDATION_GRADE_READY";
  }
  return {
    contract: VALIDATION_GRADE_PUBLIC_VENTURE_TEMPLATE_V1,
    functional,
    responsive,
    intentionalContainer,
    hero,
    ctaStyling,
    pricing,
    form: formStyled,
    sectionHierarchy,
    disclosure,
    footer,
    privacyDestination: legal.privacy,
    termsDestination: legal.terms,
    sitemapDestination: legal.sitemap,
    duplicateRawBrandingUrls: footerAudit.duplicateRawBrandingUrls ? "YES" : "NO",
    mobileLayout: responsive,
    fakeTrustSignals,
    validationGradeOverall: structuralPass ? "PASS" : "FAIL",
    classification,
  };
}

export function classifyLiveDeployedCreLanding(source: {
  landing: string;
  form: string;
  footer: string;
  css: string;
  files: Array<{ path: string; content: string }>;
}): ValidationGradeAudit {
  const files = source.files.length
    ? source.files
    : [
        { path: "app/page.tsx", content: source.landing },
        { path: "app/early-access/page.tsx", content: source.form },
        { path: "components/venture-footer.tsx", content: source.footer },
        { path: "styles/globals.css", content: source.css },
      ];
  return auditValidationGrade(files);
}
