import { describe, expect, it } from "vitest";
import { evaluateSectionSurfaceContrast } from "../public-authority-standard/section-surface-system";
import {
  evaluateRenderedTextContrastGate,
  evaluateRenderedHeadingInkGate,
  FOUNDER_EMPHASIS_LEAK_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE,
  FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE,
  FOUNDER_TRUSTED_SOURCES_COMPUTED_SAMPLE,
} from "../public-authority-standard/rendered-text-contrast-gate";
import {
  evaluateHumanFirstPublicLanguageGate,
  HUMAN_FIRST_BAD_FIXTURES,
  HUMAN_FIRST_GOOD_FIXTURE,
} from "../human-first-public-language-gate";
import { evaluateHumanReadabilityGate } from "../human-readability-gate";
import {
  HUMAN_FIRST_LANGUAGE_CANONICAL_PRINCIPLE,
  HUMAN_FIRST_PUBLIC_LANGUAGE_GATE,
  RENDERED_CONTRAST_CANONICAL_PRINCIPLE,
  RENDERED_HEADING_INK_GATE,
  RENDERED_TEXT_CONTRAST_GATE,
} from "../constants";
import { HARD_PUBLISHABILITY_GATES } from "../public-authority-standard/constants";
import { evaluatePublicAuthorityPublishability } from "../public-authority-standard/publishability";

