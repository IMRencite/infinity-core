import { AUTHORITY_SOURCES, type YearRow } from "./digital-real-estate-content";
import type { ExpansionPageSpec } from "./authority-expansion-specs";
import { DEPTH_QUESTION_PAGES, type DepthQuestionPage } from "./search-demand-depth-catalog";
import { EXPANSION_QUESTION_PAGES } from "./authority-expansion-catalog";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";

const S = AUTHORITY_SOURCES();
const COMMON_SOURCES = [
  { ...S.investopediaNpv, claim: "NPV discounts later cash" },
  { ...S.investopediaDiscount, claim: "A discount rate prices waiting" },
  { ...S.bls, claim: "Brokers advise clients on property deals" },
  { ...S.naiop, claim: "Commercial real estate is a professional field" },
  { ...S.boma, claim: "Buildings have shared operating costs" },
  { ...S.fasb, claim: "Lease accounting has formal rules" },
];

type Seed = {
  route: string;
  directAnswer: string;
  definition: string[];
  why: string[];
  how: string[];
  mistakes: string[];
  formula: string;
  exampleName: string;
  rent: number;
  cam: number;
  credit: number;
  related: Array<{ href: string; label: string }>;
  surfaces: Array<{ question: string; answer: string }>;
  persona?: { title: string; body: string };
};

function years(startRent: number, cam: number, creditY1: number, bump: number, notes: string[]): YearRow[] {
  return notes.map((note, index) => ({
    rent: Math.round(startRent * (1 + bump) ** index),
    cam: Math.round(cam * 1.03 ** index),
    credit: index === 0 ? creditY1 : 0,
    note,
  }));
}

function pageOf(route: string): DepthQuestionPage {
  const row = DEPTH_QUESTION_PAGES.find((item) => item.route === route);
  if (!row) throw new Error(`depth_page_missing:${route}`);
  return row;
}

function cleanRoute(route: string): string {
  return route.replace(/\/+$/, "") || "/";
}

function labelFor(href: string): string {
  const clean = cleanRoute(href);
  const named =
    DEPTH_QUESTION_PAGES.find((item) => cleanRoute(item.route) === clean)?.question ??
    EXPANSION_QUESTION_PAGES.find((item) => cleanRoute(item.route) === clean)?.question ??
    SEO_GEO_QUESTION_PAGES.find((item) => cleanRoute(item.route) === clean)?.question ??
    SEO_GEO_TOPIC_HUBS.find((item) => cleanRoute(item.route) === clean)?.title;
  if (named) return named.replace(/\?$/, "");
  if (clean === "/compare-commercial-leases") return "Compare two leases";
  if (clean === "/how-it-works") return "How the workflow works";
  if (clean === "/for/tenant-rep-brokers") return "Tenant-rep workflow";
  return clean.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "the next page";
}

