/**
 * Lease input checklist — V5 from-zero body.
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_LEASE_NUMBERS_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/what-numbers-do-you-need-to-compare-two-leases/",
  venture_id: "occupancynpv",
  primary_topic: "inputs required before comparing commercial leases",
  primary_reader_job: "Collect lease term, rent, recoveries, concessions, and timing before a two-lease compare.",
  must_cover: ["checklist", "free rent", "tenant improvement", "CAM estimate"],
  allowed_supporting: ["compare article link", "CAM first-year link"],
  out_of_scope_for_page: ["bike night", "full NPV walkthrough", "cap rate formula"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyLeaseNumbersV5Body() {
  const answer =
    "Before you compare two commercial leases, gather face rent, free rent, tenant improvement, CAM and recovery terms, taxes, insurance, term, commencement, options, and one-time fees on a checklist. A rent-only file is how a cheaper face rent still loses once recoveries and concessions sit on the timeline.";

  const headings = [
    "The lease-number checklist",
    "Recovery terms that change cash",
    "Term, commencement, and options",
    "What a rent-only file still misses",
    "Documents to request",
    "Examples that move year-one cash",
    "Edge cases on the checklist",
    "Common mistakes and limitations",
    "Next steps toward a compare",
  ];

  const body = paragraphs([
    "What numbers do you need before you compare two commercial leases? Start with a checklist: base rent and escalations, free-rent periods, tenant improvement allowance and tenant-paid buildout, CAM or operating expense estimates, taxes and insurance if tenant-paid, utilities where relevant, parking, security deposit, upfront fees, lease term, commencement date, renewal and expansion options, and early termination rights. Missing one line can invert a compare, so finish the checklist before any discount-rate argument begins.",
    "Face rent alone is insufficient because recoveries and concessions move occupancy cash. Free rent changes which months print zero base rent but may not stop CAM. Tenant improvement of $40,000 or three months free can dominate year-one cash even when starting rent looks higher on the other deal, which is why the checklist names free rent and tenant improvement explicitly instead of hiding them inside net effective rent slogans.",
    "Expense stop, base year, and gross-up language change who pays the next dollar of operating cost. Write the mechanism beside any CAM estimate so you know whether the number is a budget, a stop, or a base-year comparison. If the packet has no CAM budget, leave the cell blank rather than inventing an average, and mark the row incomplete until the landlord sends the included-expenses list and prior-year reconciliation statement.",
    "Commencement date and lease term define the timeline. Mid-year occupancy means stub-year cash, not twelve months of every line. Option rent and early termination belong in the file even if the first compare assumes hold-to-term, because options change tail years when you extend the analysis and because expansion options with new square footage need trigger dates captured on the checklist.",
    "What is still missing if you only have face rent? You still miss the CAM estimate, tax, and insurance lines, plus free rent and TI that move year-one occupancy cash. You also miss gross-up and expense stop language that explains why two CAM quotes are not comparable, which is how a rent-only file still loses once recoveries appear.",
    "Request a packet in writing: included-expenses list, prior-year reconciliation statement, CAM budget worksheet, recovery clause excerpts, and rent escalation table. Brokers can send the checklist as the first request list; tenants can score proposals complete or incomplete before any NPV math. Completeness beats a low face rent number that hides CAM.",
    "Stress-test CAM plus 10 percent on any estimate before you treat it as conservative. Complete the checklist, request prior-year reconciliation, and only then put both leases on one timeline in the compare workbook. Hold the compare when blank CAM cells remain after two request rounds; negotiate for backup before committee sees NPV winners built on guesses.",
    "Parking ratios, reserved stalls, percentage rent breakpoints, move costs, signage allowances, and after-hours HVAC belong on the checklist when material. Discount rate belongs as an analysis input you will label later. Security deposit and letter-of-credit requirements affect upfront treasury cash even when they are not occupancy-cost NPV lines.",
    "Edge case mid-year occupancy: prorate rent, CAM, and free rent for stub months and note stub-year cash is not twelve months. Edge case option to expand: capture expansion square footage, expansion rent, and trigger dates even when the first compare excludes exercising the option. Face rent escalations on CPI with floors and caps need the index name; fixed-step schedules need year-by-year rows.",
    "Common mistakes include a rent-only file, ignoring free rent, ignoring tenant improvement timing, treating CAM as a finished bill, and comparing different rentable square footage without normalizing SF. This page is not legal advice and not automatically a complete diligence file; if the landlord will not share a CAM budget, hold the compare until backup arrives.",
    "What numbers do you need? A checklist with free rent and tenant improvement. Which recovery terms change cash? Expense stop, base year, and gross-up. What term facts belong in the file? Commencement, option rent, and early termination. What is still missing with face rent only? CAM estimate, tax, and insurance.",
    "Industrial gross leases still need clarity on included versus billed lines. Medical tenants separate TI and equipment. Coworking deals capture renewal jumps. Utilities separately metered stay off CAM rows. Insurance and tax billed directly get their own rows to prevent double-counting that flatters face rent compares.",
    "When landlords quote net effective rent, unpack into base rent and free rent on the checklist. Assign an owner for each blank cell with a due date. Revisit the checklist after every proposal revision and archive versions so draft two TI never pairs with draft three rent.",
    "After the checklist is complete, open the compare article for one-timeline occupancy-cost NPV and the CAM first-year article for labeling estimates. OccupancyNPV discounts paths you enter and does not invent missing CAM. Insurance, tax, CAM, utilities, parking, rent, free rent, TI, term, commencement, options, and fees—when sourced, you are ready to align years and discount both paths.",
    "Decision support: ask for the packet before you hold the compare; complete the checklist before you align years; request prior-year reconciliation before you stress-test CAM. Those three decisions prevent rent-only files from reaching committee and keep face rent from masquerading as a full occupancy-cost story.",
    "Load factors, rentable versus usable square footage, assignment fees, landlord work letters, temporary space during relocation, and environmental pass-throughs each deserve checklist rows when the lease mentions them. Data center tenants add power and cooling rows; retail tenants add co-tenancy and percentage rent rows when decision-relevant.",
    "Counsel may flag legal issues separately, but the checklist remains the numeric spine tenant reps use. Digital lease drafts still need numbers before compare. OccupancyNPV users should not enter compare until every row ties to a proposal line or a written estimate with a name and date.",
    "Follow-up questions for landlords include whether CAM is estimate or stop, whether free rent includes CAM, whether TI is allowance or reimbursement, and whether option rent is fixed or fair market—record answers on the checklist rows so later reviewers inherit context instead of restarting diligence.",
    "When the checklist is complete, attach it as the source index to the one-timeline compare workbook, stress-test CAM plus 10 percent, and only then pick lease A or B with leadership. That sequence keeps recoveries and concessions visible instead of buried under face rent headlines.",
    "Face rent, free rent, tenant improvement, expense stop, and gross-up should appear as words on the checklist itself so new analysts do not treat CAM as a mystery line. Each term ties to a row and a document request, which prevents the rent-only file mistake where year-one looks cheap because recoveries were never requested.",
    "Commencement and early termination interact: a late commencement pushes stub-year cash; an early termination fee belongs in the termination year if you model exit. Option rent on renewal belongs in the checklist even when the first compare assumes you depart at initial term end, because renewal economics often decide whether the initial term was truly cheap.",
    "Tax reassessments, insurance deductibles passed through, and management fees inside CAM pools can each move occupancy cost without moving face rent. When the lease mentions them, add rows immediately instead of assuming they are immaterial—materiality shows up only after you build the table.",
    "Retail co-tenancy and percentage rent breakpoints belong on strategic appendices but percentage rent still affects occupancy cost when sales exceed breakpoints; office tenants may ignore percentage rent but still need expense stop language beside CAM estimates.",
    "Compare checklist completeness between landlords before you compare numbers. A higher face rent with complete backup often beats a lower face rent with missing CAM because the second compare will change the moment recoveries arrive.",
    "Tenant reps should email the checklist as the first response to any proposal PDF. Landlords respond faster when the request list is specific. Tenants protect themselves when incomplete packets are marked not-ready-for-compare instead of being rushed into NPV slides.",
    "Owners evaluating tenant bids can require the same checklist so proposals are comparable across credit and use. Consistency reduces arguments about who hid recoveries in footnotes versus body rent.",
    "Digital data rooms still need the checklist indexed to filenames so reviewers find the CAM budget worksheet without searching. Version the index when drafts change.",
    "OccupancyNPV compare workflows assume sourced rows; entering guesses defeats the tool. Complete the checklist, label uncertainty, then align years and discount both paths using the compare article method.",
    "If counsel negotiates legal points, tenant reps still own numeric completeness. Legal wins do not fix a rent-only economic compare missing TI or free rent.",
    "Three months free and $40,000 TI remain the canonical examples that move year-one cash more than small face rent deltas—keep them on the checklist template as reminders during fast-moving deals.",
    "Audit rights and reconciliation timing belong on the checklist because they define when CAM estimates become actuals and what proof you can demand if occupancy cost jumps after year one. Without those rows, tenants discover audit windows only after a surprise bill.",
    "Assignment and subletting economics belong when exit flexibility matters; profit-sharing on sublease rent changes effective occupancy cost in exit years if you model hold versus leave scenarios across both leases under review.",
    "Construction interest passed through during buildout, temporary space rent during relocation, and moving allowances each change early-year checklist cash and should not be folded into base rent rows just to simplify the spreadsheet.",
    "Energy pass-through caps and sustainability surcharges appear more often in modern leases; when present, they need named rows so face rent comparisons do not ignore regulated cost recovery that repeats annually.",
    "Completing the checklist is the professional standard before any landlord claims victory on rate alone. Teams that skip it usually return to the same conference room after CAM estimates arrive and invert the winner.",
    "Rate locks, index floors, and index caps on operating expenses belong beside escalation tables because they change future checklist rows even when year-one face rent looks fully negotiated today.",
    "Warehouse tenants should confirm who maintains sprinklers, yard, and dock equipment; office tenants confirm after-hours HVAC rates; each item becomes a checklist row when the lease assigns cost to the tenant.",
    "Record who provided each number—broker, landlord, prior tenant—and the date received so later revisions do not overwrite sourced rows without a version bump.",
    "The checklist is the contract translated into rows before math begins: every blank cell is a question to send, every sourced cell is a footnote to cite in committee, and every completed row moves you closer to a defensible two-lease compare on one timeline with stress-tested CAM and labeled free rent.",
    "Keep a printed checklist in diligence binders so external counsel and internal treasury see the same missing items; visibility prevents the rent-only file from slipping through because a deadline pressure shortcut skipped recovery requests.",
    "Sourced checklist rows become the footnotes in your compare workbook; unsourced rows stay yellow until the landlord answers. That color discipline is how teams avoid presenting occupancy-cost NPV slides built on invisible assumptions.",
    "Broker marketing packets often lead with face rent and bury recoveries in attachments; the checklist reverses that order by forcing CAM, tax, insurance, free rent, and TI onto page one of your diligence file before any ranking conversation starts. When two brokers send different formats, normalize both into the same row names so analysts are not comparing apples to oranges because column headers differ.",
  ]);

  const faqs = [
    { question: "Do I need TI on the checklist?", answer: "Yes when one deal funds buildout and the other does not; TI moves occupancy cash." },
    { question: "Can I skip free rent?", answer: "No. Ignoring free rent is a common rent-only mistake." },
    { question: "What if CAM is missing?", answer: "Leave the cell blank and request the budget worksheet and prior-year actuals." },
  ];

  return { answer, headings, body, faqs };
}
