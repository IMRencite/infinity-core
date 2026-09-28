/**
 * Customer-facing night riding article — V5 from-zero body (not bike-night lot etiquette).
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
    "Why night riding feels different",
    "Seeing versus being seen",
    "Headlight reach and overdriving the beam",
    "Dark adaptation and glare",
    "Visors: clear, tinted, and clean",
    "Surface, debris, and wildlife at night",
    "Layers and temperature after sunset",
    "Fog, rain, and visor fogging",
    "Fatigue and reaction time",
    "Urban darkness versus rural darkness",
    "Speed, stopping distance, and following room",
    "Pre-ride checks that matter at night",
    "When postponing is the right call",
    "Passengers and pillion comfort",
    "Group pace versus your own light",
    "Where to go next inside Club Throttle",
    "Limits of this night-riding note",
  ];

  const body = paragraphs([
    "Night riding changes the math. Daylight gives you depth cues, color, and peripheral context. After sunset you trade all of that for a cone of headlight and whatever the street throws into it. Club Throttle cares about night rides because so much of the culture—late roll-outs and rides home after a meet—happens when the sun is gone. The goal is not to perform after dark. It is to arrive with the same machine and the same rider you left with.",
    "Reduced visibility is the headline. Your eyes need time to adapt. Pupils widen, contrast can drop by roughly 30 percent in the first minutes after you leave a bright room, and oncoming glare can flash-blind you for seconds. That is physiology, not weakness. Give yourself a few minutes of low light before you roll if you came straight from a lit space. If you hop on immediately, your first mile is effectively blind compared to what you will see ten minutes later.",
    "Being seen matters as much as seeing. Drivers scanning an intersection often look for car-sized motion. A single headlight can disappear against a clutter of taillights. Reflective material on a jacket or helmet helps, and a working taillight is non-negotiable. High-visibility is a signal that you occupy space on the road. Pair visibility with predictable speed and lane position so others can plan around you.",
    "Headlight reach defines your honest speed. Throw distance varies with bulb type, lens condition, and alignment. A mis-aimed beam can light the treetops while leaving the pavement gray. Check that the hot spot sits on the road ahead, not in oncoming eyes. If you cannot see tar patches, painted lines, or a cardboard box in time to brake, you are overdriving the headlight regardless of what the speed limit sign says.",
    "Glare from oncoming cars is a night-specific hazard. Look toward the right edge of your lane when a high beam hits you, not into the center of the glare. Anti-glare coatings on visors help only if the visor is clean; scratches scatter light and make halos worse. Slow slightly before crests where you know oncoming traffic sits on the same sight line.",
    "Dark adaptation also means shadows hide depth. A pothole that would be obvious at noon becomes a jolt at night. Painted arrows and lane lines fade. Fresh asphalt can look wet and wet asphalt can look flat. Ride with softer inputs: roll off the throttle earlier, brake in two stages, and leave extra margin before turns.",
    "Visor condition is an underrated prep step. Bugs, dust, and fingerprint smear turn oncoming lights into starbursts. Clean the shield before you helmet up, carry a small cloth, and stop if rain starts streaking. Tinted visors that feel fine at dusk can feel like sunglasses in a tunnel once you leave streetlit blocks. For true dark-country miles, clear beats cool.",
    "Road-surface visibility includes gravel on shoulders, sand at construction zones, and metal plates that flash once and disappear. Urban nights add oil patches at lights and pedestrians stepping between parked cars. Rural nights add deer, dogs, and livestock with no interest in your schedule. Scan high and low; animals reflect before you see body shape.",
    "Temperature drops fast after sunset, especially on clear evenings. A comfortable tee at six can feel cold at eight even in summer. Wind chill at riding speed multiplies the drop. Layer under your jacket so you can unzip at a stop without losing core warmth. Cold hands slow throttle finesse; cold feet make you rush stops. Dress for the second hour, not the garage temperature.",
    "Fog and high humidity steal contrast. Moisture on a visor fogs in seconds if your breath is not routed well. Crack ventilation, use pinlock inserts if you have them, and accept that fog is a stay signal if you cannot keep a clear lane view. Rain at night doubles reaction demand—postpone if you do not have a clear visor workflow or fresh faceshield care.",
    "Fatigue is a silent limit. A long workday plus a social night out can leave you cognitively slow before the kickstand goes up. Yawns, micro-corrections in lane, and missing gear shifts are signs to park. Coffee is not a strategy. If you would not drive a car tired, do not ride a bike tired—the stakes are the same even if the vehicle feels smaller.",
    "Route familiarity buys margin. A road you know tells you where the blind driveway sits, which corner tightens, and where deer cross. An unknown road at night stacks surprises: unmarked turns, absent reflectors, and driveways you did not expect. Shorter loops on known pavement beat ambitious new lines when visibility is already reduced.",
    "Urban darkness still has streetlights, cross traffic, and pedestrians. Rural darkness removes those cues and leaves you with headlight only. Adjust speed separately for each environment. Cities reward scanning mirrors and cover at intersections; country roads reward scanning ditches and tree lines. Do not carry city pace into a dark county road just because the engine feels happy.",
    "Weather interaction matters. A dry day can leave slick mud after a brief shower. Wind gusts push you sideways where open fields begin. Heat lightning is a reason to wait, not a backdrop. Check radar before you commit, and remember that temperature and moisture together change grip more than either alone.",
    "Speed relative to sight distance is the core discipline. Pick a pace where you could stop inside the lit patch you see. If traffic pushes you faster than that, let them pass or choose another night. The limit is optical, not social. Your friends can wait; asphalt will not forgive a late sighting.",
    "Following distance needs extra room at night. Taillights tell you less about closure rate than daylight shape cues do. Give at least two seconds; three is better when tires are cold or pavement might be damp. A common mistake is overdriving the headlight; another is dark clothing on an unlit road where drivers never pick you out of the background. If someone tailgates you, add space ahead so you can brake gently.",
    "What should you inspect before a night ride? Run a pre-ride checklist: lights, visor, tires, fuel, and a text to someone who can repeat your route. Walk the lights—headlight high and low beam, brake light, turn signals, and plate light if your jurisdiction requires it. Inspect the visor for smear and tint you will regret once streetlights end. Sit on the seat and reach controls with gloved hands. Confirm fuel for the loop plus a buffer—searching for a station in an unfamiliar dark town is how simple rides sprawl.",
    "Inspect tires for pressure and obvious damage. Night rides hide nails until you lean. Check chain or belt tension if that is part of your habit. Adjust mirrors while the driveway is still lit. Set navigation audio if you use it, but do not let screen glow distract—you need night vision more than a bright UI.",
    "Tell one person where you are going and when you expect to be back. A text with two intersections and a turnaround time is enough. If plans change, update them. That habit costs thirty seconds and saves hours if a phone dies or a detour appears.",
    "When postponing is right: failed light, unreadable visor, heavy fog, ice, sustained heavy rain, or you are already nodding off. Postponing is not missing the culture—it is keeping yourself available for the next good night. Meets will happen again; your skin and bones get one repair budget.",
    "Passengers feel cold and fatigue sooner. Brief them on holds, helmet tap signals, and the first stop. A pillion who cannot hear you at low rpm will not communicate at speed. Give them the same layer advice you take, and plan shorter legs between stops.",
    "Urban glare from LED billboards and shop windows can trick your eyes into thinking the road is brighter than it is. Give your vision time to recover after leaving a brightly lit area. Roll gently until contrast stabilizes. That first minute after a lit space is where many riders carry parking-lot speed into real darkness.",
    "Animals move at dawn and dusk; many rural routes repeat those patterns at night. If you see one deer, assume more nearby. Slow and cover the brake—not the horn—as your first response. Swerving without knowing the shoulder is worse than a controlled stop from a lower speed.",
    "Construction zones change weekly. A lane shift that was obvious in daylight can hide behind glare at night. Treat every orange cone as new. Reduce speed until you can read lane markings and barrier edges clearly.",
    "Railroad crossings and metal bridges change traction. Wet metal can feel like ice. Cross upright, avoid lean, and do not accelerate on the plate. The same applies to painted crosswalks when damp.",
    "If you roll with others after dark, your obligation is your own stopping distance. If the pack outruns your headlight, peel off rather than chase. Formation photos are not worth riding blind. Read group-ride etiquette when wheels are moving as a pack; this page stays on sight, layers, and fatigue on the road.",
    "Bluetooth comms help when volume is sane. If wind noise drowns speech, you are riding too fast for the conversation—or the helmet needs better sealing. Do not let a podcast replace scanning; ears still matter for sirens and uneven pavement noise.",
    "Earplugs reduce fatigue on long highway stints but cut some situational audio. If you use them, compensate with more mirror checks. Balance comfort against awareness; total isolation is a bad trade at night.",
    "Keep a small kit: visor cloth, zip tie, tire plug if you trust it, and a charged phone in an inner pocket. Gloves with reflective backs help at stops. A thin neck gaiter bridges jacket collar gaps when temperature dives after sunset.",
    "After the ride, note one thing that surprised you—a new pothole, a blind driveway, a glare source. Update your mental map. Next month’s same loop gets safer because you remembered where the road lied.",
    "Lifestyle apparel from Club Throttle—tees and hoodies—belongs after the ride or under a real jacket, not as a substitute for protection on the bike. Read streetwear versus riding gear if anyone confuses a graphic tee with armor. Read how riders choose a shirt if layering for a cool roll-out is the question.",
    "Trusted public sources on motorcycle visibility and protective equipment include NHTSA motorcycle safety material and IIHS motorcycle research summaries. Use them for visibility and gear expectations, not as a license to ride beyond your light.",
    "If every box is green—lights, visor, layers, known route, alert mind—roll out at a pace your beam supports. Enjoy the quiet roads and the culture that lives after dark. Come back with a story, not a scar.",
    "Contrast between lit and unlit sections can fool speed sense. Your eyes adjust to brightness in town, then under-read darkness two miles out. Treat every transition as a reason to shave speed until your sight catches up.",
    "Dashboard lights and phone mounts can ruin night vision if they are too bright. Dim instruments to the lowest readable setting. Tape over stray LEDs inside a tank bag if they glow in your periphery.",
    "Slow figure-eights in an empty lot can confirm clutch control with cold tires before you enter traffic. That drill does not replace road sight distance—it only confirms you can move smoothly once you commit.",
    "Chain lube flung on a rim can flash under streetlights and look like a wobble. Wipe excess. A true wobble at night is terrifying because you cannot see the road feedback as clearly—fix mechanical issues in daylight when you can.",
    "If you ride with a clear faceshield and glasses, anti-fog on both surfaces matters. Breath deflectors on the helmet reduce double-fog scenarios. Stop early if either surface clouds—you are riding half blind.",
    "Emergency braking at night should happen upright and in a straight line when possible. You see less of the surface you are skidding on. Practice emergency stops in a controlled daytime session so muscle memory exists when the beam is narrow.",
    "Fuel stops are good reset points: lights check, visor wipe, layer zip, hydration. Dehydration feels like fatigue. Drink water at the pump even if you do not feel thirsty—airflow dehydrates quietly.",
    "Sound cues help when sight fails: change in engine note on gravel, whistle of wind at a bridge gap, sudden quiet before a tree tunnel. Stay alert to those secondary channels without inventing threats that are not there.",
    "Plan a turnaround time, not just a departure time. Social nights run long; roads do not get safer after midnight. Leaving early with clear vision beats chasing the last rider on a road you do not know.",
    "When you get home, clean the visor before the bugs cure. Check lights again—vibration can loosen bulbs. Log the ride in your own words so the next dark Tuesday benefits from this one.",
    "How to ride after dark without turning the night into a stunt comes down to headlight reach you can stop inside, visibility to others, layers for the second hour, a visor you can keep clear, fatigue you take seriously, and a postpone call when any of those fail.",
    "What stays out of scope here? Lot parking rules, shirt fabric charts, and garage hangout culture belong in other journal notes. This page is riding judgment on the road after sunset—not legal advice, not a training course, and not a promise that any one tip replaces a certified rider course.",
    "What should you do next? Request a pre-ride checklist you will actually run—lights, visor, tires, fuel, route text—and postpone when any line fails. Open the night-riding habits on a dry Tuesday so the social ride on Saturday inherits a routine.",
  ]);

  const faqs = [
    {
      question: "How far can I trust my headlight?",
      answer: "Only as far as you can stop inside the lit pavement—if you cannot see a hazard in time to brake, you are riding too fast for the light.",
    },
    {
      question: "Is a tinted visor okay at night?",
      answer: "Usually no; a clear visor with a clean shield beats any tint once streetlights end.",
    },
    {
      question: "Do I need different gear at night?",
      answer: "You need real protective gear on the bike; reflective or light-colored layers help others see you but do not replace a jacket built for riding.",
    },
    {
      question: "Should I ride unfamiliar roads after dark?",
      answer: "Only if you accept slower speeds and more surprises; a known loop beats a new route when visibility is already limited.",
    },
    {
      question: "When should I cancel a night ride?",
      answer: "When lights fail inspection, the visor will not stay clear, weather cuts sight distance, or you are already tired before you start.",
    },
    {
      question: "Does a heavyweight tee count as night gear?",
      answer: "No. Cotton streetwear can layer under a jacket for warmth; abrasion and impact protection still live in real riding gear.",
    },
  ];

  return { answer, headings, body, faqs };
}
