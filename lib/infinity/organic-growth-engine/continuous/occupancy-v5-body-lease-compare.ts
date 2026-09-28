/**
 * Compare two commercial lease options on one timeline — V5 from-zero body.
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_LEASE_COMPARE_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/how-do-you-compare-two-commercial-lease-options/",
  venture_id: "occupancynpv",
  primary_topic: "comparing two commercial lease options on one timeline",
  primary_reader_job: "Align two occupancy-cost paths, discount them, and pick without confusing tenant NPV with property valuation.",
  must_cover: ["same years", "occupancy-cost NPV", "discount rate", "free rent", "recoveries"],
  allowed_supporting: ["CAM first-year link", "lease inputs checklist", "compare tool"],
  out_of_scope_for_page: ["bike night", "cap rate hub math", "Fed rate forecast"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyLeaseCompareV5Body() {
  const answer =
    "Put both occupancy-cost paths on the same years, include base rent, recoveries, free rent, and one-time costs, then discount each path. A lower face rent can still lose on occupancy-cost NPV. That is a tenant cash question—not a property cap rate.";

  const headings = [
    "Start with one timeline",
    "What belongs on each occupancy-cost path",
    "Why a lower face rent can still lose",
    "Discount rate and occupancy-cost NPV",
    "Tenant cash versus property valuation",
    "A worked two-lease sketch",
    "Stress-test before you pick lease A or B",
    "Unequal terms and missing inputs",
    "Common mistakes and limitations",
    "Related OccupancyNPV reading",
  ];

  const body = paragraphs([
    "How do you compare two commercial lease options on one timeline? Line up the same calendar or lease years for both deals, build an occupancy-cost path for each (rent plus recoveries minus free rent plus one-time costs), and discount those cash flows with a discount rate you label. The winner is the path with the lower present value of occupancy cost—not the lower starting rent quote. Face rent is only the opening line; base rent steps, expense stops, gross-up clauses, CAM estimates, taxes, insurance, utilities if tenant-paid, parking, and tenant-paid buildout all change what you actually pay to occupy.",
    "Nominal total cost adds dollars across years without time value, while discounted cost respects that a dollar in year five is not the same as a dollar in year one. Occupancy-cost NPV is the discounted sum of tenant occupancy cash. Use both views in your workbook: nominal totals expose year-one shock, and discounted totals support the full-term decision. Rent steps and CPI bumps belong in the year they trigger, so copy escalation tables from each proposal instead of assuming flat rent.",
    "Why can a lower rent still lose? Higher recoveries, shorter free rent, heavier tenant-improvement payback, or a higher discount rate on back-loaded expenses can flip the result. Lease B at $28 per square foot plus $6 of CAM can beat Lease A at $32 all-in when you run five years on the same occupancy-cost path and discount both. Shorter free rent on the higher-rent deal can still win when recoveries are lower if you run the full path instead of stopping at month one.",
    "Free rent changes which months print zero rent but may not eliminate CAM or operating recoveries, so write free-rent months explicitly on the timeline. CAM, taxes, and insurance belong on the path as labeled estimates until reconciliation proves otherwise, and you should stress-test CAM plus 10 percent on each path before you treat either estimate as conservative. Tenant improvement allowances reduce cash out while tenant-paid buildout increases it; record TI and move costs in the year they hit.",
    "The discount rate is an analysis input reflecting how you value future occupancy cash—not a property yield. Tenants often use a hurdle rate or borrowing cost, and that number should be stated on the worksheet. Occupancy-cost NPV discounts what the tenant pays to occupy and answers whether Lease A or Lease B is cheaper in present-value terms over the compare horizon.",
    "Tenant occupancy-cost analysis is not a property cap rate. A cap rate divides building NOI by price for an investor, and mixing the two identities is a category error. Keep buyer math on valuation pages and tenant math here. How is tenant NPV different from a building cap rate? Tenant occupancy-cost is not a property cap rate—it is a separate question.",
    "Sketch Lease A at $32 per square foot all-in for five years on 10,000 square feet: $320,000 per year of occupancy cash if flat. Sketch Lease B at $28 base plus $6 CAM: $340,000 in year one if CAM holds. Over five years with no steps, B pays $20,000 more per year in this example. Discount both paths at a labeled rate; B still loses unless free rent or TI changes the early years enough. Lease A $32 and Lease B $28 plus CAM are illustrative round numbers for the workbook, not a client result.",
    "Run a stress-test: raise CAM on both paths by 10 percent and revisit the discount rate. If the winner flips, you are deciding on thin estimates, so request both recovery estimates before you pick lease A or B. After you pick on discounted occupancy cost, re-run the stress-test with CAM plus 10 percent and a discount rate one notch higher; if the winner flips twice, negotiate recoveries or free rent before you sign.",
    "When terms differ—seven years versus five with an option—extend the shorter path with labeled assumptions for leftover years or compare only the shared window. Early termination and expansion options are separate paths you model explicitly. Missing inputs should stay blank: do not invent market-average CAM to finish the workbook, and hold the compare until the checklist is complete if you only have face rent.",
    "Common mistakes include a one-for-one rent compare, ignoring free rent, using a property cap rate as the tenant discount rate, and comparing different year counts without labeling tail years. This page is general information, not legal advice, and not automatically the lease you should sign. What is still out of scope? Building purchase analysis and investor rate forecasting—those live on other OccupancyNPV notes.",
    "Align the years, build both occupancy-cost paths, name the discount rate, stress-test recoveries, discount both paths, and open the compare tool when your cells are sourced. OccupancyNPV discounts the path you enter and does not invent missing CAM. For first-year CAM labeling, read the CAM first-year article; for inputs, read the lease-numbers note; for occupancy cost versus rent, read the occupancy-cost article.",
    "Parking, utilities on separate meters, percentage rent breakpoints, and operating expense caps each deserve their own row so nothing hides inside base rent. Normalize rentable square footage before you compare paths when brokers quote different measurement bases. Year-by-year tables help reviewers see where paths cross: export year, rent, recoveries, free rent, one-time costs, and net occupancy cash for each lease on the same rows.",
    "Compare nominal totals at the horizon and present value at the same horizon; if they disagree, explain why timing drove the result. Document renewal assumptions, prorate stub-year occupancy when commencement is mid-year, and model energy pass-through spikes when caps expire. Request both recovery backups in writing before leadership approves a lease.",
    "How do you compare two commercial lease options on one timeline? Same years, occupancy-cost path for each, discount both. Why can a lower rent still lose? Higher recoveries, shorter free rent, occupancy-cost NPV on the full path. What stress-test belongs in the workbook? Stress-test CAM plus 10 percent and revisit the discount rate until the winner is stable.",
    "Industrial tenants should still write expense stops and gross-up language plainly even when base rent looks all-in, because the next dollar of operating cost may move differently on each path. Retail tenants with percentage rent need a natural breakpoint row so occupancy cost does not ignore sales exposure. Medical and lab buildouts often concentrate cash in year zero; put allowance and tenant-paid work in the correct years before you discount.",
    "Coworking and flex proposals that quote a single per-desk price still need renewal and expansion fees on the timeline when those fees appear in the agreement. Assignment and subletting profit shares belong in exit scenarios, not in the base hold-to-term compare unless you explicitly model exit. Landlord delay risk can shift free rent—when delay is material, model a slip on one path and see if the winner changes.",
    "Security deposits affect upfront cash but are not the same as occupancy cost in NPV terms; still show them in a summary table for treasury. One-time moving allowances belong in the receipt year. Concessions packaged as net effective rent should be unpacked into free rent and base rent instead of comparing a smoothed fiction.",
    "Tax reassessments and insurance pass-throughs billed outside CAM need parallel rows on both paths so you do not double-count inside CAM. Utilities on separate meters should never sit inside CAM rows. When only year-one CAM is quoted, label later years as uncertain and widen the stress-test rather than pretending stability.",
    "Brokers and tenant reps can share this workbook with counsel: attorneys review enforceability while the rep verifies every cell ties to a proposal line. If either landlord refuses backup for recoveries, hold the compare instead of filling blanks. A disciplined compare protects both sides from a rent-only story.",
    "After discounting, compare nominal year-one occupancy cash alongside NPV when treasury cares about near-term liquidity. A slightly higher NPV with much lower year-one cash may still be acceptable if you document the trade. Write the discount rate next to the winner so a reviewer can reproduce the pick without reopening the entire email thread.",
    "Renewal options can be modeled as a branch path with option rent labeled, or excluded from the base compare with a footnote that the decision is hold-to-initial-term only. Mixing option rent into year one without labeling corrupts occupancy-cost NPV. Pick one convention and keep it for both leases.",
    "Early termination fees belong in the termination year when you model exit; otherwise state that the compare assumes hold-to-term and exclude exit fees. Expansion options that add square footage mid-term are a second scenario, not a tweak to year-one rent.",
    "OccupancyNPV and similar tools are useful once paths are sourced—they discount labeled cash flows rather than guessing CAM. Request the included-expenses list and recovery clause excerpts when you request proposals so the path is defensible in committee.",
    "Face rent with 2.5 percent annual bumps diverges slowly from 3 percent bumps until later years, which is why escalation tables belong on the worksheet. CPI collars and caps change how recoveries grow; when a lease includes a cap, model an uncapped branch if the cap expires.",
    "Shorter free rent on lease A can still win when lease B carries higher recoveries every year after abatement, which is why you must discount the full occupancy-cost path rather than comparing abatement months alone. Higher recoveries and shorter free rent are the usual reasons a lower face rent loses on occupancy-cost NPV.",
    "Pick lease A or B only after paths align on the same years, after CAM plus 10 percent stress-test, and after you re-run the stress-test if the discount rate moves. That decision sequence keeps negotiation focused on recoveries and timing instead of headline rent alone.",
    "When you present results internally, show both leases on one timeline chart: occupancy cash by year before discounting, then present value by year after discounting. Visuals expose crossing points that tables hide. Decision makers often care where the paths cross more than they care about the final NPV delta alone.",
    "Sublease income belongs off the tenant occupancy-cost path unless your lease requires pass-through; do not net sublease rent into base rent without lease language. Landlord construction delays that push commencement should shift every scheduled cash flow month, not only rent, because recoveries may start on different triggers.",
    "If one landlord quotes CAM as a fixed annual dollar and another quotes PSF, convert both to the same basis using rentable square footage before you build paths. Mixed units are a frequent source of false winners. Document the conversion in the workbook so a reviewer can audit the math.",
    "Keep a version number on the workbook when proposals change mid-process. A compare that mixed draft two CAM with draft three rent is worse than no compare because it looks precise. When numbers update, rebuild both occupancy-cost paths from scratch on the same years, discount again, and archive the superseded file so committee reviewers never cite stale occupancy-cost NPV results or outdated recovery estimates.",
  ]);

  const faqs = [
    {
      question: "Can I compare leases with different lengths?",
      answer: "Yes if you extend the shorter path with labeled assumptions or compare only the shared years and document the tail.",
    },
    {
      question: "Should I use a cap rate as my discount rate?",
      answer: "No. Cap rate is for building valuation. Use a tenant-appropriate discount rate you can explain.",
    },
    {
      question: "What if CAM is unknown?",
      answer: "Leave the cell blank or use a labeled estimate from the landlord. Do not invent an average to force a winner.",
    },
  ];

  return { answer, headings, body, faqs };
}
