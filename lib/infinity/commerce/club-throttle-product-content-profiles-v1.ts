import type { VentureProductContentProfile } from "./venture-product-content-profile-v1.ts";
import { CLUB_THROTTLE_SHARED_GARMENT_FACTS } from "./club-throttle-shared-garment-profile-v1.ts";

const garmentId = CLUB_THROTTLE_SHARED_GARMENT_FACTS.garment_profile_id;
const care = CLUB_THROTTLE_SHARED_GARMENT_FACTS.care;

export const CLUB_THROTTLE_PRODUCT_CONTENT_PROFILES: VentureProductContentProfile[] = [
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_lot_line_v1",
    sku: "LOT_LINE",
    slug: "lot-line-tee",
    canonical_product_name: "Lot Line Tee",
    product_type: "Motorcycle graphic t-shirt",
    design_name: "Lot Line",
    product_summary:
      "The Lot Line Tee is a motorcycle graphic shirt built around a wet parking-lot night scene — amber street light, reflective pavement, and a sportbike that reads from across the lot. Original Club Throttle back art on a heavyweight cotton tee for after-hours rides and everyday wear.",
    design_story:
      "Lot Line captures the hour when the commuter lot empties and the good bikes stay. The illustration centers a sportbike under sodium-orange street lighting with wet asphalt reflections — not a generic city skyline, but the specific mood of locking up late and rolling out anyway. The composition keeps the bike readable at distance: tank line, tail tidy, front wheel turned slightly as if you just backed out of a spot. Club Throttle built this for riders who treat empty lots like a second garage — where the meetup is quiet, the light is artificial, and the throttle is still honest.",
    design_visual_elements: [
      "Sportbike silhouette with wet-lot perspective",
      "Amber / sodium street-light palette",
      "Reflective pavement highlights",
      "Night-sky negative space framing the bike",
    ],
    design_theme: "After-dark sportbike / parking-lot culture",
    target_customer:
      "Sportbike and street riders who identify with late-night roll-outs, urban lighting, and illustration-forward motorcycle shirts.",
    primary_use_cases: [
      "After-work or late-night ride meetups",
      "Bike-night parking-lot hangs",
      "Casual everyday wear with motorcycle identity",
      "Layering under a riding jacket off the bike",
    ],
    garment_profile_id: garmentId,
    benefits: [
      "Large back graphic stays readable on a classic cotton tee body",
      "Heavyweight cotton holds shape for repeated wear",
      "Design reads clearly in photos — useful for club and crew posts",
      "Pairs with jeans, cargos, or riding pants off the bike",
    ],
    differentiators: [
      "Original Lot Line illustration — not a licensed OEM bike trace",
      "Night-lot mood distinct from track or garage phrase tees in the catalog",
      "Back-print placement keeps chest clean for layering",
    ],
    colorway_notes:
      "White and Black are the primary storytelling colors: white keeps the amber lighting vivid; Black uses Club Throttle dark-garment print treatment so highlights stay visible. When Dark Heather is available, it reads as a charcoal heather field — not a flat black swap.",
    where_to_wear: [
      "Late parking-lot meetups and bike nights",
      "Casual rides through city streets after dark",
      "Garage debriefs when the day job is done",
      "Everyday errands when you still want bike identity on your back",
    ],
    care,
    structured_facts: {
      Brand: "Club Throttle",
      Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name,
      Print: "Large back DTG",
      Fit: CLUB_THROTTLE_SHARED_GARMENT_FACTS.fit,
      Fabric: CLUB_THROTTLE_SHARED_GARMENT_FACTS.materials,
      Weight: CLUB_THROTTLE_SHARED_GARMENT_FACTS.fabric_weight,
    },
    faq: [
      {
        question: "What is the Lot Line Tee?",
        answer:
          "It is a Club Throttle motorcycle graphic tee featuring the Lot Line night-lot sportbike illustration printed large on the back of a Gildan 5000 Heavy Cotton shirt.",
      },
      {
        question: "What shirt is the design printed on?",
        answer: `The print is applied to the ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} (${CLUB_THROTTLE_SHARED_GARMENT_FACTS.materials}, ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.fabric_weight}).`,
      },
      {
        question: "Is this protective riding gear?",
        answer:
          "No. This is a cotton lifestyle tee for off-bike wear. It is not armor and does not provide crash protection.",
      },
      {
        question: "How should I wash the Lot Line Tee?",
        answer: care,
      },
    ],
    related_product_slugs: ["knee-down-tee", "apex-line-tee", "dualsport-dust-tee"],
    related_editorial_paths: ["/journal/night-riding/how-to-ride-after-dark/", "/journal/culture/bike-night-etiquette/"],
    related_collection_slug: "after-dark",
    seo_primary_topic: "motorcycle graphic tee night sportbike",
    seo_secondary_topics: ["parking lot bike shirt", "sportbike lifestyle apparel", "motorcycle back print tee"],
    entity_terms: ["Club Throttle", "Lot Line Tee", "sportbike", "motorcycle graphic shirt", "Gildan 5000"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources, "club-throttle-lot-line-art-v1"],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_clean_rpm_v1",
    sku: "CLEAN_RPM",
    slug: "clean-rpm-tee",
    canonical_product_name: "Clean RPM Tee",
    product_type: "Motorcycle typography t-shirt",
    design_name: "Clean RPM",
    product_summary:
      "The Clean RPM Tee is a phrase-first motorcycle shirt — bold black typography with red slash accents on a white heavyweight tee. Built for riders who want instrument-panel energy without cluttering the back with illustration noise.",
    design_story:
      "Clean RPM treats the shirt like a gauge face stripped to what matters: type weight, spacing, and a red tick that feels like the last honest number before redline. There is no background scene — the message is the design. Club Throttle uses this when the rider identity is about precision, maintenance discipline, and respecting the tach rather than cartoon speed. The red accents echo Club Throttle’s own instrument language without copying manufacturer cluster art. Wear it when you are setting tire pressures, walking the paddock, or grabbing coffee after a maintenance win — anywhere a full-scene illustration would feel louder than the point you are making.",
    design_visual_elements: ["Heavy sans typography", "Red slash / tick accents", "High-contrast black on white field"],
    design_theme: "Performance typography / redline culture",
    target_customer: "Riders who prefer minimal, type-driven motorcycle shirts over large illustrations.",
    primary_use_cases: [
      "Garage days and wrench sessions",
      "Track-day paddock wear off the bike",
      "Daily wear with a performance message",
      "Layering under a hoodie on cool morning ride-outs",
    ],
    garment_profile_id: garmentId,
    benefits: [
      "Typography stays crisp on white cotton for long-distance readability",
      "Minimal layout pairs easily with jackets and hoodies",
      "Phrase-first design works for riders who do not want huge scene art",
    ],
    differentiators: [
      "Typography-led — not interchangeable with illustration tees in the shop",
      "Red accent system aligned to Club Throttle redline territory",
    ],
    colorway_notes: "White is the primary expression for Clean RPM so the black type and red ticks stay sharp. Other colors appear only when print QC confirms contrast.",
    where_to_wear: ["Garage maintenance days", "Paddock between sessions", "Casual rides and coffee stops"],
    care,
    structured_facts: {
      Brand: "Club Throttle",
      Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name,
      Print: "Large back DTG",
      Design: "Typography / phrase mark",
    },
    faq: [
      {
        question: "What does Clean RPM mean on this shirt?",
        answer:
          "It is Club Throttle’s phrase mark about keeping revs and riding discipline ‘clean’ — honest throttle, no clutter. It is graphic branding, not a literal instrument reading.",
      },
      {
        question: "Why is Clean RPM mostly offered on white?",
        answer: "White preserves the intended black-and-red contrast for the typography system. Additional colors require separate print QC.",
      },
      {
        question: "How does Clean RPM fit compared to other Club Throttle tees?",
        answer: `All seven shirts share the same ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} block and size range; only the back art changes.`,
      },
      {
        question: "How should I size the Clean RPM Tee?",
        answer: `Choose your usual unisex tee size for a classic fit on ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name}. Size up one if you prefer a roomier fit over a base layer in the garage.`,
      },
    ],
    related_product_slugs: ["zero-chill-garage-tee", "knee-down-tee", "apex-line-tee"],
    related_editorial_paths: ["/journal/apparel/how-riders-choose-a-shirt/"],
    related_collection_slug: "redline",
    seo_primary_topic: "motorcycle typography tee",
    seo_secondary_topics: ["RPM shirt", "motorcycle phrase tee", "rider apparel"],
    entity_terms: ["Club Throttle", "Clean RPM Tee", "motorcycle t-shirt"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_dualsport_dust_v1",
    sku: "DUALSPORT_DUST",
    slug: "dualsport-dust-tee",
    canonical_product_name: "Dualsport Dust Tee",
    product_type: "Adventure motorcycle graphic t-shirt",
    design_name: "Dualsport Dust",
    product_summary:
      "The Dualsport Dust Tee is an adventure-bike graphic shirt — trail dust, dual-purpose machine, and open-line energy on heavyweight cotton. For riders who measure a good day in gravel miles and cold starts. Club Throttle prints the Dualsport Dust artwork large on the back of the same Gildan 5000 body used across the seven-shirt catalog, so fit and care stay consistent while the story on your back changes.",
    design_story:
      "Dualsport Dust sits at the pavement-to-gravel handoff. The art emphasizes a dual-purpose bike, kicked-up dust, and forward motion without resorting to stock adventure-bike poster clichés. Club Throttle aimed for the feeling of the first unpaved turn after county road — tires biting, visor up, map app forgotten. It pairs naturally with Open Road collection storytelling while keeping its own dust-toned palette. The dust cues read as motion, not dirt splatter for shock value — so the shirt still looks intentional in a coffee shop after you have washed the bike.",
    design_visual_elements: ["Dual-sport / ADV bike illustration", "Dust and trail texture cues", "Open horizon composition"],
    design_theme: "Dual-sport / gravel adventure",
    target_customer: "Dual-sport and light ADV riders who want motorcycle lifestyle clothing that reflects trail time, not only sportbike nights.",
    primary_use_cases: ["Post-ride coffee after mixed surface loops", "Camping and overnighter weekends", "Daily wear signaling ADV identity"],
    garment_profile_id: garmentId,
    benefits: [
      "Distinct adventure identity separate from sportbike night scenes",
      "Back print visible when riding gear comes off",
      "Cotton tee comfortable for travel days",
    ],
    differentiators: ["ADV-specific art direction in a sport-heavy catalog", "Dust palette unlike Lot Line night lighting"],
    colorway_notes:
      "White and Black are core. Natural and Dark Heather, when available, shift the field warmer or heather-gray — the dust art is evaluated per color for contrast.",
    where_to_wear: [
      "Gravel day debriefs",
      "Campfire evenings",
      "Gas-stop runs on mixed routes",
      "ADV club meetups in parking rows",
      "Travel days when you want bike identity after gear comes off",
    ],
    care,
    structured_facts: { Brand: "Club Throttle", Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name, Print: "Large back DTG" },
    faq: [
      {
        question: "Is the Dualsport Dust Tee only for dirt bikes?",
        answer: "It celebrates dual-sport and ADV culture. It is a cotton lifestyle tee — not riding armor.",
      },
      {
        question: "What makes Dualsport Dust different from Bagger Send?",
        answer: "Dualsport Dust is ADV/gravel forward; Bagger Send is cruiser highway-send energy. The bikes and compositions are intentionally different.",
      },
      {
        question: "How should I size the Dualsport Dust Tee?",
        answer: `It is printed on the same ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} blank as the rest of the catalog — classic unisex fit. Use the size chart on this page for garment measurements.`,
      },
      {
        question: "What colors is Dualsport Dust offered in?",
        answer:
          "Core colors are White and Black when print QC passes. Natural and Dark Heather may appear when contrast testing approves the dust art on those fields — only purchasable colors shown on this page are available.",
      },
    ],
    related_product_slugs: ["bagger-send-tee", "lot-line-tee", "zero-chill-garage-tee"],
    related_editorial_paths: ["/journal/culture/bike-night-etiquette/"],
    related_collection_slug: "open-road",
    seo_primary_topic: "dual sport motorcycle shirt",
    seo_secondary_topics: ["adventure bike tee", "motorcycle gravel shirt"],
    entity_terms: ["Club Throttle", "Dualsport Dust Tee", "dual-sport"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_knee_down_v2",
    sku: "KNEE_DOWN",
    slug: "knee-down-tee",
    canonical_product_name: "Knee Down Tee",
    product_type: "Motorcycle line-art t-shirt",
    design_name: "Knee Down",
    product_summary:
      "The Knee Down Tee is a technical line-art motorcycle shirt — rider lean, bike geometry, and construction arcs drawn in monochrome on white cotton. For sport riders who want draftsmanship over full-color illustration. The Knee Down graphic is original Club Throttle art meant to read like a technical study, not a licensed race poster.",
    design_story:
      "Knee Down is blueprint energy: the rider’s knee out, the bike’s line weight consistent, technical curves suggesting motion without painting the whole track. Club Throttle uses this design when the audience cares about body position and machine geometry — track day people, sport riders, and anyone who sketches bikes in notebook margins. It shares Redline territory with Apex Line but refuses the same full-color illustration language. Negative space is part of the design: the line work should feel like a shop manual page you would actually hang on a pegboard, not a dense poster cramming every inch.",
    design_visual_elements: ["Monochrome line art", "Lean-angle rider figure", "Technical construction curves"],
    design_theme: "Sport riding / knee-down line work",
    target_customer: "Track-day and sport riders who appreciate technical motorcycle line art.",
    primary_use_cases: ["Track-day paddock", "Sportbike group rides", "Garage wall-worthy tee wear"],
    garment_profile_id: garmentId,
    benefits: ["Line art stays sharp on white fields", "Distinct from full-color sportbike illustrations", "Readable graphic at conversational distance"],
    differentiators: ["Line-weight system unlike Apex Line illustration", "Technical rider pose as focal point"],
    colorway_notes: "White and Black variants use the same line system; dark garments invert line contrast via approved dark-garment print treatment.",
    where_to_wear: [
      "Track days off the bike",
      "Sportbike meetups",
      "Casual wear with technical moto identity",
      "Paddock debriefs and rider briefings",
      "Weeknight garage sessions reviewing lean photos",
    ],
    care,
    structured_facts: { Brand: "Club Throttle", Design: "Line art", Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name },
    faq: [
      {
        question: "How is Knee Down different from Apex Line?",
        answer: "Knee Down is monochrome line art focused on lean geometry. Apex Line is bold full-color sportbike illustration.",
      },
      {
        question: "Does this shirt include knee pucks or armor?",
        answer:
          "No. Knee Down is a cotton lifestyle graphic tee only. It celebrates riding body position in the artwork — it is not protective equipment and does not include armor or knee pucks.",
      },
      {
        question: "How should I size the Knee Down Tee?",
        answer: `Order your normal tee size on ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} for the catalog’s classic fit. Compare chest width and body length in the chart below if you are between sizes.`,
      },
      {
        question: "Will the line art fade quickly?",
        answer:
          "Follow the care instructions on this page — wash inside out, cold water, low dry, no iron on the print — to preserve DTG line work like any premium graphic tee.",
      },
    ],
    related_product_slugs: ["apex-line-tee", "lot-line-tee", "clean-rpm-tee"],
    related_editorial_paths: ["/journal/night-riding/how-to-ride-after-dark/"],
    related_collection_slug: "redline",
    seo_primary_topic: "sportbike line art tee",
    seo_secondary_topics: ["knee down shirt", "track day apparel"],
    entity_terms: ["Club Throttle", "Knee Down Tee", "sportbike"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_zero_chill_garage_v1",
    sku: "ZERO_CHILL_GARAGE",
    slug: "zero-chill-garage-tee",
    canonical_product_name: "Zero Chill Garage Tee",
    product_type: "Garage culture motorcycle t-shirt",
    design_name: "Zero Chill Garage",
    product_summary:
      "The Zero Chill Garage Tee is a garage-culture phrase shirt for riders who treat the cold start, the open door, and the first wrench turn as ritual. Phrase-forward Club Throttle art on heavyweight cotton. It anchors Throttle Core — the part of the catalog about crew, benches, and time spent with the bike stationary but never boring.",
    design_story:
      "Zero Chill Garage names the social temperature inside a working garage — fans on, coffee stale, someone’s always ‘almost ready.’ The design is phrase-led with Club Throttle’s garage visual language: industrial type, subtle tool-and-bench cues without turning the shirt into a generic mechanic brand parody. It belongs to Throttle Core because it is about culture and crew, not a single bike model hero shot. The phrase is meant to be read across a lift or over a parts bin — short enough for a glance, specific enough that it could not belong to a car-only brand.",
    design_visual_elements: ["Garage phrase typography", "Industrial type spacing", "Workbench / culture cues"],
    design_theme: "Garage culture / crew ritual",
    target_customer: "Riders and builders who live in garage time — maintenance, hangs, and cold-start weekends.",
    primary_use_cases: ["Wrenching with friends", "Garage parties and watch races", "Daily wear signaling garage identity"],
    garment_profile_id: garmentId,
    benefits: ["Phrase reads instantly in garage lighting", "Pairs with shop rags and work boots aesthetic", "Core brand territory shirt for new customers"],
    differentiators: ["Garage phrase identity vs illustration-led night scenes", "Throttle Core collection anchor"],
    colorway_notes: "White and Ash are common fields; Ash softens contrast for a worn-in garage tee look when QC passes.",
    where_to_wear: [
      "Home garage sessions",
      "Shop hangouts",
      "Casual rides starting from the driveway",
      "Watch parties when the bike is on a stand",
      "Saturday parts runs with the crew",
    ],
    care,
    structured_facts: { Brand: "Club Throttle", Collection: "Throttle Core", Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name },
    faq: [
      {
        question: "What does Zero Chill Garage mean?",
        answer: "It is Club Throttle’s phrase about garage culture where nobody is rushing the process — cold starts, open doors, and crew time.",
      },
      {
        question: "Is this a work uniform shirt?",
        answer: "It is a lifestyle cotton tee with a garage phrase; it is not FR-rated workwear.",
      },
      {
        question: "How should I size the Zero Chill Garage Tee?",
        answer: `Same ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} block as the rest of Club Throttle — classic unisex sizing. Size up if you want a relaxed fit over a long-sleeve in the shop.`,
      },
      {
        question: "Zero Chill Garage vs Clean RPM?",
        answer:
          "Both are phrase-forward Redline / Core territory shirts. Clean RPM is tach and precision typography; Zero Chill Garage is bench culture and crew ritual language.",
      },
    ],
    related_product_slugs: ["clean-rpm-tee", "dualsport-dust-tee", "bagger-send-tee"],
    related_editorial_paths: ["/journal/culture/bike-night-etiquette/"],
    related_collection_slug: "throttle-core",
    seo_primary_topic: "garage culture motorcycle shirt",
    seo_secondary_topics: ["motorcycle garage tee", "rider lifestyle apparel"],
    entity_terms: ["Club Throttle", "Zero Chill Garage Tee"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_apex_line_v1",
    sku: "APEX_LINE",
    slug: "apex-line-tee",
    canonical_product_name: "Apex Line Tee",
    product_type: "Sportbike illustration t-shirt",
    design_name: "Apex Line",
    product_summary:
      "The Apex Line Tee is a bold sportbike illustration shirt — brand-forward color and motion on white cotton. For riders who want full illustration energy rather than line-art or phrase marks. Apex Line is the poster-style sibling in the Redline collection: saturated bike hero art designed to survive real-world cotton wear and camera flash.",
    design_story:
      "Apex Line is the illustration counterweight to Knee Down’s draftsmanship. The bike is drawn as a hero object with dynamic line flow and Club Throttle brand presence — meant to read on a shop wall or across a parking row. It targets sport riders who want their tee to feel like poster art that survived contact with real cotton. Redline collection rules still apply: no borrowed OEM gauge faces, no third-party logos. Color blocks are tuned for cotton: saturated enough for photos, not so neon that the print fights the garment in daylight.",
    design_visual_elements: ["Full-color sportbike illustration", "Motion-forward composition", "Club Throttle brand integration"],
    design_theme: "Sportbike illustration / apex energy",
    target_customer: "Sportbike enthusiasts wanting vivid motorcycle graphic tees.",
    primary_use_cases: ["Sportbike meetups", "Photo-friendly ride stops", "Everyday wear with bold back graphic"],
    garment_profile_id: garmentId,
    benefits: [
      "High-impact illustration for photo and social sharing",
      "Distinct from line-art and phrase siblings",
      "Back placement for clean chest layering",
      "Sportbike identity without copying OEM trade dress",
    ],
    differentiators: ["Illustration-first vs Knee Down line system", "Brighter palette than Lot Line night scene"],
    colorway_notes: "White and Ash are typical; Ash mutes the background while preserving illustration contrast when QC approves.",
    where_to_wear: [
      "Sportbike group rides",
      "Bike-night photos",
      "Casual urban wear",
      "Paddock walk-downs between sessions",
      "Meetups where you want the back graphic in group photos",
    ],
    care,
    structured_facts: { Brand: "Club Throttle", Design: "Illustration", Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name },
    faq: [
      {
        question: "What bike is on the Apex Line Tee?",
        answer: "It is an original Club Throttle sportbike illustration — not licensed manufacturer trade dress.",
      },
      {
        question: "Apex Line vs Lot Line?",
        answer: "Apex Line is bright sportbike illustration. Lot Line is a night-lot scene with lighting mood.",
      },
      {
        question: "How should I size the Apex Line Tee?",
        answer: `Printed on ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} with the catalog’s shared size chart. True-to-size for a classic cotton tee; size up for a looser street fit.`,
      },
      {
        question: "Is Apex Line good for layering?",
        answer:
          "Yes — the large back print leaves the chest relatively clean, so it layers under a zip hoodie or riding jacket off the bike without competing with front graphics.",
      },
      {
        question: "What shirt is Apex Line printed on?",
        answer: `Apex Line uses the ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} (${CLUB_THROTTLE_SHARED_GARMENT_FACTS.materials}, ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.fabric_weight}) with large back DTG.`,
      },
    ],
    related_product_slugs: ["knee-down-tee", "lot-line-tee", "clean-rpm-tee"],
    related_editorial_paths: ["/journal/apparel/how-riders-choose-a-shirt/"],
    related_collection_slug: "redline",
    seo_primary_topic: "sportbike graphic tee",
    seo_secondary_topics: ["motorcycle illustration shirt", "biker graphic tee"],
    entity_terms: ["Club Throttle", "Apex Line Tee", "sportbike shirt"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
  {
    venture_id: "club-throttle",
    product_id: "cprod_ct_bagger_send_v1",
    sku: "BAGGER_SEND",
    slug: "bagger-send-tee",
    canonical_product_name: "Bagger Send Tee",
    product_type: "Cruiser motorcycle graphic t-shirt",
    design_name: "Bagger Send",
    product_summary:
      "The Bagger Send Tee is a cruiser and bagger lifestyle shirt — long-roll highway send energy without cliché flame clip art. Original Club Throttle back art on Gildan 5000 cotton. Bagger Send speaks to loaded bikes and touring confidence — a Open Road collection piece for riders who identify with torque and distance more than knee-down sport geometry.",
    design_story:
      "Bagger Send speaks to loaded bikes, open highway lanes, and the kind of throttle roll that is more about torque than knee angle. The art direction avoids generic skull-and-flame cruiser posters; instead it focuses on bagger proportions, saddlebags, and forward lean into a long trip. Open Road collection riders — tourers, weekend highway people, and anyone who respects a full dresser — are the natural audience. The composition leaves breathing room around the bike so the send reads as confidence, not chaos — a shirt for people who have actually done the long roll.",
    design_visual_elements: ["Bagger / cruiser silhouette", "Highway-forward composition", "Touring-scale bike proportions"],
    design_theme: "Cruiser / bagger highway culture",
    target_customer: "Cruiser, bagger, and touring riders wanting motorcycle shirts that respect long-haul identity.",
    primary_use_cases: ["Highway weekend trips", "Rally campground evenings", "Dealer meet-and-greet casual wear"],
    garment_profile_id: garmentId,
    benefits: [
      "Cruiser-specific art rare in sport-heavy catalogs",
      "Large back graphic visible at rally distances",
      "Comfortable cotton for long travel days off the bike",
      "Highway-touring story distinct from sportbike night scenes",
    ],
    differentiators: ["Bagger proportions vs sportbike night scenes", "Open Road storytelling"],
    colorway_notes: "White and Black are standard; Dark Heather, when offered, must read heather-gray separately from Black.",
    where_to_wear: [
      "Highway rallies",
      "Campground evenings",
      "Post-ride diner stops",
      "Dealer demo days off the bike",
      "Weekend two-lane roll-outs with the crew",
    ],
    care,
    structured_facts: { Brand: "Club Throttle", Design: "Cruiser illustration", Garment: CLUB_THROTTLE_SHARED_GARMENT_FACTS.name },
    faq: [
      {
        question: "Is Bagger Send only for Harley riders?",
        answer: "It celebrates bagger and cruiser culture generally. The art is original and not tied to a single manufacturer.",
      },
      {
        question: "Can I tour in this shirt?",
        answer: "It is comfortable cotton lifestyle wear off the bike. Wear proper riding gear while operating the motorcycle.",
      },
      {
        question: "How should I size the Bagger Send Tee?",
        answer: `Uses ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} with classic unisex measurements listed below. Many touring riders size up one for a relaxed fit after long days off the bike.`,
      },
      {
        question: "How does Bagger Send print on dark colors?",
        answer:
          "Black and Dark Heather variants use Club Throttle’s approved dark-garment print treatment so highlights stay visible. Only colors listed in the purchase panel are currently offered.",
      },
      {
        question: "What garment is Bagger Send printed on?",
        answer: `Bagger Send is printed on ${CLUB_THROTTLE_SHARED_GARMENT_FACTS.name} with the same size chart and care instructions as the rest of the Club Throttle shirt catalog.`,
      },
    ],
    related_product_slugs: ["dualsport-dust-tee", "zero-chill-garage-tee", "lot-line-tee"],
    related_editorial_paths: ["/journal/culture/bike-night-etiquette/"],
    related_collection_slug: "open-road",
    seo_primary_topic: "cruiser motorcycle t-shirt",
    seo_secondary_topics: ["bagger shirt", "motorcycle touring apparel"],
    entity_terms: ["Club Throttle", "Bagger Send Tee", "cruiser"],
    evidence_sources: [...CLUB_THROTTLE_SHARED_GARMENT_FACTS.evidence_sources],
  },
];

export function clubThrottleProductContentBySlug(slug: string): VentureProductContentProfile | null {
  return CLUB_THROTTLE_PRODUCT_CONTENT_PROFILES.find((p) => p.slug === slug) ?? null;
}

export function clubThrottleProductContentBySku(sku: string): VentureProductContentProfile | null {
  return CLUB_THROTTLE_PRODUCT_CONTENT_PROFILES.find((p) => p.sku === sku) ?? null;
}
