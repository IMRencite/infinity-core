import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ClubThrottleJournalTaxonomyArchive,
  clubThrottleJournalTaxonomyInventory,
  evaluateClubThrottleJournalTaxonomyGates,
} from "../club-throttle-journal-taxonomy";

describe("club throttle journal taxonomy archives", () => {
  it("etiquette tag renders filtered journal roll with sidebar and cards", () => {
    const html = renderToStaticMarkup(
      React.createElement(ClubThrottleJournalTaxonomyArchive, { kind: "tag", slug: "etiquette" }),
    );
    expect(html).toContain("data-blog-archive-roll");
    expect(html).toContain("onpv-blog-row");
    expect(html).toContain('data-blog-sidebar-shared="BlogSidebar"');
    expect(html).toContain('class="onpv-blog-sidebar"');
    expect(html).not.toContain('className="onpv-blog-sidebar"');
    expect(html).toContain("Group-ride etiquette");
    expect(html).toContain("Bike-night etiquette");
    expect(html).toContain("data-blog-roll-grid");
    const gates = evaluateClubThrottleJournalTaxonomyGates({ kind: "tag", label: "etiquette", html });
    expect(gates.BLOG_TAXONOMY_FILTER_QC.result).toBe("PASS");
    expect(gates.BLOG_TAXONOMY_CARD_PARITY_QC.result).toBe("PASS");
    expect(gates.BLOG_TAXONOMY_SIDEBAR_QC.result).toBe("PASS");
  });

  it("culture category includes only culture posts", () => {
    const html = renderToStaticMarkup(
      React.createElement(ClubThrottleJournalTaxonomyArchive, { kind: "category", slug: "culture" }),
    );
    expect(html).toContain("Garage culture");
    expect(html).toContain("Bike-night etiquette");
    const roll = html.split("data-blog-roll-grid")[1]?.split("data-blog-sidebar")[0] ?? "";
    expect(roll).not.toContain("How to ride after dark");
  });

  it("inventory lists all active tags and categories", () => {
    const inv = clubThrottleJournalTaxonomyInventory();
    expect(inv.tags.some((row) => row.slug === "etiquette" && row.count >= 2)).toBe(true);
    expect(inv.categories.length).toBeGreaterThanOrEqual(4);
  });
});
