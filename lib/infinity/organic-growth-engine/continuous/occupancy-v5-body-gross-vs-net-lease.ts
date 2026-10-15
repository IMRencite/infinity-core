/**
 * Gross vs net lease — V5 autonomous backlog body (tenant decision support).
 */
import type { PageTopicBoundary } from "@/lib/infinity/venture-isolation/venture-isolation";

export const OCCUPANCY_GROSS_VS_NET_TOPIC: PageTopicBoundary = {
  page_id: "/blog/leasing/gross-lease-vs-net-lease-for-tenants/",
  venture_id: "occupancynpv",
  primary_topic: "gross lease versus net lease for tenants",
  primary_reader_job: "Explain who pays operating expenses under gross and net structures and why face rent alone misleads.",
  must_cover: ["gross lease", "net lease", "recoveries", "occupancy cost"],
  allowed_supporting: ["occupancy cost versus rent", "lease compare"],
  out_of_scope_for_page: ["motorcycle apparel", "property cap rate math"],
  conversion_intent: { primary: "LEARN", secondary: "TOOL_CONSIDERATION" },
};

function paragraphs(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function occupancyGrossVsNetLeaseV5Body() {
  const answer =
    "A gross lease bundles many operating expenses into the rent quote the tenant sees first; a net lease separates base rent from recoverable operating expenses such as CAM, taxes, and insurance. Tenants should compare occupancy cost on one timeline, not headline rent alone, because a lower gross rent can still lose once recoveries are explicit in a net structure.";

  const headings = [
    "Gross rent is a bundle",
    "Net rent is a base plus recoveries",
    "What tenants actually pay",
    "Modified gross and hybrid labels",
    "Why brokers use different vocabulary",
    "Occupancy-cost table first",
    "CAM, tax, and insurance under net leases",
    "Expense stops and base years",
    "When gross looks cheaper",
    "Compare tools and limitations",
  ];

  const body = paragraphs([
    "What is the difference between a gross lease and a net lease for tenants? In a full-service or gross-style lease, the landlord quote often includes many operating costs inside the rent number tenants repeat in meetings. In a net or triple-net style lease, the proposal shows base rent plus recoverable operating expenses—CAM, property taxes, insurance, and sometimes utilities or janitorial—on separate lines. The structure changes which dollars appear on the cover page versus which dollars arrive later as invoices or reconciliations—and that is when committees discover they compared marketing copy instead of occupancy cost.",
    "Gross rent is a bundle. Tenants still pay for the building’s operation, but the lease assigns more of that burden to the landlord’s side of the ledger before recoveries hit the tenant statement. That can simplify year-one budgeting because fewer pass-through lines show up early. It does not mean operating costs disappeared; it means they were priced into the rent bundle instead of itemized beside rent. Operators should unpack the bundle before they treat headline gross rent as the decision number.",
    "Net rent is a base plus recoveries. Base rent is the contractual rent for space; recoveries are the tenant’s share of operating expenses the lease assigns to the tenant. A net lease makes recoveries visible, which helps finance teams model occupancy cost honestly. It also creates more line items to verify, which is why tenants need the included-expenses list and prior-year reconciliation before they trust a net quote.",
    "Modified gross and hybrid labels sit between the poles. Some leases gross up rent but cap CAM growth; others start gross and shift toward net recoveries after a base year. Read the definitions in the lease—not the broker shorthand—because “modified gross” in one market can mean something different in another. Map every label back to who pays CAM, tax, insurance, utilities, and janitorial on the occupancy-cost table.",
    "Why do brokers use different vocabulary? Landlords market the structure that makes their building look competitive on the cover page. A gross quote can win attention in early rounds; a net quote can win on transparency for sophisticated tenants. Your job is to translate both into occupancy cost per year so committee compares apples to apples regardless of marketing language. Do not treat the label on the email subject line as the economic answer.",
    "Build an occupancy-cost table before you rank deals. Put base rent, CAM, taxes, insurance, utilities, parking, TI, free rent, and one-time items on the same timeline for each finalist. Gross proposals still belong on that table once you unpack what is inside the bundle. Net proposals belong there once you confirm recovery mechanics. Face rent alone is not a decision metric—and it tells you whether the proposal is easy to read, not whether it is cheap to occupy.",
    "CAM under net leases is usually the recovery line tenants feel first after base rent. Property taxes and insurance often pass through as separate recoveries depending on market practice. Utilities may be separately metered or embedded. Janitorial and security may be in CAM or billed separately. Copy the lease’s included-expenses list so your table matches the contract rather than a broker summary slide.",
    "Expense stops, base years, and gross-up clauses change recoveries while base rent on the cover stays stable. A gross lease can still contain recovery mechanics in later years if the lease shifts toward net treatment. A net lease can look cheap on rent while recoveries climb after a base-year reset. Plot occupancy cost by year, not only year-one cash, before you celebrate a rent concession.",
    "When does gross look cheaper but lose? When the bundle hid recoveries that a net competitor itemized honestly, or when the gross bundle assumes expense levels the building cannot sustain—leading to large reconciliations or renewal shocks. Sketch 12,000 rentable square feet with Proposal G at $42 per square foot gross versus Proposal N at $34 base plus $9 of stated recoveries: year-one occupancy cash is about $504,000 versus $516,000 before free rent or TI. That is almost $286,000 of difference over five flat years if recoveries hold—enough to flip a winner once you discount paths or add a CAM stress-test.",
    "Tenant improvement allowances, free rent, and abatement months interact with both structures. Free rent reduces base rent in abatement periods but may not reduce CAM, so occupancy cost during abatement can surprise teams that budgeted only the gross bundle. TI changes upfront cash; recoveries change operating cash. Keep those lines separate on the table.",
    "Sublease, holdover, and option rent still map to gross versus net logic: who pays operating expenses during those periods according to the lease? Do not assume gross treatment continues in option years without reading the option clause. Extensions sometimes flip toward net recoveries even when the original term was marketed as gross.",
    "Retail percentage rent, industrial gross leases, and office full-service leases all use different market shorthand. Translate each proposal to occupancy cost before you compare a retail deal to an office deal. The vocabulary differs; the tenant question is the same: what cash leaves our account to occupy this space each year?",
    "Internal reporting should show occupancy cost per square foot beside rent per square foot. Executives otherwise celebrate rent reductions while recoveries inflate off-dashboard. Gross versus net is not only a lease negotiation topic—it is a metric design topic for your own forecasting models.",
    "This article is general information, not legal advice, and not automatically the lease you should sign. It does not replace the lease-input checklist or the one-timeline compare article. Building buyers still use cap rate and debt service on valuation pages; that math is not a tenant occupancy-cost worksheet. Same NOI on a building does not tell a tenant which gross or net quote is cheaper to occupy.",
    "Related OccupancyNPV reading: occupancy cost versus rent, the lease-number checklist, CAM first-year labeling, and comparing two leases on one timeline. After you label gross versus net, open the compare tool with sourced numbers rather than invented averages. A net quote with higher stated rent but lower recoveries can be the better bet on occupancy-cost NPV once both paths are built honestly.",
    "Parking, storage, and after-hours HVAC can be gross-bundled or net-passed; map them explicitly. Renewal language sometimes converts gross to net; model the flip year before you accept a long gross headline. When proposals omit tax and insurance on gross deals, treat missing lines as questions, not zero dollars.",
    "Committee slides should show structure label and occupancy cost side by side so decision-makers see marketing versus math. Gross versus net explains the proposal format; occupancy cost explains the decision. Keep both sentences in the room, then stress-test recoveries before you pick a finalist.",
  ]);

  const faqs = [
    {
      question: "Is a gross lease always better for tenants?",
      answer: "No. It can hide recoveries or future reconciliations; compare occupancy cost on one timeline.",
    },
    {
      question: "Does net always mean triple-net?",
      answer: "No. Net is a family of structures; read which expenses pass through in your lease.",
    },
    {
      question: "Can I compare gross and net quotes directly?",
      answer: "Only after you build an occupancy-cost table for each proposal with the same lines.",
    },
  ];

  return { answer, headings, body, faqs };
}
