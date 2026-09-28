export const APPAREL_CREATIVE_DIRECTOR = "ApparelCreativeDirector" as const;

export type ApparelCreativeBrief = {
  venture: "Club Throttle";
  product_territory: string;
  target_rider: string;
  customer_emotion: string;
  cultural_moment: string;
  core_visual_idea: string;
  front_composition: string;
  back_composition: string;
  art_direction: string;
  subject: string;
  perspective: string;
  lighting: string;
  color_palette: string;
  texture: string;
  print_character: string;
  garment_color: string;
  garment: "heavyweight tee" | "oversized hoodie";
  distance_readability: string;
  brand_integration: string;
  negative_requirements: string[];
  ip_constraints: string[];
};

export type ApparelCreativeDirection = {
  id: string;
  title: string;
  energy: string;
  scene: string;
  composition: string;
  subject: string;
  art_treatment: string;
  brief: ApparelCreativeBrief;
};

const SHARED_NEGATIVES = [
  "T-shirt mockup",
  "person wearing a shirt",
  "clothing catalog photo",
  "hanger",
  "blank garment",
  "generic biker skulls",
  "fake outlaw club imagery",
  "Harley logos",
  "race-team marks",
  "clip-art motorcycles",
  "primitive geometric mountains",
  "generic highway lines",
  "AI wallpaper",
  "text-only POD graphic",
  "CT inside a white square",
];

const SHARED_IP = [
  "no competitor graphics",
  "no ASIN artwork",
  "no manufacturer branding",
  "no race-team art",
  "no protected characters",
];

function afterDarkBrief(idea: Partial<ApparelCreativeBrief>): ApparelCreativeBrief {
  return {
    venture: "Club Throttle",
    product_territory: "After Dark",
    target_rider: "Night commuters and riders who leave after the lights go down",
    customer_emotion: "The road opens when the city thins out",
    cultural_moment: "Midnight pavement, wet asphalt, machines still warm",
    core_visual_idea: idea.core_visual_idea ?? "A cinematic night-ride scene designed as a large back print",
    front_composition: idea.front_composition ?? "Small coordinated emblem derived from the back scene, chest-left, no white CT box",
    back_composition: idea.back_composition ?? "Primary expressive illustration, vertical, strong silhouette from several feet away",
    art_direction: idea.art_direction ?? "Premium vintage poster / cinematic streetwear illustration",
    subject: idea.subject ?? "Realistic motorcycle and rider environment",
    perspective: idea.perspective ?? "Dramatic editorial camera, not a catalog three-quarter product shot",
    lighting: idea.lighting ?? "Night sodium, wet reflection, controlled highlights",
    color_palette: idea.color_palette ?? "Asphalt black, warm paper, throttle red, chrome, sodium gold",
    texture: idea.texture ?? "Ink, grain, wet pavement, print-ready contrast on black fabric",
    print_character: idea.print_character ?? "Screenprint-aware, limited palette, readable silhouette",
    garment_color: "black",
    garment: "heavyweight tee",
    distance_readability: "Focal point must read at a bike-length",
    brand_integration: "Club Throttle language without fake club marks or manufacturer logos",
    negative_requirements: SHARED_NEGATIVES,
    ip_constraints: SHARED_IP,
    ...idea,
  };
}

export function afterDarkCreativeDirections(): ApparelCreativeDirection[] {
  return [
    {
      id: "after-dark-neon-city-run",
      title: "Neon City Run",
      energy: "wet, fast, graphic",
      scene: "Rain-dark city corner at midnight",
      composition: "Vintage poster, large back print, rider silhouetted through a lean",
      subject: "Motorcycle leaned through wet reflections and streetlight geometry",
      art_treatment: "Premium vintage poster, limited ink, strong graphic shapes",
      brief: afterDarkBrief({
        core_visual_idea: "A motorcycle leaned through a rain-dark city corner at midnight, reflections stretching across wet pavement",
        art_direction: "Premium vintage poster composition designed as a large back print",
        perspective: "Low corner lean, headlights and streetlights as graphic shapes",
        lighting: "Wet pavement speculars, sodium and cold neon, rider partially silhouetted",
      }),
    },
    {
      id: "after-dark-midnight-mountain",
      title: "Midnight Mountain",
      energy: "quiet, vast, inked",
      scene: "Mountain road disappearing at night",
      composition: "Rear three-quarter, large moon, sweeping road, dramatic negative space",
      subject: "Rider leaving into a night mountain road",
      art_treatment: "Restrained ink palette, screenprint-inspired illustration",
      brief: afterDarkBrief({
        core_visual_idea: "Rear three-quarter view of a rider disappearing into a mountain road at night under a large moon",
        art_direction: "Screenprint-inspired illustration with dramatic negative space",
        perspective: "Rear three-quarter, road sweeping away",
        lighting: "Moon rim light, dark valley, restrained highlights",
      }),
    },
    {
      id: "after-dark-gas-station",
      title: "Gas Station After Hours",
      energy: "still, communal, cinematic",
      scene: "Nearly empty gas station under fluorescent canopy",
      composition: "Several motorcycles gathered, machines cooling, tall apparel frame",
      subject: "Rider community after the ride, not a repair costume",
      art_treatment: "Cinematic Americana, print-aware contrast",
      brief: afterDarkBrief({
        core_visual_idea: "Several motorcycles gathered under a fluorescent canopy of a nearly empty late-night gas station",
        art_direction: "Cinematic Americana atmosphere with a strong apparel silhouette",
        perspective: "Across-the-forecourt, canopy light as a stage",
        lighting: "Harsh fluorescent canopy, deep night beyond, chrome catchlights",
      }),
    },
  ];
}

