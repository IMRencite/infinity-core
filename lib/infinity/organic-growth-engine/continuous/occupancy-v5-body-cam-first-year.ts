/**
 * Customer-facing first-year CAM article — V5 from-zero body.
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";
import {
  OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER,
  OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION,
} from "./occupancynpv-cam-first-year-page";

export const OCCUPANCY_CAM_FIRST_YEAR_TOPIC: PageTopicBoundary = {
  page_id: "/blog/occupancy-costs/cam-first-year/",
  venture_id: "occupancynpv",
  primary_topic: "first-year CAM for commercial tenants",
  primary_reader_job: "Place first-year CAM on the occupancy-cost timeline with rent and judge whether the quoted figure is usable.",
  must_cover: ["CAM estimate", "expense stop", "reconciliation", "occupancy-cost table"],
  allowed_supporting: ["lease compare link", "NPV link", "what is CAM hub"],
  out_of_scope_for_page: ["bike night", "group ride", "motorcycle apparel"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyCamFirstYearV5Body() {
  const answer = OCCUPANCYNPV_CAM_FIRST_YEAR_DIRECT_ANSWER;

  const headings = [
    "What first-year CAM is—and is not",
    "Estimate, expense stop, and base year",
    "Put CAM on the occupancy-cost timeline",
    "Compare two leases when CAM differs",
    "Stub-year cash and mid-year occupancy",
    "Reconciliation deficit and audit rights",
    "Gross-up, CAM cap, and separately billed lines",
    "What first-year CAM typically includes versus excludes",
    "How landlords estimate first-year CAM",
    "Controllable versus uncontrollable expenses",
    "How first-year CAM changes occupancy-cost NPV",
    "Documents to inspect and red flags",
    "When to accept the estimate, demand backup, or leave the cell blank",
    "First-year CAM checklist",
    "Common mistakes",
    "Limitations",
    "Related reading on OccupancyNPV",
  ];

  const body = paragraphs([
    `${OCCUPANCYNPV_CAM_FIRST_YEAR_QUESTION} Start by treating the number as a labeled occupancy-cost estimate on the same timeline as rent. First-year CAM is projected versus reconciled; it is not a finished bill. Copy the lease language before you compare face rent.`,
    "Common area maintenance (CAM) pays for shared operating costs—hallways, lobbies, landscaping, common utilities, and similar lines defined in the lease. In year one you often receive a CAM estimate: a budget for the operating year. Estimated CAM is not the same as reconciled CAM after actual expenses are known. Label which you are holding.",
    "An expense stop versus a base-year comparison changes who pays the overrun. The estimate is a budget. A stop is a ceiling on the tenant share. A base-year comparison starts from a documented operating-expense year and bills overages from that baseline. Use an occupancy-cost table so those three ideas do not collapse into one cell named CAM.",
    "Is first-year CAM the same as the final CAM bill? No. You may reconcile later when the landlord sends a statement of actuals. Until then, label it as projected occupancy-cost cash, not a closed number.",
    "Build an occupancy-cost table beside rent. CAM equals PSF times rentable SF. Lease A might show $8,000 monthly rent and $14 CAM per square foot on 4,000 rentable square feet. CAM cash is $56,000 for a full year. Year-one occupancy cash is $96,000 of rent plus $56,000 of CAM, or $152,000. Lease B might show $7,400 monthly rent and $18 CAM, or $72,000 of CAM. Year-one occupancy cash is $88,800 plus $72,000, or $160,800. Lower rent did not win year one when CAM was higher.",
    "Estimate versus stop versus base year belongs in a small table on your worksheet: row one is the CAM estimate (budget), row two is the expense stop if the lease uses one, row three is the base-year reference if recoveries compare to a documented year. Keep projected versus reconciled labels on the same page as rent.",
    "Stub-year cash matters when mid-year occupancy means you are not paying twelve months. If occupancy starts in September, a $56,000 full-year estimate might represent about $18,667 of stub-year cash, not $56,000 in the first calendar window. Do not annualize a stub and call it year one.",
    "At reconciliation, a reconciliation deficit appears when actual common-area expenses exceed the estimate. Who pays a deficit is a lease question—read the clause. Demand the backup: the prior-year reconciliation statement, the included-expenses list, invoices for the largest lines, and the CAM budget worksheet before you pay a catch-up bill.",
    "A vacant-building gross-up can inflate first-year CAM as if the building were fuller than it is. A CAM cap can limit the tenant share. Utilities versus CAM and other separately billed lines stay off the CAM cell unless the lease puts them there. Copy the included-expenses list before you merge cells.",
    "What first-year CAM typically includes versus excludes: it typically includes janitorial, common-area utilities, landscaping, and routine common-area repairs when the lease puts them in the CAM pool. It typically excludes capital replacements such as a new roof, separately metered tenant utilities, and insurance or tax lines the lease bills on their own.",
    "How do landlords estimate first-year CAM? Landlord estimates usually start from prior-year actuals, then adjust for known contracts and budget changes. If the packet has no prior-year actuals, treat the figure as weak. Request the CAM budget worksheet and last year’s backup.",
    "Controllable expenses—janitorial contracts, landscaping bids—can be renegotiated. Uncontrollable items such as property taxes move with the jurisdiction. A tenant who cannot separate controllable from uncontrollable cannot stress-test year one honestly.",
    "How does first-year CAM change occupancy-cost NPV? Extra CAM cash is discounted on the same occupancy-cost NPV timeline as rent. A $6,000 step in a later year still has present value. OccupancyNPV discounts the path you enter; it does not invent CAM averages.",
    "What CAM documents should a tenant inspect? The included-expenses list, the CAM budget worksheet, and the prior-year reconciliation statement. Ask for supporting invoices for the largest lines and read the audit right and challenge window if the lease provides them.",
    "What red flags mean the CAM estimate is not usable? A red flag is a packet with no backup, a landlord who refuses actuals, or a first-year number that cannot be tied to either an estimate or a stop. Leave the cell blank rather than invent a market average.",
    "When should you accept the estimate versus demand more detail? Accept the estimate only as a labeled projection when the lease and budget worksheet support it. Demand the backup when the packet has no CAM budget or no included-expenses list. Leave the cell blank when the landlord hides the occupancy extra.",
    "Use this checklist for year one: confirm estimate or stop language, copy included expenses, note stub or mid-year occupancy, record reconciliation timing, identify who pays a deficit, read CAM cap and gross-up clauses, confirm audit rights, and list separately billed lines. Print the checklist beside the occupancy-cost table so nothing stays in email only.",
    "Common mistakes include comparing face rent and ignoring CAM, treating an estimate as a final bill, inventing a market-average CAM, using a property cap rate as a tenant CAM number, and mixing a calendar year with a lease year.",
    "This page has a clear limitation: first-year CAM is not second-year CAM, not NOI for a building sale, and not legal advice. It does not automatically tell you which lease to sign. If actual implementation in your lease differs, follow the lease and counsel.",
    "What is still out of scope here? Finished multi-year CAM bills after reconciliation closes and unrelated lifestyle topics. For two leases on one timeline, use the lease comparison tools on OccupancyNPV.",
    "In a meeting, when someone says CAM is eight dollars, ask whether that is an estimate, a stop, or a base-year overage. Ask which operating year. Ask whether the first operating year is twelve months of occupancy. Missing answers mean you do not yet have occupancy-cost cash—only a hallway number.",
    "Stress-test both CAM lines by ten percent. If the cheaper rent lease flips to more expensive total occupancy cash, request better backup before you choose. Write totals on the same worksheet as rent.",
    "Month-one cash is not always year-one cash. A January start and a September start are different occupancy-cost paths even when the CAM estimate on the proposal looks identical. Write the months explicitly.",
    "Who pays a deficit is contractual. Do not guess based on courtesy. Demand supporting invoices, use the audit right if you have one, and note the challenge window before you send money.",
    "Related OccupancyNPV reading stays on occupancy costs: what CAM means in a lease, the lease-number checklist, how two lease options compare on one timeline, and what NPV means for a tenant. Do not cross into property yield articles when the decision is recoveries beside rent.",
    "Write your next step: copy the clause onto the worksheet, request the included-expenses list and prior-year reconciliation statement today, build the two-lease occupancy-cost table, stress-test a 10 percent overrun on both CAM lines, ask for the backup budget from the landlord, label projected versus reconciled, and only then open a compare tool with sourced numbers.",
    "Free rent and tenant improvement allowances do not replace CAM math. A generous TI package can still lose if recoveries run hot in year one. Put concessions on the timeline separately from the CAM estimate so nothing hides inside face rent.",
    "Administrative fees, management fees, and reserve contributions sometimes appear in CAM pools depending on the lease. If the line is material, ask what it funds and whether it repeats. Small recurring fees compound on the occupancy-cost timeline.",
    "Multi-tenant buildings allocate CAM by rentable square footage, sometimes with exclusions for vacant suites. Read the denominator the landlord uses. A gross-up clause can change that denominator when occupancy is low.",
    "Seasonal expenses—snow removal, landscaping peaks—can make the first operating year look unlike a stabilized year. Compare the budget notes to the prior-year reconciliation statement to see whether the estimate is smoothing seasonality.",
    "Tenant reps should send a written request listing the included-expenses list, CAM budget worksheet, and prior-year reconciliation statement in the first information round. Waiting until late diligence compresses the time you have to leave a cell blank when backup is missing.",
    "Owners underwriting a tenant’s credit should still read first-year CAM as projected cash, not as proof of long-term margin. A tenant can afford rent and still stumble on a reconciliation deficit if the lease passes through spikes.",
    "Insurance and tax escalations sometimes sit outside CAM but still affect occupancy cost. When those lines are separately billed, add them as their own rows rather than folding them into CAM for convenience.",
    "After you build the table, recalculate year-one occupancy cash with CAM plus 10 percent on both leases. If Lease B was cheaper at face rent but becomes more expensive under overrun, you have a negotiation point backed by arithmetic, not tone.",
    "OccupancyNPV does not invent CAM when the packet is empty. That discipline protects you from comparing leases with fabricated averages. Leave the cell blank and document the request you sent.",
    "When the lease uses an expense stop, confirm whether the stop is denominated in dollars per square foot or as an absolute cap. A stop changes how overruns flow in later years even when year-one checks look similar.",
    "Base-year language can reference an index year that predates your tenancy. Ask which expenses are grossed up to full occupancy and which are passed through at actual. The answer changes both the estimate and the reconciliation story.",
    "CAM caps sometimes apply only to controllable expenses, leaving uncontrollable taxes outside the cap. Read the definition of controllable in the lease before you assume the cap protects every line in the pool.",
    "Audit rights without a challenge window are weak. Note the deadline to object after a reconciliation arrives. Missing the window can convert a disputed line into an accepted bill by default.",
    "Compare the landlord’s CAM budget worksheet to the prior-year reconciliation statement line by line. Large swings in janitorial, security, or utility lines deserve a note in your file before you sign.",
    "If the building is mixed-use, confirm whether retail, office, and residential tenants share one CAM pool. Allocation methods can shift year-one cash even when your suite’s PSF rate looks market-normal.",
    "Subleases do not eliminate CAM exposure. A subtenant’s share still flows through your lease unless the master lease says otherwise. Model CAM at the master lease level first.",
    "Ground leases and industrial pads sometimes bill CAM-like charges under different labels—operating expenses, common area charges, or maintenance reimbursements. Translate the label back to occupancy-cost cash before you compare.",
    "Year-one CAM is the opening chapter, not the book. Reconciliation timing, true-ups, and second-year budgets can diverge quickly when occupancy in the building changes. Keep projected versus reconciled labels alive in your workbook.",
  ]);

  const faqs = [
    {
      question: "Is first-year CAM the same as the final CAM bill?",
      answer: "No. Year one is usually an estimate or stop-based projection. You reconcile later when actuals arrive.",
    },
    {
      question: "Can I compare leases using rent alone?",
      answer: "Not if CAM differs materially. Put both paths on an occupancy-cost table for year-one cash.",
    },
    {
      question: "What if the landlord will not share a CAM budget?",
      answer: "Leave the cell blank. Do not invent an average. Request prior-year actuals or walk if the extra stays hidden.",
    },
  ];

  return { answer, headings, body, faqs };
}
