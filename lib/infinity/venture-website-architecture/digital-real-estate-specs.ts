import { AUTHORITY_SOURCES, type AuthorityPageSpec, type YearRow } from "./digital-real-estate-content";
import { SEO_GEO_QUESTION_PAGES, SEO_GEO_TOPIC_HUBS } from "./digital-real-estate-catalog";

const S = AUTHORITY_SOURCES();

function years(startRent: number, cam: number, creditY1: number, bump: number, notes: string[]): YearRow[] {
  return notes.map((note, index) => ({
    rent: Math.round(startRent * (1 + bump) ** index),
    cam: Math.round(cam * (1 + 0.03) ** index),
    credit: index === 0 ? creditY1 : 0,
    note,
  }));
}

function normRoute(route: string): string {
  return route === "/" ? "/" : route.replace(/\/+$/, "");
}

function pageCtas(route: string) {
  const key = normRoute(route);
  const q = SEO_GEO_QUESTION_PAGES.find((item) => item.route === key);
  const h = SEO_GEO_TOPIC_HUBS.find((item) => item.route === key);
  const row = q ?? h;
  if (!row) throw new Error(`cta_missing:${route}`);
  return { cta: row.cta, midCta: row.midCta, finalCta: row.finalCta };
}

function spec(input: Omit<AuthorityPageSpec, "cta" | "midCta" | "finalCta">): AuthorityPageSpec {
  return { ...input, route: normRoute(input.route), ...pageCtas(input.route) };
}

