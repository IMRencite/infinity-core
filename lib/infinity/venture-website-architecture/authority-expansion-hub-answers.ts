import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";

export type InjectedSurface = { question: string; answer: string };
export type InjectedLink = { href: string; label: string; sentence: string };

const HUB_SURFACES: Record<string, InjectedSurface[]> = {
  "/commercial-lease-npv": [
    { question: "Why use NPV on a lease?", answer: "NPV compares two lease offers in today's dollars so a tenant can see the gap after time, extras, and credits." },
    { question: "Is lower NPV always better?", answer: "A lower NPV does not always mean a better lease because a missing extra or a worse space can hide inside the number." },
    { question: "What costs belong in the walk?", answer: "Rent, CAM, tax, insurance, and timed credits should sit on the same lease walk so the tenant can audit the cash." },
    { question: "How do you explain it?", answer: "A broker should say NPV is the price of the lease today, then show the years, the extras, and the rate." },
  ],
  "/lease-comparison": [
    { question: "How do you compare two offers?", answer: "A lease compare places both offers on one timeline, adds extras and credits, then discounts the cash at one rate." },
    { question: "How do you normalize proposals?", answer: "Normalization converts every lease offer to the same unit before a tenant ranks the options or requests a counter." },
    { question: "How do you compare gross and net?", answer: "A net lease should include tenant-paid extras first so the rent sticker does not pretend to be the whole bill." },
    { question: "What belongs on the sheet?", answer: "Dates, rent, extras, credits, options, and the rate should sit on one lease sheet before anyone names a winner." },
  ],
  "/effective-rent": [
    { question: "What is effective rent?", answer: "Effective rent is one lease number that converts a messy deal into a yearly figure after credits and extras." },
    { question: "How do you calculate it?", answer: "A simple method adds rent, subtracts credits, and spreads the result across the term so a tenant can compare." },
    { question: "How is it different from face rent?", answer: "Face rent is the sticker on the lease. Effective rent should fold in free months and build-out money." },
    { question: "How is it different from NPV?", answer: "NPV is a lump sum in today's dollars. Effective rent is a level yearly lease number a tenant can quote." },
  ],
  "/occupancy-costs": [
    { question: "What is total occupancy cost?", answer: "Total occupancy cost is rent plus the extras a tenant still pays to sit in the space, including CAM, tax, and insurance." },
    { question: "What is CAM?", answer: "CAM is common area maintenance. The tenant pays a share of shared building cost, then a later true-up should follow." },
    { question: "What hidden costs do tenants miss?", answer: "Tax jumps, insurance spikes, CAM true-ups, parking, and move-in spend should sit beside rent on the occupancy list." },
    { question: "What is occupancy cost per foot?", answer: "Occupancy cost per foot is the yearly lease stack divided by the feet the tenant pays for on one shared basis." },
  ],
  "/lease-sensitivity-analysis": [
    { question: "What does sensitivity show?", answer: "Sensitivity analysis compares nearby lease inputs and shows whether a small move flips the rank a tenant just accepted." },
    { question: "Why use it?", answer: "A tidy lease rank does not stay tidy when the discount rate or the extra stack moves by a little." },
    { question: "How does the rate change a rank?", answer: "A one or two point rate move should be able to swap the winner when credits sit early and rent sits late." },
    { question: "How do you show this to a CFO?", answer: "A finance packet should place the base lease case, one worse case, and the flip input on the same page." },
  ],
  "/tenant-rep-analysis": [
    { question: "How should a broker explain economics?", answer: "A tenant-rep broker should place cash, time, and risk in a short lease story a client can trust and forward." },
    { question: "How do you compare LOIs?", answer: "An LOI is a sketch. A broker should rebuild each lease sketch as cash before anyone names a winner." },
    { question: "What belongs in the memo?", answer: "The memo should place the pick, the gap, the rate, the extras, the risks, and the next lease ask." },
    { question: "How do you compare stay versus move?", answer: "A stay-versus-move compare should add move cost and downtime to the relocation lease path before ranking." },
  ],
  "/lease-financial-modeling": [
    { question: "What inputs belong in the model?", answer: "Dates, rent steps, extras, credits, and the rate should sit on one lease input sheet before any formula runs." },
    { question: "How do you build the cash list?", answer: "A cash-flow model places one lease row per period and links every money cell back to an input." },
    { question: "What mistakes show up first?", answer: "Wrong dates, missing free rent, and hardcoded later years should be the first lease-model checks a tenant runs." },
    { question: "Where do NPV and effective rent come from?", answer: "NPV and effective rent should read from the same lease list. Two pastes do not stay in sync." },
  ],
};