function specFrom(seed: Seed): ExpansionPageSpec {
  const page = pageOf(seed.route);
  return {
    route: seed.route,
    question: page.question,
    directAnswer: seed.directAnswer,
    definition: seed.definition,
    why: seed.why,
    how: seed.how,
    formula: seed.formula,
    inputs: [
      ["Start rent", "First-year rent before extras"],
      ["Extras", "CAM, tax, or insurance the tenant still pays"],
      ["Credits", "Free rent or build-out money"],
      ["Term", "How many years the cash list runs"],
      ["Discount rate", "How hard later cash is shrunk"],
    ],
    years: years(seed.rent, seed.cam, seed.credit, 0.03, [
      `Year one carries the ${seed.exampleName} credit.`,
      `Rent steps and the credit is gone.`,
      `The extra stack still sits beside rent.`,
      `Later cash is smaller in today's dollars.`,
      `The last sample year still belongs in the sum.`,
    ]),
    rate: 0.08,
    exampleName: seed.exampleName,
    assumptions: [
      `The ${seed.exampleName} uses one visible 8 percent rate.`,
      "Credits hit in year one unless the page says otherwise.",
      "Both options share the same extra basis.",
      "No percentage rent sits in this teaching walk.",
    ],
    edges: [
      "A mid-year start needs a stub period, not a fake full year.",
      "A credit that pays later must move to that later year.",
      "A cap on extras changes the later risk, not the first sticker.",
    ],
    mistakes: seed.mistakes,
    decisions: [
      seed.directAnswer,
      "If the gap is thin, show a second rate before anyone picks.",
      "If one path wins only from a mistimed credit, rebuild the list.",
    ],
    compare: [
      "This page answers one question. Nearby pages cover the next step.",
      seed.related
        .map((item, index) =>
          index === 0
            ? `See <a href="${item.href}">${item.label}</a> when you need that next step.`
            : index === 1
              ? `Open <a href="${item.href}">${item.label}</a> for the nearby walk.`
              : `Use <a href="${item.href}">${item.label}</a> if you want a second path.`,
        )
        .join(" "),
    ],
    limits: [
      "The number does not score daylight, transit, or floor plate.",
      "The number does not replace a legal read.",
    ],
    whenNot: [
      "Do not let one metric pick a space the team cannot use.",
      "Do not use this page as a clone of a nearby question.",
    ],
    related: seed.related,
    sources: COMMON_SOURCES,
    cta: page.cta,
    midCta: page.midCta,
    finalCta: page.finalCta,
    personaNote: seed.persona,
    surfaces: seed.surfaces,
    bodyLinks: seed.related.slice(0, 4).map((item, index) => ({
      href: item.href,
      label: item.label,
      sentence:
        index === 0
          ? `Need the next step? Open <a href="${item.href}">${item.label}</a>.`
          : index === 1
            ? `See <a href="${item.href}">${item.label}</a> when you want the nearby walk.`
            : `Open <a href="${item.href}">${item.label}</a> if this page is not the last step.`,
    })),
    relatedGroups: [
      { title: "Start here", items: seed.related.slice(0, 1).map((item) => ({ href: item.href, label: item.label, description: "The nearby page that should be read first." })) },
      { title: "Go deeper", items: seed.related.slice(1, 2).map((item) => ({ href: item.href, label: item.label, description: "A deeper page in the same family." })) },
      { title: "Use this next", items: seed.related.slice(2, 3).map((item) => ({ href: item.href, label: item.label, description: "A workflow or compare path." })) },
    ].filter((group) => group.items.length),
  };
}

