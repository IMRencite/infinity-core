import { describe, expect, it } from "vitest";
import {
  blogTaxonomyArchiveCapabilityProfile,
  evaluateBlogComposeProductionParityQc,
  evaluateBlogTaxonomyHeaderSpacingQc,
  evaluateBlogTaxonomySidebarStaticHtmlQc,
  evaluateTaxonomyNegativeFixture,
  htmlHasBrokenSidebarClassNameAttribute,
} from "../blog-taxonomy-archive-qc";
import type { BlogShellLayoutProof } from "../blog-shell-layout-qc";

describe("blog taxonomy archive QC", () => {
  const healthyShell: BlogShellLayoutProof = {
    venture: "club-throttle",
    viewport: "desktop",
    viewport_width: 1440,
    container_width: 1100,
    main_width: 760,
    sidebar_width: 260,
    sidebar_display: "flex",
    sidebar_visible: true,
    sidebar_has_categories: true,
    sidebar_has_tags: true,
    sidebar_offscreen: false,
    sidebar_overlaps_main: false,
    unused_horizontal: 48,
    first_card_width: 720,
    first_card_text_width: 480,
    first_headline_line_count: 2,
    document_scroll_width: 1440,
    horizontal_overflow: false,
  };

  const healthyHeader = {
    nav_bottom_y: 80,
    breadcrumb_top: 96,
    breadcrumb_bottom: 120,
    hero_top: 136,
    hero_bottom: 320,
    roll_heading_top: 360,
  };

  it("detects className sidebar bug in production HTML", () => {
    const broken = `<aside className="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar"></aside>`;
    expect(htmlHasBrokenSidebarClassNameAttribute(broken)).toBe(true);
    expect(evaluateBlogTaxonomySidebarStaticHtmlQc(broken).result).toBe("FAIL");
  });

  it("negative fixture A: filtered cards, sidebar missing", () => {
    const html = `<div data-blog-archive-roll="true"><article data-blog-roll-card="true"></article></div>`;
    const result = evaluateTaxonomyNegativeFixture({ id: "A", html, expect_pass: false });
    expect(result.pass).toBe(true);
    expect(result.gates.some((g) => g.result === "FAIL")).toBe(true);
  });

  it("negative fixture B: sidebar marker but display none geometry", () => {
    const html = `<aside class="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar" data-blog-categories="true"></aside>`;
    const result = evaluateTaxonomyNegativeFixture({
      id: "B",
      html,
      shell_proof: { ...healthyShell, sidebar_visible: false, sidebar_display: "none", sidebar_width: 0 },
      expect_pass: false,
    });
    expect(result.pass).toBe(true);
  });

  it("negative fixture C: sidebar ok, collapsed header spacing", () => {
    const html = `<aside class="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar" data-blog-categories="true" data-blog-tag-cloud="true"></aside>`;
    const result = evaluateTaxonomyNegativeFixture({
      id: "C",
      html,
      shell_proof: healthyShell,
      header_proof: { ...healthyHeader, hero_bottom: 200, roll_heading_top: 205 },
      expect_pass: false,
    });
    expect(result.pass).toBe(true);
  });

  it("negative fixture D: preview full shell, production missing sidebar styling", () => {
    const composed = `export default function Page(){return <div data-blog-taxonomy-archive-shell="true" className="onpv-blog-sidebar" data-blog-index-layout="true"><aside className="onpv-blog-sidebar"/></div>;}`;
    const production = `<aside className="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar"></aside>`;
    const gate = evaluateBlogComposeProductionParityQc({ composed_page_source: composed, production_html: production });
    expect(gate.result).toBe("FAIL");
    const wrapped = evaluateTaxonomyNegativeFixture({
      id: "D",
      html: production,
      composed_source: composed,
      expect_pass: false,
    });
    expect(wrapped.pass).toBe(true);
  });

  it("negative fixture E: structurally complete archive passes", () => {
    const html = `
      <nav data-blog-breadcrumb="true"></nav>
      <section data-blog-taxonomy-archive-shell="true">
        <header data-blog-hero="true"></header>
        <div data-blog-index-layout="true" data-blog-archive-roll="true">
          <article class="onpv-blog-row" data-blog-roll-card="true"></article>
        </div>
        <aside class="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar" data-blog-categories="true" data-blog-tag-cloud="true"></aside>
      </section>`;
    const result = evaluateTaxonomyNegativeFixture({
      id: "E",
      html,
      shell_proof: healthyShell,
      header_proof: healthyHeader,
      expect_pass: true,
    });
    expect(result.gates.every((g) => g.result === "PASS")).toBe(true);
    expect(result.pass).toBe(true);
  });

  it("negative fixture F: Club Throttle complete shell passes QC", () => {
    const html = `
      <article data-blog-taxonomy-archive="true">
        <nav data-blog-breadcrumb="true"></nav>
        <section data-blog-taxonomy-archive-shell="true">
          <header data-blog-hero="true" data-blog-hero-treatment="editorial-panel"></header>
          <div data-blog-layout="editorial" data-blog-index-layout="true">
            <section data-blog-archive-roll="true"><div data-blog-roll-grid="true"><article class="onpv-blog-row" data-blog-roll-card="true"/></div></section>
            <aside class="onpv-blog-sidebar" data-blog-sidebar-shared="BlogSidebar" data-blog-categories="true" data-blog-tag-cloud="true" data-blog-popular-resources="true"></aside>
          </div>
        </section>
      </article>`;
    const profile = blogTaxonomyArchiveCapabilityProfile("club-throttle");
    expect(profile.sidebar_required_desktop).toBe(true);
    const result = evaluateTaxonomyNegativeFixture({
      id: "F",
      html,
      shell_proof: healthyShell,
      header_proof: healthyHeader,
      expect_pass: true,
    });
    expect(result.pass).toBe(true);
    expect(evaluateBlogTaxonomyHeaderSpacingQc(healthyHeader, 1440).result).toBe("PASS");
  });
});