export function compileGrokApparelPrompt(input: {
  direction: ApparelCreativeDirection;
  placement: "front" | "back";
}): string {
  const brief = input.direction.brief;
  if (/make a cool motorcycle shirt/i.test(input.direction.brief.core_visual_idea)) {
    throw new Error("CREATIVE_DIRECTOR_REJECTED_SHALLOW_PROMPT");
  }
  return [
    `VENTURE: ${brief.venture}.`,
    "MEDIUM: purpose-built premium apparel illustration. Generate the ARTWORK ITSELF.",
    `GARMENT CONTEXT: ${brief.garment} in ${brief.garment_color}. Do not draw the garment.`,
    `PLACEMENT: ${input.placement === "back" ? "large back print, primary expressive design, vertical composition" : "coordinated smaller front treatment, chest emblem derived from the back concept"}.`,
    `TERRITORY: ${brief.product_territory}. DIRECTION: ${input.direction.title}.`,
    `SUBJECT: ${input.direction.subject}. SCENE: ${input.direction.scene}.`,
    `CULTURAL CONTEXT: ${brief.cultural_moment}. EMOTION: ${brief.customer_emotion}.`,
    `COMPOSITION: ${input.placement === "back" ? brief.back_composition : brief.front_composition}.`,
    `ART DIRECTION: ${input.direction.art_treatment}. PERSPECTIVE: ${brief.perspective}.`,
    `LIGHTING: ${brief.lighting}. PALETTE: ${brief.color_palette}. TEXTURE: ${brief.texture}.`,
    `PRINT CHARACTER: ${brief.print_character}. DISTANCE: ${brief.distance_readability}.`,
    `BRAND: ${brief.brand_integration}.`,
    `AVOID: ${brief.negative_requirements.join("; ")}.`,
    `IP: ${brief.ip_constraints.join("; ")}.`,
    "No readable competitor text, no logos, no watermarks, no shirt mockup, no hanger, no model wearing clothes.",
  ].join(" ");
}

export function rejectShallowApparelPrompt(prompt: string): "REJECT" | "ACCEPT" {
  return /make a cool motorcycle shirt/i.test(prompt) ? "REJECT" : "ACCEPT";
}

