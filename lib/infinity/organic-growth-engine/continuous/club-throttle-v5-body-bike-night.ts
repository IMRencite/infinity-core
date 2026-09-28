/**
 * Customer-facing bike-night etiquette — V5 from-zero body (lot social norms, not night riding).
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
    "What a usable lot actually is",
    "Arrive and take one honest space",
    "Idle, exhaust, and the neighbors",
    "Talk that stays off the lot",
    "First-timers and consent",
    "Leave without inventing a new plan",
    "When the lot is full",
    "Hosts, staff, and posted hours",
    "Music, chairs, and walking paths",
    "Food runs and wet pavement",
    "Filming, touching, and sitting on bikes",
    "Overflow rows and sidewalk parking",
    "Common mistakes that kill a weeknight",
    "Where to go next inside Club Throttle",
    "Limits of lot etiquette",
  ];

  const body = paragraphs([
    "Bike-night etiquette is social, not mechanical. The lot is not a race grid and not a closed course. It is a shared slice of pavement where people park once, shut down, talk, and leave without trapping anyone behind a row of hot pipes. When that path stays open, the night stays worth repeating.",
    "A usable lot still has a walking path, a way out, and room for someone to roll a bike without asking six people to shuffle. If 40 percent of an aisle is blocked, the night has already failed even if the photos look good. Culture does not require hero parking angles—it requires a straight line from door to street.",
    "Arrive with time to take one honest space you can exit later. Do not block an aisle while you hunt for a prettier backdrop. The backdrop is not worth a stranger who cannot leave. Park once means you do not rebuild the row every twenty minutes for a better photo.",
    "Idle is the courtesy test. A 20 minute idle in a weeknight grocery row empties goodwill faster than loud pipes—shut down sooner. Shut the bike down when you are parked. Point exhaust away from doors and open windows. Neighbors and staff are part of the night even if they never sit on a bike.",
    "Race bait and stunt talk stay off the lot. Burnouts treated as content, illegal evasion stories, and dares to run a red on the way out are how a meet becomes a complaint. The pavement outside the lot is still public road—not a runway for whatever story got loud at idle.",
    "Ask before touching someone else’s bike. Ask before you sit on it. Ask before you film a person or a plate. The answer can be no, and no is complete. A first-timer who leaves early after a polite night still did etiquette right.",
    "Mocking a new rider or a new bike is how a weeknight loses people who would have come back. First-timer riders get the same ask-before-touch rule and no mock—humor at someone else's expense is not culture. If you cannot explain the lot rules in two sentences, you do not have etiquette—you have a vibe, and vibes do not keep aisles open.",
    "Leave the way you arrived. Do not make the last rider invent a new exit plan through a packed row. If you came with friends, name the departure before the conversation drifts. Wave. Roll. Leave the aisle cleaner than you found it.",
    "When the lot is full, leaving is etiquette. Circling for a hero spot is how a courtesy night turns into a show. If the only gap is the walking path, that gap is not yours. Compare stay or leave honestly: a loud lot with no path is a leave call, even if you already found friends.",
    "Staff who lock a lot at a posted hour are not the enemy. Leave before they have to ask twice. A host who argues with a closer is how a weeknight loses the space for the next month. Respect the clock on the door.",
    "Helmets on the ground in the walking path are clutter. Put them on a seat or a bench. A kickstand in the only exit line is the same fail as a bike parked across the aisle. People need a path more than they need a foreground prop.",
    "Music from a portable speaker is fine until it drowns a real question. Turn it down when someone is talking next to hot metal. Courtesy is volume, not a playlist brand. Conversation is the point; noise is optional.",
    "If two rows start facing each other with no center lane, split one row. Pride in a tight pack is how a tow truck gets called. Leave a bike-width of air even when the lot looks full. Photos can wait; exits cannot.",
    "A food run mid-meet is allowed. Blocking the door while six people wait for a bag is not. Send one person. Keep parked bikes where they are. Come back without rebuilding the row for a sandwich.",
    "When the lot is wet, take the first honest space even if it is farther from the door. Sliding a bike sideways for a dry patch is how you clip a neighbor. Slow roll-ins beat clever parking on slick paint.",
    "A weeknight grocery lot is still a business. Buying something if you occupy the row for an hour is not a brand rule—it is how the lights stay on next week. Gratitude keeps doors open longer than volume.",
    "Open the journal after the bikes are off if the talk turns to shirts or night riding. Keep this page on the lot while engines are running. Clothes arguments and headlight lectures belong elsewhere in Club Throttle.",
    "A folding chair in the only walk line is furniture in the wrong place. Move it. A cooler that blocks a rear tire is the same fail. Strollers, carts, and people on foot get the path first.",
    "If a rider shows up without working lights, they do not get a pass because the lot is lit. The ride home is still after dark. Point them at the night-riding note or they stay until they can see and be seen on the road.",
    "Vendors who set tables in a fire lane are not adding culture—they are adding a tow. Hosts should say no once, then move the table. A weeknight lot is not a festival grid.",
    "Count the exits before you count the bikes. One exit with a line of machines across it is a trap. Leave a bike-width of air at every way out, even if that costs you a pretty row.",
    "A compliment on a bike is welcome. A hand on a tank without asking is not. Etiquette is a sentence you can say to a stranger: park once, idle short, leave a lane, ask before you touch, skip race bait.",
    "When the posted close time hits, the meet is over. Lingering for one more photo is how a courtesy lot becomes a complaint. Wave. Roll. Thank the staff if someone held the door.",
    "A spilled drink in the walking path is your mess. Wipe it. A cigarette butt next to a fuel cap is worse. Etiquette includes the ground you stood on, not just the square you parked in.",
    "If two clubs show up the same night, the lot does not become a contest. Share the aisle. Skip the stare-down. A usable lot has room for people who do not wear the same mark.",
    "Ask the host where overflow goes before you invent a second row on the sidewalk. Sidewalk parking is how a weeknight meet loses the space. Stay or leave still beats clever overflow.",
    "When someone is packing up, give them the lane. Do not pin them in for one last conversation. Leaving is part of the etiquette. So is letting other people leave.",
    "A kid on a bicycle in the aisle is still a person on foot. Slow your roll-in. Etiquette is not only for motorcycles—it is for everyone who has to cross that lot.",
    "If the host cancels, leave. Do not invent a new meet in the same aisle. That is how a courtesy night becomes a surprise for the business that owns the lights.",
    "Gas already spent does not buy the aisle. Staying because you paid for fuel is how a blocked path gets defended. Leave when the path is gone—that is still etiquette.",
    "Sanctioned events that need running bikes for a labeled exit are a different category from a weeknight grocery row. Name the event or default to off. Rain on slick paint and a packed row are two honest reasons to leave early.",
    "Inspect the aisle before you take a space. A short bike-night checklist fits in your pocket: park once, keep idle short, leave a lane, ask before touching, skip race bait. If you cannot walk a straight line from door to street, the meet already failed the usable-lot test.",
    "What bike-night etiquette keeps a lot usable is the walking path, the exit lane, short idle, consent before touch or film, and talk that stays off race bait. Everything else is detail on those five ideas.",
    "Meet culture in a lot is public. Garage culture after the ride is invited. Do not run garage rules in a grocery row. Do not run lot rules as if they were a closed course. Read garage culture when the hour moves indoors.",
    "If wheels start moving as a pack, lot rules end and group-ride etiquette begins. This page owns stationary bikes in a shared lot—not spacing on the street, not the night-riding note, and not the shirt article.",
    "Club Throttle builds streetwear for nights that end with the bike on the stand. Browse the shop or After Dark collection when you want graphics for the hour after—not as a substitute for keeping the lot usable tonight.",
    "Related reads stay inside the brand: garage culture for the invited hour after the ride, group-ride etiquette when wheels roll together, and how to ride after dark for the trip home. Use internal links below when you want culture after lot rules.",
    "Public safety guidance from NHTSA still applies when bikes mix with cars and people on foot. It is not a club rulebook—it is a reminder that a lot is still a public space with pedestrians.",
    "This article is social etiquette, not legal advice and not a club constitution. Local lots have their own rules. If a host asks you to move, move. If a sign says no motorcycles, believe the sign.",
    "Write idle minutes and aisle width in your head before stories start. A running bike in a packed aisle is pressure, not conversation. Shut it down. Then talk.",
    "First-timer riders get the same ask-before-touch rule as veterans. A host who cannot say that sentence should not host. Etiquette is repeatable, not charismatic.",
    "Race bait stays off the pavement when you leave. The lot is social, not a show. If someone wants a street pack, they leave lot rules behind and pick up group-ride habits on the road.",
    "When two rows argue over center space, the host splits a row or ends the meet. Pride in density is how complaints get photographed. Leave air even when the lot looks full.",
    "A wet start and a full lot are edge cases that favor leaving early. Courtesy nights survive because people choose the boring exit over the dramatic one.",
    "If you cannot explain bike-night etiquette in one breath—park once, idle short, leave a lane—you are occupying, not hosting. Hosts name the rule; guests follow it.",
    "After the last bike leaves, the lot should look like a lot again. That is the test. Photos are optional; paths are not.",
    "Bike-night etiquette that keeps the lot from turning into a show is park once, keep idle short, leave a lane, ask before you touch, skip race bait, and leave while others still can. Repeat that card until it is boring—that is when the night works.",
  ]);

  const faqs = [
    {
      question: "What if the lot is full?",
      answer: "Leave. A full lot is a stay-or-leave call, and blocking the walking path is never the answer.",
    },
    {
      question: "How long can I idle at a bike night?",
      answer: "Long enough to park and roll off if needed—not long enough to heat the row or annoy neighbors.",
    },
    {
      question: "Can I film bikes without asking?",
      answer: "Ask first. The answer can be no, and no is complete etiquette.",
    },
    {
      question: "Is race talk okay if we stay in the lot?",
      answer: "No. Race bait and stunt stories stay off the lot—they turn a social meet into a show.",
    },
    {
      question: "What should a first-timer know?",
      answer: "Same rules as everyone else: one space, short idle, open path, ask before touch, skip drama.",
    },
    {
      question: "Does this page cover riding after dark?",
      answer: "No. Headlights, layers, and fatigue on the road live in the night-riding note; this page owns the lot.",
    },
  ];

  return { answer, headings, body, faqs };
}
