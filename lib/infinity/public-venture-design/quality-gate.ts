import { auditValidationGrade, type StructuralCheck } from "@/lib/infinity/public-venture-template";
import { FORBIDDEN_COPIED_BRAND_HTML, PREMIUM_VALIDATION_READY } from "./constants";

export type PremiumValidationAudit = {
  validationGrade: StructuralCheck;
  distinctiveComposition: StructuralCheck;
  professionalTypography: StructuralCheck;
  premiumSpacing: StructuralCheck;
  ventureSpecificTokens: StructuralCheck;
  intentionalHero: StructuralCheck;
  visualNecessityEvaluated: StructuralCheck;
  productVisualization: StructuralCheck;
  reusableSections: StructuralCheck;
  mobileQuality: StructuralCheck;
  accessibility: StructuralCheck;
  conversionClarity: StructuralCheck;
  trustIntegrity: StructuralCheck;
  legalCompleteness: StructuralCheck;
  performanceSanity: StructuralCheck;
  notDefaultTemplate: StructuralCheck;
  copiedSourceDesigns: "YES" | "NO";
  fakeCustomers: "YES" | "NO";
  fakeProductState: "YES" | "NO";
  premiumLooksBooleanPresent: "YES" | "NO";
  premiumOverall: StructuralCheck;
  classification: "FUNCTIONALLY_INVALID" | "FUNCTIONALLY_VALID" | "FUNCTIONALLY_VALID_VISUALLY_BELOW_VALIDATION_GRADE" | "VALIDATION_GRADE_READY" | "PREMIUM_VALIDATION_READY" | "PREMIUM_AUTHORITY_VALIDATION_READY" | "PREMIUM_AUTHORITY_STRUCTURE_READY_BUT_CONTENT_DEPTH_BELOW_STANDARD" | "PREMIUM_AUTHORITY_CONTENT_READY_RENDERED_LAYOUT_BELOW_STANDARD" | "PRODUCTION_GRADE";
};

function blobOf(files: Array<{ path: string; content: string }>): string {
  return files.map((item) => item.content).join("\n");
}

function file(files: Array<{ path: string; content: string }>, path: string): string {
  return files.find((item) => item.path.replace(/\\/g, "/") === path)?.content ?? "";
}

export function auditPremiumValidation(files: Array<{ path: string; content: string }>): PremiumValidationAudit {
  const grade = auditValidationGrade(files);
  const blob = blobOf(files);
  const css = file(files, "styles/globals.css");
  const landing = file(files, "app/page.tsx");
  const pass = (ok: boolean): StructuralCheck => (ok ? "PASS" : "FAIL");
  const distinctiveComposition = pass(
    /pv-hero--split|PRODUCT_SPLIT_HERO|data-section-type="HERO"/.test(blob) &&
      /pv-product-frame|PRODUCT_UI_FRAME|data-visualization/.test(blob),
  );
  const professionalTypography = pass(
    /--pv-font-display|--pv-font-section|--pv-font-body|--pv-font-caption|--pv-font-eyebrow/.test(css),
  );
  const premiumSpacing = pass(/--pv-space-section|--pv-space-stack/.test(css) && /padding:\s*var\(--pv-space-section\)/.test(css));
  const ventureSpecificTokens = pass(/--pv-bg|--pv-accent|--pv-panel/.test(css) && /data-design-archetype/.test(blob));
  const intentionalHero = pass(/pv-hero--split|PRODUCT_SPLIT_HERO/.test(blob) && /pv-product-frame|data-visualization/.test(landing));
  const visualNecessityEvaluated = pass(/CreativeAssetPlan|visualNecessity|NO_EXTERNAL_IMAGE_REQUIRED|DETERMINISTIC_UI/.test(blob));
  const productVisualization = pass(/LEASE_OPTION_COMPARISON|NPV|pv-npv|data-visualization/.test(blob));
  const reusableSections = pass(/data-section-type/.test(landing) && /data-pattern-id/.test(landing) && /data-section-id/.test(landing));
  const mobileQuality = pass(/max-width:\s*640px/.test(css) && /max-width:\s*960px/.test(css) && /overflow-x:\s*hidden/.test(css));
  const accessibility = pass(
    /prefers-reduced-motion/.test(css) &&
      /<label/.test(blob) &&
      /focus-visible/.test(css) &&
      /alt=|aria-label|Illustrative sample/.test(blob),
  );
  const conversionClarity = pass(/Request Pilot Access/.test(blob) && /vg-cta--primary|pv-cta/.test(blob));
  const trustIntegrity = pass(/in validation|not generally available/i.test(blob) && !/trusted by \d+|customers already|as seen in/i.test(blob));
  const legalCompleteness = pass(grade.footer === "PASS" && grade.privacyDestination === "PASS" && grade.termsDestination === "PASS" && grade.sitemapDestination === "PASS");
  const performanceSanity = pass(!/gsap|three\.js|lottie-web|framer-motion/.test(blob));
  const notDefaultTemplate = pass(
    /pv-hero--split/.test(blob) &&
      /pv-workflow|BEFORE_AFTER|WORKFLOW_TRANSFORMATION/.test(blob) &&
      !(/vg-card-grid/.test(landing) && (landing.match(/vg-card-grid/g)?.length ?? 0) >= 3),
  );
  const copiedSourceDesigns = FORBIDDEN_COPIED_BRAND_HTML.test(blob) ? "YES" : "NO";
  const fakeCustomers = /customers already|trusted by [0-9]|[0-9]+,\d{3} customers/i.test(blob) ? "YES" : "NO";
  const fakeProductState = /fully operational|production dashboard is live|already shipping to customers/i.test(blob) ? "YES" : "NO";
  const premiumLooksBooleanPresent = /premium\s*=\s*true|looksPremium:\s*true/.test(blob) ? "YES" : "NO";
  const structuralPass =
    grade.validationGradeOverall === "PASS" &&
    distinctiveComposition === "PASS" &&
    professionalTypography === "PASS" &&
    premiumSpacing === "PASS" &&
    ventureSpecificTokens === "PASS" &&
    intentionalHero === "PASS" &&
    visualNecessityEvaluated === "PASS" &&
    productVisualization === "PASS" &&
    reusableSections === "PASS" &&
    mobileQuality === "PASS" &&
    accessibility === "PASS" &&
    conversionClarity === "PASS" &&
    trustIntegrity === "PASS" &&
    legalCompleteness === "PASS" &&
    performanceSanity === "PASS" &&
    notDefaultTemplate === "PASS" &&
    copiedSourceDesigns === "NO" &&
    fakeCustomers === "NO" &&
    fakeProductState === "NO" &&
    premiumLooksBooleanPresent === "NO";
  return {
    validationGrade: grade.validationGradeOverall,
    distinctiveComposition,
    professionalTypography,
    premiumSpacing,
    ventureSpecificTokens,
    intentionalHero,
    visualNecessityEvaluated,
    productVisualization,
    reusableSections,
    mobileQuality,
    accessibility,
    conversionClarity,
    trustIntegrity,
    legalCompleteness,
    performanceSanity,
    notDefaultTemplate,
    copiedSourceDesigns,
    fakeCustomers,
    fakeProductState,
    premiumLooksBooleanPresent,
    premiumOverall: structuralPass ? "PASS" : "FAIL",
    classification: structuralPass ? PREMIUM_VALIDATION_READY : grade.classification,
  };
}
