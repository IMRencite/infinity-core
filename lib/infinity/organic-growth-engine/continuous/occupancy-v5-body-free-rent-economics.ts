/**
 * Free rent and concession economics — tenant decision support (autonomous backlog).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_FREE_RENT_ECONOMICS_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/how-free-rent-affects-occupancy-cost-for-tenants/",
  venture_id: "occupancynpv",
  primary_topic: "free rent economics in commercial leases",
  primary_reader_job: "Model how free rent months, abatement timing, and CAM during abatement change occupancy cost and lease NPV.",
  must_cover: ["free rent", "occupancy cost", "abatement", "tenant improvement", "CAM", "net effective rent"],
  allowed_supporting: ["concession", "commencement", "lease compare", "discount rate"],
  out_of_scope_for_page: ["motorcycle apparel", "property cap rate sale math"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyFreeRentEconomicsV5Body() {
  const answer =
    "Free rent reduces base rent in the months it applies, but occupancy cost still includes CAM, tax, insurance, and tenant-paid lines unless the lease explicitly abates them. Model free rent in the year cash moves, add tenant improvement on its own row, and compare net effective rent only after both paths sit on one timeline.";

  const headings = [
    "Face rent is not the concession story",
    "What free rent actually abates",
    "CAM during abatement is the surprise line",
    "Tenant improvement versus free rent on year-one cash",
    "Net effective rent without hiding recoveries",
    "Compare two proposals with labeled abatement months",
    "Documents and red flags before you sign",
  ];

  const body = paragraphs([
    "How does free rent affect occupancy cost for tenants? Teams celebrate three months free on the cover slide and skip the recovery lines that still print in month one. Free rent is a timing concession on base rent (or sometimes additional rent), not a blank check on operating expenses. Occupancy cost is rent plus recoveries and tenant-paid lines on the same timeline—so abatement months change which cells are zero, not whether CAM belongs in the model.",
    "Read the abatement article: which months base rent is zero or reduced, whether percentage rent abates, and whether the clock starts at lease signing or occupancy. Partial abatement—half rent for six months—is still free rent economics; it just spreads the concession. Gross leases may bundle recoveries, but abatement language still matters when the landlord reconciles expenses later.",
    "CAM during abatement is the surprise line. Many leases abate base rent but not CAM, tax, or insurance. Example: 10,000 rentable square feet, $36 base rent, $9 CAM estimate, three months free on base rent only—year-one occupancy cash is about nine months at $36 plus twelve months at $9 per square foot, roughly $378,000 of rent plus $108,000 of CAM before TI. A team that budgeted only the abatement headline underfunds year one.",
    "Tenant improvement allowance is separate economics. $45 per square foot TI on 10,000 rentable square feet is $450,000 of upfront tenant-side cash (or landlord delivery credit, depending on structure). Free rent changes operating cash; TI changes capital cash. Do not net them into one smooth effective rent number until both are labeled on the occupancy-cost table.",
    "Net effective rent is a summary metric, not a substitute for a timeline. Spread total rent over the term only after you include abatement months, escalations, and recoveries. A lower net effective rent with shorter free rent and higher CAM can lose to a higher face rent with longer abatement once paths are discounted— that is an occupancy-cost NPV question, not a slogan on a broker flyer.",
    "Compare two proposals with labeled abatement months: Proposal A offers $34 base rent, $8 CAM, two months free on base rent only, $30 TI PSF, five years. Proposal B offers $32 base rent, $9 CAM, four months free on base rent only, $15 TI PSF, five years. Year-one occupancy cash on A is roughly ten months of rent plus twelve months of CAM; on B, eight months of rent plus twelve months of CAM—but B’s higher CAM and lower TI change both operating and upfront cash. Put both on one timeline before committee sees net effective rent alone.",
    "Request the rent schedule showing abatement months, the CAM estimate for year one, the clause stating whether recoveries abate, and the TI allowance letter. Red flags: free rent in marketing slides with no CAM abatement language, net effective rent without a rent schedule, or concessions expiring if occupancy slips one week. This page is general information, not legal advice. Related reading: gross versus net lease structure, expense stop versus base year, what numbers you need before you compare two leases, and the compare-commercial-leases tool once your table is sourced.",
    "Renewals often trade free rent for higher starting rent—model the flip year, not just the abatement window. Sublease and holdover can inherit abatement mechanics; read assignment clauses. Retail and industrial packages use different concession shorthand; translate each to occupancy cost before you rank finalists.",
  ]);

  const faqs = [
    {
      question: "Does free rent always include CAM abatement?",
      answer: "No. Many leases abate base rent only; CAM, tax, and insurance may still bill during abatement months.",
    },
    {
      question: "Should TI and free rent be netted into one number?",
      answer: "Not until both sit on labeled rows—TI is capital timing; free rent is operating timing on the occupancy-cost table.",
    },
    {
      question: "Is net effective rent enough to compare leases?",
      answer: "Use it as a summary after you build the full timeline with recoveries and abatement months.",
    },
  ];

  return { answer, headings, body, faqs };
}
