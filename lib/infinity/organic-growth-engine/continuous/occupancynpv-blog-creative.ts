import {
  classifyCreativeReuse,
  evaluateCreativeOveruseGate,
  evaluateCreativeSurfaceFitGate,
  evaluateDesignCoreCreativeQualityGate,
  registerCreativeAsset,
  type CreativeAssetRecord,
} from "@/lib/infinity/design-core/creative-asset-registry";
import {
  evaluateCreativeGeometryUniqueness,
  inspectSvgCreativeQuality,
} from "@/lib/infinity/qc-escape/creative-quality";
import { OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID, OCCUPANCYNPV_BLOG_ARTICLE_PATH } from "./occupancynpv-blog-catalog";

export const OCCUPANCYNPV_ARTICLE_HERO = "/media/hero-building.webp" as const;
export const OCCUPANCYNPV_VALUATION_CATEGORY_CREATIVE = "/media/blog/valuation-category.svg" as const;
export const OCCUPANCYNPV_INTEREST_RATES_CREATIVE = "/media/blog/interest-rates.svg" as const;
export const OCCUPANCYNPV_CAP_RATES_CREATIVE = "/media/blog/cap-rates.svg" as const;
export const OCCUPANCYNPV_CRE_CREATIVE = "/media/blog/commercial-real-estate.svg" as const;
export const OCCUPANCYNPV_TOPIC_HUB_CREATIVE = "/media/blog/topic-hub.svg" as const;

export function occupancynpvEntityCreative(kind: "category" | "tag" | "article", label: string): { src: string; alt: string; role: CreativeAssetRecord["creative_role"] } {
  if (kind === "article") {
    return {
      src: OCCUPANCYNPV_ARTICLE_HERO,
      alt: "Editorial commercial building used as valuation context. Not a customer property.",
      role: "HERO",
    };
  }
  if (kind === "category" && /valuation/i.test(label)) {
    return { src: OCCUPANCYNPV_VALUATION_CATEGORY_CREATIVE, alt: "Valuation-specific yield and indicated-value graphic.", role: "CATEGORY" };
  }
  if (/interest/i.test(label)) {
    return { src: OCCUPANCYNPV_INTEREST_RATES_CREATIVE, alt: "Interest-rate and financing curve graphic.", role: "TAG_TOPIC" };
  }
  if (/cap rate/i.test(label)) {
    return { src: OCCUPANCYNPV_CAP_RATES_CREATIVE, alt: "Cap-rate and going-in yield graphic.", role: "TAG_TOPIC" };
  }
  if (/commercial real estate|cre/i.test(label)) {
    return { src: OCCUPANCYNPV_CRE_CREATIVE, alt: "Broad commercial real estate district graphic.", role: "TAG_TOPIC" };
  }
  return { src: OCCUPANCYNPV_VALUATION_CATEGORY_CREATIVE, alt: `${label} editorial graphic.`, role: kind === "category" ? "CATEGORY" : "TAG_TOPIC" };
}

