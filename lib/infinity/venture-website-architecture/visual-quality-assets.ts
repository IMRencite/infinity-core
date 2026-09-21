import { readFileSync } from "node:fs";
import path from "node:path";

export type VisualAssetPurpose =
  | "HERO_BACKGROUND"
  | "SECTION_BAND"
  | "EDUCATIONAL_DIAGRAM";

export type PageVisualAssetPlan = {
  id: string;
  publicPath: string;
  purpose: VisualAssetPurpose;
  placement: "hero" | "section" | "example";
  aspectRatio: "16 / 9";
  subject: string;
  visualStyle: "editorial-photography" | "financial-diagram";
  altTextIntent: string;
  performance: {
    format: "image/webp" | "image/svg+xml";
    maxBytes: number;
    loading: "eager" | "lazy";
    width: number;
    height: number;
  };
  provenance: "generated_editorial_for_cre_validation" | "authored_svg_diagram";
};

export const VISUAL_ASSET_PLANS: PageVisualAssetPlan[] = [
  {
    id: "hero-district",
    publicPath: "/media/hero-district.webp",
    purpose: "HERO_BACKGROUND",
    placement: "hero",
    aspectRatio: "16 / 9",
    subject: "Downtown business-district office towers at dusk",
    visualStyle: "editorial-photography",
    altTextIntent: "Glass office towers in a business district at dusk. Editorial atmosphere only. Not a client site.",
    performance: { format: "image/webp", maxBytes: 220_000, loading: "eager", width: 1600, height: 900 },
    provenance: "generated_editorial_for_cre_validation",
  },
  {
    id: "hero-interior",
    publicPath: "/media/hero-interior.webp",
    purpose: "HERO_BACKGROUND",
    placement: "hero",
    aspectRatio: "16 / 9",
    subject: "Empty commercial conference room with a city view",
    visualStyle: "editorial-photography",
    altTextIntent: "Empty conference room and city view used as editorial context. Not a photographed customer.",
    performance: { format: "image/webp", maxBytes: 180_000, loading: "lazy", width: 1600, height: 900 },
    provenance: "generated_editorial_for_cre_validation",
  },
  {
    id: "hero-workstation",
    publicPath: "/media/hero-workstation.webp",
    purpose: "HERO_BACKGROUND",
    placement: "hero",
    aspectRatio: "16 / 9",
    subject: "Lease-analysis workstation with papers and a laptop",
    visualStyle: "editorial-photography",
    altTextIntent: "A lease-analysis desk with papers and a laptop. Teaching context only. No people shown.",
    performance: { format: "image/webp", maxBytes: 180_000, loading: "lazy", width: 1600, height: 900 },
    provenance: "generated_editorial_for_cre_validation",
  },
  {
    id: "hero-building",
    publicPath: "/media/hero-building.webp",
    purpose: "HERO_BACKGROUND",
    placement: "hero",
    aspectRatio: "16 / 9",
    subject: "Commercial office building exterior",
    visualStyle: "editorial-photography",
    altTextIntent: "A commercial office building exterior. Editorial setting only. No company signage.",
    performance: { format: "image/webp", maxBytes: 220_000, loading: "lazy", width: 1600, height: 900 },
    provenance: "generated_editorial_for_cre_validation",
  },
];

export const CASH_FLOW_DIAGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" aria-labelledby="cfTitle cfDesc">
  <title id="cfTitle">Cash moves later and shrinks toward today</title>
  <desc id="cfDesc">A simple timeline. Later cash boxes sit farther right and look smaller than year-one cash.</desc>
  <rect width="720" height="220" fill="#f4f7fb"/>
  <line x1="48" y1="150" x2="680" y2="150" stroke="#1d3557" stroke-width="2"/>
  <rect x="60" y="70" width="88" height="64" rx="8" fill="#1d4e89"/>
  <rect x="210" y="86" width="76" height="48" rx="8" fill="#2c6aa6"/>
  <rect x="360" y="98" width="64" height="36" rx="8" fill="#4d88c4"/>
  <rect x="500" y="108" width="54" height="26" rx="8" fill="#7aa6d4"/>
  <text x="104" y="190" text-anchor="middle" font-size="13" fill="#243044" font-family="Georgia, serif">Year 1</text>
  <text x="248" y="190" text-anchor="middle" font-size="13" fill="#243044" font-family="Georgia, serif">Year 2</text>
  <text x="392" y="190" text-anchor="middle" font-size="13" fill="#243044" font-family="Georgia, serif">Year 3</text>
  <text x="527" y="190" text-anchor="middle" font-size="13" fill="#243044" font-family="Georgia, serif">Later</text>
  <text x="48" y="36" font-size="16" fill="#102033" font-family="Georgia, serif">Later cash is smaller in today's dollars</text>
</svg>
`;

export const COMPARE_DIAGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 220" role="img" aria-labelledby="cmpTitle cmpDesc">
  <title id="cmpTitle">Lease A and Lease B on one scale</title>
  <desc id="cmpDesc">Two bars on one axis. Lease A is a bit lower than Lease B in this teaching sample.</desc>
  <rect width="720" height="220" fill="#f4f7fb"/>
  <text x="48" y="36" font-size="16" fill="#102033" font-family="Georgia, serif">Same timeline. Same rate. Two totals.</text>
  <rect x="160" y="72" width="360" height="36" rx="8" fill="#1d4e89"/>
  <rect x="160" y="128" width="392" height="36" rx="8" fill="#7aa6d4"/>
  <text x="48" y="96" font-size="14" fill="#243044" font-family="Georgia, serif">Lease A</text>
  <text x="48" y="152" font-size="14" fill="#243044" font-family="Georgia, serif">Lease B</text>
</svg>
`;

export function visualAssetDir(): string {
  return path.join(process.cwd(), "lib/infinity/venture-website-architecture/visual-assets");
}

export function loadVisualAssetFiles(): Array<{ path: string; content: string; encoding: "utf8" | "base64" }> {
  const dir = visualAssetDir();
  return [
    ...VISUAL_ASSET_PLANS.map((plan) => ({
      path: `public${plan.publicPath}`,
      content: readFileSync(path.join(dir, `${plan.id}.webp`)).toString("base64"),
      encoding: "base64" as const,
    })),
    { path: "public/media/viz-cash-flow.svg", content: CASH_FLOW_DIAGRAM_SVG, encoding: "utf8" as const },
    { path: "public/media/viz-compare.svg", content: COMPARE_DIAGRAM_SVG, encoding: "utf8" as const },
  ];
}

export function heroAssetForRoute(route: string): PageVisualAssetPlan {
  const clean = route.replace(/\/+$/, "") || "/";
  if (clean === "/") return VISUAL_ASSET_PLANS[0];
  if (clean === "/pricing" || clean === "/for/tenant-rep-brokers") return VISUAL_ASSET_PLANS[3];
  if (clean === "/resources" || clean.endsWith("occupancy-costs") || clean.endsWith("effective-rent")) {
    return VISUAL_ASSET_PLANS[1];
  }
  if (clean.split("/").length > 2) return VISUAL_ASSET_PLANS[2];
  return VISUAL_ASSET_PLANS[3];
}

export function pageVisualPlanFor(route: string): {
  route: string;
  hero: PageVisualAssetPlan;
  educational: string[];
  cssOnlyCountedAsImage: false;
} {
  const hero = heroAssetForRoute(route);
  const educational =
    route === "/"
      ? [hero.publicPath]
      : [hero.publicPath, "/media/viz-cash-flow.svg", "/media/viz-compare.svg"];
  return { route, hero, educational, cssOnlyCountedAsImage: false };
}
