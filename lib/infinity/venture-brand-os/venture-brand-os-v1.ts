import type { BrandProfile } from "@/lib/infinity/commerce/brand/brand-system";
import { CLUB_THROTTLE_BRAND_PROFILE } from "@/lib/infinity/commerce/brand/club-throttle-profile";

export const VENTURE_BRAND_OS_VERSION = "v1" as const;

export type VentureMission = {
  statement: string;
  economic_alignment: string[];
  profit_invariant: "PROFIT_ALIGNMENT != SHORT_TERM_EXTRACTION";
};

export type VenturePositioning = {
  summary: string;
  for_whom: string;
  not_whom: string;
  personality: string[];
};

export type MessagingPillar = {
  id: string;
  title: string;
  body: string;
};

export type VentureVoiceProfile = BrandProfile["voice"] & {
  traits: string[];
};

export type VentureBrandProfile = {
  venture_id: string;
  public_name: string;
  category: string;
  primary_customer: string;
  customer_range: string[];
  brand_thesis: string;
  mission: VentureMission;
  positioning: VenturePositioning;
  voice: VentureVoiceProfile;
  messaging_pillars: MessagingPillar[];
  value_proposition: string;
  brand_promise: string;
  economic_expansion: string[];
  source: BrandProfile;
};

export type AboutPageInput = {
  brand: VentureBrandProfile;
  storefrontOrigin?: string;
};

export function clubThrottleVentureBrandProfile(): VentureBrandProfile {
  const src = CLUB_THROTTLE_BRAND_PROFILE;
  return {
    venture_id: "club-throttle",
    public_name: "Club Throttle",
    category: "motorcycle lifestyle / media / apparel brand",
    primary_customer: "people who actually ride motorcycles",
    customer_range: [
      "street riders",
      "sport riders",
      "track-oriented riders",
      "adventure / dualsport riders",
      "garage / build culture",
      "night riders",
      "cruiser / bagger riders",
      "solo riders",
      "group riders",
    ],
    brand_thesis:
      "Club Throttle is built around motorcycles being ridden, worked on, talked about, shared, and enjoyed—not cosplay club gear, not OEM merchandise, and not one subculture only.",
    mission: {
      statement:
        "Build a rider-first brand around the culture, experiences, gear, stories, and products that make motorcycles worth riding—starting with original apparel and media riders actually want to wear and follow.",
      economic_alignment: [
        "repeat apparel purchase",
        "content-driven acquisition",
        "organic audience growth",
        "category expansion into rider gear and experiences",
        "brand equity and pricing power",
        "cross-sell across riding styles",
      ],
      profit_invariant: "PROFIT_ALIGNMENT != SHORT_TERM_EXTRACTION",
    },
    positioning: {
      summary:
        "Club Throttle is for people who ride—across styles and machines—who want original culture and gear that respects the road without pretending to be a manufacturer or an outlaw club.",
      for_whom: "Actual riders and the people around rider culture who live with machines, garages, and roads.",
      not_whom: "Spectators dressing up as riders; anyone looking for OEM logos or fake heritage.",
      personality: [
        "independent",
        "authentic",
        "confident",
        "rider-aware",
        "fun",
        "culture-driven",
        "original",
      ],
    },
    voice: {
      ...src.voice,
      traits: [
        "CONFIDENT",
        "RIDER_AWARE",
        "INDEPENDENT",
        "FUN",
        "DIRECT",
        "ENTERTAINING",
        "AUTHENTIC",
      ],
    },
    messaging_pillars: [
      {
        id: "THE_RIDE",
        title: "The ride",
        body: "Riding is the center—roads, stops, weather, mistakes, and the rides that stick.",
      },
      {
        id: "ORIGINAL_GEAR",
        title: "Original gear",
        body: "Apparel and designs made for rider culture, not borrowed manufacturer branding.",
      },
      {
        id: "EVERY_KIND_OF_RIDER",
        title: "Every kind of rider",
        body: "Sport, street, adventure, garage, cruiser, solo, or with friends—different bikes, same reason to show up.",
      },
      {
        id: "CULTURE_AROUND_THE_BIKE",
        title: "Culture around the bike",
        body: "Garages, late nights, stories, gear, and the social world that forms around machines.",
      },
      {
        id: "CONTENT_WORTH_FOLLOWING",
        title: "Content worth following",
        body: "Real rides, footage, journal notes, and rider-relevant stories—not generic lifestyle filler.",
      },
      {
        id: "BUILD_WITH_RIDERS",
        title: "Building with riders",
        body: "Future products and content should follow what riders respond to, not invented hype.",
      },
    ],
    value_proposition:
      "Original motorcycle-inspired apparel and media for people who actually ride—honest about garments, confident about culture, never cosplay.",
    brand_promise:
      "We will not invent heritage, scale, or credentials. What we sell and publish will trace to real rider culture and documented product facts.",
    economic_expansion: [
      "apparel margin and repeat purchase",
      "content and media audience",
      "future rider gear categories",
      "community and discovery when earned",
      "brand partnerships only when appropriate and true",
    ],
    source: src,
  };
}

