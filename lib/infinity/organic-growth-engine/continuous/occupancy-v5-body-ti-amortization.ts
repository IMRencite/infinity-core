/**
 * TI amortization and occupancy cost — tenant decision support (materialized from durable opportunity).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_TI_AMORTIZATION_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/how-ti-amortization-affects-occupancy-cost-for-tenants/",
  venture_id: "occupancynpv",
  primary_topic: "tenant improvement allowance amortization",
  primary_reader_job: "Model how TI amortization spreads allowance recovery across lease years on the occupancy-cost timeline.",
  must_cover: ["amortization", "occupancy cost", "tenant improvement", "allowance", "free rent"],
  allowed_supporting: ["concession", "CAM", "lease compare", "net effective rent"],
  out_of_scope_for_page: ["motorcycle apparel", "property cap rate sale math"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyTiAmortizationV5Body() {
  const answer =
    "Tenant improvement allowance amortization spreads reimbursed buildout cost across lease years on the occupancy-cost timeline. Face rent may stay flat while amortized TI adds a labeled monthly line until the allowance is fully recovered, so compare paths on total occupancy cost—not headline rent alone.";

  const headings = [
    "Face rent hides the amortization line",
    "What TI amortization actually bills",
    "Free rent months and amortization together",
    "Allowance timing versus tenant-paid buildout",
    "Compare two leases with different TI schedules",
    "Documents and red flags before you sign",
  ];

  const body = paragraphs([
    "How does tenant improvement allowance amortization affect occupancy cost for tenants? Teams anchor on base rent and treat the TI allowance as a one-time capital gift. Amortization turns that allowance into a recurring occupancy-cost line for the years the lease spreads reimbursement. Occupancy cost is rent plus recoveries plus labeled TI or amortization on the same calendar—so a flat $38 rent quote can carry a $1.10 per square foot amortization row that never appears on the broker cover slide.",
    "Read the TI exhibit: allowance amount, amortization rate or schedule, start month, and whether amortization runs through abatement months. Some leases amortize over the full term; others front-load recovery in the first five years. Partial allowances—landlord pays shell, tenant pays above-standard—still produce amortization on the reimbursed portion only.",
    "Free rent months and amortization together are where budgets break. Base rent may print zero while amortization and CAM still bill unless the lease explicitly abates those lines. Example: 12,000 rentable square feet, $40 base rent, $8 CAM, $50 TI allowance amortized over 60 months at roughly $0.83 per square foot per month—during three months of free base rent, occupancy cash might still include amortization near $10,000 per month plus CAM near $8,000 per month before tenant-paid buildout.",
    "Allowance timing versus tenant-paid buildout belongs on separate rows. A $600,000 allowance on 12,000 rentable square feet is $50 per square foot of landlord credit; tenant-paid above-standard work hits cash in the buildout year even when amortization spreads the reimbursed slice. Do not net TI cash and amortization into net effective rent until both paths label capital and operating timing.",
    "Compare two proposals with different TI schedules: Proposal A offers $39 base rent, $7.50 CAM, $55 TI PSF amortized over 84 months, five years. Proposal B offers $37 base rent, $8.25 CAM, $35 TI PSF amortized over 60 months, five years. Mid-term occupancy cost on B can exceed A once amortization density and CAM estimates sit on one timeline—even when year-one face rent looks lower on B.",
    "Request the rent schedule, TI allowance letter, amortization worksheet, and language on whether recoveries or amortization abate during concession months. Red flags: allowance quoted in marketing with no amortization schedule, net effective rent without a TI row, or amortization that accelerates if occupancy slips one week. This page is general information, not legal advice. Related reading: free rent and abatement timing, gross versus net structure, what numbers you need before you compare two leases, and the compare-commercial-leases tool once your table is sourced.",
    "Renewals often re-amortize remaining allowance into higher starting rent—model the extension year, not just the initial amortization window. Sublease and holdover can inherit amortization mechanics; read assignment clauses. Industrial and office packages use different TI shorthand; translate each to occupancy cost before you rank finalists.",
  ]);

  const faqs = [
    {
      question: "Does amortized TI count as occupancy cost when rent is abated?",
      answer: "Often yes—amortization and recoveries may still bill during abatement unless the lease explicitly abates those lines too.",
    },
    {
      question: "Should TI allowance and amortization be netted into one number?",
      answer: "Not until both sit on labeled rows—allowance cash is capital timing; amortization is operating timing on the occupancy-cost table.",
    },
    {
      question: "Is face rent enough to compare leases with different TI schedules?",
      answer: "Use face rent as one row after you build the full timeline with amortization, recoveries, and abatement months.",
    },
  ];

  return { answer, headings, body, faqs };
}