describe("RenderedTextContrastGate and HumanFirstPublicLanguageGate", () => {
  it("locks gate names into the global publishability standard", () => {
    expect(RENDERED_TEXT_CONTRAST_GATE).toBe("RenderedTextContrastGate");
    expect(RENDERED_HEADING_INK_GATE).toBe("RenderedHeadingInkGate");
    expect(HUMAN_FIRST_PUBLIC_LANGUAGE_GATE).toBe("HumanFirstPublicLanguageGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedTextContrastGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("RenderedHeadingInkGate");
    expect(HARD_PUBLISHABILITY_GATES).toContain("HumanFirstPublicLanguageGate");
    expect(RENDERED_CONTRAST_CANONICAL_PRINCIPLE).toMatch(/token existing does not prove rendered readability/i);
    expect(HUMAN_FIRST_LANGUAGE_CANONICAL_PRINCIPLE).toMatch(/Simple language is not automatically human-first/i);
    expect(
      evaluatePublicAuthorityPublishability({
        gateResults: Object.fromEntries(
          HARD_PUBLISHABILITY_GATES.map((gate) => [
            gate,
            gate === "HumanFirstPublicLanguageGate" ? ("FAIL" as const) : ("PASS" as const),
          ]),
        ),
      }).ready,
    ).toBe("NOT_READY");
  });

  it("fails the founder EMPHASIS leak fixture while the old token-only gate still passes", () => {
    const tokenOnly = evaluateSectionSurfaceContrast({
      variants: ["EMPHASIS", "TINTED"],
      textOnEmphasisLight: true,
      cardsDistinctOnTinted: true,
      linksReadable: true,
    });
    const rendered = evaluateRenderedTextContrastGate(FOUNDER_EMPHASIS_LEAK_FIXTURE);
    const headings = evaluateRenderedHeadingInkGate(FOUNDER_EMPHASIS_LEAK_FIXTURE);
    expect(tokenOnly.overall).toBe("PASS");
    expect(rendered.overall).toBe("FAIL");
    expect(headings.overall).toBe("FAIL");
    expect(rendered.unscopedEmphasisLeaks).toBe(1);
    expect(rendered.nestedLightWithoutInkReset).toBe(1);
    expect(rendered.paleTitlesOnLight).toBeGreaterThan(0);
    expect(rendered.goDeeperTitle).toBe("FAIL");
    expect(rendered.cardTitles).toBe("FAIL");
    expect(rendered.trustedSources).toBe("FAIL");
  });

  it("fails founder Trusted Sources white-on-white even when the token-only gate passes", () => {
    const tokenOnly = evaluateSectionSurfaceContrast({
      variants: ["EMPHASIS"],
      textOnEmphasisLight: true,
      cardsDistinctOnTinted: true,
      linksReadable: true,
    });
    const rendered = evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE);
    expect(tokenOnly.overall).toBe("PASS");
    expect(rendered.overall).toBe("FAIL");
    expect(rendered.trustedSources).toBe("FAIL");
    expect(rendered.paleTitlesOnLight).toBeGreaterThan(0);
    expect(
      evaluateRenderedTextContrastGate({
        ...FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE,
        samples: [FOUNDER_TRUSTED_SOURCES_COMPUTED_SAMPLE],
      }).overall,
    ).toBe("FAIL");
    expect(
      evaluateRenderedTextContrastGate({
        ...FOUNDER_TRUSTED_SOURCES_WHITE_ON_WHITE_FIXTURE,
        samples: [
          {
            role: "cta_title",
            surfaceRole: "EMPHASIS",
            componentRole: "cta_title",
            color: "rgb(247, 251, 255)",
            background: "rgb(18, 58, 92)",
            contrast: 10.9,
            luminance: 0.93,
          },
        ],
      }).trustedSources,
    ).toBe("FAIL");
    const missingHeading = evaluateRenderedTextContrastGate({
      ...FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE,
      samples: [
        {
          role: "trusted_sources_link",
          surfaceRole: "SUBTLE",
          componentRole: "trusted_sources_link",
          color: "rgb(29, 78, 137)",
          background: "rgb(255, 255, 255)",
          contrast: 7.2,
          luminance: 0.09,
        },
        {
          role: "trusted_sources_body",
          surfaceRole: "SUBTLE",
          componentRole: "trusted_sources_body",
          color: "rgb(21, 32, 51)",
          background: "rgb(255, 255, 255)",
          contrast: 14.5,
          luminance: 0.02,
        },
      ],
    });
    expect(missingHeading.trustedSources).toBe("FAIL");
    expect(missingHeading.overall).toBe("FAIL");
    expect(missingHeading.missingMandatorySamples).toBeGreaterThan(0);
    const missingLink = evaluateRenderedTextContrastGate({
      ...FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE,
      samples: [
        {
          role: "trusted_sources_title",
          surfaceRole: "SUBTLE",
          componentRole: "trusted_sources_title",
          color: "rgb(21, 32, 51)",
          background: "rgb(255, 255, 255)",
          contrast: 14.5,
          luminance: 0.02,
        },
        {
          role: "trusted_sources_body",
          surfaceRole: "SUBTLE",
          componentRole: "trusted_sources_body",
          color: "rgb(21, 32, 51)",
          background: "rgb(255, 255, 255)",
          contrast: 14.5,
          luminance: 0.02,
        },
      ],
    });
    expect(missingLink.trustedSourcesLinks).toBe("FAIL");
    expect(missingLink.overall).toBe("FAIL");
    expect(missingLink.missingMandatorySamples).toBeGreaterThan(0);
  });

  it("passes after explicit Trusted Sources ink reset on the same navy EMPHASIS fixture", () => {
    const tokenOnly = evaluateSectionSurfaceContrast({
      variants: ["EMPHASIS"],
      textOnEmphasisLight: true,
      cardsDistinctOnTinted: true,
      linksReadable: true,
    });
    const rendered = evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE);
    expect(tokenOnly.overall).toBe("PASS");
    expect(rendered.overall).toBe("PASS");
    expect(rendered.trustedSources).toBe("PASS");
    expect(rendered.trustedSourcesLinks).toBe("PASS");
    expect(rendered.trustedSourcesBody).toBe("PASS");
    expect(rendered.missingMandatorySamples).toBe(0);
    expect(rendered.unscopedEmphasisLeaks).toBe(0);
    expect(rendered.paleTitlesOnLight).toBe(0);
    expect(rendered.emphasisSpokeLinks).toBe("PASS");
    expect(rendered.darkOnDarkEmphasis).toBe(0);
  });

  it("fails navy Next step spoke links that inherit dark accent ink", () => {
    const broken = evaluateRenderedTextContrastGate(FOUNDER_EMPHASIS_SPOKE_DARK_ON_DARK_FIXTURE);
    expect(broken.overall).toBe("FAIL");
    expect(broken.emphasisSpokeLinks).toBe("FAIL");
    expect(broken.darkOnDarkEmphasis).toBeGreaterThan(0);
    expect(broken.trustedSources).toBe("PASS");
    const repaired = evaluateRenderedTextContrastGate(FOUNDER_TRUSTED_SOURCES_INK_RESET_FIXTURE);
    expect(repaired.emphasisSpokeLinks).toBe("PASS");
    expect(repaired.darkOnDarkEmphasis).toBe(0);
    expect(repaired.overall).toBe("PASS");
  });

  it("rejects authoring voice even when readability grade-level would pass", () => {
    for (const fixture of HUMAN_FIRST_BAD_FIXTURES) {
      expect(evaluateHumanFirstPublicLanguageGate(fixture).overall).toBe("FAIL");
    }
    expect(evaluateHumanReadabilityGate("Hide the engine.").overall).toBe("FAIL");
    expect(evaluateHumanReadabilityGate(HUMAN_FIRST_GOOD_FIXTURE).overall).toBe("PASS");
    expect(evaluateHumanFirstPublicLanguageGate(HUMAN_FIRST_GOOD_FIXTURE).overall).toBe("PASS");
    expect(evaluateHumanFirstPublicLanguageGate("Related page one").relatedPagePlaceholders).toBeGreaterThan(0);
    expect(evaluateHumanFirstPublicLanguageGate("A buried AnswerChunk can still answer this question.").visibleAnswerChunk).toBeGreaterThan(0);
    expect(
      evaluateHumanFirstPublicLanguageGate(
        "Clients search this question because a nearby page does not own this intent.",
      ).intentOwnershipAuthoring,
    ).toBeGreaterThan(0);
  });
});