export function generateAboutPageSource(input: AboutPageInput): string {
  const origin = input.storefrontOrigin ?? "https://clubthrottle.com";
  const b = input.brand;
  const featuredImg = "/storefront-merch/lot-line-hero-back.png";
  return `import Link from "next/link";

export const metadata = {
  title: "About · ${b.public_name}",
  alternates: { canonical: "${origin}/about" },
};

export default function AboutPage() {
  return (
    <div className="commerce-shell about-page">
      <section className="about-hero">
        <p className="kicker">About ${b.public_name}</p>
        <h1>Built for people who actually ride.</h1>
        <p>${b.brand_thesis}</p>
      </section>
      <section className="about-split">
        <div>
          <h2>Built around the ride</h2>
          <p>Motorcycles are meant to be ridden. The interesting part is the road, the machine, the people, the garage, the mistakes, the good rides, the late nights, and the stories that come back with you. ${b.public_name} exists around that experience—not around pretending to be something else.</p>
          <h2>Original gear</h2>
          <p>We develop original motorcycle-inspired designs for riders. This is not manufacturer merchandise, copied graphics, or fake club uniforms. Garment specifications live on product pages where they belong.</p>
          <p><Link className="cta" href="/shop">Shop the gear</Link></p>
        </div>
        <img src="${featuredImg}" alt="${b.public_name} original tee merchandise" />
      </section>
      <section className="about-band">
        <h2>More than one kind of rider</h2>
        <p>Street, sport, track, adventure, garage culture, night rides, cruisers, solo miles, rides with friends—different bikes and different styles, same reason to be here: riding.</p>
      </section>
      <section className="about-band">
        <h2>Journal &amp; media</h2>
        <p>${b.public_name} is also a content venture: ride footage, road stories, journal notes, gear culture, and the things riders actually care about—without claiming a giant audience we have not earned.</p>
        <p><Link href="/journal">Read the journal</Link></p>
      </section>
      <section className="about-band">
        <h2>Where the brand is going</h2>
        <p>Apparel is the opening category, not the ceiling. As the brand learns what riders respond to, ${b.public_name} can grow into more original rider-focused products, content, and experiences—always grounded in truth, never in invented scale.</p>
      </section>
      <section className="about-cta-row">
        <Link className="cta" href="/shop">Shop the gear</Link>
        <Link className="cta secondary" href="/journal">Read the journal</Link>
        <Link className="cta secondary" href="/suggest-a-design">Suggest a design</Link>
      </section>
    </div>
  );
}
`;
}

export function evaluateVentureMissionQc(brand: VentureBrandProfile): "PASS" | "FAIL" {
  const s = brand.mission.statement.toLowerCase();
  if (s.includes("sell motorcycle shirts") || s.length < 40) return "FAIL";
  if (!brand.mission.economic_alignment.length) return "FAIL";
  return "PASS";
}

export function evaluateMissionEconomicAlignmentQc(brand: VentureBrandProfile): "PASS" | "FAIL" {
  return brand.mission.economic_alignment.length >= 4 ? "PASS" : "FAIL";
}

export function evaluateBrandPositioningQc(brand: VentureBrandProfile): "PASS" | "FAIL" {
  return brand.positioning.summary.length > 20 && brand.positioning.for_whom.length > 10 ? "PASS" : "FAIL";
}

export function evaluateVentureVoiceQc(brand: VentureBrandProfile): "PASS" | "FAIL" {
  return brand.voice.traits.length >= 5 ? "PASS" : "FAIL";
}

export function evaluateBrandOsPrePublicBuildGate(brand: VentureBrandProfile | null): "PASS" | "FAIL" {
  if (!brand) return "FAIL";
  if (evaluateVentureMissionQc(brand) !== "PASS") return "FAIL";
  if (evaluateMissionEconomicAlignmentQc(brand) !== "PASS") return "FAIL";
  if (evaluateBrandPositioningQc(brand) !== "PASS") return "FAIL";
  if (evaluateVentureVoiceQc(brand) !== "PASS") return "FAIL";
  return "PASS";
}

export const CANONICAL_VENTURE_BUILD_ORDER = [
  "VENTURE VALIDATION",
  "ECONOMIC POSITIONING",
  "VENTURE BRAND OS",
  "OFFER ARCHITECTURE",
  "PUBLIC EXPERIENCE",
  "COMMERCE FACTORY",
  "CONTENT",
  "SALES",
  "GROWTH",
] as const;
