import { describe, expect, it } from "vitest";
import {
  adaptAuthorityContentWidthProfile,
  defaultAuthorityContentWidthProfile,
  evaluateAuthoritySectionWidth,
  evaluateSemanticNavigationBreakoutLayout,
  evaluateBalancedCardGrid,
  evaluateAuthoritySourceRenderedQuality,
  evaluateAuthoritySectionShellConsistency,
  evaluateCrossRouteWidthConsistency,
  FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
  FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE,
  FOUNDER_NARROW_CARD_WRAP_FIXTURE,
  GOOD_PROSE_PLUS_BREAKOUT_FIXTURE,
  GOOD_FOUR_CARD_BREAKOUT_GRID,
  GOOD_SOURCE_SECTION_FIXTURE,
} from "../public-authority-standard/authority-content-width";
import { evaluateCardTextRhythm, estimateLineCount } from "../public-authority-standard/card-text-rhythm";
import { evaluateCrossRouteConsistency, evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { evaluateRenderedCompositionQuality } from "../visual-quality-gates";
import { CRE_PUBLIC_AUTHORITY_REFERENCE } from "../public-authority-standard/cre-reference";

describe("Authority width and breakout QC primitives", () => {
  it("defines a typed width profile that ventures may adapt", () => {
    const base = defaultAuthorityContentWidthProfile();
    expect(base.model).toBe("AuthorityContentWidthProfile");
    expect(base.proseMaxWidth).toBeLessThan(base.authoritySectionMaxWidth);
    expect(base.breakoutEligibility).toContain("semantic_navigation");
    const adapted = adaptAuthorityContentWidthProfile({ authoritySectionMaxWidth: 1180, proseMaxWidth: 840 });
    expect(adapted.authoritySectionMaxWidth).toBe(1180);
    expect(adapted.proseMaxWidth).toBe(840);
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile.authoritySectionMaxWidth).toBe(1120);
    expect(CRE_PUBLIC_AUTHORITY_REFERENCE.widthProfile.proseMaxWidth).toBe(832);
  });

  it("fails the founder skinny authority-shell screenshot regression", () => {
    const gate = evaluateAuthoritySectionWidth(FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.modulesTrappedInProse).toBe(true);
    expect(gate.failures).toContain("authority_shell_underuses_viewport");
    expect(gate.failures).toContain("wide_modules_trapped_in_prose_column");
  });

  it("fails the founder 3+1 four-card grid", () => {
    const gate = evaluateBalancedCardGrid(FOUNDER_THREE_PLUS_ONE_NAV_FIXTURE);
    expect(gate.overall).toBe("FAIL");
    expect(gate.loneLastCard).toBe(true);
    expect(gate.failures).toContain("four_card_three_plus_one");
  });

  it("fails narrow desktop cards with 5-7 line title wraps", () => {
    const breakout = evaluateSemanticNavigationBreakoutLayout(FOUNDER_NARROW_CARD_WRAP_FIXTURE);
    expect(breakout.overall).toBe("FAIL");
    expect(breakout.failures).toContain("semantic_nav_trapped_in_prose");
    expect(breakout.failures).toContain("desktop_title_wraps_like_mobile_tile");
    const title = "How does discount-rate sensitivity change a ranking";
    expect(estimateLineCount(title, 12)).toBeGreaterThanOrEqual(5);
    expect(
      evaluateCardTextRhythm({
        titles: [title],
        titleLineCounts: [7],
        css: "text-wrap: balance",
        lastLineWordCounts: [2],
      }).overall,
    ).toBe("FAIL");
  });

  it("passes prose-vs-wide-module separation and a balanced 2x2 four-card grid", () => {
    expect(evaluateAuthoritySectionWidth(GOOD_PROSE_PLUS_BREAKOUT_FIXTURE).overall).toBe("PASS");
    expect(evaluateBalancedCardGrid(GOOD_FOUR_CARD_BREAKOUT_GRID).overall).toBe("PASS");
    expect(evaluateBalancedCardGrid(GOOD_FOUR_CARD_BREAKOUT_GRID).layout).toBe("2x2");
    expect(
      evaluateSemanticNavigationBreakoutLayout({
        viewportWidth: 1440,
        navWidth: 1120,
        proseWidth: 832,
        cardWidths: [536, 536, 536, 536],
        titleLineCounts: [2, 2, 2, 2],
        iconContainerPx: 50,
        css: "--pv-authority-shell: 70rem; .pv-wide-module { width: 100%; }",
      }).overall,
    ).toBe("PASS");
    expect(evaluateAuthoritySourceRenderedQuality(GOOD_SOURCE_SECTION_FIXTURE).overall).toBe("PASS");
    expect(
      evaluateAuthoritySectionShellConsistency({
        proseWidth: 832,
        moduleWidths: [1120, 1120, 1120],
        shellWidth: 1120,
      }).overall,
    ).toBe("PASS");
  });

  it("balances five-card and six-card grids and rejects 4+1", () => {
    expect(
      evaluateBalancedCardGrid({
        cardCount: 5,
        columnCount: 3,
        rowCount: 2,
        lastRowCount: 2,
        cardWidths: [360, 360, 360, 540, 540],
        cardHeights: [170, 170, 170, 170, 170],
        viewportWidth: 1440,
      }).layout,
    ).toBe("3+2");
    expect(
      evaluateBalancedCardGrid({
        cardCount: 5,
        columnCount: 4,
        rowCount: 2,
        lastRowCount: 1,
        cardWidths: [260, 260, 260, 260, 260],
        cardHeights: [180, 180, 180, 180, 180],
        viewportWidth: 1440,
      }).failures,
    ).toContain("five_card_four_plus_one");
    expect(
      evaluateBalancedCardGrid({
        cardCount: 6,
        columnCount: 3,
        rowCount: 2,
        lastRowCount: 3,
        cardWidths: [360, 360, 360, 360, 360, 360],
        cardHeights: [168, 168, 168, 168, 168, 168],
        viewportWidth: 1440,
      }).layout,
    ).toBe("3x2");
  });

  it("does not force legal pages into breakout modules", () => {
    expect(
      evaluateAuthoritySectionWidth({
        ...FOUNDER_SKINNY_AUTHORITY_SHELL_FIXTURE,
        archetype: "LEGAL",
        semanticNavWidth: 0,
        trustedSourcesWidth: 0,
        tableWidth: 0,
        ctaWidth: 0,
      }).overall,
    ).toBe("PASS");
  });

  it("extends cross-route consistency to width behavior without breaking signature checks", () => {
    expect(evaluateCrossRouteConsistency({ routeSignatures: ["gutter:40", "gutter:40"] })).toBe("PASS");
    expect(
      evaluateCrossRouteConsistency({
        widthBehaviors: [
          { archetype: "QUESTION_AUTHORITY", shellUtilization: 0.78, proseInRange: true, modulesBreakOut: true },
          { archetype: "TOPIC_HUB", shellUtilization: 0.8, proseInRange: true, modulesBreakOut: true },
        ],
      }),
    ).toBe("PASS");
    expect(
      evaluateCrossRouteWidthConsistency([
        { archetype: "QUESTION_AUTHORITY", shellUtilization: 0.51, proseInRange: false, modulesBreakOut: false },
        { archetype: "TOPIC_HUB", shellUtilization: 0.52, proseInRange: false, modulesBreakOut: false },
      ]),
    ).toBe("FAIL");
  });

  it("integrates the new width gates into PublicAuthorityPublishabilityGate", () => {
    for (const gate of [
      "AuthoritySectionWidthGate",
      "SemanticNavigationBreakoutLayoutGate",
      "BalancedCardGridGate",
      "AuthoritySourceRenderedQualityGate",
      "AuthoritySectionShellConsistencyGate",
    ]) {
      expect(HARD_PUBLISHABILITY_GATES).toContain(gate);
    }
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(HARD_PUBLISHABILITY_GATES.map((gate) => [gate, "PASS" as const])),
      }).ready,
    ).toBe("PREMIUM_AUTHORITY_VALIDATION_READY");
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(
          HARD_PUBLISHABILITY_GATES.map((gate) => [gate, gate === "AuthoritySectionWidthGate" ? ("FAIL" as const) : ("PASS" as const)]),
        ),
      }).ready,
    ).toBe("NOT_READY");
  });

  it("hardens rendered composition when a 3+1 grid or trapped nav is supplied", () => {
    const html = `<header className="pv-hero"><img src="/media/hero.webp" alt="Editorial room." /><img src="/media/viz-cash-flow.svg" alt="Teaching diagram." /></header><div className="pv-analysis-board"><div className="pv-table-shell" data-visualization="true"><table className="pv-fin-table"><caption>Sample</caption><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><th>One</th><td>Two</td></tr></tbody></table></div></div><aside className="pv-callout">Note</aside><ul><li>One</li></ul>`;
    const css = ".vg-legal-footer, footer[data-infinity-footer] { margin: 0 40px 40px; padding: 2.5rem 24px; } @media (max-width: 640px) { .vg-legal-footer, footer[data-infinity-footer] { margin: 0 20px 24px; } }";
    expect(evaluateRenderedCompositionQuality({ html, css }).table.overall).toBe("PASS");
    expect(
      evaluateRenderedCompositionQuality({
        html,
        css,
        widthHierarchy: {
          viewportWidth: 1440,
          authorityShellWidth: 736,
          proseWidth: 736,
          semanticNavWidth: 708,
          trustedSourcesWidth: 708,
        },
        cardGrid: { cardCount: 4, columnCount: 3, rowCount: 2, lastRowCount: 1, cardWidths: [220, 220, 220, 220], cardHeights: [200, 200, 200, 160] },
      }).overall,
    ).toBe("FAIL");
  });

  it("rejects source presence-only as a pass when the section stays cramped", () => {
    expect(
      evaluateAuthoritySourceRenderedQuality({
        sectionWidth: 708,
        shellWidth: 1120,
        desktopColumns: 1,
        viewportWidth: 1440,
        hasTitle: true,
        hasHierarchy: false,
        linkCount: 4,
        cramped: true,
      }).overall,
    ).toBe("FAIL");
  });
});
