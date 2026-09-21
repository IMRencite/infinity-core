import { evaluateVentureFaviconGate, VENTURE_FAVICON_GATE } from "@/lib/infinity/universal-venture-system-qc/favicon";
import { evaluateApplicationMetadataIdentityGate } from "./metadata-gate";
import type { VentureFaviconFile, VentureFaviconLiveEvidence } from "@/lib/infinity/universal-venture-system-qc/favicon";
import {
  BRAND_IDENTITY_DISCOVERABILITY_GATE,
  VENTURE_BRAND_COMPLETENESS_GATE,
  VENTURE_BRAND_CONSISTENCY_GATE,
  VENTURE_BRAND_IDENTITY_CONTRACT,
  VENTURE_LOGO_GATE,
  type NamedBrandGate,
  type VentureBrandIdentityContract,
} from "./contract";

const GENERIC_BRAND = /lease npv comparison|create next app|acme|untitled venture|your (?:product|brand|logo)|lorem ipsum|framework default/i;
const FRAMEWORK_ICON = /(?:^|[/"'\s])(?:next|vercel)\.svg|create next app/i;
const PLACEHOLDER_TEXT_ONLY = /Lease NPV comparison/;

export type BrandSurfaceEvidence = {
  files: Array<{ path: string; content: string; encoding?: "utf8" | "base64" }>;
  publicHeaderHtml?: string | null;
  appHeaderHtml?: string | null;
  loginHtml?: string | null;
  metadataTitle?: string | null;
  metadataDescription?: string | null;
  live?: VentureFaviconLiveEvidence | null;
  founder_observes_generic?: boolean;
  founder_observes_missing_logo?: boolean;
  founder_observes_wrong_icon?: boolean;
};

function blob(files: BrandSurfaceEvidence["files"]): string {
  return files
    .filter((file) => file.encoding !== "base64")
    .map((file) => file.content)
    .join("\n");
}

function pathOf(file: { path: string }): string {
  return file.path.replace(/\\/g, "/");
}

function hasRenderedLogo(html: string | null | undefined): boolean {
  if (!html) return false;
  return /data-venture-logo=/.test(html) && /<svg[\s\S]*circle[\s\S]*<\/svg>/.test(html);
}

function hasVentureWordmark(html: string | null | undefined, name: string): boolean {
  if (!html) return false;
  return html.includes(name) && /data-venture-wordmark=/.test(html);
}

export function evaluateVentureLogoGate(input: {
  identity: VentureBrandIdentityContract;
  evidence: BrandSurfaceEvidence;
}): NamedBrandGate {
  const reasons: string[] = [];
  const html = [
    input.evidence.publicHeaderHtml,
    input.evidence.appHeaderHtml,
    input.evidence.loginHtml,
    blob(input.evidence.files.filter((file) => /site-chrome|layout\.tsx|login/.test(pathOf(file)))),
  ].join("\n");
  if (!input.identity.logo_asset || !input.identity.logo_mark_asset) reasons.push("LOGO_ASSET_MISSING");
  if (input.identity.logo_type === "WORDMARK_ONLY" && !input.identity.logo_mark_asset) {
    reasons.push("TEXT_ONLY_LOGO_INCOMPLETE");
  }
  if (!hasRenderedLogo(html)) reasons.push("LOGO_NOT_RENDERED");
  if (!hasVentureWordmark(html, input.identity.brand_name) && input.identity.logo_type !== "SYMBOL_MARK") {
    reasons.push("WORDMARK_NOT_RENDERED");
  }
  if (PLACEHOLDER_TEXT_ONLY.test(html) && !hasRenderedLogo(html)) reasons.push("TEXT_ONLY_PLACEHOLDER_BRAND");
  if (GENERIC_BRAND.test(input.identity.logo_asset) || input.evidence.founder_observes_generic) {
    reasons.push("GENERIC_LOGO");
  }
  if (FRAMEWORK_ICON.test(html)) reasons.push("FRAMEWORK_PLACEHOLDER_LOGO");
  if (input.evidence.founder_observes_missing_logo) reasons.push("FOUNDER_PHYSICAL_LOGO_MISSING");
  if (!/#1d4e78|#ffffff/.test(input.identity.logo_mark_asset) && input.identity.venture_name === "OccupancyNPV") {
    reasons.push("LOGO_CONTRAST_OR_COLOR_MISSING");
  }
  if (!/<svg[\s\S]*<\/svg>/.test(input.identity.logo_mark_asset)) reasons.push("LOGO_FILE_INVALID");
  return { gate: VENTURE_LOGO_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureBrandConsistencyGate(input: {
  identity: VentureBrandIdentityContract;
  evidence: BrandSurfaceEvidence;
}): NamedBrandGate {
  const reasons: string[] = [];
  const publicHtml = input.evidence.publicHeaderHtml ?? "";
  const appHtml = input.evidence.appHeaderHtml ?? "";
  const metaTitle = input.evidence.metadataTitle ?? "";
  const files = blob(input.evidence.files);
  if (publicHtml && !publicHtml.includes(input.identity.brand_name)) reasons.push("PUBLIC_HEADER_NAME_MISMATCH");
  if (appHtml && !appHtml.includes(input.identity.brand_name)) reasons.push("APP_HEADER_NAME_MISMATCH");
  if (metaTitle && !metaTitle.includes(input.identity.brand_name) && !metaTitle.includes(input.identity.venture_name)) {
    reasons.push("METADATA_NAME_MISMATCH");
  }
  if (publicHtml && appHtml && hasRenderedLogo(publicHtml) !== hasRenderedLogo(appHtml)) {
    reasons.push("PUBLIC_APP_IDENTITY_SPLIT");
  }
  if (input.identity.favicon_asset && !/favicon|icon/.test(input.identity.favicon_asset)) {
    reasons.push("FAVICON_UNRELATED_TO_IDENTITY");
  }
  if (FRAMEWORK_ICON.test(files) || FRAMEWORK_ICON.test(metaTitle)) reasons.push("GENERIC_PLACEHOLDER_BRANDING");
  if (input.identity.primary_color !== input.identity.accent_color && input.identity.venture_name === "OccupancyNPV") {
    // OccupancyNPV may use navy for both; not a fail. reserved.
  }
  if (!input.identity.logo_mark_asset.includes(input.identity.primary_color.replace("#", "")) && !input.identity.logo_mark_asset.includes(input.identity.primary_color)) {
    reasons.push("LOGO_COLOR_INCONSISTENT");
  }
  return { gate: VENTURE_BRAND_CONSISTENCY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateVentureBrandCompletenessGate(input: {
  identity: VentureBrandIdentityContract;
  logo: NamedBrandGate;
  favicon: { result: "PASS" | "FAIL" };
  consistency: NamedBrandGate;
  discoverability: NamedBrandGate;
}): NamedBrandGate {
  const reasons: string[] = [];
  if (!input.identity.venture_name) reasons.push("VENTURE_NAME_MISSING");
  if (input.logo.result !== "PASS") reasons.push("LOGO_MARK_MISSING");
  if (input.favicon.result !== "PASS") reasons.push("FAVICON_MISSING");
  if (input.consistency.result !== "PASS") reasons.push("VISUAL_IDENTITY_INCONSISTENT");
  if (input.discoverability.result !== "PASS") reasons.push("METADATA_IDENTITY_MISSING");
  if (input.identity.contract !== VENTURE_BRAND_IDENTITY_CONTRACT) reasons.push("BRAND_CONTRACT_MISSING");
  return { gate: VENTURE_BRAND_COMPLETENESS_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluateBrandIdentityDiscoverabilityGate(input: {
  identity: VentureBrandIdentityContract;
  evidence: BrandSurfaceEvidence;
}): NamedBrandGate {
  const reasons: string[] = [];
  const header = input.evidence.publicHeaderHtml ?? blob(input.evidence.files.filter((file) => /site-chrome/.test(pathOf(file))));
  const app = input.evidence.appHeaderHtml ?? blob(input.evidence.files.filter((file) => /occupancynpv\/app\/layout/.test(pathOf(file))));
  const prominent = hasRenderedLogo(header) && hasVentureWordmark(header, input.identity.brand_name);
  const appProminent = !app || (hasRenderedLogo(app) && hasVentureWordmark(app, input.identity.brand_name));
  if (!prominent) reasons.push("HEADER_DESCRIPTOR_ONLY");
  if (!appProminent) reasons.push("APP_IDENTITY_NOT_PROMINENT");
  if (PLACEHOLDER_TEXT_ONLY.test(header) && !hasRenderedLogo(header)) reasons.push("GENERIC_DESCRIPTOR_NOT_BRAND");
  return { gate: BRAND_IDENTITY_DISCOVERABILITY_GATE, result: reasons.length === 0 ? "PASS" : "FAIL", reasons };
}

export function evaluatePublicVentureBrandBundle(input: {
  identity: VentureBrandIdentityContract;
  evidence: BrandSurfaceEvidence;
}): {
  contract: VentureBrandIdentityContract;
  logo: NamedBrandGate;
  favicon: ReturnType<typeof evaluateVentureFaviconGate>;
  consistency: NamedBrandGate;
  discoverability: NamedBrandGate;
  completeness: NamedBrandGate;
  metadata: NamedBrandGate;
  full_pass_allowed: boolean;
} {
  const logo = evaluateVentureLogoGate(input);
  const favicon = evaluateVentureFaviconGate({
    venture_id: input.identity.venture_id,
    files: input.evidence.files as VentureFaviconFile[],
    live: input.evidence.live,
    founder_observes_framework_default: input.evidence.founder_observes_wrong_icon,
  });
  const consistency = evaluateVentureBrandConsistencyGate(input);
  const discoverability = evaluateBrandIdentityDiscoverabilityGate(input);
  const completeness = evaluateVentureBrandCompletenessGate({
    identity: input.identity,
    logo,
    favicon,
    consistency,
    discoverability,
  });
  const metadata = evaluateApplicationMetadataIdentityGate({
    application_id: input.identity.venture_id,
    canonical_name: input.identity.brand_name,
    metadata_title: input.evidence.metadataTitle ?? input.identity.metadata_title,
    metadata_description: input.evidence.metadataDescription ?? input.identity.metadata_description,
    files: input.evidence.files,
    live_title: input.evidence.metadataTitle,
    live_html: [
      input.evidence.publicHeaderHtml,
      input.evidence.appHeaderHtml,
      input.evidence.loginHtml,
    ].filter(Boolean).join("\n"),
    favicon_http: input.evidence.live?.favicon_http,
    founder_observes_framework_default: input.evidence.founder_observes_wrong_icon,
  });
  return {
    contract: input.identity,
    logo,
    favicon,
    consistency,
    discoverability,
    completeness,
    metadata,
    full_pass_allowed:
      logo.result === "PASS"
      && favicon.result === "PASS"
      && consistency.result === "PASS"
      && completeness.result === "PASS"
      && discoverability.result === "PASS"
      && metadata.result === "PASS",
  };
}

export function missingBrandBlocksFullProductionPass(bundle: { full_pass_allowed: boolean }): boolean {
  return !bundle.full_pass_allowed;
}

export { VENTURE_FAVICON_GATE };