export function plannedCapsuleDirections(): Record<string, ApparelCreativeDirection[]> {
  return {
    "After Dark": afterDarkCreativeDirections(),
    Redline: [
      { id: "redline-tach", title: "Needle in the Red", energy: "tense, mechanical", scene: "Close tachometer entering the red at night", composition: "Instrument as poster hero, vertical", subject: "A real analog tach and a gloved hand, not a clip-art speedo", art_treatment: "Modern street-machine poster", brief: afterDarkBrief({ product_territory: "Redline", core_visual_idea: "The instant the needle kisses red on a night street, not a race-team replica", garment: "heavyweight tee" }) },
      { id: "redline-brake", title: "Heat in the Rotor", energy: "hot, metallic", scene: "Glowing rotor after a hard stop", composition: "Tight mechanical still life as back print", subject: "Brake heat and night air", art_treatment: "Industrial illustration, limited ink", brief: afterDarkBrief({ product_territory: "Redline", core_visual_idea: "Heat leaving a rotor after a night stop", garment: "heavyweight tee" }) },
      { id: "redline-empty-lane", title: "Empty Lane", energy: "fast, sparse", scene: "One rider owning an empty night arterial", composition: "Long road, small rider, large sky", subject: "Speed without a race logo", art_treatment: "Cinematic motion grounded in a real motorcycle", brief: afterDarkBrief({ product_territory: "Redline", core_visual_idea: "An empty night lane and a real motorcycle at speed", garment: "heavyweight tee" }) },
    ],
    "Open Road": [
      { id: "open-road-dawn", title: "Two-Lane Dawn", energy: "wide, patient", scene: "Dawn two-lane with a loaded motorcycle", composition: "Horizontal journey cropped into a tall back print", subject: "Road-trip Americana without manufacturer marks", art_treatment: "Travel poster, inked horizon", brief: afterDarkBrief({ product_territory: "Open Road", garment: "oversized hoodie", core_visual_idea: "A loaded motorcycle on a two-lane at first light" }) },
      { id: "open-road-motel", title: "Last Vacancy", energy: "still, neon-quiet", scene: "Motorcycles outside a night motel office", composition: "Americana still, porch light as stage", subject: "Overnight on the road", art_treatment: "Cinematic Americana", brief: afterDarkBrief({ product_territory: "Open Road", garment: "oversized hoodie", core_visual_idea: "Bikes cooling outside a night motel, not a cartoon neon sign" }) },
      { id: "open-road-map", title: "Unfolded Miles", energy: "tactile, analog", scene: "Gloved hands and a paper map on a tank", composition: "Intimate still life, tall crop", subject: "Analog navigation before the next tank", art_treatment: "Print-aware still life", brief: afterDarkBrief({ product_territory: "Open Road", garment: "oversized hoodie", core_visual_idea: "A paper map on a warm tank, gloves still on" }) },
    ],
    "Garage Culture": [
      { id: "garage-close", title: "After the Ride", energy: "communal, low", scene: "Garage door half open, bikes in from the night", composition: "Interior stage, tall frame", subject: "People staying after the ride", art_treatment: "Warm tungsten illustration", brief: afterDarkBrief({ product_territory: "Garage Culture", garment: "oversized hoodie", core_visual_idea: "A working garage after the ride, not a repair costume" }) },
      { id: "garage-bench", title: "Tools Down", energy: "quiet, earned", scene: "A bench at rest, helmets, one open bay", composition: "Still life as back print", subject: "The social garage", art_treatment: "Restrained ink, tungsten", brief: afterDarkBrief({ product_territory: "Garage Culture", garment: "oversized hoodie", core_visual_idea: "Tools down, helmets on the bench, night still in the doorway" }) },
      { id: "garage-lot", title: "Kickstands Still Down", energy: "social, parked", scene: "Bikes lined in a gravel lot before anyone talks", composition: "Wide lot cropped tall", subject: "Meetup culture without outlaw marks", art_treatment: "Documentary poster", brief: afterDarkBrief({ product_territory: "Garage Culture", garment: "oversized hoodie", core_visual_idea: "The lot before the conversation, kickstands still down" }) },
    ],
    "Throttle Core": [
      { id: "core-mark", title: "Machine Mark", energy: "emblematic, dense", scene: "An original Club Throttle machine emblem built from a real motorcycle silhouette", composition: "Centered emblem with breathing room", subject: "Original brand machine mark, no CT white square", art_treatment: "Heritage badge illustration", brief: afterDarkBrief({ product_territory: "Throttle Core", core_visual_idea: "An original machine emblem drawn from a believable motorcycle, not CT in a box" }) },
      { id: "core-gloves", title: "Left-Hand Throttle", energy: "close, tactile", scene: "A gloved throttle hand at night", composition: "Tight crop, strong silhouette", subject: "The control that names the brand", art_treatment: "Ink and grain close-up", brief: afterDarkBrief({ product_territory: "Throttle Core", core_visual_idea: "A real gloved throttle hand as a compact graphic idea" }) },
      { id: "core-lane", title: "Keep the Lane", energy: "forward, simple", scene: "A rider holding a night lane with discipline", composition: "Rear view, road as a single graphic", subject: "Control, not chaos", art_treatment: "Limited-palette poster", brief: afterDarkBrief({ product_territory: "Throttle Core", core_visual_idea: "Discipline in a night lane, readable from a bike-length" }) },
    ],
    "Last Light": [
      { id: "last-light-ridge", title: "Gold on the Ridge", energy: "dusk, long", scene: "A rider on a ridge as the last sun leaves the road", composition: "Wide sky, small machine, tall crop", subject: "Dusk ride, not midnight After Dark", art_treatment: "Warm dusk illustration", brief: afterDarkBrief({ product_territory: "Last Light", core_visual_idea: "Last usable light on a ridge road" }) },
      { id: "last-light-harbor", title: "Harbor Close", energy: "coastal, cooling", scene: "Motorcycles by a harbor as lamps come on", composition: "Water, lamps, machines", subject: "Coast evening without tourist clip-art", art_treatment: "Quiet cinematic", brief: afterDarkBrief({ product_territory: "Last Light", core_visual_idea: "Harbor lamps coming on as bikes cool" }) },
      { id: "last-light-shadow", title: "Long Shadow", energy: "graphic, spare", scene: "A motorcycle throwing a long dusk shadow across pavement", composition: "Shadow as the design, machine as the source", subject: "Silhouette readability", art_treatment: "High-contrast print", brief: afterDarkBrief({ product_territory: "Last Light", core_visual_idea: "A long dusk shadow that still reads as a real motorcycle" }) },
    ],
  };
}
