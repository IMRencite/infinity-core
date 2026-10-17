/**
 * VentureCreativeImageContract v2 — structured briefs + deterministic editorial SVGs
 * until live IMAGE_GENERATION providers pass ImageAssetQualityGate in production.
 */
export type ImageCreativeBrief = {
  venture_id: string;
  article_slug: string;
  placement: "HERO" | "SUPPORTING";
  premise: string;
  scene: string;
  subject: string;
  mood: string;
  lighting: string;
  aspect_ratio: "16:9" | "4:3" | "3:2";
  must_not: string[];
};

export const CLUB_THROTTLE_SHIRT_V10_HERO_BRIEF: ImageCreativeBrief = {
  venture_id: "club-throttle",
  article_slug: "how-riders-choose-a-shirt",
  placement: "HERO",
  premise: "The shirt that survives the night — jacket off at a real stop, tee visible under lot light",
  scene: "Gas-station / bike-night parking row, sodium vapor and practical night contrast",
  subject: "Rider beside a street bike, jacket open, plain dark tee (no fake readable print)",
  mood: "Premium rider media, candid stop moment, not e-commerce posing",
  lighting: "Night sodium + subtle fill, cinematic but believable",
  aspect_ratio: "16:9",
  must_not: [
    "fake readable shirt text",
    "warped motorcycle geometry",
    "extra wheels",
    "garbled signage",
    "generic stock neon",
  ],
};

export const CLUB_THROTTLE_SHIRT_V10_SUPPORTING_BRIEFS: ImageCreativeBrief[] = [
  {
    venture_id: "club-throttle",
    article_slug: "how-riders-choose-a-shirt",
    placement: "SUPPORTING",
    premise: "Fit on the bars — reach and hem behavior on the bike",
    scene: "Rider seated on a cruiser, forward lean, handlebar reach visible",
    subject: "Torso, shoulders, hem line relative to bars",
    mood: "Instructional editorial, not studio",
    lighting: "Garage or dusk side light",
    aspect_ratio: "4:3",
    must_not: ["distorted hands", "impossible handlebars"],
  },
  {
    venture_id: "club-throttle",
    article_slug: "how-riders-choose-a-shirt",
    placement: "SUPPORTING",
    premise: "Collar and blank detail after a real wear",
    scene: "Close crop on collar rib and knit texture on a dark tee",
    subject: "Fabric weight and collar construction",
    mood: "Product truth without catalog flat lay",
    lighting: "Soft directional light",
    aspect_ratio: "3:2",
    must_not: ["fake brand marks", "AI garbled text"],
  },
];

export const CLUB_THROTTLE_SHIRT_V10_HERO_LEGACY_SVG_PATH = "/visual/journal-v2-shirt-hero.svg" as const;
export const CLUB_THROTTLE_SHIRT_V10_HERO_PATH = "/visual/journal-v2-shirt-hero.webp" as const;
export const CLUB_THROTTLE_SHIRT_V10_SUPPORTING_PATHS = [
  "/visual/journal-v2-shirt-fit-on-bike.svg",
  "/visual/journal-v2-shirt-collar-detail.svg",
] as const;

/** Cinematic night stop — no embedded readable text (Mission 31). */
export function clubThrottleShirtV10HeroSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-label="Rider at a night gas stop with jacket open and plain tee visible beside a motorcycle">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a0e14"/><stop offset="100%" stop-color="#1a1410"/></linearGradient>
    <radialGradient id="lot" cx="50%" cy="80%" r="65%"><stop offset="0%" stop-color="#3d2818" stop-opacity=".55"/><stop offset="100%" stop-color="#0a0e14" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <rect width="1600" height="900" fill="url(#lot)"/>
  <rect x="0" y="620" width="1600" height="280" fill="#141210"/>
  <rect x="120" y="480" width="420" height="200" rx="8" fill="#1c1814" opacity=".85"/>
  <circle cx="280" cy="200" r="120" fill="#c4a574" opacity=".22"/>
  <ellipse cx="980" cy="720" rx="220" ry="28" fill="#000" opacity=".35"/>
  <path d="M920 520 L1120 420 L1280 480 L1320 620 L1280 720 L880 720 L840 600 Z" fill="#1a1a1a"/>
  <circle cx="920" cy="700" r="52" fill="#111" stroke="#333" stroke-width="8"/>
  <circle cx="1240" cy="700" r="52" fill="#111" stroke="#333" stroke-width="8"/>
  <path d="M1120 420 L1180 380 L1220 400" fill="none" stroke="#444" stroke-width="14" stroke-linecap="round"/>
  <path d="M520 380 Q560 320 620 340 L680 520 L640 720 L480 720 L440 520 Z" fill="#2a2520"/>
  <path d="M560 360 L600 340 L640 360 L620 400 L580 400 Z" fill="#3a3530"/>
  <path d="M500 520 L660 520 L680 620 L480 620 Z" fill="#1a1816"/>
  <path d="M420 520 L500 480 L560 520 L520 600 L440 580 Z" fill="#252220"/>
