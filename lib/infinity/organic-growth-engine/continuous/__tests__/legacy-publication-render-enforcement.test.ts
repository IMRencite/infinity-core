import { describe, expect, it } from "vitest";
import { goodResponsiveBrowserEvidence } from "../fixtures/render-browser-evidence-fixtures";
import { evaluateInfinityBlogPublicationGateVNext } from "../infinity-blog-publication-gate-vnext";
import { evaluateVentureContentPublicationDecision } from "../venture-content-publication-decision";
import { CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER, CLUB_THROTTLE_SHIRT_SEARCH_DEMAND } from "../search-demand-evidence";
import { clubThrottleJournalDrafts } from "../club-throttle-journal";
import { OCCUPANCYNPV_BLOG_EDITORIAL_CSS } from "../blog-ux";

const SHELL = `<header data-blog-article-hero="true"><figure data-visual-role="FEATURED_EDITORIAL_IMAGE"><img src="/x.webp" alt="Hero" width="1600" height="900"/></figure></header>`;
const MAIN = `<h2>Section</h2><p>First paragraph with enough words to read as editorial body copy.</p><p>Second paragraph continues the thought without a giant gap.</p>`;

describe("LEGACY_PUBLICATION_RENDER_ENFORCEMENT_QC", () => {
  it("fails closed without mandatory browser evidence", () => {
    const draft = clubThrottleJournalDrafts()[0]!;
    const decision = evaluateVentureContentPublicationDecision({
      draft,
      demand: CLUB_THROTTLE_SHIRT_SEARCH_DEMAND,
      cluster: CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER,
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
    });
    expect(decision.rendered_visual?.result).toBe("FAIL");
    expect(decision.rendered_visual?.reasons).toContain("BROWSER_GEOMETRY_REQUIRED_BUT_MISSING");

    const vnext = evaluateInfinityBlogPublicationGateVNext({
      draft,
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
    });
    expect(vnext.dimensions.RENDERED_ARTICLE_VISUAL_QC).toBe("FAIL");
  });

  it("passes publication render stack with responsive browser evidence", () => {
    const draft = clubThrottleJournalDrafts()[0]!;
    const browser = goodResponsiveBrowserEvidence();
    const decision = evaluateVentureContentPublicationDecision({
      draft,
      demand: CLUB_THROTTLE_SHIRT_SEARCH_DEMAND,
      cluster: CLUB_THROTTLE_SHIRT_QUESTION_CLUSTER,
      shell_html: SHELL,
      main_html: MAIN,
      editorial_css: OCCUPANCYNPV_BLOG_EDITORIAL_CSS,
      browser_responsive_evidence: browser,
    });
    expect(decision.rendered_visual?.result).toBe("PASS");
  });
});
