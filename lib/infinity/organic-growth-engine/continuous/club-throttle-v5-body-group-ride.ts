/**
 * Customer-facing group-ride etiquette — narrative editorial (street spacing and signals, not a race).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_GROUP_RIDE_TOPIC: PageTopicBoundary = {
  page_id: "/journal/rides/group-ride-etiquette/",
  venture_id: "club-throttle",
  primary_topic: "group ride etiquette",
  primary_reader_job: "Run a street group with staggered spacing, signals, shared fuel stops, and a clean wave-off—not a race.",
  must_cover: ["group-ride etiquette", "staggered", "signal", "two-second", "sweep", "fuel stop", "wave off", "not a race"],
  allowed_supporting: ["lead rider", "night group", "mixed bikes", "hand signals"],
  out_of_scope_for_page: ["fabric weight", "GSM", "size chart", "park once", "idle time", "fake outlaw", "repair-shop costume"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleGroupRideV5Body() {
  const answer =
    "A street group ride works when someone leads who knows the route, someone sweeps who will look back, fuel stops are shared, and every rider keeps a real two-second gap. It is culture on the move—not a race, not a flex, and not a reason to invent hand signals in a blind corner.";

  const headings = [
    "The ride starts before anyone rolls the throttle",
    "Staggered spacing is how strangers stay friends",
    "Lead, sweep, fuel, and the wave-off everyone can see",
    "When the pack gets loud, the slowest honest pace wins",
    "After the last bike parks, the group ride is actually over",
  ];

  const body = paragraphs([
    "You know the scene: six bikes in a lot, sodium lights turning chrome orange, and someone already inching toward the exit like the green is a starting flag. That is when group-ride etiquette stops being etiquette and starts being damage control—judged when the last rider gets home, not when someone wins the first sprint to the highway. Before the first wheel crosses the line, name three things out loud—the route, the sweep, and the fuel stop. If the room cannot repeat them, you are a cluster with matching exhaust notes, not a group. The lead is not the loudest rider or the newest purchase; it is whoever already knows the turns and will hold a pace the whole pack can keep without gap-jumping to look fast. Peel off your jacket at the gas station if you need to, but do not peel off the plan because someone got bored waiting.",
    "Staggered formation sounds like parade drill until you need it on a humid night with glare in every mirror. The two-second gap is simple math with metal attached: if the bike ahead crosses a painted line or hits a pothole, you still have time to see it and steer. Closing that gap to send a message is a gap jump—unsafe for you, unfair to the rider behind you, and the fastest way to turn a social ride into an argument at the next red. Signal early and big on straights where mirrors actually work—slow, hazard, peel-off—same three every time. Sit, reach for the clutch like you mean it, and watch your chest pull and your hem climb; that is the bar-reach check your formation should survive without anyone touching handlebars they do not own. A cute fourth signal invented mid-corner is noise; ignore it and hold your line.",
    "Sweep is a job, not a consolation prize for the rider who showed up last. That person looks back on purpose, counts bikes at every stop, and is the one who notices when someone peeled off without a wave. Fuel stops are part of the route, not a surprise for whoever is on reserve—say range at the curb under lot lights, because hiding it turns the last rider into a scavenger hunt at an exit ramp. When you leave, wave off at a planned point so sweep is not hunting a ghost. The group ride does not end when the lead parks in front of a bar; it ends when the last rider is accounted for and someone sends a one-line close so people who were not there do not chase a dead route. That is the difference between a ride home together and a rumor with taillights.",
    "Mixed bikes and mixed egos show up on every good ride. A smaller displacement machine sets the honest pace; the loud bike that cannot live with that leaves with a wave-off, not a lecture from the lead. City loops and country roads need different speeds even with the same formation—say which you are before you roll. Rotating lead on a long day is fine if every new lead knows the route and agrees to the same gap; rotation is not permission to gap-jump because you are bored. Interstate merges are not where you rebuild staggered spacing—get through, find a straight, reset the gap, and ignore anyone who treats cones like a slalom course. Night groups add one non-negotiable: every tail lamp works before the first mile. One dead light makes the whole formation harder for cars to read, and sweep should wave that rider home before the pack pretends visibility is optional.",
    "When someone goes down, the street is still a street: shoulder, space, one person calls, nobody forms a circle in a live lane. Phones stay pocketed until fuel; filming from the middle of a pack is a moving hazard. Rain mid-ride is a split test—slow first, then decide whether sweep can still see the last bike. NHTSA and IIHS visibility guidance is public context for lights and gear—it does not bless racing, and this page will not teach evasion or street racing as a method to copy. After kickstands go down, lot rules take over; do not drag staggered spacing into a grocery aisle. For parking meets without a moving route, read bike-night etiquette. For headlight discipline on night packs, read how to ride after dark. Club Throttle cares about groups because culture rides home together sometimes—the real product review of a group ride is after the ride, when everyone is accounted for. Browse the shop when you want graphics for that parking-lot debrief, not as a substitute for naming sweep before anyone rolls.",
  ]);

  const faqs = [
    {
      question: "Who should lead a street group?",
      answer: "Someone who already knows the route and will hold a pace the pack can keep—not the newest or loudest bike.",
    },
    {
      question: "What is the two-second gap for?",
      answer: "So you still have time to react to what the bike ahead hits; closing it to look fast is a gap jump.",
    },
    {
      question: "How do I leave without drama?",
      answer: "Wave off at a planned point so sweep knows you are gone.",
    },
  ];

  return { answer, headings, body, faqs };
}
