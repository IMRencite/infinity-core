import type { OrganicDraft } from "./quality";

export type ContentArchetype =
  | "STORY_LED_GUIDE"
  | "MISTAKES"
  | "COMPARISON"
  | "MYTH_BUSTING"
  | "CULTURE_EDITORIAL"
  | "EXPERIENCE_GUIDE"
  | "BUYERS_GUIDE";

export type VentureEditorialProfile = {
  venture_id: string;
  audience: string;
  sophistication: "ENTHUSIAST" | "OPERATOR" | "MIXED";
  personality: string[];
  humor_level: "LOW" | "MEDIUM" | "NONE";
  scenario_library: string[];
  emotional_drivers: string[];
  jargon_tolerance: "LOW" | "MEDIUM" | "HIGH";
  archetypes: ContentArchetype[];
  commercial_intensity: "LOW" | "MEDIUM" | "HIGH";
  forbidden_cliches: RegExp[];
  voice_boundaries: string[];
};

export const CLUB_THROTTLE_EDITORIAL_PROFILE: VentureEditorialProfile = {
  venture_id: "club-throttle",
  audience: "Motorcycle riders and motorcycle-culture enthusiasts",
  sophistication: "ENTHUSIAST",
  personality: ["observant", "practical", "conversational", "enthusiast-first"],
  humor_level: "LOW",
  scenario_library: [
    "gas station",
    "bike night",
    "parking lot",
    "garage",
    "late ride",
    "group ride",
    "jacket",
    "handlebars",
    "humid",
    "diner",
  ],
  emotional_drivers: ["identity", "comfort after the ride", "looking intentional off the bike"],
  jargon_tolerance: "LOW",
  archetypes: ["STORY_LED_GUIDE", "MISTAKES", "COMPARISON", "BUYERS_GUIDE", "CULTURE_EDITORIAL"],
  commercial_intensity: "MEDIUM",
  forbidden_cliches: [
    /freedom of the open road/i,
    /born to ride/i,
    /two wheels one soul/i,
    /throttle therapy/i,
    /outlaw lifestyle/i,
    /brotherhood of the road/i,
  ],
  voice_boundaries: ["No fake first-person riding claims unless attributed to a named human author"],
};

export const OCCUPANCY_EDITORIAL_PROFILE: VentureEditorialProfile = {
  venture_id: "occupancynpv",
  audience: "Commercial real estate operators, tenants, and finance-minded decision makers",
  sophistication: "OPERATOR",
  personality: ["direct", "numbers-aware", "risk-conscious"],
  humor_level: "NONE",
  scenario_library: [
    "lease renewal",
    "operating budget",
    "landlord negotiation",
    "CAM reconciliation",
    "tenant improvement",
    "cap rate conversation",
  ],
  emotional_drivers: ["money at stake", "avoiding surprise costs", "defensible decisions"],
  jargon_tolerance: "HIGH",
  archetypes: ["COMPARISON", "MISTAKES", "BUYERS_GUIDE", "EXPERIENCE_GUIDE"],
  commercial_intensity: "MEDIUM",
  forbidden_cliches: [/unlock your potential/i, /in today's fast-paced/i],
  voice_boundaries: ["No motorcycle lifestyle voice", "No enthusiast slang"],
};

export function resolveVentureEditorialProfile(draft: OrganicDraft): VentureEditorialProfile | null {
  const venture = draft.origin?.includes("clubthrottle")
    ? "club-throttle"
    : draft.canonical?.includes("clubthrottle")
      ? "club-throttle"
      : draft.origin?.includes("occupancynpv") || draft.canonical?.includes("occupancynpv")
        ? "occupancynpv"
        : null;
  if (venture === "club-throttle") return CLUB_THROTTLE_EDITORIAL_PROFILE;
  if (venture === "occupancynpv") return OCCUPANCY_EDITORIAL_PROFILE;
  return null;
}
