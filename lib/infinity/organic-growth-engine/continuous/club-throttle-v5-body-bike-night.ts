/**
 * Customer-facing bike-night etiquette — narrative editorial (lot social norms, not night riding).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_BIKE_NIGHT_TOPIC: PageTopicBoundary = {
  page_id: "/journal/culture/bike-night-etiquette/",
  venture_id: "club-throttle",
  primary_topic: "bike night etiquette",
  primary_reader_job: "Use a weeknight lot without blocking paths, annoying neighbors, or turning a meet into a show.",
  must_cover: ["park once", "idle", "lane", "race bait", "first-timer", "arrive", "leave", "exhaust"],
  allowed_supporting: ["host rules", "stay or leave", "ask before touching", "filming consent"],
  out_of_scope_for_page: ["headlight reach", "overdriving", "fabric weight", "GSM", "staggered formation", "two-second gap", "abrasion rating"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleBikeNightV5Body() {
  const answer =
    "Bike-night etiquette is park once, keep idle short, leave a lane, and skip race bait. The lot stays usable when people treat it as social space, not a stage or a street race briefing.";

  const headings = [
    "The lot is social space, not a runway",
    "Park once and leave a lane someone can walk",
    "Idle, exhaust, and the neighbors who never asked",
    "Talk that gets a meet shut down",
    "First-timers, filming, and the leave that does not trap anyone",
  ];

  const body = paragraphs([
    "You know the weeknight scene: twenty bikes, one grocery row, sodium glare on chrome, and someone revving like the parking lot owes them a crowd. That is when bike-night etiquette stops being manners and starts being damage control—judged when the last rider leaves without a complaint call, not when the loudest pipe wins idle. The lot is not a race grid. It is shared pavement where people park once, shut down, talk, and roll out without trapping a stranger behind a wall of hot metal. Peel off your jacket at the gas station if you need to, but do not peel off the rule that aisles stay walkable. When the walking path stays open, the night stays worth repeating; when the aisle dies, the meet dies with it even if the photos looked great under lot lights.",
    "Arrive with time to take one honest space you can exit later. Do not block an aisle while you hunt for a prettier backdrop—the backdrop is not worth a parent who cannot reach their car. Park once means you do not rebuild the row every twenty minutes for a better angle. Peel off your jacket if you want, but peel off the fantasy that culture requires hero parking. A usable lot still has a straight line from door to street; if forty percent of that line is bikes, you already failed etiquette before anyone opened their mouth.",
    "Idle is the courtesy test that neighbors feel first. A twenty-minute idle in a weeknight row empties goodwill faster than loud pipes—shut down sooner. Point exhaust away from doors and open windows. Staff and apartment windows are part of the night even if they never sit on a bike. Humid summer air makes exhaust hang under the awning; that is your clue to kill the engine sooner, not rev for the camera. The mockup version of bike night is revving for content; the real product review is whether anyone can still shop after you leave. If you would not run a leaf blower at that hour, you should not run a parade of hot pipes either.",
    "Race bait, stunt stories, and dares to run the next red are how a meet becomes a complaint. Burnouts treated as content, illegal evasion brags, and flex about who can gap-jump out of the lot are not culture—they are eviction notices written in exhaust. Keep that talk off the pavement. When wheels start moving as a pack, lot rules end and group-ride etiquette begins; this page owns stationary bikes in a shared lot, not spacing on the street.",
    "Ask before you touch someone else's bike, before you sit on it, before you film a face or a plate. No is a complete answer. A first-timer who leaves early after a polite night still did etiquette right; mocking a new rider is how a weeknight loses people who would have come back. Leave without inventing a new plan—start the bike, roll slow, and do not rebuild the row as you go. For culture after the lot, read garage culture; for wheels rolling together, read group-ride etiquette; for the ride home, read how to ride after dark. Browse the shop when you want graphics for after the meet, not as a substitute for shutting down at idle.",
  ]);

  const faqs = [
    {
      question: "How long should I idle at a bike night?",
      answer: "Long enough to park and settle, then shut down—extended idle in a shared row is the fastest way to lose the lot.",
    },
    {
      question: "Can I film everyone at the meet?",
      answer: "Ask first. Filming without consent turns a social lot into a stage people did not agree to join.",
    },
    {
      question: "What talk should stay off the lot?",
      answer: "Race bait, stunt dares, and illegal evasion stories—they get meets shut down, not celebrated.",
    },
  ];

  return { answer, headings, body, faqs };
}
