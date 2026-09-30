/**
 * Customer-facing rider shirt article — narrative editorial V6 (single-spine, not module stack).
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
    "The shirt you click is not the shirt you judge. The real product review happens after the jacket comes off, through the ride, and again after the first wash—when fit, fabric, print, and construction either hold up or expose a mockup.";

  const headings = [
    "The shirt looks great until the night actually happens",
    "What the ride exposes that the product photo hid",
    "The blank matters more than the marketing copy",
    "The first wash is the real product review",
    "The keep-or-return rule",
    "Where to go next in Club Throttle",
  ];

  const body = paragraphs([
    "The graphic sold you at checkout. Four hours later you are at a gas station under sodium lights, jacket off, and the collar on your new tee looks like it lost an argument with the humidity. The back print you loved in the photo is half-hidden under a waistband. The hem has climbed toward your belt because you reached for the bars all night. That is when you find out whether you bought a rider shirt or a rider mockup—and most of the answer has nothing to do with the design on the screen.",
    "Product photos are flat; you are not. A chest graphic centered on a mannequin often dives toward your belt line the second you sit and reach. Stand where your friends will actually see you—jacket off, bike nearby—and ask whether the back mark reads from ten feet without drowning in denim. If the art disappears when you take the seat, the mockup lied about scale, not about taste. Fit and placement fail together: pinch the rib collar, stretch lightly, and let go; if it rolls outward on the first wear, laundry will not fix cheap construction. Run the bar-reach check in thirty seconds—sit, reach like you are covering the clutch, and watch hem rise and chest pull. Size charts only help when they describe the blank on the label; measure your chest at the fullest point and compare to the garment flat width if the chart says so. Front print belongs in a chest window so zips and tank straps do not eat it; back print is the identity play, large enough to read across a parking row with quiet margin above the hem.",
    "The graphic gets you to click. The collar and knit decide whether you keep wearing the shirt. Fabric weight—ounces per square yard or GSM—is how much yarn the mill packed into the panel: a four-ounce tee feels easy in a shop, but under a jacket and sweat it can glue flat to your back while the ink still looks fine. Around six ounces (roughly 200 GSM) shirts start holding shape; heavyweight tags are useful, but GSM alone is not a quality certificate. Cotton breathes and takes ink well; blends trade a little breath for stability and faster dry time in a hotel room. Too much polyester on the face can make direct-to-garment color look glossy under lot lights. For humid summer nights, for most riders the better bet is picking whether you care more about dry time or a matte cotton hand—not which marketing word sounds premium.",
    "Screen print builds a film on the fibers—saturated on darks, slightly raised, durable when cured, and unforgiving in a hot dryer. Direct-to-garment sprays into the face—soft gradients, but it can fade if under-cured or washed hot. Ask which system you bought; care follows the ink. Wash inside out, cold or warm per the label, skip softener on fresh prints, tumble low or hang dry. Heat fades black dyes and cracks screen ink; length on all-cotton knits often goes first after a brutal cycle. The first wash is the real product review: if the collar stays flat, the print survives, and the hem still clears your belt when you reach, you probably have a keeper. If the collar waves, the art ghosts, or the shirt shrinks into a crop top, return it before you attach a story to a bad blank.",
    "Keep when one honest ride and one gentle wash leave the print sharp, hem long enough for bars, and collar flat. Exchange when measurements were wrong but seams are honest. Return when the collar rolls, print placement is crooked, or fabric pills before you have a reason to wear it again. A tee wins when you want a back graphic visible after you peel off at the lot; a hoodie wins on a cold roll-out when one layer with a hood beats juggling a jacket—just decide which piece owns the night before you order both. Lifestyle cotton is not armor: it is identity and comfort after the ride, not impact protection—on the road, wear gear built for falls. When you want house graphics on blanks chosen for print and wash, browse the shop or After Dark collection; for tee-versus-hoodie calls and meet etiquette, stay inside Club Throttle’s journal rather than treating the site like a spec sheet.",
  ]);

  const faqs = [
    {
      question: "Are lifestyle motorcycle shirts protective gear?",
      answer: "No. They are apparel for comfort and identity; abrasion and impact protection belong in real riding gear.",
    },
    {
      question: "When should I return a rider tee instead of exchanging size?",
      answer: "Return when collar construction, print placement, or fabric fails on arrival or after one honest wash—not when the chart size was simply off on an otherwise well-made blank.",
    },
  ];

  return { answer, headings, body, faqs };
}
