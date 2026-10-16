/**
 * Customer-facing night riding article — narrative editorial (headlight honesty, not stunt riding).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_AFTER_DARK_TOPIC: PageTopicBoundary = {
  page_id: "/journal/night-riding/how-to-ride-after-dark/",
  venture_id: "club-throttle",
  primary_topic: "riding after dark",
  primary_reader_job: "Ride after dark with honest headlight use, visibility, layers, fatigue awareness, and a clear postpone call.",
  must_cover: ["headlight", "visibility", "after dark", "visor", "layers", "fatigue", "postpone", "overdriving"],
  allowed_supporting: ["reflective gear", "known route", "passenger comfort", "streetwear under jacket"],
  out_of_scope_for_page: ["park once", "fabric weight", "size chart", "fake outlaw", "gap jump", "idle time", "repair-shop costume", "comparison table"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleAfterDarkV5Body() {
  const answer =
    "After dark, ride only when lights, visor clarity, layers, a road you know, and your own alertness all line up. Slow to what your headlight can honestly cover, tell someone the route, and postpone when visibility or fatigue says no.";

  const headings = [
    "Night riding is judged when you get home, not when you leave the lot",
    "Your headlight is a budget, not a brag",
    "Visor, glare, and the jacket you peel off at the gas station",
    "Surfaces, wildlife, and the speed you can actually stop for",
    "When postponing is the only honest call",
  ];

  const body = paragraphs([
    "You know the feeling: the lot looked fine under sodium lights, then the first unlit stretch turns your confidence into guesswork. That is when night riding stops being a vibe and starts being a visibility problem—judged when you get home with clean mirrors and a clear visor, not when someone revs for the parking-lot crowd. After dark is not a stunt category. It is the same machine with less margin: less time to see debris, less forgiveness for a dirty visor, and less room to outrun your own fatigue. Tell someone the route before you roll. If you cannot name where you are going and when you should be back, you are not ready—you are hoping.",
    "Your headlight is a budget, not a brag. Overdriving the beam means you are riding faster than you can stop for what the light actually shows—a gap jump in confidence, not spacing on the road. High beams help on empty straights; they blind oncoming drivers and wash out your own depth cues in rain. Low beam discipline on city streets is how you keep pedestrians and parked cars in the story. The mockup version of a night ride is a bright photo and a loud pipe; the real product review is whether you still had usable light on the last curve you did not know by heart.",
    "Peel off at the gas station and check the visor under real glare—not the fluorescent shop where you bought the helmet. A tinted visor that worked at noon can become a tunnel at 9 p.m. Clear beats cool when the alternative is guessing lane paint. Layers matter because cold hands lie about throttle control; humid summer nights fog a visor faster than you expect. Reflective gear is not fashion—it is the difference between a driver seeing a shape and seeing nothing until the headlight catches chrome.",
    "Surfaces change after dark: wet leaves, fresh oil, tar snakes, and wildlife on rural lines you memorized in daylight. Urban darkness hides potholes until your front wheel finds them; rural darkness hides deer until they are in the beam. Slow first, then decide if your following distance still matches your stopping distance. If you roll with a group, your obligation is your own light—if the pack outruns your beam, peel off rather than chase. Group-ride etiquette lives on a different page; this one stays on sight, layers, and fatigue.",
    "Postpone when fog closes the world, when you are already tired, when the visor will not stay clear, or when the route is unknown and unlit. No ride is worth proving you can hack it on a bad night. After you park, lot rules from bike-night etiquette take over; for wheels moving together, read group-ride etiquette. For what a shirt does under your jacket after the ride, read how riders choose a shirt. Club Throttle is culture and gear identity—not a substitute for lights that work and a pace that matches your beam.",
  ]);

  const faqs = [
    {
      question: "What is overdriving your headlight?",
      answer: "Riding faster than you can stop for obstacles your beam has not yet revealed—speed beyond your light budget.",
    },
    {
      question: "Should I use a tinted visor at night?",
      answer: "Usually no. Clear visors preserve contrast; tint that felt fine in daylight can hide lane paint after dark.",
    },
    {
      question: "When should I postpone a night ride?",
      answer: "When fatigue, fog, visor fog, unknown routes, or broken lights remove the margin you need to stop honestly.",
    },
  ];

  return { answer, headings, body, faqs };
}
