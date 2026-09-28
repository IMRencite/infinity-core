/**
 * Customer-facing streetwear vs riding gear — V5 from-zero body (no crash protection claims for apparel).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_STREETWEAR_GEAR_TOPIC: PageTopicBoundary = {
  page_id: "/journal/apparel/streetwear-vs-riding-gear/",
  venture_id: "club-throttle",
  primary_topic: "streetwear versus riding gear",
  primary_reader_job: "Separate lifestyle cotton from protective equipment using an honest comparison—no armor claims for tees or hoodies.",
  must_cover: ["streetwear versus riding gear", "comparison table", "not armor", "abrasion", "helmet", "tee under a jacket"],
  allowed_supporting: ["heavyweight tee", "drape", "hoodie", "visibility", "short commute"],
  out_of_scope_for_page: ["park once", "group sweep", "route planning", "idle time", "fake outlaw", "overdriving the headlight"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleStreetwearGearV5Body() {
  const answer =
    "A motorcycle shirt is streetwear. Riding gear is protective equipment. Use the comparison table: the tee handles identity and comfort; the jacket, helmet, gloves, and boots handle abrasion and impact.";

  const headings = [
    "Streetwear versus riding gear in one table",
    "What a heavyweight tee can do",
    "What cotton streetwear cannot do",
    "Tee under a jacket: the honest pattern",
    "Hoodies and the same armor answer",
    "Short trips and parking-lot moves",
    "How a shop should talk about this",
    "Helmets, gloves, and boots stay gear",
    "Visibility versus protection",
    "Heat, rain, and excuses",
    "Common category mistakes",
    "What Club Throttle sells",
    "Where to go next inside Club Throttle",
    "Limits of lifestyle apparel",
  ];

  const body = paragraphs([
    "Streetwear versus riding gear is a comparison table, not a slogan. A heavyweight tee can drape, take a print, and work as daily wear after the ride. It is not armor. It is not abrasion protection. It is not a helmet. The shop talks about clothes and gear as two jobs that sometimes share a closet—not one garment that does both.",
    "What a tee can do: daily wear, print, the hour after the ride, and a layer under a riding jacket. It can look like Club Throttle when the art is real. It cannot change physics. Abrasion, impact, and weather are gear problems solved by equipment built for falls—not by ink on cotton.",
    "What it cannot do: a shirt as armor is a mistake. Helmet-optional talk is a mistake. A print that mentions a road does not become a rated panel. If you cannot name the protective standard on the hangtag, you do not have gear—you have a shirt.",
    "Yes, wear the tee under a jacket. Compare tee under a jacket versus tee alone on the highway—the second column in the comparison table is always gear on top. Wear real gear on the ride. Keep the tee for after. That is the use pattern. The jacket is the abrasion layer. The tee is the identity layer. Mixing those jobs is how people get hurt and then blame a shop that hinted otherwise.",
    "A hoodie does not change the armor answer. It can change the cold-start answer. Thickness is not a rating. Softness is not a rating. If the hoodie has no protective claim on the tag, treat it as clothes. Jacket on or off is still a gear decision.",
    "A parking-lot move is still a ride. A short commute is still a ride. The comparison table does not shrink because the clock says three minutes. Wear real gear on the road; keep the tee for when the kickstand is down.",
    "A shop does not replace gear. Honest copy says what the garment is. It does not hint that a print makes you safer. Club Throttle will not publish helmet-optional talk or invent abrasion numbers for cotton.",
    "Comparison table you can reuse: helmet, jacket, gloves, and boots belong in the gear column when they meet a real standard named on the tag. A tee and a hoodie belong in the clothes column. The tee can sit under the jacket. The hoodie can sit under the jacket. Neither sits instead of the jacket.",
    "Common mistakes: shirt as armor, helmet-optional talk, and treating a property of cotton as if it were leather. Another mistake is a product page that never says the shirt is not gear.",
    "NHTSA motorcycle-safety guidance and IIHS motorcycle notes are trusted public sources. They discuss visibility and protective equipment. They do not certify a Club Throttle tee. Read them as official context, not as a license to skip a jacket.",
    "Club Throttle sells clothes. Clothes do not become armor because the print mentions a road. No invented abrasion numbers. Wear real gear on the ride. Keep the tee for after. Read how riders choose a shirt for fabric, print, and wash.",
    "If a rider asks whether the shirt is enough, the answer is no. Point to the jacket they already own or still need. Point to the shirt as the layer after. Education first. Commerce second—and only when a real product page exists.",
    "A rated jacket and a heavyweight tee can share a closet and still not share a job. The jacket is for the ride. The tee is for the hour after. Keep the sentences separate. Wearing only a tee is cooler and unprotected. Wearing gear is hotter and protected.",
    "Walking the bike a few feet in a driveway is still not a reason to call a tee gear. It is a reason to keep the helmet conversation honest. A three-minute commute does not mint an abrasion number. A thicker hoodie is still clothes. Write down $0 as the armor value of cotton—because there is none on the tag.",
    "Write nothing as an abrasion rating unless a real standard is printed on the garment. Helmet, jacket, gloves, and boots are gear when they meet a named standard. Tee and hoodie are clothes until the tag says otherwise.",
    "Tee under a jacket is the use pattern. The jacket takes the ride. The tee takes the hour after. Mixing those jobs is the category error. A hoodie can win a cold start and still lose the armor question.",
    "Helmet-optional talk stays off the shop floor and off Club Throttle copy. Official visibility pages do not certify a print. Inventing an abrasion number is a shop fail.",
    "A property of cotton is not a property of leather. A road mentioned in a print does not become a rated panel. If you cannot name the protective standard, you have a shirt. Say that out loud.",
    "The comparison table is the point of this page. Helmet and jacket in the gear column. Tee and hoodie in the clothes column. Jacket on for the ride. Tee for after. Write it once. Say it every time.",
    "Read how riders choose a shirt for fabric, print, and wash. This page owns the armor answer. The two articles stay next to each other and do not swap jobs. A collection page is not a promise that a tee is gear.",
    "What a heavyweight tee can do is drape, take a print, and work as daily wear. What it cannot do is change abrasion, impact, or weather. Those are gear problems. Thickness is comfort. Comfort is not a CE mark.",
    "A shop that hints a print makes you safer has already failed the comparison table. Point at the jacket. Then point at the shirt as the layer after.",
    "Short trips do not mint armor. Parking-lot moves do not mint armor. Wear real gear on the ride. Keep the tee for after.",
    "Rain gear is still gear. A cotton tee that gets wet is just a wet shirt. Do not treat a soaked print as a weather shell. If the sky is open, the jacket stays on.",
    "Summer heat is the usual excuse for a shirt-only ride. Heat does not cancel abrasion. A short commute in traffic is still other vehicles.",
    "Gloves are the piece people skip because a tee feels like enough. Hands hit first. A shirt does not cover that. If you keep one gear rule besides the helmet, keep gloves.",
    "Boots versus sneakers is the same category error as tee versus jacket. Soft shoes are clothes. They do not become riding gear because the print on your chest mentions a road.",
    "A shop that sells both clothes and gear should keep the racks apart in language even if they share a room. Point left for jackets. Point right for tees.",
    "Insurance talk is out of scope here. This page will not guess what a policy covers. It will say the shirt is not armor.",
    "CE marks, EN labels, and named standards belong on gear. If the hangtag has none of those, treat the piece as clothes. A Club Throttle mark is identity, not a standard.",
    "After the ride, take the jacket off and keep the tee on if that is the look you wanted. That is the honest use of streetwear. Doing it in reverse on the road is the mistake this page exists to stop.",
    "A mesh jacket is still a jacket. A tee is still a tee. Do not let airflow marketing turn clothes into gear. If the hangtag cannot name a standard, it stays in the clothes column.",
    "High-visibility streetwear can help a car see you. It still does not replace a helmet. Visibility is courtesy. Protection is equipment. Keep those sentences apart in a shop.",
    "A back protector in a backpack is not a reason to skip the jacket. Neither is a print of a mountain road. The comparison table stays boring on purpose.",
    "If a friend says they have been fine in a tee for years, that is luck, not a method. This page will still say the shirt is not armor.",
    "Store staff should answer the armor question in one breath. If they cannot, they should point at this page. Club Throttle would rather lose a shirt sale than publish helmet-optional talk.",
    "Wear real gear on the ride. Keep the tee for after. Read the comparison table. That is the whole shop script. Everything else is fabric talk on the other article.",
    "A fashion campaign that shows a rider in a tee on a highway is still a campaign. It is not a method. Do not copy the photo. Copy the comparison table.",
    "Armored jeans and a heavyweight tee can share an outfit and still not share a job. The jeans may be gear if they name a standard. The tee is still clothes.",
    "If you only remember one line, remember this: the shirt does not replace the jacket. Say it when a friend asks. Say it when a shop gets cute. Then ride with real gear.",
    "This is not automatically protective and not legal advice. Official pages stay official. Club Throttle will keep selling clothes as clothes.",
    "A gift of a shirt is still a gift of clothes. Tell the person what they are getting. Point them at real gear if they ride.",
    "You should be able to fill the comparison table without looking. Helmet and jacket on the gear side. Tee and hoodie on the clothes side. Wear real gear on the ride. Keep the tee for after.",
    "Inspect the hangtag before you trust a shop story. A shop checklist is wear real gear on the ride, keep the tee for after, and read the comparison table. Request a real jacket for the ride if you do not own one. Keep the tee for the hour after.",
    "When is a motorcycle shirt clothes, and when do you still need gear? Always need gear on the road; the shirt is clothes for identity and comfort—not armor, not abrasion protection, not a helmet substitute.",
    "Browse the shop or After Dark collection when you want graphics on honest blanks—not as proof that cotton replaces a jacket on the highway.",
    "Related reads: how riders choose a shirt for weight and wash; how to ride after dark for visibility on the road home. This page stays on the comparison table and honest shop talk.",
    "Streetwear versus riding gear means two columns in your head: protective equipment with named standards, and lifestyle cotton with prints you like after the ride. Never merge the columns because the art looks fast.",
    "A $45 tee and a $450 jacket can both be honest purchases when each is sold for what it is. Confusion starts when either price pretends to be the other job.",
    "Layering for style is not layering for impact. A hoodie under a jacket for warmth is still two clothes columns unless the jacket names a standard.",
    "Denim is not automatically gear. Armored denim names a standard; fashion denim does not.",
    "Track days and canyon runs do not change the comparison table. Cotton is still clothes at any speed.",
    "When you pack for a weekend, pack gear for rolling and streetwear for the hotel mirror. Same bag, two jobs, labeled in your head.",
    "Request a real jacket at the shop counter if you rode in on a tee. That request is education, not upsell, when the words are honest.",
  ]);

  const faqs = [
    {
      question: "Can I wear a Club Throttle tee on the bike?",
      answer: "Under real riding gear, yes. As your only protection on the road, no.",
    },
    {
      question: "Does heavyweight cotton protect in a slide?",
      answer: "No. Abrasion protection comes from gear built and labeled for that job—not from a dense tee.",
    },
    {
      question: "Is a hoodie enough for a quick trip?",
      answer: "No. Quick trips still need the same gear column in the comparison table—jacket, helmet, gloves, boots.",
    },
    {
      question: "Can reflective ink replace a jacket?",
      answer: "No. Visibility helps others see you; it does not replace impact and abrasion equipment.",
    },
    {
      question: "What should I buy first?",
      answer: "Real riding gear if you ride on the road; a lifestyle tee when you want identity after the ride.",
    },
    {
      question: "Does Club Throttle claim armor for shirts?",
      answer: "No. Shirts are streetwear. The comparison table states that plainly.",
    },
  ];

  return { answer, headings, body, faqs };
}