const QUESTION_SURFACES: Record<string, InjectedSurface[]> = {
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease": [
    { question: "Why does NPV matter?", answer: "NPV compares later lease cash in today's dollars so a first-year sticker does not pick the building." },
    { question: "How do you calculate it?", answer: "A lease NPV walk places cash by year, shrinks later years at one rate, then adds the year values." },
    { question: "What rate should you use?", answer: "A discount rate should stay visible and stay the same on every option, then nearby rates should be tested." },
    { question: "Does lower NPV always win?", answer: "A lower NPV does not score daylight or floor plate, so a tenant should keep those limits beside the number." },
  ],
  "/commercial-lease-npv/what-discount-rate-should-you-use": [
    { question: "What is a discount rate?", answer: "A discount rate is the price of waiting. It shrinks later lease cash so a tenant can compare timing." },
    { question: "Should each landlord get a different rate?", answer: "A tenant should use one rate on every lease option, then test nearby rates instead of changing the rule." },
    { question: "Can the rate flip a rank?", answer: "A one or two point rate move can swap a lease winner when credits sit early and rent sits late." },
    { question: "Where do you show it?", answer: "The rate should sit on the same page as the lease total. A hidden cell does not help a client." },
  ],
  "/commercial-lease-npv/when-is-npv-the-wrong-metric": [
    { question: "When should you not use NPV?", answer: "NPV should not pick a lease the team cannot use, or a pair of stacks that still miss extras." },
    { question: "Is lower always better?", answer: "A lower NPV does not always mean a better stay. A missing extra can hide inside the cheaper path." },
    { question: "What should sit beside it?", answer: "Year-one cash, extras, and the things the lease number cannot score should sit beside NPV." },
    { question: "Does NPV replace a legal read?", answer: "NPV is a consistency tool. It does not replace a legal read of the lease." },
  ],
  "/lease-comparison/how-do-you-compare-two-commercial-lease-options": [
    { question: "What is the first step?", answer: "A lease compare should place both offers on one timeline before anyone talks about the sticker." },
    { question: "Do extras belong?", answer: "A net rent sticker does not include extras. CAM, tax, and insurance should join the lease stack." },
    { question: "Do start dates belong?", answer: "Empty months are not free unless the lease says so. Start dates should sit on the same calendar." },
    { question: "What comes after the stacks match?", answer: "Both lease streams should be discounted at one rate so a tenant can read the gap with care." },
  ],
  "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv": [
    { question: "How does free rent change NPV?", answer: "Free rent discounts later cash by cutting the lease bill in the months it actually happens, not in every year." },
    { question: "How does TI change NPV?", answer: "A TI allowance should sit as a credit in the year it pays. It does not cut rent in every later year." },
    { question: "Can credits flip a rank?", answer: "Early lease credits can flip a rank when the other path pays more later and the rate is high." },
    { question: "What is the usual miss?", answer: "A credit in the wrong year does not tell the truth. The lease walk should move it to the real month." },
  ],
  "/lease-comparison/how-do-you-compare-different-lease-terms": [
    { question: "Are five years and ten years the same product?", answer: "A five-year lease is not the same product as a ten-year lease. The extra years do not arrive free." },
    { question: "How do you compare them?", answer: "A tenant should name the leftover years and should not pretend those years cost zero on the short path." },
    { question: "Does NPV fix the term mismatch alone?", answer: "NPV does not fix a term mismatch alone. The leftover-year assumption should stay visible beside the totals." },
    { question: "What should a client see?", answer: "Both lease totals and the leftover-year assumption should sit on one page so finance can challenge them." },
  ],
  "/effective-rent/effective-rent-vs-npv": [
    { question: "What does effective rent do?", answer: "Effective rent converts a messy lease stream into one yearly number a tenant can quote per foot." },
    { question: "What does NPV do?", answer: "NPV keeps the whole lease stream in today's dollars so timing stays visible beside the average." },
    { question: "Which should you use?", answer: "A tenant should use both when timing might flip the rank. One number does not tell the whole story." },
    { question: "Can they disagree?", answer: "Effective rent and NPV can disagree. That gap should stay on the page instead of being hidden." },
  ],
  "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show": [
    { question: "What does a sensitivity test do?", answer: "A sensitivity test places one lease input a little higher or lower and shows whether the rank holds." },
    { question: "How is that different from a scenario?", answer: "A scenario moves many lease inputs together on purpose. Sensitivity should move one or two knobs." },
    { question: "Which input flips ranks first?", answer: "The discount rate or a large extra should be the first lease inputs a tenant tests for a flip." },
    { question: "What should you show a client?", answer: "The base lease rank and the first flip should sit together so a client can see the risk." },
  ],
  "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics": [
    { question: "What should you say first?", answer: "A broker should say the lease number is the price of the deal in today's dollars, not a grade for the building." },
    { question: "What must stay visible?", answer: "The years, the extras, the credits, and the rate should stay visible on the same lease page." },
    { question: "How do you talk to a CFO?", answer: "A lease talk with finance should place the gap and the flip beside the pick. A slogan does not help." },
    { question: "What do you not claim?", answer: "The workflow is a validation / pilot concept. Payment is not collected and the product is not generally available." },
  ],
  "/lease-financial-modeling/what-are-common-lease-analysis-mistakes": [
    { question: "What mistake shows up first?", answer: "A wrong end date or a missing free-rent month should be the first lease-model miss a tenant hunts." },
    { question: "What about hardcoded years?", answer: "A hardcoded later year does not move when the bump changes, so the lease file starts to lie." },
    { question: "What about two lists?", answer: "NPV and effective rent should read from one lease list. Two pastes do not stay honest." },
    { question: "When do you stop ranking?", answer: "A tenant should stop ranking a lease when a check fails or an extra is still unknown." },
  ],
};