</svg>`;
}

export function clubThrottleShirtV10FitOnBikeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Rider reaching toward handlebars showing tee hem and shoulder line on the bike">
  <rect width="1200" height="900" fill="#1a1816"/>
  <path d="M200 780 L1000 780" stroke="#333" stroke-width="4"/>
  <path d="M380 520 L520 380 L720 400 L820 520 L780 760 L420 760 Z" fill="#222"/>
  <circle cx="420" cy="720" r="44" fill="#111" stroke="#444" stroke-width="6"/>
  <circle cx="760" cy="720" r="44" fill="#111" stroke="#444" stroke-width="6"/>
  <path d="M520 380 L580 340 L640 360" fill="none" stroke="#555" stroke-width="12"/>
  <path d="M480 420 Q520 360 580 380 L620 520 L580 680 L460 680 L420 520 Z" fill="#2a2824"/>
  <path d="M440 520 L620 520 L640 600 L420 600 Z" fill="#151412"/>
</svg>`;
}

export function clubThrottleShirtV10CollarDetailSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" role="img" aria-label="Close view of a heavyweight tee collar and knit texture">
  <rect width="900" height="600" fill="#efeae2"/>
  <path d="M120 480 L780 480 L720 120 L180 120 Z" fill="#141210"/>
  <path d="M280 120 Q450 200 620 120" fill="none" stroke="#2a2824" stroke-width="28"/>
  <path d="M200 200 L700 200" stroke="#333" stroke-width="2" opacity=".25"/>
  <path d="M200 280 L700 280" stroke="#333" stroke-width="2" opacity=".2"/>
  <path d="M200 360 L700 360" stroke="#333" stroke-width="2" opacity=".15"/>
</svg>`;
}

export type VentureImageAssetRecord = {
  path: string;
  width: number;
  height: number;
  alt: string;
  framework: "LEGACY_EDITORIAL_WORLD" | "VENTURE_CREATIVE_V2";
  brief?: ImageCreativeBrief;
};

export function clubThrottleShirtV10ImageAssets(): VentureImageAssetRecord[] {
  return [
    {
      path: CLUB_THROTTLE_SHIRT_V10_HERO_PATH,
      width: 2560,
      height: 1440,
      alt: "Rider at a night stop beside a motorcycle, jacket open, plain tee visible under parking-lot light",
      framework: "VENTURE_CREATIVE_V2",
      brief: CLUB_THROTTLE_SHIRT_V10_HERO_BRIEF,
    },
    {
      path: CLUB_THROTTLE_SHIRT_V10_SUPPORTING_PATHS[0]!,
      width: 1200,
      height: 900,
      alt: "Rider on a bike reaching toward the handlebars, showing how a tee hem and shoulders behave in riding posture",
      framework: "VENTURE_CREATIVE_V2",
      brief: CLUB_THROTTLE_SHIRT_V10_SUPPORTING_BRIEFS[0],
    },
    {
      path: CLUB_THROTTLE_SHIRT_V10_SUPPORTING_PATHS[1]!,
      width: 900,
      height: 600,
      alt: "Close view of a dark tee collar and knit texture",
      framework: "VENTURE_CREATIVE_V2",
      brief: CLUB_THROTTLE_SHIRT_V10_SUPPORTING_BRIEFS[1],
    },
  ];
}
