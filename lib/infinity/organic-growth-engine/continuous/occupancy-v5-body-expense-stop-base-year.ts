/**
 * Expense stop versus base year — tenant decision support (autonomous backlog).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_EXPENSE_STOP_BASE_YEAR_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/expense-stop-vs-base-year-for-tenants/",
  venture_id: "occupancynpv",
  primary_topic: "expense stop versus base year in commercial leases",
  primary_reader_job: "Explain who pays operating expense overruns under an expense stop versus a base-year recovery clause.",
  must_cover: ["expense stop", "base year", "recoveries", "occupancy cost", "CAM"],
  allowed_supporting: ["gross-up", "reconciliation", "lease compare"],
  out_of_scope_for_page: ["motorcycle apparel", "property cap rate sale math"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyExpenseStopBaseYearV5Body() {
  const answer =
    "An expense stop caps the tenant’s share of operating costs at a stated level—the landlord absorbs dollars above that stop. A base year sets a documented operating-expense year; later recoveries bill tenant share of amounts above that baseline. Both change occupancy cost while face rent on the cover stays flat, so tenants must label the mechanism before they compare CAM quotes.";

  const headings = [
    "Face rent hides the recovery mechanism",
    "What an expense stop actually stops",
    "What a base year actually measures",
    "Same CAM quote, different overrun risk",
    "Build the occupancy-cost table anyway",
    "Documents and red flags before you sign",
  ];

  const body = paragraphs([
    "What is the difference between an expense stop and a base year in a commercial lease? Tenants hear both phrases beside a CAM estimate and treat them as footnotes. They are not footnotes—they decide who pays the next dollar when snow removal spikes, taxes reassess, or the landlord’s budget misses. Face rent on the proposal cover can stay unchanged while recoveries move hundreds of thousands over a term. Operators should copy the recovery article verbatim onto the worksheet before they rank finalists.",
    "An expense stop is a ceiling on the tenant’s share of defined operating expenses. The lease names a stop level—often per square foot or as a dollar cap on recoveries—and assigns amounts above that stop to the landlord. Example: 12,000 rentable square feet with a $14 CAM estimate and a $16 expense stop means the tenant pays recoveries up to the stop mechanics in the lease; dollars above the stop, per the clause, stay with the landlord. That can stabilize year-two cash if expenses run hot, but only if the stop language matches the expense pool you think you are buying.",
    "A base year comparison does not cap recoveries with a single stop line—it anchors recoveries to a documented operating year. The landlord measures actual operating expenses in the base year; in later years the tenant pays its pro-rata share of amounts above that baseline (subject to caps, gross-up, and exclusions in the lease). Example: base year operating expenses were $4.20 per square foot; year three actuals are $4.85; on 12,000 rentable square feet the tenant may owe its share of the $0.65 PSF delta on top of the CAM estimate row. Base-year leases can look cheap in year one when the baseline is recent and low, then step when the building’s costs normalize upward.",
    "Same headline CAM, different risk: Proposal S shows $34 base rent plus $9 CAM with an expense stop at $10 PSF on 12,000 rentable square feet—year-one occupancy cash is about $408,000 of rent plus $108,000 of CAM before free rent. Proposal B shows $33 base rent plus $9 CAM with a 2024 base year and no stop—year-one might match, but year-three with a $1.10 PSF overrun adds roughly $13,200 of recovery cash before gross-up. That is almost $40,000 over three years if the pattern holds—enough to flip a winner once you discount paths on OccupancyNPV.",
    "Build an occupancy-cost table with one row for base rent, one for estimated CAM, one labeled stop or base-year mechanism, and one for stress-test overrun. Gross-up clauses change the denominator when occupancy is low; caps limit growth; exclusions remove lines from the pool. None of that belongs in a single cell named CAM. Compare two leases on one timeline only after each mechanism is spelled in words beside the numbers.",
    "What documents should a tenant request? The included-expenses list, the CAM budget worksheet, the prior-year reconciliation statement, and the clause that defines stop level or base year. Red flags: a base year with no documented actuals, a stop that excludes taxes while CAM includes them on the summary sheet, or a broker slide that shows CAM without naming stop versus base year. Leave cells blank rather than invent market averages.",
    "This page is general information, not legal advice. It does not replace the lease-number checklist or gross-versus-net structure article. Related OccupancyNPV reading: occupancy cost versus rent, what numbers you need to compare two leases, gross lease versus net lease for tenants, and the compare-commercial-leases tool once your table is sourced.",
    "Renewals often reset base years or renegotiate stops—model the flip year before you celebrate a flat rent extension. Sublease and holdover language can inherit the same recovery mechanics; read assignment clauses. Retail and industrial leases use different market shorthand; translate each proposal to occupancy cost before committee sees only face rent.",
  ]);

  const faqs = [
    {
      question: "Is an expense stop the same as a CAM cap?",
      answer: "Not necessarily. A stop limits recoveries by a defined mechanism; a cap may limit growth rates. Read which expenses each applies to.",
    },
    {
      question: "Can a base year change at renewal?",
      answer: "Often yes. Treat renewal base-year resets as a new occupancy-cost path, not a continuation of year-one CAM.",
    },
    {
      question: "Which is safer for tenants?",
      answer: "Neither label is automatically safer; compare projected occupancy cost with sourced stop or base-year language and stress-test overruns.",
    },
  ];

  return { answer, headings, body, faqs };
}
