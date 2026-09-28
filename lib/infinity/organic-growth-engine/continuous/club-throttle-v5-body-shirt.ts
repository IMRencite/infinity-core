/**
 * Customer-facing rider shirt article — V5 from-zero body (no v4 depthPad / rubric language).
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
    "Choose a rider shirt by fabric weight, a size chart tied to the blank, print placement you can see after the jacket comes off, and wash care you will follow. Fit it while reaching forward, compare construction and ink method, then keep or return on drape and collar—not the mockup alone.";

  const headings = [
    "After the ride is when the shirt earns its keep",
    "Fabric weight and GSM in plain numbers",
    "Cotton versus blends for night air",
    "Construction beats a catchy spec line",
    "Fit at the bars and at the bar",
    "How to read a size chart honestly",
    "Front print, back print, and quiet margin",
    "Screen print versus direct-to-garment",
    "Wash, dry, and what heat actually does",
    "Tee versus hoodie for rider streetwear",
    "What premium feels like on cotton",
    "Compare two shirts before you reorder",
    "Value, keep or return, and the arrival check",
    "Mistakes riders make on lifestyle tees",
    "Layering without pretending cotton is armor",
    "Where to go next inside Club Throttle",
    "Limits of a lifestyle shirt",
  ];

  const body = paragraphs([
    "The design sells the first click. The knit decides whether you still want the shirt after heat, a jacket, and a wash. Rider streetwear lives in that gap between looking sharp in a photo and still looking intentional when you hang it on a door at midnight.",
    "Fabric weight is how much yarn the mill packed into a square yard or square meter. Lightweight tees—often near four ounces or about 150 GSM—feel easy in a shop and can go limp once sweat and a backpack strap flatten the knit. Midweight fabrics near five to six ounces add body without turning the shirt into a sweat blanket. Heavyweight knits, commonly six ounces and up or 200 GSM and above, hold drape and give a print a stable panel, but they also hold warmth longer on humid nights.",
    "Ounces per square yard and grams per square meter describe the same idea in different units. If a brand quotes only one, convert mentally: six ounces is roughly 200 GSM. Weight alone does not prove tight stitching or a collar that will lie flat after ten washes.",
    "Cotton fibers breathe and accept both screen ink and water-based digital ink. Ring-spun cotton feels smoother because shorter fibers were combed out; open-end cotton can feel rougher but cost less. Cotton shrinks when heat and agitation relax the yarn; expect length loss if you ignore the care label.",
    "Cotton-poly blends trade a little breathability for stability. A small polyester share can reduce shrink and help a shirt dry overnight in a hotel room. Too much polyester on the face can make a direct-to-garment print look glossy or feel plasticky. For a night ride home, decide whether you care more about dry time or a matte, cotton-rich hand.",
    "Fabric hand is the snap-back when you pinch the body. Drape is how that same fabric falls after you have been wearing it for an hour. Breathability is how quickly moisture moves through the knit—not the same as being thin. A dense heavyweight can breathe adequately while still looking structured; a thin tee can feel clammy because it collapses against skin.",
    "Collar construction shows quality early. A rib collar should recover when you stretch it lightly. If it rolls outward on the first wear, it will not fix itself in the laundry. Shoulder seams should sit at the shoulder point, not creep toward your neck when you reach. Side seams should hang straight; a seam that spirals toward the front usually means skewed panels or bad grading.",
    "Shirt length matters for riders because reaching toward the handlebars lifts the hem. Sit, reach forward, and note whether the back still covers you or whether the front print pulls tight across the chest. Sleeve length should clear your wrist without swallowing your hand; a sleeve that binds at the bicep will annoy you every time you cover the clutch.",
    "Size charts only work when they match the blank on the label. Chest is body circumference at the fullest point, not the flat width of the shirt doubled unless the chart says so. Body length runs from the high point of the shoulder to the hem. Sleeve length may be measured from center back or shoulder—mixing methods between brands is how people order a size too short.",
    "Measure with a soft tape. Chest at nipple line, waist relaxed, hips where you actually sit on the bike. Compare those numbers to the garment measurements, not just the size name. If you are between sizes and plan to wear the tee under a riding jacket, the longer body often beats a tighter chest that pulls when you tuck.",
    "Do not size up to rescue a collar that already looks wavy on the hanger. Size for length and shoulder fit; return bad construction. A larger size only hides a cheap seam for one evening.",
    "Front print placement belongs inside a chest window—roughly hand-width—so the art survives seat belts, jacket zips, and a tank bag strap. A design that sits on the belly reads fine standing up and disappears when you sit on a bike. Back print scale is the other half of streetwear identity: large enough to read across a parking row, with margin above the hem so the art does not dive into your belt line.",
    "Print scale is not the same as cramming text edge to edge. Leave quiet space so the shirt still looks intentional when you take your jacket off at a meet. Wrap-around art that crosses side seams often cracks first because the knit stretches at the armpit.",
    "Screen printing pushes ink through a mesh stencil, building a film on top of the fibers. It can feel slightly raised, hold saturated colors on dark shirts, and survive many washes when cured properly. High dryer heat is its enemy—cracking follows flexing on a thin knit.",
    "Direct-to-garment printing sprays water-based ink into the fiber face. It feels softer, handles gradients and fine lines, and can fade sooner if the shop under-cured the ink or if you wash hot with abrasive detergent. Ask which method you bought; care changes with the ink system.",
    "Print hand changes how a shirt feels under a jacket. A thick plastisol slab on a four-ounce tee can feel like a patch. A well-cured direct-to-garment layer on a midweight cotton face can disappear under a liner. Run your palm across the art before you wear it out.",
    "Wash inside out, cold or warm per the label, with mild detergent. Skip fabric softener on fresh prints—it can interfere with ink bonds on some garments. Tumble low or hang dry. Heat is what fades black dyes and what cracks screen ink. Turn black shirts inside out in sun if they dry on a line outdoors.",
    "Shrinkage shows up in length first on many cotton tees—sometimes near 5 percent after a hot dry cycle on all-cotton knits. If you need every millimeter for bar reach, hang dry. If you accept a little loss, still avoid high heat on the first three washes while you watch collar and print behavior.",
    "A tee wins when you want a large back graphic visible after you peel off a jacket at the lot. A hoodie wins on a cold roll-out when you want one layer with a hood and a kangaroo pocket. Hoodies add weight and can feel bulky under a tight riding jacket; plan which piece owns the night.",
    "Layering a midweight tee under a mesh summer jacket gives you sun and bug coverage without hiding the front mark. A heavyweight tee alone works for off-bike time at a meet; it is not a substitute for armor on the road. Read streetwear versus riding gear for that line when you want a comparison table.",
    "Premium feel comes from consistent knit density, straight hems, collars that recover, and prints that still read after a gentle wash cycle. Cheap feel is a wavy collar, twisted side seam, fuzzy pills under the arms after one humid night, and a back design the size of a postcard.",
    "Compare two shirts by pinning the same checks on both: fabric weight stated on the hangtag, measured chest and length, collar recovery test, side-seam hang, print method, and care label. Lay them flat under the same light and photograph the collars if you are ordering online again later.",
    "Value is not a fake sale price. It is whether you would keep the shirt after one ride and one wash—print still sharp, hem still long enough, collar still flat. Exchange when the size is wrong; return when construction fails on arrival.",
    "Common mistakes include buying the mockup photo without measurements, accepting a tiny back print, grabbing a thin catalog tee because the photo looked good, ignoring print method, drying hot because the shirt felt stiff, and treating lifestyle cotton like impact gear. Another mistake is guessing size from an old brand label when the blank changed mills.",
    "When the package arrives, open it in good light. Pinch the collar rib and release. Hold the shoulder seam to your shoulder point. Sit and reach. Read wash instructions aloud so you remember them. Check exchange and return windows before you cut tags.",
    "Humidity on summer nights tests breathability more than a shop mirror does. Sweat darkens thin cotton fast; a heather blend can hide moisture but change color unevenly. Pack a spare if the ride is long and the shirt is part of your look for the evening.",
    "Black garments show lint, sun fade, and detergent streaks sooner than heather gray. Wash them with similar colors, inside out, and avoid leaving them on a hot dashboard. Faded black with a crisp print still reads intentional; faded black with a cracked print reads tired.",
    "White and light tees show pit stains and road dust. Pre-treat stains before heat sets them. Prints on white still need gentle cycles so the ink does not chalk.",
    "Motorcycle context belongs where it changes the decision: hem rise at the bars, sleeve bind at the controls, jacket zip over a chest print, sweat on a slow crawl through downtown. You do not need racing metaphors to buy a good tee—you need measurements and honest fabric specs.",
    "Marketing copy about outlaw heritage does not tighten a seam. Look at stitch density at the hem and sleeve. Double-needle hems on a heavyweight blank are ordinary; single-needle on a claimed premium tee is a warning.",
    "If a shop lists no fabric weight, ask. If they list weight but no garment measurements, ask again. A brand that answers with blank mill and print method is easier to trust than one that only sends adjectives.",
    "Club Throttle builds night-ride streetwear for people who care how a shirt looks after the ride, not only before it. Browse the shop or After Dark collection when you want house graphics on blanks chosen for print and wash—not as a stand-in for reading the size chart on any brand you buy.",
    "Related reads stay inside the brand: streetwear versus riding gear clarifies armor versus cotton. Night-ride notes help when you are choosing tee versus hoodie for a late meet. Use internal links below when you want culture after fabric facts.",
    "Trusted sources for fiber basics include cotton industry education on how staple length affects hand, and print trade references on cure temperatures and ink types. Use the sewn label on your shirt as the final authority for wash heat.",
    "Keep a simple arrival checklist: garment measurements match the size chart, collar recovers, seams hang straight, print centered with hem margin, care label present, return window noted. If the shirt fails one structural check, return beats hoping laundry will fix it.",
    "Exchange when length is off but construction is sound. Return when the collar rolls, the print is crooked, or the fabric pills before you ride. One evening in the bars tells you more about drape than five minutes in a mirror.",
    "Heavyweight cotton with a soft hand is achievable; so is a board-stiff print on a premium blank. Touch before you commit at in-person events. Online, favor shops that publish blank model, weight, and measurement chart in the same product page.",
    "Rider streetwear is still streetwear: it should survive coffee, garage talk, and the ride home. Choose knits and prints that still look deliberate when you are not on the bike, because that is when people actually read the design.",
    "After you have the facts—weight, measurements, print method, care—then choose graphics that match your taste. The best art on a limp blank becomes a disposable story. A simple mark on a well-built tee still reads premium at a meet under sodium lights.",
    "Write down what worked: blank model, size, wash cycle, and whether the hem stayed put at the bars. Your next order gets faster when you treat shirts like pieces you maintain, not posters you discard.",
    "Lifestyle shirts do not carry armor ratings and do not replace a riding jacket on the road. Impact protection stays out of scope for cotton streetwear—budget for gear that is built for falls, not for graphics. Jackets with impact protection, gloves, and boots do a different job. Wear real protection on the motorcycle; wear the tee because you like how it looks when the ride is done.",
    "If two shirts cost the same and one publishes a full measurement chart plus print method, that transparency is part of what you are buying. Mystery blanks are fine for throwaways; they are a poor bet for a signature back print you want for years.",
    "Seasonality pushes toward hoodies when temps drop below comfortable at cruise speed, and toward midweight tees when you need one layer that works indoors and out. Neither choice replaces a rain shell when skies actually open.",
    "Print durability is a partnership: the shop cures ink correctly, you wash gently. Aggressive stain removers and high heat undo good work on both direct-to-garment and screen. When in doubt, cold wash and hang dry for the first month while you learn the shirt.",
    "Fit photos on models skip the reach test. Take thirty seconds at home before you cut tags. Your bars are not the model’s photo pose; your shirt should clear that difference.",
    "Side-by-side, the better shirt is the one whose collar still lies flat after you pull it over your head twice. Weight on the tag is a start; recovery and seam honesty finish the decision.",
    "When you are ready to add a Club Throttle piece, use the same checklist on our listings: read weight and measurements, pick the cut that matches how you ride and hang out, and pair it with gear that actually protects you on the road.",
    "Heather and marled knits hide wear differently than solid black. Expect the marled face to look lived-in sooner; solids show oil and dust more honestly. Pick the color story that matches how hard you use the shirt, not only how it looks under flash.",
    "Neckline depth changes how a tee reads under an open jacket. A crew that sits high can fight a zip; a slightly deeper crew can look cleaner when the jacket is half open. Try both with the jacket you actually wear on cool nights.",
    "Pocket tees add utility for keys and receipts at a meet; they also add bulk under a tight chest print. If the pocket sits inside the art window, choose a different blank or a smaller front mark.",
    "Long-sleeve rider tees trade summer breath for arm coverage at dusk. Treat them like midweight hoodies without the hood: same reach test, same collar check, same wash rules.",
    "Vintage-wash tees can feel soft on day one because the fabric was chemically softened or stone washed. That softness is not the same as a dense heavyweight knit. Read the weight tag anyway.",
    "If you ride with a hydration pack, test the shoulder straps against the collar and shoulder seams. Straps that rub a weak seam will blow it out before the print fades.",
    "Garment dye versus piece dye changes how color wears at seams. Garment-dyed shirts can look richer but fade unevenly at hems. Neither is wrong; know which you bought.",
    "When a brand offers pre-shrunk cotton, you still owe the shirt a gentle first wash. Pre-shrunk reduces surprise; it does not invite a hot dryer on day one.",
    "Storage matters for prints: fold prints face-to-face with tissue if you stack shirts in a drawer. Hanging is fine for sturdy knits; thin tees stretch on wire hangers.",
    "How riders choose a shirt that survives the ride home comes down to fabric weight on the tag, cotton versus blend for your climate, print placement you can see without the jacket, a size chart you measured against, wash care you will repeat, tee versus hoodie for the night, honest value, and a keep or return call after one ride and one wash.",
    "What is still out of scope for this page? Route briefs, group formation rules, and protective gear deep dives belong elsewhere in the journal. This article stays on fabric, fit, print, wash, and keep-or-return calls for lifestyle cotton—not armor, not legal advice, and not a promise that any blank fits every body without measuring.",
    "Honest value on a rider tee is often in the $45 to $55 band when you are paying for a dense blank, a centered back print, and a shop that publishes weight and measurements—not for a thin catalog shirt dressed up with a fake sale price.",
  ]);

  const faqs = [
    {
      question: "What does heavyweight mean on a rider tee?",
      answer: "It names a denser knit—often around six ounces per square yard or roughly 200 GSM—not a guarantee of good seams or collar recovery.",
    },
    {
      question: "Is 100% cotton always better for motorcycle streetwear?",
      answer: "Cotton breathes and takes ink well; blends can resist shrink and dry faster but may feel slick under a large print.",
    },
    {
      question: "Where should the back print sit?",
      answer: "High enough to read across a lot, with clear margin above the hem so the art does not disappear into your belt line when you sit.",
    },
    {
      question: "Should I size up for layering under a jacket?",
      answer: "Size for shoulder fit and body length when the size chart puts you between sizes; do not size up to fix a collar that already looks cheap on the hanger.",
    },
    {
      question: "Are lifestyle motorcycle shirts protective gear?",
      answer: "No. They are apparel for identity and comfort off the bike or under a jacket; abrasion protection lives in real riding gear.",
    },
    {
      question: "When is keep or return the right call?",
      answer: "Exchange for size when construction is sound; return when the collar rolls, the print is crooked, or the fabric fails before you have worn it out.",
    },
  ];

  return { answer, headings, body, faqs };
}
