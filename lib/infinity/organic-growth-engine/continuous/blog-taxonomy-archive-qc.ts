import type { OrganicNamedGate } from "./types";
import {
  evaluateBlogGridBalanceQc,
  evaluateBlogSidebarRequirementQc,
  type BlogShellLayoutProof,
  type BlogShellVenture,
} from "./blog-shell-layout-qc";

export const BLOG_TAXONOMY_HEADER_SPACING_QC = "BlogTaxonomyHeaderSpacingQc" as const;
export const BLOG_TAXONOMY_SIDEBAR_QC = "BlogTaxonomySidebarQc" as const;
export const BLOG_TAXONOMY_GRID_BALANCE_QC = "BlogTaxonomyGridBalanceQc" as const;
export const BLOG_COMPOSE_PRODUCTION_PARITY_QC = "BlogComposeProductionParityQc" as const;
export const BLOG_TAXONOMY_ARCHIVE_REQUIREMENT_QC = "BlogTaxonomyArchiveRequirementQc" as const;

export type BlogTaxonomyArchiveCapabilityProfile = {
  enabled: boolean;
  breadcrumb_required: boolean;
  archive_header_required: boolean;
  filtered_roll_required: boolean;
  sidebar_required_desktop: boolean;
  discovery_required: boolean;
  responsive_required: boolean;
};

export type BlogTaxonomyVentureId = "club-throttle" | "occupancynpv";

export function blogTaxonomyArchiveCapabilityProfile(venture: BlogTaxonomyVentureId): BlogTaxonomyArchiveCapabilityProfile {
  return {
    enabled: true,
    breadcrumb_required: true,
    archive_header_required: true,
    filtered_roll_required: true,
    sidebar_required_desktop: true,
    discovery_required: true,
    responsive_required: true,
  };
}

export type TaxonomyHeaderSpacingProof = {
  nav_bottom_y: number;
  breadcrumb_top: number;
  breadcrumb_bottom: number;
  hero_top: number;
  hero_bottom: number;
  roll_heading_top: number;
};

function named(gate: string, reasons: string[]): OrganicNamedGate {
  return { gate, result: reasons.length ? "FAIL" : "PASS", reasons: [...new Set(reasons)] };
}

/** Invalid React `className` injected via innerHTML — browsers ignore it; sidebar/grid CSS never applies. */
export function htmlHasBrokenSidebarClassNameAttribute(html: string): boolean {
  return /className="onpv-blog-sidebar"/.test(html) || /className='onpv-blog-sidebar'/.test(html);
}

export function evaluateBlogTaxonomySidebarStaticHtmlQc(html: string): OrganicNamedGate {
  const reasons: string[] = [];
  if (!html.includes('data-blog-sidebar-shared="BlogSidebar"')) reasons.push("SIDEBAR_MARKER_MISSING");
  if (htmlHasBrokenSidebarClassNameAttribute(html)) reasons.push("SIDEBAR_CLASSNAME_IN_DOM_HTML");
  if (!html.includes("onpv-blog-sidebar") && !html.includes('class="onpv-blog-sidebar"')) {
    if (!html.includes('className="onpv-blog-sidebar"')) reasons.push("SIDEBAR_SHELL_CLASS_MISSING");
  }
  return named(BLOG_TAXONOMY_SIDEBAR_QC, reasons);
}

export function evaluateBlogTaxonomyHeaderSpacingQc(
  proof: TaxonomyHeaderSpacingProof,
  viewportWidth: number,
): OrganicNamedGate {
  const reasons: string[] = [];
  if (viewportWidth < 1024) return named(BLOG_TAXONOMY_HEADER_SPACING_QC, reasons);

  const nav_to_archive_gap = proof.breadcrumb_top - proof.nav_bottom_y;
  const breadcrumb_to_header_gap = proof.hero_top - proof.breadcrumb_bottom;
  const header_internal_padding_top = proof.hero_top > 0 ? proof.hero_top : 0;
  const header_to_roll_gap = proof.roll_heading_top - proof.hero_bottom;

  if (proof.nav_bottom_y > 0 && proof.breadcrumb_top > 0 && proof.nav_bottom_y <= proof.breadcrumb_top && nav_to_archive_gap < 8) {
    reasons.push("ARCHIVE_TOUCHES_NAV");
  }
  if (proof.breadcrumb_bottom > 0 && proof.hero_top > 0 && breadcrumb_to_header_gap < 4) {
    reasons.push("BREADCRUMB_CRUSHED_INTO_HERO");
  }
  if (proof.hero_bottom > 0 && proof.roll_heading_top > 0 && header_to_roll_gap < 12) {
    reasons.push("HERO_TO_ROLL_NO_SEPARATION");
  }
  if (proof.hero_bottom > 0 && proof.roll_heading_top > 0 && header_to_roll_gap > 220) {
    reasons.push("UNEXPLAINED_DEAD_GAP_BEFORE_ROLL");
  }
  if (proof.hero_top > 0 && proof.hero_bottom > proof.hero_top && proof.hero_bottom - proof.hero_top < 48) {
    reasons.push("HERO_INTERNAL_HEIGHT_COLLAPSED");
  }
  if (header_internal_padding_top < 0) reasons.push("NEGATIVE_HEADER_GEOMETRY");

  return named(BLOG_TAXONOMY_HEADER_SPACING_QC, reasons);
}