export function allAuthorityPageSpecs(): AuthorityPageSpec[] {
  return [
    spec({
      route: "/commercial-lease-npv/",
      question: "What is commercial lease NPV?",
      directAnswer: "NPV is net present value. For a lease, it turns later rent and other costs into today's dollars so you can compare options on one scale.",
      definition: [
        "NPV means net present value. It is a way to add money that does not all arrive at the same time.",
        "A dollar you pay next year is not the same as a dollar you pay today. You could use today's dollar now.",
        "So we shrink later cash a little. That shrink is the time value of money.",
        "In a commercial lease, cash is rent, shared building cost, taxes, and credits like free rent or build-out money.",
      ],
      why: [
        "Brokers often see two offers with different rent, free months, and build-out checks.",
        "If you only look at first-year rent, you can pick the wrong one.",
        "NPV puts every cash event on one timeline. Then you can talk about the gap, not the brochure.",
        "A client can see why a higher face rent can still win after credits.",
      ],
      how: [
        "List the cash you pay or receive in each year of the term.",
        "Subtract credits in the year they actually happen.",
        "Pick one discount rate and keep it visible.",
        "Shrink each later year. Add the year values. That sum is NPV.",
      ],
      formula: "NPV = year 1 cash / (1 + rate) + year 2 cash / (1 + rate)^2 + later years in the same way.",
      inputs: [
        ["Start rent", "The first-year rent before extras"],
        ["Term", "How many years the lease runs"],
        ["CAM and other extras", "Shared building cost, tax, and insurance if the tenant pays them"],
        ["Credits", "Free rent and tenant improvement money"],
        ["Discount rate", "How hard you shrink later cash"],
      ],
      years: years(42000, 8400, 18000, 0.03, [
        "Free rent and a build-out check land here.",
        "Rent steps up and the credit is gone.",
        "The step-up is still small, but it compounds.",
        "Later cash is worth less today than year-one cash.",
        "This last year still counts. Do not drop it.",
      ]),
      rate: 0.08,
      exampleName: "Lease A sample",
      assumptions: [
        "The sample uses a five-year office term.",
        "The rate is 8 percent because it is easy to see, not because it is your firm's rate.",
        "Credits hit in year one. If your deal pays later, move them.",
        "No percentage rent is in this sample.",
      ],
      edges: [
        "A month-to-month holdover is not the same as a clean term.",
        "If commencement dates differ, line the first occupied month up, not the brochure date.",
        "If one option has a renewal, treat the renewal as a second case, not a hidden extra year.",
        "Industrial yards and office towers can share this math. The inputs still change.",
      ],
      mistakes: [
        "Adding ten years of rent with no shrink treats year ten like year one.",
        "Leaving CAM out can make a cheap face rent look like a win.",
        "Putting TI money in the wrong year changes the NPV a lot.",
        "Changing the rate after you see the winner is a story problem, not a math problem.",
      ],
      decisions: [
        "Use NPV to rank known cash. Do not use it to hide a bad location.",
        "Write the rate, the credits, and what you left out on the same page.",
        "If two NPVs are close, talk about operations, not a fake precise winner.",
      ],
      compare: [
        "Total undiscounted cost is easier, but it ignores time.",
        "Effective rent makes one average. It can hide when cash moves.",
        "A cap rate is a different market shorthand. It is not this occupancy tool.",
      ],
      limits: [
        "NPV does not score culture, access, or brand.",
        "It does not replace a lawyer reading the lease.",
        "It does not prove a product has customers.",
      ],
      whenNot: [
        "Do not let NPV pick a site that cannot house the team.",
        "Do not use it when the term is so short that time barely matters and you have not listed the cash.",
      ],
      related: [
        { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What is NPV in a commercial lease?" },
        { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "What discount rate should you use?" },
        { href: "/lease-comparison/", label: "Lease comparison hub" },
      ],
      sources: [S.investopediaNpv, S.naiop, S.bls],
    }),
    spec({
      route: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/",
      question: "What is NPV in a commercial lease?",
      directAnswer: "NPV means net present value. In a commercial lease, it is the sum of each year's occupancy cash after you shrink later years into today's dollars.",
      definition: [
        "NPV means net present value. Say it in plain words: later money is worth less than the same money today.",
        "You shrink later cash with a discount rate. The discount rate is the price of waiting.",
        "A commercial lease is a multi-year bill. Rent, CAM, tax, insurance, free months, and build-out money all sit on that bill.",
        "NPV is not a grade for the landlord. It is a scale for the cash you already wrote down.",
      ],
      why: [
        "Clients ask which deal is cheaper. First-year rent is a loud number and a weak answer.",
        "Free rent now and a steep step later can beat a flat cheap year if you never look past year one.",
        "NPV makes the timing visible. That is why it matters in tenant-rep work.",
        "You can still reject a low NPV site for operations. The math did its job when it made the cash clear.",
      ],
      how: [
        "Write a row for each year. Put rent and extras in. Put credits in the year they land.",
        "Choose one rate. Write it next to the table so no one can hide it.",
        "Divide later cash by one plus the rate, raised to the year number.",
        "Add the year values. Compare that sum to the other option on the same rate.",
      ],
      formula: "For each year: cash that year divided by (1 + discount rate) to the power of the year. Then add the years.",
      inputs: [
        ["Base rent", "The contract rent before extras"],
        ["Operating extras", "CAM, tax, and insurance if the tenant pays them"],
        ["Incentives", "Free rent and tenant improvement allowance"],
        ["Term length", "The years you will actually occupy"],
        ["Discount rate", "How hard later cash is shrunk"],
      ],
      years: years(40000, 9000, 15000, 0.04, [
        "A build-out check arrives while rent is still low.",
        "The step-up starts. The credit is gone.",
        "Escalation is now the main story.",
        "Later rent is bigger, but we shrink it more.",
        "The last year still belongs in the sum.",
      ]),
      rate: 0.08,
      exampleName: "the teaching lease",
      assumptions: [
        "Five years. Annual cash. No mid-year timing.",
        "8 percent rate for teaching. Your firm may use another rate.",
        "The TI check is treated as year-one cash in.",
        "No residual value and no furniture package.",
      ],
      edges: [
        "A free-rent month in year two is not a year-one credit.",
        "If rent is monthly, you can still group it by year if you say so.",
        "Percentage rent needs a sales case. Do not hide a plug.",
        "A termination option is a second case, not a silent shorter term.",
      ],
      mistakes: [
        "Calling a rent average 'NPV' mixes two tools.",
        "Forgetting insurance on a net lease understates the bill.",
        "Using a different rate on each option is not a fair race.",
        "Treating sample figures as customer results is false.",
      ],
      decisions: [
        "If NPV is much lower and the site works, the cash case is strong.",
        "If NPV is close, spend time on operations and risk.",
        "If NPV is lower only because you hid CAM, start over.",
      ],
      compare: [
        "Effective rent is an average. NPV is a time-weighted sum.",
        "Total cash is a raw add. It ignores waiting.",
        "A payment-per-square-foot headline can hide extras.",
      ],
      limits: [
        "The page does not give legal advice.",
        "Nothing here claims FASB sign-off.",
        "OccupancyNPV is a live occupancy-cost comparison, not a substitute for counsel.",
      ],
      whenNot: [
        "Skip NPV theater when you have not listed the cash yet.",
        "Do not force NPV to justify a site the team cannot use.",
      ],
      related: [
        { href: "/commercial-lease-npv/", label: "Commercial lease NPV hub" },
        { href: "/commercial-lease-npv/when-is-npv-the-wrong-metric/", label: "When NPV is the wrong metric" },
        { href: "/effective-rent/effective-rent-vs-npv/", label: "Effective rent vs NPV" },
      ],
      sources: [S.investopediaNpv, S.investopediaDiscount, S.fasb],
    }),
    spec({
      route: "/commercial-lease-npv/what-discount-rate-should-you-use/",
      question: "What discount rate should you use?",
      directAnswer: "The discount rate is the price of waiting. Pick one rate the client can defend, write it down, and test nearby rates. Do not hide a rate that was chosen only to crown a winner.",
      definition: [
        "A discount rate is a percent you use to shrink later cash.",
        "NPV means net present value. The rate is the knob on that shrink.",
        "A higher rate makes later rent look smaller today. A lower rate keeps later rent heavy.",
        "The rate is not magic. It is an assumption you must show.",
      ],
      why: [
        "Two honest teams can pick different rates and get different winners.",
        "If you do not show the rate, the ranking looks more sure than it is.",
        "A CFO will ask where the rate came from. A brochure cannot answer that.",
        "Sensitivity exists because this one number can flip a close race.",
      ],
      how: [
        "Ask what else the firm could do with the cash. That is one way people pick a rate.",
        "Some teams use a cost of capital. Some use a simple hurdle they already use for projects.",
        "Do not invent a precise rate from thin air and then treat it as fact.",
        "Run the same leases at two or three nearby rates and show if the rank holds.",
      ],
      formula: "Later cash today = later cash / (1 + discount rate) to the power of the year.",
      inputs: [
        ["Candidate rate", "The main rate you will show"],
        ["Low test", "A nearby lower rate"],
        ["High test", "A nearby higher rate"],
        ["Lease cash", "The same occupancy cash in every test"],
      ],
      years: years(38000, 10000, 8000, 0.05, [
        "A small credit lands early.",
        "The step-up is the point of this sample.",
        "Later years get heavier if the rate is low.",
        "A high rate shrinks these years hard.",
        "The last year is where rate fights show up.",
      ]),
      rate: 0.08,
      exampleName: "the rate-test lease",
      assumptions: [
        "We show 8 percent as the main teaching rate.",
        "A real firm may use another rate. Write theirs, not ours.",
        "The cash list stays fixed while the rate moves.",
        "No inflation plug is hiding in the rate.",
      ],
      edges: [
        "If cash is monthly, say whether the rate is annual.",
        "Do not mix a real-estate cap rate into this occupancy tool without saying so.",
        "A tax-exempt group may use a different hurdle than a retailer.",
        "If the client has no rate, show a range instead of a fake exact number.",
      ],
      mistakes: [
        "Picking a rate after you know which lease you like.",
        "Using 0 percent and calling it conservative.",
        "Using 20 percent to make later escalations disappear.",
        "Changing only one option's rate.",
      ],
      decisions: [
        "If the winner holds at nearby rates, say that. It builds trust.",
        "If the winner flips, say that too. That is the point of the test.",
        "Do not bury the rate in a footnote no one reads.",
      ],
      compare: [
        "A cap rate is not this discount rate.",
        "An interest rate on a loan is related but not the same input.",
        "Inflation and discounting are easy to mix. Keep them labeled.",
      ],
      limits: [
        "This page does not pick your firm's official rate.",
        "It does not replace a finance policy.",
      ],
      whenNot: [
        "Do not spend an hour debating the third decimal when the CAM line is blank.",
      ],
      related: [
        { href: "/commercial-lease-npv/", label: "Commercial lease NPV hub" },
        { href: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/", label: "What sensitivity analysis shows" },
        { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What NPV means" },
      ],
      sources: [S.investopediaDiscount, S.investopediaNpv, S.fasb],
    }),
    spec({
      route: "/commercial-lease-npv/when-is-npv-the-wrong-metric/",
      question: "When is NPV the wrong metric?",
      directAnswer: "NPV is the wrong lead number when the cash list is incomplete, the site cannot do the work, or the choice is really about flexibility, people, or risk you have not written down.",
      definition: [
        "NPV means net present value. It only ranks the cash you entered.",
        "If a key cost is missing, the rank is a story about your spreadsheet, not the lease.",
        "If the team cannot work in the space, a beautiful NPV does not matter.",
        "Wrong metric here means 'do not let this number drive the meeting.'",
      ],
      why: [
        "People like one score. One score can hide a bad fit.",
        "A tenant-rep broker who leads with NPV on a broken site loses trust.",
        "Finance teams still need NPV. They also need the list of what it ignores.",
        "Saying when not to use a tool is part of using it well.",
      ],
      how: [
        "First ask if the space works. Then list the cash. Then discount.",
        "If two options differ by a door, a dock, or a labor pool, write that beside the NPV.",
        "If the term is full of options, show cases. Do not force one NPV to hold every path.",
        "If data is missing, say 'incomplete' instead of inventing a precise rank.",
      ],
      formula: "Use NPV only after cash is complete enough that a missing line would not flip the rank by itself.",
      inputs: [
        ["Fit", "Can the team work here"],
        ["Cash completeness", "Are extras and credits on the page"],
        ["Options", "Renewal, exit, and expansion paths"],
        ["NPV", "Only after the three rows above"],
      ],
      years: years(45000, 7000, 0, 0.02, [
        "No credit. The site still may lose on fit.",
        "A smooth step-up does not fix a bad location.",
        "Cheap later years cannot buy missing labor.",
        "The model looks clean. The operations question remains.",
        "This is the year people forget to talk about risk.",
      ]),
      rate: 0.08,
      exampleName: "the clean-but-wrong site",
      assumptions: [
        "The sample cash is complete on purpose.",
        "The 'wrong metric' lesson is about use, not a math error.",
        "No customer result is claimed.",
      ],
      edges: [
        "A short pop-up term may not need a heavy NPV show.",
        "A related-party deal may have goals other than occupancy cost.",
        "A sale-leaseback is a different problem.",
      ],
      mistakes: [
        "Using NPV to end a debate about people and access.",
        "Calling a missing CAM line 'immaterial' with no check.",
        "Hiding an exit option because it is hard to price.",
      ],
      decisions: [
        "Lead with fit. Support with cash. Test with sensitivity.",
        "If NPV and fit disagree, say both out loud.",
      ],
      compare: [
        "Effective rent can be wrong in the same way if extras are missing.",
        "A scorecard of operations can sit beside NPV. It should not pretend to be NPV.",
      ],
      limits: [
        "This page does not rank culture or brand.",
        "It does not replace site tours.",
      ],
      whenNot: [
        "When the question is 'can we operate here,' NPV is support, not the judge.",
      ],
      related: [
        { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What NPV is" },
        { href: "/tenant-rep-analysis/", label: "Tenant-rep analysis" },
        { href: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/", label: "Common mistakes" },
      ],
      sources: [S.investopediaNpv, S.bls, S.naiop],
    }),
    spec({
      route: "/lease-comparison/",
      question: "How should you compare commercial leases?",
      directAnswer: "A fair compare is one timeline, the same extras, the same start idea, and the same discount rate. Then read the rank with the things the math cannot see.",
      definition: [
        "A lease comparison is a fair side-by-side of occupancy cash.",
        "Fair means the same costs are in or out for each option.",
        "NPV means net present value. It is one way to finish the compare after the timeline is honest.",
        "Face rent is the loud line. It is not the whole compare.",
      ],
      why: [
        "Landlords write offers in different shapes on purpose.",
        "Free rent, TI money, and steep steps can hide inside a pretty first year.",
        "A client deserves one picture, not three PDFs with different units.",
        "Brokers lose time when the compare lives in five tabs.",
      ],
      how: [
        "Collect rent, extras, credits, term, and start.",
        "Line up commencement so year one means the first occupied year.",
        "Place free rent and TI money in the year they happen.",
        "Discount with one visible rate. Share a short summary.",
      ],
      formula: "Same cash rules + same rate + same occupancy window = a comparable NPV pair.",
      inputs: [
        ["Rent path", "Start rent and steps"],
        ["Extras", "CAM, tax, insurance"],
        ["Credits", "Free rent and TI"],
        ["Window", "Term and start"],
      ],
      years: years(36000, 11000, 12000, 0.035, [
        "Credits make year one look kind.",
        "The real bill shows up when credits end.",
        "Steps keep lifting the later years.",
        "A second option may look worse now and better later.",
        "The compare is about the whole path.",
      ]),
      rate: 0.08,
      exampleName: "Option One",
      assumptions: [
        "Two options would use this same table shape.",
        "The sample is office-like. Industrial uses the same idea with different extras.",
      ],
      edges: [
        "Different start dates need a shared first occupied month.",
        "Renewal rights are extra cases.",
        "Expansion rights are extra cases too.",
        "A second city adds labor and tax, not just rent.",
      ],
      mistakes: [
        "Comparing rent per foot while one deal is gross and one is net.",
        "Leaving free rent off the cheap-looking offer.",
        "Using different rates so the favorite wins.",
      ],
      decisions: [
        "If the cheaper NPV also fits, the cash case is clean.",
        "If it does not fit, keep the cash and say the fit problem.",
      ],
      compare: [
        "A CRM stores contacts. It does not finish this compare.",
        "A spreadsheet can do it if the rules stay visible.",
      ],
      limits: [
        "This hub does not run your live file.",
        "It is a validation teaching surface.",
      ],
      whenNot: [
        "Do not compare a 3-year stay to a 15-year stay without saying the extra years are extra years.",
      ],
      related: [
        { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "How to compare two options" },
        { href: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/", label: "Free rent and TI" },
        { href: "/lease-comparison/how-do-you-compare-different-lease-terms/", label: "Different term lengths" },
      ],
      sources: [S.naiop, S.boma, S.investopediaNpv],
    }),
    spec({
      route: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/",
      question: "How do you compare two commercial lease options?",
      directAnswer: "The method is the same lease rows, the same extras, and the same start idea. Discount both with one rate. Then say what the rank still cannot see.",
      definition: [
        "A two-option compare is a paired occupancy model.",
        "Each option gets rent, extras, credits, and a term.",
        "NPV means net present value. Both options share one discount rate.",
        "The output is a gap, not a trophy.",
      ],
      why: [
        "Most live deals are not one offer. They are two or three shapes.",
        "Clients remember the lowest rent. They forget the steep step.",
        "A clean pair lets a CFO ask one question: what did you leave out?",
        "That question is the job.",
      ],
      how: [
        "Make a table with the same rows for A and B.",
        "Fix the start so year one is the first occupied year for both.",
        "Drop free rent and TI into the true year.",
        "Discount both. Write the rate. Write the leftovers.",
      ],
      formula: "Gap = NPV of A minus NPV of B, at one shared rate, after the same cost rules.",
      inputs: [
        ["Lease A cash", "Rent, extras, credits"],
        ["Lease B cash", "The same rows"],
        ["Shared rate", "One visible percent"],
        ["Shared window", "Aligned start and stated term"],
      ],
      years: years(41000, 8500, 20000, 0.03, [
        "Lease A gets a larger early credit in this teaching pair.",
        "After the credit, the path is the test.",
        "Lease B would use the same rows with different numbers.",
        "Do not invent a third hidden option in a side cell.",
        "The last year keeps the step honest.",
      ]),
      rate: 0.08,
      exampleName: "Lease A in a pair",
      assumptions: [
        "Lease B is described on the comparison tool page with the same rules.",
        "Figures are samples, not customer data.",
      ],
      edges: [
        "If one lease starts three months later, do not pretend year one matches.",
        "If one lease is 7 years and one is 5, see the term page.",
        "If one city differs, add occupancy extras that follow the city.",
      ],
      mistakes: [
        "Comparing a net deal to a gross deal without restating extras.",
        "Using last year's CAM on only one option.",
        "Rounding so hard that a real gap disappears.",
      ],
      decisions: [
        "Show the gap in dollars today. Then show fit.",
        "If the gap is small, do not oversell precision.",
      ],
      compare: [
        "A single effective-rent line can hide the pair's timing.",
        "A slide with only face rent is not a compare.",
      ],
      limits: [
        "This page does not ingest your PDF.",
        "OccupancyNPV compares occupancy-cost cash. It does not replace reading the lease.",
      ],
      whenNot: [
        "If you only have one offer, you can still model it, but you are not comparing.",
      ],
      related: [
        { href: "/lease-comparison/", label: "Lease comparison hub" },
        { href: "/compare-commercial-leases", label: "Comparison workflow" },
        { href: "/lease-comparison/how-do-you-compare-different-lease-terms/", label: "Different terms" },
      ],
      sources: [S.investopediaNpv, S.naiop, S.bls],
    }),
    spec({
      route: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/",
      question: "How do free rent and TI allowances affect NPV?",
      directAnswer: "Free rent and tenant improvement money change when cash moves. Each credit is placed in the year it happens. Then NPV can show whether a lower face rent is still cheaper.",
      definition: [
        "Free rent is a period when contract rent is zero or reduced.",
        "A tenant improvement allowance is build-out money from the landlord.",
        "NPV means net present value. Credits lower cash in the year they land, then we shrink later years.",
        "A credit in year one is worth more today than the same credit in year four.",
      ],
      why: [
        "Landlords often trade a pretty first year for a steeper later path.",
        "If you only hear 'two months free,' you miss the later step.",
        "TI money can make a higher rent win after the build-out.",
        "Clients feel a check. They do not always feel a later escalation.",
      ],
      how: [
        "Put free-rent months in the year you do not pay.",
        "Put TI money in the year the cash actually moves.",
        "Do not smear a year-one check across ten years unless you say you are averaging.",
        "Keep the later rent path. The credit does not erase it.",
      ],
      formula: "Year cash = rent + extras − free-rent relief − TI cash in that year. Then discount.",
      inputs: [
        ["Free-rent months", "When rent is reduced"],
        ["TI amount", "Build-out money"],
        ["TI timing", "The year the money moves"],
        ["Later rent", "The path after the gift"],
      ],
      years: years(43000, 8000, 22000, 0.04, [
        "The TI check and free rent both sit here.",
        "The gift is gone. The step starts.",
        "This is the year a cheap first look fades.",
        "Later rent now carries the deal.",
        "NPV still counts this year.",
      ]),
      rate: 0.08,
      exampleName: "the incentive lease",
      assumptions: [
        "TI is treated as cash in during year one.",
        "If your deal funds TI later, move the row.",
        "Free rent is modeled as lower year-one rent in this sample.",
      ],
      edges: [
        "A TI cap that never gets spent is not a credit.",
        "A free-rent month after a late delivery is not year one if you cannot occupy.",
        "A moving allowance is another credit. Name it.",
      ],
      mistakes: [
        "Calling TI a reduction to every year's rent.",
        "Ignoring free rent on the 'expensive' looking deal.",
        "Double counting a credit in the summary and the cash flow.",
      ],
      decisions: [
        "If the credit is large and early, say so. Then show the later path.",
        "If the credit is late, do not sell it like cash today.",
      ],
      compare: [
        "Effective rent often blends incentives into one average.",
        "NPV keeps the year the gift happens.",
      ],
      limits: [
        "This is not a construction budget.",
        "It does not price contractor overruns.",
      ],
      whenNot: [
        "If there are no incentives, skip the theater and compare the paths.",
      ],
      related: [
        { href: "/lease-comparison/", label: "Lease comparison hub" },
        { href: "/occupancy-costs/", label: "Occupancy costs" },
        { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What NPV is" },
      ],
      sources: [S.boma, S.investopediaNpv, S.naiop],
    }),
    spec({
      route: "/lease-comparison/how-do-you-compare-different-lease-terms/",
      question: "How do you compare different lease terms?",
      directAnswer: "A five-year lease is not the same product as a ten-year lease. Compare a shared window, then show the extra years as their own case. Unused years should not be treated as free.",
      definition: [
        "Term length is how long you are on the hook if you stay.",
        "NPV means net present value. Extra years add extra discounted cash.",
        "A short term can look cheap and still be risky if you must move soon.",
        "A long term can look heavy and still be right if you will stay.",
      ],
      why: [
        "Clients ask for the cheaper number. They may not ask about the extra years.",
        "A 10-year path includes years 6 to 10. A 5-year path does not.",
        "If you add those years into one score with no note, you mixed two products.",
        "Renewal options are not free years. They are choices.",
      ],
      how: [
        "First compare both leases over the shorter shared window.",
        "Then show the longer lease's extra years as a second view.",
        "If a renewal exists, price staying and leaving as cases.",
        "Say what you assume about the space after year five.",
      ],
      formula: "Shared-window NPV first. Extra-year NPV second. Do not silently add them.",
      inputs: [
        ["Short term", "The smaller number of years"],
        ["Long term", "The extra years"],
        ["Renewal", "A choice, not a fact"],
        ["Exit cost", "If leaving the short deal has a cost"],
      ],
      years: years(39000, 9500, 5000, 0.025, [
        "Year one of a longer path still needs a credit note.",
        "Shared-window years should match the short deal's years.",
        "From here a 10-year deal keeps going.",
        "These later years are the extra product.",
        "Do not hide them inside an average.",
      ]),
      rate: 0.08,
      exampleName: "the long-term path",
      assumptions: [
        "The sample shows five years. A ten-year deal would keep adding rows.",
        "No residual value is claimed.",
      ],
      edges: [
        "A termination option cuts the term only if you model the fee.",
        "Holdover months are not a new term unless you say so.",
        "Expansion that adds space is more cash, not a longer calendar only.",
      ],
      mistakes: [
        "Dividing a 10-year NPV by ten and calling it fair against a 5-year deal.",
        "Assuming you will renew at today's rent.",
        "Ignoring move cost after a short term.",
      ],
      decisions: [
        "If you will not stay past year five, do not let years 6–10 pick the winner.",
        "If you will stay, show the extra years on purpose.",
      ],
      compare: [
        "Effective rent per year can hide a longer lock-in.",
        "NPV of extra years is a second sentence, not a silent add-on.",
      ],
      limits: [
        "This page does not forecast market rent in year eight.",
      ],
      whenNot: [
        "If both terms match, skip the extra-year lecture and compare the cash.",
      ],
      related: [
        { href: "/lease-comparison/", label: "Lease comparison hub" },
        { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "Two-option compare" },
        { href: "/lease-sensitivity-analysis/", label: "Sensitivity hub" },
      ],
      sources: [S.investopediaNpv, S.bls, S.naiop],
    }),
    spec({
      route: "/effective-rent/",
      question: "What is effective rent?",
      directAnswer: "Effective rent is a single average rent number after you spread incentives across the term. It is easy to say. It can hide when cash actually moves.",
      definition: [
        "Effective rent is an average. People use it to turn a messy lease into one rent figure.",
        "It often includes free rent and sometimes TI money by spreading them over the years.",
        "NPV means net present value. That tool keeps time. Effective rent often flattens time.",
        "Both can help. They are not the same sentence.",
      ],
      why: [
        "Averages are easy in a meeting.",
        "They can hide a painful year after a gift year.",
        "A CFO may still want the average. Show the path too.",
        "Brokers get in trouble when the average and the cash path disagree and no one said so.",
      ],
      how: [
        "Add the rent you will pay. Subtract the credits you treat as rent relief.",
        "Divide by the years or the occupied months you chose.",
        "Say what you put in. Say what you left out.",
        "Then, if timing matters, also show NPV.",
      ],
      formula: "Effective rent ≈ (rent over the term − credits you spread) / years you chose to divide by.",
      inputs: [
        ["Rent path", "The actual rent by year"],
        ["Credits in the average", "What you chose to spread"],
        ["Divisor", "Years or months"],
      ],
      years: years(37000, 9000, 10000, 0.03, [
        "The average would smear this credit.",
        "NPV would keep this year heavier after the gift.",
        "Steps still sit in the path.",
        "An average can look calm while this year jumps.",
        "The last year is why averages lie softly.",
      ]),
      rate: 0.08,
      exampleName: "the averaged lease",
      assumptions: [
        "This hub treats effective rent as a teaching average, not a market index.",
        "CAM may or may not be inside a given firm's 'effective rent.' Ask.",
      ],
      edges: [
        "Some people exclude TI from effective rent. Say which camp you are in.",
        "Monthly vs annual divisors change the headline.",
      ],
      mistakes: [
        "Calling an average 'NPV.'",
        "Spreading a late credit as if it were cash today.",
        "Leaving extras out of the average and the path.",
      ],
      decisions: [
        "Use effective rent to communicate. Use NPV to keep time.",
        "If they disagree, show both.",
      ],
      compare: [
        "See the spoke page for a direct NPV contrast.",
        "Face rent is even thinner than effective rent.",
      ],
      limits: [
        "There is no single official effective-rent law on this page.",
      ],
      whenNot: [
        "When the question is 'when do I pay,' an average is the wrong lead.",
      ],
      related: [
        { href: "/effective-rent/effective-rent-vs-npv/", label: "Effective rent vs NPV" },
        { href: "/commercial-lease-npv/", label: "NPV hub" },
        { href: "/lease-comparison/", label: "Lease comparison" },
      ],
      sources: [S.investopediaNpv, S.naiop, S.boma],
    }),
    spec({
      route: "/effective-rent/effective-rent-vs-npv/",
      question: "Effective rent vs NPV: what is the difference?",
      directAnswer: "Effective rent is an average rent number. NPV is later cash brought into today's dollars and added. Use the average to talk. Use NPV when timing matters.",
      definition: [
        "Effective rent is an average rent after incentives.",
        "NPV means net present value. It shrinks later cash instead of spreading it flat.",
        "If a credit happens now, NPV gives it more weight than a credit that happens later.",
        "An average can give the later credit the same voice as the early one.",
      ],
      why: [
        "Teams mix the words and then argue about a number that is not the same object.",
        "A client can think they heard a discounted answer when they heard an average.",
        "That mix creates fake certainty.",
        "Naming the tool prevents that.",
      ],
      how: [
        "Build one cash list.",
        "Make the average from that list if you need a headline.",
        "Make the NPV from the same list with a visible rate.",
        "If the rank differs, say why. It is usually timing.",
      ],
      formula: "Average = flatten. NPV = shrink later years, then add.",
      inputs: [
        ["Same cash list", "Do not switch inputs between tools"],
        ["Average rule", "What you spread"],
        ["NPV rate", "How you shrink"],
      ],
      years: years(40000, 8800, 16000, 0.045, [
        "An early credit boosts both tools, but NPV more.",
        "The average already smeared the gift.",
        "Steps hurt the average less than they hurt undiscounted totals.",
        "NPV still sees later weight if the rate is modest.",
        "This last year is where the two tools can disagree.",
      ]),
      rate: 0.08,
      exampleName: "the contrast lease",
      assumptions: [
        "Same five-year list for both tools.",
        "8 percent NPV rate for teaching.",
      ],
      edges: [
        "If you change the divisor, the average moves and NPV does not.",
        "If you change the rate, NPV moves and the average does not.",
      ],
      mistakes: [
        "Reporting both numbers without saying which ranked the deal.",
        "Using effective rent in a sentence that claims 'present value.'",
      ],
      decisions: [
        "Lead with the tool that matches the question.",
        "If the question is timing, lead with NPV.",
      ],
      compare: [
        "Face rent is weaker than both.",
        "Total cash is closer to a raw add than to NPV.",
      ],
      limits: [
        "Neither tool scores a bad floor plan.",
      ],
      whenNot: [
        "Do not pick a winner with an average if the client asked about time.",
      ],
      related: [
        { href: "/effective-rent/", label: "Effective rent hub" },
        { href: "/commercial-lease-npv/what-is-npv-in-a-commercial-lease/", label: "What NPV is" },
        { href: "/lease-comparison/", label: "Lease comparison" },
      ],
      sources: [S.investopediaNpv, S.investopediaDiscount, S.naiop],
    }),
    spec({
      route: "/occupancy-costs/",
      question: "What belongs in occupancy cost?",
      directAnswer: "Occupancy cost is the full bill to sit in the space. Rent is one line. CAM, tax, insurance, and other tenant-paid extras can make a cheap face rent lose.",
      definition: [
        "Occupancy cost is what it costs to occupy, not just the rent on the flyer.",
        "CAM means common area maintenance. It is a shared building cost. Many net leases pass it through.",
        "Tax and insurance can sit beside CAM on a net deal.",
        "NPV means net present value. You can discount occupancy cost, not just face rent.",
      ],
      why: [
        "The lowest rent option can have the higher total occupancy cost.",
        "That happens when extras are large or when credits are small.",
        "A client who buys the rent headline can feel tricked in year two.",
        "Brokers who show extras early keep trust.",
      ],
      how: [
        "Write rent, extras the tenant pays, and credits on one list.",
        "Do not mix a full-service deal with a net deal until you restate extras.",
        "If two cities differ, extras can differ more than rent.",
        "Then discount if timing matters.",
      ],
      formula: "Occupancy cash = rent + tenant-paid extras − credits. Then, if needed, NPV that path.",
      inputs: [
        ["Face rent", "The contract rent"],
        ["CAM", "Shared building cost"],
        ["Tax", "If the tenant pays it"],
        ["Insurance", "If the tenant pays it"],
      ],
      years: years(33000, 14000, 4000, 0.03, [
        "Extras are already a big share here.",
        "A cheap rent story would ignore this CAM line.",
        "Escalation on extras matters too.",
        "A second city could change this more than rent.",
        "The last year still carries extras.",
      ]),
      rate: 0.08,
      exampleName: "the extras-heavy lease",
      assumptions: [
        "The sample is a net-like stack for teaching.",
        "A gross lease would move extras into rent. Restate before you compare.",
      ],
      edges: [
        "Gross versus net is a structure choice. Restate before ranking.",
        "A cap on CAM is an extra term. Model it.",
        "Two locations add more than rent. Think labor and tax.",
      ],
      mistakes: [
        "Comparing rent per foot across a gross deal and a net deal.",
        "Using last year's CAM as if it cannot rise.",
        "Forgetting insurance because it was on another page of the offer.",
      ],
      decisions: [
        "If extras flip the rank, lead with extras, not with rent.",
        "If extras are unknown, say the compare is incomplete.",
      ],
      compare: [
        "Face rent is a subset.",
        "NPV of occupancy cost is the time-aware version of this hub.",
      ],
      limits: [
        "This hub does not price utilities you have not listed.",
      ],
      whenNot: [
        "If both deals are truly full-service and extras are inside rent, say that and compare the rent path.",
      ],
      related: [
        { href: "/lease-comparison/", label: "Lease comparison" },
        { href: "/lease-comparison/how-do-free-rent-and-ti-allowances-affect-npv/", label: "Credits and NPV" },
        { href: "/commercial-lease-npv/", label: "NPV hub" },
      ],
      sources: [S.boma, S.naiop, S.census],
    }),
    spec({
      route: "/lease-sensitivity-analysis/",
      question: "What is lease sensitivity analysis?",
      directAnswer: "Lease sensitivity analysis asks what happens if one key number changes. If the winner flips, the deal was close. If it holds, the rank is more sturdy.",
      definition: [
        "Sensitivity analysis is a set of what-if tests on the same leases.",
        "You change one assumption at a time when you can.",
        "NPV means net present value. The discount rate is a common test.",
        "CAM growth and start dates are other common tests.",
      ],
      why: [
        "A single ranking can look more sure than the inputs.",
        "Clients remember the winner. They should also hear the flip risk.",
        "A broker who hides a flip will redo the deck later under stress.",
        "Finance teams expect a range on a close call.",
      ],
      how: [
        "Freeze the cash rules. Move one knob. Record the rank.",
        "Typical knobs: rate, CAM, commencement, and credit timing.",
        "Show a small grid. Do not bury it.",
        "If every test keeps the same winner, say that in one sentence.",
      ],
      formula: "Same leases, one changed input, new NPV pair, same story format.",
      inputs: [
        ["Base case", "The main ranking"],
        ["Test knobs", "Rate, extras, timing"],
        ["Flip note", "Whether the winner changed"],
      ],
      years: years(40000, 9200, 9000, 0.04, [
        "The base case starts here.",
        "A higher rate would shrink these later years more.",
        "A CAM surprise would lift this row.",
        "A late commencement would slide the whole path.",
        "The last year is a common flip zone.",
      ]),
      rate: 0.08,
      exampleName: "the base-case lease",
      assumptions: [
        "Tests should change one thing when they can.",
        "This hub does not claim a live sensitivity engine is generally available.",
      ],
      edges: [
        "If two knobs move at once, say you ran a scenario, not a clean test.",
        "A renewal case is a scenario.",
      ],
      mistakes: [
        "Testing only the knobs that keep your favorite on top.",
        "Showing six decimals on a flip that is smaller than a missing CAM line.",
      ],
      decisions: [
        "If it flips, slow the meeting down.",
        "If it holds, you can speak with more calm.",
      ],
      compare: [
        "A single NPV is a point. Sensitivity is the neighborhood.",
        "Effective rent rarely shows this neighborhood.",
      ],
      limits: [
        "This is not a Monte Carlo claim.",
      ],
      whenNot: [
        "If the cash list is empty, do not decorate it with a grid.",
      ],
      related: [
        { href: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/", label: "What sensitivity shows" },
        { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "Discount rate" },
        { href: "/lease-comparison/", label: "Lease comparison" },
      ],
      sources: [S.investopediaDiscount, S.investopediaNpv, S.fasb],
    }),
    spec({
      route: "/lease-sensitivity-analysis/what-does-lease-sensitivity-analysis-show/",
      question: "What does lease sensitivity analysis show?",
      directAnswer: "Lease sensitivity analysis shows whether a ranking is sturdy. You change a real assumption, rerun the same leases, and report if the winner holds or flips.",
      definition: [
        "The show is the change in rank, not a new decoration.",
        "NPV means net present value. Each test has a new NPV pair.",
        "A flip means the other option becomes cheaper in today's dollars.",
        "A hold means the first winner stays first.",
      ],
      why: [
        "Close deals need this sentence: 'It still wins if the rate moves a little.'",
        "Or the other sentence: 'It flips if CAM is higher.'",
        "Those sentences are more honest than a single bold number.",
        "They also tell you which input you must verify next.",
      ],
      how: [
        "Write the base winner.",
        "Change the discount rate and record the new rank.",
        "Then change CAM and record again.",
        "Last, change credit timing. Stop when the next test is theater.",
      ],
      formula: "If NPV(A) and NPV(B) change order after one honest input change, report a flip.",
      inputs: [
        ["Base NPVs", "The first rank"],
        ["Changed input", "One knob"],
        ["New NPVs", "The second rank"],
      ],
      years: years(41500, 8700, 11000, 0.03, [
        "Base-case year one.",
        "A CAM test would lift extras here.",
        "A rate test would shrink this year more.",
        "A start-date test would slide this row.",
        "Flips often hide in the last years.",
      ]),
      rate: 0.08,
      exampleName: "the sensitivity sample",
      assumptions: [
        "Illustrative only.",
        "No live customer sensitivity is claimed.",
      ],
      edges: [
        "If data is a guess, the test is a guess.",
        "A huge range can make every deal look unstable. Use nearby values.",
      ],
      mistakes: [
        "Showing a grid with no sentence.",
        "Changing the lease terms and calling it a rate test.",
      ],
      decisions: [
        "Verify the knob that flips the rank before you pick a winner.",
        "If nothing flips, say the rank is sturdy in the tested range.",
      ],
      compare: [
        "A static average will not show this.",
        "A CRM stage change will not show this.",
      ],
      limits: [
        "This page does not run your file.",
      ],
      whenNot: [
        "Do not use sensitivity to paper over a missing rent path.",
      ],
      related: [
        { href: "/lease-sensitivity-analysis/", label: "Sensitivity hub" },
        { href: "/commercial-lease-npv/what-discount-rate-should-you-use/", label: "Discount rate" },
        { href: "/lease-financial-modeling/", label: "Modeling hub" },
      ],
      sources: [S.investopediaDiscount, S.fasb, S.bls],
    }),
    spec({
      route: "/tenant-rep-analysis/",
      question: "How should tenant-rep analysis be framed?",
      directAnswer: "Tenant-rep analysis is a client story: what the space must do, what the cash is, what can flip, and what you still do not know. It is not a CRM record and not a finished software product.",
      definition: [
        "Tenant-rep work is representing the occupier, not the landlord.",
        "The analysis is the compare plus the fit plus the open risks.",
        "NPV means net present value. It is one exhibit in that story.",
        "A brokerage CRM stores people and stages. It does not finish this exhibit.",
      ],
      why: [
        "Clients pay for judgment, not a thicker spreadsheet.",
        "A clear packet saves a second meeting.",
        "A muddy packet creates a third meeting.",
        "This hub exists so the packet can stay short and honest.",
      ],
      how: [
        "Open with the use, then the cash, then the flip tests, and end with leftovers.",
        "Keep sample math labeled as samples.",
        "Do not claim customers or results this site does not have.",
        "Point to the pilot if they want to try the workflow.",
      ],
      formula: "Story = fit + occupancy cash + sensitivity + leftovers.",
      inputs: [
        ["Use", "What the team must do in the space"],
        ["Cash", "Rent, extras, credits"],
        ["Tests", "What can flip"],
        ["Unknowns", "What is still missing"],
      ],
      years: years(40500, 9100, 7000, 0.03, [
        "A client can follow year one if you speak in cash, not slogans.",
        "Extras show up in the story here.",
        "Steps need a sentence in this year.",
        "Mention the rate in the same breath here.",
        "The sample path closes on this last taught year.",
      ]),
      rate: 0.08,
      exampleName: "the client-packet lease",
      assumptions: [
        "No general availability is claimed.",
        "Pricing on this site is a hypothesis.",
      ],
      edges: [
        "A CFO packet is shorter than an analyst workbook.",
        "A first tour packet can omit NPV if cash is not ready.",
      ],
      mistakes: [
        "Leading with software features.",
        "Hiding unknowns.",
        "Treating a CRM note as analysis.",
      ],
      decisions: [
        "If the client can repeat the story, the packet worked.",
        "If they only remember 'lower rent,' the packet failed.",
      ],
      compare: [
        "A CRM is a pipeline tool.",
        "A spreadsheet can be the engine if the story stays clear.",
      ],
      limits: [
        "This is a validation surface, not a launch claim.",
      ],
      whenNot: [
        "Do not force a finance packet on a tour that has no offers yet.",
      ],
      related: [
        { href: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/", label: "How to explain economics" },
        { href: "/for/tenant-rep-brokers", label: "Tenant-rep workflow page" },
        { href: "/how-it-works", label: "How the workflow works" },
      ],
      sources: [S.bls, S.naiop, S.census],
      personaNote: { title: "For brokers", body: "Your job is the story the client can retell. The math is there to keep the story honest." },
    }),
    spec({
      route: "/tenant-rep-analysis/how-should-a-tenant-rep-broker-explain-lease-economics/",
      question: "How should a tenant-rep broker explain lease economics?",
      directAnswer: "The right order is fit, then cash in simple years, then what can flip, then what you still do not know. Keep NPV in today's dollars, not in jargon.",
      definition: [
        "Explain means a client can retell the idea after one pass.",
        "NPV means net present value. Say 'today's dollars' first.",
        "The discount rate is the price of waiting. Say that once.",
        "CAM is a shared building cost. Define it the first time you say it.",
      ],
      why: [
        "A client who cannot retell the deal will not defend it inside their firm.",
        "A CFO wants leftovers named, not hidden.",
        "A long deck with no sentence fails.",
        "A short deck that lies also fails.",
      ],
      how: [
        "Keep one table, one rate, and one leftover list.",
        "Avoid three slides that repeat the same adjective.",
        "If you show a sample, label it as a sample.",
        "If you want them to try the workflow, ask after the story, not before.",
      ],
      formula: "Retell test: can they say fit, cash, flip risk, and leftovers in four short lines?",
      inputs: [
        ["Audience", "Owner, CFO, or operator"],
        ["One table", "The cash"],
        ["One test", "The flip"],
        ["Leftovers", "The unknowns"],
      ],
      years: years(39800, 9300, 6000, 0.028, [
        "Speak year one as cash, not as a slogan.",
        "Call out extras when they stay in year two.",
        "Name the step when it appears in year three.",
        "Keep the rate in the same breath in year four.",
        "Close the leftover list on year five.",
      ]),
      rate: 0.08,
      exampleName: "the spoken sample",
      assumptions: [
        "This is teaching voice, not a script you must read.",
        "No attorney review is claimed.",
      ],
      edges: [
        "A board packet may drop the year walk and keep the gap plus leftovers.",
        "An operator packet may lead with docks and hours, then cash.",
      ],
      mistakes: [
        "Starting with product features.",
        "Using 'NPV' six times before defining it.",
        "Forgetting to say the site is a pilot if you mention the tool.",
      ],
      decisions: [
        "If they ask for price, answer with the hypothesis and the limit.",
        "If they ask for a meeting, route to the real scheduling path later. This page does not book one.",
      ],
      compare: [
        "A CRM email is not an explanation.",
        "A raw workbook dump is not an explanation.",
      ],
      limits: [
        "No customer results are shown because none are claimed.",
      ],
      whenNot: [
        "Do not give a full NPV lecture on a first tour with no offers.",
      ],
      related: [
        { href: "/tenant-rep-analysis/", label: "Tenant-rep hub" },
        { href: "/for/tenant-rep-brokers", label: "Persona workflow" },
        { href: "/lease-financial-modeling/", label: "Modeling hub" },
      ],
      sources: [S.bls, S.naiop, S.investopediaNpv],
      personaNote: { title: "For finance teams", body: "Ask for the rate, the extras, and the leftovers. If those three are missing, the packet is not done." },
    }),
    spec({
      route: "/lease-financial-modeling/",
      question: "How does lease financial modeling move from proposals to a summary?",
      directAnswer: "The path is proposals, shared assumptions, comparison, sensitivity, then a short client summary. A spreadsheet can do this. A CRM cannot replace it. OccupancyNPV is the live comparison workspace for those steps.",
      definition: [
        "A model is a written set of rules for occupancy cash.",
        "Normalization means both options follow those rules.",
        "NPV means net present value. It is the compare step after the rules are shared.",
        "A summary is the short retell, not the whole workbook.",
      ],
      why: [
        "Most pain is not math. It is two files with two hidden rules.",
        "If assumptions are not shared, the rank is a private language.",
        "A summary that skips leftovers creates a surprise later.",
        "Spreadsheets fail when the rule lives in one person's head.",
      ],
      how: [
        "Read the proposals. List missing fields in the open.",
        "Write the shared rules. Then fill both options.",
        "Compare. Test one or two knobs. Write four sentences.",
        "That is the path. Do not add a seventh tool in the middle.",
      ],
      formula: "Proposals → shared rules → compare → tests → summary.",
      inputs: [
        ["Proposal fields", "Rent, extras, credits, dates"],
        ["Shared rules", "What is in or out"],
        ["Compare", "NPV at one rate"],
        ["Summary", "Fit, cash, flip, leftovers"],
      ],
      years: years(38800, 9600, 7500, 0.03, [
        "A model starts when year one is complete.",
        "Shared rules keep year two honest.",
        "The compare uses these later rows.",
        "A test might change this year.",
        "The summary mentions this last year only if it matters.",
      ]),
      rate: 0.08,
      exampleName: "the model path lease",
      assumptions: [
        "Payment is not collected on this site.",
        "Pilot pricing is a hypothesis.",
      ],
      edges: [
        "If a field is missing, the model is incomplete. Do not fill it with a silent default.",
        "A CRM stage named 'analyzing' is not a model.",
      ],
      mistakes: [
        "Hidden defaults.",
        "A different rate per option.",
        "A summary that invents traction.",
      ],
      decisions: [
        "If the path is missing a step, stop and name it.",
        "If the client wants software, show the workflow, not a launch claim.",
      ],
      compare: [
        "A spreadsheet is a tool. A purpose-built compare can keep the rules visible.",
        "Neither is generally available here as a finished product.",
      ],
      limits: [
        "No adoption numbers are claimed.",
      ],
      whenNot: [
        "Do not build a model to avoid reading the lease.",
      ],
      related: [
        { href: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/", label: "Common mistakes" },
        { href: "/how-it-works", label: "Workflow" },
        { href: "/pricing", label: "Pilot pricing" },
      ],
      sources: [S.fasb, S.investopediaNpv, S.bls],
    }),
    spec({
      route: "/lease-financial-modeling/what-are-common-lease-analysis-mistakes/",
      question: "What are common lease-analysis mistakes?",
      directAnswer: "The common lease-analysis mistake is a missing extra, a credit in the wrong year, a private rate, a mixed term, or a summary that hides leftovers. Any one of these can flip a rank.",
      definition: [
        "A mistake here is a broken rule, not a rounding slip.",
        "NPV means net present value. It will faithfully rank a bad list.",
        "That is why the list matters more than the button.",
        "A pretty chart cannot save a missing CAM line.",
      ],
      why: [
        "These mistakes show up in real packets.",
        "They waste a second cycle with the client.",
        "They can also pick the wrong site.",
        "Naming them is cheaper than repeating them.",
      ],
      how: [
        "Review extras, credit timing, the rate, the term window, and the leftovers.",
        "If any check fails, do not publish the rank.",
        "Write the fail in the open.",
        "Then fix the row and rerun.",
      ],
      formula: "No rank until extras, credits, rate, window, and leftovers are visible.",
      inputs: [
        ["Extras present", "Yes or no"],
        ["Credit year", "Matches the deal"],
        ["Shared rate", "Yes or no"],
        ["Shared window", "Yes or no"],
      ],
      years: years(42000, 10200, 13000, 0.036, [
        "A wrong credit year would distort this row.",
        "A missing extra would understate this row.",
        "A private rate change would shrink this row only.",
        "A mixed term would add ghost years after this.",
        "A leftover left unsaid would sit here in silence.",
      ]),
      rate: 0.08,
      exampleName: "the mistake-check lease",
      assumptions: [
        "Samples only.",
        "No claim that every firm makes every mistake.",
      ],
      edges: [
        "A known missing field is not a mistake if you label the compare incomplete.",
        "A rounded dollar is fine. A hidden default is not.",
      ],
      mistakes: [
        "This whole page is the list. The extra mistake is pretending the list is complete.",
        "Another mistake is using this page as sales pressure.",
      ],
      decisions: [
        "If two mistakes appear, fix both before you pick a tone of certainty.",
        "If none appear, you can speak more calmly.",
      ],
      compare: [
        "A CRM reminder is not a check.",
        "A second pair of eyes on the five checks is worth more than a new color.",
      ],
      limits: [
        "This is not legal review.",
      ],
      whenNot: [
        "Do not use a mistakes lecture to delay a tour that has no numbers yet.",
      ],
      related: [
        { href: "/lease-financial-modeling/", label: "Modeling hub" },
        { href: "/lease-comparison/how-do-you-compare-two-commercial-lease-options/", label: "Clean compare" },
        { href: "/commercial-lease-npv/when-is-npv-the-wrong-metric/", label: "When NPV is wrong" },
      ],
      sources: [S.investopediaNpv, S.boma, S.fasb],
    }),
  ];
}