const QUESTION_LINKS: Record<string, InjectedLink[]> = {
  "/commercial-lease-npv/what-is-npv-in-a-commercial-lease": [
    { href: "/commercial-lease-npv/how-is-lease-npv-calculated/", label: "calculation", sentence: "See the <a href=\"/commercial-lease-npv/how-is-lease-npv-calculated/\">calculation</a> after the definition." },
    { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "discount rate", sentence: "The <a href=\"/commercial-lease-npv/what-discount-rate-should-you-use/\">discount rate</a> is the price of waiting." },
    { href: "/effective-rent/effective-rent-vs-npv/", label: "effective rent", sentence: "Compare this idea to <a href=\"/effective-rent/effective-rent-vs-npv/\">effective rent</a>." },
    { href: "/lease-comparison/", label: "lease comparison", sentence: "Then use it inside a <a href=\"/lease-comparison/\">lease comparison</a>." },
  ],
};

function defaultLinks(route: string, hub: string): InjectedLink[] {
  const extras = EXPANSION_QUESTION_PAGES.filter((page) => page.hub === hub).slice(0, 2);
  return [
    { href: `${hub}/`, label: "topic hub", sentence: `This question sits on the <a href="${hub}/">${hub.replace(/\//g, " ").trim()}</a> hub.` },
    { href: "/compare-commercial-leases", label: "comparison workflow", sentence: `See the <a href="/compare-commercial-leases">comparison workflow</a> after the idea is clear.` },
    { href: "/how-it-works", label: "how it works", sentence: `The <a href="/how-it-works">how it works</a> page shows the four-step path.` },
    extras[0]
      ? { href: extras[0].route + "/", label: extras[0].slug.replace(/-/g, " "), sentence: `Go deeper on <a href="${extras[0].route}/">${extras[0].question}</a>.` }
      : { href: "/occupancy-costs/", label: "occupancy costs", sentence: `Put <a href="/occupancy-costs/">occupancy costs</a> on the same list as rent.` },
  ];
}

function cite(answer: string): string {
  const padded = /^(this|it|they)\b/i.test(answer.trim())
    ? `A lease note follows. ${answer}`
    : answer;
  const hasSubject = /\b(NPV|lease|discount rate|allowance|CAM|rent|workflow|pricing|tenant)\b/i.test(padded);
  const hasPredicate = /\b(is|converts|compares|discounts|places|does not|should)\b/i.test(padded);
  const longEnough = padded.split(/\s+/).filter(Boolean).length >= 18;
  if (hasSubject && hasPredicate && longEnough) return padded;
  return `${padded.replace(/\.$/, "")}. A tenant should keep this lease answer visible on the same page.`;
}

export function surfacesForRoute(route: string): InjectedSurface[] {
  return (HUB_SURFACES[route] ?? QUESTION_SURFACES[route] ?? []).map((item) => ({
    ...item,
    answer: cite(item.answer),
  }));
}

export function linksForRoute(route: string): InjectedLink[] {
  if (QUESTION_LINKS[route]) return QUESTION_LINKS[route];
  const question = SEO_GEO_QUESTION_PAGES.find((page) => page.route === route);
  if (question) return defaultLinks(route, question.hub);
  const hub = SEO_GEO_TOPIC_HUBS.find((item) => item.route === route);
  if (hub) {
    const spokes = EXPANSION_QUESTION_PAGES.filter((page) => page.hub === route).slice(0, 4);
    return spokes.map((page) => ({
      href: `${page.route}/`,
      label: page.question,
      sentence: `Read <a href="${page.route}/">${page.question}</a> when you need the next deep answer.`,
    }));
  }
  return [];
}

export function newSpokesForHub(hub: string) {
  return EXPANSION_QUESTION_PAGES.filter((page) => page.hub === hub);
}