export function occupancynpvBlogCreativeInventory(): CreativeAssetRecord[] {
  const now = "2026-09-17T12:00:00.000Z";
  return [
    registerCreativeAsset({
      asset_id: "cre_onpv_article_hero",
      venture_id: "occupancynpv",
      content_asset_id: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
      entity_type: "article",
      entity_id: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      creative_role: "HERO",
      source: OCCUPANCYNPV_ARTICLE_HERO,
      design_core_job_id: "design-core:occupancynpv-interest-rates-hero",
      semantic_topic: "interest-rates-valuation-article",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
    registerCreativeAsset({
      asset_id: "cre_onpv_article_card",
      venture_id: "occupancynpv",
      content_asset_id: OCCUPANCYNPV_BLOG_ARTICLE_ASSET_ID,
      entity_type: "article",
      entity_id: OCCUPANCYNPV_BLOG_ARTICLE_PATH,
      creative_role: "CARD",
      source: OCCUPANCYNPV_ARTICLE_HERO,
      design_core_job_id: "design-core:occupancynpv-interest-rates-hero",
      semantic_topic: "interest-rates-valuation-article",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
    registerCreativeAsset({
      asset_id: "cre_onpv_valuation_category",
      venture_id: "occupancynpv",
      content_asset_id: "category:valuation",
      entity_type: "category",
      entity_id: "valuation",
      creative_role: "CATEGORY",
      source: OCCUPANCYNPV_VALUATION_CATEGORY_CREATIVE,
      design_core_job_id: "design-core:occupancynpv-valuation-category",
      semantic_topic: "valuation",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
    registerCreativeAsset({
      asset_id: "cre_onpv_interest_rates",
      venture_id: "occupancynpv",
      content_asset_id: "tag:interest-rates",
      entity_type: "tag",
      entity_id: "interest-rates",
      creative_role: "TAG_TOPIC",
      source: OCCUPANCYNPV_INTEREST_RATES_CREATIVE,
      design_core_job_id: "design-core:occupancynpv-interest-rates-topic",
      semantic_topic: "interest-rates",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
    registerCreativeAsset({
      asset_id: "cre_onpv_cap_rates",
      venture_id: "occupancynpv",
      content_asset_id: "tag:cap-rates",
      entity_type: "tag",
      entity_id: "cap-rates",
      creative_role: "TAG_TOPIC",
      source: OCCUPANCYNPV_CAP_RATES_CREATIVE,
      design_core_job_id: "design-core:occupancynpv-cap-rates-topic",
      semantic_topic: "cap-rates",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
    registerCreativeAsset({
      asset_id: "cre_onpv_cre",
      venture_id: "occupancynpv",
      content_asset_id: "tag:commercial-real-estate",
      entity_type: "tag",
      entity_id: "commercial-real-estate",
      creative_role: "TAG_TOPIC",
      source: OCCUPANCYNPV_CRE_CREATIVE,
      design_core_job_id: "design-core:occupancynpv-cre-topic",
      semantic_topic: "commercial-real-estate",
      brand_profile: "occupancynpv",
      created_at: now,
      status: "ACTIVE",
    }),
  ];
}

export const OCCUPANCYNPV_ARCHIVE_CREATIVE_KINDS = [
  "valuation",
  "interest-rates",
  "cap-rates",
  "commercial-real-estate",
  "topic-hub",
] as const;

export type OccupancyNpvArchiveCreativeKind = (typeof OCCUPANCYNPV_ARCHIVE_CREATIVE_KINDS)[number];

export function occupancynpvArchiveCreativeSvgs(): string[] {
  return OCCUPANCYNPV_ARCHIVE_CREATIVE_KINDS.map((kind) => occupancynpvUniqueCreativeSvg(kind));
}

export function occupancynpvCreativeGates() {
  const records = occupancynpvBlogCreativeInventory();
  const articleHero = records.find((row) => row.asset_id === "cre_onpv_article_hero")!;
  const articleCard = records.find((row) => row.asset_id === "cre_onpv_article_card")!;
  const svgs = occupancynpvArchiveCreativeSvgs();
  const inspected = svgs.map((svg) => inspectSvgCreativeQuality(svg));
  const qualityResults = svgs.map((svg, index) =>
    evaluateDesignCoreCreativeQualityGate({
      unique: true,
      relevant: true,
      brandFit: true,
      genericFiller: false,
      textArtifacts: false,
      surfaceFit: true,
      svg,
      source: `${OCCUPANCYNPV_ARCHIVE_CREATIVE_KINDS[index]}.svg`,
    }),
  );
  return {
    sameEntity: classifyCreativeReuse({ left: articleHero, right: articleCard }),
    uniqueness: evaluateCreativeGeometryUniqueness(svgs),
    overuse: evaluateCreativeOveruseGate(records),
    surface: evaluateCreativeSurfaceFitGate({ role: "HERO", aspectRatio: "16:9", source: articleHero.source, photographicHero: true }),
    quality: {
      gate: "DesignCoreCreativeQualityGate" as const,
      result: qualityResults.some((row) => row.result === "FAIL")
        ? "FAIL"
        : qualityResults.some((row) => row.result === "NOT_PROVEN")
          ? "NOT_PROVEN"
          : "PASS",
      reasons: [...new Set(qualityResults.flatMap((row) => row.reasons))],
    },
    inspected,
  };
}

export function occupancynpvLegacyGenericCreativeSvg(kind: OccupancyNpvArchiveCreativeKind): string {
  const palettes = {
    valuation: { bg: "#10232c", accent: "#d8b26a", ink: "#f8fafc", label: "VALUATION" },
    "interest-rates": { bg: "#0f2740", accent: "#7dd3fc", ink: "#f8fafc", label: "RATES" },
    "cap-rates": { bg: "#1d3a2f", accent: "#86efac", ink: "#f8fafc", label: "YIELD" },
    "commercial-real-estate": { bg: "#2a1f18", accent: "#fbbf24", ink: "#f8fafc", label: "CRE" },
    "topic-hub": { bg: "#1e293b", accent: "#93c5fd", ink: "#f8fafc", label: "TOPICS" },
  } as const;
  const tone = palettes[kind];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" role="img"><rect width="1200" height="675" fill="${tone.bg}"/><path d="M80 520 L280 300 L460 420 L720 180 L1120 520" fill="none" stroke="${tone.accent}" stroke-width="18"/><circle cx="720" cy="180" r="22" fill="${tone.accent}"/><text x="80" y="120" fill="${tone.ink}" font-family="Georgia, serif" font-size="48">${tone.label}</text></svg>`;
}

export function occupancynpvUniqueCreativeSvg(kind: OccupancyNpvArchiveCreativeKind): string {
  if (kind === "valuation") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Indicated commercial property value from NOI and cap rate">
<defs><linearGradient id="val-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#163445"/><stop offset="1" stop-color="#0b1720"/></linearGradient><linearGradient id="val-gold" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8d6a2b"/><stop offset="1" stop-color="#e6c37a"/></linearGradient></defs>
<rect width="1200" height="900" fill="url(#val-sky)"/>
<rect x="90" y="610" width="1020" height="18" rx="4" fill="#1d3a48"/>
<rect x="250" y="430" width="160" height="180" fill="#1a3a48"/>
<rect x="270" y="455" width="28" height="36" fill="#d8b26a" opacity=".75"/>
<rect x="308" y="455" width="28" height="36" fill="#d8b26a" opacity=".45"/>
<rect x="346" y="455" width="28" height="36" fill="#d8b26a" opacity=".75"/>
<rect x="270" y="510" width="28" height="36" fill="#d8b26a" opacity=".45"/>
<rect x="308" y="510" width="28" height="36" fill="#d8b26a" opacity=".75"/>
<rect x="346" y="510" width="28" height="36" fill="#d8b26a" opacity=".45"/>
<polygon points="250,430 330,360 410,430" fill="#d8b26a"/>
<rect x="470" y="320" width="210" height="290" fill="#214655"/>
<rect x="500" y="355" width="40" height="52" fill="#f8fafc" opacity=".12"/>
<rect x="555" y="355" width="40" height="52" fill="#f8fafc" opacity=".2"/>
<rect x="610" y="355" width="40" height="52" fill="#f8fafc" opacity=".12"/>
<rect x="500" y="430" width="40" height="52" fill="#f8fafc" opacity=".2"/>
<rect x="555" y="430" width="40" height="52" fill="#e6c37a" opacity=".55"/>
<rect x="610" y="430" width="40" height="52" fill="#f8fafc" opacity=".2"/>
<rect x="500" y="505" width="150" height="70" fill="#0b1720"/>
<rect x="760" y="250" width="190" height="360" fill="url(#val-gold)"/>
<rect x="790" y="290" width="48" height="60" fill="#10232c" opacity=".35"/>
<rect x="858" y="290" width="48" height="60" fill="#10232c" opacity=".2"/>
<rect x="790" y="370" width="48" height="60" fill="#10232c" opacity=".2"/>
<rect x="858" y="370" width="48" height="60" fill="#10232c" opacity=".35"/>
<rect x="790" y="450" width="116" height="90" fill="#10232c" opacity=".45"/>
<circle cx="600" cy="210" r="78" fill="none" stroke="#e6c37a" stroke-width="8"/>
<circle cx="600" cy="210" r="48" fill="none" stroke="#f8fafc" stroke-width="3" opacity=".45"/>
<path d="M600 210 L600 142" stroke="#e6c37a" stroke-width="8" stroke-linecap="round"/>
<circle cx="600" cy="210" r="10" fill="#e6c37a"/>
</svg>`;
  }
  if (kind === "interest-rates") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Policy-rate steps lifting commercial financing cost">
<defs><linearGradient id="rate-sky" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0b1c33"/><stop offset="1" stop-color="#163a5c"/></linearGradient></defs>
<rect width="1200" height="900" fill="url(#rate-sky)"/>
<rect x="210" y="620" width="170" height="70" rx="8" fill="#7dd3fc" opacity=".25"/>
<rect x="360" y="530" width="170" height="160" rx="8" fill="#7dd3fc" opacity=".4"/>
<rect x="510" y="420" width="170" height="270" rx="8" fill="#38bdf8" opacity=".55"/>
<rect x="660" y="300" width="170" height="390" rx="8" fill="#7dd3fc"/>
<rect x="810" y="220" width="170" height="470" rx="8" fill="#e0f2fe"/>
<path d="M250 655 C430 640, 520 470, 700 360 S980 210, 980 210" fill="none" stroke="#082f49" stroke-width="16" stroke-linecap="round"/>
<circle cx="250" cy="655" r="16" fill="#082f49"/>
<circle cx="595" cy="430" r="16" fill="#082f49"/>
<circle cx="980" cy="210" r="18" fill="#082f49"/>
<rect x="430" y="160" width="340" height="14" rx="7" fill="#7dd3fc" opacity=".35"/>
<rect x="500" y="188" width="200" height="10" rx="5" fill="#e0f2fe" opacity=".5"/>
</svg>`;
  }
  if (kind === "topic-hub") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Connected commercial research topics">
<defs><radialGradient id="hub-glow" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#0b1220"/></radialGradient></defs>
<rect width="1200" height="900" fill="url(#hub-glow)"/>
<circle cx="600" cy="390" r="86" fill="#38bdf8"/>
<circle cx="600" cy="390" r="48" fill="#0b1220"/>
<circle cx="320" cy="250" r="54" fill="#7dd3fc" opacity=".85"/>
<circle cx="880" cy="230" r="48" fill="#bae6fd" opacity=".8"/>
<circle cx="280" cy="560" r="58" fill="#0ea5e9" opacity=".75"/>
<circle cx="900" cy="580" r="62" fill="#38bdf8" opacity=".7"/>
<circle cx="600" cy="700" r="46" fill="#e0f2fe" opacity=".65"/>
<path d="M600 390 L320 250 L280 560 L600 390 L880 230 L900 580 L600 390 L600 700" fill="none" stroke="#7dd3fc" stroke-width="10" opacity=".55"/>
<rect x="470" y="140" width="260" height="16" rx="8" fill="#7dd3fc" opacity=".35"/>
<rect x="520" y="168" width="160" height="10" rx="5" fill="#bae6fd" opacity=".4"/>
</svg>`;
  }
  if (kind === "cap-rates") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="NOI over price becoming going-in cap rate">
<defs><linearGradient id="cap-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#163528"/><stop offset="1" stop-color="#0c1f18"/></linearGradient></defs>
<rect width="1200" height="900" fill="url(#cap-ground)"/>
<ellipse cx="600" cy="700" rx="340" ry="70" fill="#052e16" opacity=".7"/>
<rect x="250" y="250" width="300" height="360" rx="18" fill="#14532d"/>
<rect x="280" y="290" width="240" height="70" fill="#86efac" opacity=".9"/>
<rect x="280" y="380" width="240" height="46" fill="#bbf7d0" opacity=".45"/>
<rect x="280" y="444" width="240" height="46" fill="#bbf7d0" opacity=".3"/>
<rect x="280" y="508" width="240" height="70" fill="#166534"/>
<rect x="650" y="250" width="300" height="360" rx="18" fill="#365314"/>
<rect x="680" y="430" width="240" height="150" fill="#a3e635" opacity=".85"/>
<rect x="680" y="290" width="240" height="110" fill="#365314"/>
<path d="M550 430 H650" stroke="#f8fafc" stroke-width="10" stroke-linecap="round"/>
<polygon points="640,410 680,430 640,450" fill="#f8fafc"/>
<circle cx="600" cy="200" r="64" fill="none" stroke="#86efac" stroke-width="10"/>
<rect x="572" y="168" width="56" height="64" fill="#86efac"/>
<rect x="584" y="180" width="32" height="40" fill="#0c1f18"/>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Office, industrial, and retail district">
<defs><linearGradient id="cre-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2416"/><stop offset="1" stop-color="#1a100c"/></linearGradient></defs>
<rect width="1200" height="900" fill="url(#cre-dusk)"/>
<rect x="160" y="690" width="880" height="28" fill="#4a2d1b"/>
<rect x="180" y="718" width="840" height="12" fill="#fbbf24" opacity=".25"/>
<rect x="200" y="280" width="150" height="410" fill="#7c4a24"/>
<rect x="220" y="310" width="36" height="44" fill="#fde68a" opacity=".55"/>
<rect x="268" y="310" width="36" height="44" fill="#fde68a" opacity=".25"/>
<rect x="220" y="370" width="36" height="44" fill="#fde68a" opacity=".25"/>
<rect x="268" y="370" width="36" height="44" fill="#fde68a" opacity=".55"/>
<rect x="220" y="430" width="84" height="90" fill="#1a100c" opacity=".4"/>
<rect x="400" y="360" width="250" height="330" fill="#92400e"/>
<polygon points="400,360 525,250 650,360" fill="#f59e0b"/>
<rect x="440" y="410" width="50" height="60" fill="#fde68a" opacity=".35"/>
<rect x="510" y="410" width="50" height="60" fill="#fde68a" opacity=".55"/>
<rect x="580" y="410" width="40" height="60" fill="#fde68a" opacity=".35"/>
<rect x="470" y="560" width="110" height="130" fill="#1a100c"/>
<rect x="720" y="430" width="280" height="260" fill="#78350f"/>
<rect x="750" y="470" width="90" height="70" fill="#fbbf24" opacity=".2"/>
<rect x="860" y="470" width="110" height="70" fill="#fbbf24" opacity=".35"/>
<rect x="750" y="560" width="220" height="80" fill="#451a03"/>
<circle cx="980" cy="180" r="42" fill="#fbbf24" opacity=".7"/>
<circle cx="980" cy="180" r="22" fill="#f59e0b"/>
</svg>`;
}