const SEEDS: Seed[] = [
  {
    route: "/commercial-lease-npv/why-use-npv-when-comparing-leases",
    directAnswer: "Use NPV when two leases pay on different calendars. It puts both bills in today's dollars so a cheap first year cannot hide a heavier later stack.",
    definition: [
      "NPV means net present value. It is the sum of later cash after you shrink each year.",
      "A comparison needs one rate and one timeline. NPV is that shared field.",
      "Aggregate cost adds years at face value. NPV prices waiting.",
      "Tenants use the lower liability. Landlords read the same walk the other way.",
      "The why is timing, not a slogan about sophistication.",
    ],
    why: [
      "Two office offers can match on total cash and still rank differently after time.",
      "A credit today is worth more than the same credit in year four.",
      "A CFO will ask why the cheaper first year lost. NPV is the answer.",
      "Without it, a broker is arguing stickers.",
    ],
    how: [
      "Write both cash lists on one calendar.",
      "Add extras the tenant still pays.",
      "Place credits in the year they land.",
      "Pick one visible rate.",
      "Add the shrunk years and read the gap.",
    ],
    mistakes: [
      "Calling NPV useful and then ranking on year-one rent.",
      "Changing the rate on each landlord.",
      "Leaving CAM off the net path.",
      "Treating a lower NPV as a better location.",
    ],
    formula: "Why-NPV = same-rate walk on both options, not a single-year sticker.",
    exampleName: "Why-NPV sample",
    rent: 42000,
    cam: 9000,
    credit: 12000,
    related: [
      { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV?" },
      { href: "/commercial-lease-npv/how-is-lease-npv-calculated/", label: "How is lease NPV calculated?" },
      { href: "/commercial-lease-npv/npv-vs-total-lease-cost/", label: "NPV vs total lease cost" },
    ],
    surfaces: [
      { question: "When is NPV the right compare tool?", answer: "When two leases pay on different dates or carry different credits." },
      { question: "Does total cash already answer this?", answer: "No. Equal totals can hide different timing." },
      { question: "What else still matters?", answer: "Space quality and legal terms still sit beside the number." },
      { question: "What rate should you show?", answer: "One visible rate on both options, then a nearby test." },
    ],
    persona: { title: "For tenant-rep brokers", body: "Say NPV is the price of the deal today, then walk the years." },
  },
  {
    route: "/commercial-lease-npv/npv-vs-total-lease-cost",
    directAnswer: "Total lease cost adds every year at face value. NPV shrinks later years, so two equal sums can still name different winners.",
    definition: [
      "Total lease cost is the raw sum of rent, extras, and credits.",
      "NPV is that same list after waiting is priced.",
      "The two numbers answer different questions.",
      "A treasurer cares about both the cash they write and when they write it.",
      "Use both on the page. Do not pick one in secret.",
    ],
    why: [
      "A 15-year deal can look equal in aggregate and worse up front.",
      "Whoever holds cash earlier can invest it.",
      "Clients mix the two words and then fight the rank.",
      "Showing both stops that fight.",
    ],
    how: [
      "Build one cash list.",
      "Add the face-value total.",
      "Discount the same list at one rate.",
      "Place both numbers on one slide.",
      "Explain the gap in a short sentence.",
    ],
    mistakes: [
      "Calling the raw sum NPV.",
      "Hiding the rate so the two numbers look like twins.",
      "Dropping later years from the raw sum.",
      "Using total cost to pick between different terms without a note.",
    ],
    formula: "Total cost = sum of cash. NPV = sum of cash / (1 + rate)^year.",
    exampleName: "Total-versus-NPV sample",
    rent: 39000,
    cam: 7800,
    credit: 9000,
    related: [
      { href: "/commercial-lease-npv/why-use-npv-when-comparing-leases/", label: "Why use NPV?" },
      { href: "/effective-rent/effective-rent-vs-npv/", label: "Effective rent vs NPV" },
      { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV?" },
    ],
    surfaces: [
      { question: "Can two totals match while NPV differs?", answer: "Yes. Earlier cash is worth more." },
      { question: "Which number is the budget?", answer: "Total cash is what you write. NPV is what you compare." },
      { question: "Should both sit on the memo?", answer: "Yes. Finance will ask for both." },
      { question: "Does effective rent replace this?", answer: "No. Effective rent is a yearly level, not a lump sum." },
    ],
  },
  {
    route: "/commercial-lease-npv/should-cam-be-in-lease-npv",
    directAnswer: "Yes, if the tenant pays CAM. Those dollars are lease cash and belong on the same NPV walk as rent.",
    definition: [
      "CAM is common-area cost the tenant often shares.",
      "NPV only sees cash you write down.",
      "A net rent sticker without CAM is not the bill.",
      "Tax and insurance follow the same rule when the tenant pays them.",
      "Gross leases already bake some extras into rent. Say so.",
    ],
    why: [
      "Leaving CAM off a net option makes it look cheaper than it is.",
      "True-ups can move later years more than a rent step.",
      "Brokers lose trust when extras appear after the rank.",
      "A CFO will add them anyway.",
    ],
    how: [
      "Ask who pays CAM on each option.",
      "Place the year-one estimate on the list.",
      "Grow it only if the lease says it grows.",
      "Honor a cap if one exists.",
      "Discount the extra with the rent.",
    ],
    mistakes: [
      "Comparing a gross sticker to a net sticker.",
      "Using a CAM estimate as a cap.",
      "Putting CAM in year one only.",
      "Calling building insurance a surprise after the walk.",
    ],
    formula: "NPV cash in a year = rent + CAM + other extras − credits.",
    exampleName: "CAM-in-NPV sample",
    rent: 36000,
    cam: 14000,
    credit: 5000,
    related: [
      { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM?" },
      { href: "/commercial-lease-npv/what-costs-belong-in-lease-npv/", label: "What costs belong in NPV?" },
      { href: "/lease-comparison/how-do-cam-charges-change-a-comparison/", label: "How CAM changes a comparison" },
    ],
    surfaces: [
      { question: "Does every lease include CAM?", answer: "No. A full-service rent may already include it." },
      { question: "Where does a CAM cap go?", answer: "On the later years of the same walk." },
      { question: "Is CAM the same as occupancy cost?", answer: "CAM is one extra. Occupancy cost is the full stack." },
      { question: "Should tax sit here too?", answer: "If the tenant pays it, yes." },
    ],
  },
];

function restSeeds(): Seed[] {
  const rows: Array<Omit<Seed, "related" | "surfaces"> & { related: Seed["related"]; surfaces?: Seed["surfaces"] }> = [
    {
      route: "/lease-comparison/how-do-cfos-review-lease-comparisons",
      directAnswer: "A CFO wants one occupancy stack, one rate, and a nearby worse case. First-year rent is not the review.",
      definition: [
        "Finance reviews leases as cash commitments.",
        "The packet should show usable feet, extras, and the rate.",
        "A worse case proves the rank is not fragile.",
        "Legal terms still sit beside the math.",
        "The review is a consistency check, not a location vote.",
      ],
      why: [
        "A pretty broker slide dies in a finance meeting.",
        "Hidden rates look like advocacy.",
        "A thin gap needs a sensitivity note.",
        "CFOs forward packets they can audit.",
      ],
      how: [
        "Open with the stack, not the story.",
        "Show both options on one timeline.",
        "Print the rate.",
        "Add one worse extra path.",
        "Name the next ask.",
      ],
      mistakes: ["Opening with face rent.", "Using a different rate per landlord.", "Hiding move cost on a relocation.", "Calling a sample a client result."],
      formula: "CFO packet = stack + rate + worse case.",
      exampleName: "CFO review sample",
      rent: 45000,
      cam: 10000,
      credit: 8000,
      related: [
        { href: "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/", label: "Present scenarios to a CFO" },
        { href: "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/", label: "What belongs in a comparison" },
        { href: "/tenant-rep-analysis/how-to-communicate-lease-economics-to-a-cfo/", label: "Talk economics to a CFO" },
      ],
    },
    {
      route: "/lease-comparison/how-do-cam-charges-change-a-comparison",
      directAnswer: "CAM can flip a net-versus-gross rank. Put the extra on the net path before you name a winner.",
      definition: [
        "CAM is shared building cost.",
        "A comparison that skips it is a sticker contest.",
        "Caps, exclusions, and true-ups change later years.",
        "Gross leases may already include the extra.",
        "Say the basis out loud.",
      ],
      why: [
        "A $18 net can lose to a $28 gross after extras.",
        "Uncapped CAM is a risk, not a rounding error.",
        "Clients remember the surprise more than the win.",
        "The extra belongs on the same sheet as rent.",
      ],
      how: [
        "List who pays CAM.",
        "Write year-one estimates.",
        "Honor caps.",
        "Keep true-up language beside the number.",
        "Discount the extra with rent.",
      ],
      mistakes: ["Comparing stickers.", "Treating an estimate as a cap.", "Ignoring management fees inside CAM.", "Dropping later true-ups."],
      formula: "Compared cash = rent + CAM extras − credits.",
      exampleName: "CAM compare sample",
      rent: 33000,
      cam: 16000,
      credit: 4000,
      related: [
        { href: "/occupancy-costs/what-is-cam-in-a-commercial-lease/", label: "What is CAM?" },
        { href: "/lease-comparison/how-do-you-compare-gross-and-net-leases/", label: "Gross vs net" },
        { href: "/commercial-lease-npv/should-cam-be-in-lease-npv/", label: "CAM in NPV" },
      ],
    },
    {
      route: "/lease-comparison/questions-to-ask-before-signing-a-commercial-lease",
      directAnswer: "Ask who pays extras, when credits land, what dates start, and which options survive. Then ask for one rate on the walk.",
      definition: [
        "A signing question is a cash-and-risk question.",
        "The sticker is one line, not the lease.",
        "Options and penalties belong on the same list.",
        "A missing date is a hidden month of rent.",
        "Legal review still follows the math.",
      ],
      why: [
        "Businesses sign the rent they can say out loud and miss the extras.",
        "A later tax jump can exceed the rent win.",
        "Renewal language changes the real term.",
        "A short question list prevents a long regret.",
      ],
      how: [
        "Ask for the occupancy stack.",
        "Ask when free rent and TI pay.",
        "Ask commencement and expiration.",
        "Ask about caps and options.",
        "Ask to see one discounted walk.",
      ],
      mistakes: ["Asking only about face rent.", "Skipping CAM caps.", "Ignoring start dates.", "Treating an LOI as a lease."],
      formula: "Sign only after stack + dates + options + rate are visible.",
      exampleName: "Signing-question sample",
      rent: 40000,
      cam: 11000,
      credit: 15000,
      related: [
        { href: "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/", label: "What belongs in a comparison" },
        { href: "/occupancy-costs/hidden-occupancy-costs/", label: "Hidden occupancy costs" },
        { href: "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/", label: "How brokers compare LOIs" },
      ],
    },
    {
      route: "/effective-rent/what-is-effective-rent",
      directAnswer: "Effective rent is one yearly lease number after credits and extras. It is not the sticker on the first page of the offer.",
      definition: [
        "Face rent is the posted rate.",
        "Effective rent folds free months and build-out money into one yearly figure.",
        "Some teams also discount the cash first. Say which method you used.",
        "Landlords read it as net income. Tenants read it as yearly cost.",
        "The word is shared. The recipe must be written.",
      ],
      why: [
        "Clients compare stickers and miss concessions.",
        "A single yearly number is easy to quote.",
        "It is not a replacement for NPV when cash is lumpy.",
        "Definition pages are searched separately from formula pages.",
      ],
      how: [
        "Write the cash list.",
        "Subtract credits in the right year.",
        "Add extras if the tenant pays them.",
        "Spread or discount by the method you named.",
        "Quote one yearly figure and the method.",
      ],
      mistakes: ["Calling face rent effective rent.", "Leaving extras off a net deal.", "Mixing simple average and NPV-adjusted methods.", "Hiding the term length."],
      formula: "Simple effective rent = (rent + extras − credits) ÷ years.",
      exampleName: "Effective-rent definition sample",
      rent: 38000,
      cam: 7000,
      credit: 19000,
      related: [
        { href: "/effective-rent/how-to-calculate-effective-rent/", label: "How to calculate effective rent" },
        { href: "/effective-rent/effective-rent-vs-face-rent/", label: "Effective rent vs face rent" },
        { href: "/effective-rent/effective-rent-vs-npv/", label: "Effective rent vs NPV" },
      ],
    },
    {
      route: "/effective-rent/blended-rent-vs-effective-rent",
      directAnswer: "Blended rent is a simple average of the years. Effective rent should still say whether waiting was priced.",
      definition: [
        "Blended rent adds the years and divides.",
        "Effective rent may also shrink early credits more.",
        "The words get swapped in broker decks.",
        "Write the method next to the number.",
        "Do not treat them as twins.",
      ],
      why: [
        "A simple average hides that year-one free rent is worth more.",
        "Clients hear both words and think they already compared.",
        "Finance will ask which recipe you used.",
        "The two methods can rank two offers differently.",
      ],
      how: [
        "Build one cash list.",
        "Compute the simple average.",
        "Compute the NPV-adjusted yearly number if you use it.",
        "Label both.",
        "Keep the rate visible on the adjusted path.",
      ],
      mistakes: ["Calling a simple average effective rent without saying so.", "Mixing methods across options.", "Hiding the term.", "Dropping extras on a net path."],
      formula: "Blended rent = sum of yearly cash ÷ years.",
      exampleName: "Blended-versus-effective sample",
      rent: 40000,
      cam: 7400,
      credit: 16000,
      related: [
        { href: "/effective-rent/what-is-effective-rent/", label: "What is effective rent?" },
        { href: "/effective-rent/simple-average-vs-npv-adjusted-effective-rent/", label: "Simple vs NPV-adjusted" },
        { href: "/effective-rent/how-to-calculate-effective-rent/", label: "How to calculate it" },
      ],
    },
  ];
  return rows.map((row) => ({
    ...row,
    surfaces: row.surfaces ?? [
      { question: `What does this page answer?`, answer: row.directAnswer },
      { question: "What should sit beside it?", answer: "The nearby owner page and one worked walk." },
      { question: "What is not answered here?", answer: "A legal read and a location vote." },
      { question: "What is the next step?", answer: "Open the related compare or model page and keep the same rate." },
    ],
  }));
}

function moreSeeds(): Seed[] {
  const compact: Array<[string, string, string, number, number, number, string, string, string]> = [
    ["/effective-rent/effective-rent-vs-asking-rent", "Asking rent is the listing sticker. Effective rent folds credits and extras into one yearly number.", "Asking-versus-effective sample", 37000, 7200, 11000, "/effective-rent/what-is-effective-rent/", "/effective-rent/effective-rent-vs-face-rent/", "/effective-rent/effective-rent-vs-npv/"],
    ["/effective-rent/simple-average-vs-npv-adjusted-effective-rent", "A simple average spreads credits evenly. An NPV-adjusted yearly number prices early credits more.", "Method-choice sample", 36000, 6900, 8000, "/effective-rent/blended-rent-vs-effective-rent/", "/effective-rent/how-to-calculate-effective-rent/", "/effective-rent/effective-rent-vs-npv/"],
    ["/effective-rent/effective-rent-on-gross-and-net-leases", "Effective rent only compares gross and net after extras sit on the same basis. A net sticker is not ready yet.", "Gross-net effective sample", 30000, 15000, 6000, "/lease-comparison/how-do-you-compare-gross-and-net-leases/", "/occupancy-costs/what-is-total-occupancy-cost/", "/effective-rent/how-to-calculate-effective-rent/"],
    ["/occupancy-costs/how-property-taxes-change-occupancy-cost", "If the tenant pays a share of tax, a reassessment can move occupancy cost more than a rent bump.", "Tax occupancy sample", 34000, 6000, 0, "/occupancy-costs/what-is-total-occupancy-cost/", "/occupancy-costs/hidden-occupancy-costs/", "/occupancy-costs/base-rent-vs-occupancy-cost/"],
    ["/occupancy-costs/how-insurance-changes-occupancy-cost", "Building insurance passed through to the tenant is occupancy cost. A premium jump belongs on the stack.", "Insurance occupancy sample", 34000, 5000, 0, "/occupancy-costs/hidden-occupancy-costs/", "/occupancy-costs/what-is-total-occupancy-cost/", "/occupancy-costs/how-property-taxes-change-occupancy-cost/"],
    ["/occupancy-costs/base-rent-vs-occupancy-cost", "Base rent is the sticker. Occupancy cost adds CAM, tax, insurance, and other sit-in-the-space extras.", "Base-versus-occupancy sample", 28000, 17000, 0, "/occupancy-costs/what-is-total-occupancy-cost/", "/occupancy-costs/why-lowest-rent-can-cost-more/", "/lease-comparison/how-do-you-compare-gross-and-net-leases/"],
    ["/occupancy-costs/occupancy-cost-on-gross-vs-net-leases", "Put extras on the net path first. A lower net rent can still cost more after CAM, tax, and insurance.", "Gross-net occupancy sample", 25000, 18000, 2000, "/lease-comparison/how-do-you-compare-gross-and-net-leases/", "/occupancy-costs/what-is-cam-in-a-commercial-lease/", "/occupancy-costs/base-rent-vs-occupancy-cost/"],
    ["/occupancy-costs/why-lowest-rent-can-cost-more", "The cheapest sticker can hide uncapped CAM, tax, insurance, or weaker credits. The stack tells the truth.", "Cheap-rent trap sample", 22000, 21000, 1000, "/occupancy-costs/hidden-occupancy-costs/", "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/", "/occupancy-costs/base-rent-vs-occupancy-cost/"],
    ["/occupancy-costs/how-cam-caps-change-occupancy-cost-risk", "A cap on controllable extras limits later surprise. No cap leaves the occupancy stack open after year one.", "CAM-cap risk sample", 32000, 13000, 0, "/occupancy-costs/what-is-cam-in-a-commercial-lease/", "/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking/", "/occupancy-costs/why-lowest-rent-can-cost-more/"],
    ["/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis", "Sensitivity moves one or two inputs. A scenario moves several together so the story stays consistent.", "Sensitivity-versus-scenario sample", 40000, 9000, 7000, "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/", "/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model/", "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/"],
    ["/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking", "A later rent step can flip a winner when the other path stays flatter. Test the bump. Do not guess it.", "Escalation-sensitivity sample", 35000, 8000, 4000, "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/", "/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model/", "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/"],
    ["/lease-sensitivity-analysis/how-cam-sensitivity-changes-ranking", "Uncapped extras can erase a cheap net rent. Move CAM up and down before you lock the rank.", "CAM-sensitivity sample", 31000, 16000, 3000, "/occupancy-costs/how-cam-caps-change-occupancy-cost-risk/", "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/", "/lease-comparison/how-do-cam-charges-change-a-comparison/"],
    ["/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals", "Sensitivity shows which assumption can swap the winner and which gap is too thin to trust.", "Decision-risk sample", 43000, 9500, 9000, "/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking/", "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/", "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/"],
    ["/lease-sensitivity-analysis/which-assumptions-flip-a-lease-ranking", "The rate and early credits usually move first. Escalation and uncapped extras sit close behind.", "Flip-input sample", 44000, 8800, 16000, "/lease-sensitivity-analysis/how-does-discount-rate-sensitivity-change-a-ranking/", "/lease-sensitivity-analysis/what-decision-risks-lease-sensitivity-reveals/", "/commercial-lease-npv/what-discount-rate-should-you-use/"],
    ["/lease-sensitivity-analysis/how-occupancy-cost-sensitivity-changes-location-choice", "A cheaper building can lose when extras rise. Move the occupancy stack before you pick a floor or a city.", "Location-sensitivity sample", 29000, 19000, 2000, "/occupancy-costs/what-is-total-occupancy-cost/", "/lease-sensitivity-analysis/why-use-lease-sensitivity-analysis/", "/occupancy-costs/why-lowest-rent-can-cost-more/"],
    ["/tenant-rep-analysis/lease-abstract-vs-financial-analysis", "An abstract lists clauses. A financial analysis turns those clauses into cash, time, and a rank a client can use.", "Abstract-versus-analysis sample", 41000, 10000, 7000, "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/", "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/", "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/"],
    ["/tenant-rep-analysis/common-broker-lease-analysis-mistakes", "Mixing gross and net, hiding the rate, and dropping extras are the mistakes that flip a client story.", "Broker-mistake sample", 39000, 12000, 6000, "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/", "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/", "/lease-comparison/how-do-you-compare-gross-and-net-leases/"],
    ["/tenant-rep-analysis/how-analysis-changes-negotiation-strategy", "The walk shows which ask is cheap to fight and which gap is already closed. Strategy follows the cash, not the sticker.", "Strategy-shift sample", 46000, 10500, 9000, "/tenant-rep-analysis/how-analysis-supports-lease-negotiation/", "/compare-commercial-leases", "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/"],
    ["/tenant-rep-analysis/how-analysis-supports-lease-negotiation", "A cash walk shows which ask is worth the fight: extras, credits, or a later rent step.", "Negotiation-analysis sample", 37000, 11000, 14000, "/tenant-rep-analysis/how-analysis-changes-negotiation-strategy/", "/compare-commercial-leases", "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/"],
    ["/tenant-rep-analysis/what-belongs-in-a-client-facing-lease-summary", "The summary should place the pick, the gap, the extras, the rate, and the next ask on one short page.", "Client-summary sample", 36000, 9800, 12000, "/tenant-rep-analysis/what-belongs-in-a-lease-recommendation-memo/", "/lease-comparison/what-belongs-in-a-commercial-lease-comparison/", "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/"],
    ["/tenant-rep-analysis/how-to-compare-multiple-spaces-for-one-client", "Put every space on one occupancy stack and one rate. A three-building bake-off is still one method.", "Multi-space sample", 35000, 7600, 13000, "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", "/tenant-rep-analysis/how-do-tenant-rep-brokers-compare-lois/", "/occupancy-costs/what-is-total-occupancy-cost/"],
    ["/lease-financial-modeling/what-is-a-commercial-lease-financial-model", "A lease model is a dated cash list with one rate and visible inputs. It is not a slogan pasted into Excel.", "Model-definition sample", 40000, 9000, 8000, "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/", "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/", "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/"],
    ["/lease-financial-modeling/how-free-rent-sits-in-a-lease-model", "Put free rent in the months it actually pays. Do not smear it across every later year by hand.", "Model-free-rent sample", 41000, 8200, 20000, "/effective-rent/how-free-rent-changes-effective-rent/", "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/", "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/"],
    ["/lease-financial-modeling/how-ti-allowance-sits-in-a-lease-model", "A TI credit belongs in the year it funds work. It is not a rent cut in every later year.", "Model-TI sample", 39000, 8000, 18000, "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/", "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/", "/lease-financial-modeling/how-free-rent-sits-in-a-lease-model/"],
    ["/lease-financial-modeling/how-rent-escalations-sit-in-a-lease-model", "Write the bump as a dated step. A hardcoded later year hides the driver a CFO will ask about.", "Model-escalation sample", 33000, 7700, 3000, "/lease-sensitivity-analysis/how-rent-escalation-sensitivity-changes-ranking/", "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/", "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/"],
    ["/lease-financial-modeling/how-to-run-scenario-analysis-in-a-lease-model", "Keep one input sheet. Switch a case flag. Do not paste a second model that can drift.", "Model-scenario sample", 42000, 9100, 7000, "/lease-sensitivity-analysis/sensitivity-vs-scenario-analysis/", "/lease-financial-modeling/how-to-present-a-lease-model-to-a-client/", "/lease-financial-modeling/how-to-build-a-lease-cash-flow-model/"],
    ["/lease-financial-modeling/how-to-present-a-lease-model-to-a-client", "Show the inputs, the year-by-year cash, and one worse case. Keep the rate on the page. Leave the formula cells off the slide.", "Model-presentation sample", 45000, 10200, 8500, "/tenant-rep-analysis/how-to-communicate-lease-economics-to-a-cfo/", "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/", "/lease-sensitivity-analysis/how-to-present-lease-scenarios-to-a-cfo/"],
    ["/lease-financial-modeling/how-cam-sits-in-a-lease-model", "CAM is its own dated extra, not a rent bump. Caps and true-ups belong beside the year they hit.", "Model-CAM sample", 30000, 15000, 2500, "/occupancy-costs/what-is-cam-in-a-commercial-lease/", "/lease-financial-modeling/what-inputs-belong-in-a-commercial-lease-model/", "/commercial-lease-npv/should-cam-be-in-lease-npv/"],
  ];
  return compact.map(([route, directAnswer, exampleName, rent, cam, credit, a, b, c]) => {
    const noun = exampleName.replace(/ sample$/i, "");
    const question = pageOf(route).question;
    const related = [
      { href: a, label: labelFor(a) },
      { href: b, label: labelFor(b) },
      { href: c, label: labelFor(c) },
    ];
    return {
      route,
      directAnswer,
      definition: [
        directAnswer,
        "Start with cash you can date. Leave slogans off the sheet.",
        "Add extras the tenant still pays.",
        "Keep one visible rate so a later reader can check the work.",
        "Name the method in plain words.",
      ],
      why: [
        `This question still needs a dated cash walk: ${question}`,
        "A short recap cannot carry a year-by-year example.",
        "The rank can flip when this input moves.",
        "A finance lead will ask which line changed the number.",
      ],
      how: [
        "Put the numbers on one year list with rent.",
        "Hold the other assumptions still.",
        "Use one named method to shrink or spread the cash.",
        "Show a second path so the gap is visible.",
        "Keep the rate on the same page as the pick.",
      ],
      mistakes: [
        `Copying a nearby page and only changing the title.`,
        "Hiding the rate.",
        "Dropping extras on a net path.",
        "Calling the teaching sample a live client result.",
      ],
      formula: `${noun} uses one shared rate and one dated list.`,
      exampleName,
      rent,
      cam,
      credit,
      related,
      surfaces: [
        { question: "What is the short answer?", answer: directAnswer },
        { question: "What should you change first?", answer: "Change this page's input and hold the rate still." },
        { question: "What must stay visible?", answer: "The rate, the extras, and the year the credit lands." },
        { question: "What should you open next?", answer: `Open ${related[0]?.label ?? "the next page"} and keep the same stack.` },
      ],
    };
  });
}

export function allDepthPageSpecs(): ExpansionPageSpec[] {
  const specs = [...SEEDS, ...restSeeds(), ...moreSeeds()].map(specFrom);
  if (specs.length !== DEPTH_QUESTION_PAGES.length) {
    throw new Error(`depth_spec_count:${specs.length}:${DEPTH_QUESTION_PAGES.length}`);
  }
  return specs;
}