export function evaluateBlogTaxonomyGridBalanceFromShellProof(proof: BlogShellLayoutProof): OrganicNamedGate {
  return evaluateBlogGridBalanceQc(proof);
}

export function evaluateBlogTaxonomySidebarFromShellProof(proof: BlogShellLayoutProof): OrganicNamedGate {
  return evaluateBlogSidebarRequirementQc(proof);
}

export type ComposeParityInput = {
  composed_page_source: string;
  production_html?: string;
};

export function evaluateBlogComposeProductionParityQc(input: ComposeParityInput): OrganicNamedGate {
  const reasons: string[] = [];
  const src = input.composed_page_source;
  if (src.includes("dangerouslySetInnerHTML") && /SIDEBAR_HTML|sidebarHtml/i.test(src)) {
    reasons.push("COMPOSE_USES_SIDEBAR_INNERHTML");
  }
  if (!src.includes("onpv-blog-sidebar")) reasons.push("COMPOSE_SIDEBAR_SHELL_MISSING");
  if (!src.includes("data-blog-taxonomy-archive-shell")) reasons.push("COMPOSE_ARCHIVE_SHELL_MARKER_MISSING");
  if (!src.includes("data-blog-index-layout")) reasons.push("COMPOSE_INDEX_LAYOUT_MARKER_MISSING");

  if (input.production_html) {
    const prod = input.production_html;
    if (htmlHasBrokenSidebarClassNameAttribute(prod)) reasons.push("PRODUCTION_SIDEBAR_CLASSNAME_BUG");
    if (prod.includes('data-blog-sidebar-shared="BlogSidebar"') && !prod.includes('class="onpv-blog-sidebar"')) {
      if (htmlHasBrokenSidebarClassNameAttribute(prod)) reasons.push("PRODUCTION_SIDEBAR_NOT_STYLED");
    }
    for (const marker of [
      "data-blog-taxonomy-archive",
      "data-blog-archive-roll",
      "data-blog-index-layout",
      "data-blog-hero",
    ]) {
      if (src.includes(marker) && !prod.includes(marker)) reasons.push(`PRODUCTION_MISSING_${marker.toUpperCase()}`);
    }
  }
  return named(BLOG_COMPOSE_PRODUCTION_PARITY_QC, reasons);
}

export function evaluateBlogTaxonomyArchiveRequirementQc(input: {
  html: string;
  profile: BlogTaxonomyArchiveCapabilityProfile;
}): OrganicNamedGate {
  const reasons: string[] = [];
  const { html, profile } = input;
  if (profile.breadcrumb_required && !html.includes("data-blog-breadcrumb")) reasons.push("BREADCRUMB_MISSING");
  if (profile.archive_header_required && !html.includes("data-blog-hero")) reasons.push("ARCHIVE_HEADER_MISSING");
  if (profile.filtered_roll_required && !html.includes("data-blog-archive-roll")) reasons.push("FILTERED_ROLL_MISSING");
  if (profile.discovery_required && !html.includes("data-blog-categories")) reasons.push("DISCOVERY_CATEGORIES_MISSING");
  if (profile.sidebar_required_desktop) {
    const sidebarStatic = evaluateBlogTaxonomySidebarStaticHtmlQc(html);
    if (sidebarStatic.result === "FAIL") reasons.push(...(sidebarStatic.reasons ?? []));
  }
  return named(BLOG_TAXONOMY_ARCHIVE_REQUIREMENT_QC, reasons);
}

/** Negative fixtures — QC must fail known false-positive patterns. */
export type TaxonomyNegativeFixture = {
  id: "A" | "B" | "C" | "D" | "E" | "F";
  html: string;
  composed_source?: string;
  shell_proof?: BlogShellLayoutProof;
  header_proof?: TaxonomyHeaderSpacingProof;
  viewport_width?: number;
  expect_pass: boolean;
};

export function evaluateTaxonomyNegativeFixture(fixture: TaxonomyNegativeFixture): {
  pass: boolean;
  gates: OrganicNamedGate[];
} {
  const profile = blogTaxonomyArchiveCapabilityProfile("club-throttle");
  const gates: OrganicNamedGate[] = [
    evaluateBlogTaxonomyArchiveRequirementQc({ html: fixture.html, profile }),
    evaluateBlogTaxonomySidebarStaticHtmlQc(fixture.html),
  ];
  if (fixture.composed_source) {
    gates.push(
      evaluateBlogComposeProductionParityQc({
        composed_page_source: fixture.composed_source,
        production_html: fixture.html,
      }),
    );
  }
  if (fixture.shell_proof) {
    gates.push(evaluateBlogTaxonomySidebarFromShellProof(fixture.shell_proof));
    gates.push(evaluateBlogTaxonomyGridBalanceFromShellProof(fixture.shell_proof));
  }
  if (fixture.header_proof) {
    gates.push(evaluateBlogTaxonomyHeaderSpacingQc(fixture.header_proof, fixture.viewport_width ?? 1440));
  }
  const qcWouldPass = gates.every((g) => g.result === "PASS");
  const pass = qcWouldPass === fixture.expect_pass;
  return { pass, gates };
}

export function ventureToShellVenture(venture: BlogTaxonomyVentureId): BlogShellVenture {
  return venture;
}
