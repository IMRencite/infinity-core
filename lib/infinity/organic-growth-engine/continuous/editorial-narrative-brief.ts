/** Pre-draft narrative brief — prevents module sprawl before body generation. */
export type EditorialNarrativeBrief = {
  target_reader: string;
  core_thesis: string;
  reader_tension: string;
  opening_scene: string;
  reader_belief_before: string;
  belief_change: string;
  strong_points: string[];
  main_scenario: string;
  turning_point: string;
  practical_payoff: string;
  ending_callback: string;
  shareable_insight: string;
  cut_or_defer: string[];
  archetype:
    | "STORY_LED_FEATURE"
    | "OPERATOR_SCENARIO"
    | "MYTH_BUSTING"
    | "COMPARISON"
    | "DECISION_FRAMEWORK"
    | "ANALYSIS"
    | "CULTURE_EDITORIAL";
};

export const CLUB_THROTTLE_SHIRT_NARRATIVE_BRIEF: EditorialNarrativeBrief = {
  target_reader: "Rider buying graphic streetwear for bike nights and ride-home comfort",
  core_thesis: "The shirt is judged after the jacket comes off, through the ride, and after the first wash—not at checkout.",
  reader_tension: "Wasting money on a design you stop wearing because the blank fails in real use",
  opening_scene: "Gas-station mirror, jacket off, collar and hem betray the mockup",
  reader_belief_before: "If the graphic looks good online, the shirt is probably fine",
  belief_change: "Mockups hide fit, collar, fabric drape, and wash behavior",
  strong_points: [
    "The graphic gets you to click; the collar decides whether you keep wearing it",
    "The first wash is the real product review",
    "A shirt that only looks right standing still was designed for a mockup, not a rider",
  ],
  main_scenario: "Bike night from checkout through ride home to first laundry",
  turning_point: "Parking-lot visibility and bar-reach expose placement and hem",
  practical_payoff: "Keep / exchange / return rule tied to construction, not hype",
  ending_callback: "Return to the gas-station mirror with a clear keep-or-return decision",
  shareable_insight: "You do not judge the shirt when you buy it—you judge it when the jacket comes off",
  cut_or_defer: ["Separate micro-H2 per fabric fact", "FAQ repeats of body", "Checklist-style headings"],
  archetype: "STORY_LED_FEATURE",
};
