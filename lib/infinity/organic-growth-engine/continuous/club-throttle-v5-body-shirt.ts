/**
 * Customer-facing rider shirt article — consumer editorial V5 (reader-first, not manual tone).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const CLUB_THROTTLE_SHIRT_TOPIC: PageTopicBoundary = {
  page_id: "/journal/apparel/how-riders-choose-a-shirt/",
  venture_id: "club-throttle",
  primary_topic: "rider shirt selection",
  primary_reader_job: "Help a rider choose a shirt using fabric, fit, print, care, layering, and keep-or-return criteria.",
  must_cover: ["fabric weight", "cotton vs blend", "print placement", "size chart", "wash", "tee vs hoodie", "value", "keep or return"],
  allowed_supporting: ["riding posture", "layering", "shirt is not armor", "provider spec unknown"],
  out_of_scope_for_page: ["route planning", "lamp inspection", "two-second", "parking-lot blockage", "group sweep", "idle time", "stay/go", "fuel planning"],
  conversion_intent: { primary: "LEARN", secondary: "PRODUCT_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function clubThrottleShirtV5Body() {
  const answer =
    "Pick a rider shirt the way you pick gear for a long night out: read the blank’s weight and measurements, fit it while reaching for the bars, place the print where people actually see it after the jacket comes off, and keep or return on collar and drape—not the mockup alone.";

  const headings = [
    "The gas-station mirror test",
    "The parking-lot test",
    "Why the mockup sells a different shirt",
    "Weight on the tag (without the sermon)",
    "Cotton, blend, and humid bike nights",
    "The collar tells on a cheap tee",
    "The 30-second bar-reach test",
    "Front print, back print, and bike-night visibility",
    "Screen print vs DTG — pick your care plan",
    "The dryer is probably killing your shirt",
    "Tee vs hoodie for the ride home",
    "Keep, exchange, or return",
    "Lifestyle cotton is not armor",
    "Where to go next in Club Throttle",
  ];

  const body = paragraphs([
    "You know the shirt looked good when you left the house. The real test comes four hours later, when you peel off your jacket at a gas station and the collar looks like it lost a fight. Rider streetwear lives in that moment—not in the product photo.",
    "The parking-lot test is simple: stand where your friends will see you, jacket off, sodium lights on. If the back graphic reads from ten feet and the front mark is not swallowed by a zip or tank strap, placement passed. If the art disappears when you sit on the bike, the mockup lied.",
    "Mockups are flat. You are not. A design centered on a mannequin chest often dives toward your belt line the second you reach for the bars. For bike-night streetwear, back scale matters more than cramming text edge to edge—leave margin above the hem so the print does not drown in denim.",
    "Fabric weight is how much yarn the mill packed into a square yard (ounces) or square meter (GSM). A four-ounce tee feels easy in a shop; under a jacket and sweat it can go limp fast. Around six ounces—roughly 200 GSM—shirts start holding shape. Weight alone does not prove tight stitching; it just gives the print a stable panel.",
    "Cotton breathes and takes ink well. Blends trade a little breathability for stability and faster dry time in a hotel room. Too much polyester on the face can make a direct-to-garment print look glossy. For humid summer nights, for most riders the better bet is deciding whether you care more about dry time or a matte cotton hand—not which tag sounds premium.",
    "The collar tells on a cheap tee before the print fades. Pinch the rib, stretch lightly, let go. If it rolls outward on the first wear, laundry will not fix it. Do not size up to rescue a wavy collar—size for shoulder point and body length, return bad construction.",
    "The 30-second bar-reach test: sit, reach forward like you are covering the clutch, note hem rise and chest pull. Sleeve should clear the wrist without binding the bicep. Size charts only work when they match the blank on the label—measure your chest at the fullest point and compare to garment flat width if the chart says so.",
    "Front print belongs in a chest window—roughly hand-width—so art survives jacket zips and straps. Back print is the identity play: large enough to read across a row of bikes, with quiet margin so the shirt still looks intentional when you are not on the machine.",
    "Screen print builds a film on the fibers—saturated on darks, slightly raised, durable when cured, hates high dryer heat. Direct-to-garment sprays into the face—soft gradients, can fade if under-cured or washed hot. Ask which you bought; care follows the ink system. Run your palm across the art before you wear it out under a liner.",
    "Wash inside out, cold or warm per the label, skip softener on fresh prints, tumble low or hang dry. Heat fades black dyes and cracks screen ink. If you need every millimeter for bar reach, hang dry—length often goes first on all-cotton knits after a hot cycle.",
    "A tee wins when you want a back graphic visible after you peel off at the lot. A hoodie wins on a cold roll-out when one layer with a hood beats juggling a jacket. Hoodies bulk under tight riding jackets—decide which piece owns the night before you order both.",
    "Keep when one ride and one gentle wash leave the print sharp, hem long enough, collar flat. Exchange when measurements were wrong but seams are honest. Return when the collar rolls, print is crooked, or fabric pills before you have a story in the shirt. The mockup sells the shirt; the collar tells you whether you will still wear it six months later.",
    "Lifestyle cotton is not armor. It is identity and comfort after the ride or under a jacket—not impact protection. For the line between streetwear and real gear, see streetwear versus riding gear in the journal; on the road, wear protection built for falls.",
    "When you want house graphics on blanks chosen for print and wash—not a stand-in for reading any brand’s size chart—browse the shop or After Dark collection. Related reads stay inside Club Throttle: night-ride notes for tee-versus-hoodie calls, group etiquette when you are dressing for a meet, not a spec sheet.",
  ]);

  const faqs = [
    {
      question: "What does heavyweight mean on a rider tee?",
      answer: "A denser knit—often near six ounces or about 200 GSM—not a guarantee of collar recovery or straight side seams.",
    },
    {
      question: "Where should the back print sit?",
      answer: "High enough to read across a parking row, with clear margin above the hem so it does not disappear when you sit.",
    },
    {
      question: "Should I size up for layering under a jacket?",
      answer: "Size for shoulder fit and length when the chart puts you between sizes; do not size up to fix a collar that already looks cheap on the hanger.",
    },
    {
      question: "Are lifestyle motorcycle shirts protective gear?",
      answer: "No. They are apparel for comfort and identity; abrasion and impact protection live in real riding gear.",
    },
    {
      question: "When is keep or return the right call?",
      answer: "Exchange for size when construction is sound; return when collar, print placement, or fabric fails on arrival or after one honest wash.",
    },
  ];

  return { answer, headings, body, faqs };
}
