import type { ClubThrottleConceptBrief } from "./club-throttle-concept-preflight.ts";

/** Required for all Club Throttle isolated print artwork generation. */
export const CLUB_THROTTLE_APPAREL_MOCKUP_PROMPT_PROHIBITION = [
  "Do not show the design on a shirt.",
  "Do not generate a shirt, clothing mockup, mannequin, torso, neckline, or sleeves.",
  "Generate only the isolated print artwork.",
  "Transparent background outside the artwork.",
].join(" ");

/** Print-master generation: isolated artwork only (no garment mockup language). */
export function compileConceptPrintArtOnlyPrompt(brief: ClubThrottleConceptBrief, chromaSuffix: string): string {
  const modeHint =
    brief.design_mode === "TYPOGRAPHY_FIRST" || brief.design_mode === "PHRASE_FIRST"
      ? "Typography-first isolated graphic. Original phrase only, no brand logos, no OEM badges."
      : "Illustration-first isolated graphic. Original motorcycle-culture subject, no logos, no readable third-party text.";
  return [
    `Club Throttle original PRINT ART ONLY — concept "${brief.name}".`,
    `Target rider: ${brief.target_rider}.`,
    `Creative direction: ${brief.commercial_hook}.`,
    `Must differ from night sodium parking-lot scene: ${brief.differs_from_lot_line}.`,
    "Composition: bold vertical silhouette readable at distance; artwork fills the frame; not a small centered poster.",
    "PRINT ART ONLY: no shirt, no hoodie, no garment, no mannequin, no person wearing product, no mockup, no room, no road scene, no frame, no canvas rectangle, no checkerboard depiction, no environmental background, no garment silhouette.",
    "The flat chroma field outside the artwork is temporary production isolation only; it will be removed deterministically — do not paint transparency or checkerboard patterns.",
    "No opaque rectangle panel, no matte backdrop, no baked checkerboard pixels.",
    modeHint,
    chromaSuffix,
  ].join(" ");
}

export function compileConceptApparelPrompt(brief: ClubThrottleConceptBrief, chromaSuffix: string): string {
  return compileConceptPrintArtOnlyPrompt(brief, chromaSuffix);
}

export function printArtOnlyPromptQc(prompt: string): "PASS" | "FAIL" {
  const forbidden = [
    /\b(generate|render|show|display)\s+(a\s+)?mockup/i,
    /\bwears?\s+(a\s+)?mockup/i,
    /mockup\s+(of|on)/i,
    /\bon a shirt\b/i,
    /heavyweight tee/i,
    /transparent background outside the artwork/i,
  ];
  const required = [/PRINT ART ONLY/i, /no shirt/i, /no hoodie/i, /chroma/i];
  if (forbidden.some((re) => re.test(prompt))) return "FAIL";
  return required.every((re) => re.test(prompt)) ? "PASS" : "FAIL";
}
